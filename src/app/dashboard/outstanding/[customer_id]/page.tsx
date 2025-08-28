import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { CustomerOutstandingDetail } from '@/components/outstanding/CustomerOutstandingDetail'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { getCustomerOutstanding } from '@/lib/actions/outstanding'
import { getCustomerPayments } from '@/lib/actions/payments'

interface CustomerOutstandingPageProps {
  params: Promise<{
    customer_id: string
  }>
}

export default async function CustomerOutstandingPage({ params }: CustomerOutstandingPageProps) {
  const resolvedParams = await params
  
  if (!resolvedParams.customer_id) {
    notFound()
  }

  // Pre-fetch data on the server for better caching and performance
  const [outstandingData, paymentsData] = await Promise.all([
    getCustomerOutstanding(resolvedParams.customer_id),
    getCustomerPayments(resolvedParams.customer_id, 5) // Limit to 5 recent payments
  ])

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        <Suspense 
          fallback={
            <div className="space-y-6">
              {/* Customer header skeleton */}
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Outstanding summary skeleton */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Tables skeleton */}
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          }
        >
          <CustomerOutstandingDetail 
            customerId={resolvedParams.customer_id}
            initialData={outstandingData}
            initialPayments={paymentsData}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}