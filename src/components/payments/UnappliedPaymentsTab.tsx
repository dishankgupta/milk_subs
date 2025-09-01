'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { CustomerSelectionForAllocation } from './CustomerSelectionForAllocation'
import { getUnappliedPaymentStats, type UnappliedPaymentStats } from '@/lib/actions/outstanding'

interface UnappliedPaymentsTabProps {
  onAllocationComplete?: () => void
}

export function UnappliedPaymentsTab({ onAllocationComplete }: UnappliedPaymentsTabProps) {
  const [stats, setStats] = useState<UnappliedPaymentStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const statsData = await getUnappliedPaymentStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load unapplied payment stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAllocationComplete = () => {
    loadStats() // Refresh stats after allocation
    onAllocationComplete?.()
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unapplied</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '...' : formatCurrency(stats?.totalAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : `${stats?.totalCount || 0} unapplied payments`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers Affected</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats?.customersCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Have unapplied credit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Allocation Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : (
                stats?.totalCount === 0 ? (
                  <Badge variant="default" className="text-lg px-3 py-1">All Clear</Badge>
                ) : (
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {stats?.totalCount} Pending
                  </Badge>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading...' : (
                stats?.totalCount === 0 ? 'All payments allocated' : 'Require allocation'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Selection for Allocation */}
      <CustomerSelectionForAllocation onAllocationComplete={handleAllocationComplete} />
    </div>
  )
}