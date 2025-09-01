import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { formatDateToIST, formatDateTimeToIST } from "@/lib/utils"
import { ArrowLeft, Edit, Package, User, MapPin, Clock, Calendar, FileText } from "lucide-react"

import { getDeliveryById } from "@/lib/actions/deliveries"
import { formatCurrency } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DeliveryDetailPageProps {
  params: Promise<{
    id: string
  }>
}

async function DeliveryDetailContent({ params }: DeliveryDetailPageProps) {
  try {
    const { id } = await params
    const delivery = await getDeliveryById(id)
    const order = delivery.daily_order
    
    const quantityVariance = (delivery.actual_quantity || 0) - order.planned_quantity
    const amountVariance = quantityVariance * order.unit_price

    return (
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/deliveries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Deliveries
            </Button>
          </Link>

          <Link href={`/dashboard/deliveries/${delivery.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Delivery
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium text-lg">{order.customer.billing_name}</div>
                {order.customer.contact_person && (
                  <div className="text-muted-foreground">{order.customer.contact_person}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Address</div>
                  <div className="text-muted-foreground">{order.customer.address}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Primary Phone</div>
                  <div className="text-muted-foreground">{order.customer.phone_primary}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Route</div>
                  <div className="text-muted-foreground">{order.route.name}</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Delivery Time</div>
                  <div className="text-muted-foreground">{order.delivery_time}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="font-medium text-lg">{order.product.name}</div>
                <div className="text-muted-foreground">Order #{order.id.slice(0, 8)}</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Order Date</div>
                  <div className="text-muted-foreground">
                    {formatDateToIST(new Date(order.order_date))}
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Status</div>
                  <Badge variant="default">Delivered</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Unit Price</div>
                  <div className="text-muted-foreground">{formatCurrency(order.unit_price)}/L</div>
                </div>
                <div>
                  <div className="font-medium mb-1">Planned Amount</div>
                  <div className="text-muted-foreground">{formatCurrency(order.total_amount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium mb-1">Delivered At</div>
                  <div className="text-muted-foreground">
                    {delivery.delivered_at 
                      ? formatDateTimeToIST(new Date(delivery.delivered_at))
                      : "Not recorded"
                    }
                  </div>
                </div>
                <div>
                  <div className="font-medium mb-1">Delivery Person</div>
                  <div className="text-muted-foreground">
                    {delivery.delivery_person || "Not specified"}
                  </div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">Created</div>
                <div className="text-muted-foreground text-sm">
                  {formatDateTimeToIST(new Date(delivery.created_at))}
                </div>
              </div>

              {delivery.updated_at !== delivery.created_at && (
                <div>
                  <div className="font-medium mb-1">Last Updated</div>
                  <div className="text-muted-foreground text-sm">
                    {formatDateTimeToIST(new Date(delivery.updated_at))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quantity & Amount Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Quantity Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{order.planned_quantity}L</div>
                  <div className="text-sm text-muted-foreground">Planned</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(order.total_amount)}
                  </div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold">{delivery.actual_quantity || 0}L</div>
                  <div className="text-sm text-muted-foreground">Actual</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency((delivery.actual_quantity || 0) * order.unit_price)}
                  </div>
                </div>
                
                <div>
                  <div className={`text-2xl font-bold ${quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {quantityVariance > 0 ? '+' : ''}{quantityVariance}L
                  </div>
                  <div className="text-sm text-muted-foreground">Variance</div>
                  <div className={`text-sm ${amountVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {amountVariance > 0 ? '+' : ''}{formatCurrency(amountVariance)}
                  </div>
                </div>
              </div>

              {quantityVariance !== 0 && (
                <div className="pt-4 border-t">
                  <Badge 
                    variant={quantityVariance > 0 ? "default" : "destructive"} 
                    className="w-full justify-center py-2"
                  >
                    {quantityVariance > 0 ? "Over-delivery" : "Under-delivery"} of {Math.abs(quantityVariance)}L
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delivery Notes */}
        {delivery.delivery_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Delivery Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground whitespace-pre-wrap">
                {delivery.delivery_notes}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error loading delivery:', error)
    notFound()
  }
}

export default function DeliveryDetailPage({ params }: DeliveryDetailPageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Details</h1>
        <p className="text-muted-foreground mt-2">
          View complete delivery information and variance analysis
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        }
      >
        <DeliveryDetailContent params={params} />
      </Suspense>
    </div>
  )
}