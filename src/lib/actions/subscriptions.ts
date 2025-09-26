"use server"

import { createClient } from "@/lib/supabase/server"
import { Subscription, Product } from "@/lib/types"
import { SubscriptionFormData } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { formatTimestampForDatabase, getCurrentISTDate } from "@/lib/date-utils"

export async function getSubscriptions(): Promise<Subscription[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("base_subscriptions")
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching subscriptions:", error)
    throw new Error("Failed to fetch subscriptions")
  }

  return data || []
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("base_subscriptions")
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching subscription:", error)
    return null
  }

  return data
}

export async function getCustomerSubscriptions(customerId: string): Promise<Subscription[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("base_subscriptions")
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching customer subscriptions:", error)
    throw new Error("Failed to fetch customer subscriptions")
  }

  return data || []
}

export async function createSubscription(subscriptionData: SubscriptionFormData): Promise<{ success: boolean; error?: string; data?: Subscription }> {
  const supabase = await createClient()

  // Check for duplicate subscription (same customer + product combination)
  const { data: existing } = await supabase
    .from("base_subscriptions")
    .select("id")
    .eq("customer_id", subscriptionData.customer_id)
    .eq("product_id", subscriptionData.product_id)
    .eq("is_active", true)
    .single()

  if (existing) {
    return { success: false, error: "Customer already has an active subscription for this product" }
  }

  // Prepare data for insertion
  const insertData: Record<string, unknown> = {
    customer_id: subscriptionData.customer_id,
    product_id: subscriptionData.product_id,
    subscription_type: subscriptionData.subscription_type,
    is_active: subscriptionData.is_active,
  }

  if (subscriptionData.subscription_type === "Daily") {
    insertData.daily_quantity = subscriptionData.daily_quantity
    insertData.pattern_day1_quantity = null
    insertData.pattern_day2_quantity = null
    insertData.pattern_start_date = null
  } else if (subscriptionData.subscription_type === "Pattern") {
    insertData.daily_quantity = null
    insertData.pattern_day1_quantity = subscriptionData.pattern_day1_quantity
    insertData.pattern_day2_quantity = subscriptionData.pattern_day2_quantity
    insertData.pattern_start_date = subscriptionData.pattern_start_date?.toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from("base_subscriptions")
    .insert(insertData)
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .single()

  if (error) {
    console.error("Error creating subscription:", error)
    return { success: false, error: "Failed to create subscription" }
  }

  revalidatePath("/dashboard/subscriptions")
  revalidatePath(`/dashboard/customers/${subscriptionData.customer_id}`)
  return { success: true, data }
}

export async function updateSubscription(id: string, subscriptionData: SubscriptionFormData): Promise<{ success: boolean; error?: string; data?: Subscription }> {
  const supabase = await createClient()

  // Check for duplicate subscription (excluding current subscription)
  const { data: existing } = await supabase
    .from("base_subscriptions")
    .select("id")
    .eq("customer_id", subscriptionData.customer_id)
    .eq("product_id", subscriptionData.product_id)
    .eq("is_active", true)
    .neq("id", id)
    .single()

  if (existing) {
    return { success: false, error: "Customer already has an active subscription for this product" }
  }

  // Prepare data for update
  const updateData: Record<string, unknown> = {
    customer_id: subscriptionData.customer_id,
    product_id: subscriptionData.product_id,
    subscription_type: subscriptionData.subscription_type,
    is_active: subscriptionData.is_active,
    updated_at: formatTimestampForDatabase(getCurrentISTDate()),
  }

  if (subscriptionData.subscription_type === "Daily") {
    updateData.daily_quantity = subscriptionData.daily_quantity
    updateData.pattern_day1_quantity = null
    updateData.pattern_day2_quantity = null
    updateData.pattern_start_date = null
  } else if (subscriptionData.subscription_type === "Pattern") {
    updateData.daily_quantity = null
    updateData.pattern_day1_quantity = subscriptionData.pattern_day1_quantity
    updateData.pattern_day2_quantity = subscriptionData.pattern_day2_quantity
    updateData.pattern_start_date = subscriptionData.pattern_start_date?.toISOString().split('T')[0]
  }

  const { data, error } = await supabase
    .from("base_subscriptions")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .single()

  if (error) {
    console.error("Error updating subscription:", error)
    return { success: false, error: "Failed to update subscription" }
  }

  revalidatePath("/dashboard/subscriptions")
  revalidatePath(`/dashboard/customers/${subscriptionData.customer_id}`)
  return { success: true, data }
}

export async function deleteSubscription(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get subscription details for cache invalidation
  const { data: subscription } = await supabase
    .from("base_subscriptions")
    .select("customer_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("base_subscriptions")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting subscription:", error)
    return { success: false, error: "Failed to delete subscription" }
  }

  revalidatePath("/dashboard/subscriptions")
  if (subscription?.customer_id) {
    revalidatePath(`/dashboard/customers/${subscription.customer_id}`)
  }
  return { success: true }
}

export async function toggleSubscriptionStatus(id: string): Promise<{ success: boolean; error?: string; data?: Subscription }> {
  const supabase = await createClient()

  // Get current subscription status
  const { data: current } = await supabase
    .from("base_subscriptions")
    .select("is_active, customer_id")
    .eq("id", id)
    .single()

  if (!current) {
    return { success: false, error: "Subscription not found" }
  }

  const { data, error } = await supabase
    .from("base_subscriptions")
    .update({ 
      is_active: !current.is_active,
      updated_at: formatTimestampForDatabase(getCurrentISTDate())
    })
    .eq("id", id)
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .single()

  if (error) {
    console.error("Error toggling subscription status:", error)
    return { success: false, error: "Failed to update subscription status" }
  }

  revalidatePath("/dashboard/subscriptions")
  revalidatePath(`/dashboard/customers/${current.customer_id}`)
  return { success: true, data }
}

export async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_subscription_product", true)
    .order("name")

  if (error) {
    console.error("Error fetching products:", error)
    throw new Error("Failed to fetch products")
  }

  return data || []
}

export async function searchSubscriptions(query: string): Promise<Subscription[]> {
  const supabase = await createClient()
  
  // First get all subscriptions with joins
  const { data, error } = await supabase
    .from("base_subscriptions")
    .select(`
      *,
      customer:customers(*, route:routes(*)),
      product:products(*)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error searching subscriptions:", error)
    throw new Error("Failed to search subscriptions")
  }

  // Filter on the client side for cross-table search
  const filteredData = (data || []).filter((subscription: Subscription) => {
    const customer = subscription.customer
    const product = subscription.product
    const searchTerm = query.toLowerCase()
    
    return (
      customer?.billing_name?.toLowerCase().includes(searchTerm) ||
      customer?.contact_person?.toLowerCase().includes(searchTerm) ||
      product?.name?.toLowerCase().includes(searchTerm)
    )
  })

  return filteredData
}

