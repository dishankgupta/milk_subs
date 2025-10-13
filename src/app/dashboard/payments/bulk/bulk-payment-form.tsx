'use client'

import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Save, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

import { PaymentRow } from '@/components/bulk-payments/payment-row'
import { PaymentSummary } from '@/components/bulk-payments/payment-summary'

import { bulkPaymentSchema, type BulkPaymentFormData, type BulkPaymentRow } from '@/lib/validations'
import { createBulkPayments, type BulkPaymentsResult } from '@/lib/actions/bulk-payments'
import { getCustomers } from '@/lib/actions/customers'
import { getCurrentISTDate } from '@/lib/date-utils'

import type { Customer } from '@/lib/types'

interface BulkPaymentFormProps {
  onSuccess?: () => void
}

export function BulkPaymentForm({ onSuccess }: BulkPaymentFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<BulkPaymentsResult | null>(null)

  const form = useForm<BulkPaymentFormData>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      payments: [
        {
          customer_id: '',
          amount: 0,
          payment_date: getCurrentISTDate(),
          payment_method: '',
          notes: '',
          allocations: []
        }
      ]
    }
  })

  const payments = useWatch({
    control: form.control,
    name: 'payments',
    defaultValue: form.getValues('payments')
  })

  const addPaymentRow = () => {
    const newPayment: BulkPaymentRow = {
      customer_id: '',
      amount: 0,
      payment_date: getCurrentISTDate(),
      payment_method: '',
      notes: '',
      allocations: []
    }

    const currentPayments = form.getValues('payments')
    form.setValue('payments', [...currentPayments, newPayment])
  }

  // Load customers
  useEffect(() => {
    async function loadData() {
      try {
        const customersData = await getCustomers()
        setCustomers(customersData.customers)
      } catch {
        toast.error('Failed to load customers')
      }
    }
    loadData()
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        addPaymentRow()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removePaymentRow = (index: number) => {
    const currentPayments = form.getValues('payments')
    if (currentPayments.length > 1) {
      const newPayments = currentPayments.filter((_, i) => i !== index)
      form.setValue('payments', newPayments)
    }
  }

  const clearAllRows = () => {
    form.setValue('payments', [{
      customer_id: '',
      amount: 0,
      payment_date: getCurrentISTDate(),
      payment_method: '',
      notes: '',
      allocations: []
    }])
    setSubmissionResult(null)
  }

  const onSubmit = async (data: BulkPaymentFormData) => {
    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const result = await createBulkPayments(data)
      setSubmissionResult(result)

      if (result.success) {
        toast.success(`All ${result.processed} payments recorded successfully!`)
        // Clear form after successful submission
        setTimeout(() => {
          clearAllRows()
          onSuccess?.()
        }, 2000)
      } else {
        toast.error(`${result.errors.length} payment(s) failed to process. Check details below.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to process bulk payments')
      setSubmissionResult({
        success: false,
        processed: 0,
        total: data.payments.length,
        errors: [{ index: 0, error: 'Bulk processing failed' }],
        successfulPayments: []
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validPayments = payments.filter(payment =>
    payment.customer_id &&
    payment.amount > 0
  )

  const canSubmit = validPayments.length > 0 && !isSubmitting

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <PaymentSummary form={form} />

      {/* Progress/Error Display */}
      {submissionResult && (
        <Card className={submissionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {submissionResult.success ? '✓ Success' : '⚠ Completed with errors'}
                </span>
                <span className="text-sm">
                  {submissionResult.processed} / {submissionResult.total} processed
                </span>
              </div>

              {submissionResult.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  {submissionResult.errors.map((error) => (
                    <div key={error.index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                      Row {error.index + 1}: {error.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payment Entry</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPaymentRow}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row (Alt+A)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllRows}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payments Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Remove</TableHead>
                    <TableHead className="min-w-[200px]">Customer</TableHead>
                    <TableHead className="min-w-[120px]">Amount (₹)</TableHead>
                    <TableHead className="min-w-[140px]">Payment Date</TableHead>
                    <TableHead className="min-w-[130px]">Method</TableHead>
                    <TableHead className="min-w-[150px]">Notes</TableHead>
                    <TableHead className="min-w-[120px]">Allocate</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((_, index) => (
                    <PaymentRow
                      key={index}
                      index={index}
                      form={form}
                      customers={customers}
                      onRemove={removePaymentRow}
                      canRemove={payments.length > 1}
                      onAddRow={addPaymentRow}
                      isLastRow={index === payments.length - 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Form Errors */}
            {form.formState.errors.payments && (
              <div className="text-sm text-red-600">
                {form.formState.errors.payments.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSuccess?.()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All ({validPayments.length})
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
