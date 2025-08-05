'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Download, RefreshCw, MapPin, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency } from '@/lib/utils'

import { getRouteDeliveryReport } from '@/lib/actions/reports'
import { createClient } from '@/lib/supabase/client'
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
  }, [selectedDate, selectedRoute, selectedTime])

  const loadReport = async () => {
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
    } catch (error) {
      setError('Something went wrong')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleRefresh = () => {
    loadReport()
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <Card>
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
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading delivery report...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <div className="space-y-6 print:space-y-4">
          <div className="print:block hidden">
            <h1 className="text-2xl font-bold text-center mb-2">Delivery Report</h1>
            <p className="text-center text-gray-600">
              {report.routeName} - {report.deliveryTime} Delivery
            </p>
            <p className="text-center text-gray-500">{format(selectedDate, 'PPPP')}</p>
            <Separator className="my-4" />
          </div>

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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {report.routeName} - {report.deliveryTime} Delivery
                    </span>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        {report.summary.totalOrders} orders
                      </Badge>
                      <Badge variant="outline">
                        {report.summary.totalQuantity}L total
                      </Badge>
                      <Badge variant="outline">
                        {formatCurrency(report.summary.totalValue)}
                      </Badge>
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
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery List</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {report.orders.map((order, index) => (
                      <div key={index} className="border rounded-lg p-4 print:break-inside-avoid">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <h4 className="font-medium text-lg">{order.customerName}</h4>
                            {order.contactPerson && order.contactPerson !== order.customerName && (
                              <p className="text-gray-600">Contact: {order.contactPerson}</p>
                            )}
                            <p className="text-gray-600">{order.address}</p>
                            <p className="text-gray-600">📞 {order.phone}</p>
                          </div>
                          <div className="md:text-right">
                            <p className="font-medium">{order.productName}</p>
                            <p className="text-lg font-bold">{order.quantity}L</p>
                            <p className="text-gray-600">{formatCurrency(order.totalAmount)}</p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200 print:hidden">
                          <div className="grid grid-cols-3 gap-2 text-sm text-gray-500">
                            <div>□ Delivered</div>
                            <div>□ Partial: ___L</div>
                            <div>□ Not Available</div>
                          </div>
                          <div className="mt-2">
                            <span className="text-sm text-gray-500">Notes: </span>
                            <span className="border-b border-dotted border-gray-300 inline-block w-32"></span>
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