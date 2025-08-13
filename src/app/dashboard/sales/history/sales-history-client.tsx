'use client'

import { useState } from 'react'
import { Trash2, Edit, MoreVertical } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import type { Sale } from '@/lib/types'

interface SalesHistoryClientProps {
  sales: Sale[]
}

export function SalesHistoryClient({ sales }: SalesHistoryClientProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  if (sales.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No sales transactions found
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {sales.map((sale) => (
          <div key={sale.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{sale.product?.name}</h3>
                  <Badge variant={sale.sale_type === 'Cash' ? 'default' : 'secondary'}>
                    {sale.sale_type}
                  </Badge>
                  <Badge 
                    variant={
                      sale.payment_status === 'Completed' ? 'default' : 
                      sale.payment_status === 'Pending' ? 'destructive' : 'outline'
                    }
                  >
                    {sale.payment_status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {sale.customer && (
                    <span>{sale.customer.billing_name} - {sale.customer.contact_person} • </span>
                  )}
                  {sale.quantity} {sale.product?.unit_of_measure} @ {formatCurrency(sale.unit_price)}
                </div>
                <div className="text-xs text-gray-500">
                  {format(new Date(sale.sale_date), 'PPP')}
                  {sale.notes && <span> • {sale.notes}</span>}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-lg font-semibold">{formatCurrency(sale.total_amount)}</div>
                  {sale.gst_amount > 0 && (
                    <div className="text-sm text-gray-600">
                      GST: {formatCurrency(sale.gst_amount)}
                    </div>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
              </div>
            </div>
          </div>
        ))}
      </div>

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
    </>
  )
}