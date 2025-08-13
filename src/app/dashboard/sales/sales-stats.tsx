import { DollarSign, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { getSalesStats } from '@/lib/actions/sales'

export async function SalesStats() {
  try {
    const stats = await getSalesStats()

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cash Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cash Sales
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCashAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCashSales} transactions
            </p>
          </CardContent>
        </Card>

        {/* Total Credit Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Credit Sales
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCreditAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCreditSales} transactions
            </p>
          </CardContent>
        </Card>

        {/* Pending Credit Amount */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Credit
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.pendingCreditAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unbilled sales
            </p>
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sales
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalCashAmount + stats.totalCreditAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCashSales + stats.totalCreditSales} total transactions
            </p>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Loading data...</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
}