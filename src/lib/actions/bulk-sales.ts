"use server"

import { createSale } from "./sales"
import { saleSchema, type SaleFormData } from "@/lib/validations"
import { z } from "zod"

const bulkSalesSchema = z.object({
  sales: z.array(saleSchema).min(1, "At least one sale is required")
})

export type BulkSalesData = z.infer<typeof bulkSalesSchema>

export interface BulkSalesResult {
  success: boolean
  processed: number
  total: number
  errors: Array<{
    index: number
    error: string
  }>
  successfulSales: string[]
}

export async function createBulkSales(data: BulkSalesData): Promise<BulkSalesResult> {
  // Validate bulk data
  const validatedData = bulkSalesSchema.parse(data)

  const result: BulkSalesResult = {
    success: false,
    processed: 0,
    total: validatedData.sales.length,
    errors: [],
    successfulSales: []
  }

  // Process each sale sequentially
  for (const [index, saleData] of validatedData.sales.entries()) {
    try {
      // Calculate totals for the sale
      const totalAmount = saleData.quantity * saleData.unit_price
      const gstAmount = 0 // Will be calculated in createSale based on product GST rate

      await createSale({
        ...saleData,
        total_amount: totalAmount,
        gst_amount: gstAmount
      })

      result.processed++
      result.successfulSales.push(`Sale ${index + 1}`)
    } catch (error) {
      result.errors.push({
        index,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      })
    }
  }

  result.success = result.errors.length === 0
  return result
}