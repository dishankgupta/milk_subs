"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Package2, Plus, Minus, Trash2, Search } from "lucide-react"
import type { Product } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

interface ProductItem {
  product: Product
  quantity: number
  notes: string
}

interface ProductSelectionCardProps {
  products: Product[]
  selectedProducts: ProductItem[]
  onProductsChange: (products: ProductItem[]) => void
}

export function ProductSelectionCard({ products, selectedProducts, onProductsChange }: ProductSelectionCardProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter products based on search, subscription products only, and exclude already selected ones
  const filteredProducts = products.filter(product => 
    product.is_subscription_product && // Only show subscription products
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedProducts.some(item => item.product.id === product.id)
  ).slice(0, 8) // Limit for performance

  const addProduct = (product: Product) => {
    const newItem: ProductItem = {
      product,
      quantity: 1, // Default quantity
      notes: ""
    }
    onProductsChange([...selectedProducts, newItem])
    setSearchQuery("")
  }

  const updateQuantity = (index: number, newQuantity: number) => {
    const updated = [...selectedProducts]
    updated[index].quantity = Math.max(0, newQuantity)
    onProductsChange(updated)
  }

  const updateNotes = (index: number, notes: string) => {
    const updated = [...selectedProducts]
    updated[index].notes = notes
    onProductsChange(updated)
  }

  const removeProduct = (index: number) => {
    const updated = selectedProducts.filter((_, i) => i !== index)
    onProductsChange(updated)
  }

  const incrementQuantity = (index: number, increment: number) => {
    const current = selectedProducts[index].quantity
    updateQuantity(index, current + increment)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          Product Selection
          {selectedProducts.length > 0 && (
            <Badge variant="secondary">
              {selectedProducts.length} item{selectedProducts.length !== 1 ? 's' : ''} selected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Select subscription products to deliver and specify quantities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Search and Add */}
        <div className="space-y-4">
          <Label>Add Product</Label>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscription products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product Search Results */}
          {searchQuery && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="col-span-2 text-center py-4 text-muted-foreground">
                  <Package2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p>No subscription products found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    className="p-3 h-auto text-left justify-start hover:bg-orange-50 hover:border-orange-300"
                    onClick={() => addProduct(product)}
                  >
                    <div className="w-full space-y-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(product.current_price || 0)}/{product.unit_of_measure}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Code: {product.code}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected Products List */}
        {selectedProducts.length > 0 && (
          <div className="space-y-4">
            <Label className="text-orange-600">Selected Products ({selectedProducts.length})</Label>
            
            {selectedProducts.map((item, index) => {
              const itemTotal = item.quantity * (item.product.current_price || 0)
              
              return (
                <Card key={item.product.id} className="border-orange-200">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      {/* Product Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{item.product.name}</h4>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(item.product.current_price || 0)}/{item.product.unit_of_measure} • Code: {item.product.code}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProduct(index)}
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Quantity Controls */}
                        <div className="space-y-2">
                          <Label>Quantity ({item.product.unit_of_measure})</Label>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => incrementQuantity(index, -0.5)}
                              disabled={item.quantity <= 0}
                              className="h-10 w-10 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, Number(e.target.value) || 0)}
                              className="text-center"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => incrementQuantity(index, 0.5)}
                              className="h-10 w-10 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="space-y-2">
                          <Label>Item Total</Label>
                          <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center font-medium text-orange-600">
                            {formatCurrency(itemTotal)}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                          placeholder="Any special notes for this item..."
                          value={item.notes}
                          onChange={(e) => updateNotes(index, e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Products Summary */}
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">Products Summary</h4>
                    <div className="text-sm text-muted-foreground">
                      {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">
                      {formatCurrency(selectedProducts.reduce((sum, item) => sum + (item.quantity * (item.product.current_price || 0)), 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {selectedProducts.length === 0 && !searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Package2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No products selected yet</p>
            <p className="text-sm">Search for subscription products above to add them to the delivery</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}