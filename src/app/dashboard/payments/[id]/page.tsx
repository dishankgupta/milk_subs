import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Edit, ArrowLeft, User, Calendar, CreditCard, FileText, Clock } from "lucide-react"
import { getPayment } from "@/lib/actions/payments"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"

export default async function PaymentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  
  try {
    const payment = await getPayment(params.id)

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/payments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Payments
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Payment Details</h1>
              <p className="text-muted-foreground">
                Payment information and transaction details
              </p>
            </div>
          </div>
          <Link href={`/dashboard/payments/${params.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Payment
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-green-600 text-xl">
                  {formatCurrency(payment.amount)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Date:</span>
                <span className="font-medium">
                  {format(new Date(payment.payment_date), "PPP")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method:</span>
                <div>
                  {payment.payment_method ? (
                    <Badge variant="secondary">{payment.payment_method}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {payment.id}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment.customer ? (
                <>
                  <div>
                    <div className="font-medium text-lg">{payment.customer.billing_name}</div>
                    {payment.customer.contact_person && (
                      <div className="text-muted-foreground">{payment.customer.contact_person}</div>
                    )}
                  </div>
                  <Separator />
                  {payment.customer.address && (
                    <div>
                      <span className="text-muted-foreground text-sm">Address:</span>
                      <p className="text-sm">{payment.customer.address}</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-sm">{payment.customer.phone_primary}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Outstanding Amount:</span>
                    <span className={`font-medium ${payment.customer.outstanding_amount > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(payment.customer.outstanding_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={payment.customer.status === "Active" ? "default" : "secondary"}>
                      {payment.customer.status}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">Customer information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Billing Period */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Billing Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment.period_start && payment.period_end ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Period Start:</span>
                    <span className="font-medium">
                      {format(new Date(payment.period_start), "PPP")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Period End:</span>
                    <span className="font-medium">
                      {format(new Date(payment.period_end), "PPP")}
                    </span>
                  </div>
                  <div className="bg-muted/50 p-3 rounded">
                    <p className="text-sm">
                      This payment covers the period from{" "}
                      <strong>{format(new Date(payment.period_start), "MMM dd")}</strong> to{" "}
                      <strong>{format(new Date(payment.period_end), "MMM dd, yyyy")}</strong>
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No billing period specified for this payment</p>
              )}
            </CardContent>
          </Card>

          {/* Notes and Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Notes & Additional Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payment.notes ? (
                <div>
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <p className="text-sm bg-muted/50 p-3 rounded mt-1">{payment.notes}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No notes added for this payment</p>
              )}
              
              <Separator />
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="mr-2 h-3 w-3" />
                  Created: {format(new Date(payment.created_at), "PPP 'at' p")}
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-3 w-3" />
                  Last Updated: {format(new Date(payment.updated_at), "PPP 'at' p")}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Failed to fetch payment:", error)
    notFound()
  }
}