"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { validatePaymentAllocation, validatePaymentUpdate } from "@/lib/validations"
import { getCurrentISTDate, formatDateForDatabase } from "@/lib/date-utils"

export interface CustomerOutstanding {
  customer: {
    id: string
    billing_name: string
    contact_person: string
    phone_primary: string
    opening_balance: number
    routes?: {
      name: string
    }
  }
  unpaidInvoices: Array<{
    id: string
    invoice_number: string
    invoice_date: string
    due_date: string
    total_amount: number
    amount_paid: number
    amount_outstanding: number
    invoice_status: string
    last_payment_date?: string
  }>
  openingBalance: number  // Original opening balance (immutable)
  effectiveOpeningBalance: number  // Opening balance minus payments allocated to it
  invoiceOutstanding: number
  totalOutstanding: number
}

export interface OutstandingDashboard {
  totalOutstanding: number
  customersWithOutstanding: number
  overdueInvoices: number
  averageOutstanding: number
  customers: Array<{
    customer_id: string
    billing_name: string
    contact_person: string
    route_name: string
    opening_balance: number
    invoice_outstanding: number
    total_outstanding: number
    unpaid_invoice_count: number
    oldest_unpaid_date?: string
    // Credit information
    credit_amount?: number
    credit_count?: number
    hasCredit?: boolean
  }>
}

export async function getCustomerOutstanding(customerId: string): Promise<CustomerOutstanding> {
  const supabase = await createClient()
  
  // Single optimized query using Promise.all for parallel execution
  const [customerResult, unpaidInvoicesResult, effectiveOpeningBalance] = await Promise.all([
    // Get customer with opening balance and route
    supabase
      .from("customers")
      .select(`
        id,
        billing_name,
        contact_person,
        phone_primary,
        opening_balance,
        routes!inner(name)
      `)
      .eq("id", customerId)
      .single(),
    
    // Get unpaid invoices with details
    supabase
      .from("invoice_metadata")
      .select(`
        id,
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        amount_paid,
        amount_outstanding,
        invoice_status,
        last_payment_date
      `)
      .eq("customer_id", customerId)
      .in("invoice_status", ["pending", "partially_paid", "overdue", "sent"])
      .order("invoice_date"),
    
    // Get effective opening balance in parallel
    getEffectiveOpeningBalance(customerId)
  ])

  if (customerResult.error || !customerResult.data) {
    throw new Error("Customer not found")
  }

  if (unpaidInvoicesResult.error) {
    throw new Error("Failed to fetch unpaid invoices")
  }
  
  const customer = customerResult.data
  const unpaidInvoices = unpaidInvoicesResult.data || []
  
  // Calculate totals
  const invoiceOutstanding = unpaidInvoices.reduce(
    (sum, invoice) => sum + (invoice.amount_outstanding || 0), 0
  )
  
  const totalOutstanding = effectiveOpeningBalance + invoiceOutstanding
  
  // Transform customer data to match interface
  const transformedCustomer = {
    ...customer,
    routes: Array.isArray(customer.routes) && customer.routes.length > 0 
      ? customer.routes[0] 
      : undefined
  }

  return {
    customer: transformedCustomer,
    unpaidInvoices,
    openingBalance: customer.opening_balance || 0,  // Original opening balance (immutable)
    effectiveOpeningBalance,  // Opening balance minus payments allocated to it
    invoiceOutstanding,
    totalOutstanding
  }
}

export async function getOutstandingDashboard(): Promise<OutstandingDashboard> {
  const supabase = await createClient()
  
  // Get customers with outstanding amounts using the view
  const { data: customersWithOutstanding, error: viewError } = await supabase
    .from("customer_outstanding_summary")
    .select("*")
    .order("total_outstanding", { ascending: false })

  if (viewError) {
    throw new Error("Failed to fetch outstanding summary")
  }
  
  // Get credit information for all customers
  const { data: creditData, error: creditError } = await supabase
    .from("unapplied_payments")
    .select("customer_id, amount_unapplied")
  
  if (creditError) {
    console.error("Failed to fetch credit data:", creditError)
  }
  
  // Group credit data by customer
  const creditMap = new Map<string, { amount: number; count: number }>()
  creditData?.forEach(payment => {
    const existing = creditMap.get(payment.customer_id) || { amount: 0, count: 0 }
    existing.amount += payment.amount_unapplied
    existing.count += 1
    creditMap.set(payment.customer_id, existing)
  })
  
  // Enhance customers with credit information
  const enhancedCustomers = customersWithOutstanding?.map(customer => ({
    ...customer,
    credit_amount: creditMap.get(customer.customer_id)?.amount || 0,
    credit_count: creditMap.get(customer.customer_id)?.count || 0,
    hasCredit: (creditMap.get(customer.customer_id)?.amount || 0) > 0
  })) || []
  
  // Get overdue invoices count
  const { count: overdueInvoices, error: overdueError } = await supabase
    .from("invoice_metadata")
    .select("*", { count: "exact", head: true })
    .lt("due_date", formatDateForDatabase(getCurrentISTDate()))
    .in("invoice_status", ["pending", "partially_paid", "overdue", "sent"])

  if (overdueError) {
    throw new Error("Failed to fetch overdue invoices count")
  }
  
  const totalOutstanding = enhancedCustomers.reduce(
    (sum, customer) => sum + (customer.total_outstanding || 0), 0
  )
  
  return {
    totalOutstanding,
    customersWithOutstanding: enhancedCustomers.length,
    overdueInvoices: overdueInvoices || 0,
    averageOutstanding: enhancedCustomers.length 
      ? totalOutstanding / enhancedCustomers.length 
      : 0,
    customers: enhancedCustomers
  }
}

export interface PaymentAllocation {
  invoiceId: string
  amount: number
}

export async function allocatePayment(
  paymentId: string,
  allocations: PaymentAllocation[]
) {
  const supabase = await createClient()

  try {
    // GAP-003: Validate allocations before processing
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("amount, allocation_status")
      .eq("id", paymentId)
      .single()

    if (paymentError || !paymentData) {
      throw new Error("Payment not found for validation")
    }

    // Get existing allocations for validation
    const { data: existingAllocations } = await supabase
      .from("invoice_payments")
      .select("amount_allocated")
      .eq("payment_id", paymentId)

    const totalExisting = existingAllocations?.reduce((sum, alloc) =>
      sum + parseFloat(alloc.amount_allocated.toString()), 0
    ) || 0

    const validationResult = validatePaymentAllocation({
      payment: {
        id: paymentId,
        amount: parseFloat(paymentData.amount.toString()),
        existingAllocations: totalExisting
      },
      allocations: allocations.map(alloc => ({
        invoiceId: alloc.invoiceId,
        amount: alloc.amount
      }))
    })

    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.error}`)
    }

    console.log(`Payment ${paymentId}: Validation passed - allocating ₹${validationResult.totalAllocations}`)

    // Use atomic RPC function to prevent race conditions (GAP-001 fix)
    const { data: result, error } = await supabase.rpc('allocate_payment_atomic', {
      p_payment_id: paymentId,
      p_allocations: allocations.map(alloc => ({
        invoiceId: alloc.invoiceId,
        amount: alloc.amount
      })),
      p_validate_amounts: true
    })

    if (error) {
      throw new Error(`Database error during payment allocation: ${error.message}`)
    }

    if (!result?.success) {
      throw new Error(result?.error || 'Payment allocation failed')
    }

    console.log(`Payment ${paymentId}: Successfully allocated ₹${result.allocated_amount} to ${allocations.length} invoice(s)`)
    return {
      success: true,
      allocated_amount: result.allocated_amount,
      total_allocated: result.total_allocated,
      payment_amount: result.payment_amount,
      unapplied_amount: result.unapplied_amount || 0
    }

    // Revalidate relevant pages
    revalidatePath("/dashboard/outstanding")
    revalidatePath("/dashboard/payments")
    revalidatePath("/dashboard/customers")

    return result
  } catch (error) {
    console.error("Payment allocation error:", error)

    // If allocation partially succeeded but then failed, attempt rollback (GAP-002 fix)
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('Failed to update invoice status') ||
        errorMessage.includes('Database error during payment allocation')) {
      try {
        console.log(`Attempting to rollback partial allocation for payment ${paymentId}`)
        const { data: rollbackResult, error: rollbackError } = await supabase.rpc('rollback_partial_allocation', {
          p_payment_id: paymentId
        })

        if (!rollbackError && rollbackResult?.success) {
          console.log(`Successfully rolled back payment ${paymentId}:`, rollbackResult)
        } else {
          console.error(`Rollback failed for payment ${paymentId}:`, rollbackError?.message || rollbackResult?.error)
        }
      } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr)
      }
    }

    throw error
  }
}

export async function getCustomerUnpaidInvoices(customerId: string) {
  const supabase = await createClient()
  
  const { data: invoices, error } = await supabase
    .from("invoice_metadata")
    .select(`
      id,
      invoice_number,
      invoice_date,
      due_date,
      total_amount,
      amount_paid,
      amount_outstanding,
      invoice_status
    `)
    .eq("customer_id", customerId)
    .in("invoice_status", ["pending", "partially_paid", "overdue", "sent"])
    .gt("amount_outstanding", 0)
    .order("invoice_date")

  if (error) {
    throw new Error("Failed to fetch unpaid invoices")
  }
  
  return invoices || []
}

// Get the effective opening balance (original balance minus payments allocated to it)
export async function getEffectiveOpeningBalance(customerId: string): Promise<number> {
  const supabase = await createClient()
  
  // Get original opening balance
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("opening_balance")
    .eq("id", customerId)
    .single()
    
  if (customerError || !customer) {
    return 0
  }
  
  // Get total payments allocated to opening balance
  const { data: openingBalancePayments } = await supabase
    .from("opening_balance_payments")
    .select("amount")
    .eq("customer_id", customerId)
  
  const totalAllocatedToOpening = openingBalancePayments?.reduce(
    (sum, payment) => sum + Number(payment.amount), 
    0
  ) || 0
  
  const effectiveBalance = Number(customer.opening_balance) - totalAllocatedToOpening
  return Math.max(0, effectiveBalance) // Ensure non-negative
}

// GAP-008: Enhanced Outstanding Calculation with Validation and Fallback
export async function calculateCustomerOutstandingAmount(customerId: string): Promise<number> {
  const supabase = await createClient()

  try {
    // Primary calculation using database function
    const { data, error } = await supabase.rpc('calculate_customer_outstanding', {
      customer_uuid: customerId
    })

    if (error) {
      console.warn('Database outstanding calculation failed, using fallback:', error.message)
      return await calculateOutstandingFallback(customerId)
    }

    const calculatedAmount = data || 0

    // Validation: Outstanding amount should never be negative
    if (calculatedAmount < 0) {
      console.warn(`Negative outstanding amount detected for customer ${customerId}: ${calculatedAmount}. Correcting to 0.`)
      return 0
    }

    // Validation: Check for suspiciously large amounts (potential data corruption)
    const MAX_REASONABLE_OUTSTANDING = 1000000 // ₹10 lakh
    if (calculatedAmount > MAX_REASONABLE_OUTSTANDING) {
      console.warn(`Unusually large outstanding amount for customer ${customerId}: ₹${calculatedAmount}. Manual review required.`)

      // Get detailed breakdown for validation
      const breakdown = await getOutstandingBreakdown(customerId)
      if (!breakdown.breakdown_valid) {
        console.warn('Outstanding calculation breakdown validation failed, using fallback')
        return await calculateOutstandingFallback(customerId)
      }
    }

    return calculatedAmount

  } catch (error) {
    console.error('Exception in outstanding calculation:', error)
    return await calculateOutstandingFallback(customerId)
  }
}

// GAP-008: Fallback calculation using client-side logic
async function calculateOutstandingFallback(customerId: string): Promise<number> {
  const supabase = await createClient()

  try {
    // Get customer opening balance
    const { data: customer } = await supabase
      .from('customers')
      .select('outstanding_amount')
      .eq('id', customerId)
      .single()

    const openingBalance = customer?.outstanding_amount || 0

    // Get unpaid invoices total
    const { data: unpaidInvoices } = await supabase
      .from('invoice_metadata')
      .select('net_total')
      .eq('customer_id', customerId)
      .eq('payment_status', 'unpaid')

    const unpaidInvoicesTotal = unpaidInvoices?.reduce((sum, invoice) => sum + (invoice.net_total || 0), 0) || 0

    // Get total payments allocated to opening balance
    const { data: openingBalancePayments } = await supabase
      .from('opening_balance_payments')
      .select('amount_allocated')
      .eq('customer_id', customerId)

    const openingBalancePaymentsTotal = openingBalancePayments?.reduce((sum, payment) => sum + (payment.amount_allocated || 0), 0) || 0

    // Calculate final outstanding
    const totalOutstanding = Math.max(0, openingBalance + unpaidInvoicesTotal - openingBalancePaymentsTotal)

    console.info(`Fallback calculation for customer ${customerId}: Opening(₹${openingBalance}) + Unpaid(₹${unpaidInvoicesTotal}) - Payments(₹${openingBalancePaymentsTotal}) = ₹${totalOutstanding}`)

    return totalOutstanding

  } catch (error) {
    console.error('Fallback outstanding calculation failed:', error)
    return 0 // Safe fallback
  }
}

// GAP-008: Detailed breakdown for validation
async function getOutstandingBreakdown(customerId: string): Promise<{
  total_outstanding: number
  opening_balance: number
  unpaid_invoices: number
  credit_adjustments: number
  breakdown_valid: boolean
}> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('calculate_outstanding_with_breakdown', {
      customer_uuid: customerId
    })

    if (error || !data) {
      return {
        total_outstanding: 0,
        opening_balance: 0,
        unpaid_invoices: 0,
        credit_adjustments: 0,
        breakdown_valid: false
      }
    }

    // Validate breakdown math
    const expectedTotal = data.opening_balance + data.unpaid_invoices + data.credit_adjustments
    const breakdown_valid = Math.abs(expectedTotal - data.total_outstanding) < 0.01 // Allow for rounding

    return {
      ...data,
      breakdown_valid
    }

  } catch (error) {
    console.error('Error getting outstanding breakdown:', error)
    return {
      total_outstanding: 0,
      opening_balance: 0,
      unpaid_invoices: 0,
      credit_adjustments: 0,
      breakdown_valid: false
    }
  }
}

// GAP-008: Validation function for outstanding amount anomaly detection
export async function validateOutstandingCalculation(customerId: string): Promise<{
  isValid: boolean
  amount: number
  warnings: string[]
  requiresReview: boolean
}> {
  const amount = await calculateCustomerOutstandingAmount(customerId)
  const warnings: string[] = []
  let requiresReview = false

  // Check for negative amounts
  if (amount < 0) {
    warnings.push('Outstanding amount is negative')
    requiresReview = true
  }

  // Check for suspiciously large amounts
  const MAX_REASONABLE = 1000000
  if (amount > MAX_REASONABLE) {
    warnings.push(`Outstanding amount (₹${amount.toLocaleString()}) exceeds reasonable limit (₹${MAX_REASONABLE.toLocaleString()})`)
    requiresReview = true
  }

  // Get breakdown for additional validation
  const breakdown = await getOutstandingBreakdown(customerId)
  if (!breakdown.breakdown_valid) {
    warnings.push('Outstanding calculation breakdown validation failed')
    requiresReview = true
  }

  return {
    isValid: warnings.length === 0,
    amount,
    warnings,
    requiresReview
  }
}

export interface UnappliedPayment {
  id: string
  customer_id: string
  customer_name: string
  customer_contact: string
  payment_id: string
  payment_date: string
  payment_amount: number
  amount_unapplied: number
  payment_method: string
  notes?: string
}

export async function getUnappliedPayments(customerId?: string): Promise<UnappliedPayment[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from("unapplied_payments")
    .select(`
      *,
      payment:payments(
        payment_date,
        amount,
        payment_method,
        notes
      ),
      customer:customers(
        billing_name,
        contact_person
      )
    `)
    .order("created_at", { ascending: false })
  
  if (customerId) {
    query = query.eq("customer_id", customerId)
  }
  
  const { data: unappliedPayments, error } = await query
  
  if (error) {
    throw new Error("Failed to fetch unapplied payments")
  }
  
  return unappliedPayments?.map(payment => ({
    id: payment.id,
    customer_id: payment.customer_id,
    customer_name: payment.customer?.billing_name || 'Unknown Customer',
    customer_contact: payment.customer?.contact_person || 'N/A',
    payment_id: payment.payment_id,
    payment_date: payment.payment?.payment_date,
    payment_amount: payment.payment?.amount || 0,
    amount_unapplied: payment.amount_unapplied,
    payment_method: payment.payment?.payment_method || 'N/A',
    notes: payment.payment?.notes
  })) || []
}

export async function getCustomerUnappliedPayments(customerId: string): Promise<UnappliedPayment[]> {
  return getUnappliedPayments(customerId)
}

export interface CustomerCreditInfo {
  total_amount: number
  payment_count: number
  hasCredit: boolean
}

export async function getCustomerCreditInfo(customerId: string): Promise<CustomerCreditInfo> {
  const supabase = await createClient()
  
  try {
    const { data: creditData, error } = await supabase
      .from("unapplied_payments")
      .select("amount_unapplied")
      .eq("customer_id", customerId)
    
    if (error) {
      throw new Error("Failed to fetch customer credit information")
    }
    
    const total_amount = creditData?.reduce((sum, payment) => sum + payment.amount_unapplied, 0) || 0
    const payment_count = creditData?.length || 0
    const hasCredit = total_amount > 0
    
    return {
      total_amount,
      payment_count,
      hasCredit
    }
  } catch (error) {
    console.error("Failed to get customer credit info:", error)
    return {
      total_amount: 0,
      payment_count: 0,
      hasCredit: false
    }
  }
}

// Function to allocate payment to customer's opening balance
export async function allocatePaymentToOpeningBalance(
  paymentId: string,
  amount: number
) {
  const supabase = await createClient()
  
  try {
    // Get payment details to identify customer
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("customer_id, amount")
      .eq("id", paymentId)
      .single()

    if (paymentError || !payment) {
      throw new Error("Payment not found")
    }
    
    // Get current customer opening balance
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("opening_balance")
      .eq("id", payment.customer_id)
      .single()

    if (customerError || !customer) {
      throw new Error("Customer not found")
    }
    
    // Get existing opening balance payments to calculate remaining balance
    const { data: existingAllocations } = await supabase
      .from("opening_balance_payments")
      .select("amount")
      .eq("customer_id", payment.customer_id)
    
    const totalAllocatedToOpening = existingAllocations?.reduce((sum, allocation) => sum + Number(allocation.amount), 0) || 0
    const remainingOpeningBalance = Number(customer.opening_balance) - totalAllocatedToOpening
    
    if (amount > remainingOpeningBalance) {
      throw new Error(`Allocation amount exceeds remaining opening balance (₹${remainingOpeningBalance.toFixed(2)})`)
    }
    
    // Create opening balance payment record (DO NOT modify opening_balance field - keep it immutable)
    const { error: insertError } = await supabase
      .from("opening_balance_payments")
      .insert({
        customer_id: payment.customer_id,
        payment_id: paymentId,
        amount: amount
      })
      
    if (insertError) {
      throw new Error("Failed to record opening balance payment")
    }
    
    // Update payment allocation status
    // Note: We'll track opening balance allocations differently since they don't have invoices
    // For now, we'll just update the payment's applied amount
    const { data: currentPayment } = await supabase
      .from("payments")
      .select("amount_applied, amount_unapplied")
      .eq("id", paymentId)
      .single()
    
    const updatedAmountApplied = (currentPayment?.amount_applied || 0) + amount
    const updatedAmountUnapplied = payment.amount - updatedAmountApplied
    
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        amount_applied: updatedAmountApplied,
        amount_unapplied: updatedAmountUnapplied,
        allocation_status: updatedAmountUnapplied > 0 ? 'partially_applied' : 'fully_applied'
      })
      .eq("id", paymentId)
      
    if (paymentUpdateError) {
      throw new Error("Failed to update payment allocation status")
    }
    
    // Revalidate relevant pages
    revalidatePath("/dashboard/outstanding")
    revalidatePath("/dashboard/payments")
    revalidatePath("/dashboard/customers")
    
    return { success: true }
    
  } catch (error) {
    console.error("Opening balance allocation error:", error)
    throw error
  }
}

export interface UnappliedPaymentStats {
  totalAmount: number
  totalCount: number
  customersCount: number
}

export async function getUnappliedPaymentStats(): Promise<UnappliedPaymentStats> {
  const supabase = await createClient()
  
  try {
    // Get total amount and count of unapplied payments
    const { data: statsData, error: statsError } = await supabase
      .from("unapplied_payments")
      .select("amount_unapplied")
    
    if (statsError) {
      throw new Error("Failed to fetch unapplied payment statistics")
    }
    
    const totalAmount = statsData?.reduce((sum, payment) => sum + payment.amount_unapplied, 0) || 0
    const totalCount = statsData?.length || 0
    
    // Get count of unique customers with unapplied payments
    const { data: customersData, error: customersError } = await supabase
      .from("unapplied_payments")
      .select("customer_id")
    
    if (customersError) {
      throw new Error("Failed to fetch customer count")
    }
    
    const uniqueCustomers = new Set(customersData?.map(payment => payment.customer_id) || [])
    const customersCount = uniqueCustomers.size
    
    return {
      totalAmount,
      totalCount,
      customersCount
    }
  } catch (error) {
    console.error("Failed to get unapplied payment stats:", error)
    throw error
  }
}