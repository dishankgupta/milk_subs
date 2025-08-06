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

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="flex items-center justify-between">
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
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Monthly Collection Summary */}
      <div className="grid gap-4">
        {mockData.map((month, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{month.period}</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Collection Rate</div>
                    <div className={`font-bold ${month.collectionRate >= 90 ? 'text-green-600' : month.collectionRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {month.collectionRate}%
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Collected</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(month.totalPayments)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Number of Payments</div>
                  <div className="text-xl font-bold">{month.paymentsCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average Payment</div>
                  <div className="text-xl font-bold">{formatCurrency(month.averagePayment)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Outstanding Change</div>
                  <div className={`text-xl font-bold ${month.outstandingEnd < month.outstandingStart ? 'text-green-600' : 'text-red-600'}`}>
                    {month.outstandingEnd < month.outstandingStart ? '↓' : '↑'} {formatCurrency(Math.abs(month.outstandingEnd - month.outstandingStart))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Outstanding at month start:</span>
                  <span className="font-medium">{formatCurrency(month.outstandingStart)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-muted-foreground">Outstanding at month end:</span>
                  <span className="font-medium">{formatCurrency(month.outstandingEnd)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Insights</CardTitle>
          <CardDescription>Key metrics and trends from payment collection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average monthly collection:</span>
              <span className="font-medium">{formatCurrency(mockData.reduce((sum, m) => sum + m.totalPayments, 0) / mockData.length)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average collection rate:</span>
              <span className="font-medium">{Math.round(mockData.reduce((sum, m) => sum + m.collectionRate, 0) / mockData.length)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total payments processed:</span>
              <span className="font-medium">{mockData.reduce((sum, m) => sum + m.paymentsCount, 0)} payments</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Outstanding trend:</span>
              <span className={`font-medium ${mockData[0].outstandingEnd < mockData[mockData.length - 1].outstandingStart ? 'text-green-600' : 'text-red-600'}`}>
                {mockData[0].outstandingEnd < mockData[mockData.length - 1].outstandingStart ? 'Improving' : 'Needs attention'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}