"use server"

import { createClient } from "@/lib/supabase/server"
import { getNextInvoiceNumber } from "@/lib/invoice-utils"
import { markSalesAsBilled } from "@/lib/actions/sales"
import { invoiceFileManager, generatePdfFromHtml, combinePdfs } from "@/lib/file-utils"
import { format } from "date-fns"
import path from "path"
import type { Customer } from "@/lib/types"
import { 
  formatDateForDatabase, 
  getCurrentISTDate, 
  addDaysIST, 
  getStartOfDayIST 
} from "@/lib/date-utils"

export interface InvoiceData {
  customer: Customer
  invoiceNumber: string
  invoiceDate: string
  periodStart: string
  periodEnd: string
  deliveryItems: InvoiceSubscriptionItem[]
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
  deliveryAmount: number
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

  // Get all delivery data (both subscription and additional deliveries)
  const { data: deliveries, error: deliveriesError } = await supabase
    .from("deliveries")
    .select(`
      *,
      product:products(*)
    `)
    .eq("customer_id", customerId)
    .eq("delivery_status", "delivered")
    .gte("order_date", periodStart)
    .lte("order_date", periodEnd)

  if (deliveriesError) {
    throw new Error("Failed to fetch subscription deliveries")
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

  // Process all delivery items (both subscription and additional deliveries)
  const deliveryItemsMap = new Map<string, InvoiceSubscriptionItem>()
  
  deliveries?.forEach(delivery => {
    const key = delivery.product.id
    const existing = deliveryItemsMap.get(key)
    
    // Use actual delivered quantity (self-contained delivery data)
    const actualQuantity = Number(delivery.actual_quantity || 0)
    const actualTotalAmount = actualQuantity * Number(delivery.unit_price)
    
    if (existing) {
      existing.quantity += actualQuantity
      existing.totalAmount += actualTotalAmount
    } else {
      deliveryItemsMap.set(key, {
        productName: delivery.product.name,
        productCode: delivery.product.code,
        quantity: actualQuantity,
        unitPrice: Number(delivery.unit_price),
        totalAmount: actualTotalAmount,
        unitOfMeasure: delivery.product.unit_of_measure || delivery.product.unit
      })
    }
  })

  const deliveryItems = Array.from(deliveryItemsMap.values())

  // Process manual sales items with aggregation by product
  const manualSalesItemsMap = new Map<string, InvoiceManualSaleItem>()
  
  manualSales?.forEach(sale => {
    const key = sale.product.id
    const existing = manualSalesItemsMap.get(key)
    
    if (existing) {
      // Aggregate quantities and amounts
      existing.quantity += Number(sale.quantity)
      existing.totalAmount += Number(sale.total_amount)
      existing.gstAmount += Number(sale.gst_amount)
    } else {
      manualSalesItemsMap.set(key, {
        productName: sale.product.name,
        productCode: sale.product.code,
        quantity: Number(sale.quantity),
        unitPrice: Number(sale.unit_price),
        totalAmount: Number(sale.total_amount),
        gstAmount: Number(sale.gst_amount),
        unitOfMeasure: sale.product.unit_of_measure,
        saleDate: sale.sale_date // Keep the first sale date for reference
      })
    }
  })

  const manualSalesItems = Array.from(manualSalesItemsMap.values())

  // Create daily summary (both subscription + manual sales)
  const dailySummaryMap = new Map<string, InvoiceDailySummaryItem>()
  
  // Add subscription deliveries to daily summary
  deliveries?.forEach(delivery => {
    const dateKey = delivery.order_date
    const existing = dailySummaryMap.get(dateKey)
    
    // Use actual delivered quantity (self-contained delivery data)
    const actualQuantity = Number(delivery.actual_quantity || 0)
    
    const item = {
      productName: delivery.product.name,
      quantity: actualQuantity,
      unitOfMeasure: delivery.product.unit_of_measure || delivery.product.unit
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
  const deliveryAmount = deliveryItems.reduce((sum, item) => sum + item.totalAmount, 0)
  const manualSalesAmount = manualSalesItems.reduce((sum, item) => sum + item.totalAmount, 0)
  const totalGstAmount = manualSalesItems.reduce((sum, item) => sum + item.gstAmount, 0)
  const grandTotal = deliveryAmount + manualSalesAmount

  return {
    customer,
    invoiceNumber,
    invoiceDate: formatDateForDatabase(getCurrentISTDate()),
    periodStart,
    periodEnd,
    deliveryItems,
    manualSalesItems,
    dailySummary,
    totals: {
      deliveryAmount,
      manualSalesAmount,
      totalGstAmount,
      grandTotal
    }
  }
}

export async function saveInvoiceMetadata(invoiceData: InvoiceData, filePath: string) {
  const supabase = await createClient()

  // Insert invoice metadata with enhanced fields
  const { data: invoiceMetadata, error } = await supabase
    .from("invoice_metadata")
    .insert({
      invoice_number: invoiceData.invoiceNumber,
      customer_id: invoiceData.customer.id,
      invoice_date: invoiceData.invoiceDate,
      period_start: invoiceData.periodStart,
      period_end: invoiceData.periodEnd,
      subscription_amount: invoiceData.totals.deliveryAmount,
      manual_sales_amount: invoiceData.totals.manualSalesAmount,
      total_amount: invoiceData.totals.grandTotal,
      gst_amount: invoiceData.totals.totalGstAmount,
      file_path: filePath,
      invoice_status: 'sent', // Initialize as sent (unpaid)
      amount_paid: 0,
      amount_outstanding: invoiceData.totals.grandTotal,
      due_date: formatDateForDatabase(addDaysIST(getCurrentISTDate(), 30)), // 30 days from now
      status: 'Generated'
    })
    .select()
    .single()

  if (error || !invoiceMetadata) {
    throw new Error(`Failed to save invoice metadata: ${error?.message}`)
  }

  // Create invoice line items for delivery orders
  await createDeliveryLineItems(
    invoiceMetadata.id, 
    invoiceData.customer.id, 
    invoiceData.periodStart, 
    invoiceData.periodEnd
  )

  // Create invoice line items for manual sales
  const salesLineItems = await createSalesLineItems(
    invoiceMetadata.id, 
    invoiceData.customer.id, 
    invoiceData.periodStart, 
    invoiceData.periodEnd
  )

  // Mark manual sales as billed
  if (invoiceData.manualSalesItems.length > 0) {
    const saleIds = salesLineItems.map(item => item.sale_id).filter(id => id)
    if (saleIds.length > 0) {
      await markSalesAsBilled(saleIds, invoiceData.invoiceNumber)
    }
  }

  return invoiceMetadata.id
}

// Helper function to get unbilled delivery amount for a customer
async function getUnbilledDeliveryAmount(
  customerId: string, 
  periodStart: string, 
  periodEnd: string
): Promise<number> {
  const supabase = await createClient()
  
  // Use SQL to efficiently get delivered orders that are NOT in invoice_line_items
  const { data } = await supabase.rpc('get_unbilled_deliveries', {
    customer_id: customerId,
    period_start: periodStart,
    period_end: periodEnd
  })
  
  // Fallback to manual query using self-contained deliveries table
  if (!data) {
    // Get all delivered deliveries for the customer in the period (including additional deliveries)
    const { data: deliveredDeliveries } = await supabase
      .from("deliveries")
      .select(`
        id,
        daily_order_id,
        actual_quantity,
        unit_price,
        total_amount
      `)
      .eq("customer_id", customerId)
      .eq("delivery_status", "delivered")
      .gte("order_date", periodStart)
      .lte("order_date", periodEnd)
    
    if (!deliveredDeliveries || deliveredDeliveries.length === 0) return 0
    
    // Get deliveries that are already billed (cleaner approach - only check delivery_id)
    const deliveryIds = deliveredDeliveries.map(delivery => delivery.id)
    
    if (deliveryIds.length === 0) return 0
      
    // Check for billed deliveries using direct delivery_id reference
    const { data: billedItems } = await supabase
      .from("invoice_line_items")
      .select("delivery_id")
      .in("delivery_id", deliveryIds)
      .not("delivery_id", "is", null)
    
    const billedDeliveryIds = new Set(billedItems?.map(item => item.delivery_id) || [])
    
    // Calculate total amount for unbilled deliveries using actual delivered quantities
    return deliveredDeliveries
      .filter(delivery => !billedDeliveryIds.has(delivery.id))
      .reduce((sum, delivery) => {
        // Use self-contained delivery data
        const actualQuantity = Number(delivery.actual_quantity || 0)
        const actualAmount = actualQuantity * Number(delivery.unit_price)
        return sum + actualAmount
      }, 0)
  }
  
  return Number(data[0]?.total_amount || 0)
}

// Helper function to get unbilled credit sales amount for a customer
async function getUnbilledCreditSalesAmount(
  customerId: string,
  periodStart: string,
  periodEnd: string
): Promise<number> {
  const supabase = await createClient()
  
  // Get all credit sales for the customer in the period
  const { data: creditSales } = await supabase
    .from("sales")
    .select("id, total_amount")
    .eq("customer_id", customerId)
    .eq("sale_type", "Credit")
    .gte("sale_date", periodStart)
    .lte("sale_date", periodEnd)
  
  if (!creditSales || creditSales.length === 0) return 0
  
  // Get sale IDs that are already billed
  const saleIds = creditSales.map(sale => sale.id)
  const { data: billedSales } = await supabase
    .from("invoice_line_items")
    .select("sale_id")
    .in("sale_id", saleIds)
    .not("sale_id", "is", null)
  
  const billedSaleIds = new Set(billedSales?.map(item => item.sale_id) || [])
  
  // Calculate total amount for unbilled sales
  return creditSales
    .filter(sale => !billedSaleIds.has(sale.id))
    .reduce((sum, sale) => sum + Number(sale.total_amount), 0)
}

// Helper function to check for existing invoice in period
async function checkExistingInvoice(
  customerId: string,
  periodStart: string,
  periodEnd: string
): Promise<{ hasInvoice: boolean; invoiceNumber?: string }> {
  const supabase = await createClient()
  
  const { data: existingInvoice } = await supabase
    .from("invoice_metadata")
    .select("invoice_number")
    .eq("customer_id", customerId)
    .gte("period_start", periodStart)
    .lte("period_end", periodEnd)
    .single()
  
  return {
    hasInvoice: !!existingInvoice,
    invoiceNumber: existingInvoice?.invoice_number
  }
}

// Helper function to filter customers by selection criteria
function filterCustomersBySelection(
  items: BulkInvoicePreviewItem[], 
  selection: string
): BulkInvoicePreviewItem[] {
  switch (selection) {
    case 'with_unbilled_deliveries':
      return items.filter(item => item.subscriptionAmount > 0)
    
    case 'with_unbilled_credit_sales':
      return items.filter(item => item.creditSalesAmount > 0)
    
    case 'with_unbilled_transactions':
      return items.filter(item => item.totalAmount > 0)
    
    case 'all':
    default:
      return items
  }
}

export async function getBulkInvoicePreview(params: {
  period_start: string
  period_end: string
  customer_selection: 'all' | 'with_unbilled_deliveries' | 'with_unbilled_credit_sales' | 'with_unbilled_transactions' | 'selected'
  selected_customer_ids?: string[]
}): Promise<BulkInvoicePreviewItem[]> {
  const supabase = await createClient()

  // PERFORMANCE OPTIMIZATION: Single optimized query instead of N+1 problem
  // Build a single SQL query that gets all required data in one call
  let customerFilter = ''
  if (params.customer_selection === 'selected' && params.selected_customer_ids?.length) {
    const customerIdsList = params.selected_customer_ids.map(id => `'${id}'`).join(',')
    customerFilter = `AND c.id IN (${customerIdsList})`
  }

  const { data: previewData, error } = await supabase.rpc('get_bulk_invoice_preview_optimized', {
    period_start: params.period_start,
    period_end: params.period_end,
    customer_filter: customerFilter
  })

  if (error) {
    console.warn('Optimized query failed, falling back to original method:', error)
    return await getBulkInvoicePreviewFallback(params)
  }

  // Convert the optimized result to the expected format
  const previewItems: BulkInvoicePreviewItem[] = (previewData || []).map((row: Record<string, unknown>) => ({
    customerId: row.customer_id,
    customerName: row.customer_name,
    subscriptionAmount: Number(row.unbilled_delivery_amount || 0),
    creditSalesAmount: Number(row.unbilled_credit_sales_amount || 0),
    totalAmount: Number(row.total_unbilled_amount || 0),
    hasExistingInvoice: row.has_existing_invoice || false,
    existingInvoiceNumber: row.existing_invoice_number
  }))

  // Apply customer selection filter using helper function
  const filteredItems = filterCustomersBySelection(previewItems, params.customer_selection)

  return filteredItems.sort((a, b) => a.customerName.localeCompare(b.customerName))
}

// Fallback to original N+1 query method if optimized query doesn't exist
async function getBulkInvoicePreviewFallback(params: {
  period_start: string
  period_end: string
  customer_selection: 'all' | 'with_unbilled_deliveries' | 'with_unbilled_credit_sales' | 'with_unbilled_transactions' | 'selected'
  selected_customer_ids?: string[]
}): Promise<BulkInvoicePreviewItem[]> {
  const supabase = await createClient()

  // Get all customers first (filtering will be applied after calculating unbilled amounts)
  let customersQuery = supabase
    .from("customers")
    .select("id, billing_name")

  // Apply customer selection filter if 'selected' option is chosen
  if (params.customer_selection === 'selected' && params.selected_customer_ids) {
    customersQuery = customersQuery.in("id", params.selected_customer_ids)
  }

  const { data: customers, error: customersError } = await customersQuery

  if (customersError) {
    throw new Error("Failed to fetch customers")
  }

  const previewItems: BulkInvoicePreviewItem[] = []

  for (const customer of customers || []) {
    // Calculate unbilled delivery amount using helper function
    const unbilledDeliveryAmount = await getUnbilledDeliveryAmount(
      customer.id, 
      params.period_start, 
      params.period_end
    )
    
    // Calculate unbilled credit sales amount using helper function
    const unbilledCreditSalesAmount = await getUnbilledCreditSalesAmount(
      customer.id, 
      params.period_start, 
      params.period_end
    )
    
    const totalAmount = unbilledDeliveryAmount + unbilledCreditSalesAmount
    
    // Check for existing invoice in this period using helper function
    const existingInvoiceInfo = await checkExistingInvoice(
      customer.id, 
      params.period_start, 
      params.period_end
    )
    
    previewItems.push({
      customerId: customer.id,
      customerName: customer.billing_name,
      subscriptionAmount: unbilledDeliveryAmount,
      creditSalesAmount: unbilledCreditSalesAmount,
      totalAmount,
      hasExistingInvoice: existingInvoiceInfo.hasInvoice,
      existingInvoiceNumber: existingInvoiceInfo.invoiceNumber
    })
  }

  // Apply customer selection filter using helper function
  const filteredItems = filterCustomersBySelection(previewItems, params.customer_selection)

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
    const now = getCurrentISTDate()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const today = formatDateForDatabase(now)
    const startOfMonth = formatDateForDatabase(getStartOfDayIST(new Date(currentYear, currentMonth, 1)))
    
    // 1. Ready for Generation - customers with subscription dues OR outstanding amounts
    
    // Get all customers with outstanding amounts
    const { data: customersWithOutstanding } = await supabase
      .from("customer_outstanding_summary")
      .select("customer_id")
      .gt("total_outstanding", 0)

    // Get all customers who have any delivered items this month (subscription + additional)
    // First get customer IDs from deliveries
    const { data: deliveryCustomerIds } = await supabase
      .from("deliveries")
      .select("customer_id")
      .eq("delivery_status", "delivered")
      .gte("order_date", startOfMonth)
      .lte("order_date", today)
    
    const uniqueCustomerIds = [...new Set(deliveryCustomerIds?.map(d => d.customer_id) || [])]
    
    const { data: customersWithDeliveries } = uniqueCustomerIds.length > 0 
      ? await supabase
          .from("customers")
          .select("id")
          .in("id", uniqueCustomerIds)
      : { data: [] }

    // Combine both sets of customers (subscription dues OR outstanding amounts)
    const eligibleCustomerIds = new Set([
      ...(customersWithOutstanding?.map(c => c.customer_id) || []),
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
      .from("customer_outstanding_summary")
      .select("customer_id")
      .gt("total_outstanding", 0)

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
    
    // 2. Delete invoice line items to make transactions "unbilled" again
    const { error: lineItemsError } = await supabase
      .from("invoice_line_items")
      .delete()
      .eq("invoice_id", invoiceId)
      
    if (lineItemsError) {
      throw new Error(`Failed to delete invoice line items: ${lineItemsError.message}`)
    }
    
    // 3. Delete the invoice metadata record
    const { error: deleteError } = await supabase
      .from("invoice_metadata")
      .delete()
      .eq("id", invoiceId)
      
    if (deleteError) {
      throw new Error(`Failed to delete invoice: ${deleteError.message}`)
    }
    
    // 4. Recalculate customer outstanding amount
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
  // Note: Customer outstanding is now calculated dynamically through the invoice system
  // No need to update a stored outstanding_amount field as it was removed
  // Outstanding amounts are calculated via:
  // 1. Opening balance (customers.opening_balance)
  // 2. Unpaid invoices (invoice_metadata where invoice_status != 'paid')
  // 3. Unbilled transactions (deliveries/sales not in invoice_line_items)
  
  // This function is kept for compatibility but does nothing
  // Outstanding calculations happen in real-time via database views and functions
  console.log(`Customer balance recalculation skipped for ${customerId} - using dynamic calculation system`)
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

async function createDeliveryLineItems(
  invoiceId: string, 
  customerId: string, 
  periodStart: string, 
  periodEnd: string
): Promise<Array<{delivery_id: string; invoice_id: string}>> {
  const supabase = await createClient()

  // Get all delivered deliveries for this period (both subscription and additional)
  const { data: deliveredDeliveries } = await supabase
    .from("deliveries")
    .select(`
      id,
      daily_order_id,
      actual_quantity,
      unit_price,
      total_amount,
      product:products(
        id,
        name,
        gst_rate
      )
    `)
    .eq("customer_id", customerId)
    .eq("delivery_status", "delivered")
    .gte("order_date", periodStart)
    .lte("order_date", periodEnd)

  if (!deliveredDeliveries?.length) return []

  // Create line items for each delivered delivery with ALL required fields
  const lineItemsData = deliveredDeliveries.map(delivery => {
    // Use actual delivered quantity from self-contained delivery data
    const actualQuantity = Number(delivery.actual_quantity || 0)
    const actualLineTotal = actualQuantity * Number(delivery.unit_price)
    
    // Handle product data - it should be a single object, not array
    const product = Array.isArray(delivery.product) ? delivery.product[0] : delivery.product
    
    // All deliveries use 'subscription' type (simplified architecture post-refactor)
    const lineItemType = 'subscription'
    
    return {
      invoice_id: invoiceId,
      delivery_id: delivery.id, // Direct reference to delivery record (cleaner architecture)
      line_item_type: lineItemType,
      product_id: product.id,
      product_name: product.name,
      quantity: actualQuantity,
      unit_price: Number(delivery.unit_price),
      line_total: actualLineTotal,
      gst_rate: Number(product.gst_rate || 0),
      gst_amount: 0 // Deliveries typically don't have GST
    }
  })

  const { data: lineItems, error } = await supabase
    .from("invoice_line_items")
    .insert(lineItemsData)
    .select()

  if (error) {
    console.error('Error creating delivery line items:', error)
    return []
  }

  return lineItems || []
}

async function createSalesLineItems(
  invoiceId: string, 
  customerId: string, 
  periodStart: string, 
  periodEnd: string
): Promise<Array<{sale_id: string; invoice_id: string}>> {
  const supabase = await createClient()

  // Get credit sales for this period with ALL required data
  const { data: creditSales } = await supabase
    .from("sales")
    .select(`
      id,
      quantity,
      unit_price,
      total_amount,
      gst_amount,
      product:products(
        id,
        name,
        gst_rate
      )
    `)
    .eq("customer_id", customerId)
    .eq("sale_type", "Credit")
    .eq("payment_status", "Pending")
    .gte("sale_date", periodStart)
    .lte("sale_date", periodEnd)

  if (!creditSales?.length) return []

  // Create line items for each credit sale with ALL required fields
  const lineItemsData = creditSales.map(sale => {
    // Handle product data - it should be a single object, not array
    const product = Array.isArray(sale.product) ? sale.product[0] : sale.product
    
    return {
      invoice_id: invoiceId,
      sale_id: sale.id,
      line_item_type: 'manual_sale',
      product_id: product.id,
      product_name: product.name,
      quantity: Number(sale.quantity),
      unit_price: Number(sale.unit_price),
      line_total: Number(sale.total_amount),
      gst_rate: Number(product.gst_rate || 0),
      gst_amount: Number(sale.gst_amount || 0)
    }
  })

  const { data: lineItems, error } = await supabase
    .from("invoice_line_items")
    .insert(lineItemsData)
    .select()

  if (error) {
    console.error('Error creating sales line items:', error)
    return []
  }

  return lineItems || []
}

/**
 * Enhanced function to mark invoice as paid with automatic sales completion
 * Replaces manual invoice status updates with atomic transaction processing
 */
export async function markInvoiceAsPaid(
  invoiceId: string, 
  options: { revalidate?: boolean } = {}
) {
  const supabase = await createClient()
  
  try {
    // Use atomic database function for consistency
    const { data, error } = await supabase.rpc('process_invoice_payment_atomic', {
      p_invoice_id: invoiceId,
      p_new_status: 'Paid'
    })
    
    if (error) {
      console.error('Invoice payment processing failed:', error)
      throw new Error(`Failed to mark invoice as paid: ${error.message}`)
    }
    
    const result = data as {
      success: boolean
      invoice_id: string
      new_status: string
      updated_sales_count: number
      timestamp: string
    }
    
    console.log(`Invoice ${invoiceId} marked as paid. Updated ${result.updated_sales_count} sales to completed.`)
    
    // Trigger UI updates if requested (default: true)
    if (options.revalidate !== false) {
      const { revalidatePath } = await import("next/cache")
      revalidatePath('/dashboard/invoices')
      revalidatePath('/dashboard/sales')
      revalidatePath('/dashboard/outstanding')
      revalidatePath(`/dashboard/invoices/${invoiceId}`)
    }
    
    return {
      success: true,
      updatedSalesCount: result.updated_sales_count,
      timestamp: result.timestamp
    }
    
  } catch (error) {
    console.error('Invoice payment processing error:', error)
    throw error
  }
}

/**
 * Enhanced function to delete invoice with automatic sales reversion
 * Ensures sales don't remain orphaned in 'Billed' status
 * Replaces the existing deleteInvoice function for better safety
 */
export async function deleteInvoiceWithSalesRevert(
  invoiceId: string,
  options: { revalidate?: boolean } = {}
) {
  const supabase = await createClient()
  
  try {
    // Use atomic database function for consistency
    const { data, error } = await supabase.rpc('delete_invoice_and_revert_sales', {
      p_invoice_id: invoiceId
    })
    
    if (error) {
      console.error('Invoice deletion failed:', error)
      throw new Error(`Failed to delete invoice: ${error.message}`)
    }
    
    const result = data as {
      success: boolean
      deleted_invoice_id: string
      reverted_sales_count: number
      timestamp: string
    }
    
    console.log(`Invoice ${invoiceId} deleted. Reverted ${result.reverted_sales_count} sales to pending.`)
    
    // Trigger UI updates if requested (default: true)
    if (options.revalidate !== false) {
      const { revalidatePath } = await import("next/cache")
      revalidatePath('/dashboard/invoices')
      revalidatePath('/dashboard/sales')
      revalidatePath('/dashboard/outstanding')
    }
    
    return {
      success: true,
      revertedSalesCount: result.reverted_sales_count,
      timestamp: result.timestamp
    }
    
  } catch (error) {
    console.error('Invoice deletion error:', error)
    throw error
  }
}

/**
 * Enhanced bulk delete invoices with automatic sales reversion
 * Uses the enhanced deleteInvoiceWithSalesRevert for each invoice
 */
export async function bulkDeleteInvoicesWithSalesRevert(invoiceIds: string[]): Promise<{
  successful: number
  failed: number
  errors: string[]
  messages: string[]
  totalRevertedSales: number
}> {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
    messages: [] as string[],
    totalRevertedSales: 0
  }

  for (const invoiceId of invoiceIds) {
    try {
      const result = await deleteInvoiceWithSalesRevert(invoiceId, { revalidate: false })
      if (result.success) {
        results.successful++
        results.totalRevertedSales += result.revertedSalesCount
        results.messages.push(`Invoice ${invoiceId.substring(0, 8)}... deleted successfully${result.revertedSalesCount > 0 ? ` (${result.revertedSalesCount} sales reverted)` : ''}`)
      } else {
        results.failed++
        results.errors.push(`Invoice ${invoiceId.substring(0, 8)}... failed to delete`)
      }
    } catch (error) {
      results.failed++
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      results.errors.push(`Invoice ${invoiceId.substring(0, 8)}...: ${errorMsg}`)
    }
  }

  // Trigger UI updates once at the end for better performance
  if (results.successful > 0) {
    const { revalidatePath } = await import("next/cache")
    revalidatePath('/dashboard/invoices')
    revalidatePath('/dashboard/sales')
    revalidatePath('/dashboard/outstanding')
  }

  return results
}

export async function generateInvoiceHTML(invoiceData: InvoiceData): Promise<string> {
  // Import the utility functions from invoice-utils
  const { 
    getInvoiceAssets, 
    calculateResponsiveFontSizes, 
    getOpenSansFontCSS,
    formatDailySummaryForColumns 
  } = await import('@/lib/invoice-utils')
  
  // Get all assets converted to base64
  const assets = getInvoiceAssets()
  
  // Calculate responsive font sizes based on content volume
  const totalLineItems = invoiceData.deliveryItems.length + invoiceData.manualSalesItems.length
  const fontSizes = calculateResponsiveFontSizes({
    dailySummaryDays: invoiceData.dailySummary.length,
    productCount: [...new Set([...invoiceData.deliveryItems, ...invoiceData.manualSalesItems].map(item => item.productName))].length,
    totalLineItems
  })
  
  // Format daily summary for 4-column layout
  const dailySummaryColumns = formatDailySummaryForColumns(invoiceData.dailySummary)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber} - ${invoiceData.customer.billing_name}</title>
  <style>
    ${getOpenSansFontCSS()}
    
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 10mm; /* 15mm all sides, 10mm right as per spec */
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Open Sans", sans-serif;
      font-size: ${fontSizes.baseSize}px;
      line-height: 1.4;
      color: #333;
      background: #ffffff; /* Light off-white background as per spec */
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px 0;
      background: white;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
    }
    
    .logo-img {
      width: 120px; /* Increased by 1.5x (80px * 1.5) */
      height: auto;
    }
    
    .invoice-title {
      text-align: center;
      font-size: ${fontSizes.titleSize}px;
      font-weight: 800; /* Extra bold for title */
      color: #000000;
      letter-spacing: 2px;
      flex: 1; /* Take remaining space in the center */
    }
    
    .company-address {
      text-align: right;
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
      font-weight: 400; /* Regular weight */
      color: #666;
      line-height: 1.3;
    }
    
    .main-content {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .left-section {
      flex: 1;
      max-width: 35%;
    }
    
    .customer-title {
      font-size: ${fontSizes.baseSize + 2}px;
      font-weight: 800; /* Extra bold for headers */
      color: black;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .customer-info {
      font-weight: 500; /* Medium weight for content */
      margin-bottom: 20px;
    }
    
    .customer-name {
      font-size: ${fontSizes.baseSize + 2}px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }
    
    .invoice-meta {
      font-weight: 500;
      margin-bottom: 20px;
    }
    
    .invoice-number {
      font-size: ${fontSizes.baseSize + 2}px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .right-section {
      flex: 2;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      background: #fdfbf9; /* Main table background as per spec */
      border: 1px solid #025e24;
    }
    
    .items-table th {
      background: #025e24; /* Custom green header */
      color: white;
      padding: 12px 8px;
      text-align: center;
      font-weight: 800; /* Extra bold for headers */
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
      border: 1px solid #025e24;
    }
    
    .items-table th:first-child {
      text-align: left;
    }
    
    .items-table th:last-child {
      text-align: right;
    }
    
    .items-table td {
      padding: 8px;
      border: 1px solid #ddd;
      font-weight: 500; /* Medium weight for content */
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
    }
    
    .items-table td:last-child {
      text-align: right;
      font-weight: 500;
    }
    
    .totals-section {
      margin: 15px 0;
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-table {
      border-collapse: collapse;
      background: #fdfbf9;
    }
    
    .totals-table td {
      padding: 6px 15px;
      border: 1px solid #ddd;
      font-weight: 500;
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
    }
    
    .totals-table .label {
      text-align: right;
      font-weight: 500;
    }
    
    .totals-table .amount {
      text-align: right;
    }
    
    .grand-total {
      font-weight: 800;
      font-size: ${fontSizes.baseSize}px;
    }
    
    .qr-section {
      margin: 20px 0;
      text-align: center;
    }
    
    .qr-code-img {
      max-width: 140px;
      height: auto;
      border: 1px solid #ddd;
    }
    
    .daily-summary {
      margin: 20px 0;
      border: 1px solid #666;
      background: white;
    }
    
    .daily-summary-title {
      padding: 8px 15px;
      font-size: ${fontSizes.baseSize}px;
      font-weight: 800; /* Extra bold for headers */
      color: black;
      border-bottom: 1px solid #666;
    }
    
    .daily-summary-content {
      padding: 15px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      font-size: ${fontSizes.summarySize}px;
      font-weight: 400; /* Regular weight for summary */
    }
    
    .daily-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .daily-entry {
      margin-bottom: 8px;
    }
    
    .daily-date {
      font-weight: 500;
      color: black;
      margin-bottom: 3px;
    }
    
    .daily-product {
      font-size: ${Math.max(fontSizes.summarySize - 1, 8)}px;
      color: #666;
      margin-left: 8px;
      line-height: 1.2;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 40px;
      font-size: ${Math.max(fontSizes.baseSize - 2, 8)}px;
      color: black;
      background: white;
      padding: 10px;
    }
    
    .footer-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .footer-icon {
      width: 16px;
      height: 16px;
    }
    
    /* Print optimizations for 300 DPI */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .items-table, .daily-summary {
        break-inside: avoid;
      }
      
      .daily-summary-content {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header with Logo, Invoice Title, and Company Address -->
  <div class="header">
    <div class="logo-section">
      ${assets.logo ? `<img src="${assets.logo}" alt="PureDairy Logo" class="logo-img">` : ''}
    </div>
    <h1 class="invoice-title">INVOICE</h1>
    <div class="company-address">
      Plot No. G-2/8, MIDC,<br>
      Jalgaon - 3, MS, India.
    </div>
  </div>

  <!-- Main Content Layout -->
  <div class="main-content">
    <!-- Left Section: Customer Details + QR Code -->
    <div class="left-section">
      <div class="customer-title">CUSTOMER NAME</div>
      <div class="customer-info">
        <div class="customer-name">${invoiceData.customer.billing_name}</div>
        <div>${invoiceData.customer.address || ''}</div>
      </div>
      
      <div class="invoice-meta">
        <div class="invoice-number">Invoice No: ${invoiceData.invoiceNumber}</div>
        <div>Date: ${format(new Date(invoiceData.invoiceDate), 'dd/MM/yyyy')}</div>
      </div>

      <!-- QR Code positioned above daily summary -->
      ${assets.qrCode ? `
      <div class="qr-section">
        <img src="${assets.qrCode}" alt="Payment QR Code" class="qr-code-img">
      </div>
      ` : ''}
    </div>

    <!-- Right Section: Items Table -->
    <div class="right-section">
      <table class="items-table">
        <thead>
          <tr>
            <th>Item Description</th>
            <th>Quantity</th>
            <th>Price<br><small>incl. GST</small></th>
            <th>Totals</th>
          </tr>
        </thead>
        <tbody>
          ${(invoiceData.deliveryItems || []).map(item => `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align: center;">${item.quantity} ${item.unitOfMeasure}</td>
              <td style="text-align: center;">₹ ${item.unitPrice.toFixed(2)}</td>
              <td>₹ ${item.totalAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
          ${(invoiceData.manualSalesItems || []).map(item => `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align: center;">${item.quantity} ${item.unitOfMeasure}</td>
              <td style="text-align: center;">₹ ${item.unitPrice.toFixed(2)}</td>
              <td>₹ ${item.totalAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">SUB TOTAL</td>
            <td class="amount">₹ ${(invoiceData.totals.deliveryAmount + invoiceData.totals.manualSalesAmount).toFixed(2)}</td>
          </tr>
          ${invoiceData.totals.totalGstAmount > 0 ? `
          <tr>
            <td class="label">G.S.T.</td>
            <td class="amount">₹ ${invoiceData.totals.totalGstAmount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="grand-total">
            <td class="label">GRAND TOTAL</td>
            <td class="amount">₹ ${invoiceData.totals.grandTotal.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- 4-Column Daily Summary -->
  ${invoiceData.dailySummary.length > 0 ? `
  <div class="daily-summary">
    <div class="daily-summary-title">Daily Summary:</div>
    <div class="daily-summary-content">
      ${dailySummaryColumns.map(column => `
        <div class="daily-column">
          ${column.map(day => `
            <div class="daily-entry">
              <div class="daily-date">${day.formattedDate}</div>
              ${day.items.map(item => `
                <div class="daily-product">${item}</div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Footer with SVG Icons -->
  <div class="footer">
    <div class="footer-item">
      ${assets.footerIcons.website ? `<img src="${assets.footerIcons.website}" alt="Website" class="footer-icon">` : '🌐'}
      <span>puredairy.net</span>
    </div>
    <div class="footer-item">
      ${assets.footerIcons.phone ? `<img src="${assets.footerIcons.phone}" alt="Phone" class="footer-icon">` : '📞'}
      <span>8767-206-236</span>
    </div>
    <div class="footer-item">
      ${assets.footerIcons.email ? `<img src="${assets.footerIcons.email}" alt="Email" class="footer-icon">` : '📧'}
      <span>info@puredairy.net</span>
    </div>
  </div>
</body>
</html>
`
}