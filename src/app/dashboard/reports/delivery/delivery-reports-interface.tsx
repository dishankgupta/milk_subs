'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Download, RefreshCw, MapPin, Clock, AlertCircle, TrendingUp, TrendingDown, Minus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useSorting } from '@/hooks/useSorting'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency } from '@/lib/utils'

import { getRouteDeliveryReport } from '@/lib/actions/reports'
import { createClient } from '@/lib/supabase/client'
import { PrintHeader } from '@/components/reports/PrintHeader'
import type { RouteDeliveryReport } from '@/lib/actions/reports'
import type { Route } from '@/lib/types'

export function DeliveryReportsInterface() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedRoute, setSelectedRoute] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<'Morning' | 'Evening'>('Morning')
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<RouteDeliveryReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Sort the orders when report is available
  const sortedOrders = useMemo(() => {
    if (!report?.orders) return []
    return [...report.orders]
  }, [report?.orders])
  
  const { sortedData: finalSortedOrders, sortConfig, handleSort } = useSorting(sortedOrders, 'customerName', 'asc')

  const loadReport = useCallback(async () => {
    if (!selectedRoute) return
    
    setLoading(true)
    setError(null)
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const result = await getRouteDeliveryReport(dateStr, selectedRoute, selectedTime)
      
      if (result.success) {
        setReport(result.data || null)
      } else {
        setError(result.error || 'Failed to load report')
        setReport(null)
      }
    } catch {
      setError('Something went wrong')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedRoute, selectedTime])

  // Load routes on component mount
  useEffect(() => {
    const loadRoutes = async () => {
      const supabase = createClient()
      const { data: routesData } = await supabase
        .from('routes')
        .select('*')
        .order('name')
      
      if (routesData && routesData.length > 0) {
        setRoutes(routesData)
        setSelectedRoute(routesData[0].id)
      }
    }
    
    loadRoutes()
  }, [])

  // Load report when parameters change
  useEffect(() => {
    if (selectedRoute) {
      loadReport()
    }
  }, [selectedDate, selectedRoute, selectedTime, loadReport])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleRefresh = () => {
    loadReport()
  }

  const handlePrint = () => {
    if (!selectedRoute) return
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const sortParams = sortConfig ? `&sort_key=${sortConfig.key}&sort_direction=${sortConfig.direction}` : ''
    const printUrl = `/api/print/route-delivery?date=${dateStr}&route=${selectedRoute}&time_slot=${selectedTime}${sortParams}`
    window.open(printUrl, '_blank')
  }

  const handleOrderSort = (key: string) => {
    handleSort(key)
  }

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <PrintHeader 
        title="Route Delivery Report"
        subtitle={report ? `${report.routeName} - ${report.deliveryTime} Delivery` : undefined}
        date={new Date().toLocaleString()}
        additionalInfo={report && report.orders.length > 0 ? [
          `Date: ${format(selectedDate, 'PPPP')}`,
          `Total Orders: ${report.summary.totalOrders}`,
          `Total Quantity: ${report.summary.totalQuantity}L`,
          `Total Value: ${formatCurrency(report.summary.totalValue)}`,
          ...(report.summary.modifiedOrders > 0 ? [`Modified Orders: ${report.summary.modifiedOrders}`] : []),
          ...(report.summary.modificationSummary.skip > 0 ? [`Skipped: ${report.summary.modificationSummary.skip}`] : []),
          ...(report.summary.modificationSummary.increase > 0 ? [`Increased: ${report.summary.modificationSummary.increase}`] : []),
          ...(report.summary.modificationSummary.decrease > 0 ? [`Decreased: ${report.summary.modificationSummary.decrease}`] : [])
        ] : undefined}
      />
      
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Report Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Route</label>
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Select route" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((route) => (
                    <SelectItem key={route.id} value={route.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {route.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Time Slot</label>
              <Select value={selectedTime} onValueChange={(value) => setSelectedTime(value as 'Morning' | 'Evening')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Morning
                    </div>
                  </SelectItem>
                  <SelectItem value="Evening">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Evening
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              
              {report && report.orders.length > 0 && (
                <Button variant="outline" onClick={handlePrint}>
                  <Download className="h-4 w-4 mr-2" />
                  Print
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card className="print:hidden">
          <CardContent className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading delivery report...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="print:hidden">
          <CardContent className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <div className="space-y-6 print:space-y-4 print:max-w-none">
          {/* This old print header is now handled by PrintHeader component above */}

          {report.orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  No deliveries scheduled for {report.routeName} - {report.deliveryTime} on {format(selectedDate, 'PPP')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="print:break-inside-avoid print:mb-4 print:hidden">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between print:text-lg">
                    <span>
                      {report.routeName} - {report.deliveryTime} Delivery
                    </span>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <Badge variant="outline" className="print:border print:border-black print:text-xs">
                        {report.summary.totalOrders} orders
                      </Badge>
                      <Badge variant="outline" className="print:border print:border-black print:text-xs">
                        {report.summary.totalQuantity}L total
                      </Badge>
                      <Badge variant="outline" className="print:border print:border-black print:text-xs">
                        {formatCurrency(report.summary.totalValue)}
                      </Badge>
                      {report.summary.modifiedOrders > 0 && (
                        <Badge variant="secondary" className="print:border print:border-black print:text-xs">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {report.summary.modifiedOrders} modified
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Product Summary</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {Object.entries(report.summary.productBreakdown).map(([code, data]) => (
                          <div key={code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="font-medium">{data.name}</span>
                            <span className="text-sm text-gray-600">
                              {data.quantity}L • {formatCurrency(data.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {report.summary.modifiedOrders > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Modification Summary</h4>
                        <div className="grid gap-2 md:grid-cols-3">
                          {report.summary.modificationSummary.skip > 0 && (
                            <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                              <div className="flex items-center gap-2">
                                <Minus className="h-4 w-4 text-red-600" />
                                <span className="font-medium text-red-800">Skipped</span>
                              </div>
                              <span className="text-sm font-bold text-red-600">
                                {report.summary.modificationSummary.skip}
                              </span>
                            </div>
                          )}
                          {report.summary.modificationSummary.increase > 0 && (
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-800">Increased</span>
                              </div>
                              <span className="text-sm font-bold text-green-600">
                                {report.summary.modificationSummary.increase}
                              </span>
                            </div>
                          )}
                          {report.summary.modificationSummary.decrease > 0 && (
                            <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-orange-600" />
                                <span className="font-medium text-orange-800">Decreased</span>
                              </div>
                              <span className="text-sm font-bold text-orange-600">
                                {report.summary.modificationSummary.decrease}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="print:border-none print:shadow-none">
                <CardHeader className="print:pb-2">
                  <CardTitle className="print:text-lg print:font-bold print:mb-2">Delivery List</CardTitle>
                  <div className="flex items-center gap-2 print:hidden">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <Button
                      variant={sortConfig?.key === 'customerName' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOrderSort('customerName')}
                      className="text-xs h-7"
                    >
                      Customer
                      {sortConfig?.key === 'customerName' && (
                        sortConfig.direction === 'asc' ? 
                          <ArrowUp className="ml-1 h-3 w-3" /> : 
                          <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                      {sortConfig?.key !== 'customerName' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                    </Button>
                    <Button
                      variant={sortConfig?.key === 'productName' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOrderSort('productName')}
                      className="text-xs h-7"
                    >
                      Product
                      {sortConfig?.key === 'productName' && (
                        sortConfig.direction === 'asc' ? 
                          <ArrowUp className="ml-1 h-3 w-3" /> : 
                          <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                      {sortConfig?.key !== 'productName' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                    </Button>
                    <Button
                      variant={sortConfig?.key === 'quantity' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOrderSort('quantity')}
                      className="text-xs h-7"
                    >
                      Quantity
                      {sortConfig?.key === 'quantity' && (
                        sortConfig.direction === 'asc' ? 
                          <ArrowUp className="ml-1 h-3 w-3" /> : 
                          <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                      {sortConfig?.key !== 'quantity' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                    </Button>
                    <Button
                      variant={sortConfig?.key === 'totalAmount' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleOrderSort('totalAmount')}
                      className="text-xs h-7"
                    >
                      Amount
                      {sortConfig?.key === 'totalAmount' && (
                        sortConfig.direction === 'asc' ? 
                          <ArrowUp className="ml-1 h-3 w-3" /> : 
                          <ArrowDown className="ml-1 h-3 w-3" />
                      )}
                      {sortConfig?.key !== 'totalAmount' && <ArrowUpDown className="ml-1 h-3 w-3" />}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 print:space-y-2">
                    {finalSortedOrders.map((order, index) => (
                      <div key={index} className="border rounded-lg p-4 print:break-inside-avoid print:border print:border-gray-400 print:rounded-none print:p-3">
                        <div className="grid gap-3 md:grid-cols-2 print:gap-2">
                          <div>
                            <h4 className="font-medium text-lg print:text-base print:font-bold">{order.customerName}</h4>
                            {order.contactPerson && order.contactPerson !== order.customerName && (
                              <p className="text-gray-600 print:text-black print:text-sm">Contact: {order.contactPerson}</p>
                            )}
                            <p className="text-gray-600 print:text-black print:text-sm">{order.address}</p>
                            <p className="text-gray-600 print:text-black print:text-sm">📞 {order.phone}</p>
                          </div>
                          <div className="md:text-right print:text-right">
                            <div className="flex items-center justify-end gap-2 mb-1 print:justify-end">
                              <p className="font-medium print:text-sm">{order.productName}</p>
                              {order.isModified && (
                                <Badge variant="secondary" className="text-xs print:text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Modified
                                </Badge>
                              )}
                            </div>
                            <div className="text-lg font-bold print:text-base print:font-bold">
                              {order.isModified && order.baseQuantity && (
                                <span className="text-sm text-gray-500 line-through mr-2 print:text-xs">
                                  {order.baseQuantity}L
                                </span>
                              )}
                              <span>{order.quantity}L</span>
                            </div>
                            <p className="text-gray-600 print:text-black print:text-sm">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200 print:mt-2 print:pt-2 print:border-t print:border-gray-400">
                          {order.isModified && order.appliedModifications.length > 0 && (
                            <div className="mb-3 print:mb-2">
                              <div className="text-xs font-medium text-gray-600 mb-1 print:text-black">Modifications:</div>
                              <div className="space-y-1">
                                {order.appliedModifications.map((mod, modIndex) => (
                                  <div key={modIndex} className="flex items-center gap-2 text-xs text-gray-600 print:text-black">
                                    {mod.type === 'Skip' && <Minus className="w-3 h-3 text-red-500" />}
                                    {mod.type === 'Increase' && <TrendingUp className="w-3 h-3 text-green-500" />}
                                    {mod.type === 'Decrease' && <TrendingDown className="w-3 h-3 text-orange-500" />}
                                    <span className="font-medium">{mod.type}</span>
                                    {mod.quantityChange && (
                                      <span>({mod.quantityChange > 0 ? '+' : ''}{mod.quantityChange}L)</span>
                                    )}
                                    {mod.reason && (
                                      <span className="italic">- {mod.reason}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-2 text-sm text-gray-500 print:text-xs print:text-black print:gap-1">
                            <div>□ Delivered</div>
                            <div>□ Partial: ___L</div>
                            <div>□ Not Available</div>
                          </div>
                          <div className="mt-2 print:mt-1">
                            <span className="text-sm text-gray-500 print:text-xs print:text-black">Notes: </span>
                            <span className="border-b border-dotted border-gray-300 inline-block w-32 print:border-b print:border-dotted print:border-gray-400"></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}