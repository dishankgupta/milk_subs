"use server"

import { createSale } from "./sales"
import { saleSchema, type SaleFormData } from "@/lib/validations"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { calculateGSTFromInclusive } from "@/lib/gst-utils"

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

  const supabase = await createClient()

  // Get unique product IDs to fetch GST rates
  const productIds = [...new Set(validatedData.sales.map(sale => sale.product_id).filter(Boolean))]
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, gst_rate")
    .in("id", productIds)

  if (productError) {
    result.errors.push({
      index: -1,
      error: `Failed to fetch product GST rates: ${productError.message}`
    })
    return result
  }

  // Create a map of product ID to GST rate for quick lookup
  const productGSTMap = new Map(products?.map(p => [p.id, parseFloat(p.gst_rate)]) || [])

  // Process each sale sequentially
  for (const [index, saleData] of validatedData.sales.entries()) {
    try {
      // Get the product's GST rate
      const gstRate = productGSTMap.get(saleData.product_id) || 0

      // Calculate total amount (GST inclusive)
      const totalAmount = saleData.quantity * saleData.unit_price

      // Extract GST component from the inclusive total
      const { gstAmount } = calculateGSTFromInclusive(totalAmount, gstRate)

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