'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { calculateGSTFromInclusive } from '@/lib/gst-utils'
import { formatDateIST } from '@/lib/date-utils'
import type { Sale } from '@/lib/types'

interface ViewSaleDetailsProps {
  sale: Sale & {
    customer?: {
      billing_name: string
      contact_person: string
    }
    product: {
      name: string
      code: string
      unit_of_measure: string
      gst_rate: number
    }
  }
}

export function ViewSaleDetails({ sale }: ViewSaleDetailsProps) {
  // Calculate GST breakdown
  const totalAmount = sale.total_amount
  const gstCalculation = calculateGSTFromInclusive(totalAmount, sale.product.gst_rate || 0)

  // Status badge styling
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default'
      case 'Pending':
        return 'secondary'
      case 'Billed':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getSaleTypeColor = (type: string) => {
    switch (type) {
      case 'Cash':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Credit':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'QR':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Sale Information
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(sale.payment_status)} className="text-sm">
              {sale.payment_status}
            </Badge>
            <Badge className={`text-sm ${getSaleTypeColor(sale.sale_type)}`}>
              {sale.sale_type} Sale
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sale Type Display */}
        <div>
          <Label className="text-base font-medium">Sale Type</Label>
          <div className="mt-2">
            <span className={`inline-flex items-center px-3 py-2 rounded-md border ${getSaleTypeColor(sale.sale_type)}`}>
              {sale.sale_type} Sale
            </span>
          </div>
        </div>

        {/* Customer Information (for Credit sales) */}
        {sale.sale_type === 'Credit' && sale.customer && (
          <div>
            <Label className="text-base font-medium">Customer</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium">{sale.customer.billing_name}</div>
              <div className="text-sm text-muted-foreground">{sale.customer.contact_person}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Required for credit sales to track outstanding amounts
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Product Information */}
          <div>
            <Label className="text-base font-medium">Product</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between">
                <span className="font-medium">{sale.product.name}</span>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {formatCurrency(sale.unit_price)}/{sale.product.unit_of_measure}
                  </Badge>
                  {sale.product.gst_rate && sale.product.gst_rate > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {sale.product.gst_rate}% GST
                    </Badge>
                  )}
                </div>
              </div>
              {sale.product.code && (
                <div className="text-sm text-muted-foreground mt-1">
                  Code: {sale.product.code}
                </div>
              )}
            </div>
          </div>

          {/* Sale Date */}
          <div>
            <Label className="text-base font-medium">Sale Date</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium">
                {formatDateIST(new Date(sale.sale_date))}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(sale.sale_date), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quantity */}
          <div>
            <Label className="text-base font-medium">
              Quantity ({sale.product.unit_of_measure})
            </Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-lg">
                {sale.quantity} {sale.product.unit_of_measure}
              </div>
            </div>
          </div>

          {/* Unit Price */}
          <div>
            <Label className="text-base font-medium">
              Unit Price (per {sale.product.unit_of_measure})
            </Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium text-lg">
                {formatCurrency(sale.unit_price)}
              </div>
              <div className="text-sm text-muted-foreground">
                GST-inclusive pricing
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Amount ({sale.quantity} × {formatCurrency(sale.unit_price)})</span>
            <span>{formatCurrency(gstCalculation.baseAmount)}</span>
          </div>
          {sale.product.gst_rate && sale.product.gst_rate > 0 && (
            <div className="flex justify-between text-sm">
              <span>GST ({sale.product.gst_rate}%)</span>
              <span>{formatCurrency(gstCalculation.gstAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t pt-2 text-lg">
            <span>Total Amount</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Notes */}
        {sale.notes && (
          <div>
            <Label className="text-base font-medium">Notes</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="text-sm whitespace-pre-wrap">
                {sale.notes}
              </div>
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="border-t pt-4">
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Created At</Label>
              <div className="font-medium">
                {sale.created_at ? formatDateIST(new Date(sale.created_at)) : 'N/A'}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Last Updated</Label>
              <div className="font-medium">
                {sale.updated_at ? formatDateIST(new Date(sale.updated_at)) : 'N/A'}
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Sale ID</Label>
              <div className="font-mono text-xs">
                {sale.id}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}