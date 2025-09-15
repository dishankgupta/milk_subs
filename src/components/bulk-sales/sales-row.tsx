"use client"

import { useState, useEffect } from "react"
import { UseFormReturn } from "react-hook-form"
import { Trash2, CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency, calculateGSTFromInclusive } from "@/lib/utils"
import { getCurrentISTDate } from "@/lib/date-utils"

import type { Product, Customer, SaleFormData } from "@/lib/types"

interface SalesRowProps {
  index: number
  form: UseFormReturn<{ sales: SaleFormData[] }>
  products: Product[]
  customers: Customer[]
  onRemove: (index: number) => void
  canRemove: boolean
}

export function SalesRow({
  index,
  form,
  products,
  customers,
  onRemove,
  canRemove
}: SalesRowProps) {
  const [showCalendar, setShowCalendar] = useState(false)

  const watchedSale = form.watch(`sales.${index}`)
  const selectedProduct = products.find(p => p.id === watchedSale?.product_id)

  // Auto-fill unit price when product changes
  useEffect(() => {
    if (selectedProduct && watchedSale) {
      form.setValue(`sales.${index}.unit_price`, selectedProduct.current_price)
    }
  }, [selectedProduct, form, index])

  // Auto-update sale type based on customer selection
  useEffect(() => {
    if (watchedSale?.customer_id) {
      form.setValue(`sales.${index}.sale_type`, "Credit")
    }
  }, [watchedSale?.customer_id, form, index])

  // Calculate totals
  const quantity = watchedSale?.quantity || 0
  const unitPrice = watchedSale?.unit_price || 0
  const totalAmount = quantity * unitPrice

  const gstBreakdown = selectedProduct && totalAmount > 0
    ? calculateGSTFromInclusive(totalAmount, selectedProduct.gst_rate)
    : null

  const errors = form.formState.errors.sales?.[index]

  return (
    <tr className="border-b">
      {/* Remove Button */}
      <td className="p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>

      {/* Sale Type */}
      <td className="p-2 min-w-[120px]">
        <Select
          value={watchedSale?.sale_type || "Cash"}
          onValueChange={(value) => {
            form.setValue(`sales.${index}.sale_type`, value as "Cash" | "Credit" | "QR")
            if (value === "Cash" || value === "QR") {
              form.setValue(`sales.${index}.customer_id`, null)
            }
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="QR">QR</SelectItem>
            <SelectItem value="Credit">Credit</SelectItem>
          </SelectContent>
        </Select>
        {errors?.sale_type && (
          <p className="text-xs text-red-600 mt-1">{errors.sale_type.message}</p>
        )}
      </td>

      {/* Customer */}
      <td className="p-2 min-w-[200px]">
        <Select
          value={watchedSale?.customer_id || "none"}
          onValueChange={(value) => form.setValue(`sales.${index}.customer_id`, value === "none" ? null : value)}
          disabled={watchedSale?.sale_type === "Cash" || watchedSale?.sale_type === "QR"}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Customer</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.billing_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.customer_id && (
          <p className="text-xs text-red-600 mt-1">{errors.customer_id.message}</p>
        )}
      </td>

      {/* Product */}
      <td className="p-2 min-w-[250px]">
        <Select
          value={watchedSale?.product_id || ""}
          onValueChange={(value) => form.setValue(`sales.${index}.product_id`, value)}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="Select product" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{product.name}</span>
                  <div className="flex items-center space-x-2 ml-2">
                    <Badge variant="secondary" className="text-xs">
                      ₹{product.current_price}
                    </Badge>
                    {product.gst_rate > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {product.gst_rate}%
                      </Badge>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.product_id && (
          <p className="text-xs text-red-600 mt-1">{errors.product_id.message}</p>
        )}
      </td>

      {/* Quantity */}
      <td className="p-2 min-w-[100px]">
        <Input
          type="number"
          min="0.001"
          step="0.001"
          className="h-8"
          placeholder="Qty"
          value={watchedSale?.quantity || ""}
          onChange={(e) => form.setValue(`sales.${index}.quantity`, parseFloat(e.target.value) || 0)}
        />
        {selectedProduct && (
          <p className="text-xs text-gray-500 mt-1">{selectedProduct.unit_of_measure}</p>
        )}
        {errors?.quantity && (
          <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>
        )}
      </td>

      {/* Unit Price */}
      <td className="p-2 min-w-[100px]">
        <Input
          type="number"
          min="0.01"
          step="0.01"
          className="h-8"
          placeholder="Price"
          value={watchedSale?.unit_price || ""}
          onChange={(e) => form.setValue(`sales.${index}.unit_price`, parseFloat(e.target.value) || 0)}
        />
        {errors?.unit_price && (
          <p className="text-xs text-red-600 mt-1">{errors.unit_price.message}</p>
        )}
      </td>

      {/* Total */}
      <td className="p-2 min-w-[120px]">
        <div className="space-y-1">
          <div className="font-medium text-green-600">
            {formatCurrency(totalAmount)}
          </div>
          {gstBreakdown && selectedProduct?.gst_rate && selectedProduct.gst_rate > 0 && (
            <div className="text-xs text-gray-600">
              GST: {formatCurrency(gstBreakdown.gstAmount)}
            </div>
          )}
        </div>
      </td>

      {/* Sale Date */}
      <td className="p-2 min-w-[140px]">
        <Popover open={showCalendar} onOpenChange={setShowCalendar}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 justify-start text-left font-normal",
                !watchedSale?.sale_date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {watchedSale?.sale_date ? (
                format(watchedSale.sale_date, "MMM dd")
              ) : (
                "Date"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={watchedSale?.sale_date}
              onSelect={(date) => {
                form.setValue(`sales.${index}.sale_date`, date || getCurrentISTDate())
                setShowCalendar(false)
              }}
              disabled={(date) => date > new Date()}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors?.sale_date && (
          <p className="text-xs text-red-600 mt-1">{errors.sale_date.message}</p>
        )}
      </td>

      {/* Notes */}
      <td className="p-2 min-w-[150px]">
        <Input
          className="h-8"
          placeholder="Notes (optional)"
          value={watchedSale?.notes || ""}
          onChange={(e) => form.setValue(`sales.${index}.notes`, e.target.value)}
        />
        {errors?.notes && (
          <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </td>
    </tr>
  )
}