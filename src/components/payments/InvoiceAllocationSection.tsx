'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Calculator, DollarSign, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST } from '@/lib/date-utils'
import { getCustomerUnpaidInvoices, getCustomerOutstanding } from '@/lib/actions/outstanding'

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
  type: 'invoice' | 'opening_balance'
  title: string
  maxAmount: number
  allocatedAmount: number
  isSelected: boolean
  // Invoice-specific fields
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  status?: string
}

interface InvoiceAllocationSectionProps {
  customerId: string
  paymentAmount: number
  onAllocationChange: (allocations: { 
    id: string; 
    type: 'invoice' | 'opening_balance'; 
    amount: number 
  }[]) => void
}

export function InvoiceAllocationSection({ 
  customerId, 
  paymentAmount, 
  onAllocationChange 
}: InvoiceAllocationSectionProps) {
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([])
  const [, setOpeningBalance] = useState<number>(0)
  const [allocations, setAllocations] = useState<AllocationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [autoAllocateMode, setAutoAllocateMode] = useState<'oldest' | 'largest' | 'opening_first' | 'manual'>('opening_first')

  useEffect(() => {
    if (customerId) {
      loadUnpaidInvoicesAndOpeningBalance()
    }
  }, [customerId])

  const loadUnpaidInvoicesAndOpeningBalance = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load unpaid invoices
      const invoices = await getCustomerUnpaidInvoices(customerId)
      setUnpaidInvoices(invoices)
      
      // Load customer outstanding data to get opening balance
      const customerData = await getCustomerOutstanding(customerId)
      const customerOpeningBalance = customerData.openingBalance || 0
      setOpeningBalance(customerOpeningBalance)
      
      // Initialize allocations - opening balance first, then invoices
      const initialAllocations: AllocationItem[] = []
      
      // Add opening balance if it exists
      if (customerOpeningBalance > 0) {
        initialAllocations.push({
          id: 'opening_balance',
          type: 'opening_balance',
          title: 'Opening Balance (Historical Outstanding)',
          maxAmount: customerOpeningBalance,
          allocatedAmount: 0,
          isSelected: false
        })
      }
      
      // Add invoices
      invoices.forEach(invoice => {
        initialAllocations.push({
          id: invoice.id,
          type: 'invoice',
          title: invoice.invoice_number,
          maxAmount: invoice.amount_outstanding,
          allocatedAmount: 0,
          isSelected: false,
          invoiceNumber: invoice.invoice_number,
          invoiceDate: invoice.invoice_date,
          dueDate: invoice.due_date,
          status: invoice.invoice_status
        })
      })
      
      setAllocations(initialAllocations)
    } catch (error) {
      console.error('Failed to load unpaid invoices and opening balance:', error)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0)
  }, [allocations])

  const remainingAmount = paymentAmount - totalAllocated
  const isOverAllocated = totalAllocated > paymentAmount

  // Auto-allocation logic
  const handleAutoAllocate = () => {
    if (paymentAmount <= 0) return

    let remainingToAllocate = paymentAmount
    const newAllocations = [...allocations]

    // Reset all allocations
    newAllocations.forEach(allocation => {
      allocation.allocatedAmount = 0
      allocation.isSelected = false
    })

    // Create sorted list based on allocation mode
    const sortedAllocations = [...newAllocations]
    
    switch (autoAllocateMode) {
      case 'opening_first':
        // Opening balance first, then oldest invoices
        sortedAllocations.sort((a, b) => {
          if (a.type === 'opening_balance' && b.type !== 'opening_balance') return -1
          if (a.type !== 'opening_balance' && b.type === 'opening_balance') return 1
          if (a.type === 'invoice' && b.type === 'invoice') {
            const invoiceA = unpaidInvoices.find(inv => inv.id === a.id)
            const invoiceB = unpaidInvoices.find(inv => inv.id === b.id)
            if (invoiceA && invoiceB) {
              return new Date(invoiceA.invoice_date).getTime() - new Date(invoiceB.invoice_date).getTime()
            }
          }
          return 0
        })
        break
      case 'oldest':
        // Oldest invoices first, then opening balance
        sortedAllocations.sort((a, b) => {
          if (a.type === 'invoice' && b.type === 'invoice') {
            const invoiceA = unpaidInvoices.find(inv => inv.id === a.id)
            const invoiceB = unpaidInvoices.find(inv => inv.id === b.id)
            if (invoiceA && invoiceB) {
              return new Date(invoiceA.invoice_date).getTime() - new Date(invoiceB.invoice_date).getTime()
            }
          }
          if (a.type === 'opening_balance') return 1
          if (b.type === 'opening_balance') return -1
          return 0
        })
        break
      case 'largest':
        // Largest amounts first
        sortedAllocations.sort((a, b) => b.maxAmount - a.maxAmount)
        break
    }

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
    notifyAllocationChange(newAllocations)
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
    notifyAllocationChange(newAllocations)
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
    notifyAllocationChange(newAllocations)
  }

  const notifyAllocationChange = (newAllocations: AllocationItem[]) => {
    const validAllocations = newAllocations
      .filter(allocation => allocation.allocatedAmount > 0)
      .map(allocation => ({
        id: allocation.id,
        type: allocation.type,
        amount: allocation.allocatedAmount
      }))
    
    onAllocationChange(validAllocations)
  }

  const clearAllocations = () => {
    const clearedAllocations = allocations.map(allocation => ({
      ...allocation,
      allocatedAmount: 0,
      isSelected: false
    }))
    
    setAllocations(clearedAllocations)
    onAllocationChange([])
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading allocation options...</div>
        </CardContent>
      </Card>
    )
  }

  if (allocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No outstanding amounts found for this customer</p>
            <p className="text-sm">Payment will be recorded as unapplied credit</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payment Allocation</span>
          <div className="flex items-center space-x-2">
            <select
              value={autoAllocateMode}
              onChange={(e) => setAutoAllocateMode(e.target.value as 'oldest' | 'largest' | 'opening_first' | 'manual')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="opening_first">Opening Balance First</option>
              <option value="oldest">Oldest Invoices First</option>
              <option value="largest">Largest Amounts First</option>
              <option value="manual">Manual</option>
            </select>
            <Button size="sm" variant="outline" onClick={handleAutoAllocate}>
              <Calculator className="h-4 w-4 mr-1" />
              Auto Allocate
            </Button>
            <Button size="sm" variant="outline" onClick={clearAllocations}>
              Clear All
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                          <div>Outstanding: {formatCurrency(allocation.maxAmount)}</div>
                          <div className="text-xs text-orange-600 mt-1">
                            Historical outstanding from previous periods
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Label htmlFor={`allocation-${allocation.id}`} className="text-sm">
                        Allocate Amount
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
            } else {
              // Invoice allocation item
              const invoice = unpaidInvoices.find(inv => inv.id === allocation.id)
              if (!invoice) return null
              
              const isOverdue = new Date(invoice.due_date) < new Date()

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
                          {isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
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
                        Allocate Amount
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
        {remainingAmount > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-sm text-orange-800">
              {formatCurrency(remainingAmount)} will be recorded as unapplied credit for future use
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}