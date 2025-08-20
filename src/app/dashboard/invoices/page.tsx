"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getInvoiceStats } from "@/lib/actions/invoices"
import { InvoiceTabsContainer } from "@/components/invoices/invoice-tabs-container"

interface InvoiceStats {
  readyForGeneration: number
  generatedToday: number
  invoicesThisMonth: number
  customersWithOutstandingCount: number
}

export default function InvoicesPage() {
  const [stats, setStats] = useState<InvoiceStats>({
    readyForGeneration: 0,
    generatedToday: 0,
    invoicesThisMonth: 0,
    customersWithOutstandingCount: 0
  })
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    try {
      const newStats = await getInvoiceStats()
      setStats(newStats)
    } catch (error) {
      console.error("Error loading invoice stats:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const refreshStats = () => {
    loadStats()
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Invoice Generation</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ready for Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.readyForGeneration}
            </div>
            <p className="text-xs text-muted-foreground">
              Customers eligible for invoicing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Generated Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.generatedToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Invoices created today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Invoices This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.invoicesThisMonth}
            </div>
            <p className="text-xs text-muted-foreground">
              Month-to-date total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Customers with Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.customersWithOutstandingCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Need collection follow-up
            </p>
          </CardContent>
        </Card>
      </div>

      <InvoiceTabsContainer onStatsRefresh={refreshStats} />
    </div>
  )
}