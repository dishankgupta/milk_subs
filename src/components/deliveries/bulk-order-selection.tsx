"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Package, CheckCircle2, Filter } from "lucide-react"

import type { DailyOrder, Customer, Product, Route } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface BulkOrderSelectionProps {
  orders: (DailyOrder & {
    customer: Customer
    product: Product
    route: Route
  })[]
}

type FilterOption = {
  label: string
  value: string
  count: number
}

export function BulkOrderSelection({ orders }: BulkOrderSelectionProps) {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const router = useRouter()

  // Calculate filter options
  const filterOptions = useMemo((): FilterOption[] => {
    const routeTimeCombinations = new Map<string, number>()
    
    orders.forEach(order => {
      const key = `${order.route.name}-${order.delivery_time}`
      routeTimeCombinations.set(key, (routeTimeCombinations.get(key) || 0) + 1)
    })
    
    const options: FilterOption[] = []
    routeTimeCombinations.forEach((count, key) => {
      options.push({
        label: key.replace('-', ' '),
        value: key,
        count
      })
    })
    
    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [orders])

  // Filter orders based on active filters
  const filteredOrders = useMemo(() => {
    if (activeFilters.length === 0) return orders
    
    return orders.filter(order => {
      const orderFilter = `${order.route.name}-${order.delivery_time}`
      return activeFilters.includes(orderFilter)
    })
  }, [orders, activeFilters])

  const handleOrderToggle = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId])
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(order => order.id))
    } else {
      setSelectedOrderIds([])
    }
  }

  const handleFilterToggle = (filterValue: string) => {
    setActiveFilters(prev => {
      if (prev.includes(filterValue)) {
        return prev.filter(f => f !== filterValue)
      } else {
        return [...prev, filterValue]
      }
    })
    // Clear selected orders when filters change
    setSelectedOrderIds([])
  }

  const handleBulkDelivery = () => {
    if (selectedOrderIds.length === 0) return
    
    // Navigate to bulk delivery page with selected order IDs
    const orderIdsParam = selectedOrderIds.join(',')
    router.push(`/dashboard/deliveries/bulk?order_ids=${orderIdsParam}`)
  }

  const selectedOrders = filteredOrders.filter(order => selectedOrderIds.includes(order.id))
  const allFilteredSelected = filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length
  const someFilteredSelected = selectedOrderIds.length > 0 && selectedOrderIds.length < filteredOrders.length

  // Calculate totals for selected orders
  const totals = selectedOrders.reduce(
    (acc, order) => ({
      quantity: acc.quantity + order.planned_quantity,
      amount: acc.amount + order.total_amount
    }),
    { quantity: 0, amount: 0 }
  )

  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Quick Filters</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant={activeFilters.includes(option.value) ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => handleFilterToggle(option.value)}
                >
                  {option.label} ({option.count})
                </Badge>
              ))}
              {activeFilters.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setActiveFilters([])}
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={allFilteredSelected}
                  onCheckedChange={handleSelectAll}
                  ref={(el) => {
                    if (el) el.indeterminate = someFilteredSelected
                  }}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({filteredOrders.length})
                </label>
              </div>
              
              {selectedOrderIds.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{selectedOrderIds.length} selected</span>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{totals.quantity}L total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(totals.amount)} total</span>
                  </div>
                </div>
              )}
            </div>

            {selectedOrderIds.length > 0 && (
              <Button onClick={handleBulkDelivery}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Bulk Confirm ({selectedOrderIds.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="grid gap-4">
        {filteredOrders.map((order) => (
          <Card 
            key={order.id} 
            className={`hover:shadow-md transition-all ${selectedOrderIds.includes(order.id) ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedOrderIds.includes(order.id)}
                  onCheckedChange={(checked) => handleOrderToggle(order.id, !!checked)}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                  <div>
                    <div className="font-medium">{order.customer.billing_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer.contact_person}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium">{order.product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.planned_quantity}L @ {formatCurrency(order.unit_price)}/L
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium">{order.route.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.delivery_time} • {format(new Date(order.order_date), "PP")}
                    </div>
                  </div>
                  
                  <div>
                    <div className="font-medium">{formatCurrency(order.total_amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: Generated
                    </div>
                  </div>
                </div>
                
                <Link href={`/dashboard/deliveries/new?order_id=${order.id}`}>
                  <Button variant="outline" size="sm">
                    <Package className="mr-2 h-4 w-4" />
                    Individual
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {filteredOrders.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p>No orders match your current filter criteria.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}