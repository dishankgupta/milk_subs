import { Suspense } from 'react'

import { DeliveryReportsInterface } from './delivery-reports-interface'

export default function DeliveryReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Route Delivery Reports</h1>
        <p className="text-gray-600">
          Generate delivery lists for specific routes and time slots
        </p>
      </div>

      <Suspense fallback={<div>Loading delivery reports...</div>}>
        <DeliveryReportsInterface />
      </Suspense>
    </div>
  )
}