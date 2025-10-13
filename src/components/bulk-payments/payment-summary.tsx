'use client'

import { useMemo } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, FileText, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { BulkPaymentFormData } from '@/lib/validations'

interface PaymentSummaryProps {
  form: UseFormReturn<BulkPaymentFormData>
}

export function PaymentSummary({ form }: PaymentSummaryProps) {
  const payments = useWatch({
    control: form.control,
    name: 'payments'
  })

  const summary = useMemo(() => {
    let totalAmount = 0
    let totalAllocated = 0
    let validPayments = 0
    let fullyAllocatedCount = 0
    let partialAllocatedCount = 0
    let unappliedCount = 0
    const methodCounts: Record<string, number> = {}
    const uniqueCustomers = new Set<string>()

    payments.forEach((payment) => {
      // Check if payment is valid (has customer and positive amount)
      const isValid = payment.customer_id && payment.amount > 0

      if (isValid) {
        validPayments++
        totalAmount += payment.amount || 0
        uniqueCustomers.add(payment.customer_id)

        // Payment method counts
        const method = payment.payment_method || 'Not specified'
        methodCounts[method] = (methodCounts[method] || 0) + 1

        // Allocation status
        const allocations = payment.allocations || []
        const allocatedAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
        totalAllocated += allocatedAmount

        if (allocatedAmount === 0) {
          unappliedCount++
        } else if (allocatedAmount === payment.amount) {
          fullyAllocatedCount++
        } else {
          partialAllocatedCount++
        }
      }
    })

    return {
      totalAmount,
      totalAllocated,
      totalUnapplied: totalAmount - totalAllocated,
      validPayments,
      totalPayments: payments.length,
      fullyAllocatedCount,
      partialAllocatedCount,
      unappliedCount,
      methodCounts,
      uniqueCustomers: uniqueCustomers.size
    }
  }, [payments])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Amount Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
          <p className="text-xs text-muted-foreground">
            From {summary.validPayments} payment{summary.validPayments !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Valid Payments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payments</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.validPayments} / {summary.totalPayments}</div>
          <p className="text-xs text-muted-foreground">
            {summary.uniqueCustomers} unique customer{summary.uniqueCustomers !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Allocation Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Allocation Status</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Fully Allocated:</span>
              <span className="font-medium">{summary.fullyAllocatedCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-yellow-600">Partial:</span>
              <span className="font-medium">{summary.partialAllocatedCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Unapplied:</span>
              <span className="font-medium">{summary.unappliedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(summary.methodCounts).length > 0 ? (
              Object.entries(summary.methodCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([method, count]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="text-gray-600">{method}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-muted-foreground">No methods selected</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unapplied Amount Card */}
      {summary.totalUnapplied > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unapplied Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalUnapplied)}</div>
            <p className="text-xs text-muted-foreground">
              Will be recorded as unapplied credit (can be allocated later from Payments dashboard)
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
