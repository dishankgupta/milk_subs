"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Plus, Package, TrendingUp, AlertTriangle, CheckCircle, Printer } from "lucide-react"

import { getDeliveries } from "@/lib/actions/deliveries"
import { DeliveriesTable } from "./deliveries-table"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Delivery, DailyOrder, Customer, Product, Route } from "@/lib/types"

type DeliveryWithOrder = Delivery & { 
  daily_order: DailyOrder & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  } 
}

interface FilterState {
  searchQuery: string
  dateFilter: string
  routeFilter: string
}

interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

function calculateDeliveryStats(deliveries: DeliveryWithOrder[]) {
  const totalOrders = deliveries.length
  const deliveredOrders = deliveries.filter(d => d.actual_quantity !== null).length
  const pendingOrders = totalOrders - deliveredOrders
  
  const totalPlannedQuantity = deliveries.reduce((sum, d) => sum + d.daily_order.planned_quantity, 0)
  const totalActualQuantity = deliveries.reduce((sum, d) => sum + (d.actual_quantity || 0), 0)
  
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
  const quantityVariance = totalActualQuantity - totalPlannedQuantity

  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    totalPlannedQuantity,
    totalActualQuantity,
    completionRate,
    quantityVariance
  }
}


function DeliveriesContent() {
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([])
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryWithOrder[]>([])
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    searchQuery: "",
    dateFilter: "all",
    routeFilter: "all"
  })
  const [currentSort, setCurrentSort] = useState<SortState>({
    key: 'daily_order.order_date',
    direction: 'desc'
  })
  const [loading, setLoading] = useState(true)

  const stats = calculateDeliveryStats(filteredDeliveries)

  const loadData = async () => {
    try {
      setLoading(true)
      const deliveriesData = await getDeliveries()
      setDeliveries(deliveriesData)
      setFilteredDeliveries(deliveriesData) // Initialize filtered data
    } catch (error) {
      console.error("Failed to load deliveries data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = useCallback((filtered: DeliveryWithOrder[], filters: FilterState) => {
    setFilteredDeliveries(filtered)
    setCurrentFilters(filters)
  }, [])

  const handleSortChange = useCallback((sortState: SortState) => {
    setCurrentSort(sortState)
  }, [])

  const handlePrintReport = () => {
    const params = new URLSearchParams()
    if (currentFilters.searchQuery) params.append('search', currentFilters.searchQuery)
    if (currentFilters.dateFilter !== 'all') params.append('date', currentFilters.dateFilter)
    if (currentFilters.routeFilter !== 'all') params.append('route', currentFilters.routeFilter)
    
    // Add sort parameters
    params.append('sortKey', currentSort.key)
    params.append('sortDirection', currentSort.direction)
    
    const printUrl = `/api/print/deliveries?${params.toString()}`
    window.open(printUrl, '_blank')
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-4 bg-muted rounded w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.deliveredOrders} delivered, {stats.pendingOrders} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.deliveredOrders} of {stats.totalOrders} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned Quantity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlannedQuantity}L</div>
            <p className="text-xs text-muted-foreground">
              Total planned volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Delivered</CardTitle>
            {stats.quantityVariance >= 0 ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActualQuantity}L</div>
            <p className={`text-xs ${stats.quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.quantityVariance >= 0 ? "+" : ""}{stats.quantityVariance}L variance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrintReport}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Link href="/dashboard/deliveries/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Delivery
            </Button>
          </Link>
        </div>
      </div>

      {/* Deliveries Table */}
      <DeliveriesTable 
        initialDeliveries={deliveries} 
        onDataChange={loadData} 
        onFiltersChange={handleFiltersChange}
        onSortChange={handleSortChange}
      />
    </div>
  )
}

export default function DeliveriesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Delivery Management</h1>
        <p className="text-muted-foreground mt-2">
          Track and manage milk deliveries with planned vs actual quantity tracking
        </p>
      </div>

      <DeliveriesContent />
    </div>
  )
}