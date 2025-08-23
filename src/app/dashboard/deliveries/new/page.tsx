import { Suspense } from "react"
import { getUndeliveredOrders } from "@/lib/actions/deliveries"
import { DeliveryForm } from "../delivery-form"
import { BulkOrderSelection } from "@/components/deliveries/bulk-order-selection"
import { OrderDateFilter } from "@/components/deliveries/order-date-filter"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { formatDateToIST } from "@/lib/utils"

interface NewDeliveryPageProps {
  searchParams?: Promise<{
    order_id?: string
    date?: string
  }>
}

async function NewDeliveryContent({ searchParams }: NewDeliveryPageProps) {
  const resolvedSearchParams = await searchParams
  // If order_id is provided, we need to get that specific order
  // Otherwise, show available undelivered orders
  
  if (resolvedSearchParams?.order_id) {
    // Get the specific order for delivery confirmation
    const orders = await getUndeliveredOrders()
    const order = orders.find(o => o.id === resolvedSearchParams.order_id)
    
    if (!order) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
              <h3 className="text-lg font-semibold mb-2">Order Not Found</h3>
              <p className="mb-4">The specified order was not found or has already been delivered.</p>
              <Link href="/dashboard/deliveries/new">
                <Button>View Available Orders</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )
    }

    return <DeliveryForm dailyOrder={order} />
  }

  // Show list of undelivered orders
  const orders = await getUndeliveredOrders(resolvedSearchParams?.date)

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Available</h3>
            <p className="mb-4">
              No undelivered orders found
              {resolvedSearchParams?.date && ` for ${formatDateToIST(resolvedSearchParams.date)}`}.
            </p>
            <div className="flex justify-center gap-2">
              <Link href="/dashboard/orders/generate">
                <Button>Generate Orders</Button>
              </Link>
              {resolvedSearchParams?.date && (
                <Link href="/dashboard/deliveries/new">
                  <Button variant="outline">View All Orders</Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Select Orders for Delivery</CardTitle>
          <CardDescription>
            Choose orders to confirm delivery details individually or in bulk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <OrderDateFilter defaultValue={resolvedSearchParams?.date} />
            {resolvedSearchParams?.date && (
              <Link href="/dashboard/deliveries/new">
                <Button variant="ghost" size="sm">
                  Show All Orders
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Order Selection */}
      <BulkOrderSelection orders={orders} />
    </div>
  )
}

export default function NewDeliveryPage(props: NewDeliveryPageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Confirm Deliveries</h1>
        <p className="text-muted-foreground mt-2">
          Select orders and confirm delivery details individually or in bulk
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-96 bg-muted rounded-lg animate-pulse" />
          </div>
        }
      >
        <NewDeliveryContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  )
}