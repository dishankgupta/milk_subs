import { SubscriptionForm } from "../subscription-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface NewSubscriptionPageProps {
  searchParams: Promise<{
    customerId?: string
  }>
}

export default async function NewSubscriptionPage({ searchParams }: NewSubscriptionPageProps) {
  const { customerId } = await searchParams
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/subscriptions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Add New Subscription</h2>
      </div>
      
      <div className="max-w-4xl">
        <SubscriptionForm customerId={customerId} />
      </div>
    </div>
  )
}