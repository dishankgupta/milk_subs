"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { saleSchema, type SaleFormData } from "@/lib/validations"
// Note: Outstanding amounts are now managed through invoice system, not direct manipulation
import type { Sale } from "@/lib/types"
import { z } from "zod"
import { 
  formatDateForDatabase, 
  formatTimestampForDatabase, 
  getCurrentISTDate 
} from "@/lib/date-utils"

export async function createSale(data: SaleFormData & { 
  total_amount: number
  gst_amount: number 
}) {
  const supabase = await createClient()

  // Validate the form data (extended schema with calculated fields)
  const extendedSchema = saleSchema.extend({
    total_amount: z.number().min(0.01, "Total amount must be greater than 0"),
    gst_amount: z.number().min(0, "GST amount cannot be negative")
  })
  
  const validatedData = extendedSchema.parse(data)

  // Determine payment status based on sale type
  const paymentStatus = (validatedData.sale_type === 'Cash' || validatedData.sale_type === 'QR') ? 'Completed' : 'Pending'

  // Insert sale
  const { data: sale, error } = await supabase
    .from("sales")
    .insert([{
      customer_id: validatedData.customer_id,
      product_id: validatedData.product_id,
      quantity: validatedData.quantity,
      unit_price: validatedData.unit_price,
      total_amount: validatedData.total_amount,
      gst_amount: validatedData.gst_amount,
      sale_type: validatedData.sale_type,
      sale_date: formatDateForDatabase(validatedData.sale_date),
      payment_status: paymentStatus,
      notes: validatedData.notes || null,
    }])
    .select(`
      *,
      customer:customers(*),
      product:products(*)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to create sale: ${error.message}`)
  }

  // Note: Outstanding amounts are now automatically handled through invoice generation
  // Credit sales will be included in customer invoices and tracked through the invoice system

  revalidatePath("/dashboard/sales")
  revalidatePath("/dashboard/customers")
  if (validatedData.customer_id) {
    revalidatePath(`/dashboard/customers/${validatedData.customer_id}`)
  }
  
  return sale
}

export async function getSales(searchParams?: {
  search?: string
  customer_id?: string
  product_id?: string
  sale_type?: 'Cash' | 'Credit' | 'QR'
  payment_status?: 'Completed' | 'Pending' | 'Billed'
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from("sales")
    .select(`
      *,
      customer:customers(billing_name, contact_person),
      product:products(name, code, unit_of_measure)
    `, { count: 'exact' })
    .order("sale_date", { ascending: false })

  // Apply search filter
  if (searchParams?.search && searchParams.search.trim()) {
    const searchTerm = `%${searchParams.search.trim()}%`
    query = query.or(`
      customers.billing_name.ilike.${searchTerm},
      customers.contact_person.ilike.${searchTerm},
      products.name.ilike.${searchTerm},
      products.code.ilike.${searchTerm},
      notes.ilike.${searchTerm}
    `)
  }

  // Apply filters
  if (searchParams?.customer_id) {
    query = query.eq("customer_id", searchParams.customer_id)
  }

  if (searchParams?.product_id) {
    query = query.eq("product_id", searchParams.product_id)
  }

  if (searchParams?.sale_type) {
    query = query.eq("sale_type", searchParams.sale_type)
  }

  if (searchParams?.payment_status) {
    query = query.eq("payment_status", searchParams.payment_status)
  }

  if (searchParams?.date_from) {
    query = query.gte("sale_date", searchParams.date_from)
  }

  if (searchParams?.date_to) {
    query = query.lte("sale_date", searchParams.date_to)
  }

  // Pagination
  const page = searchParams?.page || 1
  const limit = searchParams?.limit || 20
  const start = (page - 1) * limit
  const end = start + limit - 1

  query = query.range(start, end)

  const { data, error, count } = await query

  if (error) {
    throw new Error("Failed to fetch sales")
  }

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / limit)

  return {
    sales: (data as Sale[]) || [],
    totalCount,
    totalPages,
    currentPage: page
  }
}

export async function getSalesStats(dateRange?: { from: string; to: string }) {
  const supabase = await createClient()

  let query = supabase
    .from("sales")
    .select("sale_type, total_amount, payment_status")

  if (dateRange) {
    query = query
      .gte("sale_date", dateRange.from)
      .lte("sale_date", dateRange.to)
  }

  const { data: sales, error } = await query

  if (error) {
    throw new Error("Failed to fetch sales statistics")
  }

  // Calculate statistics
  const stats = {
    totalCashSales: 0,
    totalCashAmount: 0,
    totalQRSales: 0,
    totalQRAmount: 0,
    totalCreditSales: 0,
    totalCreditAmount: 0,
    pendingCreditAmount: 0,
    billedCreditAmount: 0,
    completedCreditAmount: 0
  }

  sales?.forEach(sale => {
    if (sale.sale_type === 'Cash') {
      stats.totalCashSales++
      stats.totalCashAmount += Number(sale.total_amount)
    } else if (sale.sale_type === 'QR') {
      stats.totalQRSales++
      stats.totalQRAmount += Number(sale.total_amount)
    } else {
      stats.totalCreditSales++
      stats.totalCreditAmount += Number(sale.total_amount)
      
      if (sale.payment_status === 'Pending') {
        stats.pendingCreditAmount += Number(sale.total_amount)
      } else if (sale.payment_status === 'Billed') {
        stats.billedCreditAmount += Number(sale.total_amount)
      } else {
        stats.completedCreditAmount += Number(sale.total_amount)
      }
    }
  })

  return stats
}

export async function getCustomerSales(customerId: string) {
  const supabase = await createClient()

  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      *,
      product:products(name, code, unit_of_measure)
    `)
    .eq("customer_id", customerId)
    .order("sale_date", { ascending: false })

  if (error) {
    throw new Error("Failed to fetch customer sales")
  }

  return sales as Sale[]
}

export async function updateSalePaymentStatus(saleId: string, status: 'Pending' | 'Billed' | 'Completed') {
  const supabase = await createClient()

  const { data: sale, error } = await supabase
    .from("sales")
    .update({
      payment_status: status,
      updated_at: formatTimestampForDatabase(getCurrentISTDate())
    })
    .eq("id", saleId)
    .select()
    .single()

  if (error) {
    throw new Error("Failed to update sale payment status")
  }

  revalidatePath("/dashboard/sales")
  return sale
}

// Bulk update payment status for invoice generation
export async function markSalesAsBilled(saleIds: string[], invoiceNumber: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("sales")
    .update({
      payment_status: 'Billed',
      updated_at: formatTimestampForDatabase(getCurrentISTDate())
    })
    .in("id", saleIds)

  if (error) {
    throw new Error("Failed to mark sales as billed")
  }

  revalidatePath("/dashboard/sales")
}

export async function deleteSale(saleId: string) {
  const supabase = await createClient()

  // First get the sale to check if we need to update customer outstanding
  const { data: sale, error: fetchError } = await supabase
    .from("sales")
    .select(`
      *,
      customer:customers(*)
    `)
    .eq("id", saleId)
    .single()

  if (fetchError) {
    return {
      success: false,
      error: "Sale not found"
    }
  }

  // Note: Outstanding amounts are automatically updated through invoice system
  // Deleting a credit sale will be reflected in future invoice calculations

  // Delete the sale
  const { error: deleteError } = await supabase
    .from("sales")
    .delete()
    .eq("id", saleId)

  if (deleteError) {
    return {
      success: false,
      error: `Failed to delete sale: ${deleteError.message}`
    }
  }

  revalidatePath("/dashboard/sales")
  revalidatePath("/dashboard/customers")
  if (sale.customer_id) {
    revalidatePath(`/dashboard/customers/${sale.customer_id}`)
  }

  return {
    success: true
  }
}

export async function bulkDeleteSales(saleIds: string[]) {
  if (saleIds.length === 0) {
    return {
      success: false,
      error: "No sales selected for deletion"
    }
  }

  const supabase = await createClient()

  // First get all sales to validate they exist
  const { data: sales, error: fetchError } = await supabase
    .from("sales")
    .select(`
      id,
      customer_id,
      total_amount,
      sale_type,
      customer:customers(billing_name)
    `)
    .in("id", saleIds)

  if (fetchError) {
    return {
      success: false,
      error: "Failed to fetch sales for deletion"
    }
  }

  if (sales.length !== saleIds.length) {
    return {
      success: false,
      error: "Some selected sales no longer exist"
    }
  }

  // Delete all sales in a single query
  const { error: deleteError } = await supabase
    .from("sales")
    .delete()
    .in("id", saleIds)

  if (deleteError) {
    return {
      success: false,
      error: `Failed to delete sales: ${deleteError.message}`
    }
  }

  // Revalidate affected paths
  revalidatePath("/dashboard/sales")
  revalidatePath("/dashboard/customers")

  // Revalidate individual customer pages if affected
  const affectedCustomers = [...new Set(sales.filter(s => s.customer_id).map(s => s.customer_id))]
  affectedCustomers.forEach(customerId => {
    if (customerId) {
      revalidatePath(`/dashboard/customers/${customerId}`)
    }
  })

  return {
    success: true,
    deletedCount: sales.length,
    affectedCustomers: affectedCustomers.length
  }
}

export async function updateSale(saleId: string, data: SaleFormData & {
  total_amount: number
  gst_amount: number
}) {
  const supabase = await createClient()

  // Get the existing sale to compare changes
  const { data: existingSale, error: fetchError } = await supabase
    .from("sales")
    .select(`
      *,
      customer:customers(*),
      product:products(*)
    `)
    .eq("id", saleId)
    .single()

  if (fetchError) {
    throw new Error("Sale not found")
  }

  // Validate the form data (extended schema with calculated fields)
  const extendedSchema = saleSchema.extend({
    total_amount: z.number().min(0.01, "Total amount must be greater than 0"),
    gst_amount: z.number().min(0, "GST amount cannot be negative")
  })
  
  const validatedData = extendedSchema.parse(data)

  // Determine payment status based on sale type
  const paymentStatus = (validatedData.sale_type === 'Cash' || validatedData.sale_type === 'QR') ? 'Completed' : 'Pending'

  // Update the sale
  const { data: updatedSale, error: updateError } = await supabase
    .from("sales")
    .update({
      customer_id: validatedData.customer_id,
      product_id: validatedData.product_id,
      quantity: validatedData.quantity,
      unit_price: validatedData.unit_price,
      total_amount: validatedData.total_amount,
      gst_amount: validatedData.gst_amount,
      sale_type: validatedData.sale_type,
      sale_date: formatDateForDatabase(validatedData.sale_date),
      payment_status: paymentStatus,
      notes: validatedData.notes || null,
      updated_at: formatTimestampForDatabase(getCurrentISTDate())
    })
    .eq("id", saleId)
    .select(`
      *,
      customer:customers(*),
      product:products(*)
    `)
    .single()

  if (updateError) {
    throw new Error(`Failed to update sale: ${updateError.message}`)
  }

  // Note: Outstanding amounts are automatically updated through invoice system
  // Sale changes will be reflected in future invoice calculations

  revalidatePath("/dashboard/sales")
  revalidatePath("/dashboard/customers")
  if (existingSale.customer_id) {
    revalidatePath(`/dashboard/customers/${existingSale.customer_id}`)
  }
  if (validatedData.customer_id && validatedData.customer_id !== existingSale.customer_id) {
    revalidatePath(`/dashboard/customers/${validatedData.customer_id}`)
  }
  
  return updatedSale
}

export async function getSale(saleId: string) {
  const supabase = await createClient()

  const { data: sale, error } = await supabase
    .from("sales")
    .select(`
      *,
      customer:customers(*),
      product:products(*)
    `)
    .eq("id", saleId)
    .single()

  if (error) {
    throw new Error("Sale not found")
  }

  return sale
}