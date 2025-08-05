"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Subscription } from "@/lib/types"
import { searchSubscriptions, toggleSubscriptionStatus } from "@/lib/actions/subscriptions"
import { formatCurrency } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Edit, MoreHorizontal, Play, Pause } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface SubscriptionsTableProps {
  initialSubscriptions: Subscription[]
}

export function SubscriptionsTable({ initialSubscriptions }: SubscriptionsTableProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initialSubscriptions)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "Daily" | "Pattern">("all")
  const [isLoading, setIsLoading] = useState(false)

  // Search functionality
  useEffect(() => {
    const delayedSearch = setTimeout(async () => {
      if (searchQuery.trim()) {
        setIsLoading(true)
        try {
          const results = await searchSubscriptions(searchQuery)
          setSubscriptions(results)
        } catch {
          toast.error("Failed to search subscriptions")
        } finally {
          setIsLoading(false)
        }
      } else {
        setSubscriptions(initialSubscriptions)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery, initialSubscriptions])

  // Filter subscriptions based on status and type
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const statusMatch = statusFilter === "all" || 
      (statusFilter === "active" && subscription.is_active) ||
      (statusFilter === "inactive" && !subscription.is_active)
    
    const typeMatch = typeFilter === "all" || subscription.subscription_type === typeFilter
    
    return statusMatch && typeMatch
  })

  const handleToggleStatus = async (subscriptionId: string) => {
    try {
      const result = await toggleSubscriptionStatus(subscriptionId)
      if (result.success && result.data) {
        setSubscriptions(prev => 
          prev.map(sub => 
            sub.id === subscriptionId ? result.data! : sub
          )
        )
        toast.success(`Subscription ${result.data.is_active ? 'activated' : 'deactivated'} successfully`)
      } else {
        toast.error(result.error || "Failed to update subscription status")
      }
    } catch {
      toast.error("Failed to update subscription status")
    }
  }

  const getSubscriptionDetails = (subscription: Subscription) => {
    if (subscription.subscription_type === "Daily") {
      return `${subscription.daily_quantity}L daily`
    } else {
      return `Day 1: ${subscription.pattern_day1_quantity}L, Day 2: ${subscription.pattern_day2_quantity}L`
    }
  }

  const getPatternPreview = (subscription: Subscription) => {
    if (subscription.subscription_type === "Pattern") {
      const startDate = subscription.pattern_start_date ? new Date(subscription.pattern_start_date) : new Date()
      return `Started: ${startDate.toLocaleDateString()}`
    }
    return null
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>
            Search by customer name or product name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(value: "all" | "Daily" | "Pattern") => setTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Pattern">Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''}
          {searchQuery && ` for "${searchQuery}"`}
        </p>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Searching...</p>
                </TableCell>
              </TableRow>
            ) : filteredSubscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? `No subscriptions found for "${searchQuery}"` : "No subscriptions found"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredSubscriptions.map((subscription) => (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.customer?.billing_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subscription.customer?.contact_person}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{subscription.product?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(subscription.product?.current_price || 0)}/L
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.subscription_type === "Daily" ? "default" : "secondary"}>
                      {subscription.subscription_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm">{getSubscriptionDetails(subscription)}</div>
                      {getPatternPreview(subscription) && (
                        <div className="text-xs text-muted-foreground">
                          {getPatternPreview(subscription)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subscription.is_active ? "default" : "secondary"}>
                      {subscription.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(subscription.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/subscriptions/${subscription.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/subscriptions/${subscription.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(subscription.id)}
                          className={subscription.is_active ? "text-orange-600" : "text-green-600"}
                        >
                          {subscription.is_active ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}