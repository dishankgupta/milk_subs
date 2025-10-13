"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BulkModificationForm } from './bulk-modification-form'

export default function BulkModificationsPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard/modifications')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/modifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Bulk Modifications</h1>
          <p className="text-gray-600">
            Create multiple subscription modifications efficiently
          </p>
        </div>
      </div>

      {/* Bulk Modifications Form */}
      <BulkModificationForm onSuccess={handleSuccess} />
    </div>
  )
}
