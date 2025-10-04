'use client'

import { useMemo } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileEdit, SkipForward, TrendingUp, TrendingDown, FileText, Calendar } from 'lucide-react'
import type { BulkModificationFormData } from '@/lib/validations'
import { formatDateIST } from '@/lib/date-utils'

interface ModificationSummaryProps {
  form: UseFormReturn<BulkModificationFormData>
}

export function ModificationSummary({ form }: ModificationSummaryProps) {
  const modifications = useWatch({
    control: form.control,
    name: 'modifications'
  })

  const summary = useMemo(() => {
    let validModifications = 0
    let skipCount = 0
    let increaseCount = 0
    let decreaseCount = 0
    let noteCount = 0
    const uniqueCustomers = new Set<string>()
    const uniqueProducts = new Set<string>()
    let earliestDate: Date | null = null
    let latestDate: Date | null = null

    modifications.forEach((modification) => {
      // Check if modification is valid (has customer, product, and type)
      const isValid = modification.customer_id && modification.product_id && modification.modification_type

      if (isValid) {
        validModifications++
        uniqueCustomers.add(modification.customer_id)
        uniqueProducts.add(modification.product_id)

        // Count by type
        switch (modification.modification_type) {
          case 'Skip':
            skipCount++
            break
          case 'Increase':
            increaseCount++
            break
          case 'Decrease':
            decreaseCount++
            break
          case 'Add Note':
            noteCount++
            break
        }

        // Track date range
        if (modification.start_date) {
          if (!earliestDate || modification.start_date < earliestDate) {
            earliestDate = modification.start_date
          }
        }
        if (modification.end_date) {
          if (!latestDate || modification.end_date > latestDate) {
            latestDate = modification.end_date
          }
        }
      }
    })

    return {
      validModifications,
      totalModifications: modifications.length,
      skipCount,
      increaseCount,
      decreaseCount,
      noteCount,
      uniqueCustomers: uniqueCustomers.size,
      uniqueProducts: uniqueProducts.size,
      earliestDate,
      latestDate
    }
  }, [modifications])

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Modifications Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Modifications</CardTitle>
          <FileEdit className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.validModifications} / {summary.totalModifications}</div>
          <p className="text-xs text-muted-foreground">
            {summary.uniqueCustomers} customer{summary.uniqueCustomers !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Modification Types Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">By Type</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-orange-600">
                <SkipForward className="h-3 w-3" />
                Skip:
              </span>
              <span className="font-medium">{summary.skipCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3 w-3" />
                Increase:
              </span>
              <span className="font-medium">{summary.increaseCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-3 w-3" />
                Decrease:
              </span>
              <span className="font-medium">{summary.decreaseCount}</span>
            </div>
            {summary.noteCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Note:</span>
                <span className="font-medium">{summary.noteCount}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Products</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.uniqueProducts}</div>
          <p className="text-xs text-muted-foreground">
            Unique products affected
          </p>
        </CardContent>
      </Card>

      {/* Date Range Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Date Range</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {summary.earliestDate && summary.latestDate ? (
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-gray-600">From:</span>{' '}
                <span className="font-medium">{formatDateIST(summary.earliestDate)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">To:</span>{' '}
                <span className="font-medium">{formatDateIST(summary.latestDate)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No dates selected</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
