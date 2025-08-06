import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, BarChart3, Truck } from "lucide-react"
import Link from "next/link"
import { OrdersList } from "@/components/orders/OrdersList"
import { OrdersStats } from "@/components/orders/OrdersStats"

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Orders</h1>
          <p className="text-muted-foreground">
            Generate and manage daily orders from subscriptions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/orders/generate">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Orders
            </Button>
          </Link>
          <Link href="/dashboard/deliveries">
            <Button variant="outline">
              <Truck className="mr-2 h-4 w-4" />
              Deliveries
            </Button>
          </Link>
          <Link href="/dashboard/reports">
            <Button variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<OrdersStatsSkeleton />}>
          <OrdersStats />
        </Suspense>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Orders Management
          </CardTitle>
          <CardDescription>
            View, search, and manage daily orders by date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<OrdersListSkeleton />}>
            <OrdersList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function OrdersStatsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-16 bg-muted animate-pulse rounded mb-1" />
            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ))}
    </>
  )
}

function OrdersListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        <div className="ml-auto h-10 w-20 bg-muted animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}