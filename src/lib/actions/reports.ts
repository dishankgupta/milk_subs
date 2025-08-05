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