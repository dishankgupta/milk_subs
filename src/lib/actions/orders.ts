"use server"

import { createClient } from "@/lib/supabase/server"
import { DailyOrder, Customer, Product } from "@/lib/types"
import { getPatternQuantity } from "@/lib/subscription-utils"
import { revalidatePath } from "next/cache"
import { parseLocalDateIST, getCurrentISTDate, addDaysIST, formatDateForDatabase } from "@/lib/date-utils"

// Generate daily orders for a specific date
export async function generateDailyOrders(orderDate: string) {
  console.log("🚀 Starting optimized order generation")
  const supabase = await createClient()

  try {
    // Check if orders already exist for this date
    console.time('checkExistingOrders')
    const { data: existingOrders } = await supabase
      .from("daily_orders")
      .select("id")
      .eq("order_date", orderDate)
    console.timeEnd('checkExistingOrders')

    if (existingOrders && existingOrders.length > 0) {
      return {
        success: false,
        error: `Orders already exist for ${orderDate}. Please delete existing orders first.`
      }
    }

    // Use optimized core function to calculate orders
    const result = await calculateOrdersForDate(orderDate, true)
    
    if (!result.success) {
      return result
    }

    if (result.ordersToInsert.length === 0) {
      return {
        success: false,
        error: "No orders to generate for this date"
      }
    }

    // Insert all orders
    console.time('insertOrders')
    const { error: insertError } = await supabase
      .from("daily_orders")
      .insert(result.ordersToInsert)
    console.timeEnd('insertOrders')

    if (insertError) {
      throw insertError
    }

    revalidatePath("/dashboard/orders")
    
    console.log(`✅ Generation completed: ${result.ordersToInsert.length} orders created`)
    return {
      success: true,
      message: `Generated ${result.ordersToInsert.length} orders for ${orderDate}`,
      ordersCount: result.ordersToInsert.length
    }

  } catch (error) {
    console.error("Error generating daily orders:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate orders"
    }
  }
}

// Apply modifications to a base quantity for a specific date
async function applyModifications(
  customerId: string,
  productId: string,
  orderDate: string,
  baseQuantity: number
): Promise<number> {
  const supabase = await createClient()

  const { data: modifications } = await supabase
    .from("modifications")
    .select("*")
    .eq("customer_id", customerId)
    .eq("product_id", productId)
    .eq("is_active", true)
    .lte("start_date", orderDate)
    .gte("end_date", orderDate)

  if (!modifications || modifications.length === 0) {
    return baseQuantity
  }

  let finalQuantity = baseQuantity

  for (const mod of modifications) {
    switch (mod.modification_type) {
      case "Skip":
        return 0 // Skip means no delivery
      case "Increase":
        finalQuantity += mod.quantity_change || 0
        break
      case "Decrease":
        finalQuantity -= mod.quantity_change || 0
        break
    }
  }

  return Math.max(0, finalQuantity) // Ensure non-negative quantity
}

// Optimized batch version: Apply modifications to multiple orders in one query
async function batchApplyModifications(
  orderDate: string,
  subscriptions: Array<{
    customer: Customer;
    product: Product;
    subscription_type: string;
    daily_quantity?: number;
  }>
): Promise<Map<string, number>> {
  const supabase = await createClient()
  
  // Single query to get ALL modifications for this date
  const { data: modifications } = await supabase
    .from("modifications")
    .select("customer_id, product_id, modification_type, quantity_change")
    .eq("is_active", true)
    .lte("start_date", orderDate)
    .gte("end_date", orderDate)

  // Create lookup map for instant access
  const modMap = new Map<string, Array<{
    customer_id: string;
    product_id: string;
    modification_type: string;
    quantity_change?: number;
  }>>()
  if (modifications) {
    modifications.forEach(mod => {
      const key = `${mod.customer_id}_${mod.product_id}`
      if (!modMap.has(key)) {
        modMap.set(key, [])
      }
      modMap.get(key)!.push(mod)
    })
  }

  // Calculate final quantities for all subscriptions
  const results = new Map<string, number>()
  
  for (const subscription of subscriptions) {
    const customer = subscription.customer
    const product = subscription.product
    const key = `${customer.id}_${product.id}`
    
    // Get base quantity
    let baseQuantity = 0
    if (subscription.subscription_type === "Daily") {
      baseQuantity = subscription.daily_quantity || 0
    } else if (subscription.subscription_type === "Pattern") {
      const targetDate = parseLocalDateIST(orderDate)
      baseQuantity = getPatternQuantity(subscription as import('@/lib/types').Subscription, targetDate)
    }
    
    // Apply modifications
    let finalQuantity = baseQuantity
    const mods = modMap.get(key) || []
    
    for (const mod of mods) {
      switch (mod.modification_type) {
        case "Skip":
          finalQuantity = 0
          break
        case "Increase":
          finalQuantity += mod.quantity_change || 0
          break
        case "Decrease":
          finalQuantity -= mod.quantity_change || 0
          break
      }
    }
    
    results.set(key, Math.max(0, finalQuantity))
  }
  
  return results
}

// Shared core function for calculating orders (used by both preview and generation)
async function calculateOrdersForDate(orderDate: string, forGeneration = false) {
  console.time(`calculateOrdersForDate_${forGeneration ? 'generation' : 'preview'}`)
  const supabase = await createClient()

  try {
    // Get all active subscriptions with customer and product data
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("base_subscriptions")
      .select(`
        *,
        customer:customers(*, route:routes(*)),
        product:products(*)
      `)
      .eq("is_active", true)

    if (subscriptionsError) {
      throw subscriptionsError
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.timeEnd(`calculateOrdersForDate_${forGeneration ? 'generation' : 'preview'}`)
      return {
        success: true,
        data: [],
        summary: { totalOrders: 0, totalAmount: 0, byRoute: {}, byProduct: {} },
        ordersToInsert: []
      }
    }

    // Filter active customers upfront
    const activeSubscriptions = subscriptions.filter(subscription => {
      const customer = subscription.customer as Customer
      const product = subscription.product as Product
      return customer && product && customer.status === "Active"
    })

    // Batch apply modifications - single database query instead of N queries
    console.time('batchApplyModifications')
    const quantityMap = await batchApplyModifications(orderDate, activeSubscriptions)
    console.timeEnd('batchApplyModifications')

    const results = []
    const ordersToInsert = []
    let totalAmount = 0
    const byRoute: Record<string, { quantity: number, amount: number }> = {}
    const byProduct: Record<string, { quantity: number, amount: number }> = {}

    // Process all orders (no await in loop - pure computation)
    console.time('processOrders')
    for (const subscription of activeSubscriptions) {
      const customer = subscription.customer as Customer
      const product = subscription.product as Product
      const key = `${customer.id}_${product.id}`
      
      const modifiedQuantity = quantityMap.get(key) || 0

      if (modifiedQuantity <= 0) {
        continue
      }

      const orderTotal = modifiedQuantity * product.current_price
      totalAmount += orderTotal

      // Track by route
      const routeName = customer.route?.name || `Route ${customer.route_id}`
      if (!byRoute[routeName]) {
        byRoute[routeName] = { quantity: 0, amount: 0 }
      }
      byRoute[routeName].quantity += modifiedQuantity
      byRoute[routeName].amount += orderTotal

      // Track by product
      if (!byProduct[product.code]) {
        byProduct[product.code] = { quantity: 0, amount: 0 }
      }
      byProduct[product.code].quantity += modifiedQuantity
      byProduct[product.code].amount += orderTotal

      // For preview
      results.push({
        customer_name: customer.billing_name,
        product_name: product.name,
        quantity: modifiedQuantity,
        unit_price: product.current_price,
        total_amount: orderTotal,
        route_name: customer.route?.name || "",
        delivery_time: customer.delivery_time
      })

      // For generation
      if (forGeneration) {
        ordersToInsert.push({
          customer_id: customer.id,
          product_id: product.id,
          order_date: orderDate,
          planned_quantity: modifiedQuantity,
          unit_price: product.current_price,
          total_amount: orderTotal,
          route_id: customer.route_id,
          delivery_time: customer.delivery_time,
          status: "Generated"
        })
      }
    }
    console.timeEnd('processOrders')

    console.timeEnd(`calculateOrdersForDate_${forGeneration ? 'generation' : 'preview'}`)
    return {
      success: true,
      data: results,
      summary: {
        totalOrders: results.length,
        totalAmount,
        byRoute,
        byProduct
      },
      ordersToInsert
    }

  } catch (error) {
    console.timeEnd(`calculateOrdersForDate_${forGeneration ? 'generation' : 'preview'}`)
    console.error("Error calculating orders:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to calculate orders",
      data: [],
      summary: { totalOrders: 0, totalAmount: 0, byRoute: {}, byProduct: {} },
      ordersToInsert: []
    }
  }
}

// Get daily orders for a specific date
export async function getDailyOrders(orderDate?: string) {
  const supabase = await createClient()

  try {
    let query = supabase
      .from("daily_orders")
      .select(`
        *,
        customer:customers(*),
        product:products(*),
        route:routes(*)
      `)
      .order("route_id")
      .order("delivery_time")
      .order("customer_id")

    if (orderDate) {
      query = query.eq("order_date", orderDate)
    }

    const { data: orders, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: orders as DailyOrder[]
    }

  } catch (error) {
    console.error("Error fetching daily orders:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch orders"
    }
  }
}

// Delete orders for a specific date (useful for regenerating)
export async function deleteDailyOrders(orderDate: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from("daily_orders")
      .delete()
      .eq("order_date", orderDate)

    if (error) {
      throw error
    }

    revalidatePath("/dashboard/orders")
    
    return {
      success: true,
      message: `Deleted all orders for ${orderDate}`
    }

  } catch (error) {
    console.error("Error deleting daily orders:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete orders"
    }
  }
}

// Get order generation preview without actually creating orders
export async function previewDailyOrders(orderDate: string) {
  console.log("🚀 Starting optimized preview calculation")
  const result = await calculateOrdersForDate(orderDate, false)
  
  // Remove ordersToInsert from preview response
  const { ordersToInsert, ...previewResult } = result
  
  console.log(`✅ Preview completed: ${result.data.length} orders calculated`)
  return previewResult
}

// Get dates that have existing orders (last 30 days)
export async function getOrderDates() {
  const supabase = await createClient()

  try {
    // Get distinct order dates from the last 30 days
    const today = getCurrentISTDate()
    const thirtyDaysAgo = addDaysIST(today, -30)
    const thirtyDaysAgoString = formatDateForDatabase(thirtyDaysAgo)

    const { data: orderDates, error } = await supabase
      .from("daily_orders")
      .select("order_date")
      .gte("order_date", thirtyDaysAgoString)
      .order("order_date", { ascending: false })

    if (error) {
      throw error
    }

    // Get unique dates
    const uniqueDates = [...new Set(orderDates?.map(item => item.order_date) || [])]

    return {
      success: true,
      data: uniqueDates
    }

  } catch (error) {
    console.error("Error fetching order dates:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch order dates"
    }
  }
}