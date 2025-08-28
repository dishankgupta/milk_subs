'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Users, ArrowRight, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { UnappliedPaymentsSection } from './UnappliedPaymentsSection'

interface CustomerWithUnappliedPayments {
  customer_id: string
  billing_name: string
  contact_person: string
  route_name?: string
  total_unapplied: number
  payment_count: number
}

interface CustomerSelectionForAllocationProps {
  onAllocationComplete?: () => void
}

export function CustomerSelectionForAllocation({ onAllocationComplete }: CustomerSelectionForAllocationProps) {
  const [customers, setCustomers] = useState<CustomerWithUnappliedPayments[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    loadCustomersWithUnappliedPayments()
  }, [])

  const loadCustomersWithUnappliedPayments = async () => {
    try {
      setLoading(true)
      
      // Get customers with unapplied payments using optimized query
      const response = await fetch('/api/customers/with-unapplied-payments')
      if (!response.ok) {
        throw new Error('Failed to fetch customers with unapplied payments')
      }
      
      const data = await response.json()
      setCustomers(data.customers || [])
    } catch (error) {
      console.error('Failed to load customers with unapplied payments:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.billing_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.route_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAllocationComplete = () => {
    setSelectedCustomerId(null)
    loadCustomersWithUnappliedPayments() // Refresh customer list
    onAllocationComplete?.()
  }

  if (selectedCustomerId) {
    return (
      <div className="space-y-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Allocating payments for:</h3>
                <p className="text-sm text-gray-600">
                  {customers.find(c => c.customer_id === selectedCustomerId)?.billing_name}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedCustomerId(null)}
              >
                ← Back to Customer List
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <UnappliedPaymentsSection 
          customerId={selectedCustomerId}
          onAllocationComplete={handleAllocationComplete}
        />
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Customers with Unapplied Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading customers...</div>
        </CardContent>
      </Card>
    )
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Customers with Unapplied Payments</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No customers have unapplied payments</p>
            <p className="text-sm">All payments have been allocated to invoices</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Select Customer ({customers.length})</span>
          </div>
          <div className="text-sm font-normal">
            Total Unapplied: {formatCurrency(customers.reduce((sum, customer) => sum + customer.total_unapplied, 0))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search customers by name, contact, or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customer List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <div key={customer.customer_id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-lg">{customer.billing_name}</span>
                    {customer.route_name && (
                      <Badge variant="outline">{customer.route_name}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Contact:</span> {customer.contact_person}
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-green-700">
                        Credit Available: {formatCurrency(customer.total_unapplied)}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Payments:</span> {customer.payment_count} unapplied payment{customer.payment_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomerId(customer.customer_id)}
                  className="flex items-center space-x-1"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>Allocate</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {filteredCustomers.length === 0 && searchTerm && (
          <div className="text-center py-8 text-gray-500">
            <p>No customers match your search</p>
            <Button variant="ghost" onClick={() => setSearchTerm('')} className="mt-2">
              Clear search
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}