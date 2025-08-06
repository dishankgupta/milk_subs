"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { PrintHeader } from "@/components/reports/PrintHeader"

export function PaymentCollectionReport() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Mock data for demonstration
  const mockData = [
    {
      period: "January 2025",
      totalPayments: 125000,
      paymentsCount: 28,
      averagePayment: 4464,
      outstandingStart: 15000,
      outstandingEnd: 8000,
      collectionRate: 95
    },
    {
      period: "December 2024", 
      totalPayments: 118000,
      paymentsCount: 32,
      averagePayment: 3687,
      outstandingStart: 12000,
      outstandingEnd: 15000,
      collectionRate: 88
    },
    {
      period: "November 2024",
      totalPayments: 132000,
      paymentsCount: 35,
      averagePayment: 3771,
      outstandingStart: 8000,
      outstandingEnd: 12000,
      collectionRate: 92
    }
  ]

  const handleExport = () => {
    // In a real implementation, this would generate and download a report
    alert("Export functionality would be implemented here")
  }

  const handlePrint = () => {
    // For now, using current month - in future this could be made configurable
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    const printUrl = `/api/print/payment-collection?start_date=${format(startDate, 'yyyy-MM-dd')}&end_date=${format(endDate, 'yyyy-MM-dd')}`
    window.open(printUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <PrintHeader 
        title="Payment Collection Report"
        subtitle="Monthly Payment Collection Summary"
        date={new Date().toLocaleString()}
        additionalInfo={[
          `Report Period: Last 3 months`,
          `Average Collection Rate: ${Math.round(mockData.reduce((sum, m) => sum + m.collectionRate, 0) / mockData.length)}%`,
          `Total Payments: ${mockData.reduce((sum, m) => sum + m.paymentsCount, 0)} transactions`
        ]}
      />
      
      {/* Date Selection */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrint}>
            <Download className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Monthly Collection Summary */}
      <div className="grid gap-4 print:space-y-4">
        {mockData.map((month, index) => (
          <Card key={index} className="print:break-inside-avoid print:mb-4">
            <CardHeader className="print:pb-2">
              <div className="flex justify-between items-center print:flex-col print:items-start print:gap-1">
                <CardTitle className="text-lg print:text-base print:font-bold">{month.period}</CardTitle>
                <div className="flex items-center space-x-4 print:space-x-2">
                  <div className="text-right print:text-left">
                    <div className="text-sm text-muted-foreground print:text-xs print:text-black">Collection Rate</div>
                    <div className={`font-bold print:text-black ${month.collectionRate >= 90 ? 'text-green-600' : month.collectionRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {month.collectionRate}%
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-2">
                <div className="print:break-inside-avoid">
                  <div className="text-sm text-muted-foreground print:text-xs print:text-black">Total Collected</div>
                  <div className="text-xl font-bold text-green-600 print:text-base print:text-black print:font-bold">{formatCurrency(month.totalPayments)}</div>
                </div>
                <div className="print:break-inside-avoid">
                  <div className="text-sm text-muted-foreground print:text-xs print:text-black">Number of Payments</div>
                  <div className="text-xl font-bold print:text-base print:font-bold">{month.paymentsCount}</div>
                </div>
                <div className="print:break-inside-avoid">
                  <div className="text-sm text-muted-foreground print:text-xs print:text-black">Average Payment</div>
                  <div className="text-xl font-bold print:text-base print:font-bold">{formatCurrency(month.averagePayment)}</div>
                </div>
                <div className="print:break-inside-avoid">
                  <div className="text-sm text-muted-foreground print:text-xs print:text-black">Outstanding Change</div>
                  <div className={`text-xl font-bold print:text-base print:font-bold print:text-black ${month.outstandingEnd < month.outstandingStart ? 'text-green-600' : 'text-red-600'}`}>
                    {month.outstandingEnd < month.outstandingStart ? '↓' : '↑'} {formatCurrency(Math.abs(month.outstandingEnd - month.outstandingStart))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t print:mt-2 print:pt-2 print:border-t print:border-gray-400">
                <div className="flex justify-between items-center text-sm print:text-xs print:justify-between">
                  <span className="text-muted-foreground print:text-black">Outstanding at month start:</span>
                  <span className="font-medium print:font-bold">{formatCurrency(month.outstandingStart)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1 print:text-xs print:mt-1">
                  <span className="text-muted-foreground print:text-black">Outstanding at month end:</span>
                  <span className="font-medium print:font-bold">{formatCurrency(month.outstandingEnd)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Insights */}
      <Card className="print:break-inside-avoid print:mb-4">
        <CardHeader className="print:pb-2">
          <CardTitle className="print:text-lg print:font-bold">Collection Insights</CardTitle>
          <CardDescription className="print:text-sm print:text-black">Key metrics and trends from payment collection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm print:space-y-1 print:text-xs">
            <div className="flex justify-between print:justify-between">
              <span className="text-muted-foreground print:text-black">Average monthly collection:</span>
              <span className="font-medium print:font-bold">{formatCurrency(mockData.reduce((sum, m) => sum + m.totalPayments, 0) / mockData.length)}</span>
            </div>
            <div className="flex justify-between print:justify-between">
              <span className="text-muted-foreground print:text-black">Average collection rate:</span>
              <span className="font-medium print:font-bold">{Math.round(mockData.reduce((sum, m) => sum + m.collectionRate, 0) / mockData.length)}%</span>
            </div>
            <div className="flex justify-between print:justify-between">
              <span className="text-muted-foreground print:text-black">Total payments processed:</span>
              <span className="font-medium print:font-bold">{mockData.reduce((sum, m) => sum + m.paymentsCount, 0)} payments</span>
            </div>
            <div className="flex justify-between print:justify-between">
              <span className="text-muted-foreground print:text-black">Outstanding trend:</span>
              <span className={`font-medium print:font-bold print:text-black ${mockData[0].outstandingEnd < mockData[mockData.length - 1].outstandingStart ? 'text-green-600' : 'text-red-600'}`}>
                {mockData[0].outstandingEnd < mockData[mockData.length - 1].outstandingStart ? 'Improving' : 'Needs attention'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}