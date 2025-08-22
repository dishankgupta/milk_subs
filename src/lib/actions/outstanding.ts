"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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
  }>
}

export async function getCustomerOutstanding(customerId: string): Promise<CustomerOutstanding> {
  const supabase = await createClient()
  
  // Get customer with opening balance and route
  const { data: customer, error: customerError } = await supabase
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
    .single()

  if (customerError || !customer) {
    throw new Error("Customer not found")
  }
  
  // Get unpaid invoices with details
  const { data: unpaidInvoices, error: invoicesError } = await supabase
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
    .order("invoice_date")

  if (invoicesError) {
    throw new Error("Failed to fetch unpaid invoices")
  }
  
  // Get effective opening balance (original balance minus payments allocated to it)
  const effectiveOpeningBalance = await getEffectiveOpeningBalance(customerId)
  
  // Calculate totals
  const invoiceOutstanding = unpaidInvoices?.reduce(
    (sum, invoice) => sum + (invoice.amount_outstanding || 0), 0
  ) || 0
  
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
    unpaidInvoices: unpaidInvoices || [],
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
  
  // Get overdue invoices count
  const { count: overdueInvoices, error: overdueError } = await supabase
    .from("invoice_metadata")
    .select("*", { count: "exact", head: true })
    .lt("due_date", new Date().toISOString().split('T')[0])
    .in("invoice_status", ["pending", "partially_paid", "overdue", "sent"])

  if (overdueError) {
    throw new Error("Failed to fetch overdue invoices count")
  }
  
  const totalOutstanding = customersWithOutstanding?.reduce(
    (sum, customer) => sum + (customer.total_outstanding || 0), 0
  ) || 0
  
  return {
    totalOutstanding,
    customersWithOutstanding: customersWithOutstanding?.length || 0,
    overdueInvoices: overdueInvoices || 0,
    averageOutstanding: customersWithOutstanding?.length 
      ? totalOutstanding / customersWithOutstanding.length 
      : 0,
    customers: customersWithOutstanding || []
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
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("amount, customer_id")
      .eq("id", paymentId)
      .single()

    if (paymentError || !payment) {
      throw new Error("Payment not found")
    }
    
    const totalAllocation = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
    
    if (totalAllocation > payment.amount) {
      throw new Error("Allocation exceeds payment amount")
    }
    
    // Insert allocations
    for (const allocation of allocations) {
      const { error: insertError } = await supabase
        .from("invoice_payments")
        .insert({
          invoice_id: allocation.invoiceId,
          payment_id: paymentId,
          amount_allocated: allocation.amount
        })
      
      if (insertError) {
        throw new Error(`Failed to allocate payment to invoice: ${insertError.message}`)
      }
      
      // Update invoice status using the database function
      const { error: functionError } = await supabase.rpc('update_invoice_status', {
        invoice_uuid: allocation.invoiceId
      })
      
      if (functionError) {
        throw new Error(`Failed to update invoice status: ${functionError.message}`)
      }
    }
    
    // Update payment allocation status
    const amountApplied = totalAllocation
    const amountUnapplied = payment.amount - totalAllocation
    
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        amount_applied: amountApplied,
        amount_unapplied: amountUnapplied,
        allocation_status: amountUnapplied > 0 ? 'partially_applied' : 'fully_applied'
      })
      .eq("id", paymentId)

    if (updateError) {
      throw new Error("Failed to update payment allocation status")
    }
    
    // Handle unapplied amount if any
    if (amountUnapplied > 0) {
      const { error: unappliedError } = await supabase
        .from("unapplied_payments")
        .insert({
          customer_id: payment.customer_id,
          payment_id: paymentId,
          amount_unapplied: amountUnapplied
        })
      
      if (unappliedError) {
        console.warn("Failed to record unapplied payment:", unappliedError.message)
      }
    }
    
    // Revalidate relevant pages
    revalidatePath("/dashboard/outstanding")
    revalidatePath("/dashboard/payments")
    revalidatePath("/dashboard/customers")
    
    // Remove from unapplied payments if fully allocated
    if (amountUnapplied === 0) {
      await supabase
        .from("unapplied_payments")
        .delete()
        .eq("payment_id", paymentId)
    } else {
      // Update unapplied payment amount
      await supabase
        .from("unapplied_payments")
        .update({ amount_unapplied: amountUnapplied })
        .eq("payment_id", paymentId)
    }
    
    return { success: true }
  } catch (error) {
    console.error("Payment allocation error:", error)
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

export async function calculateCustomerOutstandingAmount(customerId: string): Promise<number> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('calculate_customer_outstanding', {
    customer_uuid: customerId
  })

  if (error) {
    throw new Error("Failed to calculate outstanding amount")
  }
  
  return data || 0
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