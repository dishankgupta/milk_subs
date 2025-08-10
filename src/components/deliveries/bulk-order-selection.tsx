"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Package, CheckCircle2, Filter, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useSorting } from "@/hooks/useSorting"

import type { DailyOrder, Customer, Product, Route } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

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
  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Filter orders based on active filters and search query
  const filteredOrders = useMemo(() => {
    let filtered = orders
    
    // Apply route/time filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(order => {
        const orderFilter = `${order.route.name}-${order.delivery_time}`
        return activeFilters.includes(orderFilter)
      })
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(order => 
        order.customer.billing_name.toLowerCase().includes(query) ||
        order.customer.contact_person.toLowerCase().includes(query) ||
        order.product.name.toLowerCase().includes(query) ||
        order.route.name.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [orders, activeFilters, searchQuery])

  // Apply sorting to filtered orders
  const { sortedData: sortedOrders, sortConfig, handleSort } = useSorting(
    filteredOrders,
    'customer.billing_name',
    'asc'
  )

  const handleOrderToggle = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId])
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(sortedOrders.map(order => order.id))
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

  const selectedOrders = sortedOrders.filter(order => selectedOrderIds.includes(order.id))
  const allFilteredSelected = sortedOrders.length > 0 && selectedOrderIds.length === sortedOrders.length
  const someFilteredSelected = selectedOrderIds.length > 0 && selectedOrderIds.length < sortedOrders.length

  // Calculate totals for selected orders
  const totals = selectedOrders.reduce(
    (acc, order) => ({
      quantity: acc.quantity + order.planned_quantity,
      amount: acc.amount + order.total_amount
    }),
    { quantity: 0, amount: 0 }
  )

  if (!mounted) {
    // Render a loading state during SSR to prevent hydration mismatch
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="h-20 bg-muted rounded-md animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="h-24 bg-muted rounded-md animate-pulse" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="h-16 bg-muted rounded-md animate-pulse" />
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {orders.slice(0, 3).map((order, index) => (
            <Card key={`loading-${index}`}>
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded-md animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

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

      {/* Search and Sort Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, product, or route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Button
                variant={sortConfig?.key === 'customer.billing_name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('customer.billing_name')}
                className="text-xs h-7"
              >
                Customer
                {sortConfig?.key === 'customer.billing_name' && (
                  sortConfig.direction === 'asc' ? 
                    <ArrowUp className="ml-1 h-3 w-3" /> : 
                    <ArrowDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              <Button
                variant={sortConfig?.key === 'order_date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('order_date')}
                className="text-xs h-7"
              >
                Order Date
                {sortConfig?.key === 'order_date' && (
                  sortConfig.direction === 'asc' ? 
                    <ArrowUp className="ml-1 h-3 w-3" /> : 
                    <ArrowDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              <Button
                variant={sortConfig?.key === 'planned_quantity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('planned_quantity')}
                className="text-xs h-7"
              >
                Quantity
                {sortConfig?.key === 'planned_quantity' && (
                  sortConfig.direction === 'asc' ? 
                    <ArrowUp className="ml-1 h-3 w-3" /> : 
                    <ArrowDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              <Button
                variant={sortConfig?.key === 'route.name' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('route.name')}
                className="text-xs h-7"
              >
                Route
                {sortConfig?.key === 'route.name' && (
                  sortConfig.direction === 'asc' ? 
                    <ArrowUp className="ml-1 h-3 w-3" /> : 
                    <ArrowDown className="ml-1 h-3 w-3" />
                )}
              </Button>
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
                    if (el) {
                      const input = el.querySelector('input') as HTMLInputElement
                      if (input) input.indeterminate = someFilteredSelected
                    }
                  }}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({sortedOrders.length})
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
        {sortedOrders.map((order) => (
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
      
      {sortedOrders.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
              <p>No orders match your current search and filter criteria.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}