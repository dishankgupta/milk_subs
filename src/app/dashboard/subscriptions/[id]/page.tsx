import { notFound } from "next/navigation"
import Link from "next/link"
import { getSubscription } from "@/lib/actions/subscriptions"
import { calculatePatternDay } from "@/lib/subscription-utils"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Calendar, Calculator, User, Package } from "lucide-react"

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const subscription = await getSubscription(id)

  if (!subscription) {
    notFound()
  }

  // Generate pattern preview for next 14 days
  const generatePatternPreview = () => {
    if (subscription.subscription_type !== "Pattern" || !subscription.pattern_start_date) {
      return []
    }

    const preview = []
    const startDate = new Date(subscription.pattern_start_date)
    const today = new Date()
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const patternDay = calculatePatternDay(startDate, date)
      const quantity = patternDay === 1 ? subscription.pattern_day1_quantity : subscription.pattern_day2_quantity
      
      preview.push({
        date: date.toLocaleDateString(),
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        patternDay,
        quantity,
        isToday: date.toDateString() === today.toDateString()
      })
    }
    
    return preview
  }

  const patternPreview = generatePatternPreview()

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/subscriptions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Subscription Details</h2>
            <p className="text-muted-foreground">
              {subscription.customer?.billing_name} - {subscription.product?.name}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/subscriptions/${id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Subscription
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Billing Name</label>
              <p className="text-sm">{subscription.customer?.billing_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contact Person</label>
              <p className="text-sm">{subscription.customer?.contact_person}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Address</label>
              <p className="text-sm">{subscription.customer?.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-sm">{subscription.customer?.phone_primary}</p>
              {subscription.customer?.phone_secondary && (
                <p className="text-sm text-muted-foreground">{subscription.customer.phone_secondary}</p>
              )}
            </div>
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Route</label>
                <p className="text-sm">{subscription.customer?.route?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Delivery Time</label>
                <p className="text-sm">{subscription.customer?.delivery_time}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Product</label>
              <p className="text-sm">{subscription.product?.name} ({subscription.product?.code})</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Current Price</label>
              <p className="text-sm">{formatCurrency(subscription.product?.current_price || 0)} per {subscription.product?.unit}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
              <p className="text-sm">{subscription.customer?.payment_method}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Outstanding Amount</label>
              <p className="text-sm text-blue-600">View in Outstanding Section</p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="mt-1">
                  <Badge variant={subscription.subscription_type === "Daily" ? "default" : "secondary"}>
                    {subscription.subscription_type}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={subscription.is_active ? "default" : "secondary"}>
                    {subscription.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Created</label>
                <p className="text-sm">{new Date(subscription.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm">{new Date(subscription.updated_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Daily Subscription Details */}
            {subscription.subscription_type === "Daily" && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Daily Quantity</label>
                <p className="text-lg font-semibold">{subscription.daily_quantity}L per day</p>
                <p className="text-sm text-muted-foreground">
                  Daily cost: {formatCurrency((subscription.daily_quantity || 0) * (subscription.product?.current_price || 0))}
                </p>
              </div>
            )}

            {/* Pattern Subscription Details */}
            {subscription.subscription_type === "Pattern" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Day 1 Quantity</label>
                    <p className="text-lg font-semibold">{subscription.pattern_day1_quantity}L</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Day 2 Quantity</label>
                    <p className="text-lg font-semibold">{subscription.pattern_day2_quantity}L</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Pattern Started</label>
                    <p className="text-sm">{subscription.pattern_start_date ? new Date(subscription.pattern_start_date).toLocaleDateString() : 'Not set'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Average Daily Cost</label>
                  <p className="text-sm">
                    {formatCurrency(((subscription.pattern_day1_quantity || 0) + (subscription.pattern_day2_quantity || 0)) / 2 * (subscription.product?.current_price || 0))}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pattern Preview */}
        {subscription.subscription_type === "Pattern" && patternPreview.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Pattern Preview (Next 14 Days)
              </CardTitle>
              <CardDescription>
                Shows the 2-day pattern cycle for the upcoming two weeks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
                {patternPreview.map((day, index) => (
                  <div 
                    key={index} 
                    className={`text-center p-3 border rounded-lg ${
                      day.isToday ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">{day.day}</div>
                    <div className="text-sm font-medium">{day.date}</div>
                    {day.isToday && (
                      <div className="text-xs text-primary font-medium">Today</div>
                    )}
                    <Badge 
                      variant={day.patternDay === 1 ? "default" : "secondary"}
                      className="mt-1 text-xs"
                    >
                      Day {day.patternDay}
                    </Badge>
                    <div className="text-lg font-bold mt-1">{day.quantity}L</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency((day.quantity || 0) * (subscription.product?.current_price || 0))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}