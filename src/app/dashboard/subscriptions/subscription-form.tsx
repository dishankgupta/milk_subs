"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { subscriptionSchema, type SubscriptionFormData } from "@/lib/validations"
import { createSubscription, updateSubscription, getProducts } from "@/lib/actions/subscriptions"
import { getCustomers, activateCustomer } from "@/lib/actions/customers"
import { calculatePatternDay } from "@/lib/subscription-utils"
import { Product, Customer, Subscription } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { formatDateIST, formatWithIST } from "@/lib/date-utils"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Calculator, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface SubscriptionFormProps {
  subscription?: Subscription
  customerId?: string
}

export function SubscriptionForm({ subscription, customerId }: SubscriptionFormProps) {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showInactiveWarning, setShowInactiveWarning] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<SubscriptionFormData | null>(null)

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      customer_id: subscription?.customer_id || customerId || "",
      product_id: subscription?.product_id || "",
      subscription_type: subscription?.subscription_type || "Daily",
      daily_quantity: subscription?.daily_quantity || undefined,
      pattern_day1_quantity: subscription?.pattern_day1_quantity || undefined,
      pattern_day2_quantity: subscription?.pattern_day2_quantity || undefined,
      pattern_start_date: subscription?.pattern_start_date ? new Date(subscription.pattern_start_date) : null,
      is_active: subscription?.is_active ?? true,
    },
  })

  const watchedSubscriptionType = form.watch("subscription_type")
  const watchedCustomerId = form.watch("customer_id")
  const watchedProductId = form.watch("product_id")
  const watchedPatternDay1 = form.watch("pattern_day1_quantity")
  const watchedPatternDay2 = form.watch("pattern_day2_quantity")
  const watchedPatternStartDate = form.watch("pattern_start_date")

  useEffect(() => {
    const loadData = async () => {
      try {
        const [{ customers: customersData }, productsData] = await Promise.all([
          getCustomers(),
          getProducts()
        ])
        setCustomers(customersData)
        setProducts(productsData)

        // Set selected customer and product for existing subscription or provided customerId
        if (subscription?.customer) {
          setSelectedCustomer(subscription.customer)
        } else if (customerId) {
          const customer = customersData.find(c => c.id === customerId)
          if (customer) setSelectedCustomer(customer)
        }

        if (subscription?.product) {
          setSelectedProduct(subscription.product)
        }
      } catch {
        toast.error("Failed to load form data")
      }
    }
    loadData()
  }, [subscription, customerId])

  // Update selected customer when customer_id changes
  useEffect(() => {
    const customer = customers.find(c => c.id === watchedCustomerId)
    setSelectedCustomer(customer || null)
  }, [watchedCustomerId, customers])

  // Update selected product when product_id changes
  useEffect(() => {
    const product = products.find(p => p.id === watchedProductId)
    setSelectedProduct(product || null)
  }, [watchedProductId, products])

  // Clear pattern fields when switching to Daily
  useEffect(() => {
    if (watchedSubscriptionType === "Daily") {
      form.setValue("pattern_day1_quantity", undefined)
      form.setValue("pattern_day2_quantity", undefined)
      form.setValue("pattern_start_date", null)
    } else if (watchedSubscriptionType === "Pattern") {
      form.setValue("daily_quantity", undefined)
    }
  }, [watchedSubscriptionType, form])

  const onSubmit = async (data: SubscriptionFormData) => {
    // Check if customer is inactive and subscription is being activated
    const customer = customers.find(c => c.id === data.customer_id)
    if (customer && customer.status === "Inactive" && data.is_active) {
      setPendingFormData(data)
      setShowInactiveWarning(true)
      return
    }

    await processSubscription(data)
  }

  const processSubscription = async (data: SubscriptionFormData) => {
    setLoading(true)
    try {
      const result = subscription 
        ? await updateSubscription(subscription.id, data)
        : await createSubscription(data)
      
      if (result.success) {
        toast.success(`Subscription ${subscription ? 'updated' : 'created'} successfully`)
        router.push("/dashboard/subscriptions")
      } else {
        toast.error(result.error || `Failed to ${subscription ? 'update' : 'create'} subscription`)
      }
    } catch (error) {
      toast.error(`Failed to ${subscription ? 'update' : 'create'} subscription`)
    } finally {
      setLoading(false)
    }
  }

  const handleActivateCustomerAndSubscription = async () => {
    if (!pendingFormData) return
    
    setLoading(true)
    try {
      // First activate the customer
      const customerResult = await activateCustomer(pendingFormData.customer_id)
      if (!customerResult.success) {
        toast.error("Failed to activate customer")
        return
      }

      // Then process the subscription
      await processSubscription(pendingFormData)
      toast.success("Customer activated and subscription processed successfully")
    } catch (error) {
      toast.error("Failed to activate customer and create subscription")
    } finally {
      setShowInactiveWarning(false)
      setPendingFormData(null)
      setLoading(false)
    }
  }

  const handleCancelWarning = () => {
    setShowInactiveWarning(false)
    setPendingFormData(null)
  }

  // Generate pattern preview for next 7 days
  const generatePatternPreview = () => {
    if (watchedSubscriptionType !== "Pattern" || !watchedPatternDay1 || !watchedPatternDay2 || !watchedPatternStartDate) {
      return []
    }

    const preview = []
    const startDate = new Date(watchedPatternStartDate)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      const patternDay = calculatePatternDay(startDate, date)
      const quantity = patternDay === 1 ? watchedPatternDay1 : watchedPatternDay2
      
      preview.push({
        date: formatDateIST(date),
        day: formatWithIST(date, 'EEE'),
        patternDay,
        quantity
      })
    }
    
    return preview
  }

  const patternPreview = generatePatternPreview()

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!!customerId} // Disable if customerId is provided
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.billing_name} ({customer.contact_person})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Selection */}
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.code}) - {formatCurrency(product.current_price)}/L
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Selected Customer and Product Info */}
          {(selectedCustomer || selectedProduct) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCustomer && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Customer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <strong>Billing:</strong> {selectedCustomer.billing_name}
                    </div>
                    <div className="text-sm">
                      <strong>Contact:</strong> {selectedCustomer.contact_person}
                    </div>
                    <div className="text-sm">
                      <strong>Route:</strong> {selectedCustomer.route?.name} - {selectedCustomer.delivery_time}
                    </div>
                    <div className="text-sm">
                      <strong>Payment:</strong> {selectedCustomer.payment_method}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedProduct && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <strong>Product:</strong> {selectedProduct.name} ({selectedProduct.code})
                    </div>
                    <div className="text-sm">
                      <strong>Price:</strong> {formatCurrency(selectedProduct.current_price)} per {selectedProduct.unit}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Subscription Type */}
          <FormField
            control={form.control}
            name="subscription_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscription Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Daily">Daily (Same quantity every day)</SelectItem>
                    <SelectItem value="Pattern">Pattern (2-day alternating cycle)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Daily subscriptions deliver the same quantity every day. Pattern subscriptions alternate between two quantities over a 2-day cycle.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Daily Quantity (for Daily subscriptions) */}
          {watchedSubscriptionType === "Daily" && (
            <FormField
              control={form.control}
              name="daily_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Quantity (Liters)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="e.g., 1.5"
                      {...field}
                      value={field.value !== undefined ? String(field.value) : ''}
                      onChange={(e) => {
                        const value = e.target.value.trim()
                        if (value === '') {
                          field.onChange(undefined)
                        } else {
                          const numValue = parseFloat(value)
                          if (!isNaN(numValue) && numValue >= 0) {
                            field.onChange(numValue)
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Amount to be delivered every day
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Pattern Quantities (for Pattern subscriptions) */}
          {watchedSubscriptionType === "Pattern" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pattern_day1_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day 1 Quantity (Liters)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="e.g., 1.0 (0 for no delivery)"
                          {...field}
                          value={field.value !== undefined ? field.value : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '') {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(value)
                              field.onChange(isNaN(numValue) ? undefined : numValue)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pattern_day2_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day 2 Quantity (Liters)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="e.g., 2.0 (0 for no delivery)"
                          {...field}
                          value={field.value !== undefined ? field.value : ''}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '') {
                              field.onChange(undefined)
                            } else {
                              const numValue = parseFloat(value)
                              field.onChange(isNaN(numValue) ? undefined : numValue)
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="pattern_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pattern Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value ? new Date(value) : null)
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      The date when Day 1 of the pattern begins
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Pattern Preview */}
          {watchedSubscriptionType === "Pattern" && patternPreview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Pattern Preview (Next 7 Days)
                </CardTitle>
                <CardDescription>
                  Shows how the 2-day pattern will repeat over the next week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {patternPreview.map((day, index) => (
                    <div key={index} className="text-center p-3 border rounded-lg">
                      <div className="text-xs text-muted-foreground">{day.day}</div>
                      <div className="text-sm font-medium">{day.date}</div>
                      <Badge 
                        variant={day.patternDay === 1 ? "default" : "secondary"}
                        className="mt-1 text-xs"
                      >
                        Day {day.patternDay}
                      </Badge>
                      <div className="text-lg font-bold mt-1">{day.quantity}L</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Status */}
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "true")} 
                  defaultValue={field.value ? "true" : "false"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Only active subscriptions will generate daily orders
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : subscription ? "Update Subscription" : "Create Subscription"}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showInactiveWarning} onOpenChange={setShowInactiveWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <AlertDialogTitle>Customer is Inactive</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              The selected customer <strong>{selectedCustomer?.billing_name}</strong> is currently inactive.
              <br /><br />
              Active subscriptions for inactive customers will not generate any orders. 
              Would you like to activate the customer along with this subscription?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelWarning} disabled={loading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleActivateCustomerAndSubscription} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Activating..." : "Activate Customer & Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}