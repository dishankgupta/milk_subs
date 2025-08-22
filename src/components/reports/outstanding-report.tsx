"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  FileText, 
  Printer,
  Download,
  Calculator,
  Loader2,
  Search
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatCurrency, cn, formatDateForAPI } from "@/lib/utils"
import { useSorting } from "@/hooks/useSorting"
import { generateOutstandingReport } from "@/lib/actions/outstanding-reports"
import { outstandingReportSchema, type OutstandingReportFormData } from "@/lib/validations"
import { toast } from "sonner"

import type { OutstandingCustomerData, OutstandingReportSummary } from "@/lib/types/outstanding-reports"

export function OutstandingReport() {
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<{
    customers: OutstandingCustomerData[]
    summary: OutstandingReportSummary
  } | null>(null)
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedSubSections, setExpandedSubSections] = useState<Set<string>>(new Set())
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState("")

  const form = useForm<OutstandingReportFormData>({
    resolver: zodResolver(outstandingReportSchema),
    defaultValues: {
      start_date: new Date(2025, 7, 1), // Fixed date to prevent hydration issues
      end_date: new Date(2025, 7, 22), // Today's date (22nd August 2025)
      customer_selection: "with_outstanding"
    }
  })

  const generateReport = async (data: OutstandingReportFormData) => {
    setIsLoading(true)
    try {
      // Reset previous data to show loading state
      setReportData(null)
      
      const result = await generateOutstandingReport({
        start_date: data.start_date,
        end_date: data.end_date,
        customer_selection: data.customer_selection,
        selected_customer_ids: data.selected_customer_ids
      })
      
      setReportData(result)
      toast.success(`Report generated for ${result.customers.length} customers in improved performance mode!`)
    } catch (error) {
      toast.error("Failed to generate outstanding report")
      console.error("Outstanding report error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCustomerExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers)
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId)
      // Also collapse all subsections for this customer
      const customerKeys = Array.from(expandedSections).filter(key => key.startsWith(customerId))
      customerKeys.forEach(key => expandedSections.delete(key))
      const subKeys = Array.from(expandedSubSections).filter(key => key.startsWith(customerId))
      subKeys.forEach(key => expandedSubSections.delete(key))
    } else {
      newExpanded.add(customerId)
    }
    setExpandedCustomers(newExpanded)
  }

  const toggleSectionExpansion = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey)
      // Also collapse all subsections
      const subKeys = Array.from(expandedSubSections).filter(key => key.startsWith(sectionKey))
      subKeys.forEach(key => expandedSubSections.delete(key))
    } else {
      newExpanded.add(sectionKey)
    }
    setExpandedSections(newExpanded)
  }

  const toggleSubSectionExpansion = (subSectionKey: string) => {
    const newExpanded = new Set(expandedSubSections)
    if (newExpanded.has(subSectionKey)) {
      newExpanded.delete(subSectionKey)
    } else {
      newExpanded.add(subSectionKey)
    }
    setExpandedSubSections(newExpanded)
  }

  const toggleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers)
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId)
    } else {
      newSelection.add(customerId)
    }
    setSelectedCustomers(newSelection)
  }

  // Filter customers based on search query
  const filteredCustomers = reportData?.customers.filter(customer => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      customer.customer.billing_name.toLowerCase().includes(query) ||
      customer.customer.contact_person.toLowerCase().includes(query) ||
      (customer.customer.route?.name && customer.customer.route.name.toLowerCase().includes(query))
    )
  }) || []

  // Apply sorting to filtered customers
  const { sortedData: sortedCustomers, sortConfig, handleSort } = useSorting(
    filteredCustomers,
    'customer.billing_name',
    'asc',
    (item, key) => {
      if (key === 'customer.billing_name') return item.customer.billing_name
      if (key === 'opening_balance') return item.opening_balance
      if (key === 'subscription_amount') return item.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
      if (key === 'manual_sales_amount') return item.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
      if (key === 'payments_amount') return item.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
      if (key === 'total_outstanding') return item.total_outstanding
      return item[key as keyof OutstandingCustomerData]
    }
  )

  const selectAllCustomers = (select: boolean) => {
    if (select && reportData) {
      setSelectedCustomers(new Set(sortedCustomers.map(c => c.customer.id)))
    } else {
      setSelectedCustomers(new Set())
    }
  }

  const printReport = (printType: 'summary' | 'statements' | 'complete') => {
    if (!reportData) return
    
    const params = new URLSearchParams({
      type: printType,
      start_date: formatDateForAPI(form.getValues("start_date")),
      end_date: formatDateForAPI(form.getValues("end_date")),
      customer_selection: form.getValues("customer_selection"),
    })

    if (printType === 'statements' && selectedCustomers.size > 0) {
      params.set("selected_customer_ids", Array.from(selectedCustomers).join(','))
    }

    window.open(`/api/print/outstanding-report?${params.toString()}`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Outstanding Amounts Report Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(generateReport)} className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date (Opening Balance Date)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("start_date") && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {form.watch("start_date") ? (
                        format(form.watch("start_date"), "PPP")
                      ) : (
                        "Pick start date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={form.watch("start_date")}
                      onSelect={(date) => form.setValue("start_date", date || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500">
                  Opening balance will be calculated as of this date
                </p>
              </div>

              <div className="space-y-2">
                <Label>End Date (Outstanding Calculation Date)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.watch("end_date") && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {form.watch("end_date") ? (
                        format(form.watch("end_date"), "PPP")
                      ) : (
                        "Pick end date"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={form.watch("end_date")}
                      onSelect={(date) => form.setValue("end_date", date || new Date())}
                      disabled={(date) => date < form.watch("start_date")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="space-y-3">
              <Label>Customer Selection</Label>
              <RadioGroup
                value={form.watch("customer_selection")}
                onValueChange={(value) => form.setValue("customer_selection", value as 'all' | 'with_outstanding')}
                className="grid grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all">All Customers</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="with_outstanding" id="with_outstanding" />
                  <Label htmlFor="with_outstanding">Customers with Outstanding &gt; 0</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Generate Button */}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Report...
                </>
              ) : (
                "Generate Outstanding Report"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && !reportData && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">Generating Outstanding Report</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Processing customer data with optimized performance...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Summary */}
      {reportData && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Summary
              </CardTitle>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => printReport('summary')}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => printReport('statements')}>
                  <Download className="h-4 w-4 mr-2" />
                  Print Customer Statements
                </Button>
                <Button size="sm" onClick={() => printReport('complete')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Print Complete Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {reportData.summary.total_customers}
                </div>
                <div className="text-sm text-blue-800">Total Customers</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {reportData.summary.customers_with_outstanding}
                </div>
                <div className="text-sm text-red-800">With Outstanding</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.summary.total_subscription_amount)}
                </div>
                <div className="text-sm text-green-800">Subscription Amount</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(reportData.summary.total_outstanding_amount)}
                </div>
                <div className="text-sm text-purple-800">Total Outstanding</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Report Table */}
      {reportData && (
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-between items-center">
                <CardTitle>Detailed Outstanding Report</CardTitle>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedCustomers.size === sortedCustomers.length && sortedCustomers.length > 0}
                      onCheckedChange={selectAllCustomers}
                    />
                    <Label className="text-sm">Select All</Label>
                  </div>
                  <Badge variant="secondary">
                    {selectedCustomers.size} selected
                  </Badge>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {sortedCustomers.length} of {reportData.customers.length} customers
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead className="w-12">Expand</TableHead>
                    <SortableTableHead 
                      sortKey="customer.billing_name" 
                      sortConfig={sortConfig} 
                      onSort={handleSort}
                    >
                      Customer Name
                    </SortableTableHead>
                    <SortableTableHead 
                      sortKey="opening_balance" 
                      sortConfig={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Opening Balance
                    </SortableTableHead>
                    <SortableTableHead 
                      sortKey="subscription_amount" 
                      sortConfig={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Subscription
                    </SortableTableHead>
                    <SortableTableHead 
                      sortKey="manual_sales_amount" 
                      sortConfig={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Manual Sales
                    </SortableTableHead>
                    <SortableTableHead 
                      sortKey="payments_amount" 
                      sortConfig={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Payments
                    </SortableTableHead>
                    <SortableTableHead 
                      sortKey="total_outstanding" 
                      sortConfig={sortConfig} 
                      onSort={handleSort}
                      className="text-right"
                    >
                      Current Outstanding
                    </SortableTableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.map((customerData) => (
                    <React.Fragment key={customerData.customer.id}>
                      {/* Level 1: Customer Summary Row */}
                      <TableRow className="hover:bg-gray-50">
                        <TableCell>
                          <Checkbox
                            checked={selectedCustomers.has(customerData.customer.id)}
                            onCheckedChange={() => toggleCustomerSelection(customerData.customer.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCustomerExpansion(customerData.customer.id)}
                          >
                            {expandedCustomers.has(customerData.customer.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customerData.customer.billing_name}</div>
                            <div className="text-sm text-gray-500">
                              {customerData.customer.contact_person} • {customerData.customer.route?.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(customerData.opening_balance)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            customerData.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(
                            customerData.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          -{formatCurrency(
                            customerData.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg">
                          <Badge variant={customerData.total_outstanding > 0 ? "destructive" : "default"}>
                            {formatCurrency(customerData.total_outstanding)}
                          </Badge>
                        </TableCell>
                      </TableRow>

                      {/* Level 2: Expanded Customer Details */}
                      {expandedCustomers.has(customerData.customer.id) && (
                        <TableRow key={`${customerData.customer.id}-expanded`}>
                          <TableCell colSpan={8} className="p-0">
                            <div className="bg-gray-50 p-4 space-y-4">
                              {/* Opening Balance */}
                              <div className="bg-white p-3 rounded border">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-gray-700">
                                    Opening Balance (as of {format(form.watch("start_date"), 'dd/MM/yyyy')}):
                                  </span>
                                  <span className="font-bold text-lg">
                                    {formatCurrency(customerData.opening_balance)}
                                  </span>
                                </div>
                              </div>

                              {/* Subscription Dues */}
                              {customerData.subscription_breakdown.length > 0 && (
                                <div className="bg-white p-3 rounded border">
                                  <Collapsible>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="w-full justify-between p-0 h-auto"
                                        onClick={() => toggleSectionExpansion(`${customerData.customer.id}-subscriptions`)}
                                      >
                                        <span className="font-medium text-gray-700">Subscription Dues:</span>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-bold">
                                            +{formatCurrency(
                                              customerData.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
                                            )}
                                          </span>
                                          {expandedSections.has(`${customerData.customer.id}-subscriptions`) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </div>
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 mt-2">
                                      {customerData.subscription_breakdown.map((month) => (
                                        <div key={month.month} className="ml-4 border-l-2 border-gray-200 pl-4">
                                          <Collapsible>
                                            <CollapsibleTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-between p-0 h-auto"
                                                onClick={() => toggleSubSectionExpansion(`${customerData.customer.id}-${month.month}`)}
                                              >
                                                <span className="font-medium">{month.month_display}:</span>
                                                <div className="flex items-center space-x-2">
                                                  <span className="font-semibold">{formatCurrency(month.total_amount)}</span>
                                                  {expandedSubSections.has(`${customerData.customer.id}-${month.month}`) ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )}
                                                </div>
                                              </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="mt-2 space-y-1">
                                              {/* Level 3: Product Details */}
                                              {month.product_details.map((product, index) => (
                                                <div key={`product-${customerData.customer.id}-${month.month}-${index}`} className="bg-blue-50 p-2 rounded text-sm">
                                                  <div className="flex justify-between">
                                                    <span>
                                                      • {product.product_name}: {product.quantity} {product.unit_of_measure}
                                                    </span>
                                                    <span className="font-medium">
                                                      {formatCurrency(product.total_amount)}
                                                    </span>
                                                  </div>
                                                  <div className="text-xs text-gray-600 ml-2">
                                                    Daily: {product.daily_quantity} {product.unit_of_measure} × {product.delivery_days} days
                                                  </div>
                                                </div>
                                              ))}
                                            </CollapsibleContent>
                                          </Collapsible>
                                        </div>
                                      ))}
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              )}

                              {/* Manual Sales */}
                              {customerData.manual_sales_breakdown.length > 0 && (
                                <div className="bg-white p-3 rounded border">
                                  <Collapsible>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="w-full justify-between p-0 h-auto"
                                        onClick={() => toggleSectionExpansion(`${customerData.customer.id}-manual-sales`)}
                                      >
                                        <span className="font-medium text-gray-700">Manual Credit Sales:</span>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-bold">
                                            +{formatCurrency(
                                              customerData.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
                                            )}
                                          </span>
                                          {expandedSections.has(`${customerData.customer.id}-manual-sales`) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </div>
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2">
                                      <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-2">
                                        {customerData.manual_sales_breakdown.map((salesGroup, index) => (
                                          <div key={`salesgroup-${index}`}>
                                            {salesGroup.sale_details.map((sale) => (
                                              <div key={`sale-${sale.sale_id}`} className="bg-orange-50 p-2 rounded text-sm">
                                                <div className="flex justify-between">
                                                  <span>
                                                    • {sale.product_name}: {sale.quantity} {sale.unit_of_measure}
                                                  </span>
                                                  <span className="font-medium">
                                                    {formatCurrency(sale.total_amount)}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-600 ml-2">
                                                  {format(new Date(sale.sale_date), 'dd/MM/yyyy')} • 
                                                  ₹{sale.unit_price}/{sale.unit_of_measure}
                                                  {sale.gst_amount > 0 && ` • GST: ${formatCurrency(sale.gst_amount)}`}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              )}

                              {/* Payments */}
                              {customerData.payment_breakdown.length > 0 && (
                                <div className="bg-white p-3 rounded border">
                                  <Collapsible>
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        className="w-full justify-between p-0 h-auto"
                                        onClick={() => toggleSectionExpansion(`${customerData.customer.id}-payments`)}
                                      >
                                        <span className="font-medium text-gray-700">Payment History:</span>
                                        <div className="flex items-center space-x-2">
                                          <span className="font-bold text-green-600">
                                            -{formatCurrency(
                                              customerData.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
                                            )}
                                          </span>
                                          {expandedSections.has(`${customerData.customer.id}-payments`) ? (
                                            <ChevronDown className="h-4 w-4" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4" />
                                          )}
                                        </div>
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="mt-2">
                                      <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-2">
                                        {customerData.payment_breakdown.map((paymentGroup, index) => (
                                          <div key={`paymentgroup-${index}`}>
                                            {paymentGroup.payment_details.map((payment) => (
                                              <div key={`payment-${payment.payment_id}`} className="bg-green-50 p-2 rounded text-sm">
                                                <div className="flex justify-between">
                                                  <span>
                                                    • Payment ({payment.payment_method})
                                                  </span>
                                                  <span className="font-medium text-green-600">
                                                    {formatCurrency(payment.amount)}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-600 ml-2">
                                                  {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                                                  {payment.notes && ` • ${payment.notes}`}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </div>
                              )}

                              {/* Current Outstanding Total */}
                              <div className="bg-white p-3 rounded border border-l-4 border-l-red-500">
                                <div className="flex justify-between items-center">
                                  <span className="font-bold text-gray-700">Current Outstanding:</span>
                                  <span className="font-bold text-xl text-red-600">
                                    {formatCurrency(customerData.total_outstanding)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}