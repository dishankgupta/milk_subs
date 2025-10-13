'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { BulkPaymentForm } from './bulk-payment-form'

export default function BulkPaymentsPage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard/payments')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/payments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Bulk Payments</h1>
          <p className="text-gray-600">
            Record multiple customer payments with allocation support
          </p>
        </div>
      </div>

      {/* Bulk Payment Form */}
      <BulkPaymentForm onSuccess={handleSuccess} />
    </div>
  )
}
