import { getCustomer } from "@/lib/actions/customers"
import { getCustomerSubscriptions } from "@/lib/actions/subscriptions"
import { getCustomerPayments } from "@/lib/actions/payments"
import { getCustomerOutstanding, calculateCustomerOutstandingAmount } from "@/lib/actions/outstanding"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Phone, MapPin, Calendar, CreditCard, Plus, Package, Eye, Receipt, DollarSign } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params
  const [customer, subscriptions, payments, outstandingData] = await Promise.all([
    getCustomer(id),
    getCustomerSubscriptions(id),
    getCustomerPayments(id),
    getCustomerOutstanding(id).catch(() => ({ totalOutstanding: 0, unpaidInvoices: [] }))
  ])

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
              <p className="text-sm font-medium text-muted-foreground">Opening Balance</p>
              <p className={`font-medium ${customer.opening_balance > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                {formatCurrency(customer.opening_balance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Outstanding Amount</p>
              <div className="flex items-center gap-2">
                <p className={`text-lg font-semibold ${outstandingData.totalOutstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(outstandingData.totalOutstanding)}
                </p>
                {outstandingData.unpaidInvoices && outstandingData.unpaidInvoices.length > 0 && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/dashboard/outstanding/${customer.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Link>
                  </Button>
                )}
              </div>
              {outstandingData.unpaidInvoices && outstandingData.unpaidInvoices.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  From {outstandingData.unpaidInvoices.length} unpaid invoice{outstandingData.unpaidInvoices.length !== 1 ? 's' : ''}
                </p>
              )}
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

      {/* Subscriptions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Subscriptions ({subscriptions.length})
              </CardTitle>
              <CardDescription>Customer&apos;s dairy subscriptions</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={`/dashboard/subscriptions/new?customerId=${customer.id}`}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {subscriptions.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No subscriptions yet</p>
                <Button size="sm" variant="outline" className="mt-2" asChild>
                  <Link href={`/dashboard/subscriptions/new?customerId=${customer.id}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add First Subscription
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{subscription.product?.name}</span>
                        <Badge variant={subscription.subscription_type === "Daily" ? "default" : "secondary"} className="text-xs">
                          {subscription.subscription_type}
                        </Badge>
                        <Badge variant={subscription.is_active ? "default" : "secondary"} className="text-xs">
                          {subscription.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.subscription_type === "Daily" 
                          ? `${subscription.daily_quantity}L daily`
                          : `Pattern: Day 1: ${subscription.pattern_day1_quantity}L, Day 2: ${subscription.pattern_day2_quantity}L`
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(subscription.product?.current_price || 0)}/L
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/subscriptions/${subscription.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
                {subscriptions.length > 3 && (
                  <div className="text-center pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/subscriptions?search=${customer.billing_name}`}>
                        View All Subscriptions
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Payment History ({payments.length})
              </CardTitle>
              <CardDescription>Recent payments from this customer</CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href={`/dashboard/payments/new?customerId=${customer.id}`}>
                <Plus className="h-4 w-4 mr-1" />
                Add Payment
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-6">
                <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No payments recorded yet</p>
                <Button size="sm" variant="outline" className="mt-2" asChild>
                  <Link href={`/dashboard/payments/new?customerId=${customer.id}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    Record First Payment
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">{formatCurrency(payment.amount)}</span>
                        {payment.payment_method && (
                          <Badge variant="secondary" className="text-xs">
                            {payment.payment_method}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      {payment.notes && (
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={payment.notes}>
                          {payment.notes}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/payments/${payment.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
                {payments.length > 5 && (
                  <div className="text-center pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/payments?search=${customer.billing_name}`}>
                        View All Payments
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}