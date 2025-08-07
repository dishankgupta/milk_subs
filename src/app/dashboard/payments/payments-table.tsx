"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableTableHead } from "@/components/ui/sortable-table-head"
import { useSorting } from "@/hooks/useSorting"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Eye, Edit, Trash2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { deletePayment } from "@/lib/actions/payments"
import { toast } from "sonner"
import type { Payment } from "@/lib/types"

interface PaymentsTableProps {
  initialPayments: Payment[]
  initialTotal: number
  searchParams: {
    search?: string
    customer_id?: string
    payment_method?: string
    page?: string
  }
}

export default function PaymentsTable({ 
  initialPayments, 
  initialTotal, 
  searchParams 
}: PaymentsTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "")

  // Apply sorting to payments with default sort by payment date descending
  const { sortedData: sortedPayments, sortConfig, handleSort } = useSorting(
    initialPayments,
    'payment_date',
    'desc'
  )

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    params.delete("page") // Reset to first page
    router.push(`/dashboard/payments?${params.toString()}`)
  }

  const handleDeletePayment = async (id: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete this payment from ${customerName}? This will update their outstanding amount.`)) {
      return
    }

    try {
      await deletePayment(id)
      toast.success("Payment deleted successfully")
      router.refresh()
    } catch (error) {
      toast.error(`Failed to delete payment: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {initialTotal === 0 ? "No payments found" : `${initialTotal} payment${initialTotal === 1 ? "" : "s"} found`}
      </div>

      {/* Payments Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead 
                sortKey="customer.billing_name" 
                sortConfig={sortConfig} 
                onSort={handleSort}
              >
                Customer
              </SortableTableHead>
              <SortableTableHead 
                sortKey="amount" 
                sortConfig={sortConfig} 
                onSort={handleSort}
              >
                Amount
              </SortableTableHead>
              <SortableTableHead 
                sortKey="payment_date" 
                sortConfig={sortConfig} 
                onSort={handleSort}
              >
                Payment Date
              </SortableTableHead>
              <SortableTableHead 
                sortKey="payment_method" 
                sortConfig={sortConfig} 
                onSort={handleSort}
              >
                Method
              </SortableTableHead>
              <TableHead>Period</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              sortedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {payment.customer?.billing_name || "Unknown Customer"}
                      </div>
                      {payment.customer?.contact_person && (
                        <div className="text-sm text-muted-foreground">
                          {payment.customer.contact_person}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-600">
                      {formatCurrency(payment.amount)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    {payment.payment_method ? (
                      <Badge variant="secondary">{payment.payment_method}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.period_start && payment.period_end ? (
                      <div className="text-sm">
                        {format(new Date(payment.period_start), "MMM dd")} - {format(new Date(payment.period_end), "MMM dd, yyyy")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.notes ? (
                      <div className="max-w-[200px] truncate text-sm" title={payment.notes}>
                        {payment.notes}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/payments/${payment.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/payments/${payment.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Payment
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeletePayment(payment.id, payment.customer?.billing_name || "Unknown Customer")}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Payment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}