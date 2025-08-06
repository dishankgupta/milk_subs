import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, TrendingUp, Users, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getPaymentStats } from '@/lib/actions/payments'
import { formatCurrency } from '@/lib/utils'
import { PaymentCollectionReport } from './payment-collection-report'

export default async function PaymentReportsPage(props: { 
  searchParams: Promise<{ 
    month?: string
    year?: string 
  }> 
}) {
  const searchParams = await props.searchParams
  const stats = await getPaymentStats()
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long' })
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Reports</h1>
          <p className="text-muted-foreground">
            Track payment collections and outstanding amounts
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyPayments)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalPaymentsThisMonth} payments in {currentMonth}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Total amount pending collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOutstanding > 0 
                ? Math.round((stats.totalMonthlyPayments / (stats.totalMonthlyPayments + stats.totalOutstanding)) * 100)
                : 100}%
            </div>
            <p className="text-xs text-muted-foreground">
              Current collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customersWithOutstanding}</div>
            <p className="text-xs text-muted-foreground">
              With outstanding amounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Collection Report */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payment Collection</CardTitle>
          <CardDescription>
            Track payment collection patterns and outstanding amounts over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading payment collection report...</div>}>
            <PaymentCollectionReport />
          </Suspense>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Amounts</CardTitle>
            <CardDescription>
              View detailed list of customers with pending payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/reports/outstanding">
                View Outstanding Report
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Payments</CardTitle>
            <CardDescription>
              View complete payment history and transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard/payments">
                View All Payments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}