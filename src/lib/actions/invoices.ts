"use server"

import { createClient } from "@/lib/supabase/server"
import { getNextInvoiceNumber } from "@/lib/invoice-utils"
import { markSalesAsBilled } from "@/lib/actions/sales"
import { invoiceFileManager, generatePdfFromHtml, combinePdfs } from "@/lib/file-utils"
import { format } from "date-fns"
import path from "path"
import { formatCurrency } from "@/lib/utils"
import type { Customer } from "@/lib/types"

export interface InvoiceData {
  customer: Customer
  invoiceNumber: string
  invoiceDate: string
  periodStart: string
  periodEnd: string
  subscriptionItems: InvoiceSubscriptionItem[]
  manualSalesItems: InvoiceManualSaleItem[]
  dailySummary: InvoiceDailySummaryItem[]
  totals: InvoiceTotals
}

export interface InvoiceSubscriptionItem {
  productName: string
  productCode: string
  quantity: number
  unitPrice: number
  totalAmount: number
  unitOfMeasure: string
}

export interface InvoiceManualSaleItem {
  productName: string
  productCode: string
  quantity: number
  unitPrice: number
  totalAmount: number
  gstAmount: number
  unitOfMeasure: string
  saleDate: string
}

export interface InvoiceDailySummaryItem {
  date: string
  items: {
    productName: string
    quantity: number
    unitOfMeasure: string
  }[]
}

export interface InvoiceTotals {
  subscriptionAmount: number
  manualSalesAmount: number
  totalGstAmount: number
  grandTotal: number
}

export interface BulkInvoicePreviewItem {
  customerId: string
  customerName: string
  subscriptionAmount: number
  creditSalesAmount: number
  totalAmount: number
  hasExistingInvoice: boolean
  existingInvoiceNumber?: string
  _customerOutstanding?: number // Temporary field for filtering
}

export interface GenerationProgress {
  completed: number
  total: number
  currentCustomer: string
  isComplete: boolean
  errors: string[]
}

export async function prepareInvoiceData(
  customerId: string,
  periodStart: string,
  periodEnd: string
): Promise<InvoiceData> {
  const supabase = await createClient()

  // Get customer details
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select(`
      *,
      route:routes(*)
    `)
    .eq("id", customerId)
    .single()

  if (customerError || !customer) {
    throw new Error("Customer not found")
  }

  // Get subscription data (from daily_orders that have been delivered)
  const { data: dailyOrders, error: ordersError } = await supabase
    .from("daily_orders")
    .select(`
      *,
      product:products(*),
      deliveries!inner(actual_quantity)
    `)
    .eq("customer_id", customerId)
    .gte("order_date", periodStart)
    .lte("order_date", periodEnd)

  if (ordersError) {
    throw new Error("Failed to fetch subscription orders")
  }

  // Get manual sales data (credit sales only, unbilled)
  const { data: manualSales, error: salesError } = await supabase
    .from("sales")
    .select(`
      *,
      product:products(*)
    `)
    .eq("customer_id", customerId)
    .eq("sale_type", "Credit")
    .eq("payment_status", "Pending")
    .gte("sale_date", periodStart)
    .lte("sale_date", periodEnd)

  if (salesError) {
    throw new Error("Failed to fetch manual sales")
  }

  // Generate invoice number
  const { invoiceNumber } = await getNextInvoiceNumber()

  // Process subscription items (group by product)
  const subscriptionItemsMap = new Map<string, InvoiceSubscriptionItem>()
  
  dailyOrders?.forEach(order => {
    const key = order.product.id
    const existing = subscriptionItemsMap.get(key)
    
    if (existing) {
      existing.quantity += Number(order.planned_quantity)
      existing.totalAmount += Number(order.total_amount)
    } else {
      subscriptionItemsMap.set(key, {
        productName: order.product.name,
        productCode: order.product.code,
        quantity: Number(order.planned_quantity),
        unitPrice: Number(order.unit_price),
        totalAmount: Number(order.total_amount),
        unitOfMeasure: order.product.unit_of_measure || order.product.unit
      })
    }
  })

  const subscriptionItems = Array.from(subscriptionItemsMap.values())

  // Process manual sales items
  const manualSalesItems: InvoiceManualSaleItem[] = manualSales?.map(sale => ({
    productName: sale.product.name,
    productCode: sale.product.code,
    quantity: Number(sale.quantity),
    unitPrice: Number(sale.unit_price),
    totalAmount: Number(sale.total_amount),
    gstAmount: Number(sale.gst_amount),
    unitOfMeasure: sale.product.unit_of_measure,
    saleDate: sale.sale_date
  })) || []

  // Create daily summary (both subscription + manual sales)
  const dailySummaryMap = new Map<string, InvoiceDailySummaryItem>()
  
  // Add subscription deliveries to daily summary
  dailyOrders?.forEach(order => {
    const dateKey = order.order_date
    const existing = dailySummaryMap.get(dateKey)
    
    const item = {
      productName: order.product.name,
      quantity: Number(order.planned_quantity),
      unitOfMeasure: order.product.unit_of_measure || order.product.unit
    }
    
    if (existing) {
      existing.items.push(item)
    } else {
      dailySummaryMap.set(dateKey, {
        date: dateKey,
        items: [item]
      })
    }
  })

  // Add manual sales to daily summary
  manualSales?.forEach(sale => {
    const dateKey = sale.sale_date
    const existing = dailySummaryMap.get(dateKey)
    
    const item = {
      productName: sale.product.name,
      quantity: Number(sale.quantity),
      unitOfMeasure: sale.product.unit_of_measure
    }
    
    if (existing) {
      existing.items.push(item)
    } else {
      dailySummaryMap.set(dateKey, {
        date: dateKey,
        items: [item]
      })
    }
  })

  const dailySummary = Array.from(dailySummaryMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))

  // Calculate totals
  const subscriptionAmount = subscriptionItems.reduce((sum, item) => sum + item.totalAmount, 0)
  const manualSalesAmount = manualSalesItems.reduce((sum, item) => sum + item.totalAmount, 0)
  const totalGstAmount = manualSalesItems.reduce((sum, item) => sum + item.gstAmount, 0)
  const grandTotal = subscriptionAmount + manualSalesAmount

  return {
    customer,
    invoiceNumber,
    invoiceDate: new Date().toISOString().split('T')[0],
    periodStart,
    periodEnd,
    subscriptionItems,
    manualSalesItems,
    dailySummary,
    totals: {
      subscriptionAmount,
      manualSalesAmount,
      totalGstAmount,
      grandTotal
    }
  }
}

export async function saveInvoiceMetadata(invoiceData: InvoiceData, filePath: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("invoice_metadata")
    .insert({
      invoice_number: invoiceData.invoiceNumber,
      customer_id: invoiceData.customer.id,
      invoice_date: invoiceData.invoiceDate,
      period_start: invoiceData.periodStart,
      period_end: invoiceData.periodEnd,
      subscription_amount: invoiceData.totals.subscriptionAmount,
      manual_sales_amount: invoiceData.totals.manualSalesAmount,
      total_amount: invoiceData.totals.grandTotal,
      gst_amount: invoiceData.totals.totalGstAmount,
      file_path: filePath,
      status: 'Generated'
    })

  if (error) {
    throw new Error(`Failed to save invoice metadata: ${error.message}`)
  }

  // Mark manual sales as billed
  if (invoiceData.manualSalesItems.length > 0) {
    // Get the sale IDs from the original manual sales data
    const supabase2 = await createClient()
    const { data: salesData } = await supabase2
      .from("sales")
      .select("id")
      .eq("customer_id", invoiceData.customer.id)
      .eq("sale_type", "Credit")
      .eq("payment_status", "Pending")
      .gte("sale_date", invoiceData.periodStart)
      .lte("sale_date", invoiceData.periodEnd)

    const saleIds = salesData?.map(sale => sale.id) || []
    
    if (saleIds.length > 0) {
      await markSalesAsBilled(saleIds, invoiceData.invoiceNumber)
    }
  }
}

export async function getBulkInvoicePreview(params: {
  period_start: string
  period_end: string
  customer_selection: 'all' | 'with_outstanding' | 'with_subscription_and_outstanding' | 'selected'
  selected_customer_ids?: string[]
}): Promise<BulkInvoicePreviewItem[]> {
  const supabase = await createClient()

  // Get customers based on selection criteria
  let customersQuery = supabase
    .from("customers")
    .select("id, billing_name, outstanding_amount, opening_balance")

  if (params.customer_selection === 'with_outstanding') {
    customersQuery = customersQuery.gt("outstanding_amount", 0)
  } else if (params.customer_selection === 'selected' && params.selected_customer_ids) {
    customersQuery = customersQuery.in("id", params.selected_customer_ids)
  }

  const { data: customers, error: customersError } = await customersQuery

  if (customersError) {
    throw new Error("Failed to fetch customers")
  }

  const previewItems: BulkInvoicePreviewItem[] = []

  for (const customer of customers || []) {
    // Get subscription amount from daily_orders that have been delivered
    const { data: subscriptionOrders } = await supabase
      .from("daily_orders")
      .select(`
        total_amount,
        deliveries!inner(id)
      `)
      .eq("customer_id", customer.id)
      .gte("order_date", params.period_start)
      .lte("order_date", params.period_end)

    const subscriptionAmount = subscriptionOrders?.reduce(
      (sum, order) => sum + Number(order.total_amount), 0
    ) || 0

    // Get credit sales amount (both Pending and Billed to show all credit sales in period)
    const { data: creditSales } = await supabase
      .from("sales")
      .select("total_amount")
      .eq("customer_id", customer.id)
      .eq("sale_type", "Credit")
      .in("payment_status", ["Pending", "Billed"])
      .gte("sale_date", params.period_start)
      .lte("sale_date", params.period_end)

    const creditSalesAmount = creditSales?.reduce(
      (sum, sale) => sum + Number(sale.total_amount), 0
    ) || 0

    // Check for existing invoices in this period
    const { data: existingInvoice } = await supabase
      .from("invoice_metadata")
      .select("invoice_number")
      .eq("customer_id", customer.id)
      .gte("period_start", params.period_start)
      .lte("period_end", params.period_end)
      .single()

    const existingOutstanding = Number(customer.outstanding_amount || 0)
    
    previewItems.push({
      customerId: customer.id,
      customerName: customer.billing_name,
      subscriptionAmount,
      creditSalesAmount,
      totalAmount: subscriptionAmount + creditSalesAmount,
      hasExistingInvoice: !!existingInvoice,
      existingInvoiceNumber: existingInvoice?.invoice_number,
      // Store the customer data for filtering
      _customerOutstanding: existingOutstanding
    })
  }

  // Apply special filtering for customers with subscription dues OR outstanding amounts
  let filteredItems = previewItems
  if (params.customer_selection === 'with_subscription_and_outstanding') {
    filteredItems = previewItems.filter(item => 
      item.subscriptionAmount > 0 || // Has subscription dues (delivered orders)
      (item._customerOutstanding || 0) > 0 // OR has existing outstanding amount
    )
  }

  return filteredItems.sort((a, b) => a.customerName.localeCompare(b.customerName))
}

export async function generateBulkInvoices(params: {
  period_start: string
  period_end: string
  customer_ids: string[]
  output_folder: string
}): Promise<{
  successful: number
  errors: string[]
  invoiceNumbers: string[]
  combinedPdfPath: string
  progress: GenerationProgress
}> {
  const { output_folder, customer_ids, period_start, period_end } = params

  // Check for existing invoices before starting generation
  const supabase = await createClient()
  const customersWithExistingInvoices: string[] = []
  
  for (const customerId of customer_ids) {
    const { data: existingInvoice } = await supabase
      .from("invoice_metadata")
      .select("invoice_number")
      .eq("customer_id", customerId)
      .gte("period_start", period_start)
      .lte("period_end", period_end)
      .single()
      
    if (existingInvoice) {
      // Get customer name separately to avoid TypeScript issues
      const { data: customer } = await supabase
        .from("customers")
        .select("billing_name")
        .eq("id", customerId)
        .single()
        
      const customerName = customer?.billing_name || 'Unknown Customer'
      customersWithExistingInvoices.push(`${customerName} (Invoice: ${existingInvoice.invoice_number})`)
    }
  }
  
  // If any customers have existing invoices, prevent generation
  if (customersWithExistingInvoices.length > 0) {
    const errorMsg = `Cannot generate invoices. The following customers already have invoices for this period: ${customersWithExistingInvoices.join(', ')}. Please delete existing invoices first.`
    
    return {
      successful: 0,
      errors: [errorMsg],
      invoiceNumbers: [],
      combinedPdfPath: "",
      progress: {
        completed: 0,
        total: customer_ids.length,
        currentCustomer: "",
        isComplete: true,
        errors: [errorMsg]
      }
    }
  }

  // Create dated subfolder
  const dateFolder = await invoiceFileManager.createDateFolder(output_folder)
  
  const results = {
    successful: 0,
    errors: [] as string[],
    invoiceNumbers: [] as string[],
    combinedPdfPath: ""
  }

  const progress: GenerationProgress = {
    completed: 0,
    total: customer_ids.length,
    currentCustomer: "",
    isComplete: false,
    errors: []
  }

  const individualPdfPaths: string[] = []

  try {
    for (let i = 0; i < customer_ids.length; i++) {
      const customerId = customer_ids[i]
      
      try {
        // Get customer name for progress
        const { data: customer } = await supabase
          .from("customers")
          .select("billing_name")
          .eq("id", customerId)
          .single()

        progress.currentCustomer = customer?.billing_name || `Customer ${i + 1}`

        // Prepare invoice data
        const invoiceData = await prepareInvoiceData(customerId, period_start, period_end)
        
        // Generate PDF file name
        const sanitizedCustomerName = invoiceFileManager.sanitizeFilename(
          invoiceData.customer.billing_name
        )
        const pdfFileName = invoiceFileManager.getInvoiceFileName(
          invoiceData.invoiceNumber, 
          sanitizedCustomerName
        )
        const pdfFilePath = path.join(dateFolder, pdfFileName)

        // Generate HTML content and create PDF with retry logic
        const html = await generateInvoiceHTML(invoiceData)
        
        // Retry PDF generation up to 3 times for transient failures
        let pdfAttempts = 0
        const maxPdfAttempts = 3
        
        while (pdfAttempts < maxPdfAttempts) {
          try {
            await generatePdfFromHtml(html, pdfFilePath)
            break // Success, exit retry loop
          } catch (pdfError) {
            pdfAttempts++
            console.log(`PDF generation attempt ${pdfAttempts} failed for ${invoiceData.customer.billing_name}:`, pdfError)
            
            if (pdfAttempts >= maxPdfAttempts) {
              throw pdfError // Final attempt failed, throw the error
            }
            
            // Wait before retrying (exponential backoff: 1s, 2s, 4s)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, pdfAttempts - 1)))
          }
        }

        // Save invoice metadata
        await saveInvoiceMetadata(invoiceData, pdfFilePath)

        // Track success
        results.successful++
        results.invoiceNumbers.push(invoiceData.invoiceNumber)
        individualPdfPaths.push(pdfFilePath)

      } catch (error) {
        const errorMsg = `Customer ${progress.currentCustomer}: ${error instanceof Error ? error.message : 'Unknown error'}`
        results.errors.push(errorMsg)
        progress.errors.push(errorMsg)
      }

      // Update progress
      progress.completed = i + 1
    }

    // Generate combined PDF
    if (individualPdfPaths.length > 0) {
      const combinedFileName = invoiceFileManager.getCombinedFileName(
        results.invoiceNumbers[0],
        results.invoiceNumbers[results.invoiceNumbers.length - 1]
      )
      const combinedPdfPath = path.join(dateFolder, combinedFileName)
      
      await combinePdfs(individualPdfPaths, combinedPdfPath)
      results.combinedPdfPath = combinedPdfPath
    }

  } finally {
    progress.isComplete = true
  }

  return {
    ...results,
    progress
  }
}

export async function generateSingleInvoice(params: {
  customer_id: string
  period_start: string
  period_end: string
  include_subscriptions: boolean
  include_credit_sales: boolean
  output_folder?: string
}): Promise<{
  invoiceNumber: string
  pdfPath: string | null
  previewUrl: string
}> {
  const invoiceData = await prepareInvoiceData(
    params.customer_id,
    params.period_start,
    params.period_end
  )

  if (params.output_folder) {
    // Save to file
    const dateFolder = await invoiceFileManager.createDateFolder(params.output_folder)
    const fileName = invoiceFileManager.getInvoiceFileName(
      invoiceData.invoiceNumber,
      invoiceData.customer.billing_name
    )
    const filePath = path.join(dateFolder, fileName)

    // Generate PDF and save with retry logic
    const html = await generateInvoiceHTML(invoiceData)
    
    // Retry PDF generation up to 3 times for transient failures
    let pdfAttempts = 0
    const maxPdfAttempts = 3
    
    while (pdfAttempts < maxPdfAttempts) {
      try {
        await generatePdfFromHtml(html, filePath)
        break // Success, exit retry loop
      } catch (pdfError) {
        pdfAttempts++
        console.log(`PDF generation attempt ${pdfAttempts} failed for ${invoiceData.customer.billing_name}:`, pdfError)
        
        if (pdfAttempts >= maxPdfAttempts) {
          throw pdfError // Final attempt failed, throw the error
        }
        
        // Wait before retrying (exponential backoff: 1s, 2s, 4s)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, pdfAttempts - 1)))
      }
    }
    
    // Save metadata
    await saveInvoiceMetadata(invoiceData, filePath)

    return {
      invoiceNumber: invoiceData.invoiceNumber,
      pdfPath: filePath,
      previewUrl: `/api/print/customer-invoice?invoice_number=${invoiceData.invoiceNumber}`
    }
  } else {
    // Return preview URL for browser display
    const previewUrl = `/api/print/customer-invoice?customer_id=${params.customer_id}&period_start=${params.period_start}&period_end=${params.period_end}`
    
    return {
      invoiceNumber: invoiceData.invoiceNumber,
      pdfPath: null,
      previewUrl
    }
  }
}

// This function will be moved to the API route
export async function getInvoicesList(params?: {
  customer_id?: string
  status?: string
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from("invoice_metadata")
    .select(`
      *,
      customer:customers(billing_name, contact_person, phone_primary)
    `)
    .order("created_at", { ascending: false })

  if (params?.customer_id) {
    query = query.eq("customer_id", params.customer_id)
  }
  
  if (params?.status) {
    query = query.eq("status", params.status)
  }

  if (params?.date_from) {
    query = query.gte("invoice_date", params.date_from)
  }

  if (params?.date_to) {
    query = query.lte("invoice_date", params.date_to)
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  if (params?.offset) {
    query = query.range(params.offset, (params.offset) + (params.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching invoices:", error)
    return []
  }

  return data || []
}

export async function getInvoiceStats() {
  const supabase = await createClient()
  
  try {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const today = now.toISOString().split('T')[0]
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
    
    // 1. Ready for Generation - customers with subscription dues OR outstanding amounts
    
    // Get all customers with outstanding amounts
    const { data: customersWithOutstanding } = await supabase
      .from("customers")
      .select("id")
      .gt("outstanding_amount", 0)

    // Get all customers who have delivered subscription orders this month
    const { data: customersWithDeliveries } = await supabase
      .from("customers")
      .select(`
        id,
        daily_orders!inner(
          id,
          deliveries!inner(id)
        )
      `)
      .gte("daily_orders.order_date", startOfMonth)
      .lte("daily_orders.order_date", today)

    // Combine both sets of customers (subscription dues OR outstanding amounts)
    const eligibleCustomerIds = new Set([
      ...(customersWithOutstanding?.map(c => c.id) || []),
      ...(customersWithDeliveries?.map(c => c.id) || [])
    ])

    // Check which eligible customers already have invoices for current period
    const { data: existingInvoices } = await supabase
      .from("invoice_metadata")
      .select("customer_id")
      .in("customer_id", Array.from(eligibleCustomerIds))
      .gte("period_start", startOfMonth)
      .lte("period_end", today)

    const customersWithExistingInvoices = new Set(existingInvoices?.map(inv => inv.customer_id) || [])
    
    // Count customers who are eligible but don't have existing invoices
    const readyForGeneration = Array.from(eligibleCustomerIds).filter(customerId => 
      !customersWithExistingInvoices.has(customerId)
    ).length

    // 2. Total Generated Today
    const { data: todayInvoices } = await supabase
      .from("invoice_metadata")
      .select("id")
      .gte("created_at", `${today}T00:00:00`)
      .lt("created_at", `${today}T23:59:59`)

    const generatedToday = todayInvoices?.length || 0

    // 3. Invoices This Month
    const { data: monthInvoices } = await supabase
      .from("invoice_metadata")
      .select("id")
      .gte("invoice_date", startOfMonth)
      .lte("invoice_date", today)

    const invoicesThisMonth = monthInvoices?.length || 0

    // 4. Customers with Outstanding
    const { data: customersWithOutstandingFinal } = await supabase
      .from("customers")
      .select("id")
      .gt("outstanding_amount", 0)

    const customersWithOutstandingCount = customersWithOutstandingFinal?.length || 0
    
    return {
      readyForGeneration,
      generatedToday,
      invoicesThisMonth,
      customersWithOutstandingCount
    }
  } catch (error) {
    console.error("Error fetching invoice stats:", error)
    return {
      readyForGeneration: 0,
      generatedToday: 0,
      invoicesThisMonth: 0,
      customersWithOutstandingCount: 0
    }
  }
}

export async function deleteInvoice(invoiceId: string): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  
  try {
    // Start a transaction by getting the invoice data first
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoice_metadata")
      .select("*")
      .eq("id", invoiceId)
      .single()
      
    if (invoiceError || !invoice) {
      return { success: false, message: "Invoice not found" }
    }
    
    // Prevent deletion of paid invoices
    if (invoice.status === 'Paid') {
      return { success: false, message: "Cannot delete paid invoices" }
    }
    
    // Start transaction operations
    
    // 1. Revert linked credit sales back to 'Pending' status
    await revertLinkedSales(invoice.customer_id, invoice.period_start, invoice.period_end)
    
    // 2. Delete the invoice metadata record
    const { error: deleteError } = await supabase
      .from("invoice_metadata")
      .delete()
      .eq("id", invoiceId)
      
    if (deleteError) {
      throw new Error(`Failed to delete invoice: ${deleteError.message}`)
    }
    
    // 3. Recalculate customer outstanding amount
    await recalculateCustomerBalance(invoice.customer_id)
    
    return { 
      success: true, 
      message: `Invoice ${invoice.invoice_number} deleted successfully. Manual file cleanup required.` 
    }
    
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    }
  }
}

async function revertLinkedSales(customerId: string, periodStart: string, periodEnd: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("sales")
    .update({ 
      payment_status: 'Pending'
    })
    .eq("customer_id", customerId)
    .eq("sale_type", "Credit")
    .eq("payment_status", "Billed")
    .gte("sale_date", periodStart)
    .lte("sale_date", periodEnd)
    
  if (error) {
    throw new Error(`Failed to revert sales status: ${error.message}`)
  }
}

async function recalculateCustomerBalance(customerId: string) {
  const supabase = await createClient()
  
  // Get current outstanding from credit sales that are still pending
  const { data: pendingSales } = await supabase
    .from("sales")
    .select("total_amount")
    .eq("customer_id", customerId)
    .eq("sale_type", "Credit")
    .eq("payment_status", "Pending")
    
  // Get customer's opening balance
  const { data: customer } = await supabase
    .from("customers")
    .select("opening_balance")
    .eq("id", customerId)
    .single()
    
  const openingBalance = Number(customer?.opening_balance || 0)
  const pendingAmount = pendingSales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0
  const newOutstandingAmount = openingBalance + pendingAmount
  
  // Update customer's outstanding amount
  const { error } = await supabase
    .from("customers")
    .update({ outstanding_amount: newOutstandingAmount })
    .eq("id", customerId)
    
  if (error) {
    throw new Error(`Failed to recalculate customer balance: ${error.message}`)
  }
}

export async function bulkDeleteInvoices(invoiceIds: string[]): Promise<{
  successful: number
  failed: number
  errors: string[]
  messages: string[]
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
    messages: [] as string[]
  }

  for (const invoiceId of invoiceIds) {
    try {
      const result = await deleteInvoice(invoiceId)
      if (result.success) {
        results.successful++
        results.messages.push(result.message)
      } else {
        results.failed++
        results.errors.push(result.message)
      }
    } catch (error) {
      results.failed++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred'
      results.errors.push(`Invoice ${invoiceId}: ${errorMsg}`)
    }
  }

  return results
}

export async function generateInvoiceHTML(invoiceData: InvoiceData): Promise<string> {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber} - ${invoiceData.customer.billing_name}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      background: white;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2D5F2D;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
    }
    
    .logo {
      width: 60px;
      height: 60px;
      background: #2D5F2D;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin-right: 15px;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #2D5F2D;
      margin-bottom: 2px;
    }
    
    .company-tagline {
      font-size: 12px;
      color: #666;
      font-style: italic;
    }
    
    .company-address {
      text-align: right;
      font-size: 11px;
      color: #666;
      line-height: 1.3;
    }
    
    .invoice-title {
      text-align: center;
      font-size: 36px;
      font-weight: bold;
      color: #2D5F2D;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .customer-details {
      flex: 1;
    }
    
    .customer-title {
      font-size: 16px;
      font-weight: bold;
      color: #2D5F2D;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .customer-info {
      background: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #2D5F2D;
      border-radius: 0 8px 8px 0;
    }
    
    .customer-name {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    
    .invoice-meta {
      text-align: right;
      background: #2D5F2D;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-left: 30px;
    }
    
    .invoice-number {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      border: 2px solid #2D5F2D;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .items-table th {
      background: #2D5F2D;
      color: white;
      padding: 15px 10px;
      text-align: left;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-right: 1px solid rgba(255,255,255,0.2);
    }
    
    .items-table th:last-child {
      border-right: none;
      text-align: right;
    }
    
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #eee;
      border-right: 1px solid #eee;
    }
    
    .items-table td:last-child {
      border-right: none;
      text-align: right;
      font-weight: bold;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .totals-section {
      margin: 30px 0;
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-table {
      border-collapse: collapse;
      min-width: 300px;
    }
    
    .totals-table td {
      padding: 10px 20px;
      border: 1px solid #ddd;
    }
    
    .totals-table .label {
      font-weight: bold;
      background: #f8f9fa;
      text-align: right;
    }
    
    .totals-table .amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    .grand-total {
      background: #2D5F2D !important;
      color: white !important;
      font-size: 16px;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #2D5F2D;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #666;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Header with Logo and Company Info -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">👑</div>
      <div>
        <div class="company-name">PureDairy</div>
        <div class="company-tagline">Premium Quality Dairy Products</div>
      </div>
    </div>
    <div class="company-address">
      Plot No. G-2/8, MIDC,<br>
      Jalgaon - 3, MS, India.
    </div>
  </div>

  <!-- Invoice Title -->
  <h1 class="invoice-title">INVOICE</h1>

  <!-- Customer and Invoice Details -->
  <div class="invoice-details">
    <div class="customer-details">
      <div class="customer-title">Customer Name</div>
      <div class="customer-info">
        <div class="customer-name">${invoiceData.customer.billing_name}</div>
        <div>${invoiceData.customer.address}</div>
        <div>Contact: ${invoiceData.customer.contact_person}</div>
        <div>Phone: ${invoiceData.customer.phone_primary}</div>
      </div>
    </div>
    
    <div class="invoice-meta">
      <div class="invoice-number">Invoice No: ${invoiceData.invoiceNumber}</div>
      <div>Date: ${format(new Date(invoiceData.invoiceDate), 'dd/MM/yyyy')}</div>
      <div>Period: ${format(new Date(invoiceData.periodStart), 'dd/MM/yyyy')} to ${format(new Date(invoiceData.periodEnd), 'dd/MM/yyyy')}</div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.subscriptionItems.map(item => `
        <tr>
          <td>
            <strong>${item.productName}</strong><br>
            <small>Subscription deliveries</small>
          </td>
          <td>${item.quantity} ${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.unitPrice)}/${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.totalAmount)}</td>
        </tr>
      `).join('')}
      
      ${invoiceData.manualSalesItems.map(item => `
        <tr>
          <td>
            <strong>${item.productName}</strong><br>
            <small>Manual sale (${format(new Date(item.saleDate), 'dd/MM/yyyy')})</small>
          </td>
          <td>${item.quantity} ${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.unitPrice)}/${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.totalAmount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td class="label">Sub Total:</td>
        <td class="amount">${formatCurrency(invoiceData.totals.subscriptionAmount + invoiceData.totals.manualSalesAmount)}</td>
      </tr>
      ${invoiceData.totals.totalGstAmount > 0 ? `
      <tr>
        <td class="label">G.S.T.:</td>
        <td class="amount">${formatCurrency(invoiceData.totals.totalGstAmount)}</td>
      </tr>
      ` : ''}
      <tr class="grand-total">
        <td class="label">Grand Total:</td>
        <td class="amount">${formatCurrency(invoiceData.totals.grandTotal)}</td>
      </tr>
    </table>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <span>🌐 puredairy.net</span>
      <span style="margin-left: 20px;">📞 8767-206-236</span>
      <span style="margin-left: 20px;">📧 info@puredairy.net</span>
    </div>
  </div>
</body>
</html>
`
}