'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, Download, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency } from '@/lib/utils'

import { getDailyProductionSummary } from '@/lib/actions/reports'
import type { ProductionSummary } from '@/lib/actions/reports'

export function ProductionSummaryReport() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ProductionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = async (date: Date) => {
    setLoading(true)
    setError(null)
    
    try {
      const dateStr = format(date, 'yyyy-MM-dd')
      const result = await getDailyProductionSummary(dateStr)
      
      if (result.success) {
        setSummary(result.data || null)
      } else {
        setError(result.error || 'Failed to load summary')
        setSummary(null)
      }
    } catch (error) {
      setError('Something went wrong')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary(selectedDate)
  }, [selectedDate])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleRefresh = () => {
    loadSummary(selectedDate)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
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
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {summary && summary.totalOrders > 0 && (
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        )}
      </div>

      {loading && (
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p>Loading production summary...</p>
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

      {summary && !loading && (
        <div className="space-y-6 print:space-y-4">
          <div className="print:block hidden">
            <h1 className="text-2xl font-bold text-center mb-2">Daily Production Summary</h1>
            <p className="text-center text-gray-600">{format(selectedDate, 'PPPP')}</p>
            <Separator className="my-4" />
          </div>

          {summary.totalOrders === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No orders found for {format(selectedDate, 'PPP')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.totalOrders}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(summary.totalValue / summary.totalOrders)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(summary.productBreakdown).map(([code, data]) => (
                        <div key={code} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm text-gray-600">
                              {data.orderCount} orders • {data.totalQuantity}L
                            </p>
                          </div>
                          <Badge variant="outline">
                            {formatCurrency(data.totalValue)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Route Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(summary.routeBreakdown).map(([routeId, data]) => (
                        <div key={routeId}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium">{data.name}</p>
                            <Badge variant="outline">
                              {formatCurrency(data.totalValue)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <p>Morning: {data.morningOrders} orders</p>
                            <p>Evening: {data.eveningOrders} orders</p>
                            <p>Total: {data.totalQuantity}L</p>
                            <p>Orders: {data.morningOrders + data.eveningOrders}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Time Slot Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-medium">Morning Delivery</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Orders</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.morning.orders}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.morning.quantity}L</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Value</p>
                          <p className="font-medium">{formatCurrency(summary.timeSlotBreakdown.morning.value)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Evening Delivery</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Orders</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.evening.orders}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Quantity</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.evening.quantity}L</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Value</p>
                          <p className="font-medium">{formatCurrency(summary.timeSlotBreakdown.evening.value)}</p>
                        </div>
                      </div>
                    </div>
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