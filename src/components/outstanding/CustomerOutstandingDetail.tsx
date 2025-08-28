'use client'

import { useState, useEffect, memo, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCustomerOutstanding, type CustomerOutstanding } from '@/lib/actions/outstanding'
import { getCustomerPayments } from '@/lib/actions/payments'
import type { Payment } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CreditCard, FileText, Phone, MapPin, DollarSign, Calendar, Receipt, Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST, getCurrentISTDate } from '@/lib/date-utils'

interface CustomerOutstandingDetailProps {
  customerId: string
  initialData?: CustomerOutstanding
  initialPayments?: Payment[]
}

function CustomerOutstandingDetailComponent({ 
  customerId, 
  initialData, 
  initialPayments 
}: CustomerOutstandingDetailProps) {
  const [data, setData] = useState<CustomerOutstanding | null>(initialData || null)
  const [payments, setPayments] = useState<Payment[]>(initialPayments || [])
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    // Only fetch data if not provided as props
    if (!initialData || !initialPayments) {
      async function loadData() {
        try {
          setLoading(true)
          const [outstandingResult, paymentsResult] = await Promise.all([
            getCustomerOutstanding(customerId),
            getCustomerPayments(customerId)
          ])
          setData(outstandingResult)
          setPayments(paymentsResult)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load customer outstanding data')
        } finally {
          setLoading(false)
        }
      }

      loadData()
    }
  }, [customerId, initialData, initialPayments])

  const handlePrintStatement = () => {
    const printUrl = `/api/print/customer-statement/${customerId}`
    window.open(printUrl, '_blank')
  }

  if (loading) {
    return <div className="text-center py-8">Loading customer outstanding details...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-8">No data available</div>
  }

  const { customer, unpaidInvoices, openingBalance, effectiveOpeningBalance, invoiceOutstanding, totalOutstanding } = data

  // Memoize expensive calculations
  const overdueInvoicesCount = useMemo(() => {
    if (!unpaidInvoices) return 0
    const currentDate = getCurrentISTDate()
    return unpaidInvoices.filter(invoice => new Date(invoice.due_date) < currentDate).length
  }, [unpaidInvoices])

  const recentPayments = useMemo(() => {
    return payments.slice(0, 5)
  }, [payments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outstanding Details</h1>
            <p className="text-gray-600">Customer outstanding amount breakdown</p>
          </div>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={handlePrintStatement}>
            <Printer className="h-4 w-4 mr-2" />
            Print Statement
          </Button>
          <Link href={`/dashboard/payments/new?customer=${customerId}`}>
            <Button>
              <CreditCard className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <h3 className="font-medium text-gray-900">{customer.billing_name}</h3>
              <p className="text-sm text-gray-500">Billing Name</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">{customer.contact_person}</p>
              <p className="text-sm text-gray-500">Contact Person</p>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{customer.phone_primary}</p>
                <p className="text-sm text-gray-500">Primary Phone</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{customer.routes?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">Route</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Total amount owed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted-foreground">Original Balance</div>
                <div className="text-lg font-semibold">{formatCurrency(openingBalance)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Current Outstanding</div>
                <div className={`text-2xl font-bold ${effectiveOpeningBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(effectiveOpeningBalance)}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {effectiveOpeningBalance < openingBalance ? 
                `₹${(openingBalance - effectiveOpeningBalance).toFixed(2)} paid against opening balance` :
                'Historical outstanding amount'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Outstanding</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoiceOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              From {unpaidInvoices.length} unpaid invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Unpaid Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No unpaid invoices found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {unpaidInvoices.map((invoice) => {
                    const isOverdue = new Date(invoice.due_date) < getCurrentISTDate()
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.invoice_number}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateIST(new Date(invoice.invoice_date))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {formatDateIST(new Date(invoice.due_date))}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(invoice.amount_paid)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {formatCurrency(invoice.amount_outstanding)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              invoice.invoice_status === 'overdue' 
                                ? 'destructive' 
                                : invoice.invoice_status === 'partially_paid'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {invoice.invoice_status.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payment Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No payment history found</p>
              <p className="text-sm">Payments will appear here once recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          Payment of {formatCurrency(payment.amount)}
                        </p>
                        {payment.payment_method && (
                          <Badge variant="secondary" className="text-xs">
                            {payment.payment_method}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatDateIST(new Date(payment.payment_date))}
                      </p>
                      {payment.notes && (
                        <p className="text-xs text-gray-400 mt-1 max-w-md truncate" title={payment.notes}>
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Link href={`/dashboard/payments/${payment.id}`}>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
              
              {payments.length > 5 && (
                <div className="text-center pt-4 border-t">
                  <Link href={`/dashboard/payments?search=${encodeURIComponent(customer.billing_name)}`}>
                    <Button variant="outline" size="sm">
                      View All {payments.length} Payments
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link href={`/dashboard/payments/new?customer=${customerId}`}>
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </Link>
            <Link href={`/dashboard/customers/${customerId}`}>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                View Customer Profile
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" onClick={handlePrintStatement}>
              <Printer className="h-4 w-4 mr-2" />
              Print Statement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Export memoized component for better performance
export const CustomerOutstandingDetail = memo(CustomerOutstandingDetailComponent)