import { Suspense } from 'react'
import Link from 'next/link'
import { Plus, TrendingUp, CreditCard, DollarSign, BarChart3, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SalesStats } from './sales-stats'
import { RecentSales } from './recent-sales'

export default function SalesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Management</h1>
          <p className="text-gray-600">
            Record and manage manual sales transactions
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/sales/new">
            <Plus className="h-4 w-4 mr-2" />
            Record New Sale
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<div>Loading statistics...</div>}>
        <SalesStats />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading recent sales...</div>}>
              <RecentSales />
            </Suspense>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full justify-start">
              <Link href="/dashboard/sales/new">
                <Plus className="h-4 w-4 mr-2" />
                Record Cash Sale
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/sales/new?type=credit">
                <CreditCard className="h-4 w-4 mr-2" />
                Record Credit Sale
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/sales/reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Sales Reports
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/dashboard/invoices">
                <FileText className="h-4 w-4 mr-2" />
                Generate Invoices
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart - Future implementation */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Sales trends chart will be implemented in future updates.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}