import { Suspense } from "react"
import { notFound } from "next/navigation"

import { getDeliveryById } from "@/lib/actions/deliveries"
import { DeliveryForm } from "../../delivery-form"

interface EditDeliveryPageProps {
  params: Promise<{
    id: string
  }>
}

async function EditDeliveryContent({ params }: EditDeliveryPageProps) {
  try {
    const { id } = await params
    const delivery = await getDeliveryById(id)
    return <DeliveryForm delivery={delivery} />
  } catch (error) {
    console.error('Error loading delivery for edit:', error)
    notFound()
  }
}

export default function EditDeliveryPage({ params }: EditDeliveryPageProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Delivery</h1>
        <p className="text-muted-foreground mt-2">
          Update delivery details and actual quantities
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-96 bg-muted rounded-lg animate-pulse" />
            <div className="h-64 bg-muted rounded-lg animate-pulse" />
          </div>
        }
      >
        <EditDeliveryContent params={params} />
      </Suspense>
    </div>
  )
}