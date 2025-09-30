"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { DeliveryExtended, DeliveryWithItems, AdditionalDeliveryItem, Customer, Product, Route, DailyOrder } from "@/lib/types"
import type { DeliveryFormData, BulkDeliveryFormData, DeliveryWithAdditionalItemsFormData } from "@/lib/validations"
import { 
  formatTimestampForDatabase, 
  getCurrentISTDate,
  formatDateForDatabase 
} from "@/lib/date-utils"

// ============================================================================
// FETCH OPERATIONS - Using self-contained delivery queries
// ============================================================================

export async function getDeliveries() {
  const supabase = await createClient()
  
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      customer:customers (*),
      product:products (*),
      route:routes (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching deliveries:', error)
    throw new Error('Failed to fetch deliveries')
  }

  return deliveries as (DeliveryExtended & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  })[]
}

export async function searchDeliveries(searchQuery: string) {
  const supabase = await createClient()
  
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      customer:customers (*),
      product:products (*),
      route:routes (*)
    `)
    .or(
      `delivery_person.ilike.%${searchQuery}%,delivery_notes.ilike.%${searchQuery}%,customer.billing_name.ilike.%${searchQuery}%,product.name.ilike.%${searchQuery}%,route.name.ilike.%${searchQuery}%`
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching deliveries:', error)
    throw new Error('Failed to search deliveries')
  }

  return deliveries as (DeliveryExtended & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  })[]
}

export async function getDeliveryById(id: string) {
  const supabase = await createClient()
  
  const { data: delivery, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      customer:customers (*),
      product:products (*),
      route:routes (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching delivery:', error)
    throw new Error('Failed to fetch delivery')
  }

  return delivery as DeliveryExtended & { 
    customer: Customer, 
    product: Product, 
    route: Route
  }
}

export async function getDeliveriesWithFilters(filters?: {
  date?: string
  routeId?: string
  deliveryTime?: 'Morning' | 'Evening'
  status?: 'pending' | 'delivered' | 'cancelled'
  customerId?: string
}) {
  const supabase = await createClient()
  
  let query = supabase
    .from('deliveries')
    .select(`
      *,
      customer:customers (*),
      product:products (*),
      route:routes (*)
    `)

  if (filters?.date) {
    query = query.eq('order_date', filters.date)
  }
  if (filters?.routeId) {
    query = query.eq('route_id', filters.routeId)
  }
  if (filters?.deliveryTime) {
    query = query.eq('delivery_time', filters.deliveryTime)
  }
  if (filters?.status) {
    query = query.eq('delivery_status', filters.status)
  }
  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId)
  }

  query = query.order('order_date', { ascending: false })
    .order('delivery_time', { ascending: true })
    .order('route_id', { ascending: true })

  const { data: deliveries, error } = await query

  if (error) {
    console.error('Error fetching filtered deliveries:', error)
    throw new Error('Failed to fetch deliveries')
  }

  return deliveries as (DeliveryExtended & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  })[]
}

// ============================================================================
// CREATE OPERATIONS - Supporting both subscription and additional deliveries
// ============================================================================

export async function createDelivery(data: DeliveryFormData) {
  const supabase = await createClient()
  
  const deliveryData = {
    daily_order_id: data.daily_order_id || null,
    customer_id: data.customer_id,
    product_id: data.product_id,
    route_id: data.route_id,
    order_date: formatDateForDatabase(data.order_date),
    delivery_time: data.delivery_time,
    unit_price: data.unit_price,
    // total_amount is now a computed column (actual_quantity * unit_price) - cannot be manually set
    planned_quantity: data.planned_quantity || null,
    delivery_status: data.delivery_status || 'pending',
    actual_quantity: data.actual_quantity,
    delivery_notes: data.delivery_notes || null,
    delivery_person: data.delivery_person || null,
    delivered_at: data.delivered_at ? formatTimestampForDatabase(data.delivered_at) : formatTimestampForDatabase(getCurrentISTDate()),
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

  // Update daily order status if this was a subscription delivery
  if (data.daily_order_id) {
    const { error: updateError } = await supabase
      .from('daily_orders')
      .update({ status: 'Delivered' })
      .eq('id', data.daily_order_id)

    if (updateError) {
      console.error('Error updating order status:', updateError)
      // Don't throw error here as delivery was created successfully
    }
  }

  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/orders')
  
  return delivery as DeliveryExtended
}

export async function createDeliveryWithAdditionalItems(data: DeliveryWithAdditionalItemsFormData) {
  // With the new self-contained deliveries structure, additional items are created as separate deliveries
  // Create main delivery
  const mainDelivery = await createDelivery(data)
  
  // Additional items would now be created as separate delivery entries with daily_order_id = NULL
  // This is handled through the individual delivery pages workflow as per the restructure
  
  return mainDelivery
}

export async function createBulkDeliveries(data: BulkDeliveryFormData) {
  const supabase = await createClient()
  
  // Get orders with their details for self-contained delivery creation
  const { data: orders, error: ordersError } = await supabase
    .from('daily_orders')
    .select(`
      id, 
      customer_id,
      product_id,
      route_id,
      order_date,
      delivery_time,
      unit_price,
      total_amount,
      planned_quantity
    `)
    .in('id', data.order_ids)
    .eq('status', 'Generated')
  
  if (ordersError) {
    console.error('Error fetching orders for bulk delivery:', ordersError)
    throw new Error('Failed to fetch orders for delivery')
  }
  
  if (orders.length !== data.order_ids.length) {
    throw new Error('Some orders are not available for delivery or have already been delivered')
  }
  
  const deliveredAt = data.delivered_at ? formatTimestampForDatabase(data.delivered_at) : formatTimestampForDatabase(getCurrentISTDate())
  
  // Prepare delivery records with self-contained data
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
      customer_id: order.customer_id,
      product_id: order.product_id,
      route_id: order.route_id,
      order_date: order.order_date,
      delivery_time: order.delivery_time,
      unit_price: order.unit_price,
      // total_amount is now a computed column (actual_quantity * unit_price) - cannot be manually set
      planned_quantity: order.planned_quantity,
      delivery_status: 'delivered',
      actual_quantity: actualQuantity,
      delivery_notes: data.delivery_notes || null,
      delivery_person: data.delivery_person || null,
      delivered_at: deliveredAt,
    }
  })
  
  // Process additional items by customer if provided
  const additionalDeliveries: Array<Omit<typeof deliveryRecords[0], 'daily_order_id' | 'planned_quantity'>> = []
  if (data.additional_items_by_customer) {
    for (const customerItems of data.additional_items_by_customer) {
      for (const item of customerItems.items) {
        additionalDeliveries.push({
          customer_id: customerItems.customer_id,
          product_id: item.product_id,
          route_id: customerItems.route_id,
          order_date: formatDateForDatabase(getCurrentISTDate()),
          delivery_time: 'Morning', // Default for additional items
          unit_price: item.unit_price,
          // total_amount is now a computed column (actual_quantity * unit_price) - cannot be manually set
          delivery_status: 'delivered',
          actual_quantity: item.quantity,
          delivery_notes: item.notes || null,
          delivery_person: data.delivery_person || null,
          delivered_at: deliveredAt,
        })
      }
    }
  }
  
  // Insert all delivery records (subscription + additional)
  const allDeliveryRecords = [...deliveryRecords, ...additionalDeliveries]
  const { data: deliveries, error: insertError } = await supabase
    .from('deliveries')
    .insert(allDeliveryRecords)
    .select()
  
  if (insertError) {
    console.error('Error creating bulk deliveries:', insertError)
    throw new Error('Failed to create delivery records')
  }
  
  // Update order statuses to 'Delivered' (only for subscription deliveries)
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
    deliveries: deliveries as DeliveryExtended[],
    subscriptionCount: deliveryRecords.length,
    additionalCount: additionalDeliveries.length,
    totalCount: deliveries.length
  }
}

// ============================================================================
// UPDATE OPERATIONS - Self-contained delivery updates
// ============================================================================

export async function updateDelivery(id: string, data: Partial<DeliveryFormData>) {
  const supabase = await createClient()
  
  const updateData: Record<string, unknown> = {}
  
  // Core delivery fields
  if (data.customer_id !== undefined) updateData.customer_id = data.customer_id
  if (data.product_id !== undefined) updateData.product_id = data.product_id
  if (data.route_id !== undefined) updateData.route_id = data.route_id
  if (data.order_date !== undefined) updateData.order_date = formatDateForDatabase(data.order_date)
  if (data.delivery_time !== undefined) updateData.delivery_time = data.delivery_time
  if (data.unit_price !== undefined) updateData.unit_price = data.unit_price
  // total_amount is now a computed column (actual_quantity * unit_price) - cannot be manually set
  if (data.planned_quantity !== undefined) updateData.planned_quantity = data.planned_quantity
  if (data.delivery_status !== undefined) updateData.delivery_status = data.delivery_status
  
  // Delivery execution fields
  if (data.actual_quantity !== undefined) updateData.actual_quantity = data.actual_quantity
  if (data.delivery_notes !== undefined) updateData.delivery_notes = data.delivery_notes || null
  if (data.delivery_person !== undefined) updateData.delivery_person = data.delivery_person || null
  if (data.delivered_at !== undefined) updateData.delivered_at = data.delivered_at ? formatTimestampForDatabase(data.delivered_at) : null

  updateData.updated_at = formatTimestampForDatabase(getCurrentISTDate())

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
  
  return delivery as DeliveryExtended
}

// ============================================================================
// DELETE OPERATIONS - Handling both subscription and additional deliveries
// ============================================================================

export async function deleteDelivery(id: string) {
  const supabase = await createClient()
  
  // First get the delivery to check if it's linked to an order
  const { data: delivery, error: fetchError } = await supabase
    .from('deliveries')
    .select('id, daily_order_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching delivery for deletion:', fetchError)
    throw new Error('Failed to find delivery')
  }

  // No need to delete additional items as they are now part of the deliveries table structure

  // Delete the delivery
  const { error } = await supabase
    .from('deliveries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting delivery:', error)
    throw new Error('Failed to delete delivery')
  }

  // Update daily order status if this was a subscription delivery
  if (delivery.daily_order_id) {
    const { error: updateError } = await supabase
      .from('daily_orders')
      .update({ status: 'Generated' })
      .eq('id', delivery.daily_order_id)

    if (updateError) {
      console.error('Error updating order status after deletion:', updateError)
      // Don't throw error here as delivery was deleted successfully
    }
  }

  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/orders')
}

export async function bulkDeleteDeliveries(deliveryIds: string[]) {
  if (deliveryIds.length === 0) {
    return { successCount: 0, failureCount: 0 }
  }

  const supabase = await createClient()
  
  // Get deliveries with their order IDs
  const { data: deliveries, error: fetchError } = await supabase
    .from('deliveries')
    .select('id, daily_order_id')
    .in('id', deliveryIds)

  if (fetchError) {
    console.error('Error fetching deliveries for bulk deletion:', fetchError)
    throw new Error('Failed to find deliveries')
  }

  if (deliveries.length === 0) {
    return { successCount: 0, failureCount: 0 }
  }

  // No need to delete additional items as they are now part of the deliveries table structure

  // Bulk delete deliveries
  const { error: deleteError } = await supabase
    .from('deliveries')
    .delete()
    .in('id', deliveryIds)

  if (deleteError) {
    console.error('Error bulk deleting deliveries:', deleteError)
    throw new Error('Failed to delete deliveries')
  }

  // Update order statuses for subscription deliveries
  const orderIds = deliveries
    .filter(d => d.daily_order_id)
    .map(d => d.daily_order_id)
    
  if (orderIds.length > 0) {
    const { error: updateError } = await supabase
      .from('daily_orders')
      .update({ status: 'Generated' })
      .in('id', orderIds)

    if (updateError) {
      console.error('Error updating order statuses after bulk deletion:', updateError)
      // Don't throw error here as deliveries were deleted successfully
    }
  }

  revalidatePath('/dashboard/deliveries')
  revalidatePath('/dashboard/orders')
  
  return { successCount: deliveries.length, failureCount: 0 }
}

// ============================================================================
// UTILITY FUNCTIONS - Supporting new delivery workflow
// ============================================================================

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
    customer: Customer
    product: Product
    route: Route
  })[] // Keep existing type compatibility
}

export async function getDeliveryStats(date?: string) {
  const supabase = await createClient()
  
  // Get stats from deliveries table directly
  let deliveriesQuery = supabase
    .from('deliveries')
    .select(`
      id,
      daily_order_id,
      planned_quantity,
      actual_quantity,
      delivery_status,
      order_date
    `)

  if (date) {
    deliveriesQuery = deliveriesQuery.eq('order_date', date)
  }

  const { data: deliveries, error: deliveriesError } = await deliveriesQuery

  if (deliveriesError) {
    console.error('Error fetching delivery stats:', deliveriesError)
    throw new Error('Failed to fetch delivery statistics')
  }

  // Get orders count for completion rate calculation
  let ordersQuery = supabase
    .from('daily_orders')
    .select('id, status, planned_quantity')

  if (date) {
    ordersQuery = ordersQuery.eq('order_date', date)
  }

  const { data: orders, error: ordersError } = await ordersQuery

  if (ordersError) {
    console.error('Error fetching order stats:', ordersError)
    throw new Error('Failed to fetch order statistics')
  }

  // Calculate statistics
  const subscriptionDeliveries = deliveries.filter(d => d.daily_order_id !== null)
  const additionalDeliveries = deliveries.filter(d => d.daily_order_id === null)
  
  const totalOrders = orders.length
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length
  const pendingOrders = orders.filter(o => o.status === 'Generated').length
  
  const totalPlannedQuantity = subscriptionDeliveries.reduce((sum, delivery) => 
    sum + Number(delivery.planned_quantity || 0), 0)
  const totalActualQuantity = deliveries.reduce((sum, delivery) => 
    sum + Number(delivery.actual_quantity || 0), 0)
  
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
  
  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    subscriptionDeliveries: subscriptionDeliveries.length,
    additionalDeliveries: additionalDeliveries.length,
    totalDeliveries: deliveries.length,
    totalPlannedQuantity,
    totalActualQuantity,
    completionRate,
    quantityVariance: totalActualQuantity - totalPlannedQuantity
  }
}

// ============================================================================
// ADDITIONAL ITEMS MANAGEMENT
// ============================================================================

// Additional items are now managed as separate deliveries with daily_order_id = NULL
// This function has been replaced with individual delivery creation

// Additional items are now managed through individual delivery pages
// This function has been removed as part of the deliveries table restructure