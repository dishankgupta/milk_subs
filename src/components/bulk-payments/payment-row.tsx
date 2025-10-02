'use client'

import { useState } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { format } from 'date-fns'
import { CalendarIcon, X, DollarSign } from 'lucide-react'
import { TableRow, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { Customer } from '@/lib/types'
import type { BulkPaymentFormData, PaymentAllocationItem } from '@/lib/validations'
import { PaymentAllocationDialog } from './payment-allocation-dialog'
import { STANDARD_PAYMENT_METHODS } from '@/lib/validations'

interface PaymentRowProps {
  index: number
  form: UseFormReturn<BulkPaymentFormData>
  customers: Customer[]
  onRemove: (index: number) => void
  canRemove: boolean
  onAddRow: () => void
  isLastRow: boolean
}

export function PaymentRow({
  index,
  form,
  customers,
  onRemove,
  canRemove,
  onAddRow,
  isLastRow
}: PaymentRowProps) {
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false)

  const payment = useWatch({
    control: form.control,
    name: `payments.${index}`
  })

  const customerId = payment?.customer_id
  const paymentAmount = payment?.amount || 0
  const allocations = payment?.allocations || []

  // Calculate allocation status
  const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
  const allocationStatus = totalAllocated === 0
    ? 'unapplied'
    : totalAllocated === paymentAmount
    ? 'full'
    : totalAllocated > paymentAmount
    ? 'over'
    : 'partial'

  const selectedCustomer = customers.find(c => c.id === customerId)

  const handleAllocationSave = (newAllocations: PaymentAllocationItem[]) => {
    form.setValue(`payments.${index}.allocations`, newAllocations, { shouldValidate: true })

    // Auto-add new row if this is the last row and allocations were saved
    if (isLastRow && newAllocations.length > 0) {
      onAddRow()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key to add new row (if on last row)
    if (e.key === 'Enter' && isLastRow && !e.shiftKey) {
      e.preventDefault()
      onAddRow()
    }
  }

  return (
    <>
      <TableRow>
        {/* Remove Button */}
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            disabled={!canRemove}
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </TableCell>

        {/* Customer */}
        <TableCell>
          <Select
            value={payment?.customer_id || ''}
            onValueChange={(value) => {
              form.setValue(`payments.${index}.customer_id`, value, { shouldValidate: true })
              // Clear allocations when customer changes
              form.setValue(`payments.${index}.allocations`, [])
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.billing_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.payments?.[index]?.customer_id && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.payments[index]?.customer_id?.message}
            </p>
          )}
        </TableCell>

        {/* Amount */}
        <TableCell>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-[120px]"
            value={payment?.amount || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0
              form.setValue(`payments.${index}.amount`, value, { shouldValidate: true })
              // Clear allocations if amount changes significantly
              if (totalAllocated > value) {
                form.setValue(`payments.${index}.allocations`, [])
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {form.formState.errors.payments?.[index]?.amount && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.payments[index]?.amount?.message}
            </p>
          )}
        </TableCell>

        {/* Payment Date */}
        <TableCell>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !payment?.payment_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {payment?.payment_date ? format(payment.payment_date, "PP") : <span>Pick date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={payment?.payment_date}
                onSelect={(date) => form.setValue(`payments.${index}.payment_date`, date || new Date(), { shouldValidate: true })}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.payments?.[index]?.payment_date && (
            <p className="text-xs text-red-600 mt-1">
              {form.formState.errors.payments[index]?.payment_date?.message}
            </p>
          )}
        </TableCell>

        {/* Payment Method */}
        <TableCell>
          <Select
            value={payment?.payment_method || ''}
            onValueChange={(value) => form.setValue(`payments.${index}.payment_method`, value)}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              {STANDARD_PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Notes */}
        <TableCell>
          <Input
            placeholder="Notes (optional)"
            className="w-[150px]"
            value={payment?.notes || ''}
            onChange={(e) => form.setValue(`payments.${index}.notes`, e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </TableCell>

        {/* Allocate Button */}
        <TableCell>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAllocationDialogOpen(true)}
            disabled={!customerId || !paymentAmount || paymentAmount <= 0}
          >
            <DollarSign className="h-4 w-4 mr-1" />
            Allocate
          </Button>
        </TableCell>

        {/* Allocation Status */}
        <TableCell>
          {allocationStatus === 'unapplied' && (
            <Badge variant="secondary">Unapplied</Badge>
          )}
          {allocationStatus === 'partial' && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              Partial ({formatCurrency(totalAllocated)})
            </Badge>
          )}
          {allocationStatus === 'full' && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
              Full
            </Badge>
          )}
          {allocationStatus === 'over' && (
            <Badge variant="destructive">
              Over ({formatCurrency(totalAllocated)})
            </Badge>
          )}
        </TableCell>
      </TableRow>

      {/* Allocation Dialog */}
      {customerId && selectedCustomer && (
        <PaymentAllocationDialog
          open={allocationDialogOpen}
          onOpenChange={setAllocationDialogOpen}
          customerId={customerId}
          customerName={selectedCustomer.billing_name}
          paymentAmount={paymentAmount}
          initialAllocations={allocations}
          onSave={handleAllocationSave}
        />
      )}
    </>
  )
}
