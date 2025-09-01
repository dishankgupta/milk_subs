"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { productSchema, type ProductFormData } from "@/lib/validations"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { toast } from "sonner"

interface ProductFormProps {
  initialData?: Partial<ProductFormData>
  productId?: string
  onSuccess?: () => void
}

export function ProductForm({ initialData, productId, onSuccess }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      code: "",
      current_price: 0,
      unit: "",
      gst_rate: 0,
      unit_of_measure: "liter",
      is_subscription_product: false,
      ...initialData
    }
  })

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true)
    try {
      if (productId) {
        await updateProduct(productId, data)
        toast.success("Product updated successfully")
      } else {
        await createProduct(data)
        toast.success("Product created successfully")
      }
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save product")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Product Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            {...form.register("name")}
            placeholder="e.g., Malai Paneer"
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        {/* Product Code */}
        <div className="space-y-2">
          <Label htmlFor="code">Product Code</Label>
          <Input
            id="code"
            {...form.register("code")}
            placeholder="e.g., MP"
            className="uppercase"
            onChange={(e) => form.setValue("code", e.target.value.toUpperCase())}
          />
          {form.formState.errors.code && (
            <p className="text-sm text-red-600">{form.formState.errors.code.message}</p>
          )}
        </div>

        {/* Unit of Measure */}
        <div className="space-y-2">
          <Label htmlFor="unit_of_measure">Unit of Measure</Label>
          <Select
            value={form.watch("unit_of_measure")}
            onValueChange={(value) => form.setValue("unit_of_measure", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="liter">Liter (L)</SelectItem>
              <SelectItem value="gms">Grams (gms)</SelectItem>
              <SelectItem value="kg">Kilogram (kg)</SelectItem>
              <SelectItem value="pieces">Pieces</SelectItem>
              <SelectItem value="packets">Packets</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.unit_of_measure && (
            <p className="text-sm text-red-600">{form.formState.errors.unit_of_measure.message}</p>
          )}
        </div>

        {/* GST Rate */}
        <div className="space-y-2">
          <Label htmlFor="gst_rate">GST Rate (%)</Label>
          <Input
            id="gst_rate"
            type="number"
            min="0"
            max="30"
            step="0.01"
            {...form.register("gst_rate", { valueAsNumber: true })}
            placeholder="e.g., 5.00"
          />
          {form.formState.errors.gst_rate && (
            <p className="text-sm text-red-600">{form.formState.errors.gst_rate.message}</p>
          )}
        </div>

        {/* GST-Inclusive Price */}
        <div className="space-y-2">
          <Label htmlFor="current_price">GST-Inclusive Price (₹)</Label>
          <Input
            id="current_price"
            type="number"
            min="0.01"
            step="0.01"
            {...form.register("current_price", { valueAsNumber: true })}
            placeholder="e.g., 15.00"
          />
          {form.formState.errors.current_price && (
            <p className="text-sm text-red-600">{form.formState.errors.current_price.message}</p>
          )}
        </div>

        {/* Unit Display */}
        <div className="space-y-2">
          <Label htmlFor="unit">Display Unit</Label>
          <Input
            id="unit"
            {...form.register("unit")}
            placeholder="e.g., per gms, per liter"
          />
          {form.formState.errors.unit && (
            <p className="text-sm text-red-600">{form.formState.errors.unit.message}</p>
          )}
        </div>
      </div>

      {/* GST Calculation Preview */}
      {form.watch("current_price") > 0 && form.watch("gst_rate") > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">GST Breakdown Preview:</h4>
          <GSTBreakdown 
            inclusivePrice={form.watch("current_price")} 
            gstRate={form.watch("gst_rate")} 
          />
        </div>
      )}

      {/* Subscription Product Toggle */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is_subscription_product"
          checked={form.watch("is_subscription_product")}
          onCheckedChange={(checked) => form.setValue("is_subscription_product", !!checked)}
        />
        <Label htmlFor="is_subscription_product" className="text-sm font-normal">
          This product can be used for subscriptions
        </Label>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : productId ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  )
}

// GST Breakdown Component
function GSTBreakdown({ inclusivePrice, gstRate }: { inclusivePrice: number; gstRate: number }) {
  const baseAmount = inclusivePrice / (1 + (gstRate / 100))
  const gstAmount = inclusivePrice - baseAmount

  return (
    <div className="text-sm space-y-1">
      <div>Base Amount: ₹{baseAmount.toFixed(2)}</div>
      <div>GST ({gstRate}%): ₹{gstAmount.toFixed(2)}</div>
      <div className="font-medium border-t pt-1">Total (Inclusive): ₹{inclusivePrice.toFixed(2)}</div>
    </div>
  )
}