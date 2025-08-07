"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Delivery, DailyOrder, Customer, Product, Route } from "@/lib/types"
import type { DeliveryFormData, BulkDeliveryFormData } from "@/lib/validations"

export async function getDeliveries() {
  const supabase = await createClient()
  
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      daily_order:daily_orders (
        *,
        customer:customers (*),
        product:products (*),
        route:routes (*)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching deliveries:', error)
    throw new Error('Failed to fetch deliveries')
  }

  return deliveries as (Delivery & { daily_order: DailyOrder & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  } })[]
}

export async function searchDeliveries(searchQuery: string) {
  const supabase = await createClient()
  
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      daily_order:daily_orders (
        *,
        customer:customers (*),
        product:products (*),
        route:routes (*)
      )
    `)
    .or(
      `delivery_person.ilike.%${searchQuery}%,delivery_notes.ilike.%${searchQuery}%`
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching deliveries:', error)
    throw new Error('Failed to search deliveries')
  }

  return deliveries as (Delivery & { daily_order: DailyOrder & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  } })[]
}

export async function getDeliveryById(id: string) {
  const supabase = await createClient()
  
  const { data: delivery, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      daily_order:daily_orders (
        *,
        customer:customers (*),
        product:products (*),
        route:routes (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching delivery:', error)
    throw new Error('Failed to fetch delivery')
  }

  return delivery as Delivery & { 
    daily_order: DailyOrder & { 
      customer: Customer, 
      product: Product, 
      route: Route 
    } 
  }
}

export async function createDelivery(data: DeliveryFormData) {
  const supabase = await createClient()
  
  const deliveryData = {
    daily_order_id: data.daily_order_id,
    actual_quantity: data.actual_quantity,
    delivery_notes: data.delivery_notes || null,
    delivery_person: data.delivery_person || null,
    delivered_at: data.delivered_at ? data.delivered_at.toISOString() : new Date().toISOString(),
  }

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .insert(deliveryData)
    .select()
    .single()

  if (error) {
    console.error('Error creating delivery:', error)
    throw new Error('Failed to create delivery record')
  }

  // Update the daily order status to 'Delivered'
  const { error: updateError } = await supabase
    .from('daily_orders')
    .update({ status: 'Delivered' })
    .eq('id', data.daily_order_id)

  if (updateError) {
    console.error('Error updating order status:', updateError)
    // Don't throw error here as delivery was created successfully
  }

  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/orders')
  
  return delivery as Delivery
}

export async function createBulkDeliveries(data: BulkDeliveryFormData) {
  const supabase = await createClient()
  
  // First, get the orders to be delivered
  const { data: orders, error: ordersError } = await supabase
    .from('daily_orders')
    .select('id, planned_quantity')
    .in('id', data.order_ids)
    .eq('status', 'Generated')
  
  if (ordersError) {
    console.error('Error fetching orders for bulk delivery:', ordersError)
    throw new Error('Failed to fetch orders for delivery')
  }
  
  if (orders.length !== data.order_ids.length) {
    throw new Error('Some orders are not available for delivery or have already been delivered')
  }
  
  const deliveredAt = data.delivered_at ? data.delivered_at.toISOString() : new Date().toISOString()
  
  // Prepare delivery records
  const deliveryRecords = orders.map((order) => {
    let actualQuantity = order.planned_quantity // Default to planned quantity
    
    // If custom quantities provided, use those instead
    if (data.delivery_mode === 'custom' && data.custom_quantities) {
      const customQuantity = data.custom_quantities.find(cq => cq.order_id === order.id)
      if (customQuantity) {
        actualQuantity = customQuantity.actual_quantity
      }
    }
    
    return {
      daily_order_id: order.id,
      actual_quantity: actualQuantity,
      delivery_notes: data.delivery_notes || null,
      delivery_person: data.delivery_person || null,
      delivered_at: deliveredAt,
    }
  })
  
  // Insert all delivery records in a transaction
  const { data: deliveries, error: insertError } = await supabase
    .from('deliveries')
    .insert(deliveryRecords)
    .select()
  
  if (insertError) {
    console.error('Error creating bulk deliveries:', insertError)
    throw new Error('Failed to create delivery records')
  }
  
  // Update all order statuses to 'Delivered'
  const { error: updateError } = await supabase
    .from('daily_orders')
    .update({ status: 'Delivered' })
    .in('id', data.order_ids)
  
  if (updateError) {
    console.error('Error updating order statuses:', updateError)
    // Don't throw error here as deliveries were created successfully
  }
  
  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/orders')
  
  return {
    deliveries: deliveries as Delivery[],
    count: deliveries.length
  }
}

export async function updateDelivery(id: string, data: Partial<DeliveryFormData>) {
  const supabase = await createClient()
  
  const updateData: Record<string, unknown> = {}
  if (data.actual_quantity !== undefined) updateData.actual_quantity = data.actual_quantity
  if (data.delivery_notes !== undefined) updateData.delivery_notes = data.delivery_notes || null
  if (data.delivery_person !== undefined) updateData.delivery_person = data.delivery_person || null
  if (data.delivered_at !== undefined) updateData.delivered_at = data.delivered_at?.toISOString() || null

  updateData.updated_at = new Date().toISOString()

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating delivery:', error)
    throw new Error('Failed to update delivery')
  }

  revalidatePath('/dashboard/deliveries')
  revalidatePath(`/dashboard/deliveries/${id}`)
  
  return delivery as Delivery
}

export async function deleteDelivery(id: string) {
  const supabase = await createClient()
  
  // First get the delivery to get the order id
  const { data: delivery, error: fetchError } = await supabase
    .from('deliveries')
    .select('daily_order_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching delivery for deletion:', fetchError)
    throw new Error('Failed to find delivery')
  }

  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting delivery:', error)
    throw new Error('Failed to delete delivery')
  }

  // Update the daily order status back to 'Generated'
  const { error: updateError } = await supabase
    .from('daily_orders')
    .update({ status: 'Generated' })
    .eq('id', delivery.daily_order_id)

  if (updateError) {
    console.error('Error updating order status after deletion:', updateError)
    // Don't throw error here as delivery was deleted successfully
  }

  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/orders')
}

export async function getUndeliveredOrders(date?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('daily_orders')
    .select(`
      *,
      customer:customers (*),
      product:products (*),
      route:routes (*)
    `)
    .eq('status', 'Generated')
    .order('route_id', { ascending: true })
    .order('delivery_time', { ascending: true })

  if (date) {
    query = query.eq('order_date', date)
  }

  const { data: orders, error } = await query

  if (error) {
    console.error('Error fetching undelivered orders:', error)
    throw new Error('Failed to fetch undelivered orders')
  }

  return orders as (DailyOrder & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  })[]
}

export async function getDeliveryStats(date?: string) {
  const supabase = await createClient()
  
  let ordersQuery = supabase
    .from('daily_orders')
    .select('id, planned_quantity, status')

  let deliveriesQuery = supabase
    .from('deliveries')
    .select(`
      id, 
      actual_quantity,
      daily_order:daily_orders!inner (
        id,
        order_date,
        planned_quantity
      )
    `)

  if (date) {
    ordersQuery = ordersQuery.eq('order_date', date)
    deliveriesQuery = deliveriesQuery.eq('daily_order.order_date', date)
  }

  const [ordersResult, deliveriesResult] = await Promise.all([
    ordersQuery,
    deliveriesQuery
  ])

  if (ordersResult.error) {
    console.error('Error fetching order stats:', ordersResult.error)
    throw new Error('Failed to fetch order statistics')
  }

  if (deliveriesResult.error) {
    console.error('Error fetching delivery stats:', deliveriesResult.error)
    throw new Error('Failed to fetch delivery statistics')
  }

  const orders = ordersResult.data
  const deliveries = deliveriesResult.data

  const totalOrders = orders.length
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length
  const pendingOrders = orders.filter(o => o.status === 'Generated').length
  
  const totalPlannedQuantity = orders.reduce((sum, order) => sum + Number(order.planned_quantity), 0)
  const totalActualQuantity = deliveries.reduce((sum, delivery) => sum + Number(delivery.actual_quantity || 0), 0)
  
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
  
  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    totalPlannedQuantity,
    totalActualQuantity,
    completionRate,
    quantityVariance: totalActualQuantity - totalPlannedQuantity
  }
}