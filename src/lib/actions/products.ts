"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { productSchema, type ProductFormData } from "@/lib/validations"
import type { Product } from "@/lib/types"

export async function createProduct(data: ProductFormData) {
  const supabase = await createClient()

  // Validate the form data
  const validatedData = productSchema.parse(data)

  // Check for duplicate product code
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("code", validatedData.code)
    .single()

  if (existing) {
    throw new Error("A product with this code already exists")
  }

  const { data: product, error } = await supabase
    .from("products")
    .insert([{
      name: validatedData.name,
      code: validatedData.code,
      current_price: validatedData.current_price,
      unit: validatedData.unit,
      gst_rate: validatedData.gst_rate,
      unit_of_measure: validatedData.unit_of_measure,
      is_subscription_product: validatedData.is_subscription_product,
    }])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create product: ${error.message}`)
  }

  revalidatePath("/dashboard/products")
  return product
}

export async function updateProduct(id: string, data: ProductFormData) {
  const supabase = await createClient()

  const validatedData = productSchema.parse(data)

  // Check for duplicate product code (excluding current product)
  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("code", validatedData.code)
    .neq("id", id)
    .single()

  if (existing) {
    throw new Error("A product with this code already exists")
  }

  const { data: product, error } = await supabase
    .from("products")
    .update({
      name: validatedData.name,
      code: validatedData.code,
      current_price: validatedData.current_price,
      unit: validatedData.unit,
      gst_rate: validatedData.gst_rate,
      unit_of_measure: validatedData.unit_of_measure,
      is_subscription_product: validatedData.is_subscription_product,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update product: ${error.message}`)
  }

  revalidatePath("/dashboard/products")
  revalidatePath(`/dashboard/products/${id}`)
  return product
}

export async function getProducts(filters?: {
  subscription_only?: boolean
  with_gst?: boolean
}): Promise<Product[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from("products")
    .select("*")
    .order("name")

  if (filters?.subscription_only) {
    query = query.eq("is_subscription_product", true)
  }

  if (filters?.with_gst) {
    query = query.gt("gst_rate", 0)
  }

  const { data, error } = await query

  if (error) {
    throw new Error("Failed to fetch products")
  }

  return data || []
}

export async function getProduct(id: string): Promise<Product> {
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    throw new Error("Product not found")
  }

  return product
}

// Check if product price change affects unbilled sales
export async function checkProductPriceImpact(productId: string, newPrice: number) {
  const supabase = await createClient()

  const { data: unbilledSales, error } = await supabase
    .from("sales")
    .select(`
      id,
      unit_price,
      quantity,
      total_amount,
      customer:customers(billing_name)
    `)
    .eq("product_id", productId)
    .eq("payment_status", "Pending")

  if (error) {
    throw new Error("Failed to check unbilled sales")
  }

  return {
    affectedSales: unbilledSales?.length || 0,
    salesData: unbilledSales || []
  }
}

export async function updateUnbilledSalesPrices(productId: string, newPrice: number) {
  const supabase = await createClient()

  // Get product GST rate for recalculation
  const { data: product } = await supabase
    .from("products")
    .select("gst_rate")
    .eq("id", productId)
    .single()

  if (!product) {
    throw new Error("Product not found")
  }

  // Calculate GST amount for the new price
  const baseAmount = newPrice / (1 + (product.gst_rate / 100))
  const gstAmount = newPrice - baseAmount

  // Update all unbilled sales with new price
  const { error } = await supabase
    .from("sales")
    .update({
      unit_price: newPrice,
      updated_at: new Date().toISOString()
    })
    .eq("product_id", productId)
    .eq("payment_status", "Pending")

  if (error) {
    throw new Error("Failed to update unbilled sales prices")
  }

  revalidatePath("/dashboard/sales")
}