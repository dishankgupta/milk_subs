"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { deliveryWithAdditionalItemsSchema, type DeliveryWithAdditionalItemsFormData } from "@/lib/validations"
import { createDeliveryWithAdditionalItems } from "@/lib/actions/deliveries"
import type { Product, Customer, Route } from "@/lib/types"
import { getCurrentISTDate } from "@/lib/date-utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { CustomerSelector } from "./customer-selector"
import { ProductSelectionCard } from "./product-selection-card" 
import { DeliveryDetailsCard } from "./delivery-details-card"

interface AdditionalDeliveryFormProps {
  products: Product[]
  customers: Customer[]
  routes: Route[]
}

export function AdditionalDeliveryForm({ products, customers, routes }: AdditionalDeliveryFormProps) {
  const [isPending, startTransition] = useTransition()
  const [deliveredAt, setDeliveredAt] = useState<Date>(getCurrentISTDate())
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    product: Product
    quantity: number
    notes: string
  }>>([])
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<DeliveryWithAdditionalItemsFormData>({
    resolver: zodResolver(deliveryWithAdditionalItemsSchema),
    defaultValues: {
      // No daily_order_id for standalone additional delivery
      daily_order_id: undefined,
      customer_id: "",
      product_id: "", // We'll use the first additional item's product for required field
      route_id: "",
      order_date: getCurrentISTDate(),
      delivery_time: "Morning",
      unit_price: 0,
      // total_amount is now a computed column (actual_quantity * unit_price) - removed from form
      planned_quantity: undefined, // No planned quantity for additional items
      delivery_status: "delivered",
      actual_quantity: 0, // Will be sum of additional items
      delivery_notes: "",
      delivery_person: "",
      delivered_at: deliveredAt,
      additional_items: []
    },
  })

  // Calculate totals
  const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = selectedProducts.reduce((sum, item) => sum + (item.quantity * item.product.current_price), 0)

  // Update form when customer or products change
  useEffect(() => {
    if (selectedCustomer) {
      setValue("customer_id", selectedCustomer.id)
      setValue("route_id", selectedCustomer.route_id)
      setValue("delivery_time", selectedCustomer.delivery_time)
    }
  }, [selectedCustomer, setValue])

  useEffect(() => {
    if (selectedProducts.length > 0) {
      // Use first product as main product for form validation
      const firstProduct = selectedProducts[0]
      setValue("product_id", firstProduct.product.id)
      setValue("unit_price", firstProduct.product.current_price)
      setValue("actual_quantity", totalQuantity)
      // total_amount is now a computed column - no need to set it
      
      // Set additional items
      setValue("additional_items", selectedProducts.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.current_price,
        notes: item.notes
      })))
    } else {
      // Clear form if no products selected
      setValue("product_id", "")
      setValue("unit_price", 0)
      setValue("actual_quantity", 0)
      // total_amount is now a computed column - no need to set it
      setValue("additional_items", [])
    }
  }, [selectedProducts, totalQuantity, totalAmount, setValue])

  const onSubmit = async (data: DeliveryWithAdditionalItemsFormData) => {
    if (!selectedCustomer) {
      toast.error("Please select a customer")
      return
    }

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product")
      return
    }

    startTransition(async () => {
      try {
        const formData = {
          ...data,
          delivered_at: deliveredAt,
        }

        await createDeliveryWithAdditionalItems(formData)
        toast.success(`Additional delivery recorded successfully! ${selectedProducts.length} item(s) delivered to ${selectedCustomer.billing_name}`)
        
        router.push("/dashboard/deliveries")
        router.refresh()
      } catch (error) {
        console.error('Form submission error:', error)
        toast.error("Failed to record additional delivery")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer Selection */}
      <CustomerSelector
        customers={customers}
        selectedCustomer={selectedCustomer}
        onCustomerSelect={setSelectedCustomer}
      />

      {/* Product Selection */}
      <ProductSelectionCard
        products={products}
        selectedProducts={selectedProducts}
        onProductsChange={setSelectedProducts}
      />

      {/* Delivery Details */}
      <DeliveryDetailsCard
        routes={routes}
        selectedCustomer={selectedCustomer}
        register={register}
        errors={errors}
        watch={watch}
        setValue={setValue}
        deliveredAt={deliveredAt}
        setDeliveredAt={setDeliveredAt}
      />

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Delivery Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Customer & Route Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">
                  {selectedCustomer ? selectedCustomer.billing_name : "No customer selected"}
                </div>
                {selectedCustomer && (
                  <div className="text-sm text-muted-foreground">
                    {selectedCustomer.contact_person} • {selectedCustomer.phone_primary}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Route & Time</div>
                <div className="font-medium">
                  {selectedCustomer ? (
                    <>
                      Route {routes.find(r => r.id === selectedCustomer.route_id)?.name} • {selectedCustomer.delivery_time}
                    </>
                  ) : (
                    "Select customer first"
                  )}
                </div>
              </div>
            </div>

            {/* Products Summary */}
            {selectedProducts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-orange-600">Products to Deliver</h4>
                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 px-3 bg-orange-50 rounded">
                    <div>
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {item.quantity} {item.product.unit_of_measure}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(item.quantity * item.product.current_price)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @ {formatCurrency(item.product.current_price)}/{item.product.unit_of_measure}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grand Total */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-lg font-semibold">Total Additional Delivery</h4>
                  <div className="text-sm text-muted-foreground">
                    {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''} • Total Quantity: {totalQuantity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Additional Items</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isPending || !selectedCustomer || selectedProducts.length === 0}
          className="flex-1 md:flex-none"
        >
          <Package2 className="mr-2 h-4 w-4" />
          {isPending ? "Recording..." : "Record Additional Delivery"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}