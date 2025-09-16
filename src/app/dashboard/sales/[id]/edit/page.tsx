import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

    // Check if sale is editable
    const isEditable = sale.sale_type !== 'Credit' || sale.payment_status === 'Pending'

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

        {/* Edit Restriction Notice */}
        {!isEditable && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                Sale Cannot Be Edited
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-700">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>This credit sale cannot be edited because it has been</span>
                  <Badge variant={sale.payment_status === 'Billed' ? 'secondary' : 'default'}>
                    {sale.payment_status}
                  </Badge>
                  <span>.</span>
                </div>
                <p>
                  Once a credit sale is billed or completed, editing is restricted to maintain accounting integrity.
                </p>
                <div>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/sales/${sale.id}`}>
                      View Sale Details
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Form - Only show if editable */}
        {isEditable && (
          <EditSaleForm 
            sale={sale} 
            products={products} 
            customers={customers}
          />
        )}
      </div>
    )
  } catch (error) {
    console.error('Error loading sale for edit:', error)
    notFound()
  }
}