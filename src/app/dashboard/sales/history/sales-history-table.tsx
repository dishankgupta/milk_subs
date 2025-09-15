'use client'

import { useState, useEffect } from 'react'
import { Trash2, Edit, Eye, MoreVertical, Search, Download, Printer } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { formatDateIST, formatWithIST, parseLocalDateIST, formatDateForDatabase, getCurrentISTDate } from '@/lib/date-utils'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SortableTableHead } from '@/components/ui/sortable-table-head'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteSale } from '@/lib/actions/sales'
import { formatCurrency } from '@/lib/utils'
import { useSorting } from '@/hooks/useSorting'
import type { Sale } from '@/lib/types'

interface SalesHistoryTableProps {
  sales: Sale[]
}

export function SalesHistoryTable({ sales }: SalesHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [dateFromFilter, setDateFromFilter] = useState<string>('')
  const [dateToFilter, setDateToFilter] = useState<string>('')
  const [dateFiltersModified, setDateFiltersModified] = useState(false) // Track user modifications
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Fix hydration mismatch by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Set default date range to current month
  useEffect(() => {
    if (isClient && !dateFiltersModified) {
      const today = getCurrentISTDate()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFromFilter(formatDateForDatabase(firstDay))
      setDateToFilter(formatDateForDatabase(today))
    }
  }, [isClient, dateFiltersModified])

  // Filter sales based on search and filters
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchQuery === '' || 
      sale.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.product?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer?.billing_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer?.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSaleType = saleTypeFilter === 'all' || sale.sale_type === saleTypeFilter
    const matchesPaymentStatus = paymentStatusFilter === 'all' || sale.payment_status === paymentStatusFilter

    // Date range filtering
    let matchesDateRange = true
    if (dateFromFilter || dateToFilter) {
      const saleDate = new Date(sale.sale_date)
      
      if (dateFromFilter && dateFromFilter.length >= 8) { // Basic validation: YYYY-MM-DD is at least 8 chars
        try {
          const fromDate = parseLocalDateIST(dateFromFilter)
          if (saleDate < fromDate) matchesDateRange = false
        } catch (error) {
          // Invalid date format, skip filtering
          console.warn('Invalid from date format:', dateFromFilter)
        }
      }
      
      if (dateToFilter && dateToFilter.length >= 8) { // Basic validation: YYYY-MM-DD is at least 8 chars
        try {
          const toDate = parseLocalDateIST(dateToFilter)
          // Set time to end of day for inclusive filtering
          toDate.setHours(23, 59, 59, 999)
          if (saleDate > toDate) matchesDateRange = false
        } catch (error) {
          // Invalid date format, skip filtering
          console.warn('Invalid to date format:', dateToFilter)
        }
      }
    }

    return matchesSearch && matchesSaleType && matchesPaymentStatus && matchesDateRange
  })

  // Apply sorting to filtered sales
  const { sortedData: sortedSales, sortConfig, handleSort } = useSorting(
    filteredSales,
    'sale_date',
    'desc'
  )

  const handleDeleteClick = (sale: Sale) => {
    setSaleToDelete(sale)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteSale(saleToDelete.id)
      
      if (result.success) {
        toast.success('Sale deleted successfully')
        // Refresh the page to update the list
        window.location.reload()
      } else {
        toast.error(result.error || 'Failed to delete sale')
      }
    } catch (error) {
      console.error('Error deleting sale:', error)
      toast.error('Failed to delete sale')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setSaleToDelete(null)
    }
  }

  // Date filter handlers with modification tracking
  const handleDateFromChange = (value: string) => {
    setDateFromFilter(value)
    setDateFiltersModified(true)
  }

  const handleDateToChange = (value: string) => {
    setDateToFilter(value)
    setDateFiltersModified(true)
  }

  const handleClearDates = () => {
    // Reset to default current month range
    const today = getCurrentISTDate()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    setDateFromFilter(formatDateForDatabase(firstDay))
    setDateToFilter(formatDateForDatabase(today))
    setDateFiltersModified(false) // Back to system defaults
  }

  const handlePrint = () => {
    try {
      // Build query parameters from current filters
      const params = new URLSearchParams()
      
      if (searchQuery) params.set('search', searchQuery)
      if (saleTypeFilter !== 'all') params.set('sale_type', saleTypeFilter)
      if (paymentStatusFilter !== 'all') params.set('payment_status', paymentStatusFilter)
      
      // Only add date parameters if user explicitly modified them
      if (dateFiltersModified) {
        if (dateFromFilter) params.set('date_from', dateFromFilter)
        if (dateToFilter) params.set('date_to', dateToFilter)
      }
      
      // Add sorting parameters
      if (sortConfig?.key) params.set('sort_by', sortConfig.key)
      if (sortConfig?.direction) params.set('sort_order', sortConfig.direction)
      
      // Open print page in new window
      const printUrl = `/api/print/sales-history?${params.toString()}`
      window.open(printUrl, '_blank')
      
      toast.success('Print report generated successfully')
    } catch (error) {
      console.error('Error generating print report:', error)
      toast.error('Failed to generate print report')
    }
  }

  const handleExport = () => {
    try {
      // Create CSV content
      const headers = [
        'Date',
        'Customer Name',
        'Contact Person', 
        'Product Name',
        'Product Code',
        'Quantity',
        'Unit of Measure',
        'Unit Price',
        'GST Amount',
        'Total Amount',
        'Sale Type',
        'Payment Status',
        'Notes'
      ]

      const csvContent = [
        headers.join(','),
        ...sortedSales.map(sale => [
          format(new Date(sale.sale_date), 'dd/MM/yyyy'),
          `"${sale.customer?.billing_name || ''}"`,
          `"${sale.customer?.contact_person || ''}"`,
          `"${sale.product?.name || ''}"`,
          `"${sale.product?.code || ''}"`,
          sale.quantity,
          `"${sale.product?.unit_of_measure || ''}"`,
          sale.unit_price,
          sale.gst_amount,
          sale.total_amount,
          sale.sale_type,
          sale.payment_status,
          `"${sale.notes || ''}"`
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `sales-history-${format(new Date(), 'yyyy-MM-dd')}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${sortedSales.length} sales records`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export sales data')
    }
  }

  // Show loading state during hydration to prevent mismatch
  if (!isClient) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading sales data...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search sales..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        <div className="flex gap-4 items-center">
          <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sale Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Credit">Credit</SelectItem>
              <SelectItem value="QR">QR</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Billed">Billed</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filters */}
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              placeholder="From Date"
              value={dateFromFilter}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-[150px]"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              placeholder="To Date"
              value={dateToFilter}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-[150px]"
            />
          </div>

          {/* Reset Date Filter Button */}
          {dateFiltersModified && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDates}
            >
              Reset to Current Month
            </Button>
          )}

          <div className="text-sm text-muted-foreground">
            Showing {sortedSales.length} of {sales.length} sales
          </div>
        </div>
      </div>

      {/* Sales Table */}
      {sortedSales.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery || saleTypeFilter !== 'all' || paymentStatusFilter !== 'all' 
            ? 'No sales match your filters' 
            : 'No sales transactions found'
          }
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  sortKey="sale_date"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Date
                </SortableTableHead>
                <SortableTableHead
                  sortKey="customer.billing_name"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Customer
                </SortableTableHead>
                <SortableTableHead
                  sortKey="product.name"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Product
                </SortableTableHead>
                <SortableTableHead
                  sortKey="quantity"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Quantity
                </SortableTableHead>
                <SortableTableHead
                  sortKey="unit_price"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Unit Price
                </SortableTableHead>
                <SortableTableHead
                  sortKey="total_amount"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Total Amount
                </SortableTableHead>
                <SortableTableHead
                  sortKey="sale_type"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Type
                </SortableTableHead>
                <SortableTableHead
                  sortKey="payment_status"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                >
                  Status
                </SortableTableHead>
                <SortableTableHead
                  sortKey="notes"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  className="max-w-[150px]"
                >
                  Notes
                </SortableTableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div className="font-medium">
                      {formatDateIST(new Date(sale.sale_date)).split('/').map((part, i) => i === 2 ? part.slice(-2) : part).join('/')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatWithIST(new Date(sale.sale_date), 'EEE')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {sale.customer ? (
                      <div>
                        <div className="font-medium">{sale.customer.billing_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {sale.customer.contact_person}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{sale.product?.name}</div>
                    {sale.product?.code && (
                      <div className="text-sm text-muted-foreground">{sale.product.code}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {sale.quantity} {sale.product?.unit_of_measure}
                  </TableCell>
                  <TableCell>{formatCurrency(sale.unit_price)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
                    {sale.gst_amount > 0 && (
                      <div className="text-xs text-muted-foreground">
                        GST: {formatCurrency(sale.gst_amount)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={sale.sale_type === 'Cash' ? 'default' : 'secondary'}>
                      {sale.sale_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        sale.payment_status === 'Completed' ? 'default' :
                        sale.payment_status === 'Pending' ? 'destructive' : 'outline'
                      }
                    >
                      {sale.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    {sale.notes ? (
                      <div className="text-sm truncate" title={sale.notes}>
                        {sale.notes}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/sales/${sale.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/sales/${sale.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(sale)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {saleToDelete?.sale_type.toLowerCase()} sale of{' '}
              {saleToDelete?.product?.name} for {formatCurrency(saleToDelete?.total_amount || 0)}?
              {saleToDelete?.sale_type === 'Credit' && saleToDelete?.customer && (
                <span className="block mt-2 text-amber-600">
                  This will also reduce {saleToDelete.customer.billing_name}&apos;s outstanding amount 
                  by {formatCurrency(saleToDelete.total_amount)}.
                </span>
              )}
              <span className="block mt-2 font-medium">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Sale'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}