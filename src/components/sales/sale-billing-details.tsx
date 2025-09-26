'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST } from '@/lib/date-utils'
import { ExternalLink, FileText, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface InvoiceDetails {
  invoice_number: string
  invoice_date: string
  total_amount: number
  status: string
  invoice_status: string
  amount_paid: number
  amount_outstanding: number
  due_date?: string
  last_payment_date?: string
}

interface SaleBillingDetailsProps {
  saleId: string
  saleAmount: number
  invoiceDetails: InvoiceDetails | null
}

export function SaleBillingDetails({ saleAmount, invoiceDetails }: SaleBillingDetailsProps) {
  if (!invoiceDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Billing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-muted-foreground">
              No billing information available for this sale.
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              This sale may not have been included in an invoice yet.
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'partially_paid':
        return 'secondary'
      case 'overdue':
        return 'destructive'
      case 'sent':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const isOverdue = invoiceDetails.due_date && new Date(invoiceDetails.due_date) < new Date()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Billing Details
          </div>
          <Badge variant={getStatusVariant(invoiceDetails.invoice_status)}>
            {invoiceDetails.invoice_status.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invoice Information */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label className="text-base font-medium">Invoice Number</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-mono text-lg font-medium">
                {invoiceDetails.invoice_number}
              </div>
              <div className="text-sm text-muted-foreground">
                Generated on {formatDateIST(new Date(invoiceDetails.invoice_date))}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium">Invoice Total</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-semibold text-lg">
                {formatCurrency(invoiceDetails.total_amount)}
              </div>
              <div className="text-sm text-muted-foreground">
                This sale: {formatCurrency(saleAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between text-sm">
            <span>Total Amount</span>
            <span className="font-medium">{formatCurrency(invoiceDetails.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid</span>
            <span className="font-medium text-green-600">
              {formatCurrency(invoiceDetails.amount_paid)}
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-3">
            <span>Outstanding Amount</span>
            <span className={invoiceDetails.amount_outstanding > 0 ? 'text-red-600' : 'text-green-600'}>
              {formatCurrency(invoiceDetails.amount_outstanding)}
            </span>
          </div>
        </div>

        {/* Due Date */}
        {invoiceDetails.due_date && (
          <div>
            <Label className="text-base font-medium">Due Date</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDateIST(new Date(invoiceDetails.due_date))}
              </div>
              {isOverdue && (
                <div className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Payment overdue
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Payment */}
        {invoiceDetails.last_payment_date && (
          <div>
            <Label className="text-base font-medium">Last Payment</Label>
            <div className="mt-2 p-3 bg-gray-50 rounded-md">
              <div className="font-medium">
                {formatDateIST(new Date(invoiceDetails.last_payment_date))}
              </div>
              <div className="text-sm text-muted-foreground">
                Most recent payment received
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/invoices/${invoiceDetails.invoice_number}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Invoice
            </Link>
          </Button>
          {invoiceDetails.amount_outstanding > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/payments/new?invoice=${invoiceDetails.invoice_number}`}>
                Record Payment
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}