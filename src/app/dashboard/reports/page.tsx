import { Suspense } from 'react'
import Link from 'next/link'
import { FileText, Truck, CreditCard, AlertCircle, BarChart } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProductionSummaryReport } from './production-summary-report'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-gray-600">
          View production summaries and delivery reports
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Daily Production Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View daily production requirements by product and route
            </p>
            <Suspense fallback={<div>Loading production summary...</div>}>
              <ProductionSummaryReport />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Route Delivery Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Generate delivery lists for each route and time slot
            </p>
            <Button asChild>
              <Link href="/dashboard/reports/delivery">
                View Delivery Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Collection Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View payment collection summaries and outstanding amounts
            </p>
            <Button asChild>
              <Link href="/dashboard/reports/payments">
                View Payment Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Outstanding Amounts Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Track customers with outstanding payment amounts
            </p>
            <Button asChild>
              <Link href="/dashboard/reports/outstanding">
                View Outstanding Report
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              Delivery Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Analyze delivery completion rates and quantity variance
            </p>
            <Button asChild>
              <Link href="/dashboard/reports/delivery-performance">
                View Performance Report
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}