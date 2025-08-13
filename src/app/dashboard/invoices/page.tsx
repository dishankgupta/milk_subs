import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BulkInvoiceGenerator } from "@/components/invoices/bulk-invoice-generator"
import { getInvoiceStats } from "@/lib/actions/invoices"
import { formatCurrency } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Invoice Generation - PureDairy",
  description: "Generate individual and bulk invoices for customers",
}

export default async function InvoicesPage() {
  const stats = await getInvoiceStats()
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Invoice Generation</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invoices Generated This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisMonthCount}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoice Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInvoiceValue)}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoicesCount}</div>
            <p className="text-xs text-muted-foreground">
              Customers with outstanding
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Invoice Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.avgInvoiceValue)}</div>
            <p className="text-xs text-muted-foreground">
              Per invoice
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Invoice Generation</CardTitle>
            <CardDescription>
              Generate invoices for multiple customers at once with professional PDF layouts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkInvoiceGenerator />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}