'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { OutstandingCustomerData } from '@/lib/types/outstanding-reports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Phone,
  MapPin,
  DollarSign,
  Calendar as CalendarIcon,
  Receipt,
  Printer,
  ChevronDown,
  ChevronRight,
  Package,
  ShoppingCart,
  Wallet
} from 'lucide-react'
import { formatCurrency, cn, formatDateForAPI } from '@/lib/utils'
import { formatDateIST } from '@/lib/date-utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

interface CustomerOutstandingDetailProps {
  customerId: string
  customerData: OutstandingCustomerData
  startDate: Date
  endDate: Date
}

export function CustomerOutstandingDetail({
  customerId,
  customerData,
  startDate: initialStartDate,
  endDate: initialEndDate
}: CustomerOutstandingDetailProps) {
  const router = useRouter()
  const [startDate, setStartDate] = useState<Date>(initialStartDate)
  const [endDate, setEndDate] = useState<Date>(initialEndDate)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const {
    customer,
    opening_balance,
    subscription_breakdown,
    manual_sales_breakdown,
    payment_breakdown,
    invoice_breakdown,
    total_outstanding
  } = customerData

  // Calculate totals
  const subscriptionTotal = subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
  const salesTotal = manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
  const paymentsTotal = payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const handlePeriodChange = () => {
    const params = new URLSearchParams()
    params.set('start_date', formatDateForAPI(startDate))
    params.set('end_date', formatDateForAPI(endDate))
    router.push(`/dashboard/outstanding/${customerId}?${params.toString()}`)
  }

  const handlePrintStatement = () => {
    // Pass the selected period to the print statement
    const params = new URLSearchParams()
    params.set('start_date', formatDateForAPI(startDate))
    params.set('end_date', formatDateForAPI(endDate))
    const printUrl = `/api/print/outstanding-report?type=statements&customer_selection=selected&selected_customer_ids=${customerId}&${params.toString()}`
    window.open(printUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
            <p className="text-gray-600">Transaction-based outstanding breakdown</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Period Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Report Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Start Date:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? formatDateIST(startDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">End Date:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? formatDateIST(endDate) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handlePeriodChange}>Apply</Button>
          </div>
        </CardContent>
      </Card>

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
                <p className="font-medium text-gray-900">{customer.route?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">Route</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opening Balance</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(opening_balance)}</div>
            <p className="text-xs text-muted-foreground">
              As of {formatDateIST(startDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(subscriptionTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {subscription_breakdown.length} month(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(salesTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Credit sales in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${total_outstanding > 0 ? 'text-red-600' : total_outstanding < 0 ? 'text-green-600' : 'text-gray-600'}`}>
              {formatCurrency(total_outstanding)}
            </div>
            <p className="text-xs text-muted-foreground">
              As of {formatDateIST(endDate)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Deliveries */}
      {subscription_breakdown.length > 0 && (
        <Card>
          <Collapsible
            open={expandedSections.has('subscriptions')}
            onOpenChange={() => toggleSection('subscriptions')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Subscription Deliveries ({subscription_breakdown.length} months)
                  </CardTitle>
                  {expandedSections.has('subscriptions') ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-6">
                  {subscription_breakdown.map((month, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{month.month_display}</h4>
                        <span className="font-bold text-blue-600">{formatCurrency(month.total_amount)}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {month.product_details.map((product, pidx) => (
                              <tr key={pidx}>
                                <td className="px-4 py-2 text-sm text-gray-900">{product.product_name}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {product.quantity} {product.unit_of_measure}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                  {formatCurrency(product.unit_price)}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                                  {formatCurrency(product.total_amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Manual Sales */}
      {manual_sales_breakdown.length > 0 && (
        <Card>
          <Collapsible
            open={expandedSections.has('sales')}
            onOpenChange={() => toggleSection('sales')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Manual Credit Sales
                  </CardTitle>
                  {expandedSections.has('sales') ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {manual_sales_breakdown.map(salesGroup =>
                        salesGroup.sale_details.map((sale, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateIST(new Date(sale.sale_date))}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">{sale.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {sale.quantity} {sale.unit_of_measure}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(sale.total_amount)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{sale.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Payment History */}
      {payment_breakdown.length > 0 && (
        <Card>
          <Collapsible
            open={expandedSections.has('payments')}
            onOpenChange={() => toggleSection('payments')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Payment History (Total: {formatCurrency(paymentsTotal)})
                  </CardTitle>
                  {expandedSections.has('payments') ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payment_breakdown.map(paymentGroup =>
                        paymentGroup.payment_details.map((payment, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateIST(new Date(payment.payment_date))}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <Badge variant="secondary">{payment.payment_method}</Badge>
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-green-600 text-right">
                              -{formatCurrency(payment.amount)}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">{payment.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Invoices */}
      {invoice_breakdown.length > 0 && (
        <Card>
          <Collapsible
            open={expandedSections.has('invoices')}
            onOpenChange={() => toggleSection('invoices')}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Invoices in Period
                  </CardTitle>
                  {expandedSections.has('invoices') ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment Date(s)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice_breakdown.map(invoiceGroup =>
                        invoiceGroup.invoice_details.map((invoice, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {formatDateIST(new Date(invoice.invoice_date))}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(invoice.total_amount)}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <Badge
                                variant={
                                  invoice.invoice_status === 'paid' || invoice.invoice_status === 'completed'
                                    ? 'default'
                                    : invoice.invoice_status === 'partially_paid'
                                    ? 'secondary'
                                    : invoice.invoice_status === 'overdue'
                                    ? 'destructive'
                                    : 'outline'
                                }
                              >
                                {invoice.invoice_status.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {invoice.payment_dates.length > 0
                                ? invoice.payment_dates.map(date => formatDateIST(new Date(date))).join(', ')
                                : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* Outstanding Summary Card */}
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Opening Balance:</span>
              <span className="font-medium">{formatCurrency(opening_balance)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">+ Subscription Deliveries:</span>
              <span className="font-medium text-blue-600">{formatCurrency(subscriptionTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">+ Manual Sales:</span>
              <span className="font-medium text-purple-600">{formatCurrency(salesTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">- Payments:</span>
              <span className="font-medium text-green-600">-{formatCurrency(paymentsTotal)}</span>
            </div>
            <div className="border-t-2 pt-3 flex justify-between items-center">
              <span className="font-bold text-lg">Total Outstanding:</span>
              <span className={`font-bold text-2xl ${total_outstanding > 0 ? 'text-red-600' : total_outstanding < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {formatCurrency(total_outstanding)}
              </span>
            </div>
          </div>
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
