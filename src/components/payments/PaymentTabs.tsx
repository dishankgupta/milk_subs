'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Suspense } from 'react'
import PaymentsTable from '@/app/dashboard/payments/payments-table'
import { UnappliedPaymentsTab } from './UnappliedPaymentsTab'
import type { Payment } from '@/lib/types'

interface PaymentTabsProps {
  initialPayments: Payment[]
  initialTotal: number
  searchParams: {
    search?: string
    customer_id?: string
    payment_method?: string
    page?: string
  }
  onAllocationComplete?: () => void
}

export function PaymentTabs({ 
  initialPayments, 
  initialTotal, 
  searchParams,
  onAllocationComplete 
}: PaymentTabsProps) {
  return (
    <Tabs defaultValue="payments" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="payments">Payment History</TabsTrigger>
        <TabsTrigger value="unapplied">Unapplied Payments</TabsTrigger>
      </TabsList>

      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              Recent payments and transactions from customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading payments...</div>}>
              <PaymentsTable 
                initialPayments={initialPayments}
                initialTotal={initialTotal}
                searchParams={searchParams}
              />
            </Suspense>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="unapplied">
        <UnappliedPaymentsTab onAllocationComplete={onAllocationComplete} />
      </TabsContent>
    </Tabs>
  )
}