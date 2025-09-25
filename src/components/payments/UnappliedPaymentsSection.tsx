'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertCircle, DollarSign, ArrowRight, Search } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST } from '@/lib/date-utils'
import { InvoiceAllocationSection } from './InvoiceAllocationSection'
import { allocatePayment, getUnappliedPayments, type UnappliedPayment } from '@/lib/actions/outstanding'
import { toast } from 'sonner'

interface UnappliedPaymentsSectionProps {
  customerId?: string
  onAllocationComplete?: () => void
}

export function UnappliedPaymentsSection({ customerId, onAllocationComplete }: UnappliedPaymentsSectionProps) {
  const [unappliedPayments, setUnappliedPayments] = useState<UnappliedPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPayment, setSelectedPayment] = useState<UnappliedPayment | null>(null)
  const [pendingAllocations, setPendingAllocations] = useState<{ id: string; type: 'invoice' | 'opening_balance' | 'sales'; amount: number }[]>([])
  const [isAllocating, setIsAllocating] = useState(false)

  const loadUnappliedPayments = useCallback(async () => {
    try {
      setLoading(true)
      const payments = await getUnappliedPayments(customerId)
      setUnappliedPayments(payments)
    } catch (error) {
      console.error('Failed to load unapplied payments:', error)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    loadUnappliedPayments()
  }, [loadUnappliedPayments])

  const handleAllocatePayment = async (
    paymentId: string,
    allocations: { id: string; type: 'invoice' | 'opening_balance' | 'sales'; amount: number }[]
  ) => {
    try {
      // Convert new format to old format for invoice allocations only
      const invoiceAllocations = allocations
        .filter(alloc => alloc.type === 'invoice')
        .map(alloc => ({ invoiceId: alloc.id, amount: alloc.amount }))

      if (invoiceAllocations.length > 0) {
        await allocatePayment(paymentId, invoiceAllocations)
      }

      // Handle opening balance allocations
      const openingBalanceAllocations = allocations.filter(alloc => alloc.type === 'opening_balance')
      if (openingBalanceAllocations.length > 0) {
        // Import the function we need
        const { allocatePaymentToOpeningBalance } = await import('@/lib/actions/outstanding')
        for (const allocation of openingBalanceAllocations) {
          await allocatePaymentToOpeningBalance(paymentId, allocation.amount)
        }
      }

      // Handle sales allocations
      const salesAllocations = allocations
        .filter(alloc => alloc.type === 'sales')
        .map(alloc => ({ salesId: alloc.id, amount: alloc.amount }))

      if (salesAllocations.length > 0) {
        const { allocatePaymentToSales } = await import('@/lib/actions/outstanding')
        await allocatePaymentToSales(paymentId, salesAllocations)
      }
      
      toast.success('Payment allocated successfully!')
      setSelectedPayment(null)
      setPendingAllocations([])
      loadUnappliedPayments()
      onAllocationComplete?.()
    } catch (error) {
      toast.error('Failed to allocate payment: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const filteredPayments = unappliedPayments.filter(payment =>
    payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.customer_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.payment_method.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Unapplied Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading unapplied payments...</div>
        </CardContent>
      </Card>
    )
  }

  if (unappliedPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Unapplied Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No unapplied payments found</p>
            <p className="text-sm">All payments have been allocated to invoices</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Unapplied Payments ({unappliedPayments.length})</span>
          </div>
          <div className="text-sm font-normal">
            Total Unapplied: {formatCurrency(unappliedPayments.reduce((sum, payment) => sum + payment.amount_unapplied, 0))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by customer name, contact, or payment method..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Payments List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-lg">{payment.customer_name}</span>
                    <Badge variant="outline">{payment.payment_method}</Badge>
                    <Badge variant="secondary">
                      {formatDateIST(new Date(payment.payment_date))}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Contact:</span> {payment.customer_contact}
                    </div>
                    <div>
                      <span className="font-medium">Total Payment:</span> {formatCurrency(payment.payment_amount)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-orange-700">
                        Unapplied: {formatCurrency(payment.amount_unapplied)}
                      </span>
                    </div>
                    {payment.notes && (
                      <div className="col-span-2">
                        <span className="font-medium">Notes:</span> {payment.notes}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPayment(payment)}
                        className="flex items-center space-x-1"
                      >
                        <ArrowRight className="h-4 w-4" />
                        <span>Allocate</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Allocate Payment to Invoices</DialogTitle>
                      </DialogHeader>
                      
                      {selectedPayment && (
                        <div className="space-y-6">
                          {/* Payment Info */}
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-semibold">{selectedPayment.customer_name}</h4>
                                  <p className="text-sm text-gray-600">{selectedPayment.customer_contact}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-blue-600">
                                    {formatCurrency(selectedPayment.amount_unapplied)}
                                  </div>
                                  <div className="text-sm text-gray-600">Available to Allocate</div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          {/* Invoice Allocation */}
                          <InvoiceAllocationSection
                            customerId={selectedPayment.customer_id}
                            paymentAmount={selectedPayment.amount_unapplied}
                            onAllocationChange={(allocations) => {
                              // Store pending allocations, don't execute immediately
                              setPendingAllocations(allocations)
                            }}
                          />
                          
                          {/* Allocation Actions */}
                          <div className="flex justify-end space-x-2 pt-4 border-t">
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setSelectedPayment(null)
                                setPendingAllocations([])
                              }}
                              disabled={isAllocating}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={async () => {
                                if (pendingAllocations.length > 0 && selectedPayment) {
                                  setIsAllocating(true)
                                  try {
                                    await handleAllocatePayment(selectedPayment.payment_id, pendingAllocations)
                                    setPendingAllocations([])
                                  } catch (error) {
                                    // Error handling is already in handleAllocatePayment
                                  } finally {
                                    setIsAllocating(false)
                                  }
                                }
                              }}
                              disabled={pendingAllocations.length === 0 || isAllocating}
                              className="min-w-24"
                            >
                              {isAllocating ? 'Allocating...' : 'Apply Allocation'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredPayments.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            <p>No unapplied payments match your search</p>
            <Button variant="ghost" onClick={() => setSearchTerm('')} className="mt-2">
              Clear search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}