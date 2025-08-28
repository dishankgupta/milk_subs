"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { PaymentFormData, paymentSchema } from "@/lib/validations"
import type { Payment } from "@/lib/types"
import { allocatePayment, allocatePaymentToOpeningBalance } from "@/lib/actions/outstanding"
import { 
  formatDateForDatabase, 
  formatTimestampForDatabase, 
  getCurrentISTDate,
  getStartOfDayIST
} from "@/lib/date-utils"

interface PaymentAllocation {
  id: string
  type: 'invoice' | 'opening_balance'
  amount: number
}

export async function createPayment(data: PaymentFormData, paymentAllocations?: PaymentAllocation[]) {
  const supabase = await createClient()

  // Validate the form data
  const validatedData = paymentSchema.parse(data)

  // Insert payment with initial allocation status
  const { data: payment, error } = await supabase
    .from("payments")
    .insert([{
      customer_id: validatedData.customer_id,
      amount: validatedData.amount,
      payment_date: formatDateForDatabase(validatedData.payment_date),
      payment_method: validatedData.payment_method || null,
      period_start: validatedData.period_start ? formatDateForDatabase(validatedData.period_start) : null,
      period_end: validatedData.period_end ? formatDateForDatabase(validatedData.period_end) : null,
      notes: validatedData.notes || null,
      allocation_status: paymentAllocations && paymentAllocations.length > 0 ? 'partially_applied' : 'unapplied',
      amount_applied: 0,
      amount_unapplied: validatedData.amount
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`)
  }

  // If allocations are provided, apply them
  if (paymentAllocations && paymentAllocations.length > 0) {
    await processPaymentAllocations(payment.id, paymentAllocations)
  } else {
    // Store as unapplied payment for later allocation
    const { error: unappliedError } = await supabase
      .from("unapplied_payments")
      .insert({
        customer_id: validatedData.customer_id,
        payment_id: payment.id,
        amount_unapplied: validatedData.amount,
        reason: 'Awaiting manual allocation'
      })
    
    if (unappliedError) {
      console.warn('Failed to record unapplied payment:', unappliedError.message)
    }
  }

  revalidatePath("/dashboard/payments")
  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard/outstanding")
  return payment
}

// Helper function to process both invoice and opening balance allocations
async function processPaymentAllocations(
  paymentId: string, 
  allocations: PaymentAllocation[]
) {
  // Separate invoice and opening balance allocations
  const invoiceAllocations = allocations
    .filter(alloc => alloc.type === 'invoice')
    .map(alloc => ({ invoiceId: alloc.id, amount: alloc.amount }))
  
  const openingBalanceAllocations = allocations
    .filter(alloc => alloc.type === 'opening_balance')
  
  // Process invoice allocations
  if (invoiceAllocations.length > 0) {
    await allocatePayment(paymentId, invoiceAllocations)
  }
  
  // Process opening balance allocations
  for (const allocation of openingBalanceAllocations) {
    await allocatePaymentToOpeningBalance(paymentId, allocation.amount)
  }
}

export async function getPayments(searchParams?: {
  search?: string
  customer_id?: string
  payment_method?: string
  page?: number
  limit?: number
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from("payments")
    .select(`
      *,
      customer:customers(billing_name, contact_person, phone_primary),
      invoice_payments:invoice_payments(amount_allocated, invoice:invoice_metadata(invoice_number, invoice_date)),
      unapplied_payments:unapplied_payments(amount_unapplied)
    `)
    .order("payment_date", { ascending: false })

  // Apply filters
  if (searchParams?.search) {
    query = query.or(`customer.billing_name.ilike.%${searchParams.search}%,customer.contact_person.ilike.%${searchParams.search}%,payment_method.ilike.%${searchParams.search}%`)
  }

  if (searchParams?.customer_id) {
    query = query.eq("customer_id", searchParams.customer_id)
  }

  if (searchParams?.payment_method) {
    query = query.eq("payment_method", searchParams.payment_method)
  }

  // Apply pagination
  const page = searchParams?.page || 1
  const limit = searchParams?.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  query = query.range(from, to)

  const { data: payments, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`)
  }

  return { 
    payments: payments as Payment[], 
    total: count || 0,
    page,
    limit
  }
}

export async function getPayment(id: string) {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from("payments")
    .select(`
      *,
      customer:customers(
        id,
        billing_name,
        contact_person,
        address,
        phone_primary,
        phone_secondary,
        phone_tertiary,
        opening_balance,
        status
      ),
      invoice_payments:invoice_payments(amount_allocated, invoice:invoice_metadata(invoice_number, invoice_date)),
      unapplied_payments:unapplied_payments(amount_unapplied)
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch payment: ${error.message}`)
  }

  return payment as Payment
}

export async function updatePayment(id: string, data: PaymentFormData, newPaymentAllocations?: PaymentAllocation[]) {
  const supabase = await createClient()

  // Get the old payment details
  const { data: oldPayment, error: fetchError } = await supabase
    .from("payments")
    .select("amount, customer_id, allocation_status, amount_applied")
    .eq("id", id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch existing payment: ${fetchError.message}`)
  }

  // Validate the form data
  const validatedData = paymentSchema.parse(data)

  // If amount changed and payment was already allocated, we need to handle reallocation
  if (oldPayment.amount !== validatedData.amount && oldPayment.allocation_status !== 'unapplied') {
    // For now, we'll require manual reallocation if amount changes on allocated payments
    if (!newPaymentAllocations) {
      throw new Error('Payment amount changed. Please provide new payment allocations or deallocate the payment first.')
    }
    
    // Remove existing allocations
    await supabase
      .from("invoice_payments")
      .delete()
      .eq("payment_id", id)
    
    // Remove from unapplied payments
    await supabase
      .from("unapplied_payments")
      .delete()
      .eq("payment_id", id)
  }

  // Update payment
  const { data: payment, error } = await supabase
    .from("payments")
    .update({
      customer_id: validatedData.customer_id,
      amount: validatedData.amount,
      payment_date: formatDateForDatabase(validatedData.payment_date),
      payment_method: validatedData.payment_method || null,
      period_start: validatedData.period_start ? formatDateForDatabase(validatedData.period_start) : null,
      period_end: validatedData.period_end ? formatDateForDatabase(validatedData.period_end) : null,
      notes: validatedData.notes || null,
      updated_at: formatTimestampForDatabase(getCurrentISTDate()),
      // Reset allocation fields if amount changed
      allocation_status: oldPayment.amount !== validatedData.amount ? 'unapplied' : oldPayment.allocation_status,
      amount_applied: oldPayment.amount !== validatedData.amount ? 0 : oldPayment.amount_applied,
      amount_unapplied: oldPayment.amount !== validatedData.amount ? validatedData.amount : validatedData.amount - oldPayment.amount_applied
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update payment: ${error.message}`)
  }

  // Handle reallocation if needed
  if (newPaymentAllocations && newPaymentAllocations.length > 0) {
    await processPaymentAllocations(payment.id, newPaymentAllocations)
  } else if (oldPayment.amount !== validatedData.amount && oldPayment.allocation_status !== 'unapplied') {
    // Record as unapplied since allocation was removed
    await supabase
      .from("unapplied_payments")
      .insert({
        customer_id: validatedData.customer_id,
        payment_id: payment.id,
        amount_unapplied: validatedData.amount,
        reason: 'Amount changed, requires reallocation'
      })
  }

  revalidatePath("/dashboard/payments")
  revalidatePath(`/dashboard/payments/${id}`)
  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard/outstanding")
  return payment
}

export async function deletePayment(id: string) {
  const supabase = await createClient()

  // Get payment details
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("amount, customer_id, allocation_status")
    .eq("id", id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch payment: ${fetchError.message}`)
  }

  // If payment was allocated to invoices, we need to update those invoices
  if (payment.allocation_status !== 'unapplied') {
    // Get all invoices this payment was allocated to
    const { data: allocatedInvoices } = await supabase
      .from("invoice_payments")
      .select("invoice_id")
      .eq("payment_id", id)
    
    // Remove payment allocations (this will cascade)
    const { error: allocationError } = await supabase
      .from("invoice_payments")
      .delete()
      .eq("payment_id", id)
    
    if (allocationError) {
      throw new Error(`Failed to remove payment allocations: ${allocationError.message}`)
    }
    
    // Update invoice statuses for affected invoices
    for (const allocation of allocatedInvoices || []) {
      await supabase.rpc('update_invoice_status', {
        invoice_uuid: allocation.invoice_id
      })
    }
  }

  // Remove from unapplied payments if exists
  await supabase
    .from("unapplied_payments")
    .delete()
    .eq("payment_id", id)

  // Delete payment
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error(`Failed to delete payment: ${error.message}`)
  }

  revalidatePath("/dashboard/payments")
  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard/outstanding")
}

export async function getCustomerPayments(customerId: string, limit: number = 10) {
  const supabase = await createClient()

  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("payment_date", { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch customer payments: ${error.message}`)
  }

  return payments as Payment[]
}

export async function getPaymentStats() {
  const supabase = await createClient()

  // Get total payments this month using IST dates
  const currentISTDate = getCurrentISTDate()
  const currentMonth = formatDateForDatabase(getStartOfDayIST(new Date(currentISTDate.getFullYear(), currentISTDate.getMonth(), 1)))
  const nextMonth = formatDateForDatabase(getStartOfDayIST(new Date(currentISTDate.getFullYear(), currentISTDate.getMonth() + 1, 1)))

  const { data: monthlyPayments, error: monthlyError } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", currentMonth)
    .lt("payment_date", nextMonth)

  if (monthlyError) {
    throw new Error(`Failed to fetch monthly payments: ${monthlyError.message}`)
  }

  // Get customers with outstanding amounts using the new system
  const { data: outstandingCustomers, error: outstandingError } = await supabase
    .from("customer_outstanding_summary")
    .select("total_outstanding")

  if (outstandingError) {
    throw new Error(`Failed to fetch outstanding amounts: ${outstandingError.message}`)
  }

  // Calculate totals
  const totalMonthlyPayments = monthlyPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalOutstanding = outstandingCustomers.reduce((sum, customer) => sum + Number(customer.total_outstanding), 0)

  return {
    totalMonthlyPayments,
    totalOutstanding,
    customersWithOutstanding: outstandingCustomers.length,
    totalPaymentsThisMonth: monthlyPayments.length,
  }
}

