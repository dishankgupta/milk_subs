import { notFound } from "next/navigation"
import { getSubscription } from "@/lib/actions/subscriptions"
import { SubscriptionForm } from "../../subscription-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const subscription = await getSubscription(id)

  if (!subscription) {
    notFound()
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/dashboard/subscriptions/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Edit Subscription</h2>
          <p className="text-muted-foreground">
            {subscription.customer?.billing_name} - {subscription.product?.name}
          </p>
        </div>
      </div>
      
      <div className="max-w-4xl">
        <SubscriptionForm subscription={subscription} />
      </div>
    </div>
  )
}