import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { CustomerOutstandingDetail } from '@/components/outstanding/CustomerOutstandingDetail'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { generateOutstandingReport } from '@/lib/actions/outstanding-reports'
import { getCurrentISTDate } from '@/lib/date-utils'

interface CustomerOutstandingPageProps {
  params: Promise<{
    customer_id: string
  }>
  searchParams: Promise<{
    start_date?: string
    end_date?: string
  }>
}

export default async function CustomerOutstandingPage({ params, searchParams }: CustomerOutstandingPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  if (!resolvedParams.customer_id) {
    notFound()
  }

  // Calculate current month (1st of current month to today) as default
  const today = getCurrentISTDate()
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  // Use search params or default to current month
  const startDate = resolvedSearchParams.start_date
    ? new Date(resolvedSearchParams.start_date)
    : currentMonthStart
  const endDate = resolvedSearchParams.end_date
    ? new Date(resolvedSearchParams.end_date)
    : today

  // Fetch transaction-based outstanding data
  // Note: We need to check if customer exists before generating report
  // If no data is returned, the customer might not exist or has no transactions
  let outstandingData

  try {
    outstandingData = await generateOutstandingReport({
      start_date: startDate,
      end_date: endDate,
      customer_selection: 'selected',
      selected_customer_ids: [resolvedParams.customer_id]
    })
  } catch (error) {
    console.error('Error generating outstanding report:', error)
    notFound()
  }

  // Get customer data (first customer in result)
  const customerData = outstandingData.customers.length > 0 ? outstandingData.customers[0] : null

  if (!customerData) {
    // Customer not found in outstanding report - might not exist
    notFound()
  }

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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
                {[...Array(4)].map((_, i) => (
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
            customerData={customerData}
            startDate={startDate}
            endDate={endDate}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}