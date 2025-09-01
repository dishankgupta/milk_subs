'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getOutstandingDashboard, type OutstandingDashboard as OutstandingDashboardType } from '@/lib/actions/outstanding'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DollarSign, Users, Clock, TrendingUp, Search, Eye, CreditCard } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { formatDateIST } from '@/lib/date-utils'
import { useSorting } from '@/hooks/useSorting'

export function OutstandingDashboard() {
  const [data, setData] = useState<OutstandingDashboardType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [routeFilter, setRouteFilter] = useState<string>('all')
  const [amountFilter, setAmountFilter] = useState<string>('all')

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const result = await getOutstandingDashboard()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load outstanding data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Sorting functionality
  const { sortConfig, handleSort, sortedData } = useSorting(
    data?.customers || [],
    'total_outstanding',
    'desc'
  )

  // Filter data
  const filteredData = useMemo(() => {
    if (!data?.customers) return []

    return sortedData.filter(customer => {
      // Search filter
      const matchesSearch = 
        customer.billing_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.route_name.toLowerCase().includes(searchTerm.toLowerCase())

      // Route filter
      const matchesRoute = routeFilter === 'all' || customer.route_name === routeFilter

      // Amount filter
      let matchesAmount = true
      if (amountFilter === 'high') {
        matchesAmount = customer.total_outstanding >= 5000
      } else if (amountFilter === 'medium') {
        matchesAmount = customer.total_outstanding >= 1000 && customer.total_outstanding < 5000
      } else if (amountFilter === 'low') {
        matchesAmount = customer.total_outstanding < 1000
      }

      return matchesSearch && matchesRoute && matchesAmount
    })
  }, [sortedData, searchTerm, routeFilter, amountFilter, data?.customers])

  // Get unique routes for filter
  const routes = useMemo(() => {
    if (!data?.customers) return []
    const routeSet = new Set(data.customers.map(c => c.route_name))
    return Array.from(routeSet).sort()
  }, [data?.customers])

  if (loading) {
    return <div className="text-center py-8">Loading outstanding data...</div>
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: {error}</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-8">No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Across all customers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers with Outstanding</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.customersWithOutstanding}</div>
            <p className="text-xs text-muted-foreground">
              Active outstanding amounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.averageOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Per customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by route" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map(route => (
                  <SelectItem key={route} value={route}>{route}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={amountFilter} onValueChange={setAmountFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by amount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Amounts</SelectItem>
                <SelectItem value="high">High (&ge;₹5,000)</SelectItem>
                <SelectItem value="medium">Medium (₹1,000-₹4,999)</SelectItem>
                <SelectItem value="low">Low (&lt;₹1,000)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Outstanding Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('billing_name')}
                  >
                    Customer
                    {sortConfig?.key === 'billing_name' && (
                      <span className="ml-2">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('route_name')}
                  >
                    Route
                    {sortConfig?.key === 'route_name' && (
                      <span className="ml-2">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('total_outstanding')}
                  >
                    Outstanding Amount
                    {sortConfig?.key === 'total_outstanding' && (
                      <span className="ml-2">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('unpaid_invoice_count')}
                  >
                    Unpaid Invoices
                    {sortConfig?.key === 'unpaid_invoice_count' && (
                      <span className="ml-2">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('oldest_unpaid_date')}
                  >
                    Oldest Unpaid
                    {sortConfig?.key === 'oldest_unpaid_date' && (
                      <span className="ml-2">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No customers found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredData.map((customer) => (
                    <tr key={customer.customer_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.billing_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {customer.contact_person}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {customer.route_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.total_outstanding)}
                        </div>
                        {customer.opening_balance > 0 && (
                          <div className="text-xs text-gray-500">
                            Opening: {formatCurrency(customer.opening_balance)}
                          </div>
                        )}
                        {customer.hasCredit && (
                          <div className="text-xs text-green-600 font-medium">
                            + Credit Available: {formatCurrency(customer.credit_amount || 0)} ({customer.credit_count} payment{(customer.credit_count || 0) !== 1 ? 's' : ''})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={customer.unpaid_invoice_count > 0 ? "destructive" : "secondary"}>
                          {customer.unpaid_invoice_count} invoices
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.oldest_unpaid_date 
                          ? formatDateIST(new Date(customer.oldest_unpaid_date))
                          : 'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Link href={`/dashboard/outstanding/${customer.customer_id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </Link>
                        <Link href={`/dashboard/payments/new?customer=${customer.customer_id}`}>
                          <Button variant="outline" size="sm">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredData.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredData.length} of {data.customers.length} customers
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}