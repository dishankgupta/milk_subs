import { Suspense } from "react"
import { format, subDays } from "date-fns"
import { TrendingUp, TrendingDown, Package, CheckCircle, AlertTriangle, Users, BarChart } from "lucide-react"

import { getDeliveryPerformanceReport, type DeliveryPerformanceReport } from "@/lib/actions/reports"
import { formatCurrency } from "@/lib/utils"
import { formatDateTimeIST, formatWithIST } from "@/lib/date-utils"
import { PrintHeader } from "@/components/reports/PrintHeader"
import { PrintButton } from "@/components/reports/PrintButton"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface DeliveryPerformancePageProps {
  searchParams?: Promise<{
    startDate?: string
    endDate?: string
  }>
}

async function DeliveryPerformanceContent({ searchParams }: DeliveryPerformancePageProps) {
  const resolvedSearchParams = await searchParams
  const today = new Date()
  const defaultStartDate = format(subDays(today, 30), 'yyyy-MM-dd')
  const defaultEndDate = format(today, 'yyyy-MM-dd')

  const startDate = resolvedSearchParams?.startDate || defaultStartDate
  const endDate = resolvedSearchParams?.endDate || defaultEndDate

  const result = await getDeliveryPerformanceReport(startDate, endDate)

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Report</h3>
            <p>{result.error || 'Failed to load delivery performance report'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const report = result.data

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <PrintHeader 
        title="Delivery Performance Report"
        subtitle="Delivery Completion Analysis"
        date={formatDateTimeIST(new Date())}
        additionalInfo={[
          `Period: ${formatWithIST(new Date(startDate), 'MMM dd')} - ${formatWithIST(new Date(endDate), 'MMM dd')}`,
          `Completion Rate: ${report.summary.completionRate}%`,
          `Total Orders: ${report.summary.totalOrders}`,
          `Quantity Variance: ${report.summary.quantityVariance >= 0 ? '+' : ''}${report.summary.quantityVariance}L`
        ]}
      />
      
      {/* Date Range Filter - Note: Server component using native inputs for form submission */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Select the period for delivery performance analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/dashboard/reports/delivery-performance" method="GET" className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="startDate" className="text-sm font-medium mb-1 block">Start Date (YYYY-MM-DD)</label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={startDate}
                required
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="text-sm font-medium mb-1 block">End Date (YYYY-MM-DD)</label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={endDate}
                required
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Generate Report</Button>
              <PrintButton
                printUrl={`/api/print/delivery-performance?start_date=${startDate}&end_date=${endDate}`}
                variant="outline"
              >
                Print Report
              </PrintButton>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:break-inside-avoid print:mb-4">
        <Card className="print:break-inside-avoid">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 print:pb-1">
            <CardTitle className="text-sm font-medium print:text-xs">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground print:hidden" />
          </CardHeader>
          <CardContent className="print:pt-1">
            <div className="text-2xl font-bold print:text-lg print:font-bold">{report.summary.completionRate}%</div>
            <p className="text-xs text-muted-foreground print:text-xs print:text-black">
              {report.summary.deliveredOrders} of {report.summary.totalOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quantity Variance</CardTitle>
            {report.summary.quantityVariance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.summary.quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {report.summary.quantityVariance >= 0 ? '+' : ''}{report.summary.quantityVariance}L
            </div>
            <p className="text-xs text-muted-foreground">
              Actual: {report.summary.totalActualQuantity}L vs Planned: {report.summary.totalPlannedQuantity}L
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Variance</CardTitle>
            {report.summary.valueVariance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.summary.valueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {report.summary.valueVariance >= 0 ? '+' : ''}{formatCurrency(report.summary.valueVariance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Actual: {formatCurrency(report.summary.totalActualValue)} vs Planned: {formatCurrency(report.summary.totalPlannedValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Period: {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:break-inside-avoid print:mb-4">
        {/* Daily Breakdown */}
        <Card className="print:break-inside-avoid print:mb-4">
          <CardHeader className="print:pb-2">
            <CardTitle className="flex items-center gap-2 print:text-lg print:font-bold">
              <BarChart className="h-5 w-5 print:hidden" />
              Daily Performance
            </CardTitle>
            <CardDescription className="print:text-sm print:text-black">Day-by-day delivery completion and variance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {report.dailyBreakdown.map((day) => (
                <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{format(new Date(day.date), 'MMM dd, yyyy')}</div>
                    <div className="text-sm text-muted-foreground">
                      {day.delivered}/{day.orders} orders ({day.completionRate}%)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{day.actualQuantity}L</div>
                    <div className={`text-sm ${day.quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {day.quantityVariance >= 0 ? '+' : ''}{day.quantityVariance}L
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customer Performance
            </CardTitle>
            <CardDescription>Top customers by delivery volume and variance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {report.customerPerformance.slice(0, 10).map((customer) => (
                <div key={customer.customerName} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{customer.customerName}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.deliveredOrders}/{customer.totalOrders} orders
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={customer.completionRate >= 90 ? "default" : customer.completionRate >= 70 ? "secondary" : "destructive"}>
                      {customer.completionRate}%
                    </Badge>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${customer.avgQuantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {customer.avgQuantityVariance >= 0 ? '+' : ''}{customer.avgQuantityVariance}L
                      </div>
                      <div className={`text-xs ${customer.totalValueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {customer.totalValueVariance >= 0 ? '+' : ''}{formatCurrency(customer.totalValueVariance)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Performance
          </CardTitle>
          <CardDescription>Delivery performance analysis by product type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.productPerformance.map((product) => (
              <div key={product.productName} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{product.productName}</h4>
                  <Badge variant={product.deliveredOrders >= product.totalOrders * 0.9 ? "default" : "secondary"}>
                    {Math.round((product.deliveredOrders / product.totalOrders) * 100)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Orders</div>
                    <div className="font-medium">{product.totalOrders}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Delivered</div>
                    <div className="font-medium">{product.deliveredOrders}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Avg Variance</div>
                    <div className={`font-medium ${product.avgQuantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.avgQuantityVariance >= 0 ? '+' : ''}{product.avgQuantityVariance}L
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Variance</div>
                    <div className={`font-medium ${product.totalQuantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.totalQuantityVariance >= 0 ? '+' : ''}{product.totalQuantityVariance}L
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DeliveryPerformancePage(props: DeliveryPerformancePageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Performance Report</h1>
        <p className="text-muted-foreground mt-2">
          Analyze delivery completion rates, quantity variance, and customer performance
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-32 bg-muted rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="h-8 bg-muted rounded w-16 mb-2" />
                    <div className="h-4 bg-muted rounded w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-96 bg-muted rounded-lg animate-pulse" />
              <div className="h-96 bg-muted rounded-lg animate-pulse" />
            </div>
          </div>
        }
      >
        <DeliveryPerformanceContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  )
}