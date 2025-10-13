"use server"

import { createModification } from "./modifications"
import { bulkModificationSchema, type BulkModificationFormData } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { format } from "date-fns"

export interface BulkModificationsResult {
  success: boolean
  processed: number
  total: number
  errors: Array<{
    index: number
    error: string
  }>
  successfulModifications: string[]
}

export async function createBulkModifications(data: BulkModificationFormData): Promise<BulkModificationsResult> {
  // Validate bulk data
  const validatedData = bulkModificationSchema.parse(data)

  const result: BulkModificationsResult = {
    success: false,
    processed: 0,
    total: validatedData.modifications.length,
    errors: [],
    successfulModifications: []
  }

  // Process each modification sequentially
  for (const [index, modificationData] of validatedData.modifications.entries()) {
    try {
      const formattedData = {
        customer_id: modificationData.customer_id,
        product_id: modificationData.product_id,
        modification_type: modificationData.modification_type,
        start_date: format(modificationData.start_date, 'yyyy-MM-dd'),
        end_date: format(modificationData.end_date, 'yyyy-MM-dd'),
        quantity_change: modificationData.quantity_change,
        reason: modificationData.reason,
      }

      const createResult = await createModification(formattedData)

      if (!createResult.success) {
        throw new Error(createResult.error || "Failed to create modification")
      }

      result.processed++
      result.successfulModifications.push(`Modification ${index + 1}`)
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
    revalidatePath("/dashboard/modifications")
    revalidatePath("/dashboard/customers")
  }

  return result
}
