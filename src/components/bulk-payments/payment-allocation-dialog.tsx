'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Calculator, DollarSign, Clock, ShoppingCart, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST, getCurrentISTDate } from '@/lib/date-utils'
import {
  getCustomerUnpaidInvoices,
  getCustomerOutstanding,
  getCustomerPendingCreditSales,
  type PendingCreditSale
} from '@/lib/actions/outstanding'
import type { PaymentAllocationItem } from '@/lib/validations'

interface UnpaidInvoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  amount_paid: number
  amount_outstanding: number
  invoice_status: string
}

interface AllocationItem {
  id: string
  type: 'invoice' | 'opening_balance' | 'sales'
  title: string
  maxAmount: number
  allocatedAmount: number
  isSelected: boolean
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  status?: string
  productName?: string
  productCode?: string
  quantity?: number
  unitPrice?: number
  gstAmount?: number
  saleDate?: string
  unitOfMeasure?: string
}

interface PaymentAllocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customerId: string
  customerName: string
  paymentAmount: number
  initialAllocations?: PaymentAllocationItem[]
  onSave: (allocations: PaymentAllocationItem[]) => void
}

export function PaymentAllocationDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  paymentAmount,
  initialAllocations = [],
  onSave
}: PaymentAllocationDialogProps) {
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([])
  const [pendingCreditSales, setPendingCreditSales] = useState<PendingCreditSale[]>([])
  const [allocations, setAllocations] = useState<AllocationItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadAllocationData = useCallback(async () => {
    if (!customerId || !open) return

    try {
      setLoading(true)

      const [invoices, pendingSales, customerData] = await Promise.all([
        getCustomerUnpaidInvoices(customerId),
        getCustomerPendingCreditSales(customerId),
        getCustomerOutstanding(customerId)
      ])

      setUnpaidInvoices(invoices)
      setPendingCreditSales(pendingSales)

      const customerOpeningBalance = customerData.effectiveOpeningBalance || 0

      const initialItems: AllocationItem[] = []

      // Add opening balance if it exists
      if (customerOpeningBalance > 0) {
        const existingAlloc = initialAllocations.find(a => a.type === 'opening_balance')
        initialItems.push({
          id: 'opening_balance',
          type: 'opening_balance',
          title: 'Opening Balance (Historical Outstanding)',
          maxAmount: customerOpeningBalance,
          allocatedAmount: existingAlloc?.amount || 0,
          isSelected: !!existingAlloc
        })
      }

      // Add invoices
      invoices.forEach(invoice => {
        const existingAlloc = initialAllocations.find(a => a.id === invoice.id && a.type === 'invoice')
        initialItems.push({
          id: invoice.id,
          type: 'invoice',
          title: invoice.invoice_number,
          maxAmount: invoice.amount_outstanding,
          allocatedAmount: existingAlloc?.amount || 0,
          isSelected: !!existingAlloc,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          status: invoice.invoice_status
        })
      })

      // Add pending credit sales
      pendingSales.forEach(sale => {
        const existingAlloc = initialAllocations.find(a => a.id === sale.id && a.type === 'sales')
        initialItems.push({
          id: sale.id,
          type: 'sales',
          title: `${sale.product_name} (${sale.quantity} ${sale.unit_of_measure})`,
          maxAmount: sale.total_amount,
          allocatedAmount: existingAlloc?.amount || 0,
          isSelected: !!existingAlloc,
          productName: sale.product_name,
          productCode: sale.product_code,
          quantity: sale.quantity,
          unitPrice: sale.unit_price,
          gstAmount: sale.gst_amount,
          saleDate: sale.sale_date,
          unitOfMeasure: sale.unit_of_measure
        })
      })

      setAllocations(initialItems)

    } catch (error) {
      console.error('Error loading allocation data:', error)
    } finally {
      setLoading(false)
    }
  }, [customerId, open, initialAllocations])

  useEffect(() => {
    if (open && customerId) {
      loadAllocationData()
    }
  }, [open, customerId, loadAllocationData])

  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0)
  }, [allocations])

  const remainingAmount = paymentAmount - totalAllocated
  const isOverAllocated = totalAllocated > paymentAmount

  const handleAutoAllocate = () => {
    if (paymentAmount <= 0) return

    let remainingToAllocate = paymentAmount
    const newAllocations = [...allocations]

    // Reset all allocations
    newAllocations.forEach(allocation => {
      allocation.allocatedAmount = 0
      allocation.isSelected = false
    })

    // Opening balance first, then oldest invoices, then oldest sales
    const sortedAllocations = [...newAllocations].sort((a, b) => {
      if (a.type === 'opening_balance' && b.type !== 'opening_balance') return -1
      if (a.type !== 'opening_balance' && b.type === 'opening_balance') return 1
      if (a.type === 'invoice' && b.type === 'invoice') {
        const invoiceA = unpaidInvoices.find(inv => inv.id === a.id)
        const invoiceB = unpaidInvoices.find(inv => inv.id === b.id)
        if (invoiceA && invoiceB) {
          return new Date(invoiceA.invoice_date).getTime() - new Date(invoiceB.invoice_date).getTime()
        }
      }
      if (a.type === 'invoice' && b.type === 'sales') return -1
      if (a.type === 'sales' && b.type === 'invoice') return 1
      return 0
    })

    // Allocate payment
    for (const allocation of sortedAllocations) {
      if (remainingToAllocate <= 0) break

      const amountToAllocate = Math.min(remainingToAllocate, allocation.maxAmount)

      const allocationIndex = newAllocations.findIndex(a => a.id === allocation.id)
      if (allocationIndex >= 0) {
        newAllocations[allocationIndex].allocatedAmount = amountToAllocate
        newAllocations[allocationIndex].isSelected = amountToAllocate > 0
        remainingToAllocate -= amountToAllocate
      }
    }

    setAllocations(newAllocations)
  }

  const handleAllocationChange = (itemId: string, amount: number) => {
    const newAllocations = allocations.map(allocation => {
      if (allocation.id === itemId) {
        const validAmount = Math.max(0, Math.min(amount, allocation.maxAmount))
        return {
          ...allocation,
          allocatedAmount: validAmount,
          isSelected: validAmount > 0
        }
      }
      return allocation
    })

    setAllocations(newAllocations)
  }

  const handleToggleItem = (itemId: string, isSelected: boolean) => {
    const newAllocations = allocations.map(allocation => {
      if (allocation.id === itemId) {
        return {
          ...allocation,
          isSelected,
          allocatedAmount: isSelected ? Math.min(remainingAmount + allocation.allocatedAmount, allocation.maxAmount) : 0
        }
      }
      return allocation
    })

    setAllocations(newAllocations)
  }

  const handleSave = () => {
    const validAllocations: PaymentAllocationItem[] = allocations
      .filter(allocation => allocation.allocatedAmount > 0)
      .map(allocation => ({
        id: allocation.id,
        type: allocation.type,
        amount: allocation.allocatedAmount
      }))

    onSave(validAllocations)
    onOpenChange(false)
  }

  const clearAllocations = () => {
    setAllocations(allocations.map(allocation => ({
      ...allocation,
      allocatedAmount: 0,
      isSelected: false
    })))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Allocate Payment - {customerName}</DialogTitle>
          <DialogDescription>
            Distribute {formatCurrency(paymentAmount)} across invoices, opening balance, and credit sales
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-3 text-gray-600">Loading allocation options...</span>
          </div>
        ) : allocations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No outstanding amounts found for this customer</p>
            <p className="text-sm">Payment will be recorded as unapplied credit</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2">
              <Button size="sm" variant="outline" onClick={handleAutoAllocate}>
                <Calculator className="h-4 w-4 mr-1" />
                Auto Allocate
              </Button>
              <Button size="sm" variant="outline" onClick={clearAllocations}>
                Clear All
              </Button>
            </div>

            {/* Allocation Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="font-bold text-lg">{formatCurrency(paymentAmount)}</div>
                <div className="text-sm text-gray-600">Payment Amount</div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-lg ${isOverAllocated ? 'text-red-600' : 'text-blue-600'}`}>
                  {formatCurrency(totalAllocated)}
                </div>
                <div className="text-sm text-gray-600">Total Allocated</div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-lg ${remainingAmount < 0 ? 'text-red-600' : remainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(remainingAmount)}
                </div>
                <div className="text-sm text-gray-600">
                  {remainingAmount < 0 ? 'Over Allocated' : remainingAmount > 0 ? 'Remaining' : 'Fully Allocated'}
                </div>
              </div>
            </div>

            {/* Over-allocation Warning */}
            {isOverAllocated && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 text-sm">
                  Total allocation exceeds payment amount by {formatCurrency(Math.abs(remainingAmount))}
                </span>
              </div>
            )}

            {/* Allocation Items List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {allocations.map((allocation) => {
                if (allocation.type === 'opening_balance') {
                  return (
                    <div
                      key={allocation.id}
                      className={`border rounded-lg p-4 ${allocation.isSelected ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={allocation.isSelected}
                            onCheckedChange={(checked) => handleToggleItem(allocation.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="font-medium text-orange-700">{allocation.title}</span>
                              <Badge variant="secondary">Historical Debt</Badge>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Outstanding: {formatCurrency(allocation.maxAmount)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Label htmlFor={`allocation-${allocation.id}`} className="text-sm">
                            Amount
                          </Label>
                          <Input
                            id={`allocation-${allocation.id}`}
                            type="number"
                            min="0"
                            max={allocation.maxAmount}
                            step="0.01"
                            value={allocation.allocatedAmount || ''}
                            onChange={(e) => handleAllocationChange(allocation.id, parseFloat(e.target.value) || 0)}
                            className="w-32 mt-1"
                            placeholder="0.00"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Max: {formatCurrency(allocation.maxAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } else if (allocation.type === 'invoice') {
                  const invoice = unpaidInvoices.find(inv => inv.id === allocation.id)
                  if (!invoice) return null

                  const isOverdue = new Date(invoice.due_date) < getCurrentISTDate()

                  return (
                    <div
                      key={allocation.id}
                      className={`border rounded-lg p-4 ${allocation.isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={allocation.isSelected}
                            onCheckedChange={(checked) => handleToggleItem(allocation.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{invoice.invoice_number}</span>
                              <Badge variant={isOverdue ? 'destructive' : 'outline'}>
                                {invoice.invoice_status.replace('_', ' ')}
                              </Badge>
                              {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div>Date: {formatDateIST(new Date(invoice.invoice_date))}</div>
                              <div>Due: {formatDateIST(new Date(invoice.due_date))}</div>
                              <div>Outstanding: {formatCurrency(invoice.amount_outstanding)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Label htmlFor={`allocation-${allocation.id}`} className="text-sm">
                            Amount
                          </Label>
                          <Input
                            id={`allocation-${allocation.id}`}
                            type="number"
                            min="0"
                            max={allocation.maxAmount}
                            step="0.01"
                            value={allocation.allocatedAmount || ''}
                            onChange={(e) => handleAllocationChange(allocation.id, parseFloat(e.target.value) || 0)}
                            className="w-32 mt-1"
                            placeholder="0.00"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Max: {formatCurrency(allocation.maxAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                } else if (allocation.type === 'sales') {
                  const sale = pendingCreditSales.find(s => s.id === allocation.id)
                  if (!sale) return null

                  return (
                    <div
                      key={allocation.id}
                      className={`border rounded-lg p-4 ${allocation.isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={allocation.isSelected}
                            onCheckedChange={(checked) => handleToggleItem(allocation.id, checked as boolean)}
                            className="mt-1"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <ShoppingCart className="h-4 w-4 text-green-600" />
                              <span className="font-medium">{sale.product_name}</span>
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                                Credit Sale
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <div>Qty: {sale.quantity} {sale.unit_of_measure} @ {formatCurrency(sale.unit_price)}</div>
                              <div>Sale Date: {formatDateIST(new Date(sale.sale_date))}</div>
                              <div>Total: {formatCurrency(sale.total_amount)}</div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <Label htmlFor={`allocation-${allocation.id}`} className="text-sm">
                            Amount
                          </Label>
                          <Input
                            id={`allocation-${allocation.id}`}
                            type="number"
                            min="0"
                            max={allocation.maxAmount}
                            step="0.01"
                            value={allocation.allocatedAmount || ''}
                            onChange={(e) => handleAllocationChange(allocation.id, parseFloat(e.target.value) || 0)}
                            className="w-32 mt-1"
                            placeholder="0.00"
                          />
                          <div className="text-xs text-gray-500 mt-1">
                            Max: {formatCurrency(allocation.maxAmount)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
              })}
            </div>

            {/* Summary Info */}
            {remainingAmount > 0 && !isOverAllocated && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-sm text-orange-800">
                  {formatCurrency(remainingAmount)} will be recorded as unapplied credit
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isOverAllocated}
          >
            Save Allocations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
