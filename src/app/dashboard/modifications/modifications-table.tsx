'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Search, MoreHorizontal, Eye, Edit, Trash2, ToggleLeft, ToggleRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { format } from 'date-fns'
import { formatDateToIST } from '@/lib/utils'
import { parseLocalDateIST } from '@/lib/date-utils'
import { useSorting } from '@/hooks/useSorting'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'

import { getModifications, deleteModification, toggleModificationStatus } from '@/lib/actions/modifications'
import type { Modification } from '@/lib/types'

export function ModificationsTable() {
  const router = useRouter()
  const [modifications, setModifications] = useState<Modification[]>([])
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [resultCount, setResultCount] = useState(0)

  const loadModifications = useCallback(async () => {
    setLoading(true)
    const result = await getModifications({
      search,
      status: statusFilter,
      type: typeFilter
    })
    
    if (result.success) {
      setModifications(result.data)
      setResultCount(result.data.length)
    } else {
      toast.error(result.error)
      setModifications([])
      setResultCount(0)
    }
    setLoading(false)
  }, [search, statusFilter, typeFilter])

  // Apply sorting to modifications with default sort by start date descending
  const { sortedData: sortedModifications, sortConfig, handleSort } = useSorting(
    modifications,
    'start_date',
    'desc'
  )

  useEffect(() => {
    const timeoutId = setTimeout(loadModifications, 300)
    return () => clearTimeout(timeoutId)
  }, [loadModifications])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modification?')) {
      return
    }

    const result = await deleteModification(id)
    if (result.success) {
      toast.success('Modification deleted successfully')
      loadModifications()
    } else {
      toast.error(result.error)
    }
  }

  const handleToggleStatus = async (id: string) => {
    const result = await toggleModificationStatus(id)
    if (result.success) {
      toast.success('Modification status updated')
      loadModifications()
    } else {
      toast.error(result.error)
    }
  }

  const getModificationTypeColor = (type: string) => {
    switch (type) {
      case 'Skip':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Increase':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Decrease':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (loading) {
    return <div className="text-center py-8">Loading modifications...</div>
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer or product..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Skip">Skip</SelectItem>
                <SelectItem value="Increase">Increase</SelectItem>
                <SelectItem value="Decrease">Decrease</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {resultCount} modification{resultCount !== 1 ? 's' : ''}
        </div>
        
        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <Button
            variant={sortConfig?.key === 'customer.billing_name' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('customer.billing_name')}
            className="text-xs h-7"
          >
            Customer
            {sortConfig?.key === 'customer.billing_name' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'start_date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('start_date')}
            className="text-xs h-7"
          >
            Start Date
            {sortConfig?.key === 'start_date' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'end_date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('end_date')}
            className="text-xs h-7"
          >
            End Date
            {sortConfig?.key === 'end_date' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant={sortConfig?.key === 'modification_type' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSort('modification_type')}
            className="text-xs h-7"
          >
            Type
            {sortConfig?.key === 'modification_type' && (
              sortConfig.direction === 'asc' ? 
                <ArrowUp className="ml-1 h-3 w-3" /> : 
                <ArrowDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {sortedModifications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No modifications found</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/modifications/new">
                Create your first modification
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sortedModifications.map((modification) => (
            <Card key={modification.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getModificationTypeColor(modification.modification_type)}>
                        {modification.modification_type}
                      </Badge>
                      <Badge className={getStatusColor(modification.is_active)}>
                        {modification.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">Customer</p>
                        <p className="text-gray-600">{modification.customer?.billing_name}</p>
                        <p className="text-gray-500 text-xs">{modification.customer?.contact_person}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">Product</p>
                        <p className="text-gray-600">{modification.product?.name}</p>
                        <p className="text-gray-500 text-xs">{modification.product?.code}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">Date Range</p>
                        <p className="text-gray-600">
                          {formatDateToIST(parseLocalDateIST(modification.start_date))}
                        </p>
                        <p className="text-gray-500 text-xs">
                          to {formatDateToIST(parseLocalDateIST(modification.end_date))}
                        </p>
                      </div>
                      
                      <div>
                        {modification.quantity_change && (
                          <>
                            <p className="font-medium text-gray-900">Quantity Change</p>
                            <p className="text-gray-600">
                              {modification.modification_type === 'Increase' ? '+' : '-'}
                              {modification.quantity_change} L
                            </p>
                          </>
                        )}
                        {modification.reason && (
                          <p className="text-gray-500 text-xs mt-1">{modification.reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/modifications/${modification.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/modifications/${modification.id}/edit`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(modification.id)}>
                        {modification.is_active ? (
                          <>
                            <ToggleLeft className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(modification.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}