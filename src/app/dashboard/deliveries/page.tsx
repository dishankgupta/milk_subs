"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Plus, Package, Package2, TrendingUp, AlertTriangle, CheckCircle, Printer } from "lucide-react"
import { categorizeDeliveries } from "@/components/deliveries/delivery-type-toggle"

import { getDeliveries } from "@/lib/actions/deliveries"
import { DeliveriesTable } from "./deliveries-table"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DeliveryExtended } from "@/lib/types"
import type { DateFilterState } from "@/components/ui/enhanced-date-filter"

interface FilterState {
  searchQuery: string
  dateFilter: DateFilterState
  routeFilter: string
}

interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

function calculateDeliveryStats(deliveries: DeliveryExtended[]) {
  const { subscription, additional, counts } = categorizeDeliveries(deliveries)
  
  const totalOrders = deliveries.length
  const deliveredOrders = deliveries.filter(d => d.actual_quantity !== null).length
  const pendingOrders = totalOrders - deliveredOrders
  
  const totalPlannedQuantity = deliveries.reduce((sum, d) => sum + (d.planned_quantity || 0), 0)
  const totalActualQuantity = deliveries.reduce((sum, d) => sum + (d.actual_quantity || 0), 0)
  
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
  const quantityVariance = totalActualQuantity - totalPlannedQuantity
  
  // Product-wise breakdown for orders
  const productWiseOrders = deliveries.reduce((acc, d) => {
    const productName = d.product?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = 0
    }
    acc[productName]++
    return acc
  }, {} as Record<string, number>)
  
  // Product-wise breakdown for planned quantities
  const productWisePlanned = deliveries.reduce((acc, d) => {
    const productName = d.product?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = 0
    }
    acc[productName] += (d.planned_quantity || 0)
    return acc
  }, {} as Record<string, number>)
  
  // Product-wise breakdown for actual quantities
  const productWiseActual = deliveries.reduce((acc, d) => {
    const productName = d.product?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = 0
    }
    acc[productName] += (d.actual_quantity || 0)
    return acc
  }, {} as Record<string, number>)

  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    totalPlannedQuantity,
    totalActualQuantity,
    completionRate,
    quantityVariance,
    subscriptionCount: counts.subscription,
    additionalCount: counts.additional,
    productWiseOrders,
    productWisePlanned,
    productWiseActual
  }
}


function DeliveriesContent() {
  const [deliveries, setDeliveries] = useState<DeliveryExtended[]>([])
  const [filteredDeliveries, setFilteredDeliveries] = useState<DeliveryExtended[]>([])
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    searchQuery: "",
    dateFilter: { preset: "mostRecent", label: "Most Recent" },
    routeFilter: "all"
  })
  const [currentSort, setCurrentSort] = useState<SortState>({
    key: 'daily_order.order_date',
    direction: 'desc'
  })
  const [loading, setLoading] = useState(true)

  const stats = calculateDeliveryStats(filteredDeliveries.length > 0 ? filteredDeliveries : [])

  const loadData = async () => {
    try {
      setLoading(true)
      const deliveriesData = await getDeliveries()
      setDeliveries(deliveriesData)
      // Don't initialize filteredDeliveries here - let the filter logic handle it
    } catch (error) {
      console.error("Failed to load deliveries data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = useCallback((filtered: DeliveryExtended[], filters: FilterState) => {
    setFilteredDeliveries(filtered)
    setCurrentFilters(filters)
  }, [])

  const handleSortChange = useCallback((sortState: SortState) => {
    setCurrentSort(sortState)
  }, [])

  const handlePrintReport = () => {
    const params = new URLSearchParams()
    if (currentFilters.searchQuery) params.append('search', currentFilters.searchQuery)

    // Handle enhanced date filter for print
    if (currentFilters.dateFilter.preset === 'custom' && currentFilters.dateFilter.fromDate && currentFilters.dateFilter.toDate) {
      params.append('dateFrom', currentFilters.dateFilter.fromDate.toISOString())
      params.append('dateTo', currentFilters.dateFilter.toDate.toISOString())
    } else {
      params.append('datePreset', currentFilters.dateFilter.preset)
    }

    if (currentFilters.routeFilter !== 'all') params.append('route', currentFilters.routeFilter)

    // Add sort parameters
    params.append('sortKey', currentSort.key)
    params.append('sortDirection', currentSort.direction)

    const printUrl = `/api/print/deliveries?${params.toString()}`
    window.open(printUrl, '_blank')
  }

  const handlePrintCustomerSummary = () => {
    const params = new URLSearchParams()
    if (currentFilters.searchQuery) params.append('search', currentFilters.searchQuery)

    // Handle enhanced date filter for print
    if (currentFilters.dateFilter.preset === 'custom' && currentFilters.dateFilter.fromDate && currentFilters.dateFilter.toDate) {
      params.append('dateFrom', currentFilters.dateFilter.fromDate.toISOString())
      params.append('dateTo', currentFilters.dateFilter.toDate.toISOString())
    } else {
      params.append('datePreset', currentFilters.dateFilter.preset)
    }

    if (currentFilters.routeFilter !== 'all') params.append('route', currentFilters.routeFilter)

    const printUrl = `/api/print/customer-delivered-quantity?${params.toString()}`
    window.open(printUrl, '_blank')
  }

  useEffect(() => {
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{stats.subscriptionCount} subscription, {stats.additionalCount} additional</p>
              {Object.entries(stats.productWiseOrders).map(([product, count]) => (
                <p key={product} className="text-xs">
                  <span className="font-medium">{product}:</span> {count}
                </p>
              ))}
            </div>
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
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Total planned volume</p>
              {Object.entries(stats.productWisePlanned).map(([product, quantity]) => (
                <p key={product} className="text-xs">
                  <span className="font-medium">{product}:</span> {quantity}L
                </p>
              ))}
            </div>
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
            <div className="text-xs space-y-1">
              <p className={`${stats.quantityVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.quantityVariance >= 0 ? "+" : ""}{stats.quantityVariance}L variance
              </p>
              <div className="text-muted-foreground">
                {Object.entries(stats.productWiseActual).map(([product, quantity]) => (
                  <p key={product} className="text-xs">
                    <span className="font-medium">{product}:</span> {quantity}L
                  </p>
                ))}
              </div>
            </div>
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
          <Button variant="outline" onClick={handlePrintCustomerSummary}>
            <Printer className="mr-2 h-4 w-4" />
            Print Product-wise Summary
          </Button>
          <Link href="/dashboard/deliveries/additional/new">
            <Button variant="secondary" className="bg-orange-600 hover:bg-orange-700 text-white">
              <Package2 className="mr-2 h-4 w-4" />
              Record Additional Delivery
            </Button>
          </Link>
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