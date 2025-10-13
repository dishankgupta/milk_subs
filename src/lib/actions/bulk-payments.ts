"use server"

import { createPayment } from "./payments"
import { bulkPaymentSchema, type BulkPaymentFormData } from "@/lib/validations"
import { revalidatePath } from "next/cache"

export interface BulkPaymentsResult {
  success: boolean
  processed: number
  total: number
  errors: Array<{
    index: number
    error: string
  }>
  successfulPayments: string[]
}

interface PaymentAllocation {
  id: string
  type: 'invoice' | 'opening_balance' | 'sales'
  amount: number
}

export async function createBulkPayments(data: BulkPaymentFormData): Promise<BulkPaymentsResult> {
  // Validate bulk data
  const validatedData = bulkPaymentSchema.parse(data)

  const result: BulkPaymentsResult = {
    success: false,
    processed: 0,
    total: validatedData.payments.length,
    errors: [],
    successfulPayments: []
  }

  // Process each payment sequentially
  for (const [index, paymentData] of validatedData.payments.entries()) {
    try {
      // Convert allocations to the format expected by createPayment
      const paymentAllocations: PaymentAllocation[] = (paymentData.allocations || []).map(alloc => ({
        id: alloc.id,
        type: alloc.type,
        amount: alloc.amount
      }))

      // Create payment with allocations
      await createPayment({
        customer_id: paymentData.customer_id,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method || "",
        notes: paymentData.notes || ""
      }, paymentAllocations.length > 0 ? paymentAllocations : undefined)

      result.processed++
      result.successfulPayments.push(`Payment ${index + 1}`)
    } catch (error) {
      result.errors.push({
        index,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      })
    }
  }

  result.success = result.errors.length === 0

  // Revalidate paths
  if (result.processed > 0) {
    revalidatePath("/dashboard/payments")
    revalidatePath("/dashboard/customers")
    revalidatePath("/dashboard/outstanding")
  }

  return result
}
