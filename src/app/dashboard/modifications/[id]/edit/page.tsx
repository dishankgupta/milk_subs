import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ModificationForm } from '../../modification-form'
import { getModificationById } from '@/lib/actions/modifications'
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

interface EditModificationPageProps {
  params: Promise<{ id: string }>
}

export default async function EditModificationPage({ params }: EditModificationPageProps) {
  const { id } = await params
  const [modificationResult, customers, products] = await Promise.all([
    getModificationById(id),
    getCustomers(),
    getProducts()
  ])

  if (!modificationResult.success) {
    notFound()
  }

  const modification = modificationResult.data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Modification</h1>
        <p className="text-gray-600">
          Update modification details and settings
        </p>
      </div>

      <div className="max-w-2xl">
        <Suspense fallback={<div>Loading form...</div>}>
          <ModificationForm 
            customers={customers} 
            products={products} 
            modification={modification}
            isEditing={true}
          />
        </Suspense>
      </div>
    </div>
  )
}