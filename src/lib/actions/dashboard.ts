"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentISTDate, formatDateForDatabase, addDaysIST } from "@/lib/date-utils"

export interface DashboardStats {
  todayOperations: {
    ordersGenerated: number
    deliveriesCompleted: number
    todayRevenue: number
    pendingDeliveries: number
    paymentsReceived: number
    activeModifications: number
  }
  yesterdayOperations: {
    ordersGenerated: number
    deliveriesCompleted: number
    yesterdayRevenue: number
    paymentsReceived: number
  }
  weekComparison: {
    thisWeekRevenue: number
    lastWeekRevenue: number
    thisWeekDeliveries: number
    lastWeekDeliveries: number
    revenueChange: number
    deliveriesChange: number
  }
  topOutstandingCustomers: Array<{
    customerId: string
    customerName: string
    outstandingAmount: number
  }>
  topValueCustomers: Array<{
    customerId: string
    customerName: string
    totalRevenue: number
    deliveryCount: number
  }>
  invoiceBreakdown: Array<{
    status: string
    count: number
    totalValue: number
  }>
  routePerformance: Array<{
    routeName: string
    activeCustomers: number
    totalDeliveries: number
    revenue: number
  }>
  basicStats: {
    totalCustomers: number
    activeCustomers: number
    totalOutstanding: number
    overdueInvoices: number
  }
}

export async function getDashboardData(): Promise<DashboardStats> {
  const supabase = await createClient()

  // Basic stats
  const [
    { count: totalCustomers },
    { count: activeCustomers }
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'Active')
  ])

  // Today's operations - get current date for queries (use IST utilities)
  const today = formatDateForDatabase(getCurrentISTDate())
  const yesterday = formatDateForDatabase(addDaysIST(getCurrentISTDate(), -1))
  const sevenDaysAgo = formatDateForDatabase(addDaysIST(getCurrentISTDate(), -7))
  const fourteenDaysAgo = formatDateForDatabase(addDaysIST(getCurrentISTDate(), -14))

  // Get today's operations data
  const [
    { count: ordersGenerated },
    { count: deliveriesCompleted },
    { data: todayDeliveries },
    { count: pendingDeliveries },
    { data: todayPayments },
    { count: activeModifications }
  ] = await Promise.all([
    supabase.from('daily_orders').select('*', { count: 'exact', head: true }).eq('order_date', today),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('order_date', today),
    supabase.from('deliveries').select('total_amount').eq('order_date', today),
    supabase.from('daily_orders').select('*', { count: 'exact', head: true }).eq('order_date', today).eq('status', 'Pending'),
    supabase.from('payments').select('amount').eq('payment_date', today),
    supabase.from('modifications').select('*', { count: 'exact', head: true }).lte('start_date', today).gte('end_date', today).eq('is_active', true)
  ])

  const todayRevenue = todayDeliveries?.reduce((sum, d) => sum + Number(d.total_amount || 0), 0) || 0
  const paymentsReceived = todayPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

  // Get yesterday's operations data
  const [
    { count: yesterdayOrdersGenerated },
    { count: yesterdayDeliveriesCompleted },
    { data: yesterdayDeliveries },
    { data: yesterdayPayments }
  ] = await Promise.all([
    supabase.from('daily_orders').select('*', { count: 'exact', head: true }).eq('order_date', yesterday),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('order_date', yesterday),
    supabase.from('deliveries').select('total_amount').eq('order_date', yesterday),
    supabase.from('payments').select('amount').eq('payment_date', yesterday)
  ])

  const yesterdayRevenue = yesterdayDeliveries?.reduce((sum, d) => sum + Number(d.total_amount || 0), 0) || 0
  const yesterdayPaymentsReceived = yesterdayPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

  // Week comparison data
  const [
    { data: thisWeekDeliveries },
    { data: lastWeekDeliveries }
  ] = await Promise.all([
    supabase.from('deliveries').select('total_amount').gte('order_date', sevenDaysAgo),
    supabase.from('deliveries').select('total_amount').gte('order_date', fourteenDaysAgo).lt('order_date', sevenDaysAgo)
  ])

  const thisWeekRevenue = thisWeekDeliveries?.reduce((sum, d) => sum + Number(d.total_amount || 0), 0) || 0
  const lastWeekRevenue = lastWeekDeliveries?.reduce((sum, d) => sum + Number(d.total_amount || 0), 0) || 0

  // Top 5 outstanding customers
  const { data: topOutstanding } = await supabase
    .from('customers')
    .select('id, billing_name')
    .eq('status', 'Active')
    .order('opening_balance', { ascending: false })
    .limit(5)

  // Calculate outstanding for each customer using the function
  const topOutstandingWithAmounts = await Promise.all(
    (topOutstanding || []).map(async (customer) => {
      const { data } = await supabase.rpc('calculate_customer_outstanding', {
        customer_uuid: customer.id
      })

      return {
        customerId: customer.id,
        customerName: customer.billing_name,
        outstandingAmount: Number(data || 0)
      }
    })
  )

  // Sort by outstanding amount and take top 5
  const topOutstandingSorted = topOutstandingWithAmounts
    .sort((a, b) => b.outstandingAmount - a.outstandingAmount)
    .slice(0, 5)

  // Top 5 valuable customers (by last 30 days revenue - deliveries + manual sales)
  const thirtyDaysAgo = formatDateForDatabase(addDaysIST(getCurrentISTDate(), -30))

  const [
    { data: topValueDeliveries },
    { data: topValueSales }
  ] = await Promise.all([
    supabase
      .from('deliveries')
      .select('customer_id, customers!inner(billing_name), total_amount')
      .gte('order_date', thirtyDaysAgo),
    supabase
      .from('sales')
      .select('customer_id, customers!inner(billing_name), total_amount')
      .gte('sale_date', thirtyDaysAgo)
  ])

  const customerRevenue = new Map<string, { name: string, revenue: number, count: number }>()

  // Add deliveries revenue
  topValueDeliveries?.forEach((delivery) => {
    const customerId = delivery.customer_id as string
    const customers = delivery.customers as unknown as { billing_name: string }
    const customerName = customers?.billing_name || 'Unknown'
    const amount = Number(delivery.total_amount || 0)

    if (customerRevenue.has(customerId)) {
      const current = customerRevenue.get(customerId)!
      current.revenue += amount
      current.count += 1
    } else {
      customerRevenue.set(customerId, { name: customerName, revenue: amount, count: 1 })
    }
  })

  // Add manual sales revenue
  topValueSales?.forEach((sale) => {
    const customerId = sale.customer_id as string
    const customers = sale.customers as unknown as { billing_name: string }
    const customerName = customers?.billing_name || 'Unknown'
    const amount = Number(sale.total_amount || 0)

    if (customerRevenue.has(customerId)) {
      const current = customerRevenue.get(customerId)!
      current.revenue += amount
      current.count += 1
    } else {
      customerRevenue.set(customerId, { name: customerName, revenue: amount, count: 1 })
    }
  })

  const topValueCustomers = Array.from(customerRevenue.entries())
    .map(([customerId, data]) => ({
      customerId,
      customerName: data.name,
      totalRevenue: data.revenue,
      deliveryCount: data.count
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5)

  // Invoice breakdown
  const { data: invoiceBreakdown } = await supabase
    .from('invoice_metadata')
    .select('invoice_status, total_amount')
    .is('deleted_at', null)

  const statusMap = new Map<string, { count: number, total: number }>()
  invoiceBreakdown?.forEach((inv) => {
    const status = (inv.invoice_status as string) || 'draft'
    const amount = Number(inv.total_amount || 0)

    if (statusMap.has(status)) {
      const current = statusMap.get(status)!
      current.count += 1
      current.total += amount
    } else {
      statusMap.set(status, { count: 1, total: amount })
    }
  })

  const invoiceBreakdownArray = Array.from(statusMap.entries()).map(([status, data]) => ({
    status,
    count: data.count,
    totalValue: data.total
  }))

  // Route performance
  const { data: routePerf } = await supabase
    .from('routes')
    .select('id, name')

  const routePerformance = await Promise.all(
    (routePerf || []).map(async (route) => {
      const { data: deliveries } = await supabase
        .from('deliveries')
        .select('customer_id, total_amount')
        .eq('route_id', route.id)
        .gte('order_date', sevenDaysAgo) // Use the already calculated sevenDaysAgo variable

      const uniqueCustomers = new Set(deliveries?.map(d => d.customer_id) || [])
      const totalRevenue = deliveries?.reduce((sum, d) => sum + Number(d.total_amount || 0), 0) || 0

      return {
        routeName: route.name,
        activeCustomers: uniqueCustomers.size,
        totalDeliveries: deliveries?.length || 0,
        revenue: totalRevenue
      }
    })
  )

  // Total outstanding using existing function
  const { data: totalOutstandingData } = await supabase.rpc('calculate_total_outstanding')
  const totalOutstanding = Number(totalOutstandingData || 0)

  // Overdue invoices count
  const { count: overdueCount } = await supabase
    .from('invoice_metadata')
    .select('*', { count: 'exact', head: true })
    .eq('invoice_status', 'overdue')
    .is('deleted_at', null)

  const revenueChange = lastWeekRevenue > 0
    ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
    : 0

  const deliveriesChange = (lastWeekDeliveries?.length || 0) > 0
    ? (((thisWeekDeliveries?.length || 0) - (lastWeekDeliveries?.length || 0)) / (lastWeekDeliveries?.length || 1)) * 100
    : 0

  return {
    todayOperations: {
      ordersGenerated: ordersGenerated || 0,
      deliveriesCompleted: deliveriesCompleted || 0,
      todayRevenue,
      pendingDeliveries: pendingDeliveries || 0,
      paymentsReceived,
      activeModifications: activeModifications || 0
    },
    yesterdayOperations: {
      ordersGenerated: yesterdayOrdersGenerated || 0,
      deliveriesCompleted: yesterdayDeliveriesCompleted || 0,
      yesterdayRevenue,
      paymentsReceived: yesterdayPaymentsReceived
    },
    weekComparison: {
      thisWeekRevenue,
      lastWeekRevenue,
      thisWeekDeliveries: thisWeekDeliveries?.length || 0,
      lastWeekDeliveries: lastWeekDeliveries?.length || 0,
      revenueChange,
      deliveriesChange
    },
    topOutstandingCustomers: topOutstandingSorted,
    topValueCustomers,
    invoiceBreakdown: invoiceBreakdownArray,
    routePerformance,
    basicStats: {
      totalCustomers: totalCustomers || 0,
      activeCustomers: activeCustomers || 0,
      totalOutstanding,
      overdueInvoices: overdueCount || 0
    }
  }
}
