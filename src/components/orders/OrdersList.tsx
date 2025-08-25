"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { getDailyOrders } from "@/lib/actions/orders"
import { DailyOrder } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { formatDateForDatabase, getCurrentISTDate } from "@/lib/date-utils"
import { Search, MapPin, Clock, Package, Truck } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function OrdersList() {
  const [orders, setOrders] = useState<DailyOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState(formatDateForDatabase(getCurrentISTDate()))
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [routeFilter, setRouteFilter] = useState<string>("all")

  const loadOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getDailyOrders(selectedDate)
      if (result.success) {
        setOrders(result.data || [])
      } else {
        toast.error(result.error || "Failed to load orders")
        setOrders([])
      }
    } catch {
      toast.error("Failed to load orders")
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      const matchesSearch = !searchQuery || 
        order.customer?.billing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.product?.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || order.status === statusFilter
      const matchesRoute = routeFilter === "all" || order.route_id === routeFilter

      return matchesSearch && matchesStatus && matchesRoute
    })
    
    // Sort by billing name ascending
    return filtered.sort((a, b) => {
      const nameA = a.customer?.billing_name?.toLowerCase() || ''
      const nameB = b.customer?.billing_name?.toLowerCase() || ''
      return nameA.localeCompare(nameB)
    })
  }, [orders, searchQuery, statusFilter, routeFilter])

  const uniqueRoutes = useMemo(() => {
    const routes = orders.map(order => ({
      id: order.route_id,
      name: order.route?.name || `Route ${order.route_id}`
    }))
    return Array.from(new Map(routes.map(route => [route.id, route])).values())
  }, [orders])

  const summary = useMemo(() => {
    const total = filteredOrders.reduce((sum, order) => sum + order.total_amount, 0)
    const byStatus = filteredOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return { total, count: filteredOrders.length, byStatus }
  }, [filteredOrders])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
          <div className="ml-auto h-10 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by customer or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Generated">Generated</SelectItem>
              <SelectItem value="Delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              {uniqueRoutes.map(route => (
                <SelectItem key={route.id} value={route.id}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div className="ml-2">
                  <div className="text-2xl font-bold">{summary.count}</div>
                  <div className="text-xs text-muted-foreground">Total Orders</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="ml-2">
                  <div className="text-2xl font-bold">{formatCurrency(summary.total)}</div>
                  <div className="text-xs text-muted-foreground">Total Value</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="ml-2">
                  <div className="text-2xl font-bold">{summary.byStatus.Generated || 0}</div>
                  <div className="text-xs text-muted-foreground">Generated</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="ml-2">
                  <div className="text-2xl font-bold">{summary.byStatus.Delivered || 0}</div>
                  <div className="text-xs text-muted-foreground">Delivered</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-2">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {orders.length === 0 
                  ? `No orders exist for ${selectedDate}. Generate orders first.`
                  : "No orders match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-semibold">{order.customer?.billing_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {order.customer?.contact_person}
                        </div>
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Package className="h-4 w-4 mr-1" />
                        {order.product?.name}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-1" />
                        {order.route?.name}
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {order.delivery_time}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-semibold">
                        {order.planned_quantity}L × {formatCurrency(order.unit_price)}
                      </div>
                      <div className="text-lg font-bold">{formatCurrency(order.total_amount)}</div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={order.status === "Delivered" ? "default" : 
                                 order.status === "Generated" ? "secondary" : "outline"}
                      >
                        {order.status}
                      </Badge>
                      
                      {order.status === "Generated" && (
                        <Link href={`/dashboard/deliveries/new?order_id=${order.id}`}>
                          <Button size="sm">
                            <Truck className="mr-1 h-3 w-3" />
                            Confirm Delivery
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Results count */}
      {filteredOrders.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredOrders.length} of {orders.length} orders for {selectedDate}
        </div>
      )}
    </div>
  )
}