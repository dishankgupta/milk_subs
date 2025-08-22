"use server"

import { createClient } from "@/lib/supabase/server"
import type { 
  OutstandingReportConfiguration, 
  OutstandingCustomerData,
  OutstandingReportSummary,
  MonthlySubscriptionBreakdown,
  ManualSalesBreakdown,
  PaymentBreakdown,
  SubscriptionProductDetail,
  ManualSaleDetail,
  PaymentDetail
} from "@/lib/types/outstanding-reports"

export async function generateOutstandingReport(
  config: OutstandingReportConfiguration
): Promise<{
  customers: OutstandingCustomerData[]
  summary: OutstandingReportSummary
}> {
  const supabase = await createClient()
  const startDate = config.start_date.toISOString().split('T')[0]
  const endDate = config.end_date.toISOString().split('T')[0]
  
  // Use the optimized master view for initial customer data
  let customersQuery = supabase
    .from("outstanding_report_data")
    .select("*")
    .order("billing_name")

  // Apply customer selection filters
  if (config.customer_selection === 'selected' && config.selected_customer_ids) {
    customersQuery = customersQuery.in("customer_id", config.selected_customer_ids)
  } else if (config.customer_selection === 'with_outstanding') {
    customersQuery = customersQuery.gt("total_outstanding", 0)
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
        total_outstanding_amount: 0
      }
    }
  }

  // Get all customer IDs for batch processing
  const customerIds = customerSummaries.map(c => c.customer_id)

  // Batch fetch all detailed data in parallel
  const [
    subscriptionData,
    salesData,
    paymentData
  ] = await Promise.all([
    getSubscriptionBreakdownBatch(customerIds, startDate, endDate),
    getManualSalesBreakdownBatch(customerIds, startDate, endDate),
    getPaymentBreakdownBatch(customerIds, startDate, endDate)
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
    total_outstanding_amount: 0
  }

  for (const customerSummary of customerSummaries) {
    const customer = {
      id: customerSummary.customer_id,
      billing_name: customerSummary.billing_name,
      contact_person: customerSummary.contact_person,
      phone_primary: customerSummary.phone_primary,
      address: customerSummary.address,
      opening_balance: customerSummary.opening_balance,
      route: customerSummary.route_name ? { name: customerSummary.route_name } : undefined
    }

    const subscriptionBreakdown = subscriptionData.get(customerSummary.customer_id) || []
    const manualSalesBreakdown = salesData.get(customerSummary.customer_id) || []
    const paymentBreakdown = paymentData.get(customerSummary.customer_id) || []

    const customerData: OutstandingCustomerData = {
      customer,
      opening_balance: customerSummary.effective_opening_balance,
      subscription_breakdown: subscriptionBreakdown,
      manual_sales_breakdown: manualSalesBreakdown,
      payment_breakdown: paymentBreakdown,
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
  
  const { data: subscriptionData, error } = await supabase
    .from("customer_subscription_breakdown")
    .select("*")
    .in("customer_id", customerIds)
    .gte("month_key", startDate.substring(0, 7)) // Extract YYYY-MM from YYYY-MM-DD
    .lte("month_key", endDate.substring(0, 7))   // Extract YYYY-MM from YYYY-MM-DD
    .order("customer_id, month_key, product_name")

  if (error) {
    console.error("Subscription breakdown error:", error)
    throw new Error("Failed to fetch subscription breakdown")
  }

  // Group by customer and month
  const customerMap = new Map<string, MonthlySubscriptionBreakdown[]>()
  
  // Handle case where no subscription data exists
  if (!subscriptionData || subscriptionData.length === 0) {
    return customerMap
  }
  
  for (const row of subscriptionData) {
    if (!customerMap.has(row.customer_id)) {
      customerMap.set(row.customer_id, [])
    }
    
    const customerBreakdowns = customerMap.get(row.customer_id)!
    let monthBreakdown = customerBreakdowns.find(mb => mb.month === row.month_key)
    
    if (!monthBreakdown) {
      monthBreakdown = {
        month: row.month_key,
        month_display: row.month_display.trim(), // Remove extra spaces from month display
        total_amount: 0,
        product_details: []
      }
      customerBreakdowns.push(monthBreakdown)
    }
    
    const productDetail: SubscriptionProductDetail = {
      product_name: row.product_name,
      product_code: row.product_code,
      quantity: Number(row.total_quantity),
      unit_price: Number(row.unit_price),
      total_amount: Number(row.total_amount),
      unit_of_measure: row.unit_of_measure,
      delivery_days: Number(row.delivery_days),
      daily_quantity: Number(row.daily_quantity)
    }
    
    monthBreakdown.product_details.push(productDetail)
    monthBreakdown.total_amount += Number(row.total_amount)
  }
  
  return customerMap
}

async function getManualSalesBreakdownBatch(
  customerIds: string[],
  startDate: string,
  endDate: string
): Promise<Map<string, ManualSalesBreakdown[]>> {
  const supabase = await createClient()
  
  const { data: salesData, error } = await supabase
    .from("customer_sales_breakdown")
    .select("*")
    .in("customer_id", customerIds)
    .gte("sale_date", startDate)
    .lte("sale_date", endDate)
    .order("customer_id, sale_date")

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
  
  for (const row of salesData) {
    if (!customerMap.has(row.customer_id)) {
      customerMap.set(row.customer_id, [])
    }
    
    const customerBreakdowns = customerMap.get(row.customer_id)!
    let breakdown = customerBreakdowns[0]
    
    if (!breakdown) {
      breakdown = {
        total_amount: 0,
        sale_details: []
      }
      customerBreakdowns.push(breakdown)
    }
    
    const saleDetail: ManualSaleDetail = {
      sale_id: row.sale_id,
      product_name: row.product_name,
      product_code: row.product_code,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      total_amount: Number(row.total_amount),
      gst_amount: Number(row.gst_amount),
      unit_of_measure: row.unit_of_measure,
      sale_date: row.sale_date,
      notes: row.notes
    }
    
    breakdown.sale_details.push(saleDetail)
    breakdown.total_amount += Number(row.total_amount)
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
    .lte("payment_date", endDate)
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
    total_outstanding_amount: 0
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
    summary.total_outstanding_amount += customerData.total_outstanding
  }
  
  return summary
}

// Old individual functions removed - replaced with batch processing for performance