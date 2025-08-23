"use server"

import { createClient } from "@/lib/supabase/server"
import { DailyOrder, Subscription, Customer, Product } from "@/lib/types"
import { getPatternQuantity } from "@/lib/subscription-utils"
import { revalidatePath } from "next/cache"
import { parseLocalDateIST } from "@/lib/date-utils"

// Generate daily orders for a specific date
export async function generateDailyOrders(orderDate: string) {
  const supabase = await createClient()

  try {
    // Check if orders already exist for this date
    const { data: existingOrders } = await supabase
      .from("daily_orders")
      .select("id")
      .eq("order_date", orderDate)

    if (existingOrders && existingOrders.length > 0) {
      return {
        success: false,
        error: `Orders already exist for ${orderDate}. Please delete existing orders first.`
      }
    }

    // Get all active subscriptions with customer, product, and route data
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
      return {
        success: false,
        error: "No active subscriptions found"
      }
    }

    const targetDate = parseLocalDateIST(orderDate)
    const ordersToInsert = []

    // Calculate orders for each subscription
    for (const subscription of subscriptions) {
      const customer = subscription.customer as Customer
      const product = subscription.product as Product

      if (!customer || !product) {
        continue
      }

      // Skip inactive customers
      if (customer.status !== "Active") {
        continue
      }

      let plannedQuantity = 0

      // Calculate quantity based on subscription type
      if (subscription.subscription_type === "Daily") {
        plannedQuantity = subscription.daily_quantity || 0
      } else if (subscription.subscription_type === "Pattern") {
        plannedQuantity = getPatternQuantity(subscription as Subscription, targetDate)
      }

      // Apply modifications if any exist for this date
      const modifiedQuantity = await applyModifications(
        customer.id,
        product.id,
        orderDate,
        plannedQuantity
      )

      // Skip if final quantity is 0 or negative
      if (modifiedQuantity <= 0) {
        continue
      }

      const totalAmount = modifiedQuantity * product.current_price

      ordersToInsert.push({
        customer_id: customer.id,
        product_id: product.id,
        order_date: orderDate,
        planned_quantity: modifiedQuantity,
        unit_price: product.current_price,
        total_amount: totalAmount,
        route_id: customer.route_id,
        delivery_time: customer.delivery_time,
        status: "Generated"
      })
    }

    if (ordersToInsert.length === 0) {
      return {
        success: false,
        error: "No orders to generate for this date"
      }
    }

    // Insert all orders
    const { error: insertError } = await supabase
      .from("daily_orders")
      .insert(ordersToInsert)

    if (insertError) {
      throw insertError
    }

    revalidatePath("/dashboard/orders")
    
    return {
      success: true,
      message: `Generated ${ordersToInsert.length} orders for ${orderDate}`,
      ordersCount: ordersToInsert.length
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
      return {
        success: true,
        data: [],
        summary: { totalOrders: 0, totalAmount: 0, byRoute: {}, byProduct: {} }
      }
    }

    const targetDate = parseLocalDateIST(orderDate)
    const previewOrders = []
    let totalAmount = 0
    const byRoute: Record<string, { quantity: number, amount: number }> = {}
    const byProduct: Record<string, { quantity: number, amount: number }> = {}

    // Calculate preview orders
    for (const subscription of subscriptions) {
      const customer = subscription.customer as Customer
      const product = subscription.product as Product

      if (!customer || !product || customer.status !== "Active") {
        continue
      }

      let plannedQuantity = 0

      if (subscription.subscription_type === "Daily") {
        plannedQuantity = subscription.daily_quantity || 0
      } else if (subscription.subscription_type === "Pattern") {
        plannedQuantity = getPatternQuantity(subscription as Subscription, targetDate)
      }

      const modifiedQuantity = await applyModifications(
        customer.id,
        product.id,
        orderDate,
        plannedQuantity
      )

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

      previewOrders.push({
        customer_name: customer.billing_name,
        product_name: product.name,
        quantity: modifiedQuantity,
        unit_price: product.current_price,
        total_amount: orderTotal,
        route_name: customer.route?.name || "",
        delivery_time: customer.delivery_time
      })
    }

    return {
      success: true,
      data: previewOrders,
      summary: {
        totalOrders: previewOrders.length,
        totalAmount,
        byRoute,
        byProduct
      }
    }

  } catch (error) {
    console.error("Error previewing daily orders:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to preview orders"
    }
  }
}