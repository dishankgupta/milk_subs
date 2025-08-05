import { Suspense } from 'react'

import { ModificationForm } from '../modification-form'
import { getCustomers } from '@/lib/actions/customers'
import { createClient } from '@/lib/supabase/server'
import type { Customer, Product } from '@/lib/types'

async function getProducts(): Promise<Product[]> {
  const supabase = await createClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return products || []
}

export default async function NewModificationPage() {
  const [customers, products] = await Promise.all([
    getCustomers(),
    getProducts()
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