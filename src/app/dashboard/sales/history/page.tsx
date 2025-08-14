import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getSales } from '@/lib/actions/sales'
import { SalesHistoryTable } from './sales-history-table'

export default async function SalesHistoryPage() {
  // Load all sales for client-side filtering and sorting
  // This provides better user experience with instant search
  const { sales } = await getSales({ limit: 1000 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/sales/reports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
          <p className="text-muted-foreground">
            Complete manual sales transaction history
          </p>
        </div>
      </div>

      {/* Sales Table with Built-in Search and Sorting */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesHistoryTable sales={sales} />
        </CardContent>
      </Card>
    </div>
  )
}