import { getCustomer } from "@/lib/actions/customers"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Phone, MapPin, Calendar, CreditCard } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params
  const customer = await getCustomer(id)

  if (!customer) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/customers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.billing_name}</h1>
            <p className="text-muted-foreground">Customer Details</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/customers/${customer.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Customer
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Billing Name</p>
              <p className="text-lg font-semibold">{customer.billing_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
              <p>{customer.contact_person}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                {customer.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Primary Phone</p>
              <p className="font-medium">{customer.phone_primary}</p>
            </div>
            {customer.phone_secondary && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Secondary Phone</p>
                <p>{customer.phone_secondary}</p>
              </div>
            )}
            {customer.phone_tertiary && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tertiary Phone</p>
                <p>{customer.phone_tertiary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{customer.address}</p>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Route</p>
              <Badge variant="outline">{customer.route?.name || "No Route"}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Delivery Time</p>
              <Badge variant={customer.delivery_time === "Morning" ? "default" : "secondary"}>
                {customer.delivery_time}
              </Badge>
            </div>
            {customer.route?.personnel_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Route Personnel</p>
                <p>{customer.route.personnel_name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Payment Method</p>
              <Badge variant="outline">{customer.payment_method}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Billing Cycle Day</p>
              <p>{customer.billing_cycle_day}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding Amount</p>
              <p className={`text-lg font-semibold ${customer.outstanding_amount > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(customer.outstanding_amount)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer Since</p>
              <p>{new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p>{new Date(customer.updated_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Future: Subscription and Order History Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>Customer&apos;s current dairy subscriptions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Subscription management coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest delivery orders for this customer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Order history coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}