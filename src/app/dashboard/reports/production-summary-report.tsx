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
import { formatDateTimeIST } from '@/lib/date-utils'

import { getDailyProductionSummary } from '@/lib/actions/reports'
import { PrintHeader } from '@/components/reports/PrintHeader'
import type { ProductionSummary } from '@/lib/actions/reports'

export function ProductionSummaryReport() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<ProductionSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentDateTime, setCurrentDateTime] = useState<string>('')

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

  // Set current date/time on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentDateTime(formatDateTimeIST(new Date()))
  }, [])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleRefresh = () => {
    loadSummary(selectedDate)
  }

  const handlePrint = () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const printUrl = `/api/print/production-summary?date=${dateStr}`
    window.open(printUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <PrintHeader 
        title="Daily Production Summary"
        subtitle={format(selectedDate, 'PPPP')}
        date={currentDateTime}
        additionalInfo={summary ? [
          `Total Orders: ${summary.totalOrders}`,
          `Total Value: ${formatCurrency(summary.totalValue)}`
        ] : undefined}
      />
      
      <div className="flex items-center justify-between print:hidden">
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
        <div className="space-y-6 print:space-y-4 print:max-w-none">
          {/* This old print header is now handled by PrintHeader component above */}

          {summary.totalOrders === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No orders found for {format(selectedDate, 'PPP')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3 print:break-inside-avoid print:mb-4">
                <Card className="print:break-inside-avoid">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold print:text-lg">{summary.totalOrders}</div>
                  </CardContent>
                </Card>

                <Card className="print:break-inside-avoid">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold print:text-lg">{formatCurrency(summary.totalValue)}</div>
                  </CardContent>
                </Card>

                <Card className="print:break-inside-avoid">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold print:text-lg">
                      {formatCurrency(summary.totalValue / summary.totalOrders)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2 print:break-inside-avoid print:mb-4">
                <Card className="print:break-inside-avoid print:mb-4">
                  <CardHeader>
                    <CardTitle className="print:text-lg print:font-bold">Product Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 print:space-y-2">
                      {Object.entries(summary.productBreakdown).map(([code, data]) => (
                        <div key={code} className="flex items-center justify-between print:break-inside-avoid">
                          <div>
                            <p className="font-medium print:text-sm">{data.name}</p>
                            <p className="text-sm text-gray-600 print:text-xs">
                              {data.orderCount} orders • {data.totalQuantity}L
                            </p>
                          </div>
                          <Badge variant="outline" className="print:border print:border-black print:text-xs">
                            {formatCurrency(data.totalValue)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="print:break-inside-avoid print:mb-4">
                  <CardHeader>
                    <CardTitle className="print:text-lg print:font-bold">Route Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 print:space-y-2">
                      {Object.entries(summary.routeBreakdown).map(([routeId, data]) => (
                        <div key={routeId} className="print:break-inside-avoid">
                          <div className="flex items-center justify-between mb-2 print:mb-1">
                            <p className="font-medium print:text-sm">{data.name}</p>
                            <Badge variant="outline" className="print:border print:border-black print:text-xs">
                              {formatCurrency(data.totalValue)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 print:text-xs print:gap-1">
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

              <Card className="print:break-inside-avoid print:mb-4">
                <CardHeader>
                  <CardTitle className="print:text-lg print:font-bold">Time Slot Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 print:gap-2">
                    <div className="space-y-2 print:space-y-1 print:break-inside-avoid">
                      <h4 className="font-medium print:text-sm print:font-bold">Morning Delivery</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm print:gap-2 print:text-xs">
                        <div>
                          <p className="text-gray-600 print:text-black">Orders</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.morning.orders}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 print:text-black">Quantity</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.morning.quantity}L</p>
                        </div>
                        <div>
                          <p className="text-gray-600 print:text-black">Value</p>
                          <p className="font-medium">{formatCurrency(summary.timeSlotBreakdown.morning.value)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 print:space-y-1 print:break-inside-avoid">
                      <h4 className="font-medium print:text-sm print:font-bold">Evening Delivery</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm print:gap-2 print:text-xs">
                        <div>
                          <p className="text-gray-600 print:text-black">Orders</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.evening.orders}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 print:text-black">Quantity</p>
                          <p className="font-medium">{summary.timeSlotBreakdown.evening.quantity}L</p>
                        </div>
                        <div>
                          <p className="text-gray-600 print:text-black">Value</p>
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