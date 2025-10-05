'use server'

import { createClient } from '@/lib/supabase/server'
import type { DailyOrder, Customer, Product } from '@/lib/types'
import { getPatternQuantity } from '@/lib/subscription-utils'
import { parseLocalDateIST, formatDateForDatabase } from '@/lib/date-utils'

export interface ProductionSummary {
  date: string
  totalOrders: number
  totalValue: number
  productBreakdown: {
    [productCode: string]: {
      name: string
      totalQuantity: number
      totalValue: number
      orderCount: number
    }
  }
  routeBreakdown: {
    [routeId: string]: {
      name: string
      morningOrders: number
      eveningOrders: number
      totalQuantity: number
      totalValue: number
    }
  }
  timeSlotBreakdown: {
    morning: {
      orders: number
      quantity: number
      value: number
    }
    evening: {
      orders: number
      quantity: number
      value: number
    }
  }
}

export interface RouteDeliveryReport {
  date: string
  routeId: string
  routeName: string
  deliveryTime: 'Morning' | 'Evening'
  orders: Array<{
    customerName: string
    contactPerson: string
    address: string
    phone: string
    productName: string
    quantity: number
    totalAmount: number
    baseQuantity?: number
    isModified: boolean
    isSkipped: boolean
    appliedModifications: Array<{
      type: 'Skip' | 'Increase' | 'Decrease' | 'Add Note'
      reason: string | null
      quantityChange: number | null
    }>
  }>
  summary: {
    totalOrders: number
    totalQuantity: number
    totalValue: number
    modifiedOrders: number
    modificationSummary: {
      skip: number
      increase: number
      decrease: number
      addNote: number
    }
    productBreakdown: {
      [productCode: string]: {
        name: string
        quantity: number
        value: number
      }
    }
  }
}

export async function getDailyProductionSummary(date: string): Promise<{
  success: boolean
  data?: ProductionSummary
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    const { data: orders, error } = await supabase
      .from('daily_orders')
      .select(`
        *,
        customer:customers(billing_name, contact_person),
        product:products(name, code),
        route:routes(name)
      `)
      .eq('order_date', date)
      .eq('status', 'Generated')

    if (error) {
      throw error
    }

    if (!orders || orders.length === 0) {
      return {
        success: true,
        data: {
          date,
          totalOrders: 0,
          totalValue: 0,
          productBreakdown: {},
          routeBreakdown: {},
          timeSlotBreakdown: {
            morning: { orders: 0, quantity: 0, value: 0 },
            evening: { orders: 0, quantity: 0, value: 0 }
          }
        }
      }
    }

    const productBreakdown: ProductionSummary['productBreakdown'] = {}
    const routeBreakdown: ProductionSummary['routeBreakdown'] = {}
    const timeSlotBreakdown = {
      morning: { orders: 0, quantity: 0, value: 0 },
      evening: { orders: 0, quantity: 0, value: 0 }
    }

    let totalOrders = 0
    let totalValue = 0

    for (const order of orders as DailyOrder[]) {
      totalOrders++
      totalValue += order.total_amount

      // Product breakdown
      const productCode = order.product?.code || 'Unknown'
      const productName = order.product?.name || 'Unknown Product'
      
      if (!productBreakdown[productCode]) {
        productBreakdown[productCode] = {
          name: productName,
          totalQuantity: 0,
          totalValue: 0,
          orderCount: 0
        }
      }
      
      productBreakdown[productCode].totalQuantity += order.planned_quantity
      productBreakdown[productCode].totalValue += order.total_amount
      productBreakdown[productCode].orderCount++

      // Route breakdown
      const routeId = order.route_id
      const routeName = order.route?.name || 'Unknown Route'
      
      if (!routeBreakdown[routeId]) {
        routeBreakdown[routeId] = {
          name: routeName,
          morningOrders: 0,
          eveningOrders: 0,
          totalQuantity: 0,
          totalValue: 0
        }
      }
      
      routeBreakdown[routeId].totalQuantity += order.planned_quantity
      routeBreakdown[routeId].totalValue += order.total_amount
      
      if (order.delivery_time === 'Morning') {
        routeBreakdown[routeId].morningOrders++
      } else {
        routeBreakdown[routeId].eveningOrders++
      }

      // Time slot breakdown
      const timeSlot = order.delivery_time.toLowerCase() as 'morning' | 'evening'
      timeSlotBreakdown[timeSlot].orders++
      timeSlotBreakdown[timeSlot].quantity += order.planned_quantity
      timeSlotBreakdown[timeSlot].value += order.total_amount
    }

    return {
      success: true,
      data: {
        date,
        totalOrders,
        totalValue,
        productBreakdown,
        routeBreakdown,
        timeSlotBreakdown
      }
    }

  } catch (error) {
    console.error('Error generating daily production summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate production summary'
    }
  }
}

export async function getRouteDeliveryReport(
  date: string,
  routeId: string,
  deliveryTime: 'Morning' | 'Evening'
): Promise<{
  success: boolean
  data?: RouteDeliveryReport
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // First, check if orders have been generated for this date
    const { data: existingOrders, error: ordersError } = await supabase
      .from('daily_orders')
      .select('id')
      .eq('order_date', date)
      .eq('route_id', routeId)
      .eq('delivery_time', deliveryTime)
      .limit(1)

    if (ordersError) {
      throw ordersError
    }

    // If no orders generated, return empty report
    if (!existingOrders || existingOrders.length === 0) {
      const { data: route } = await supabase
        .from('routes')
        .select('name')
        .eq('id', routeId)
        .single()

      return {
        success: true,
        data: {
          date,
          routeId,
          routeName: route?.name || 'Unknown Route',
          deliveryTime,
          orders: [],
          summary: {
            totalOrders: 0,
            totalQuantity: 0,
            totalValue: 0,
            modifiedOrders: 0,
            modificationSummary: {
              skip: 0,
              increase: 0,
              decrease: 0,
              addNote: 0
            },
            productBreakdown: {}
          }
        }
      }
    }
    
    // Fetch active subscriptions for the route/delivery time and modifications in parallel
    const [subscriptionsResult, modificationsResult] = await Promise.all([
      supabase
        .from('base_subscriptions')
        .select(`
          *,
          customer:customers(
            id, 
            billing_name, 
            contact_person, 
            address, 
            phone_primary,
            status,
            route_id,
            delivery_time
          ),
          product:products(id, name, code, current_price)
        `)
        .eq('is_active', true)
        .eq('customer.status', 'Active')
        .eq('customer.route_id', routeId)
        .eq('customer.delivery_time', deliveryTime),
      
      supabase
        .from('modifications')
        .select(`
          *,
          customer:customers(id, billing_name),
          product:products(id, name)
        `)
        .eq('is_active', true)
        .lte('start_date', date)
        .gte('end_date', date)
    ])

    if (subscriptionsResult.error) {
      throw subscriptionsResult.error
    }

    if (modificationsResult.error) {
      throw modificationsResult.error
    }

    const subscriptions = subscriptionsResult.data || []
    const modifications = modificationsResult.data || []

    // Get route name
    const { data: route } = await supabase
      .from('routes')
      .select('name')
      .eq('id', routeId)
      .single()

    const routeName = route?.name || 'Unknown Route'

    if (subscriptions.length === 0) {
      return {
        success: true,
        data: {
          date,
          routeId,
          routeName,
          deliveryTime,
          orders: [],
          summary: {
            totalOrders: 0,
            totalQuantity: 0,
            totalValue: 0,
            modifiedOrders: 0,
            modificationSummary: {
              skip: 0,
              increase: 0,
              decrease: 0,
              addNote: 0
            },
            productBreakdown: {}
          }
        }
      }
    }

    // Create lookup map for modifications
    const modMap = new Map<string, Array<{
      customer_id: string;
      product_id: string;
      modification_type: string;
      quantity_change?: number;
      reason?: string | null;
    }>>()
    
    modifications.forEach(mod => {
      const key = `${mod.customer_id}_${mod.product_id}`
      if (!modMap.has(key)) {
        modMap.set(key, [])
      }
      modMap.get(key)!.push(mod)
    })

    const reportOrders = []
    const productBreakdown: RouteDeliveryReport['summary']['productBreakdown'] = {}
    
    let totalOrders = 0
    let totalQuantity = 0
    let totalValue = 0
    let modifiedOrders = 0
    const modificationSummary = { skip: 0, increase: 0, decrease: 0, addNote: 0 }

    // Process all subscriptions (including those that might be skipped)
    for (const subscription of subscriptions) {
      const customer = subscription.customer as Customer
      const product = subscription.product as Product
      
      if (!customer || !product) continue

      const key = `${customer.id}_${product.id}`
      
      // Get base quantity
      let baseQuantity = 0
      if (subscription.subscription_type === "Daily") {
        baseQuantity = subscription.daily_quantity || 0
      } else if (subscription.subscription_type === "Pattern") {
        const targetDate = parseLocalDateIST(date)
        baseQuantity = getPatternQuantity(subscription, targetDate)
      }

      // Apply modifications
      let finalQuantity = baseQuantity
      let isModified = false
      let isSkipped = false
      const appliedModifications: Array<{
        type: 'Skip' | 'Increase' | 'Decrease' | 'Add Note'
        reason: string | null
        quantityChange: number | null
      }> = []
      
      const mods = modMap.get(key) || []
      
      if (mods.length > 0) {
        isModified = true
        modifiedOrders++

        for (const mod of mods) {
          appliedModifications.push({
            type: mod.modification_type as 'Skip' | 'Increase' | 'Decrease' | 'Add Note',
            reason: mod.reason || null,
            quantityChange: mod.quantity_change || null
          })

          // Count modification types
          const modType = mod.modification_type === 'Add Note' ? 'addNote' : mod.modification_type.toLowerCase() as keyof typeof modificationSummary
          if (modType in modificationSummary) {
            modificationSummary[modType]++
          }

          // Apply modification
          switch (mod.modification_type) {
            case "Skip":
              finalQuantity = 0
              isSkipped = true
              break
            case "Increase":
              finalQuantity += mod.quantity_change || 0
              break
            case "Decrease":
              finalQuantity -= mod.quantity_change || 0
              break
            case "Add Note":
              // Add Note doesn't affect quantity, just adds note
              break
          }
        }
      }
      
      // Ensure quantity is not negative
      finalQuantity = Math.max(0, finalQuantity)
      
      // Calculate total amount (0 if skipped)
      const totalAmount = finalQuantity * product.current_price

      // Include ALL subscriptions in the report (even skipped ones)
      reportOrders.push({
        customerName: customer.billing_name,
        contactPerson: customer.contact_person || '',
        address: customer.address || '',
        phone: customer.phone_primary || '',
        productName: product.name,
        quantity: finalQuantity,
        totalAmount: totalAmount,
        baseQuantity: isModified ? baseQuantity : undefined,
        isModified,
        isSkipped,
        appliedModifications
      })

      // Only count non-skipped orders in totals
      if (!isSkipped && finalQuantity > 0) {
        totalOrders++
        totalQuantity += finalQuantity
        totalValue += totalAmount

        // Product breakdown (only for delivered items)
        const productCode = product.code
        const productName = product.name
        
        if (!productBreakdown[productCode]) {
          productBreakdown[productCode] = {
            name: productName,
            quantity: 0,
            value: 0
          }
        }
        
        productBreakdown[productCode].quantity += finalQuantity
        productBreakdown[productCode].value += totalAmount
      }
    }

    return {
      success: true,
      data: {
        date,
        routeId,
        routeName,
        deliveryTime,
        orders: reportOrders,
        summary: {
          totalOrders,
          totalQuantity,
          totalValue,
          modifiedOrders,
          modificationSummary,
          productBreakdown
        }
      }
    }

  } catch (error) {
    console.error('Error generating route delivery report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate delivery report'
    }
  }
}

export interface DeliveryPerformanceReport {
  period: {
    startDate: string
    endDate: string
  }
  summary: {
    totalOrders: number
    deliveredOrders: number
    completionRate: number
    totalPlannedQuantity: number
    totalActualQuantity: number
    quantityVariance: number
    totalPlannedValue: number
    totalActualValue: number
    valueVariance: number
  }
  dailyBreakdown: Array<{
    date: string
    orders: number
    delivered: number
    completionRate: number
    plannedQuantity: number
    actualQuantity: number
    quantityVariance: number
  }>
  customerPerformance: Array<{
    customerName: string
    totalOrders: number
    deliveredOrders: number
    completionRate: number
    avgQuantityVariance: number
    totalValueVariance: number
  }>
  productPerformance: Array<{
    productName: string
    totalOrders: number
    deliveredOrders: number
    avgQuantityVariance: number
    totalQuantityVariance: number
  }>
}

export async function getDeliveryPerformanceReport(
  startDate: string,
  endDate: string
): Promise<{
  success: boolean
  data?: DeliveryPerformanceReport
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get all orders in the date range
    const { data: orders, error: ordersError } = await supabase
      .from('daily_orders')
      .select(`
        *,
        customer:customers(billing_name),
        product:products(name),
        delivery:deliveries(actual_quantity)
      `)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .order('order_date')

    if (ordersError) {
      throw ordersError
    }

    if (!orders || orders.length === 0) {
      return {
        success: true,
        data: {
          period: { startDate, endDate },
          summary: {
            totalOrders: 0,
            deliveredOrders: 0,
            completionRate: 0,
            totalPlannedQuantity: 0,
            totalActualQuantity: 0,
            quantityVariance: 0,
            totalPlannedValue: 0,
            totalActualValue: 0,
            valueVariance: 0,
          },
          dailyBreakdown: [],
          customerPerformance: [],
          productPerformance: [],
        }
      }
    }

    // Calculate summary statistics
    let totalOrders = 0
    let deliveredOrders = 0
    let totalPlannedQuantity = 0
    let totalActualQuantity = 0
    let totalPlannedValue = 0
    let totalActualValue = 0

    const dailyStats: { [date: string]: {
      orders: number
      delivered: number
      plannedQuantity: number
      actualQuantity: number
    } } = {}
    const customerStats: { [customer: string]: {
      totalOrders: number
      deliveredOrders: number
      quantityVariances: number[]
      valueVariances: number[]
    } } = {}
    const productStats: { [product: string]: {
      totalOrders: number
      deliveredOrders: number
      quantityVariances: number[]
    } } = {}

    for (const order of orders) {
      totalOrders++
      totalPlannedQuantity += order.planned_quantity
      totalPlannedValue += order.total_amount

      const actualQuantity = order.delivery?.[0]?.actual_quantity || 0
      const isDelivered = order.status === 'Delivered'
      
      if (isDelivered) {
        deliveredOrders++
        totalActualQuantity += actualQuantity
        totalActualValue += actualQuantity * order.unit_price
      }

      const quantityVariance = actualQuantity - order.planned_quantity
      
      // Daily breakdown
      const date = order.order_date
      if (!dailyStats[date]) {
        dailyStats[date] = {
          orders: 0,
          delivered: 0,
          plannedQuantity: 0,
          actualQuantity: 0,
        }
      }
      
      dailyStats[date].orders++
      dailyStats[date].plannedQuantity += order.planned_quantity
      dailyStats[date].actualQuantity += actualQuantity
      if (isDelivered) dailyStats[date].delivered++

      // Customer performance
      const customerName = order.customer?.billing_name || 'Unknown'
      if (!customerStats[customerName]) {
        customerStats[customerName] = {
          totalOrders: 0,
          deliveredOrders: 0,
          quantityVariances: [],
          valueVariances: [],
        }
      }
      
      customerStats[customerName].totalOrders++
      if (isDelivered) {
        customerStats[customerName].deliveredOrders++
        customerStats[customerName].quantityVariances.push(quantityVariance)
        const unitPrice = order.delivery?.[0]?.unit_price || order.unit_price
        customerStats[customerName].valueVariances.push(quantityVariance * unitPrice)
      }

      // Product performance
      const productName = order.product?.name || 'Unknown'
      if (!productStats[productName]) {
        productStats[productName] = {
          totalOrders: 0,
          deliveredOrders: 0,
          quantityVariances: [],
        }
      }
      
      productStats[productName].totalOrders++
      if (isDelivered) {
        productStats[productName].deliveredOrders++
        productStats[productName].quantityVariances.push(quantityVariance)
      }
    }

    // Process daily breakdown
    const dailyBreakdown = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      orders: stats.orders,
      delivered: stats.delivered,
      completionRate: Math.round((stats.delivered / stats.orders) * 100),
      plannedQuantity: stats.plannedQuantity,
      actualQuantity: stats.actualQuantity,
      quantityVariance: stats.actualQuantity - stats.plannedQuantity,
    }))

    // Process customer performance
    const customerPerformance = Object.entries(customerStats).map(([name, stats]) => {
      const avgQuantityVariance = stats.quantityVariances.length > 0
        ? stats.quantityVariances.reduce((sum: number, val: number) => sum + val, 0) / stats.quantityVariances.length
        : 0
      const totalValueVariance = stats.valueVariances.reduce((sum: number, val: number) => sum + val, 0)
      
      return {
        customerName: name,
        totalOrders: stats.totalOrders,
        deliveredOrders: stats.deliveredOrders,
        completionRate: Math.round((stats.deliveredOrders / stats.totalOrders) * 100),
        avgQuantityVariance: Math.round(avgQuantityVariance * 100) / 100,
        totalValueVariance: Math.round(totalValueVariance * 100) / 100,
      }
    }).sort((a, b) => b.totalOrders - a.totalOrders)

    // Process product performance
    const productPerformance = Object.entries(productStats).map(([name, stats]) => {
      const avgQuantityVariance = stats.quantityVariances.length > 0
        ? stats.quantityVariances.reduce((sum: number, val: number) => sum + val, 0) / stats.quantityVariances.length
        : 0
      const totalQuantityVariance = stats.quantityVariances.reduce((sum: number, val: number) => sum + val, 0)
      
      return {
        productName: name,
        totalOrders: stats.totalOrders,
        deliveredOrders: stats.deliveredOrders,
        avgQuantityVariance: Math.round(avgQuantityVariance * 100) / 100,
        totalQuantityVariance: Math.round(totalQuantityVariance * 100) / 100,
      }
    })

    const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
    const quantityVariance = totalActualQuantity - totalPlannedQuantity
    const valueVariance = totalActualValue - totalPlannedValue

    return {
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalOrders,
          deliveredOrders,
          completionRate,
          totalPlannedQuantity: Math.round(totalPlannedQuantity * 100) / 100,
          totalActualQuantity: Math.round(totalActualQuantity * 100) / 100,
          quantityVariance: Math.round(quantityVariance * 100) / 100,
          totalPlannedValue: Math.round(totalPlannedValue * 100) / 100,
          totalActualValue: Math.round(totalActualValue * 100) / 100,
          valueVariance: Math.round(valueVariance * 100) / 100,
        },
        dailyBreakdown,
        customerPerformance,
        productPerformance,
      }
    }

  } catch (error) {
    console.error('Error generating delivery performance report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate delivery performance report'
    }
  }
}

export interface PaymentReportData {
  id: string
  customer_id: string
  customer_name: string
  customer_contact: string
  amount: number
  payment_date: string
  payment_method: string | null
  allocation_status: string
  amount_applied: number
  amount_unapplied: number
  notes: string | null
  period_start: string | null
  period_end: string | null
  // Allocation breakdown
  invoice_allocations: Array<{
    invoice_id: string
    invoice_number: string
    amount_allocated: number
    allocation_date: string
  }>
  sales_allocations: Array<{
    sales_id: string
    amount_allocated: number
  }>
  opening_balance_allocation: number
}

export interface PaymentReportFilters {
  search?: string
  startDate?: string
  endDate?: string
  paymentMethod?: string
  allocationStatus?: string
  customerId?: string
}

export async function getPaymentReport(filters?: PaymentReportFilters): Promise<{
  success: boolean
  data?: PaymentReportData[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Build base query
    let query = supabase
      .from('payments')
      .select(`
        id,
        customer_id,
        amount,
        payment_date,
        payment_method,
        allocation_status,
        amount_applied,
        amount_unapplied,
        notes,
        period_start,
        period_end,
        customer:customers(
          billing_name,
          contact_person
        ),
        invoice_payments:invoice_payments(
          invoice_id,
          amount_allocated,
          allocation_date,
          invoice:invoice_metadata(invoice_number)
        ),
        sales_payments:sales_payments(
          sales_id,
          amount_allocated
        ),
        opening_balance_payments:opening_balance_payments(
          amount
        )
      `)
      .order('payment_date', { ascending: false })

    // Apply filters
    if (filters?.startDate) {
      query = query.gte('payment_date', formatDateForDatabase(parseLocalDateIST(filters.startDate)))
    }

    if (filters?.endDate) {
      query = query.lte('payment_date', formatDateForDatabase(parseLocalDateIST(filters.endDate)))
    }

    if (filters?.paymentMethod) {
      query = query.eq('payment_method', filters.paymentMethod)
    }

    if (filters?.allocationStatus) {
      query = query.eq('allocation_status', filters.allocationStatus)
    }

    if (filters?.customerId) {
      query = query.eq('customer_id', filters.customerId)
    }

    const { data: payments, error } = await query

    if (error) {
      throw error
    }

    if (!payments || payments.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // Transform data
    let reportData: PaymentReportData[] = payments.map((payment) => {
      // Calculate opening balance allocation total
      const opening_balance_allocation = payment.opening_balance_payments?.reduce(
        (sum: number, obp) => sum + Number(obp.amount),
        0
      ) || 0

      const customer = payment.customer as unknown as { billing_name: string; contact_person: string } | null

      return {
        id: payment.id,
        customer_id: payment.customer_id,
        customer_name: customer?.billing_name || 'Unknown Customer',
        customer_contact: customer?.contact_person || '',
        amount: Number(payment.amount),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        allocation_status: payment.allocation_status,
        amount_applied: Number(payment.amount_applied),
        amount_unapplied: Number(payment.amount_unapplied),
        notes: payment.notes,
        period_start: payment.period_start,
        period_end: payment.period_end,
        invoice_allocations: payment.invoice_payments?.map((ip) => {
          const invoice = ip.invoice as unknown as { invoice_number: string } | null
          return {
            invoice_id: ip.invoice_id,
            invoice_number: invoice?.invoice_number || 'N/A',
            amount_allocated: Number(ip.amount_allocated),
            allocation_date: ip.allocation_date
          }
        }) || [],
        sales_allocations: payment.sales_payments?.map((sp) => ({
          sales_id: sp.sales_id,
          amount_allocated: Number(sp.amount_allocated)
        })) || [],
        opening_balance_allocation
      }
    })

    // Apply client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      reportData = reportData.filter(payment =>
        payment.customer_name.toLowerCase().includes(searchLower) ||
        payment.customer_contact.toLowerCase().includes(searchLower) ||
        payment.payment_method?.toLowerCase().includes(searchLower) ||
        payment.notes?.toLowerCase().includes(searchLower)
      )
    }

    return {
      success: true,
      data: reportData
    }

  } catch (error) {
    console.error('Error generating payment report:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate payment report'
    }
  }
}

export interface MonthlyPaymentSummary {
  month: string
  year: number
  totalPayments: number
  paymentCount: number
  averagePayment: number
  byMethod: {
    [method: string]: {
      count: number
      amount: number
    }
  }
  byStatus: {
    [status: string]: {
      count: number
      amount: number
    }
  }
}

export async function getMonthlyPaymentSummary(year?: number): Promise<{
  success: boolean
  data?: MonthlyPaymentSummary[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const targetYear = year || new Date().getFullYear()

    // Get all payments for the year
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .gte('payment_date', `${targetYear}-01-01`)
      .lte('payment_date', `${targetYear}-12-31`)
      .order('payment_date')

    if (error) {
      throw error
    }

    if (!payments || payments.length === 0) {
      return {
        success: true,
        data: []
      }
    }

    // Group by month
    const monthlyData: { [key: string]: MonthlyPaymentSummary } = {}

    for (const payment of payments) {
      const date = new Date(payment.payment_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' })

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          year: date.getFullYear(),
          totalPayments: 0,
          paymentCount: 0,
          averagePayment: 0,
          byMethod: {},
          byStatus: {}
        }
      }

      const summary = monthlyData[monthKey]
      const amount = Number(payment.amount)

      summary.totalPayments += amount
      summary.paymentCount++

      // By payment method
      const method = payment.payment_method || 'Unknown'
      if (!summary.byMethod[method]) {
        summary.byMethod[method] = { count: 0, amount: 0 }
      }
      summary.byMethod[method].count++
      summary.byMethod[method].amount += amount

      // By allocation status
      const status = payment.allocation_status || 'Unknown'
      if (!summary.byStatus[status]) {
        summary.byStatus[status] = { count: 0, amount: 0 }
      }
      summary.byStatus[status].count++
      summary.byStatus[status].amount += amount
    }

    // Calculate averages and convert to array
    const summaries = Object.values(monthlyData).map(summary => ({
      ...summary,
      averagePayment: summary.paymentCount > 0 ? summary.totalPayments / summary.paymentCount : 0
    }))

    return {
      success: true,
      data: summaries
    }

  } catch (error) {
    console.error('Error generating monthly payment summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate monthly payment summary'
    }
  }
}