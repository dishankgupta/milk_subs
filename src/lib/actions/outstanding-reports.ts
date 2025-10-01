"use server"

import { createClient } from "@/lib/supabase/server"
import { formatDateForAPI } from "@/lib/utils"
import type { Customer } from "@/lib/types"
import { formatTimestampForDatabase, getCurrentISTDate, addDaysIST, formatDateForDatabase } from "@/lib/date-utils"
import type { 
  OutstandingReportConfiguration, 
  OutstandingCustomerData,
  OutstandingReportSummary,
  MonthlySubscriptionBreakdown,
  ManualSalesBreakdown,
  PaymentBreakdown,
  UnappliedPaymentsBreakdown,
  SubscriptionProductDetail,
  ManualSaleDetail,
  PaymentDetail,
  UnappliedPaymentDetail
} from "@/lib/types/outstanding-reports"

export async function generateOutstandingReport(
  config: OutstandingReportConfiguration
): Promise<{
  customers: OutstandingCustomerData[]
  summary: OutstandingReportSummary
}> {
  const supabase = await createClient()
  const startDate = formatDateForAPI(config.start_date)
  const endDate = formatDateForAPI(config.end_date)
  
  console.log("Outstanding report config:", { startDate, endDate, customer_selection: config.customer_selection })
  
  let customersQuery
  
  // Handle special cases that need different data sources
  if (config.customer_selection === 'all' || config.customer_selection === 'with_credit') {
    // Query all customers directly from base tables for "All customers" and "Net credit" selections
    // because the view excludes customers with zero outstanding amounts
    customersQuery = supabase
      .rpc('get_all_customers_outstanding_data')
      .order("billing_name")
    
    // Apply filter after getting all customer data
    if (config.customer_selection === 'with_credit') {
      const { data: customersWithNetCredit } = await supabase
        .rpc('get_customers_with_net_credit')
      
      if (customersWithNetCredit && customersWithNetCredit.length > 0) {
        const customerIdsWithNetCredit = customersWithNetCredit.map((c: { customer_id: string }) => c.customer_id)
        customersQuery = customersQuery.in("customer_id", customerIdsWithNetCredit)
      } else {
        // If no customers have net credit, return empty result
        customersQuery = customersQuery.eq("customer_id", "00000000-0000-0000-0000-000000000000") // Non-existent UUID
      }
    }
  } else {
    // Use the optimized filtered view for other selections
    customersQuery = supabase
      .from("outstanding_report_data")
      .select("*")
      .order("billing_name")

    // Apply customer selection filters
    if (config.customer_selection === 'selected' && config.selected_customer_ids) {
      customersQuery = customersQuery.in("customer_id", config.selected_customer_ids)
    } else if (config.customer_selection === 'with_outstanding') {
      customersQuery = customersQuery.gt("total_outstanding", 0)
    }
  }

  const { data: customerSummaries, error: customersError } = await customersQuery

  if (customersError) {
    throw new Error("Failed to fetch customer summaries")
  }

  if (!customerSummaries || customerSummaries.length === 0) {
    return {
      customers: [],
      summary: {
        total_customers: 0,
        customers_with_outstanding: 0,
        total_opening_balance: 0,
        total_subscription_amount: 0,
        total_manual_sales_amount: 0,
        total_payments_amount: 0,
        total_unapplied_payments_amount: 0,
        total_outstanding_amount: 0,
        net_outstanding_amount: 0
      }
    }
  }

  // Get all customer IDs for batch processing
  const customerIds = customerSummaries.map((c: { customer_id: string }) => c.customer_id)

  // Batch fetch all detailed data in parallel
  const [
    subscriptionData,
    salesData,
    paymentData,
    unappliedPaymentsData
  ] = await Promise.all([
    getSubscriptionBreakdownBatch(customerIds, startDate, endDate),
    getManualSalesBreakdownBatch(customerIds, startDate, endDate),
    getPaymentBreakdownBatch(customerIds, startDate, endDate),
    getUnappliedPaymentsBreakdownBatch(customerIds)
  ])

  // Build customer data efficiently
  const customersData: OutstandingCustomerData[] = []
  let summary: OutstandingReportSummary = {
    total_customers: 0,
    customers_with_outstanding: 0,
    total_opening_balance: 0,
    total_subscription_amount: 0,
    total_manual_sales_amount: 0,
    total_payments_amount: 0,
    total_unapplied_payments_amount: 0,
    total_outstanding_amount: 0,
    net_outstanding_amount: 0
  }

  for (const customerSummary of customerSummaries) {
    const customer: Customer = {
      id: customerSummary.customer_id,
      billing_name: customerSummary.billing_name,
      contact_person: customerSummary.contact_person,
      phone_primary: customerSummary.phone_primary,
      phone_secondary: customerSummary.phone_secondary || null,
      phone_tertiary: customerSummary.phone_tertiary || null,
      address: customerSummary.address,
      route_id: customerSummary.route_id || '',
      delivery_time: customerSummary.delivery_time || 'Morning',
      payment_method: customerSummary.payment_method || 'Monthly',
      billing_cycle_day: customerSummary.billing_cycle_day || 1,
      opening_balance: customerSummary.opening_balance,
      status: customerSummary.status || 'Active',
      created_at: customerSummary.created_at || formatTimestampForDatabase(getCurrentISTDate()),
      updated_at: customerSummary.updated_at || formatTimestampForDatabase(getCurrentISTDate()),
      route: customerSummary.route_name ? { 
        id: customerSummary.route_id || '',
        name: customerSummary.route_name,
        description: null,
        personnel_name: null,
        created_at: '',
        updated_at: ''
      } : undefined
    }

    const subscriptionBreakdown = subscriptionData.get(customerSummary.customer_id) || []
    const manualSalesBreakdown = salesData.get(customerSummary.customer_id) || []
    const paymentBreakdown = paymentData.get(customerSummary.customer_id) || []
    const unappliedPaymentsBreakdown = unappliedPaymentsData.get(customerSummary.customer_id)

    const customerData: OutstandingCustomerData = {
      customer,
      opening_balance: customerSummary.effective_opening_balance,
      subscription_breakdown: subscriptionBreakdown,
      manual_sales_breakdown: manualSalesBreakdown,
      payment_breakdown: paymentBreakdown,
      unapplied_payments_breakdown: unappliedPaymentsBreakdown,
      current_outstanding: customerSummary.invoice_outstanding,
      total_outstanding: customerSummary.total_outstanding
    }

    customersData.push(customerData)

    // Update summary
    if (customerData.total_outstanding > 0) {
      summary.customers_with_outstanding++
    }
    
    summary.total_opening_balance += customerData.opening_balance
    summary.total_subscription_amount += subscriptionBreakdown.reduce(
      (sum, month) => sum + month.total_amount, 0
    )
    summary.total_manual_sales_amount += manualSalesBreakdown.reduce(
      (sum, sales) => sum + sales.total_amount, 0
    )
    summary.total_payments_amount += paymentBreakdown.reduce(
      (sum, payments) => sum + payments.total_amount, 0
    )
    const customerUnappliedTotal = unappliedPaymentsBreakdown ? unappliedPaymentsBreakdown.total_amount : 0
    summary.total_unapplied_payments_amount += customerUnappliedTotal
    summary.total_outstanding_amount += customerData.total_outstanding
  }

  // Apply special filtering for customers with subscription dues AND outstanding amounts
  let filteredCustomersData = customersData
  if (config.customer_selection === 'with_subscription_and_outstanding') {
    filteredCustomersData = customersData.filter(customerData => {
      const hasSubscriptionDues = customerData.subscription_breakdown.some(month => month.total_amount > 0)
      const hasOutstanding = customerData.total_outstanding > 0
      return hasSubscriptionDues && hasOutstanding
    })
    
    // Recalculate summary for filtered customers
    summary = recalculateSummary(filteredCustomersData)
  }

  summary.total_customers = filteredCustomersData.length
  
  // Calculate net outstanding (total outstanding minus available credits)
  summary.net_outstanding_amount = Math.max(0, summary.total_outstanding_amount - summary.total_unapplied_payments_amount)
  
  return {
    customers: filteredCustomersData,
    summary
  }
}

// Batch processing functions for performance optimization

async function getSubscriptionBreakdownBatch(
  customerIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, MonthlySubscriptionBreakdown[]>> {
  const supabase = await createClient()

  // Query deliveries table directly for confirmed deliveries in the date range
  const { data: deliveriesData, error } = await supabase
    .from("deliveries")
    .select(`
      customer_id,
      order_date,
      actual_quantity,
      total_amount,
      unit_price,
      product:products (
        id,
        name,
        code,
        unit_of_measure,
        unit
      )
    `)
    .in("customer_id", customerIds)
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .not("actual_quantity", "is", null)
    .eq("delivery_status", "delivered")
    .order("customer_id, order_date")

  if (error) {
    console.error("Subscription breakdown error:", error)
    throw new Error("Failed to fetch subscription breakdown")
  }

  // Group by customer and month
  const customerMap = new Map<string, MonthlySubscriptionBreakdown[]>()

  // Handle case where no delivery data exists
  if (!deliveriesData || deliveriesData.length === 0) {
    return customerMap
  }

  for (const delivery of deliveriesData) {
    if (!customerMap.has(delivery.customer_id)) {
      customerMap.set(delivery.customer_id, [])
    }

    // Extract month key (YYYY-MM) from order_date
    const monthKey = delivery.order_date.substring(0, 7)
    const monthDate = new Date(delivery.order_date + 'T00:00:00')
    const monthDisplay = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const customerBreakdowns = customerMap.get(delivery.customer_id)!
    let monthBreakdown = customerBreakdowns.find(mb => mb.month === monthKey)

    if (!monthBreakdown) {
      monthBreakdown = {
        month: monthKey,
        month_display: monthDisplay,
        total_amount: 0,
        product_details: []
      }
      customerBreakdowns.push(monthBreakdown)
    }

    // Find or create product detail within this month
    const product = Array.isArray(delivery.product) ? delivery.product[0] : delivery.product
    const productName = product?.name || 'Unknown Product'
    const productCode = product?.code || 'N/A'
    const unitOfMeasure = product?.unit_of_measure || product?.unit || 'unit'

    let productDetail = monthBreakdown.product_details.find(
      pd => pd.product_name === productName && pd.product_code === productCode
    )

    if (!productDetail) {
      productDetail = {
        product_name: productName,
        product_code: productCode,
        quantity: 0,
        unit_price: Number(delivery.unit_price),
        total_amount: 0,
        unit_of_measure: unitOfMeasure,
        delivery_days: 0,
        daily_quantity: 0
      }
      monthBreakdown.product_details.push(productDetail)
    }

    // Aggregate quantities and amounts
    productDetail.quantity += Number(delivery.actual_quantity)
    productDetail.total_amount += Number(delivery.total_amount)
    productDetail.delivery_days += 1

    monthBreakdown.total_amount += Number(delivery.total_amount)
  }

  // Calculate daily_quantity as average for each product
  for (const customerBreakdowns of customerMap.values()) {
    for (const monthBreakdown of customerBreakdowns) {
      for (const productDetail of monthBreakdown.product_details) {
        if (productDetail.delivery_days > 0) {
          productDetail.daily_quantity = productDetail.quantity / productDetail.delivery_days
        }
      }
    }
  }

  return customerMap
}

async function getManualSalesBreakdownBatch(
  customerIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ManualSalesBreakdown[]>> {
  const supabase = await createClient()

  console.log("Manual sales query - startDate:", startDate, "endDate:", endDate)
  console.log("Customer IDs:", customerIds)

  // Query sales table directly for credit sales in the date range
  const { data: salesData, error } = await supabase
    .from("sales")
    .select(`
      id,
      customer_id,
      product_id,
      quantity,
      unit_price,
      total_amount,
      gst_amount,
      sale_date,
      sale_type,
      notes,
      product:products (
        name,
        code,
        unit_of_measure
      )
    `)
    .in("customer_id", customerIds)
    .gte("sale_date", startDate)
    .lte("sale_date", endDate)
    .eq("sale_type", "Credit")
    .order("customer_id, sale_date")

  console.log("Manual sales data found:", salesData?.length || 0, "records")
  if (salesData?.length) {
    console.log("Sample sales data:", salesData[0])
  }

  if (error) {
    console.error("Sales breakdown error:", error)
    throw new Error("Failed to fetch sales breakdown")
  }

  // Group by customer
  const customerMap = new Map<string, ManualSalesBreakdown[]>()

  // Handle case where no sales data exists
  if (!salesData || salesData.length === 0) {
    return customerMap
  }

  for (const sale of salesData) {
    if (!customerMap.has(sale.customer_id)) {
      customerMap.set(sale.customer_id, [])
    }

    const customerBreakdowns = customerMap.get(sale.customer_id)!
    let breakdown = customerBreakdowns[0]

    if (!breakdown) {
      breakdown = {
        total_amount: 0,
        sale_details: []
      }
      customerBreakdowns.push(breakdown)
    }

    const product = Array.isArray(sale.product) ? sale.product[0] : sale.product
    const saleDetail: ManualSaleDetail = {
      sale_id: sale.id,
      product_name: product?.name || 'Unknown Product',
      product_code: product?.code || 'N/A',
      quantity: Number(sale.quantity),
      unit_price: Number(sale.unit_price),
      total_amount: Number(sale.total_amount),
      gst_amount: Number(sale.gst_amount || 0),
      unit_of_measure: product?.unit_of_measure || 'unit',
      sale_date: sale.sale_date,
      notes: sale.notes || null
    }

    breakdown.sale_details.push(saleDetail)
    breakdown.total_amount += Number(sale.total_amount)
  }

  return customerMap
}

async function getPaymentBreakdownBatch(
  customerIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, PaymentBreakdown[]>> {
  const supabase = await createClient()
  
  const { data: paymentData, error } = await supabase
    .from("customer_payment_breakdown")
    .select("*")
    .in("customer_id", customerIds)
    .gte("payment_date", startDate)
    .lt("payment_date", formatDateForDatabase(addDaysIST(new Date(endDate), 1)))
    .order("customer_id, payment_date")

  if (error) {
    console.error("Payment breakdown error:", error)
    throw new Error("Failed to fetch payment breakdown")
  }

  // Group by customer
  const customerMap = new Map<string, PaymentBreakdown[]>()
  
  // Handle case where no payment data exists
  if (!paymentData || paymentData.length === 0) {
    return customerMap
  }
  
  for (const row of paymentData) {
    if (!customerMap.has(row.customer_id)) {
      customerMap.set(row.customer_id, [])
    }
    
    const customerBreakdowns = customerMap.get(row.customer_id)!
    let breakdown = customerBreakdowns[0]
    
    if (!breakdown) {
      breakdown = {
        total_amount: 0,
        payment_details: []
      }
      customerBreakdowns.push(breakdown)
    }
    
    const paymentDetail: PaymentDetail = {
      payment_id: row.payment_id,
      amount: Number(row.amount),
      payment_date: row.payment_date,
      payment_method: row.payment_method,
      notes: row.notes,
      period_start: row.period_start,
      period_end: row.period_end
    }
    
    breakdown.payment_details.push(paymentDetail)
    breakdown.total_amount += Number(row.amount)
  }
  
  return customerMap
}

function recalculateSummary(customers: OutstandingCustomerData[]): OutstandingReportSummary {
  const summary: OutstandingReportSummary = {
    total_customers: customers.length,
    customers_with_outstanding: 0,
    total_opening_balance: 0,
    total_subscription_amount: 0,
    total_manual_sales_amount: 0,
    total_payments_amount: 0,
    total_unapplied_payments_amount: 0,
    total_outstanding_amount: 0,
    net_outstanding_amount: 0
  }
  
  for (const customerData of customers) {
    if (customerData.total_outstanding > 0) {
      summary.customers_with_outstanding++
    }
    
    summary.total_opening_balance += customerData.opening_balance
    summary.total_subscription_amount += customerData.subscription_breakdown.reduce(
      (sum, month) => sum + month.total_amount, 0
    )
    summary.total_manual_sales_amount += customerData.manual_sales_breakdown.reduce(
      (sum, sales) => sum + sales.total_amount, 0
    )
    summary.total_payments_amount += customerData.payment_breakdown.reduce(
      (sum, payments) => sum + payments.total_amount, 0
    )
    const customerUnappliedTotal = customerData.unapplied_payments_breakdown ? customerData.unapplied_payments_breakdown.total_amount : 0
    summary.total_unapplied_payments_amount += customerUnappliedTotal
    summary.total_outstanding_amount += customerData.total_outstanding
  }
  
  // Calculate net outstanding
  summary.net_outstanding_amount = Math.max(0, summary.total_outstanding_amount - summary.total_unapplied_payments_amount)
  
  return summary
}

async function getUnappliedPaymentsBreakdownBatch(
  customerIds: string[]
): Promise<Map<string, UnappliedPaymentsBreakdown>> {
  const supabase = await createClient()
  const breakdownMap = new Map<string, UnappliedPaymentsBreakdown>()

  if (customerIds.length === 0) return breakdownMap

  const { data: unappliedData, error } = await supabase
    .from('unapplied_payments')
    .select(`
      customer_id,
      amount_unapplied,
      payment_id,
      payments (
        payment_date,
        amount,
        payment_method,
        notes
      )
    `)
    .in('customer_id', customerIds)
    .order('payment_id', { ascending: false })

  if (error) {
    console.error('Error fetching unapplied payments breakdown:', error)
    return breakdownMap
  }

  // Group by customer_id
  interface RawUnappliedPayment {
    customer_id: string
    amount_unapplied: number
    payment_id: string
    payments: {
      payment_date: string
      amount: number
      payment_method: string | null
      notes: string | null
    }[]
  }
  
  const groupedData = new Map<string, RawUnappliedPayment[]>()
  for (const payment of unappliedData || []) {
    if (!groupedData.has(payment.customer_id)) {
      groupedData.set(payment.customer_id, [])
    }
    groupedData.get(payment.customer_id)!.push(payment)
  }

  // Build breakdown for each customer
  for (const [customerId, payments] of groupedData) {
    const unappliedPaymentDetails: UnappliedPaymentDetail[] = payments.map(payment => {
      const paymentData = Array.isArray(payment.payments) && payment.payments.length > 0 
        ? payment.payments[0] 
        : { payment_date: formatDateForDatabase(getCurrentISTDate()), amount: 0, payment_method: null, notes: null }
      
      return {
        payment_id: payment.payment_id,
        payment_date: paymentData.payment_date,
        payment_amount: paymentData.amount,
        amount_unapplied: payment.amount_unapplied,
        payment_method: paymentData.payment_method || 'N/A',
        notes: paymentData.notes || undefined
      }
    })

    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount_unapplied, 0)

    breakdownMap.set(customerId, {
      total_amount: totalAmount,
      unapplied_payment_details: unappliedPaymentDetails
    })
  }

  return breakdownMap
}

// Old individual functions removed - replaced with batch processing for performance