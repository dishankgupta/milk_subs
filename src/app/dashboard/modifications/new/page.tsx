import { Suspense } from 'react'

import { ModificationForm } from '../modification-form'
import { createClient } from '@/lib/supabase/server'
import type { Customer, Product } from '@/lib/types'

async function getCustomersWithActiveSubscriptions(): Promise<Customer[]> {
  const supabase = await createClient()
  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      *,
      route:routes(*),
      subscriptions:base_subscriptions!inner(*)
    `)
    .eq('status', 'Active')
    .eq('subscriptions.is_active', true)
    .order('billing_name')

  if (error) {
    console.error('Error fetching customers with subscriptions:', error)
    return []
  }

  // Remove duplicates (customers might have multiple subscriptions)
  const uniqueCustomers = customers?.reduce((acc: Customer[], current) => {
    const exists = acc.find(customer => customer.id === current.id)
    if (!exists) {
      acc.push(current)
    }
    return acc
  }, []) || []

  return uniqueCustomers
}

async function getSubscriptionProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_subscription_product', true)
    .order('name')

  if (error) {
    console.error('Error fetching subscription products:', error)
    return []
  }

  return products || []
}

export default async function NewModificationPage() {
  const [customers, products] = await Promise.all([
    getCustomersWithActiveSubscriptions(),
    getSubscriptionProducts()
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Modification</h1>
        <p className="text-gray-600">
          Create a temporary subscription change
        </p>
      </div>

      <div className="max-w-2xl">
        <Suspense fallback={<div>Loading form...</div>}>
          <ModificationForm 
            customers={customers} 
            products={products} 
          />
        </Suspense>
      </div>
    </div>
  )
}