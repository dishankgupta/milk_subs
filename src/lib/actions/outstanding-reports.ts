"use server"

import { createClient } from "@/lib/supabase/server"
import { format, parseISO } from "date-fns"
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
import type { Customer } from "@/lib/types"

export async function generateOutstandingReport(
  config: OutstandingReportConfiguration
): Promise<{
  customers: OutstandingCustomerData[]
  summary: OutstandingReportSummary
}> {
  const supabase = await createClient()
  
  // Get customers based on selection criteria
  let customersQuery = supabase
    .from("customers")
    .select(`
      *,
      route:routes(*)
    `)
    .order("billing_name")

  if (config.customer_selection === 'with_outstanding') {
    customersQuery = customersQuery.gt("outstanding_amount", 0)
  } else if (config.customer_selection === 'selected' && config.selected_customer_ids) {
    customersQuery = customersQuery.in("id", config.selected_customer_ids)
  }
  // Note: 'with_subscription_and_outstanding' filtering will be applied after data processing
  // since it requires checking both subscription data and outstanding amounts

  const { data: customers, error: customersError } = await customersQuery

  if (customersError) {
    throw new Error("Failed to fetch customers")
  }

  const customersData: OutstandingCustomerData[] = []
  const summary: OutstandingReportSummary = {
    total_customers: customers?.length || 0,
    customers_with_outstanding: 0,
    total_opening_balance: 0,
    total_subscription_amount: 0,
    total_manual_sales_amount: 0,
    total_payments_amount: 0,
    total_outstanding_amount: 0
  }

  for (const customer of customers || []) {
    const customerData = await generateCustomerOutstandingData(
      customer,
      config.start_date.toISOString().split('T')[0],
      config.end_date.toISOString().split('T')[0]
    )
    
    customersData.push(customerData)
    
    // Update summary
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

  // Apply special filtering for customers with subscription dues AND outstanding amounts
  let filteredCustomersData = customersData
  if (config.customer_selection === 'with_subscription_and_outstanding') {
    filteredCustomersData = customersData.filter(customerData => {
      const hasSubscriptionDues = customerData.subscription_breakdown.some(month => month.total_amount > 0)
      const hasOutstanding = customerData.total_outstanding > 0
      return hasSubscriptionDues && hasOutstanding
    })
    
    // Recalculate summary for filtered customers
    const filteredSummary: OutstandingReportSummary = {
      total_customers: filteredCustomersData.length,
      customers_with_outstanding: 0,
      total_opening_balance: 0,
      total_subscription_amount: 0,
      total_manual_sales_amount: 0,
      total_payments_amount: 0,
      total_outstanding_amount: 0
    }
    
    for (const customerData of filteredCustomersData) {
      if (customerData.total_outstanding > 0) {
        filteredSummary.customers_with_outstanding++
      }
      
      filteredSummary.total_opening_balance += customerData.opening_balance
      filteredSummary.total_subscription_amount += customerData.subscription_breakdown.reduce(
        (sum, month) => sum + month.total_amount, 0
      )
      filteredSummary.total_manual_sales_amount += customerData.manual_sales_breakdown.reduce(
        (sum, sales) => sum + sales.total_amount, 0
      )
      filteredSummary.total_payments_amount += customerData.payment_breakdown.reduce(
        (sum, payments) => sum + payments.total_amount, 0
      )
      filteredSummary.total_outstanding_amount += customerData.total_outstanding
    }
    
    return {
      customers: filteredCustomersData,
      summary: filteredSummary
    }
  }

  return {
    customers: filteredCustomersData,
    summary
  }
}

async function generateCustomerOutstandingData(
  customer: Customer,
  startDate: string,
  endDate: string
): Promise<OutstandingCustomerData> {
  // Calculate opening balance as of start date
  const openingBalance = await calculateOpeningBalance(customer.id, startDate)
  
  // Get subscription data grouped by month
  const subscriptionBreakdown = await getSubscriptionBreakdown(customer.id, startDate, endDate)
  
  // Get manual sales breakdown
  const manualSalesBreakdown = await getManualSalesBreakdown(customer.id, startDate, endDate)
  
  // Get payment breakdown
  const paymentBreakdown = await getPaymentBreakdown(customer.id, startDate, endDate)
  
  // Calculate current outstanding (as of end date)
  const currentOutstanding = await calculateOutstandingAsOf(customer.id, endDate)
  
  // Calculate total outstanding (opening + current)
  const totalOutstanding = openingBalance + currentOutstanding

  return {
    customer,
    opening_balance: openingBalance,
    subscription_breakdown: subscriptionBreakdown,
    manual_sales_breakdown: manualSalesBreakdown,
    payment_breakdown: paymentBreakdown,
    current_outstanding: currentOutstanding,
    total_outstanding: totalOutstanding
  }
}

async function calculateOpeningBalance(customerId: string, startDate: string): Promise<number> {
  const supabase = await createClient()
  
  // Get customer's opening balance field
  const { data: customer } = await supabase
    .from("customers")
    .select("opening_balance")
    .eq("id", customerId)
    .single()
  
  // For more complex calculation, you could also calculate based on 
  // transactions before startDate, but for now use the opening_balance field
  return Number(customer?.opening_balance || 0)
}

async function getSubscriptionBreakdown(
  customerId: string, 
  startDate: string, 
  endDate: string
): Promise<MonthlySubscriptionBreakdown[]> {
  const supabase = await createClient()
  
  // Get all daily orders for the customer in the date range
  const { data: dailyOrders, error } = await supabase
    .from("daily_orders")
    .select(`
      *,
      product:products(*)
    `)
    .eq("customer_id", customerId)
    .gte("order_date", startDate)
    .lte("order_date", endDate)
    .eq("status", "Generated")
    .order("order_date")

  if (error) {
    throw new Error("Failed to fetch subscription data")
  }

  // Group by month
  const monthlyData = new Map<string, {
    orders: typeof dailyOrders
    total_amount: number
  }>()

  dailyOrders?.forEach(order => {
    const orderDate = parseISO(order.order_date)
    const monthKey = format(orderDate, 'yyyy-MM')
    
    const existing = monthlyData.get(monthKey)
    if (existing) {
      existing.orders.push(order)
      existing.total_amount += Number(order.total_amount)
    } else {
      monthlyData.set(monthKey, {
        orders: [order],
        total_amount: Number(order.total_amount)
      })
    }
  })

  // Convert to breakdown format
  const breakdown: MonthlySubscriptionBreakdown[] = []
  
  for (const [monthKey, monthData] of monthlyData) {
    // Group orders by product
    const productMap = new Map<string, {
      product: { id: string; name: string; code: string; current_price: number; unit_of_measure?: string; unit?: string }
      quantity: number
      total_amount: number
      delivery_days: number
    }>()
    
    monthData.orders.forEach(order => {
      const existing = productMap.get(order.product.id)
      if (existing) {
        existing.quantity += Number(order.planned_quantity)
        existing.total_amount += Number(order.total_amount)
        existing.delivery_days += 1
      } else {
        productMap.set(order.product.id, {
          product: order.product,
          quantity: Number(order.planned_quantity),
          total_amount: Number(order.total_amount),
          delivery_days: 1
        })
      }
    })
    
    const productDetails: SubscriptionProductDetail[] = []
    for (const [productId, productData] of productMap) {
      productDetails.push({
        product_name: productData.product.name,
        product_code: productData.product.code,
        quantity: productData.quantity,
        unit_price: Number(productData.product.current_price),
        total_amount: productData.total_amount,
        unit_of_measure: productData.product.unit_of_measure || productData.product.unit || 'unit',
        delivery_days: productData.delivery_days,
        daily_quantity: productData.quantity / productData.delivery_days
      })
    }
    
    breakdown.push({
      month: monthKey,
      month_display: format(parseISO(monthKey + '-01'), 'MMMM yyyy'),
      total_amount: monthData.total_amount,
      product_details: productDetails
    })
  }
  
  return breakdown.sort((a, b) => a.month.localeCompare(b.month))
}

async function getManualSalesBreakdown(
  customerId: string,
  startDate: string,
  endDate: string
): Promise<ManualSalesBreakdown[]> {
  const supabase = await createClient()
  
  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      *,
      product:products(*)
    `)
    .eq("customer_id", customerId)
    .eq("sale_type", "Credit")
    .gte("sale_date", startDate)
    .lte("sale_date", endDate)
    .order("sale_date")

  if (error) {
    throw new Error("Failed to fetch manual sales data")
  }

  if (!sales || sales.length === 0) {
    return []
  }

  const saleDetails: ManualSaleDetail[] = sales.map(sale => ({
    sale_id: sale.id,
    product_name: sale.product.name,
    product_code: sale.product.code,
    quantity: Number(sale.quantity),
    unit_price: Number(sale.unit_price),
    total_amount: Number(sale.total_amount),
    gst_amount: Number(sale.gst_amount),
    unit_of_measure: sale.product.unit_of_measure,
    sale_date: sale.sale_date,
    notes: sale.notes
  }))

  const totalAmount = saleDetails.reduce((sum, detail) => sum + detail.total_amount, 0)

  return [{
    total_amount: totalAmount,
    sale_details: saleDetails
  }]
}

async function getPaymentBreakdown(
  customerId: string,
  startDate: string,
  endDate: string
): Promise<PaymentBreakdown[]> {
  const supabase = await createClient()
  
  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .eq("customer_id", customerId)
    .gte("payment_date", startDate)
    .lte("payment_date", endDate)
    .order("payment_date")

  if (error) {
    throw new Error("Failed to fetch payment data")
  }

  if (!payments || payments.length === 0) {
    return []
  }

  const paymentDetails: PaymentDetail[] = payments.map(payment => ({
    payment_id: payment.id,
    amount: Number(payment.amount),
    payment_date: payment.payment_date,
    payment_method: payment.payment_method || "Cash",
    notes: payment.notes,
    period_start: payment.period_start,
    period_end: payment.period_end
  }))

  const totalAmount = paymentDetails.reduce((sum, detail) => sum + detail.amount, 0)

  return [{
    total_amount: totalAmount,
    payment_details: paymentDetails
  }]
}

async function calculateOutstandingAsOf(customerId: string, endDate: string): Promise<number> {
  const supabase = await createClient()
  
  // For now, use the current outstanding_amount from customer record
  // In a more complex implementation, this would calculate based on all transactions up to endDate
  const { data: customer } = await supabase
    .from("customers")
    .select("outstanding_amount")
    .eq("id", customerId)
    .single()
  
  return Number(customer?.outstanding_amount || 0)
}