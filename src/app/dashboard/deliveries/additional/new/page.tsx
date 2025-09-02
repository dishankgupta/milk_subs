import { Metadata } from "next"
import { Suspense } from "react"
import { getProducts } from "@/lib/actions/products"
import { getCustomers, getRoutes } from "@/lib/actions/customers"
import { AdditionalDeliveryForm } from "./additional-delivery-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Package2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Record Additional Delivery - Milk Subs",
  description: "Record additional products delivered to customers"
}

export default async function NewAdditionalDeliveryPage() {
  // Load all necessary data in parallel
  const [products, customersResponse, routes] = await Promise.all([
    getProducts(),
    getCustomers(),
    getRoutes()
  ])
  
  const customers = customersResponse.customers

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/deliveries" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Deliveries
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Record Additional Delivery</h1>
            <p className="text-muted-foreground">
              Create a standalone delivery for additional products not part of subscription orders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-orange-600">
          <Package2 className="h-5 w-5" />
          <span className="font-medium">Additional Items</span>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-orange-800">
            ℹ️ About Additional Deliveries
          </CardTitle>
          <CardDescription className="text-orange-700">
            Use this form to record extra products delivered to customers that are not part of their regular subscription orders. 
            These deliveries are tracked separately and will appear in customer invoices and delivery reports.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Form */}
      <Suspense fallback={
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              <span className="ml-2">Loading form...</span>
            </div>
          </CardContent>
        </Card>
      }>
        <AdditionalDeliveryForm 
          products={products}
          customers={customers}
          routes={routes}
        />
      </Suspense>
    </div>
  )
}