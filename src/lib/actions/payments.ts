"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { PaymentFormData, paymentSchema } from "@/lib/validations"
import type { Payment } from "@/lib/types"

export async function createPayment(data: PaymentFormData) {
  const supabase = await createClient()

  // Validate the form data
  const validatedData = paymentSchema.parse(data)

  // Insert payment
  const { data: payment, error } = await supabase
    .from("payments")
    .insert([{
      customer_id: validatedData.customer_id,
      amount: validatedData.amount,
      payment_date: validatedData.payment_date.toISOString().split('T')[0],
      payment_method: validatedData.payment_method || null,
      period_start: validatedData.period_start?.toISOString().split('T')[0] || null,
      period_end: validatedData.period_end?.toISOString().split('T')[0] || null,
      notes: validatedData.notes || null,
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create payment: ${error.message}`)
  }

  // Update customer's outstanding amount (subtract payment)
  await updateCustomerOutstanding(validatedData.customer_id, -validatedData.amount)

  revalidatePath("/dashboard/payments")
  revalidatePath("/dashboard/customers")
  return payment
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
      customer:customers(billing_name, contact_person, phone_primary)
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
        outstanding_amount,
        status
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    throw new Error(`Failed to fetch payment: ${error.message}`)
  }

  return payment as Payment
}

export async function updatePayment(id: string, data: PaymentFormData) {
  const supabase = await createClient()

  // Get the old payment to calculate the difference for outstanding amount
  const { data: oldPayment, error: fetchError } = await supabase
    .from("payments")
    .select("amount, customer_id")
    .eq("id", id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch existing payment: ${fetchError.message}`)
  }

  // Validate the form data
  const validatedData = paymentSchema.parse(data)

  // Update payment
  const { data: payment, error } = await supabase
    .from("payments")
    .update({
      customer_id: validatedData.customer_id,
      amount: validatedData.amount,
      payment_date: validatedData.payment_date.toISOString().split('T')[0],
      payment_method: validatedData.payment_method || null,
      period_start: validatedData.period_start?.toISOString().split('T')[0] || null,
      period_end: validatedData.period_end?.toISOString().split('T')[0] || null,
      notes: validatedData.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update payment: ${error.message}`)
  }

  // Update customer's outstanding amount (reverse old amount, apply new amount)
  const amountDifference = validatedData.amount - oldPayment.amount
  await updateCustomerOutstanding(validatedData.customer_id, -amountDifference)

  revalidatePath("/dashboard/payments")
  revalidatePath(`/dashboard/payments/${id}`)
  revalidatePath("/dashboard/customers")
  return payment
}

export async function deletePayment(id: string) {
  const supabase = await createClient()

  // Get payment details to reverse the outstanding amount
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("amount, customer_id")
    .eq("id", id)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch payment: ${fetchError.message}`)
  }

  // Delete payment
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)

  if (error) {
    throw new Error(`Failed to delete payment: ${error.message}`)
  }

  // Reverse the payment from customer's outstanding amount
  await updateCustomerOutstanding(payment.customer_id, payment.amount)

  revalidatePath("/dashboard/payments")
  revalidatePath("/dashboard/customers")
}

export async function getCustomerPayments(customerId: string) {
  const supabase = await createClient()

  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .order("payment_date", { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch customer payments: ${error.message}`)
  }

  return payments as Payment[]
}

export async function getPaymentStats() {
  const supabase = await createClient()

  // Get total payments this month
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().slice(0, 10)

  const { data: monthlyPayments, error: monthlyError } = await supabase
    .from("payments")
    .select("amount")
    .gte("payment_date", currentMonth)
    .lt("payment_date", nextMonth)

  if (monthlyError) {
    throw new Error(`Failed to fetch monthly payments: ${monthlyError.message}`)
  }

  // Get customers with outstanding amounts
  const { data: outstandingCustomers, error: outstandingError } = await supabase
    .from("customers")
    .select("outstanding_amount")
    .gt("outstanding_amount", 0)

  if (outstandingError) {
    throw new Error(`Failed to fetch outstanding amounts: ${outstandingError.message}`)
  }

  // Calculate totals
  const totalMonthlyPayments = monthlyPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalOutstanding = outstandingCustomers.reduce((sum, customer) => sum + Number(customer.outstanding_amount), 0)

  return {
    totalMonthlyPayments,
    totalOutstanding,
    customersWithOutstanding: outstandingCustomers.length,
    totalPaymentsThisMonth: monthlyPayments.length,
  }
}

// Helper function to update customer outstanding amount
async function updateCustomerOutstanding(customerId: string, amountChange: number) {
  const supabase = await createClient()

  // Get current outstanding amount
  const { data: customer, error: fetchError } = await supabase
    .from("customers")
    .select("outstanding_amount")
    .eq("id", customerId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch customer: ${fetchError.message}`)
  }

  // Calculate new outstanding amount
  const newOutstandingAmount = Math.max(0, Number(customer.outstanding_amount) + amountChange)

  // Update customer
  const { error: updateError } = await supabase
    .from("customers")
    .update({ 
      outstanding_amount: newOutstandingAmount,
      updated_at: new Date().toISOString()
    })
    .eq("id", customerId)

  if (updateError) {
    throw new Error(`Failed to update customer outstanding amount: ${updateError.message}`)
  }

  return newOutstandingAmount
}