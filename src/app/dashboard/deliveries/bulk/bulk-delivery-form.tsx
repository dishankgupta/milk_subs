"use client"

import React, { useState, useTransition, useMemo, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { bulkDeliverySchema, type BulkDeliveryFormData } from "@/lib/validations"
import { createBulkDeliveries } from "@/lib/actions/deliveries"
import type { DailyOrder, Customer, Product, Route } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { getCurrentISTDate } from "@/lib/date-utils"
import { useSorting } from "@/hooks/useSorting"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"
import { Package, CheckCircle2, ArrowLeft, Search } from "lucide-react"
import Link from "next/link"


interface BulkDeliveryFormProps {
  orders: (DailyOrder & {
    customer: Customer
    product: Product
    route: Route
  })[]
}

export const BulkDeliveryForm = React.memo(function BulkDeliveryForm({ orders }: BulkDeliveryFormProps) {
  const [isPending, startTransition] = useTransition()
  const [deliveredAt, setDeliveredAt] = useState<Date | undefined>(undefined)
  const [searchTerm, setSearchTerm] = useState("")
  const [isClientMounted, setIsClientMounted] = useState(false)
  const router = useRouter()

  // Create stable default values
  const defaultValues = useMemo(() => {
    return {
      order_ids: orders.map(order => order.id),
      delivery_mode: "as_planned" as const,
      delivery_person: "",
      delivered_at: undefined, // Will be set after hydration
      delivery_notes: "",
      custom_quantities: orders.map(order => ({
        order_id: order.id,
        actual_quantity: order.planned_quantity
      }))
    }
  }, [orders])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control
  } = useForm<BulkDeliveryFormData>({
    resolver: zodResolver(bulkDeliverySchema),
    defaultValues,
  })

  // Initialize deliveredAt after component mounts to avoid hydration mismatch
  useEffect(() => {
    const now = getCurrentISTDate()
    setDeliveredAt(now)
    setValue("delivered_at", now)
    setIsClientMounted(true)
  }, [setValue])

  const { fields, update } = useFieldArray({
    control,
    name: "custom_quantities"
  })

  const deliveryMode = watch("delivery_mode")


  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders

    const searchLower = searchTerm.toLowerCase()
    return orders.filter(order =>
      order.customer.billing_name.toLowerCase().includes(searchLower) ||
      order.product.name.toLowerCase().includes(searchLower) ||
      order.route.name.toLowerCase().includes(searchLower)
    )
  }, [orders, searchTerm])

  // Sorting functionality with stable references
  const { sortedData: sortedOrders, sortConfig, handleSort } = useSorting(
    filteredOrders,
    'customer.billing_name',
    'asc'
  )

  const handleQuantityChange = useCallback((sortedIndex: number, value: number) => {
    // Find the original order index in the unsorted array
    const sortedOrder = sortedOrders[sortedIndex]
    const originalIndex = orders.findIndex(order => order.id === sortedOrder.id)
    
    if (originalIndex !== -1 && fields[originalIndex]) {
      update(originalIndex, { 
        order_id: fields[originalIndex].order_id, 
        actual_quantity: value 
      })
    }
  }, [sortedOrders, orders, fields, update])


  async function onSubmit(data: BulkDeliveryFormData) {
    startTransition(async () => {
      try {
        // Submit form without additional items (handled through main deliveries dashboard)
        const formData = {
          ...data,
          delivered_at: deliveredAt || getCurrentISTDate()
        }

        const result = await createBulkDeliveries(formData)
        
        toast.success(
          `Successfully confirmed ${result.subscriptionCount} subscription deliveries!`
        )
        
        router.push("/dashboard/deliveries")
        router.refresh()
      } catch (error) {
        console.error('Form submission error:', error)
        toast.error("Failed to confirm bulk deliveries")
      }
    })
  }

  // Calculate totals, product breakdown, and customer variances - memoized to prevent infinite re-renders
  const { totals, productBreakdown, customerVariances } = useMemo(() => {
    const breakdown = new Map<string, {
      productName: string
      orderCount: number
      plannedQuantity: number
      actualQuantity: number
      plannedAmount: number
      actualAmount: number
    }>()

    const variances = new Map<string, {
      customerId: string
      customerName: string
      orders: Array<{
        productName: string
        plannedQuantity: number
        actualQuantity: number
        quantityVariance: number
        amountVariance: number
      }>
      totalQuantityVariance: number
      totalAmountVariance: number
    }>()

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

        // Update product breakdown
        const productKey = order.product.id
        const existing = breakdown.get(productKey) || {
          productName: order.product.name,
          orderCount: 0,
          plannedQuantity: 0,
          actualQuantity: 0,
          plannedAmount: 0,
          actualAmount: 0
        }

        breakdown.set(productKey, {
          ...existing,
          orderCount: existing.orderCount + 1,
          plannedQuantity: existing.plannedQuantity + plannedQty,
          actualQuantity: existing.actualQuantity + actualQty,
          plannedAmount: existing.plannedAmount + plannedAmount,
          actualAmount: existing.actualAmount + actualAmount
        })

        // Calculate customer variances (only if custom mode and there's a variance)
        if (deliveryMode === 'custom') {
          const qtyVariance = actualQty - plannedQty
          const amtVariance = actualAmount - plannedAmount

          if (qtyVariance !== 0 || amtVariance !== 0) {
            const customerKey = order.customer.id
            const existingVariance = variances.get(customerKey) || {
              customerId: order.customer.id,
              customerName: order.customer.billing_name,
              orders: [],
              totalQuantityVariance: 0,
              totalAmountVariance: 0
            }

            const orderVariance = {
              productName: order.product.name,
              plannedQuantity: plannedQty,
              actualQuantity: actualQty,
              quantityVariance: qtyVariance,
              amountVariance: amtVariance
            }

            variances.set(customerKey, {
              ...existingVariance,
              orders: [...existingVariance.orders, orderVariance],
              totalQuantityVariance: existingVariance.totalQuantityVariance + qtyVariance,
              totalAmountVariance: existingVariance.totalAmountVariance + amtVariance
            })
          }
        }

        return {
          plannedQuantity: acc.plannedQuantity + plannedQty,
          plannedAmount: acc.plannedAmount + plannedAmount,
          actualQuantity: acc.actualQuantity + actualQty,
          actualAmount: acc.actualAmount + actualAmount
        }
      },
      { plannedQuantity: 0, plannedAmount: 0, actualQuantity: 0, actualAmount: 0 }
    )

    return {
      totals,
      productBreakdown: Array.from(breakdown.values()).sort((a, b) => a.productName.localeCompare(b.productName)),
      customerVariances: Array.from(variances.values()).sort((a, b) => a.customerName.localeCompare(b.customerName))
    }
  }, [orders, deliveryMode, fields])

  const variance = useMemo(() => ({
    quantity: totals.actualQuantity - totals.plannedQuantity,
    amount: totals.actualAmount - totals.plannedAmount
  }), [totals])

  // Group orders by route and time - memoized
  const groupedOrders = useMemo(() => {
    return orders.reduce((groups, order) => {
      const key = `${order.route.name} - ${order.delivery_time}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(order)
      return groups
    }, {} as Record<string, typeof orders>)
  }, [orders])

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
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="as_planned" id="as_planned" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="as_planned" className="font-medium cursor-pointer">
                      Delivered as Planned
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use planned quantities for all orders
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <RadioGroupItem value="custom" id="custom" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="custom" className="font-medium cursor-pointer">
                      Custom Quantities
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
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
                <Label>Delivery Date & Time</Label>
                {isClientMounted ? (
                  <UnifiedDatePicker
                    value={deliveredAt}
                    onChange={(date) => {
                      if (date) {
                        setDeliveredAt(date)
                        setValue("delivered_at", date)
                      }
                    }}
                    withTime={true}
                    placeholder="DD-MM-YYYY HH:mm"
                  />
                ) : (
                  <div className="w-full px-3 py-2 border rounded text-muted-foreground bg-muted">
                    Loading...
                  </div>
                )}
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
                Adjust individual quantities for each order ({sortedOrders.length} of {orders.length} orders shown)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by customer name, product, or route..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Orders Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead
                        sortKey="customer.billing_name"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="w-[200px]"
                      >
                        Customer
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="product.name"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="w-[150px]"
                      >
                        Product
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="route.name"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="w-[120px]"
                      >
                        Route
                      </SortableTableHead>
                      <SortableTableHead
                        sortKey="planned_quantity"
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        className="w-[100px] text-right"
                      >
                        Planned (L)
                      </SortableTableHead>
                      <TableHead className="w-[120px] text-right">Actual (L)</TableHead>
                      <TableHead className="w-[120px] text-right">Variance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No orders found matching your search criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedOrders.map((order, sortedIndex) => {
                        const originalIndex = orders.findIndex(o => o.id === order.id)
                        const actualQuantity = fields[originalIndex]?.actual_quantity ?? order.planned_quantity
                        const variance = actualQuantity - order.planned_quantity
                        
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.customer.billing_name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {order.product.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{order.route.name}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {order.planned_quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={actualQuantity}
                                onChange={(e) => {
                                  const value = e.target.value
                                  const numValue = value === '' ? 0 : parseFloat(value)
                                  handleQuantityChange(sortedIndex, isNaN(numValue) ? 0 : numValue)
                                }}
                                className="w-20 text-right font-mono"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={`font-medium font-mono ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {variance >= 0 ? '+' : ''}{variance.toFixed(1)}L
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Quick Stats for Filtered Data */}
              {searchTerm && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-2">Filtered Results:</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">{sortedOrders.length}</span> orders shown
                    </div>
                    <div>
                      <span className="font-medium">
                        {sortedOrders.reduce((sum, order) => sum + order.planned_quantity, 0)}L
                      </span> planned total
                    </div>
                    <div>
                      <span className="font-medium">
                        {sortedOrders.reduce((sum, order) => {
                          const originalIndex = orders.findIndex(o => o.id === order.id)
                          return sum + (fields[originalIndex]?.actual_quantity ?? order.planned_quantity)
                        }, 0)}L
                      </span> actual total
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Items Manager removed - handled through main deliveries dashboard */}

        {/* Final Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Final Summary</CardTitle>
            <CardDescription>
              Product breakdown and totals for subscription deliveries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Product Breakdown Table */}
              <div>
                <h4 className="font-medium mb-3 text-blue-600">Subscription Product Breakdown</h4>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        {deliveryMode === 'custom' && (
                          <TableHead className="text-right">Variance</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productBreakdown.map((product) => {
                        const qtyVariance = product.actualQuantity - product.plannedQuantity
                        const amtVariance = product.actualAmount - product.plannedAmount

                        return (
                          <TableRow key={product.productName}>
                            <TableCell className="font-medium">
                              {product.productName}
                            </TableCell>
                            <TableCell className="text-center">
                              {product.orderCount}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {product.actualQuantity.toFixed(1)}L
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(product.actualAmount)}
                            </TableCell>
                            {deliveryMode === 'custom' && (
                              <TableCell className="text-right">
                                <div className="space-y-1">
                                  <div className={`text-sm font-mono ${qtyVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {qtyVariance >= 0 ? '+' : ''}{qtyVariance.toFixed(1)}L
                                  </div>
                                  <div className={`text-xs font-mono ${amtVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {amtVariance >= 0 ? '+' : ''}{formatCurrency(amtVariance)}
                                  </div>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Customer Variance Summary */}
              {deliveryMode === 'custom' && customerVariances.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 text-orange-600">Customer Variance Summary</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Planned (L)</TableHead>
                          <TableHead className="text-right">Actual (L)</TableHead>
                          <TableHead className="text-right">Quantity Variance</TableHead>
                          <TableHead className="text-right">Amount Variance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerVariances.map((customer) =>
                          customer.orders.map((order, orderIndex) => (
                            <TableRow key={`${customer.customerId}-${orderIndex}`}>
                              <TableCell className="font-medium">
                                {orderIndex === 0 ? customer.customerName : ''}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {order.productName}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {order.plannedQuantity.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {order.actualQuantity.toFixed(1)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`font-mono ${order.quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {order.quantityVariance >= 0 ? '+' : ''}{order.quantityVariance.toFixed(1)}L
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className={`font-mono ${order.amountVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {order.amountVariance >= 0 ? '+' : ''}{formatCurrency(order.amountVariance)}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                        {/* Totals Row */}
                        <TableRow className="border-t-2 bg-muted/30">
                          <TableCell className="font-bold">
                            Total Variances
                          </TableCell>
                          <TableCell className="text-muted-foreground italic">
                            All Products
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            -
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            -
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`font-bold font-mono ${variance.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variance.quantity >= 0 ? '+' : ''}{variance.quantity.toFixed(1)}L
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`font-bold font-mono ${variance.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {variance.amount >= 0 ? '+' : ''}{formatCurrency(variance.amount)}
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Showing detailed variances for {customerVariances.length} of {orders.reduce((acc, order) => {
                      const customerId = order.customer.id
                      return acc.has(customerId) ? acc : acc.add(customerId)
                    }, new Set()).size} customers with delivery changes
                  </div>
                </div>
              )}

              {/* Overall Totals */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3 text-green-800">Overall Totals</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-green-700">Total Orders</div>
                    <div className="font-bold text-green-800">{orders.length}</div>
                    <div className="text-xs text-green-600">subscription deliveries</div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700">Total Quantity</div>
                    <div className="font-bold text-green-800">{totals.actualQuantity.toFixed(1)}L</div>
                    {variance.quantity !== 0 && (
                      <div className={`text-xs ${variance.quantity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({variance.quantity >= 0 ? '+' : ''}{variance.quantity.toFixed(1)}L variance)
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-sm text-green-700">Total Amount</div>
                    <div className="font-bold text-green-800">{formatCurrency(totals.actualAmount)}</div>
                    {variance.amount !== 0 && (
                      <div className={`text-xs ${variance.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({variance.amount >= 0 ? '+' : ''}{formatCurrency(variance.amount)} variance)
                      </div>
                    )}
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
})