"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { saleSchema, type SaleFormData } from "@/lib/validations"
import { createSale } from "@/lib/actions/sales"
import { getProducts } from "@/lib/actions/products"
import { getCustomers } from "@/lib/actions/customers"
import { calculateGSTFromInclusive, formatCurrency } from "@/lib/utils"
import { toast } from "sonner"

import type { Product, Customer } from "@/lib/types"

interface SalesFormProps {
  onSuccess?: () => void
}

export function SalesForm({ onSuccess }: SalesFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: null,
      product_id: "",
      quantity: 1,
      unit_price: 0,
      sale_type: "Cash",
      sale_date: new Date(),
      notes: ""
    }
  })

  const watchedFields = form.watch(["product_id", "quantity", "unit_price", "sale_type", "customer_id"])

  // Load products and customers
  useEffect(() => {
    async function loadData() {
      try {
        const [productsData, customersData] = await Promise.all([
          getProducts(),
          getCustomers()
        ])
        setProducts(productsData)
        setCustomers(customersData.customers)
      } catch (error) {
        toast.error("Failed to load form data")
      }
    }
    loadData()
  }, [])

  // Auto-update sale type based on customer selection
  useEffect(() => {
    const customerId = form.watch("customer_id")
    if (customerId) {
      form.setValue("sale_type", "Credit")
    }
    // Note: Don't auto-change to Cash when customer is null, let user choose
  }, [form.watch("customer_id")])

  // Auto-fill unit price when product changes
  useEffect(() => {
    const productId = form.watch("product_id")
    const product = products.find(p => p.id === productId)
    if (product) {
      setSelectedProduct(product)
      form.setValue("unit_price", product.current_price)
    } else {
      setSelectedProduct(null)
    }
  }, [form.watch("product_id"), products])

  // Calculate totals
  const quantity = form.watch("quantity") || 0
  const unitPrice = form.watch("unit_price") || 0
  const totalAmount = quantity * unitPrice

  const gstBreakdown = selectedProduct && totalAmount > 0 
    ? calculateGSTFromInclusive(totalAmount, selectedProduct.gst_rate)
    : null

  const onSubmit = async (data: SaleFormData) => {
    setIsLoading(true)
    try {
      await createSale({
        ...data,
        // Auto-calculate totals
        total_amount: totalAmount,
        gst_amount: gstBreakdown?.gstAmount || 0
      })
      toast.success("Sale recorded successfully")
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record sale")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Record New Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={form.handleSubmit(onSubmit)} 
            className="space-y-6"
            action="#"
          >
            {/* Sale Type Selection */}
            <div className="space-y-3">
              <Label>Sale Type</Label>
              <RadioGroup
                value={form.watch("sale_type")}
                onValueChange={(value) => {
                  form.setValue("sale_type", value as "Cash" | "Credit" | "QR")
                  if (value === "Cash" || value === "QR") {
                    form.setValue("customer_id", null)
                  }
                }}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Cash" id="cash" />
                  <Label htmlFor="cash">Cash Sale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="QR" id="qr" />
                  <Label htmlFor="qr">QR Sale</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Credit" id="credit" />
                  <Label htmlFor="credit">Credit Sale</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Customer Selection (for Credit Sales) */}
            {form.watch("sale_type") === "Credit" && (
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <Select
                  value={form.watch("customer_id") || ""}
                  onValueChange={(value) => form.setValue("customer_id", value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer for credit sale" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.billing_name} - {customer.contact_person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.customer_id && (
                  <p className="text-sm text-red-600">{form.formState.errors.customer_id.message}</p>
                )}
              </div>
            )}

            {/* Customer Selection (Optional for Cash Sales) */}
            {form.watch("sale_type") === "Cash" && (
              <div className="space-y-2">
                <Label htmlFor="customer_id">Customer (Optional - for reporting only)</Label>
                <Select
                  value={form.watch("customer_id") || "none"}
                  onValueChange={(value) => form.setValue("customer_id", value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Customer</SelectItem>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.billing_name} - {customer.contact_person}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Note: Customer name is for reporting only. Cash and QR sales won&apos;t appear in customer invoices.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-2">
                <Label htmlFor="product_id">Product *</Label>
                <Select
                  value={form.watch("product_id")}
                  onValueChange={(value) => form.setValue("product_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{product.name}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              ₹{product.current_price}/{product.unit_of_measure}
                            </Badge>
                            {product.gst_rate > 0 && (
                              <Badge variant="outline">
                                GST {product.gst_rate}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.product_id && (
                  <p className="text-sm text-red-600">{form.formState.errors.product_id.message}</p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity ({selectedProduct?.unit_of_measure || "units"}) *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  {...form.register("quantity", { valueAsNumber: true })}
                  placeholder="Enter quantity"
                />
                {form.formState.errors.quantity && (
                  <p className="text-sm text-red-600">{form.formState.errors.quantity.message}</p>
                )}
              </div>

              {/* Unit Price (Editable) */}
              <div className="space-y-2">
                <Label htmlFor="unit_price">
                  Unit Price (₹/{selectedProduct?.unit_of_measure || "unit"}) *
                </Label>
                <Input
                  id="unit_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...form.register("unit_price", { valueAsNumber: true })}
                  placeholder="Price per unit"
                />
                <p className="text-xs text-gray-500">
                  Auto-filled from product, but you can edit if needed
                </p>
                {form.formState.errors.unit_price && (
                  <p className="text-sm text-red-600">{form.formState.errors.unit_price.message}</p>
                )}
              </div>

              {/* Sale Date */}
              <div className="space-y-2">
                <Label>Sale Date *</Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("sale_date") && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.watch("sale_date") ? (
                        format(form.watch("sale_date"), "PPP")
                      ) : (
                        "Pick a date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={form.watch("sale_date")}
                      onSelect={(date) => {
                        form.setValue("sale_date", date || new Date())
                        setShowCalendar(false)
                      }}
                      disabled={(date) => date > new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...form.register("notes")}
                placeholder="Additional notes about this sale..."
                rows={3}
              />
            </div>

            {/* Calculation Summary */}
            {totalAmount > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Quantity:</span>
                      <span>{quantity} {selectedProduct?.unit_of_measure}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Unit Price:</span>
                      <span>{formatCurrency(unitPrice)}</span>
                    </div>
                    {gstBreakdown && selectedProduct?.gst_rate && selectedProduct.gst_rate > 0 && (
                      <>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>Base Amount:</span>
                          <span>{formatCurrency(gstBreakdown.baseAmount)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-600">
                          <span>GST ({selectedProduct.gst_rate}%):</span>
                          <span>{formatCurrency(gstBreakdown.gstAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center text-lg font-semibold border-t pt-2">
                      <span>Total Amount:</span>
                      <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Payment: {form.watch("sale_type") === "Cash" ? "Immediate (Cash)" : form.watch("sale_type") === "QR" ? "Immediate (QR)" : "Credit (Invoice Later)"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || totalAmount <= 0}>
                {isLoading ? "Recording..." : `Record ${form.watch("sale_type")} Sale`}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}