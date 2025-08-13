import Link from 'next/link'
import { ArrowLeft, Filter, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getSales } from '@/lib/actions/sales'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { SalesHistoryClient } from './sales-history-client'

export default async function SalesHistoryPage(props: {
  searchParams: Promise<{
    search?: string
    customer_id?: string
    product_id?: string
    sale_type?: 'Cash' | 'Credit'
    payment_status?: 'Completed' | 'Pending' | 'Billed'
    page?: string
  }>
}) {
  const searchParams = await props.searchParams
  
  // Convert page from string to number
  const processedParams = {
    ...searchParams,
    page: searchParams.page ? parseInt(searchParams.page, 10) : undefined
  }
  
  const { sales, totalCount, totalPages, currentPage } = await getSales(processedParams)

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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Input 
                placeholder="Search sales..." 
                defaultValue={searchParams.search}
                className="max-w-sm"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sales Transactions ({totalCount})</CardTitle>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SalesHistoryClient sales={sales} />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Link 
              key={page}
              href={`/dashboard/sales/history?${new URLSearchParams({
                ...searchParams,
                page: page.toString()
              }).toString()}`}
            >
              <Button 
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
              >
                {page}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}