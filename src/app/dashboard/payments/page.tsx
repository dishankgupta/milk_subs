import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, CreditCard, AlertCircle, TrendingUp, Users } from "lucide-react"
import { getPayments, getPaymentStats } from "@/lib/actions/payments"
import { formatCurrency } from "@/lib/utils"
import PaymentsTable from "./payments-table"

export default async function PaymentsPage(props: { 
  searchParams: Promise<{ 
    search?: string
    customer_id?: string
    payment_method?: string
    page?: string 
  }> 
}) {
  const searchParams = await props.searchParams
  
  const [paymentsResult, stats] = await Promise.all([
    getPayments({
      search: searchParams.search,
      customer_id: searchParams.customer_id,
      payment_method: searchParams.payment_method,
      page: searchParams.page ? parseInt(searchParams.page) : 1,
    }),
    getPaymentStats()
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
        <Link href="/dashboard/payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        </Link>
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
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            Recent payments and transactions from customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading payments...</div>}>
            <PaymentsTable 
              initialPayments={paymentsResult.payments}
              initialTotal={paymentsResult.total}
              searchParams={searchParams}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}