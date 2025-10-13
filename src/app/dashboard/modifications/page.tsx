import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { ModificationsTable } from './modifications-table'

export default function ModificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modifications</h1>
          <p className="text-gray-600">
            Manage temporary subscription changes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/modifications/bulk">
              <Plus className="h-4 w-4 mr-2" />
              Bulk Add
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/modifications/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Modification
            </Link>
          </Button>
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<div>Loading modifications...</div>}>
          <ModificationsTable />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}