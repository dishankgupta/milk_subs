"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatDateToIST, formatDateTimeToIST } from "@/lib/utils"
import { MoreHorizontal, Eye, Edit, Trash2, Package, User, Clock, ArrowUp, ArrowDown, Search } from "lucide-react"
import { useSorting } from "@/hooks/useSorting"
import { usePagination, SimplePagination, createPaginationConfig } from "@/lib/pagination"

import type { DeliveryExtended } from "@/lib/types"
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
import { EnhancedDateFilter, DateFilterState, doesDateMatchFilter } from "@/components/ui/enhanced-date-filter"
import { parseLocalDateIST, formatDateIST } from "@/lib/date-utils"
import { startOfDay, endOfDay } from "date-fns"

// Using DeliveryExtended which contains all necessary fields directly

interface FilterState {
  searchQuery: string
  dateFilter: DateFilterState
  routeFilter: string
}

interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

interface DeliveriesTableProps {
  initialDeliveries: DeliveryExtended[]
  onDataChange?: () => void
  onFiltersChange?: (filtered: DeliveryExtended[], filters: FilterState) => void
  onSortChange?: (sortState: SortState) => void
}

export function DeliveriesTable({ initialDeliveries, onDataChange, onFiltersChange, onSortChange }: DeliveriesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: "mostRecent", label: "Most Recent" })
  const [routeFilter, setRouteFilter] = useState<string>("all")
  const [selectedDeliveries, setSelectedDeliveries] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Filter deliveries based on search and filters (client-side only)
  const filteredDeliveries = initialDeliveries.filter(delivery => {
    const matchesSearch = !searchQuery ||
      delivery.delivery_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.delivery_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.customer?.billing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.customer?.contact_person.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDate = doesDateMatchFilter(delivery.order_date, dateFilter)

    const matchesRoute = routeFilter === "all" ||
      delivery.route?.name === routeFilter

    return matchesSearch && matchesDate && matchesRoute
  })

  // Apply sorting to filtered deliveries with default sort by order date descending
  const { sortedData: sortedDeliveries, sortConfig, handleSort } = useSorting(
    filteredDeliveries,
    'order_date',
    'desc',
    (delivery, key) => {
      if (key === 'variance') {
        return (delivery.actual_quantity || 0) - (delivery.planned_quantity || 0)
      }
      if (key === 'delivered_at') {
        return delivery.delivered_at ? new Date(delivery.delivered_at) : new Date(0)
      }
      // Return undefined to use default getNestedValue for other keys
      return undefined
    }
  )

  // Add pagination after sorting
  const paginationConfig = createPaginationConfig(sortedDeliveries.length)
  const pagination = usePagination(sortedDeliveries, {
    defaultItemsPerPage: paginationConfig.defaultItemsPerPage,
    itemsPerPageOptions: paginationConfig.itemsPerPageOptions,
    maxVisiblePages: paginationConfig.maxVisiblePages
  })

  // Handle search functionality (client-side filtering)
  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  // Get unique routes for filters
  const uniqueRoutes = Array.from(new Set(initialDeliveries.map(d => d.route?.name).filter(Boolean)))

  // Get unique dates for setting default (most recent date)
  const uniqueDates = Array.from(new Set(initialDeliveries.map(d => d.order_date))).sort().reverse()

  // Set default date filter to most recent date on first load
  useEffect(() => {
    if (uniqueDates.length > 0 && dateFilter.preset === "mostRecent" && dateFilter.label === "Most Recent") {
      const mostRecentDate = uniqueDates[0]
      const recentDate = parseLocalDateIST(mostRecentDate)
      setDateFilter({
        preset: "mostRecent",
        fromDate: startOfDay(recentDate),
        toDate: endOfDay(recentDate),
        label: `Most Recent (${formatDateIST(recentDate)})`,
        mostRecentDate: mostRecentDate
      })
    }
  }, [uniqueDates, dateFilter.preset, dateFilter.label])

  // Notify parent component when filters change
  useEffect(() => {
    if (onFiltersChange) {
      const currentFilters = {
        searchQuery,
        dateFilter,
        routeFilter
      }
      onFiltersChange(filteredDeliveries, currentFilters)
    }
  }, [searchQuery, dateFilter, routeFilter]) // Remove onFiltersChange from deps

  // Notify parent component when sort changes
  useEffect(() => {
    if (onSortChange && sortConfig) {
      onSortChange({
        key: sortConfig.key,
        direction: sortConfig.direction
      })
    }
  }, [sortConfig]) // Remove onSortChange from deps

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
      setSelectedDeliveries(new Set(pagination.paginatedData.map(d => d.id)))
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
            <EnhancedDateFilter
              value={dateFilter}
              onChange={setDateFilter}
              className="w-[400px]"
              mostRecentDate={uniqueDates[0]}
            />
            
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {uniqueRoutes.map(route => (
                  <SelectItem key={route} value={route || ''}>{route}</SelectItem>
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
            Showing {pagination.displayInfo.start}-{pagination.displayInfo.end} of {pagination.displayInfo.total} deliver{pagination.displayInfo.total !== 1 ? 'ies' : 'y'}
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

      {/* Top Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="mb-4">
          <SimplePagination
            pagination={pagination}
            itemName="deliveries"
            className="justify-center"
          />
        </div>
      )}

      {/* Results */}
      {pagination.totalItems === 0 ? (
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
              checked={pagination.paginatedData.length > 0 && selectedDeliveries.size === pagination.paginatedData.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({pagination.paginatedData.length} deliveries on this page)
            </span>
          </div>

          {pagination.paginatedData.map((delivery) => {
            const quantityVariance = (delivery.actual_quantity || 0) - (delivery.planned_quantity || 0)
            const amountVariance = quantityVariance * delivery.unit_price
            const isAdditional = delivery.daily_order_id === null || delivery.planned_quantity === null

            return (
              <Card key={delivery.id} className={`hover:shadow-md transition-shadow ${selectedDeliveries.has(delivery.id) ? 'ring-2 ring-blue-500' : ''} ${isAdditional ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-blue-500'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={selectedDeliveries.has(delivery.id)}
                      onCheckedChange={(checked) => handleSelectDelivery(delivery.id, checked as boolean)}
                      className="mt-1 shrink-0"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Customer & Product Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{delivery.customer?.billing_name || 'N/A'}</span>
                            <Badge 
                              variant={isAdditional ? "outline" : "secondary"}
                              className={`shrink-0 ${isAdditional ? "text-orange-600 border-orange-300" : "text-blue-600 bg-blue-100"}`}
                            >
                              {isAdditional ? "Additional" : "Subscription"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {delivery.customer?.contact_person || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="truncate">{delivery.product?.name || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Order Date:</span>{" "}
                            <span className="whitespace-nowrap">{formatDateToIST(new Date(delivery.order_date))}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Route:</span>{" "}
                            <span className="truncate">{delivery.route?.name || 'N/A'} • {delivery.delivery_time}</span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Planned:</span>{" "}
                            <span className="whitespace-nowrap">{delivery.planned_quantity || 0}L @ {formatCurrency(delivery.unit_price)}/L</span>
                          </div>
                        </div>

                        {/* Delivery Details */}
                        <div className="space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Actual:</span>{" "}
                            <span className="whitespace-nowrap">
                              {delivery.actual_quantity || 0}L
                              {quantityVariance !== 0 && (
                                <span className={quantityVariance > 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                                  ({quantityVariance > 0 ? "+" : ""}{quantityVariance}L)
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {delivery.delivered_at && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="whitespace-nowrap">{formatDateTimeToIST(new Date(delivery.delivered_at))}</span>
                            </div>
                          )}
                          
                          {delivery.delivery_person && (
                            <div className="text-sm">
                              <span className="font-medium">Delivered by:</span>{" "}
                              <span className="truncate">{delivery.delivery_person}</span>
                            </div>
                          )}

                          {/* Amount Variance Badge */}
                          {amountVariance !== 0 && (
                            <Badge variant={amountVariance > 0 ? "default" : "destructive"} className="w-fit shrink-0">
                              {amountVariance > 0 ? "+" : ""}{formatCurrency(amountVariance)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 ml-auto">
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
                            onClick={() => handleDelete(delivery.id, delivery.customer?.billing_name || 'Unknown')}
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

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="mt-6">
              <SimplePagination
                pagination={pagination}
                itemName="deliveries"
                className="justify-center"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}