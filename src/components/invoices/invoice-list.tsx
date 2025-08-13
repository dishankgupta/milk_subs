"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Eye, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { getInvoicesList, deleteInvoice } from "@/lib/actions/invoices"
import type { InvoiceMetadata } from "@/lib/types"

type InvoiceWithCustomer = InvoiceMetadata & { 
  customer: { 
    billing_name: string
    contact_person: string
    phone_primary: string 
  } 
}

export function InvoiceList() {
  const [invoices, setInvoices] = useState<InvoiceWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; invoice: InvoiceWithCustomer | null }>({ open: false, invoice: null })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const data = await getInvoicesList({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100
      })
      setInvoices(data as InvoiceWithCustomer[])
    } catch (error) {
      toast.error("Failed to load invoices")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [statusFilter]) // loadInvoices dependency not needed as it doesn't change

  const handleDelete = async (invoice: InvoiceWithCustomer) => {
    setDeleteLoading(invoice.id)
    try {
      const result = await deleteInvoice(invoice.id)
      if (result.success) {
        toast.success(result.message)
        await loadInvoices() // Refresh the list
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Failed to delete invoice")
      console.error(error)
    } finally {
      setDeleteLoading(null)
      setDeleteDialog({ open: false, invoice: null })
    }
  }

  const openDeleteDialog = (invoice: InvoiceWithCustomer) => {
    setDeleteDialog({ open: true, invoice })
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
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Invoices</SelectItem>
            <SelectItem value="Generated">Generated</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Cards */}
      <div className="grid gap-4">
        {filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No invoices found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card key={invoice.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
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
    </div>
  )
}