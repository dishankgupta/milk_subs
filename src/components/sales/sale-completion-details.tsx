'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST } from '@/lib/date-utils'
import { CheckCircle, CreditCard, Receipt, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface DirectPaymentDetails {
  amount_allocated: number
  payment_date: string
  payment_method: string
  total_payment_amount: number
  payment_notes?: string
  allocation_status: string
  payment_id: string
}

interface InvoicePaymentDetails {
  invoice_number: string
  amount_allocated: number
  payment_date: string
  payment_method: string
  payment_id: string
}

interface SaleCompletionDetailsProps {
  saleType: 'Cash' | 'Credit' | 'QR'
  saleAmount: number
  saleDate: string
  directPayment?: DirectPaymentDetails
  invoicePayment?: InvoicePaymentDetails
}

export function SaleCompletionDetails({
  saleType,
  saleAmount,
  saleDate,
  directPayment,
  invoicePayment
}: SaleCompletionDetailsProps) {
  // For Cash and QR sales - immediate completion
  if (saleType === 'Cash' || saleType === 'QR') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Completed
            <Badge variant="default" className="ml-2">Immediate</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Payment completed at time of sale</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Payment Method:</span>
                <span className="font-medium">{saleType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Amount Paid:</span>
                <span className="font-medium">{formatCurrency(saleAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Date:</span>
                <span className="font-medium">{formatDateIST(new Date(saleDate))}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            {saleType === 'Cash' ?
              'Payment was received in cash at the time of sale' :
              'Payment was received via QR code scan at the time of sale'
            }
          </div>
        </CardContent>
      </Card>
    )
  }

  // For Credit sales with direct payment
  if (directPayment) {
    const getAllocationStatusBadge = (status: string) => {
      switch (status) {
        case 'fully_applied':
          return <Badge variant="default">Fully Paid</Badge>
        case 'partially_applied':
          return <Badge variant="secondary">Partially Paid</Badge>
        default:
          return <Badge variant="outline">{status}</Badge>
      }
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Direct Payment Received
            </div>
            {getAllocationStatusBadge(directPayment.allocation_status)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-base font-medium">Payment Method</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="font-medium text-lg">
                  {directPayment.payment_method}
                </div>
                <div className="text-sm text-muted-foreground">
                  Paid on {formatDateIST(new Date(directPayment.payment_date))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Payment Amount</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="font-semibold text-lg text-green-600">
                  {formatCurrency(directPayment.total_payment_amount)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Allocated: {formatCurrency(directPayment.amount_allocated)}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sale Amount:</span>
              <span className="font-medium">{formatCurrency(saleAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Amount Allocated to Sale:</span>
              <span className="font-medium">{formatCurrency(directPayment.amount_allocated)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Payment Received:</span>
              <span className="font-medium">{formatCurrency(directPayment.total_payment_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Status:</span>
              <span className="text-green-600">
                {directPayment.amount_allocated >= saleAmount ? 'Fully Paid' : 'Partially Paid'}
              </span>
            </div>
          </div>

          {/* Payment Notes */}
          {directPayment.payment_notes && (
            <div>
              <Label className="text-base font-medium">Payment Notes</Label>
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <div className="text-sm">
                  {directPayment.payment_notes}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/payments/${directPayment.payment_id}`}>
                <Receipt className="h-4 w-4 mr-2" />
                View Payment Details
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // For Credit sales paid via invoice
  if (invoicePayment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            Paid via Invoice
            <Badge variant="outline">Invoice Payment</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-purple-800">Payment received through invoice</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Invoice Number:</span>
                <span className="font-mono font-medium">{invoicePayment.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Method:</span>
                <span className="font-medium">{invoicePayment.payment_method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment Date:</span>
                <span className="font-medium">{formatDateIST(new Date(invoicePayment.payment_date))}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span>Amount Allocated to Sale:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoicePayment.amount_allocated)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/invoices/${invoicePayment.invoice_number}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Invoice
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/payments/${invoicePayment.payment_id}`}>
                <Receipt className="h-4 w-4 mr-2" />
                View Payment
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Fallback - should not happen for completed sales
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-gray-400" />
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <div className="text-muted-foreground">
            No payment information available.
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            This sale is marked as completed but payment details could not be found.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}