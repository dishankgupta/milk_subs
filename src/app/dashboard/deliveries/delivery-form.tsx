"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { formatDateToIST } from "@/lib/utils"
import { toast } from "sonner"

import { deliveryWithAdditionalItemsSchema, type DeliveryWithAdditionalItemsFormData } from "@/lib/validations"
import { createDelivery, updateDelivery, createDeliveryWithAdditionalItems } from "@/lib/actions/deliveries"
import { getProducts } from "@/lib/actions/products"
import type { DeliveryExtended, Product, Customer, Route } from "@/lib/types"
import { AdditionalItemsFormSection } from "@/components/deliveries/additional-items-form-section"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, Package, User, MapPin, Clock } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn, formatCurrency } from "@/lib/utils"

interface DeliveryFormProps {
  delivery?: DeliveryExtended
  // For backward compatibility when creating new deliveries from orders
  initialData?: {
    customer: Customer
    product: Product
    route: Route
    order_date: string
    delivery_time: string
    unit_price: number
    total_amount: number
    planned_quantity: number
    daily_order_id?: string
  }
}

export function DeliveryForm({ delivery, initialData }: DeliveryFormProps) {
  // Use delivery data directly if editing, otherwise use initialData for new deliveries
  const orderData = delivery || initialData
  
  const [isPending, startTransition] = useTransition()
  const [deliveredAt, setDeliveredAt] = useState<Date | undefined>(
    delivery?.delivered_at ? new Date(delivery.delivered_at) : new Date()
  )
  const [products, setProducts] = useState<Product[]>([])
  const [additionalTotal, setAdditionalTotal] = useState(0)
  const router = useRouter()
  
  // Fetch products for additional items selection
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await getProducts()
        setProducts(productsData)
      } catch (error) {
        console.error('Error loading products:', error)
        toast.error('Failed to load products')
      }
    }
    loadProducts()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control
  } = useForm<DeliveryWithAdditionalItemsFormData>({
    resolver: zodResolver(deliveryWithAdditionalItemsSchema),
    defaultValues: {
      // Handle both old and new delivery structures
      daily_order_id: delivery?.daily_order_id || initialData?.daily_order_id || undefined,
      // Required fields for self-contained delivery - provide defaults for new deliveries
      customer_id: delivery?.customer_id || initialData?.customer?.id || "",
      product_id: delivery?.product_id || initialData?.product?.id || "",
      route_id: delivery?.route_id || initialData?.route?.id || "",
      order_date: delivery?.order_date ? new Date(delivery.order_date) : new Date(initialData?.order_date || Date.now()),
      delivery_time: (delivery?.delivery_time || initialData?.delivery_time || "Morning") as "Morning" | "Evening",
      unit_price: delivery?.unit_price || initialData?.unit_price || 0,
      total_amount: delivery?.total_amount || initialData?.total_amount || 0,
      planned_quantity: delivery?.planned_quantity || initialData?.planned_quantity || undefined,
      delivery_status: delivery?.delivery_status || undefined, // Let default in schema handle this
      actual_quantity: delivery?.actual_quantity || orderData?.planned_quantity || 0,
      delivery_notes: delivery?.delivery_notes || "",
      delivery_person: delivery?.delivery_person || "",
      delivered_at: deliveredAt,
      additional_items: []
    },
  })

  const actualQuantity = watch("actual_quantity")

  if (!orderData) {
    return (
      <div className="text-center text-muted-foreground">
        <p>Order data not found</p>
      </div>
    )
  }

  const onSubmit = async (data: DeliveryWithAdditionalItemsFormData) => {
    startTransition(async () => {
      try {
        const formData = {
          ...data,
          delivered_at: deliveredAt || new Date(),
        }

        if (delivery) {
          // For editing existing deliveries, use the original update function
          // TODO: Implement updateDeliveryWithAdditionalItems for editing
          await updateDelivery(delivery.id, formData)
          toast.success("Delivery updated successfully!")
        } else {
          // For new deliveries, check if we have additional items
          const validAdditionalItems = data.additional_items?.filter(item => 
            item.product_id && item.quantity > 0
          ) || []
          
          if (validAdditionalItems.length > 0) {
            await createDeliveryWithAdditionalItems({
              ...formData,
              additional_items: validAdditionalItems
            })
            toast.success(`Delivery confirmed with ${validAdditionalItems.length} additional item(s)!`)
          } else {
            await createDelivery(formData)
            toast.success("Delivery confirmed successfully!")
          }
        }
        
        router.push("/dashboard/deliveries")
        router.refresh()
      } catch (error) {
        console.error('Form submission error:', error)
        toast.error(delivery ? "Failed to update delivery" : "Failed to confirm delivery")
      }
    })
  }

  const quantityVariance = actualQuantity - (orderData.planned_quantity || 0)
  const amountVariance = quantityVariance * orderData.unit_price
  const subscriptionTotal = actualQuantity * orderData.unit_price
  const grandTotal = subscriptionTotal + additionalTotal

  return (
    <div className="space-y-6">
      {/* Order Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details
          </CardTitle>
          <CardDescription>
            {delivery ? 'Delivery' : 'Order'} for {formatDateToIST(new Date(orderData.order_date))}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Customer
            </div>
            <div className="font-medium">{orderData.customer?.billing_name}</div>
            <div className="text-sm text-muted-foreground">{orderData.customer?.contact_person}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Product
            </div>
            <div className="font-medium">{orderData.product?.name}</div>
            <div className="text-sm text-muted-foreground">
              Planned: {orderData.planned_quantity || 0}L @ {formatCurrency(orderData.unit_price)}/L
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Route & Time
            </div>
            <div className="font-medium">{orderData.route?.name}</div>
            <div className="text-sm text-muted-foreground">{orderData.delivery_time}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Planned Amount
            </div>
            <div className="font-medium">{formatCurrency(orderData.total_amount)}</div>
            <div className="text-sm text-muted-foreground">
              Status: <span className="capitalize">{delivery?.delivery_status || 'pending'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Confirmation</CardTitle>
            <CardDescription>
              Record the actual delivery details for this order
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="actual_quantity">
                Actual Quantity Delivered (Liters) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="actual_quantity"
                type="number"
                step="0.1"
                min="0"
                {...register("actual_quantity", { valueAsNumber: true })}
                className={errors.actual_quantity ? "border-red-500" : ""}
              />
              {errors.actual_quantity && (
                <p className="text-sm text-red-500">{errors.actual_quantity.message}</p>
              )}
              
              {/* Quantity Variance Display */}
              {quantityVariance !== 0 && (
                <div className="text-sm">
                  <div className={`font-medium ${quantityVariance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Variance: {quantityVariance > 0 ? '+' : ''}{quantityVariance}L 
                    ({quantityVariance > 0 ? '+' : ''}{formatCurrency(amountVariance)})
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery_person">Delivery Person</Label>
              <Input
                id="delivery_person"
                {...register("delivery_person")}
                placeholder="Enter delivery person name"
                className={errors.delivery_person ? "border-red-500" : ""}
              />
              {errors.delivery_person && (
                <p className="text-sm text-red-500">{errors.delivery_person.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Order Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch("order_date") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch("order_date") ? (
                      format(new Date(watch("order_date")), "PPP")
                    ) : (
                      <span>Pick order date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={watch("order_date") ? new Date(watch("order_date")) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setValue("order_date", date)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.order_date && (
                <p className="text-sm text-red-500">{errors.order_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Delivery Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deliveredAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveredAt ? (
                      format(deliveredAt, "PPP 'at' p")
                    ) : (
                      <span>Pick delivery time</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deliveredAt}
                    onSelect={(date) => {
                      if (date) {
                        // Preserve time if editing, otherwise use current time
                        const currentTime = deliveredAt || new Date()
                        date.setHours(currentTime.getHours(), currentTime.getMinutes())
                        setDeliveredAt(date)
                        setValue("delivered_at", date)
                      }
                    }}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <input
                      type="time"
                      className="w-full px-3 py-1 border rounded"
                      value={deliveredAt ? format(deliveredAt, "HH:mm") : ""}
                      onChange={(e) => {
                        if (deliveredAt && e.target.value) {
                          const [hours, minutes] = e.target.value.split(':').map(Number)
                          const newDate = new Date(deliveredAt)
                          newDate.setHours(hours, minutes)
                          setDeliveredAt(newDate)
                          setValue("delivered_at", newDate)
                        }
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="delivery_notes">Delivery Notes</Label>
              <Textarea
                id="delivery_notes"
                {...register("delivery_notes")}
                placeholder="Any delivery notes, issues, or customer feedback..."
                className={`min-h-[100px] ${errors.delivery_notes ? "border-red-500" : ""}`}
              />
              {errors.delivery_notes && (
                <p className="text-sm text-red-500">{errors.delivery_notes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Items Section */}
        <AdditionalItemsFormSection
          control={control}
          watch={watch}
          products={products}
          onTotalUpdate={setAdditionalTotal}
        />

        {/* Enhanced Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Subscription Delivery Summary */}
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h4 className="text-sm font-medium text-blue-600 mb-3">Subscription Delivery</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Planned</div>
                    <div className="font-medium">{orderData.planned_quantity || 0}L</div>
                    <div className="text-sm text-muted-foreground">{formatCurrency(orderData.total_amount)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Actual</div>
                    <div className="font-medium">{actualQuantity}L</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(subscriptionTotal)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Variance</div>
                    <div className={`font-medium ${quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {quantityVariance > 0 ? '+' : ''}{quantityVariance}L
                    </div>
                    <div className={`text-sm ${amountVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {amountVariance > 0 ? '+' : ''}{formatCurrency(amountVariance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {delivery ? "Delivered" : "Confirming"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Items Summary */}
              {additionalTotal > 0 && (
                <div className="border-b pb-4">
                  <h4 className="text-sm font-medium text-orange-600 mb-3">Additional Items</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Items</div>
                      <div className="font-medium">
                        {watch("additional_items")?.filter(item => item?.product_id && (item?.quantity || 0) > 0).length || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Amount</div>
                      <div className="font-medium text-orange-600">
                        {formatCurrency(additionalTotal)}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-muted-foreground">Type</div>
                      <div className="font-medium">Extra Products</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-lg font-semibold">Total Delivery Value</h4>
                    <div className="text-sm text-muted-foreground">
                      Subscription: {formatCurrency(subscriptionTotal)}
                      {additionalTotal > 0 && (
                        <> + Additional: {formatCurrency(additionalTotal)}</>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(grandTotal)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {additionalTotal > 0 ? 'Combined Total' : 'Subscription Only'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1 md:flex-none"
          >
            <Clock className="mr-2 h-4 w-4" />
            {isPending ? "Processing..." : (delivery ? "Update Delivery" : "Confirm Delivery")}
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
    </div>
  )
}