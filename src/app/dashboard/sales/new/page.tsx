"use client"

import { useRouter } from 'next/navigation'
import { SalesForm } from '@/components/sales/sales-form'

export default function NewSalePage() {
  const router = useRouter()

  const handleSuccess = () => {
    router.push('/dashboard/sales')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Record New Sale</h1>
        <p className="text-gray-600">
          Record a cash or credit sale transaction
        </p>
      </div>

      <SalesForm onSuccess={handleSuccess} />
    </div>
  )
}