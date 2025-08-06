'use server'

import { createClient } from '@/lib/supabase/server'
import type { DailyOrder } from '@/lib/types'

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
  }>
  summary: {
    totalOrders: number
    totalQuantity: number
    totalValue: number
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
    
    const { data: orders, error } = await supabase
      .from('daily_orders')
      .select(`
        *,
        customer:customers(billing_name, contact_person, address, phone_primary),
        product:products(name, code),
        route:routes(name)
      `)
      .eq('order_date', date)
      .eq('route_id', routeId)
      .eq('delivery_time', deliveryTime)
      .eq('status', 'Generated')
      .order('customer_id')

    if (error) {
      throw error
    }

    if (!orders || orders.length === 0) {
      // Get route name even if no orders
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
            productBreakdown: {}
          }
        }
      }
    }

    const routeName = orders[0].route?.name || 'Unknown Route'
    const reportOrders = []
    const productBreakdown: RouteDeliveryReport['summary']['productBreakdown'] = {}
    
    let totalOrders = 0
    let totalQuantity = 0
    let totalValue = 0

    for (const order of orders as DailyOrder[]) {
      totalOrders++
      totalQuantity += order.planned_quantity
      totalValue += order.total_amount

      reportOrders.push({
        customerName: order.customer?.billing_name || 'Unknown Customer',
        contactPerson: order.customer?.contact_person || '',
        address: order.customer?.address || '',
        phone: order.customer?.phone_primary || '',
        productName: order.product?.name || 'Unknown Product',
        quantity: order.planned_quantity,
        totalAmount: order.total_amount
      })

      // Product breakdown
      const productCode = order.product?.code || 'Unknown'
      const productName = order.product?.name || 'Unknown Product'
      
      if (!productBreakdown[productCode]) {
        productBreakdown[productCode] = {
          name: productName,
          quantity: 0,
          value: 0
        }
      }
      
      productBreakdown[productCode].quantity += order.planned_quantity
      productBreakdown[productCode].value += order.total_amount
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
        customerStats[customerName].valueVariances.push(quantityVariance * order.unit_price)
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