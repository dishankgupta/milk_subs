import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getSale } from '@/lib/actions/sales'
import { getProducts } from '@/lib/actions/products'
import { getCustomers } from '@/lib/actions/customers'
import { EditSaleForm } from './edit-sale-form'

export default async function EditSalePage(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params
  
  try {
    const [sale, products, customersResult] = await Promise.all([
      getSale(params.id),
      getProducts(),
      getCustomers()
    ])

    const customers = customersResult.customers

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/sales/history">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales History
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Sale</h1>
            <p className="text-muted-foreground">
              Update the sale information
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <EditSaleForm 
          sale={sale} 
          products={products} 
          customers={customers}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading sale for edit:', error)
    notFound()
  }
}