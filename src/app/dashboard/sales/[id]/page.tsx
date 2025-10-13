import Link from 'next/link'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { notFound } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { getSaleWithBillingDetails } from '@/lib/actions/sales'
import { EnhancedViewSaleDetails } from './view-sale-details'

export default async function ViewSalePage(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params

  try {
    const { sale, billingDetails, completionDetails } = await getSaleWithBillingDetails(params.id)

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
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Sale Details</h1>
            <p className="text-muted-foreground">
              View the complete sale information with billing and payment details
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isEditable && (
              <Button size="sm" asChild>
                <Link href={`/dashboard/sales/${sale.id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Sale
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Enhanced Sale Details with Billing and Completion Information */}
        <EnhancedViewSaleDetails
          sale={sale}
          billingDetails={billingDetails}
          completionDetails={completionDetails}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading sale details:', error)
    notFound()
  }
}