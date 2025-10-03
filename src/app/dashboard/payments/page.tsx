import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, CreditCard, AlertCircle, TrendingUp, Users, DollarSign, FileStack, BarChart3 } from "lucide-react"
import { getPayments, getPaymentStats } from "@/lib/actions/payments"
import { getUnappliedPaymentStats } from "@/lib/actions/outstanding"
import { formatCurrency } from "@/lib/utils"
import { PaymentTabs } from "@/components/payments/PaymentTabs"

export default async function PaymentsPage(props: { 
  searchParams: Promise<{ 
    search?: string
    customer_id?: string
    payment_method?: string
    page?: string 
  }> 
}) {
  const searchParams = await props.searchParams
  
  const [paymentsResult, stats, unappliedStats] = await Promise.all([
    getPayments({
      search: searchParams.search,
      customer_id: searchParams.customer_id,
      payment_method: searchParams.payment_method,
      page: searchParams.page ? parseInt(searchParams.page) : 1,
    }),
    getPaymentStats(),
    getUnappliedPaymentStats()
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Track customer payments and outstanding amounts
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/reports/payments">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
          <Link href="/dashboard/payments/bulk">
            <Button variant="outline">
              <FileStack className="mr-2 h-4 w-4" />
              Bulk Add
            </Button>
          </Link>
          <Link href="/dashboard/payments/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalMonthlyPayments)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalPaymentsThisMonth} payments received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              From {stats.customersWithOutstanding} customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOutstanding > 0 
                ? Math.round((stats.totalMonthlyPayments / (stats.totalMonthlyPayments + stats.totalOutstanding)) * 100)
                : 100}%
            </div>
            <p className="text-xs text-muted-foreground">
              Payment collection rate
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
              Have outstanding amounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unapplied Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(unappliedStats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {unappliedStats.totalCount} payment{unappliedStats.totalCount !== 1 ? 's' : ''} across {unappliedStats.customersCount} customer{unappliedStats.customersCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Tabs */}
      <PaymentTabs
        initialPayments={paymentsResult.payments}
        initialTotal={paymentsResult.total}
        searchParams={searchParams}
      />
    </div>
  )
}