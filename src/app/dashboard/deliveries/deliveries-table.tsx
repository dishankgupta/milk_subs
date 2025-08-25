"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { formatDateToIST, formatDateTimeToIST } from "@/lib/utils"
import { MoreHorizontal, Eye, Edit, Trash2, Package, User, Clock, ArrowUp, ArrowDown, Search } from "lucide-react"
import { useSorting } from "@/hooks/useSorting"

import type { Delivery, DailyOrder, Customer, Product, Route } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { deleteDelivery, bulkDeleteDeliveries } from "@/lib/actions/deliveries"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface DeliveriesTableProps {
  initialDeliveries: (Delivery & {
    daily_order: DailyOrder & {
      customer: Customer
      product: Product
      route: Route
    }
  })[]
  onDataChange?: () => void
}

export function DeliveriesTable({ initialDeliveries, onDataChange }: DeliveriesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [routeFilter, setRouteFilter] = useState<string>("all")
  const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Filter deliveries based on search and filters (client-side only)
  const filteredDeliveries = initialDeliveries.filter(delivery => {
    const matchesSearch = !searchQuery || 
      delivery.delivery_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.delivery_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.daily_order.customer.billing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.daily_order.customer.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDate = dateFilter === "all" || 
      delivery.daily_order.order_date === dateFilter
    
    const matchesRoute = routeFilter === "all" || 
      delivery.daily_order.route.name === routeFilter

    return matchesSearch && matchesDate && matchesRoute
  })

  // Apply sorting to filtered deliveries with default sort by order date descending
  const { sortedData: sortedDeliveries, sortConfig, handleSort } = useSorting(
    filteredDeliveries,
    'daily_order.order_date',
    'desc',
    (delivery, key) => {
      if (key === 'variance') {
        return (delivery.actual_quantity || 0) - delivery.daily_order.planned_quantity
      }
      return null // Use default behavior for other keys
    }
  )

  // Handle search functionality (client-side filtering)
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Get unique dates and routes for filters
  const uniqueDates = Array.from(new Set(initialDeliveries.map(d => d.daily_order.order_date))).sort().reverse()
  const uniqueRoutes = Array.from(new Set(initialDeliveries.map(d => d.daily_order.route.name)))

  async function handleDelete(id: string, customerName: string) {
    if (!confirm(`Are you sure you want to delete the delivery for ${customerName}?`)) {
      return
    }

    setDeletingId(id)
    try {
      await deleteDelivery(id)
      toast.success("Delivery deleted successfully")
      onDataChange?.()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error("Failed to delete delivery")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleBulkDelete() {
    if (selectedDeliveries.size === 0) {
      toast.error("No deliveries selected")
      return
    }

    const selectedCount = selectedDeliveries.size
    if (!confirm(`Are you sure you want to delete ${selectedCount} selected deliveries?`)) {
      return
    }

    setBulkDeleting(true)
    const deliveryIds = Array.from(selectedDeliveries)

    try {
      const { successCount, failureCount } = await bulkDeleteDeliveries(deliveryIds)
      
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} deliveries`)
        onDataChange?.()
      }
      if (failureCount > 0) {
        toast.error(`Failed to delete ${failureCount} deliveries`)
      }

      setSelectedDeliveries(new Set())
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error("Failed to delete deliveries")
    } finally {
      setBulkDeleting(false)
    }
  }

  function handleSelectDelivery(deliveryId: string, checked: boolean) {
    const newSelected = new Set(selectedDeliveries)
    if (checked) {
      newSelected.add(deliveryId)
    } else {
      newSelected.delete(deliveryId)
    }
    setSelectedDeliveries(newSelected)
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedDeliveries(new Set(sortedDeliveries.map(d => d.id)))
    } else {
      setSelectedDeliveries(new Set())
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deliveries by customer, delivery person, or notes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                {uniqueDates.map(date => (
                  <SelectItem key={date} value={date}>
                    {formatDateToIST(new Date(date))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {uniqueRoutes.map(route => (
                  <SelectItem key={route} value={route}>{route}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Sort Options and Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Showing {sortedDeliveries.length} delivery{sortedDeliveries.length !== 1 ? 'ies' : 'y'}
          </div>
          {selectedDeliveries.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedDeliveries.size} selected
              </span>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                {bulkDeleting ? "Deleting..." : "Delete Selected"}
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Button
            variant={sortConfig?.key === 'daily_order.customer.billing_name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('daily_order.customer.billing_name')}
            className="text-xs h-7"
          >
            Customer
            {sortConfig?.key === 'daily_order.customer.billing_name' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'daily_order.order_date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('daily_order.order_date')}
            className="text-xs h-7"
          >
            Order Date
            {sortConfig?.key === 'daily_order.order_date' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'actual_quantity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('actual_quantity')}
            className="text-xs h-7"
          >
            Quantity
            {sortConfig?.key === 'actual_quantity' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'delivered_at' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('delivered_at')}
            className="text-xs h-7"
          >
            Delivered At
            {sortConfig?.key === 'delivered_at' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'variance' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('variance')}
            className="text-xs h-7"
          >
            Variance
            {sortConfig?.key === 'variance' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Results */}
      {sortedDeliveries.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
              <p>No delivery records match your current search criteria.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All Row */}
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
            <Checkbox 
              checked={sortedDeliveries.length > 0 && selectedDeliveries.size === sortedDeliveries.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({sortedDeliveries.length} deliveries)
            </span>
          </div>
          
          {sortedDeliveries.map((delivery) => {
            const order = delivery.daily_order
            const quantityVariance = (delivery.actual_quantity || 0) - order.planned_quantity
            const amountVariance = quantityVariance * order.unit_price

            return (
              <Card key={delivery.id} className={`hover:shadow-md transition-shadow ${selectedDeliveries.has(delivery.id) ? 'ring-2 ring-blue-500' : ''}`}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedDeliveries.has(delivery.id)}
                        onCheckedChange={(checked) => handleSelectDelivery(delivery.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                        {/* Customer & Product Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{order.customer.billing_name}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer.contact_person}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{order.product.name}</span>
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Order Date:</span>{" "}
                            {formatDateToIST(new Date(order.order_date))}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Route:</span>{" "}
                            {order.route.name} • {order.delivery_time}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Planned:</span>{" "}
                            {order.planned_quantity}L @ {formatCurrency(order.unit_price)}/L
                          </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Actual:</span>{" "}
                            {delivery.actual_quantity || 0}L
                            {quantityVariance !== 0 && (
                              <span className={quantityVariance > 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                                ({quantityVariance > 0 ? "+" : ""}{quantityVariance}L)
                              </span>
                            )}
                          </div>
                          
                          {delivery.delivered_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{formatDateTimeToIST(new Date(delivery.delivered_at))}</span>
                            </div>
                          )}
                          
                          {delivery.delivery_person && (
                            <div className="text-sm">
                              <span className="font-medium">Delivered by:</span>{" "}
                              {delivery.delivery_person}
                            </div>
                          )}

                          {/* Amount Variance Badge */}
                          {amountVariance !== 0 && (
                            <Badge variant={amountVariance > 0 ? "default" : "destructive"} className="w-fit">
                              {amountVariance > 0 ? "+" : ""}{formatCurrency(amountVariance)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            disabled={deletingId === delivery.id}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/dashboard/deliveries/${delivery.id}`}>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </Link>
                          <Link href={`/dashboard/deliveries/${delivery.id}/edit`}>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Delivery
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(delivery.id, order.customer.billing_name)}
                            className="text-red-600 focus:text-red-600"
                            disabled={deletingId === delivery.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingId === delivery.id ? "Deleting..." : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Delivery Notes */}
                  {delivery.delivery_notes && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span>{" "}
                        <span className="text-muted-foreground">{delivery.delivery_notes}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}