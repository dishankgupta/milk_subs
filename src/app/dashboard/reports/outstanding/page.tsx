import Link from 'next/link'
import { ArrowLeft, AlertCircle, CreditCard, Phone, MapPin, Plus, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportButtons } from '@/components/reports/ExportButtons'
import { PrintHeader } from '@/components/reports/PrintHeader'
import { getCustomers } from '@/lib/actions/customers'
import { formatCurrency } from '@/lib/utils'

export default async function OutstandingReportPage() {
  // Get customers with outstanding amounts
  const { customers } = await getCustomers({ hasOutstanding: true })
  
  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstanding_amount, 0)
  const averageOutstanding = customers.length > 0 ? totalOutstanding / customers.length : 0

  // Group customers by outstanding amount ranges
  const ranges = {
    high: customers.filter(c => c.outstanding_amount >= 5000),
    medium: customers.filter(c => c.outstanding_amount >= 1000 && c.outstanding_amount < 5000),
    low: customers.filter(c => c.outstanding_amount > 0 && c.outstanding_amount < 1000)
  }

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <PrintHeader 
        title="Outstanding Amounts Report"
        subtitle="Customers with Pending Payments"
        date={new Date().toLocaleString()}
        additionalInfo={[
          `Total Outstanding: ${formatCurrency(totalOutstanding)}`,
          `Total Customers: ${customers.length}`,
          `High Priority (≥₹5,000): ${ranges.high.length}`,
          `Medium Priority (₹1,000-₹4,999): ${ranges.medium.length}`
        ]}
      />
      
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Outstanding Amounts Report</h1>
          <p className="text-muted-foreground">
            Track customers with pending payment amounts
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.print()}
          className="no-print"
        >
          <Download className="h-4 w-4 mr-2" />
          Print Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:break-inside-avoid print:mb-4">
        <Card className="print:break-inside-avoid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
            <CardTitle className="text-sm font-medium print:text-xs">Total Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground print:hidden" />
          </CardHeader>
          <CardContent className="print:pt-1">
            <div className="text-2xl font-bold text-red-600 print:text-lg print:font-bold print:text-black">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground print:text-xs print:text-black">
              Across {customers.length} customers
            </p>
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
            <CardTitle className="text-sm font-medium print:text-xs">Average Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground print:hidden" />
          </CardHeader>
          <CardContent className="print:pt-1">
            <div className="text-2xl font-bold print:text-lg print:font-bold">{formatCurrency(averageOutstanding)}</div>
            <p className="text-xs text-muted-foreground print:text-xs print:text-black">
              Per customer with outstanding
            </p>
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
            <CardTitle className="text-sm font-medium print:text-xs">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500 print:hidden" />
          </CardHeader>
          <CardContent className="print:pt-1">
            <div className="text-2xl font-bold text-red-600 print:text-lg print:font-bold print:text-black">{ranges.high.length}</div>
            <p className="text-xs text-muted-foreground print:text-xs print:text-black">
              ≥ ₹5,000 outstanding
            </p>
          </CardContent>
        </Card>

        <Card className="print:break-inside-avoid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
            <CardTitle className="text-sm font-medium print:text-xs">Medium Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500 print:hidden" />
          </CardHeader>
          <CardContent className="print:pt-1">
            <div className="text-2xl font-bold text-yellow-600 print:text-lg print:font-bold print:text-black">{ranges.medium.length}</div>
            <p className="text-xs text-muted-foreground print:text-xs print:text-black">
              ₹1,000 - ₹4,999 outstanding
            </p>
          </CardContent>
        </Card>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-green-700 mb-2">Great News!</h3>
            <p className="text-muted-foreground text-center mb-4">
              No customers have outstanding payment amounts at this time.
            </p>
            <Button asChild>
              <Link href="/dashboard/payments">
                View All Payments
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* High Priority Customers */}
          {ranges.high.length > 0 && (
            <Card className="print:break-inside-avoid print:mb-4">
              <CardHeader className="print:pb-2">
                <CardTitle className="flex items-center gap-2 text-red-600 print:text-lg print:font-bold print:text-black">
                  <AlertCircle className="h-5 w-5 print:hidden" />
                  High Priority - ₹5,000+ Outstanding ({ranges.high.length})
                </CardTitle>
                <CardDescription className="print:text-sm print:text-black">
                  Customers with high outstanding amounts requiring immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 print:space-y-2">
                  {ranges.high.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50 print:break-inside-avoid print:border print:border-gray-400 print:rounded-none print:bg-white print:p-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 print:gap-1">
                          <span className="font-semibold print:text-sm print:font-bold">{customer.billing_name}</span>
                          {customer.contact_person && (
                            <span className="text-sm text-muted-foreground print:text-xs print:text-black">({customer.contact_person})</span>
                          )}
                          <Badge variant={customer.status === "Active" ? "default" : "secondary"} className="text-xs print:border print:border-black print:text-xs print:bg-white">
                            {customer.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground print:gap-2 print:text-xs print:text-black">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 print:hidden" />
                            {customer.phone_primary}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 print:hidden" />
                            Route: {customer.route?.name || "No Route"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4 print:mr-2">
                          <div className="text-xl font-bold text-red-600 print:text-base print:font-bold print:text-black">
                            {formatCurrency(customer.outstanding_amount)}
                          </div>
                          <div className="text-xs text-muted-foreground print:text-xs print:text-black">Outstanding</div>
                        </div>
                        <Button size="sm" asChild className="print:hidden">
                          <Link href={`/dashboard/payments/new?customerId=${customer.id}`}>
                            <Plus className="h-4 w-4 mr-1" />
                            Record Payment
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild className="print:hidden">
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Medium Priority Customers */}
          {ranges.medium.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                  Medium Priority - ₹1,000-₹4,999 Outstanding ({ranges.medium.length})
                </CardTitle>
                <CardDescription>
                  Customers with moderate outstanding amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ranges.medium.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{customer.billing_name}</span>
                          {customer.contact_person && (
                            <span className="text-sm text-muted-foreground">({customer.contact_person})</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{customer.phone_primary}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-4">
                          <div className="text-lg font-bold text-yellow-600">
                            {formatCurrency(customer.outstanding_amount)}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/payments/new?customerId=${customer.id}`}>
                            <Plus className="h-4 w-4 mr-1" />
                            Payment
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Priority Customers */}
          {ranges.low.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  Low Priority - Under ₹1,000 Outstanding ({ranges.low.length})
                </CardTitle>
                <CardDescription>
                  Customers with small outstanding amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2">
                  {ranges.low.map((customer) => (
                    <div key={customer.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium text-sm">{customer.billing_name}</span>
                        <div className="text-xs text-muted-foreground">{customer.phone_primary}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(customer.outstanding_amount)}</div>
                        <Button size="sm" variant="ghost" className="text-xs h-6 px-2" asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Export Actions */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Download outstanding amounts report for offline use</CardDescription>
        </CardHeader>
        <CardContent>
          <ExportButtons />
        </CardContent>
      </Card>
    </div>
  )
}