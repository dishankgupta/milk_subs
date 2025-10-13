"use client"

import { useState, useEffect } from "react"
import { useFieldArray, Control, UseFormWatch } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Plus, Minus, ChevronDown, ChevronRight, Package2, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { Product } from "@/lib/types"
import type { DeliveryWithAdditionalItemsFormData, AdditionalItemFormData } from "@/lib/validations"

interface AdditionalItemsFormSectionProps {
  control: Control<DeliveryWithAdditionalItemsFormData>
  watch: UseFormWatch<DeliveryWithAdditionalItemsFormData>
  products: Product[]
  onTotalUpdate?: (total: number) => void
}

export function AdditionalItemsFormSection({ 
  control, 
  watch, 
  products, 
  onTotalUpdate 
}: AdditionalItemsFormSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [additionalTotal, setAdditionalTotal] = useState(0)

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "additional_items"
  })

  // Watch all additional items for real-time calculations
  const additionalItems = watch("additional_items") || []

  // Calculate total whenever items change
  useEffect(() => {
    const total = additionalItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0
      const unitPrice = Number(item?.unit_price) || 0
      return sum + (quantity * unitPrice)
    }, 0)
    
    setAdditionalTotal(total)
    onTotalUpdate?.(total)
  }, [additionalItems, onTotalUpdate])

  const addItem = () => {
    append({
      product_id: "",
      quantity: 0,
      unit_price: 0,
      notes: ""
    })
    if (!isOpen) setIsOpen(true)
  }

  const removeItem = (index: number) => {
    remove(index)
  }

  const updateItemQuantity = (index: number, change: number) => {
    const currentItem = additionalItems[index]
    if (!currentItem) return

    const newQuantity = Math.max(0, (currentItem.quantity || 0) + change)
    update(index, {
      ...currentItem,
      quantity: newQuantity
    })
  }

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId)
    if (!selectedProduct) return

    const currentItem = additionalItems[index]
    update(index, {
      ...currentItem,
      product_id: productId,
      unit_price: selectedProduct.current_price || 0
    })
  }

  const hasItems = fields.length > 0
  const itemsWithValues = additionalItems.filter(item => 
    item?.product_id && (item?.quantity || 0) > 0
  )

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package2 className="h-5 w-5" />
                Additional Items
                {itemsWithValues.length > 0 && (
                  <Badge variant="secondary">
                    {itemsWithValues.length} item{itemsWithValues.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {additionalTotal > 0 && (
                  <Badge variant="outline" className="text-green-600">
                    {formatCurrency(additionalTotal)}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Add extra products delivered to this customer that aren&apos;t part of their subscription order.
            </div>

            {/* Add Item Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Additional Item
              </Button>
            </div>

            {/* Additional Items List */}
            {hasItems && (
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const currentItem = additionalItems[index] || {}
                  const itemTotal = (currentItem.quantity || 0) * (currentItem.unit_price || 0)
                  
                  return (
                    <Card key={field.id} className="border-l-4 border-l-orange-400">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-sm font-medium">Additional Item #{index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Product Selection */}
                          <div className="space-y-2">
                            <Label>Product <span className="text-red-500">*</span></Label>
                            <Select
                              value={currentItem.product_id || ""}
                              onValueChange={(value) => handleProductSelect(index, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <div className="flex flex-col">
                                      <span>{product.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {formatCurrency(product.current_price || 0)}/{product.unit_of_measure}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Quantity with +/- Controls */}
                          <div className="space-y-2">
                            <Label>Quantity <span className="text-red-500">*</span></Label>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateItemQuantity(index, -0.5)}
                                disabled={(currentItem.quantity || 0) <= 0}
                                className="h-10 w-10 p-0"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={currentItem.quantity || 0}
                                onChange={(e) => {
                                  const newQuantity = Number(e.target.value) || 0
                                  update(index, {
                                    ...currentItem,
                                    quantity: newQuantity
                                  })
                                }}
                                className="text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateItemQuantity(index, 0.5)}
                                className="h-10 w-10 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div className="space-y-2">
                            <Label>Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={currentItem.unit_price || 0}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value) || 0
                                update(index, {
                                  ...currentItem,
                                  unit_price: newPrice
                                })
                              }}
                            />
                          </div>

                          {/* Item Total */}
                          <div className="space-y-2">
                            <Label>Total</Label>
                            <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center font-medium">
                              {formatCurrency(itemTotal)}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="mt-4">
                          <Label>Notes (Optional)</Label>
                          <Textarea
                            placeholder="Any notes for this additional item..."
                            value={currentItem.notes || ""}
                            onChange={(e) => {
                              update(index, {
                                ...currentItem,
                                notes: e.target.value
                              })
                            }}
                            className="mt-2"
                            rows={2}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Additional Items Summary */}
                {additionalTotal > 0 && (
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Additional Items Total:</span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(additionalTotal)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {itemsWithValues.length} additional item{itemsWithValues.length !== 1 ? 's' : ''} selected
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Empty State */}
            {!hasItems && (
              <div className="text-center py-8 text-muted-foreground">
                <Package2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No additional items added yet.</p>
                <p className="text-sm">Click &quot;Add Additional Item&quot; to record extra products delivered.</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}