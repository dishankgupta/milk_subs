import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getUndeliveredOrders } from "@/lib/actions/deliveries"
import { BulkDeliveryForm } from "./bulk-delivery-form"
import { Card, CardContent } from "@/components/ui/card"
import { Package } from "lucide-react"

interface BulkDeliveryPageProps {
  searchParams?: Promise<{
    order_ids?: string
  }>
}

async function BulkDeliveryContent({ searchParams }: BulkDeliveryPageProps) {
  const resolvedSearchParams = await searchParams
  
  if (!resolvedSearchParams?.order_ids) {
    notFound()
  }
  
  const orderIds = resolvedSearchParams.order_ids.split(',').filter(Boolean)
  
  if (orderIds.length === 0) {
    notFound()
  }
  
  // Get all undelivered orders and filter to the selected ones
  const allOrders = await getUndeliveredOrders()
  const selectedOrders = allOrders.filter(order => orderIds.includes(order.id))
  
  if (selectedOrders.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Orders Not Available</h3>
            <p className="mb-4">
              The selected orders are no longer available for delivery or have already been delivered.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (selectedOrders.length !== orderIds.length) {
    // Some orders were not found
    console.warn(`Expected ${orderIds.length} orders, found ${selectedOrders.length}`)
  }
  
  return <BulkDeliveryForm orders={selectedOrders} />
}

export default function BulkDeliveryPage(props: BulkDeliveryPageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bulk Delivery Confirmation</h1>
        <p className="text-muted-foreground mt-2">
          Confirm delivery details for multiple orders at once
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        }
      >
        <BulkDeliveryContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  )
}