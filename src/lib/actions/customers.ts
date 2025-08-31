"use server"

import { createClient } from "@/lib/supabase/server"
import { Customer, Route } from "@/lib/types"
import { CustomerFormData } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { calculateCustomerOutstandingAmount } from "@/lib/actions/outstanding"
import { formatTimestampForDatabase, getCurrentISTDate } from "@/lib/date-utils"

export async function getCustomers(options?: { hasOutstanding?: boolean }): Promise<{ customers: Customer[], total: number }> {
  const supabase = await createClient()
  
  if (options?.hasOutstanding) {
    // Use the new outstanding summary view for filtering customers with outstanding amounts
    const { data, error } = await supabase
      .from("customer_outstanding_summary")
      .select(`
        customer_id,
        billing_name,
        contact_person,
        route_name,
        opening_balance,
        total_outstanding
      `)
      .order("billing_name")
    
    if (error) {
      console.error("Error fetching customers with outstanding:", error)
      throw new Error("Failed to fetch customers")
    }
    
    // Transform to match Customer interface
    const customers = await Promise.all((data || []).map(async (summary) => {
      const { data: customer } = await supabase
        .from("customers")
        .select(`
          *,
          route:routes(*)
        `)
        .eq("id", summary.customer_id)
        .single()
      return customer
    }))
    
    return {
      customers: customers.filter(c => c !== null),
      total: customers.length
    }
  } else {
    // Regular query for all customers
    const { data, error } = await supabase
      .from("customers")
      .select(`
        *,
        route:routes(*)
      `)
      .order("billing_name")

    if (error) {
      console.error("Error fetching customers:", error)
      throw new Error("Failed to fetch customers")
    }

    return { 
      customers: data || [], 
      total: data?.length || 0 
    }
  }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      route:routes(*)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching customer:", error)
    return null
  }

  return data
}

export async function createCustomer(customerData: CustomerFormData): Promise<{ success: boolean; error?: string; data?: Customer }> {
  const supabase = await createClient()

  // Check for duplicate billing_name
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("billing_name", customerData.billing_name)
    .single()

  if (existing) {
    return { success: false, error: "A customer with this billing name already exists" }
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({
      billing_name: customerData.billing_name,
      contact_person: customerData.contact_person,
      address: customerData.address,
      phone_primary: customerData.phone_primary,
      phone_secondary: customerData.phone_secondary && customerData.phone_secondary.trim() !== "" ? customerData.phone_secondary : null,
      phone_tertiary: customerData.phone_tertiary && customerData.phone_tertiary.trim() !== "" ? customerData.phone_tertiary : null,
      route_id: customerData.route_id,
      delivery_time: customerData.delivery_time,
      payment_method: customerData.payment_method,
      billing_cycle_day: customerData.billing_cycle_day,
      opening_balance: customerData.opening_balance || 0,
      status: customerData.status,
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating customer:", error)
    return { success: false, error: "Failed to create customer" }
  }

  revalidatePath("/dashboard/customers")
  return { success: true, data }
}

export async function activateCustomer(customerId: string): Promise<{ success: boolean; error?: string; data?: Customer }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("customers")
    .update({ status: "Active" })
    .eq("id", customerId)
    .select()
    .single()

  if (error) {
    console.error("Error activating customer:", error)
    return { success: false, error: "Failed to activate customer" }
  }

  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard/subscriptions")
  return { success: true, data }
}

export async function updateCustomer(id: string, customerData: CustomerFormData): Promise<{ success: boolean; error?: string; data?: Customer }> {
  const supabase = await createClient()

  // Check for duplicate billing_name (excluding current customer)
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("billing_name", customerData.billing_name)
    .neq("id", id)
    .single()

  if (existing) {
    return { success: false, error: "A customer with this billing name already exists" }
  }

  const { data, error } = await supabase
    .from("customers")
    .update({
      billing_name: customerData.billing_name,
      contact_person: customerData.contact_person,
      address: customerData.address,
      phone_primary: customerData.phone_primary,
      phone_secondary: customerData.phone_secondary && customerData.phone_secondary.trim() !== "" ? customerData.phone_secondary : null,
      phone_tertiary: customerData.phone_tertiary && customerData.phone_tertiary.trim() !== "" ? customerData.phone_tertiary : null,
      route_id: customerData.route_id,
      delivery_time: customerData.delivery_time,
      payment_method: customerData.payment_method,
      billing_cycle_day: customerData.billing_cycle_day,
      opening_balance: customerData.opening_balance || 0,
      status: customerData.status,
      updated_at: formatTimestampForDatabase(getCurrentISTDate()),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating customer:", error)
    return { success: false, error: "Failed to update customer" }
  }

  revalidatePath("/dashboard/customers")
  return { success: true, data }
}

export async function deleteCustomer(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Check if customer has active subscriptions
  const { data: subscriptions } = await supabase
    .from("base_subscriptions")
    .select("id")
    .eq("customer_id", id)
    .eq("is_active", true)

  if (subscriptions && subscriptions.length > 0) {
    return { success: false, error: "Cannot delete customer with active subscriptions" }
  }

  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting customer:", error)
    return { success: false, error: "Failed to delete customer" }
  }

  revalidatePath("/dashboard/customers")
  return { success: true }
}

export async function getRoutes(): Promise<Route[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("name")

  if (error) {
    console.error("Error fetching routes:", error)
    throw new Error("Failed to fetch routes")
  }

  return data || []
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("customers")
    .select(`
      *,
      route:routes(*)
    `)
    .or(`billing_name.ilike.%${query}%,contact_person.ilike.%${query}%,phone_primary.ilike.%${query}%`)
    .order("billing_name")

  if (error) {
    console.error("Error searching customers:", error)
    throw new Error("Failed to search customers")
  }

  return data || []
}

// Note: Sales management integration now uses invoice-based outstanding calculation
// Outstanding amounts are automatically calculated from unpaid invoices + opening balance
// No direct manipulation of outstanding amounts is needed

export async function calculateTotalOutstanding(customerId: string) {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from("customers")
    .select("opening_balance")
    .eq("id", customerId)
    .single()

  if (error) {
    throw new Error("Customer not found")
  }

  // Use the new outstanding calculation function
  const totalOutstanding = await calculateCustomerOutstandingAmount(customerId)
  const openingBalance = Number(customer.opening_balance) || 0
  
  // Calculate invoice-based outstanding (total - opening balance)
  const invoiceOutstanding = totalOutstanding - openingBalance

  return {
    opening_balance: openingBalance,
    invoice_outstanding: Math.max(0, invoiceOutstanding),
    total_outstanding: totalOutstanding
  }
}