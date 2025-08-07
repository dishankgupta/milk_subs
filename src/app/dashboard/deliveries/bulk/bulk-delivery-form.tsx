"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { toast } from "sonner"

import { bulkDeliverySchema, type BulkDeliveryFormData } from "@/lib/validations"
import { createBulkDeliveries } from "@/lib/actions/deliveries"
import type { DailyOrder, Customer, Product, Route } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, Package, CheckCircle2, ArrowLeft } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface BulkDeliveryFormProps {
  orders: (DailyOrder & {
    customer: Customer
    product: Product
    route: Route
  })[]
}

export function BulkDeliveryForm({ orders }: BulkDeliveryFormProps) {
  const [isPending, startTransition] = useTransition()
  const [deliveredAt, setDeliveredAt] = useState<Date | undefined>(new Date())
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control
  } = useForm<BulkDeliveryFormData>({
    resolver: zodResolver(bulkDeliverySchema),
    defaultValues: {
      order_ids: orders.map(order => order.id),
      delivery_mode: "as_planned",
      delivery_person: "",
      delivered_at: deliveredAt,
      delivery_notes: "",
      custom_quantities: orders.map(order => ({
        order_id: order.id,
        actual_quantity: order.planned_quantity
      }))
    },
  })

  const { fields, update } = useFieldArray({
    control,
    name: "custom_quantities"
  })

  const deliveryMode = watch("delivery_mode")

  const handleQuantityChange = (index: number, value: number) => {
    update(index, { 
      order_id: fields[index].order_id, 
      actual_quantity: value 
    })
  }

  async function onSubmit(data: BulkDeliveryFormData) {
    startTransition(async () => {
      try {
        const formData = {
          ...data,
          delivered_at: deliveredAt || new Date(),
        }

        const result = await createBulkDeliveries(formData)
        toast.success(`Successfully confirmed ${result.count} deliveries!`)
        
        router.push("/dashboard/deliveries")
        router.refresh()
      } catch (error) {
        console.error('Form submission error:', error)
        toast.error("Failed to confirm bulk deliveries")
      }
    })
  }

  // Calculate totals
  const totals = orders.reduce(
    (acc, order, index) => {
      const plannedQty = order.planned_quantity
      const plannedAmount = order.total_amount
      
      let actualQty = plannedQty
      if (deliveryMode === 'custom') {
        const customQuantity = fields[index]?.actual_quantity
        if (customQuantity !== undefined) {
          actualQty = customQuantity
        }
      }
      const actualAmount = actualQty * order.unit_price
      
      return {
        plannedQuantity: acc.plannedQuantity + plannedQty,
        plannedAmount: acc.plannedAmount + plannedAmount,
        actualQuantity: acc.actualQuantity + actualQty,
        actualAmount: acc.actualAmount + actualAmount
      }
    },
    { plannedQuantity: 0, plannedAmount: 0, actualQuantity: 0, actualAmount: 0 }
  )

  const variance = {
    quantity: totals.actualQuantity - totals.plannedQuantity,
    amount: totals.actualAmount - totals.plannedAmount
  }

  // Group orders by route and time
  const groupedOrders = orders.reduce((groups, order) => {
    const key = `${order.route.name} - ${order.delivery_time}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(order)
    return groups
  }, {} as Record<string, typeof orders>)

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/deliveries/new">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Order Selection
          </Button>
        </Link>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Summary
          </CardTitle>
          <CardDescription>
            {orders.length} orders selected for bulk confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Orders</div>
              <div className="font-medium text-lg">{orders.length}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Planned Quantity</div>
              <div className="font-medium text-lg">{totals.plannedQuantity}L</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Planned Amount</div>
              <div className="font-medium text-lg">{formatCurrency(totals.plannedAmount)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Routes</div>
              <div className="font-medium text-lg">{Object.keys(groupedOrders).length}</div>
            </div>
          </div>

          {/* Route breakdown */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Route Breakdown:</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(groupedOrders).map(([routeTime, routeOrders]) => (
                <Badge key={routeTime} variant="secondary">
                  {routeTime}: {routeOrders.length} orders
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Delivery Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
            <CardDescription>
              Configure common delivery details for all selected orders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Delivery Mode */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Delivery Mode</Label>
              <RadioGroup
                value={deliveryMode}
                onValueChange={(value) => setValue("delivery_mode", value as "as_planned" | "custom")}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="as_planned" id="as_planned" />
                  <div className="space-y-1">
                    <Label htmlFor="as_planned" className="font-medium">Delivered as Planned</Label>
                    <p className="text-sm text-muted-foreground">
                      Use planned quantities for all orders
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="custom" id="custom" />
                  <div className="space-y-1">
                    <Label htmlFor="custom" className="font-medium">Custom Quantities</Label>
                    <p className="text-sm text-muted-foreground">
                      Adjust individual quantities as needed
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Delivery Person */}
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

              {/* Delivery Time */}
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
            </div>

            {/* Delivery Notes */}
            <div className="space-y-2">
              <Label htmlFor="delivery_notes">Common Delivery Notes</Label>
              <Textarea
                id="delivery_notes"
                {...register("delivery_notes")}
                placeholder="Any common delivery notes for all orders..."
                className={`min-h-[100px] ${errors.delivery_notes ? "border-red-500" : ""}`}
              />
              {errors.delivery_notes && (
                <p className="text-sm text-red-500">{errors.delivery_notes.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Custom Quantities */}
        {deliveryMode === "custom" && (
          <Card>
            <CardHeader>
              <CardTitle>Custom Quantities</CardTitle>
              <CardDescription>
                Adjust individual quantities for each order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orders.map((order, index) => (
                  <div key={order.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-4 border rounded-lg">
                    <div className="md:col-span-2">
                      <div className="font-medium">{order.customer.billing_name}</div>
                      <div className="text-sm text-muted-foreground">{order.product.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Route</div>
                      <div className="font-medium">{order.route.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Planned</div>
                      <div className="font-medium">{order.planned_quantity}L</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Actual</div>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={fields[index]?.actual_quantity || 0}
                        onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Variance</div>
                      <div className={`font-medium ${(fields[index]?.actual_quantity || 0) - order.planned_quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {((fields[index]?.actual_quantity || 0) - order.planned_quantity) >= 0 ? '+' : ''}{(fields[index]?.actual_quantity || 0) - order.planned_quantity}L
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Final Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Orders</div>
                <div className="font-medium">{orders.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Quantity</div>
                <div className="font-medium">{totals.actualQuantity}L</div>
                {variance.quantity !== 0 && (
                  <div className={`text-sm ${variance.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({variance.quantity >= 0 ? '+' : ''}{variance.quantity}L variance)
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="font-medium">{formatCurrency(totals.actualAmount)}</div>
                {variance.amount !== 0 && (
                  <div className={`text-sm ${variance.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ({variance.amount >= 0 ? '+' : ''}{formatCurrency(variance.amount)} variance)
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="font-medium">Ready to Confirm</div>
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
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isPending ? "Processing..." : `Confirm ${orders.length} Deliveries`}
          </Button>
          
          <Link href="/dashboard/deliveries/new">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}