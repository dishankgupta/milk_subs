import { Suspense } from "react"
import { getSubscriptions } from "@/lib/actions/subscriptions"
import { SubscriptionsTable } from "./subscriptions-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function SubscriptionsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Subscriptions</h2>
        <Button asChild>
          <Link href="/dashboard/subscriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Subscription
          </Link>
        </Button>
      </div>
      <Suspense fallback={
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading subscriptions...</p>
          </div>
        </div>
      }>
        <SubscriptionsTableWrapper />
      </Suspense>
    </div>
  )
}

async function SubscriptionsTableWrapper() {
  const subscriptions = await getSubscriptions()
  
  return <SubscriptionsTable initialSubscriptions={subscriptions} />
}