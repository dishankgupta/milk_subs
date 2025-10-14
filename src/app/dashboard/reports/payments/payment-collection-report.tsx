"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, Search, Filter, Printer } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { formatDateIST, formatDateForDatabase, getCurrentISTDate, parseLocalDateIST } from "@/lib/date-utils"
import { getPaymentReport, type PaymentReportData, type PaymentReportFilters } from "@/lib/actions/reports"
import { toast } from "sonner"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns"

export function PaymentCollectionReport() {
  const [payments, setPayments] = useState<PaymentReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PaymentReportFilters>({})
  const [search, setSearch] = useState("")
  const [mostRecentDate, setMostRecentDate] = useState<string | null>(null)

  // Filter state
  const [datePreset, setDatePreset] = useState<string>("mostRecent")
  const [paymentMethod, setPaymentMethod] = useState<string>("all")
  const [allocationStatus, setAllocationStatus] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  // Load payment data
  const loadPayments = async () => {
    setLoading(true)
    try {
      const result = await getPaymentReport({
        ...filters,
        search
      })

      if (result.success && result.data) {
        setPayments(result.data)

        // Track the most recent payment date for the "Most Recent" preset
        if (result.data.length > 0 && !mostRecentDate) {
          const dates = result.data.map(p => p.payment_date).sort().reverse()
          if (dates.length > 0) {
            setMostRecentDate(dates[0])
          }
        }
      } else {
        toast.error(result.error || "Failed to load payment report")
      }
    } catch (error) {
      console.error("Error loading payments:", error)
      toast.error("Failed to load payment report")
    } finally {
      setLoading(false)
    }
  }

  // Initial load: fetch all payments to determine most recent date
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true)
      try {
        // Load all payments without date filter to find most recent
        const result = await getPaymentReport({ search: "" })

        if (result.success && result.data && result.data.length > 0) {
          setPayments(result.data)

          // Find most recent payment date
          const dates = result.data.map(p => p.payment_date).sort().reverse()
          const recentDate = dates[0]
          setMostRecentDate(recentDate)

          // Set filter to most recent date
          const mostRecentDateObj = parseLocalDateIST(recentDate)
          setStartDate(startOfDay(mostRecentDateObj))
          setEndDate(endOfDay(mostRecentDateObj))

          // Apply the filter
          setFilters({
            startDate: recentDate,
            endDate: recentDate
          })
        }
      } catch (error) {
        console.error("Error initializing payments:", error)
        toast.error("Failed to load payment data")
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  // Load on when filters change (after initial load)
  useEffect(() => {
    if (mostRecentDate) {
      loadPayments()
    }
  }, [filters, mostRecentDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = () => {
    setFilters({
      paymentMethod: paymentMethod && paymentMethod !== "all" ? paymentMethod : undefined,
      allocationStatus: allocationStatus && allocationStatus !== "all" ? allocationStatus : undefined,
      startDate: startDate ? formatDateForDatabase(startDate) : undefined,
      endDate: endDate ? formatDateForDatabase(endDate) : undefined
    })
  }

  const handleClearFilters = () => {
    setPaymentMethod("all")
    setAllocationStatus("all")
    setStartDate(undefined)
    setEndDate(undefined)
    setSearch("")
    setDatePreset("mostRecent")
    setFilters({})
  }

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    const today = getCurrentISTDate()

    switch (preset) {
      case "mostRecent":
        if (mostRecentDate) {
          const mostRecentDateObj = parseLocalDateIST(mostRecentDate)
          setStartDate(startOfDay(mostRecentDateObj))
          setEndDate(endOfDay(mostRecentDateObj))
        }
        break
      case "today":
        setStartDate(startOfDay(today))
        setEndDate(endOfDay(today))
        break
      case "yesterday":
        const yesterday = subDays(today, 1)
        setStartDate(startOfDay(yesterday))
        setEndDate(endOfDay(yesterday))
        break
      case "last7days":
        setStartDate(startOfDay(subDays(today, 6)))
        setEndDate(endOfDay(today))
        break
      case "last30days":
        setStartDate(startOfDay(subDays(today, 29)))
        setEndDate(endOfDay(today))
        break
      case "thisWeek":
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }))
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }))
        break
      case "thisMonth":
        setStartDate(startOfMonth(today))
        setEndDate(endOfMonth(today))
        break
      case "lastMonth":
        const lastMonth = subMonths(today, 1)
        setStartDate(startOfMonth(lastMonth))
        setEndDate(endOfMonth(lastMonth))
        break
      case "all":
        setStartDate(undefined)
        setEndDate(undefined)
        break
      case "custom":
        // User will set dates manually
        break
    }
  }

  const handleSearch = () => {
    loadPayments()
  }

  const getAllocationStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_applied':
        return <Badge variant="default" className="bg-green-600">Fully Applied</Badge>
      case 'partially_applied':
        return <Badge variant="secondary" className="bg-yellow-600">Partially Applied</Badge>
      case 'unapplied':
        return <Badge variant="destructive">Unapplied</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handlePrintReport = () => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)

    // Handle date filter for print - use IST utilities to prevent timezone issues
    if (datePreset === 'custom' && startDate && endDate) {
      params.append('date_from', formatDateForDatabase(startDate))
      params.append('date_to', formatDateForDatabase(endDate))
    } else {
      params.append('datePreset', datePreset)
    }

    if (paymentMethod !== 'all') params.append('paymentMethod', paymentMethod)
    if (allocationStatus !== 'all') params.append('allocationStatus', allocationStatus)

    const printUrl = `/api/print/payment-collection?${params.toString()}`
    window.open(printUrl, '_blank')
  }

  const handleExport = () => {
    // Generate CSV export
    const csvHeaders = "Payment Date,Customer,Amount,Payment Method,Allocation Status,Applied,Unapplied,Notes"
    const csvRows = payments.map(p =>
      `${p.payment_date},${p.customer_name},${p.amount},${p.payment_method || ''},${p.allocation_status},${p.amount_applied},${p.amount_unapplied},"${p.notes || ''}"`
    )
    const csvContent = [csvHeaders, ...csvRows].join("\n")

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `payment-report-${formatDateForDatabase(getCurrentISTDate())}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Payment report exported successfully")
  }

  // Calculate summary stats
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalApplied = payments.reduce((sum, p) => sum + p.amount_applied, 0)
  const totalUnapplied = payments.reduce((sum, p) => sum + p.amount_unapplied, 0)
  const paymentCount = payments.length

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentCount}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalAmount)} collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">All payment transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Amount Allocated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalApplied)}</div>
            <p className="text-xs text-muted-foreground">Applied to invoices/sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unapplied Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalUnapplied)}</div>
            <p className="text-xs text-muted-foreground">Pending allocation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Filters</CardTitle>
              <CardDescription>Filter payments by date, method, and status</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrintReport}>
                <Printer className="mr-2 h-4 w-4" />
                Print Report
              </Button>
              <Button size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First Row: Search and Date Preset */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="space-y-2 md:col-span-2">
                <Label>Search</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Customer name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Date Preset Dropdown */}
              <div className="space-y-2">
                <Label>Date Preset</Label>
                <Select value={datePreset} onValueChange={handlePresetChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Quick select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mostRecent">Most Recent</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row: Date Range and Filter Dropdowns */}
            <div className="grid gap-4 md:grid-cols-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <UnifiedDatePicker
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date)
                    if (datePreset !== "custom") setDatePreset("custom")
                  }}
                  placeholder="DD-MM-YYYY"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <UnifiedDatePicker
                  value={endDate}
                  onChange={(date) => {
                    setEndDate(date)
                    if (datePreset !== "custom") setDatePreset("custom")
                  }}
                  placeholder="DD-MM-YYYY"
                  minDate={startDate}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Credit">Credit</SelectItem>
                    <SelectItem value="QR">QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Allocation Status */}
              <div className="space-y-2">
                <Label>Allocation Status</Label>
                <Select value={allocationStatus} onValueChange={setAllocationStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="fully_applied">Fully Applied</SelectItem>
                    <SelectItem value="partially_applied">Partially Applied</SelectItem>
                    <SelectItem value="unapplied">Unapplied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleApplyFilters} className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>
            {loading ? "Loading..." : `Showing ${payments.length} payment(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Unapplied</TableHead>
                  <TableHead>Allocations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading payment data...
                    </TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No payments found matching the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDateIST(new Date(payment.payment_date))}</TableCell>
                      <TableCell>
                        <div className="font-medium">{payment.customer_name}</div>
                        {payment.customer_contact && (
                          <div className="text-sm text-muted-foreground">{payment.customer_contact}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.payment_method || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell>{getAllocationStatusBadge(payment.allocation_status)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(payment.amount_applied)}</TableCell>
                      <TableCell className="text-orange-600">{formatCurrency(payment.amount_unapplied)}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {payment.invoice_allocations.length > 0 && (
                            <div>
                              <span className="font-medium">Invoices:</span> {payment.invoice_allocations.length}
                            </div>
                          )}
                          {payment.sales_allocations.length > 0 && (
                            <div>
                              <span className="font-medium">Sales:</span> {payment.sales_allocations.length}
                            </div>
                          )}
                          {payment.opening_balance_allocation > 0 && (
                            <div>
                              <span className="font-medium">Opening:</span> {formatCurrency(payment.opening_balance_allocation)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
