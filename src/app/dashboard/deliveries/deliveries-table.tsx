"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { MoreHorizontal, Eye, Edit, Trash2, Package, User, Clock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { useSorting } from "@/hooks/useSorting"

import type { Delivery, DailyOrder, Customer, Product, Route } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { deleteDelivery } from "@/lib/actions/deliveries"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface DeliveriesTableProps {
  deliveries: (Delivery & {
    daily_order: DailyOrder & {
      customer: Customer
      product: Product
      route: Route
    }
  })[]
}

export function DeliveriesTable({ deliveries }: DeliveriesTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Apply sorting to deliveries with default sort by order date descending
  const { sortedData: sortedDeliveries, sortConfig, handleSort } = useSorting(
    deliveries,
    'daily_order.order_date',
    'desc'
  )

  async function handleDelete(id: string, customerName: string) {
    if (!confirm(`Are you sure you want to delete the delivery for ${customerName}?`)) {
      return
    }

    setDeletingId(id)
    try {
      await deleteDelivery(id)
      toast.success("Delivery deleted successfully")
    } catch (error) {
      console.error('Delete error:', error)
      toast.error("Failed to delete delivery")
    } finally {
      setDeletingId(null)
    }
  }

  if (sortedDeliveries.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Package className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No deliveries found</h3>
            <p>No delivery records match your current search criteria.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {sortedDeliveries.length} delivery{sortedDeliveries.length !== 1 ? 'ies' : 'y'}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Button
            variant={sortConfig?.key === 'daily_order.customer.billing_name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('daily_order.customer.billing_name')}
            className="text-xs h-7"
          >
            Customer
            {sortConfig?.key === 'daily_order.customer.billing_name' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'daily_order.order_date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('daily_order.order_date')}
            className="text-xs h-7"
          >
            Order Date
            {sortConfig?.key === 'daily_order.order_date' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'actual_quantity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('actual_quantity')}
            className="text-xs h-7"
          >
            Quantity
            {sortConfig?.key === 'actual_quantity' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'delivered_at' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('delivered_at')}
            className="text-xs h-7"
          >
            Delivered At
            {sortConfig?.key === 'delivered_at' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {sortedDeliveries.map((delivery) => {
        const order = delivery.daily_order
        const quantityVariance = (delivery.actual_quantity || 0) - order.planned_quantity
        const amountVariance = quantityVariance * order.unit_price

        return (
          <Card key={delivery.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  {/* Customer & Product Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{order.customer.billing_name}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer.contact_person}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{order.product.name}</span>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Order Date:</span>{" "}
                      {format(new Date(order.order_date), "PP")}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Route:</span>{" "}
                      {order.route.name} • {order.delivery_time}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Planned:</span>{" "}
                      {order.planned_quantity}L @ {formatCurrency(order.unit_price)}/L
                    </div>
                  </div>

                  {/* Delivery Details */}
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Actual:</span>{" "}
                      {delivery.actual_quantity || 0}L
                      {quantityVariance !== 0 && (
                        <span className={quantityVariance > 0 ? "text-green-600 ml-1" : "text-red-600 ml-1"}>
                          ({quantityVariance > 0 ? "+" : ""}{quantityVariance}L)
                        </span>
                      )}
                    </div>
                    
                    {delivery.delivered_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(delivery.delivered_at), "PP 'at' p")}</span>
                      </div>
                    )}
                    
                    {delivery.delivery_person && (
                      <div className="text-sm">
                        <span className="font-medium">Delivered by:</span>{" "}
                        {delivery.delivery_person}
                      </div>
                    )}

                    {/* Amount Variance Badge */}
                    {amountVariance !== 0 && (
                      <Badge variant={amountVariance > 0 ? "default" : "destructive"} className="w-fit">
                        {amountVariance > 0 ? "+" : ""}{formatCurrency(amountVariance)}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        disabled={deletingId === delivery.id}
                      >
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/dashboard/deliveries/${delivery.id}`}>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                      </Link>
                      <Link href={`/dashboard/deliveries/${delivery.id}/edit`}>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Delivery
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(delivery.id, order.customer.billing_name)}
                        className="text-red-600 focus:text-red-600"
                        disabled={deletingId === delivery.id}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletingId === delivery.id ? "Deleting..." : "Delete"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Delivery Notes */}
              {delivery.delivery_notes && (
                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm">
                    <span className="font-medium">Notes:</span>{" "}
                    <span className="text-muted-foreground">{delivery.delivery_notes}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}