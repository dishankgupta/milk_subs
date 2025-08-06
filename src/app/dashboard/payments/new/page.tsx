import { getCustomers } from "@/lib/actions/customers"
import PaymentForm from "../payment-form"

export default async function NewPaymentPage(props: { 
  searchParams: Promise<{ customerId?: string }> 
}) {
  const searchParams = await props.searchParams
  const { customers } = await getCustomers()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Add New Payment</h1>
        <p className="text-muted-foreground">
          Record a payment received from a customer
        </p>
      </div>
      
      <PaymentForm customers={customers} preSelectedCustomerId={searchParams.customerId} />
    </div>
  )
}