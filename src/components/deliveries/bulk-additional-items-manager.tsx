"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Plus, Minus, Package2, ChevronDown, ChevronRight, X, ShoppingCart } from "lucide-react"
import type { Product, Customer } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface AdditionalItem {
  product_id: string
  product: Product
  quantity: number
  notes: string
}

interface CustomerAdditionalItems {
  customer_id: string
  customer: Customer
  items: AdditionalItem[]
  isExpanded: boolean
}

interface BulkAdditionalItemsManagerProps {
  customers: Customer[]
  products: Product[]
  onAdditionalItemsChange: (customerItems: CustomerAdditionalItems[]) => void
}

export function BulkAdditionalItemsManager({ 
  customers, 
  products, 
  onAdditionalItemsChange 
}: BulkAdditionalItemsManagerProps) {
  const [customerItems, setCustomerItems] = useState<CustomerAdditionalItems[]>([])
  const [quickSelectProducts, setQuickSelectProducts] = useState<Product[]>([])

  // Initialize customer items structure with useCallback to prevent unnecessary re-renders
  const initializeCustomerItems = useCallback(() => {
    const initialItems = customers.map(customer => ({
      customer_id: customer.id,
      customer,
      items: [],
      isExpanded: false
    }))
    setCustomerItems(initialItems)
  }, [customers])

  useEffect(() => {
    initializeCustomerItems()
  }, [initializeCustomerItems])

  // Set quick-select products (most common dairy items) with useMemo for better performance
  const commonProducts = useMemo(() => {
    return products
      .filter(product => 
        product.name.toLowerCase().includes('milk') ||
        product.name.toLowerCase().includes('ghee') ||
        product.name.toLowerCase().includes('paneer')
      )
      .slice(0, 6) // Limit to 6 for mobile UI
  }, [products])

  useEffect(() => {
    setQuickSelectProducts(commonProducts)
  }, [commonProducts])

  // Notify parent of changes with useCallback to prevent infinite loops
  const notifyParentOfChanges = useCallback(() => {
    onAdditionalItemsChange(customerItems)
  }, [customerItems, onAdditionalItemsChange])

  useEffect(() => {
    notifyParentOfChanges()
  }, [notifyParentOfChanges])

  // Toggle customer section expansion with useCallback to prevent re-renders
  const toggleCustomerExpansion = useCallback((customerId: string) => {
    setCustomerItems(prev => prev.map(item => 
      item.customer_id === customerId 
        ? { ...item, isExpanded: !item.isExpanded }
        : item
    ))
  }, [])

  // Add product to customer with useCallback to prevent re-renders
  const addProductToCustomer = useCallback((customerId: string, product: Product) => {
    setCustomerItems(prev => prev.map(item => {
      if (item.customer_id === customerId) {
        // Check if product already exists
        const existingItemIndex = item.items.findIndex(i => i.product_id === product.id)
        if (existingItemIndex !== -1) {
          // Increment existing quantity
          const updatedItems = [...item.items]
          updatedItems[existingItemIndex].quantity += 0.5
          return { ...item, items: updatedItems }
        } else {
          // Add new item
          const newItem: AdditionalItem = {
            product_id: product.id,
            product,
            quantity: 0.5,
            notes: ""
          }
          return { 
            ...item, 
            items: [...item.items, newItem],
            isExpanded: true // Auto-expand when adding item
          }
        }
      }
      return item
    }))
  }, [])

  // Update item quantity with mobile-friendly +/- controls
  const updateItemQuantity = useCallback((customerId: string, productId: string, delta: number) => {
    setCustomerItems(prev => prev.map(item => {
      if (item.customer_id === customerId) {
        const updatedItems = item.items.map(i => {
          if (i.product_id === productId) {
            const newQuantity = Math.max(0, i.quantity + delta)
            return { ...i, quantity: newQuantity }
          }
          return i
        }).filter(i => i.quantity > 0) // Remove items with 0 quantity
        
        return { ...item, items: updatedItems }
      }
      return item
    }))
  }, [])

  // Set item quantity directly
  const setItemQuantity = useCallback((customerId: string, productId: string, quantity: number) => {
    setCustomerItems(prev => prev.map(item => {
      if (item.customer_id === customerId) {
        const updatedItems = item.items.map(i => {
          if (i.product_id === productId) {
            return { ...i, quantity: Math.max(0, quantity) }
          }
          return i
        }).filter(i => i.quantity > 0) // Remove items with 0 quantity
        
        return { ...item, items: updatedItems }
      }
      return item
    }))
  }, [])

  // Update item notes
  const updateItemNotes = useCallback((customerId: string, productId: string, notes: string) => {
    setCustomerItems(prev => prev.map(item => {
      if (item.customer_id === customerId) {
        const updatedItems = item.items.map(i => {
          if (i.product_id === productId) {
            return { ...i, notes }
          }
          return i
        })
        return { ...item, items: updatedItems }
      }
      return item
    }))
  }, [])

  // Remove item from customer
  const removeItemFromCustomer = useCallback((customerId: string, productId: string) => {
    setCustomerItems(prev => prev.map(item => {
      if (item.customer_id === customerId) {
        const updatedItems = item.items.filter(i => i.product_id !== productId)
        return { ...item, items: updatedItems }
      }
      return item
    }))
  }, [])

  // Calculate totals
  const totals = useMemo(() => {
    const totalItems = customerItems.reduce((sum, customer) => sum + customer.items.length, 0)
    const totalQuantity = customerItems.reduce((sum, customer) => 
      sum + customer.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    )
    const totalAmount = customerItems.reduce((sum, customer) => 
      sum + customer.items.reduce((itemSum, item) => 
        itemSum + (item.quantity * item.product.current_price), 0
      ), 0
    )
    const customersWithItems = customerItems.filter(customer => customer.items.length > 0).length
    
    return { totalItems, totalQuantity, totalAmount, customersWithItems }
  }, [customerItems])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package2 className="h-5 w-5 text-orange-600" />
          Additional Items 
          {totals.totalItems > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              {totals.totalItems} item{totals.totalItems !== 1 ? 's' : ''} • {totals.customersWithItems} customer{totals.customersWithItems !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Quick Product Selection */}
        {quickSelectProducts.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium text-orange-600">Quick Add Common Products</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {quickSelectProducts.map((product) => (
                <div key={product.id} className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-auto p-2 text-xs hover:bg-orange-50 hover:border-orange-300"
                    onClick={() => {
                      // Show customers that can have this product added
                      const availableCustomers = customers.slice(0, 3) // Show first 3 for demo
                      availableCustomers.forEach(customer => {
                        addProductToCustomer(customer.id, product)
                      })
                    }}
                  >
                    <div className="text-center">
                      <div className="font-medium truncate">{product.name}</div>
                      <div className="text-muted-foreground">{formatCurrency(product.current_price)}/{product.unit_of_measure}</div>
                    </div>
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Tap a product to add it to the first few customers, then expand individual customers below to customize
            </p>
          </div>
        )}

        {/* Customer-wise Additional Items */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Individual Customer Additional Items</Label>
          
          {customerItems.map((customerItem) => {
            const customerTotal = customerItem.items.reduce((sum, item) => 
              sum + (item.quantity * item.product.current_price), 0
            )
            
            return (
              <Card key={customerItem.customer_id} className={cn(
                "border transition-colors",
                customerItem.items.length > 0 
                  ? "border-orange-200 bg-orange-50/30" 
                  : "border-gray-200"
              )}>
                <Collapsible 
                  open={customerItem.isExpanded}
                  onOpenChange={() => toggleCustomerExpansion(customerItem.customer_id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        {customerItem.isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div>
                          <div className="font-medium">{customerItem.customer.billing_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customerItem.customer.contact_person} • {customerItem.customer.phone_primary}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {customerItem.items.length > 0 && (
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              {customerItem.items.length} item{customerItem.items.length !== 1 ? 's' : ''}
                            </Badge>
                            <div className="text-sm font-medium text-orange-600">
                              {formatCurrency(customerTotal)}
                            </div>
                          </div>
                        )}
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4">
                      
                      {/* Quick Product Add for this Customer */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Quick Add:</Label>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
                          {quickSelectProducts.slice(0, 6).map((product) => (
                            <Button
                              key={product.id}
                              variant="outline"
                              size="sm"
                              className="h-8 p-1 text-xs hover:bg-orange-50 hover:border-orange-300"
                              onClick={() => addProductToCustomer(customerItem.customer_id, product)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {product.name.split(' ')[0]}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Selected Items for this Customer */}
                      {customerItem.items.length > 0 && (
                        <div className="space-y-3">
                          {customerItem.items.map((item) => (
                            <Card key={item.product_id} className="border-orange-200">
                              <CardContent className="p-3">
                                <div className="space-y-3">
                                  {/* Product Header */}
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-medium text-sm">{item.product.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatCurrency(item.product.current_price)}/{item.product.unit_of_measure} • Code: {item.product.code}
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeItemFromCustomer(customerItem.customer_id, item.product_id)}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* Mobile-Optimized Quantity Controls */}
                                    <div className="space-y-1">
                                      <Label className="text-xs">Quantity ({item.product.unit_of_measure})</Label>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateItemQuantity(customerItem.customer_id, item.product_id, -0.5)}
                                          disabled={item.quantity <= 0}
                                          className="h-8 w-8 p-0 touch-manipulation"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          value={item.quantity}
                                          onChange={(e) => setItemQuantity(
                                            customerItem.customer_id, 
                                            item.product_id, 
                                            Number(e.target.value) || 0
                                          )}
                                          className="text-center h-8 font-mono"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => updateItemQuantity(customerItem.customer_id, item.product_id, 0.5)}
                                          className="h-8 w-8 p-0 touch-manipulation"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Item Total */}
                                    <div className="space-y-1">
                                      <Label className="text-xs">Item Total</Label>
                                      <div className="h-8 px-2 py-1 border rounded-md bg-orange-50 flex items-center text-sm font-medium text-orange-600">
                                        {formatCurrency(item.quantity * item.product.current_price)}
                                      </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-1 md:col-span-1">
                                      <Label className="text-xs">Notes</Label>
                                      <Input
                                        placeholder="Optional notes..."
                                        value={item.notes}
                                        onChange={(e) => updateItemNotes(
                                          customerItem.customer_id, 
                                          item.product_id, 
                                          e.target.value
                                        )}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {customerItem.items.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground">
                          <Package2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No additional items added</p>
                          <p className="text-xs">Use Quick Add buttons above to add products</p>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>

        {/* Summary Section */}
        {totals.totalItems > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Items</div>
                  <div className="font-bold text-orange-600">{totals.totalItems}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                  <div className="font-bold text-orange-600">{totals.totalQuantity}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="font-bold text-orange-600">{formatCurrency(totals.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Customers</div>
                  <div className="font-bold text-orange-600">{totals.customersWithItems}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {totals.totalItems === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No additional items added yet</p>
            <p className="text-xs">Use the Quick Add buttons above or expand individual customers to add additional products</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}