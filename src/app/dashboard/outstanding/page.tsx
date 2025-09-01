import { Suspense } from 'react'
import Link from 'next/link'
import { OutstandingDashboard } from '@/components/outstanding/OutstandingDashboard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'

export default function OutstandingPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outstanding Amounts</h1>
          <p className="text-gray-600">
            Track and manage customer outstanding amounts based on unpaid invoices
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/outstanding/reports">
            <FileText className="h-4 w-4 mr-2" />
            Detailed Reports
          </Link>
        </Button>
      </div>

      <Suspense 
        fallback={
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <OutstandingDashboard />
      </Suspense>
    </div>
  )
}