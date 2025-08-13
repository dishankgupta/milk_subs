import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OutstandingReport } from '@/components/reports/outstanding-report'

export default function OutstandingReportPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/reports">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Comprehensive Outstanding Report</h1>
          <p className="text-muted-foreground">
            Detailed outstanding analysis with subscription, sales, and payment breakdown
          </p>
        </div>
      </div>

      {/* Outstanding Report Component */}
      <OutstandingReport />
    </div>
  )
}