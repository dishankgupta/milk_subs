"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateForDatabase } from "@/lib/date-utils"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Eye, Search, Loader2, CalendarIcon, X } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, cn } from "@/lib/utils"
import { format } from "date-fns"
import { getInvoicesList, deleteInvoice, deleteInvoiceWithSalesRevert, bulkDeleteInvoicesWithSalesRevert } from "@/lib/actions/invoices"
import type { InvoiceMetadata } from "@/lib/types"

type InvoiceWithCustomer = InvoiceMetadata & { 
  customer: { 
    billing_name: string
    contact_person: string
    phone_primary: string 
  } 
}

interface InvoiceListProps {
  onStatsRefresh: () => void
}

export function InvoiceList({ onStatsRefresh }: InvoiceListProps) {
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invoice: InvoiceWithCustomer | null }>({ open: false, invoice: null })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set())
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false)

  const loadInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoicesList({
        status: statusFilter === "all" ? undefined : statusFilter,
        date_from: dateFrom ? formatDateForDatabase(dateFrom) : undefined,
        date_to: dateTo ? formatDateForDatabase(dateTo) : undefined,
        limit: 100
      })
      setInvoices(data as InvoiceWithCustomer[])
    } catch (error) {
      toast.error("Failed to load invoices")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, dateFrom, dateTo])

  useEffect(() => {
    loadInvoices()
  }, [loadInvoices])

  const handleDelete = async (invoice: InvoiceWithCustomer) => {
    setDeleteLoading(invoice.id)
    try {
      // Use enhanced deletion with automatic sales reversion
      const result = await deleteInvoiceWithSalesRevert(invoice.id)
      if (result.success) {
        const message = result.revertedSalesCount > 0 
          ? `Invoice deleted successfully. ${result.revertedSalesCount} credit sales reverted to pending.`
          : "Invoice deleted successfully."
        toast.success(message)
        await loadInvoices() // Refresh the list
        onStatsRefresh() // Refresh the stats
      } else {
        // Fallback to old method if enhanced method fails
        console.warn("Enhanced deletion failed, falling back to standard deletion")
        const fallbackResult = await deleteInvoice(invoice.id)
        if (fallbackResult.success) {
          toast.success(fallbackResult.message)
          await loadInvoices()
          onStatsRefresh()
        } else {
          toast.error(fallbackResult.message)
        }
      }
    } catch (error) {
      console.error("Invoice deletion error:", error)
      toast.error("Failed to delete invoice")
    } finally {
      setDeleteLoading(null)
      setDeleteDialog({ open: false, invoice: null })
    }
  }

  const openDeleteDialog = (invoice: InvoiceWithCustomer) => {
    setDeleteDialog({ open: true, invoice })
  }

  const handleBulkDelete = async () => {
    if (selectedInvoices.size === 0) return

    setBulkDeleteLoading(true)
    try {
      const invoiceIds = Array.from(selectedInvoices)
      // Use enhanced bulk deletion with automatic sales reversion
      const result = await bulkDeleteInvoicesWithSalesRevert(invoiceIds)
      
      if (result.successful > 0) {
        const successMessage = result.totalRevertedSales > 0
          ? `Successfully deleted ${result.successful} invoice(s). ${result.totalRevertedSales} credit sales reverted to pending.`
          : `Successfully deleted ${result.successful} invoice(s)`
        toast.success(successMessage)
      }
      
      if (result.failed > 0) {
        toast.error(`Failed to delete ${result.failed} invoice(s). ${result.errors.join(', ')}`)
      }
      
      setSelectedInvoices(new Set())
      await loadInvoices()
      onStatsRefresh() // Refresh the stats
    } catch (error) {
      console.error("Bulk invoice deletion error:", error)
      toast.error("Failed to delete invoices")
    } finally {
      setBulkDeleteLoading(false)
      setBulkDeleteDialog(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredInvoices.map(invoice => invoice.id))
      setSelectedInvoices(allIds)
    } else {
      setSelectedInvoices(new Set())
    }
  }

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelected = new Set(selectedInvoices)
    if (checked) {
      newSelected.add(invoiceId)
    } else {
      newSelected.delete(invoiceId)
    }
    setSelectedInvoices(newSelected)
  }

  const clearDateFilters = () => {
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.customer?.billing_name?.toLowerCase().includes(searchLower) ||
      invoice.customer?.contact_person?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Generated":
        return "bg-blue-100 text-blue-800"
      case "Sent":
        return "bg-yellow-100 text-yellow-800"
      case "Paid":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading invoices...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedInvoices.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            {selectedInvoices.size} invoice(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkDeleteDialog(true)}
            disabled={bulkDeleteLoading}
          >
            {bulkDeleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Selected
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="Generated">Generated</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>

        {/* Date From */}
        <div>
          <Label className="text-sm font-medium text-gray-700">From Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div>
          <Label className="text-sm font-medium text-gray-700">To Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Clear Date Filters */}
      {(dateFrom || dateTo) && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearDateFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Date Filters
          </Button>
        </div>
      )}

      {/* Invoice Cards */}
      <div className="space-y-4">
        {/* Select All */}
        {filteredInvoices.length > 0 && (
          <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="select-all"
              checked={filteredInvoices.length > 0 && selectedInvoices.size === filteredInvoices.length}
              onCheckedChange={handleSelectAll}
            />
            <Label htmlFor="select-all" className="text-sm font-medium">
              Select All ({filteredInvoices.length} invoices)
            </Label>
          </div>
        )}

        <div className="grid gap-4">
          {filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No invoices found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className={selectedInvoices.has(invoice.id) ? "ring-2 ring-blue-500" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        id={`invoice-${invoice.id}`}
                        checked={selectedInvoices.has(invoice.id)}
                        onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p><span className="font-medium">Customer:</span> {invoice.customer?.billing_name}</p>
                          <p><span className="font-medium">Contact:</span> {invoice.customer?.contact_person}</p>
                          <p><span className="font-medium">Period:</span> {format(new Date(invoice.period_start), 'dd/MM/yyyy')} - {format(new Date(invoice.period_end), 'dd/MM/yyyy')}</p>
                          <p><span className="font-medium">Date:</span> {format(new Date(invoice.invoice_date), 'dd/MM/yyyy')}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div>
                        <p className="text-2xl font-bold">{formatCurrency(invoice.total_amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Sub: {formatCurrency(invoice.subscription_amount)} | 
                          Sales: {formatCurrency(invoice.manual_sales_amount)}
                        </p>
                        {invoice.gst_amount > 0 && (
                          <p className="text-sm text-muted-foreground">
                            GST: {formatCurrency(invoice.gst_amount)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/print/customer-invoice?invoice_number=${invoice.invoice_number}`, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog(invoice)}
                          disabled={deleteLoading === invoice.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          {deleteLoading === invoice.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, invoice: deleteDialog.invoice })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice <strong>{deleteDialog.invoice?.invoice_number}</strong> 
              for customer <strong>{deleteDialog.invoice?.customer?.billing_name}</strong>?
              <br /><br />
              <span className="text-amber-600 font-medium">⚠️ Warning:</span>
              <br />
              • This action cannot be undone
              <br />
              • Credit sales will be reverted to &quot;Pending&quot; status
              <br />
              • Customer outstanding balance will be recalculated
              <br />
              • You will need to manually delete the PDF files
              <br />
              {deleteDialog.invoice?.status === 'Paid' && (
                <>
                  <br />
                  <span className="text-red-600 font-medium">❌ Cannot delete paid invoices</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.invoice && handleDelete(deleteDialog.invoice)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteDialog.invoice?.status === 'Paid'}
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Invoices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{selectedInvoices.size}</strong> selected invoice(s)?
              <br /><br />
              <span className="text-amber-600 font-medium">⚠️ Warning:</span>
              <br />
              • This action cannot be undone
              <br />
              • Credit sales will be reverted to &quot;Pending&quot; status for all invoices
              <br />
              • Customer outstanding balances will be recalculated
              <br />
              • You will need to manually delete the PDF files
              <br />
              • Paid invoices will be skipped and not deleted
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedInvoices.size} Invoices
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}