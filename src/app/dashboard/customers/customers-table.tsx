"use client"

import { useState, useEffect } from "react"
import { Customer } from "@/lib/types"
import { getCustomers, searchCustomers } from "@/lib/actions/customers"
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
import { formatCurrency } from "@/lib/utils"
import { Search, Edit, Eye } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [routeFilter, setRouteFilter] = useState<string>("all")
  const [timeFilter, setTimeFilter] = useState<string>("all")

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    filterCustomers()
  }, [customers, searchQuery, statusFilter, routeFilter, timeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCustomers = async () => {
    try {
      const data = await getCustomers()
      setCustomers(data)
      setFilteredCustomers(data)
    } catch (error) {
      console.error("Failed to load customers:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      try {
        const searchResults = await searchCustomers(query.trim())
        setCustomers(searchResults)
      } catch (error) {
        console.error("Search failed:", error)
      }
    } else {
      loadCustomers()
    }
  }

  const filterCustomers = () => {
    let filtered = customers

    if (statusFilter !== "all") {
      filtered = filtered.filter(customer => customer.status === statusFilter)
    }

    if (routeFilter !== "all") {
      filtered = filtered.filter(customer => customer.route?.name === routeFilter)
    }

    if (timeFilter !== "all") {
      filtered = filtered.filter(customer => customer.delivery_time === timeFilter)
    }

    setFilteredCustomers(filtered)
  }

  const uniqueRoutes = Array.from(new Set(customers.map(c => c.route?.name).filter(Boolean)))

  if (loading) {
    return <div className="text-center py-8">Loading customers...</div>
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers by name or phone..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={routeFilter} onValueChange={setRouteFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Route" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              {uniqueRoutes.map(route => (
                <SelectItem key={route} value={route!}>{route}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Delivery" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Times</SelectItem>
              <SelectItem value="Morning">Morning</SelectItem>
              <SelectItem value="Evening">Evening</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCustomers.length} of {customers.length} customers
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Billing Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No customers found matching your search." : "No customers found."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.billing_name}
                  </TableCell>
                  <TableCell>{customer.contact_person}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {customer.phone_primary}
                      {customer.phone_secondary && (
                        <div className="text-xs text-muted-foreground">
                          {customer.phone_secondary}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.route?.name || "No Route"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.delivery_time === "Morning" ? "default" : "secondary"}>
                      {customer.delivery_time}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={customer.outstanding_amount > 0 ? "text-red-600 font-medium" : ""}>
                      {formatCurrency(customer.outstanding_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/customers/${customer.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/customers/${customer.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
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