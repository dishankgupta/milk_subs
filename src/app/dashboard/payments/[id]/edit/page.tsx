import { notFound } from "next/navigation"
import { getPayment } from "@/lib/actions/payments"
import { getCustomers } from "@/lib/actions/customers"
import PaymentForm from "../../payment-form"

export default async function EditPaymentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  
  try {
    const [payment, { customers }] = await Promise.all([
      getPayment(params.id),
      getCustomers()
    ])

    return (
      <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Edit Payment</h1>
          <p className="text-muted-foreground">
            Update payment information and details
          </p>
        </div>
        
        <PaymentForm payment={payment} customers={customers} />
      </div>
    )
  } catch (error) {
    console.error("Failed to fetch payment:", error)
    notFound()
  }
}