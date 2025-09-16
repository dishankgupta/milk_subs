"use client"

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BulkSalesForm } from './bulk-sales-form'

export default function BulkSalesPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard/sales')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/sales">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Bulk Sales</h1>
          <p className="text-gray-600">
            Record multiple sales transactions efficiently
          </p>
        </div>
      </div>

      {/* Bulk Sales Form */}
      <BulkSalesForm onSuccess={handleSuccess} />
    </div>
  )
}