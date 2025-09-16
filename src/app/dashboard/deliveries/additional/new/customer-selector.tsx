"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, Search, MapPin, Phone } from "lucide-react"
import type { Customer } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CustomerSelectorProps {
  customers: Customer[]
  selectedCustomer: Customer | null
  onCustomerSelect: (customer: Customer | null) => void
}

export function CustomerSelector({ customers, selectedCustomer, onCustomerSelect }: CustomerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    customer.billing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone_primary.includes(searchQuery)
  ).slice(0, 10) // Limit to 10 results for performance

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Customer Selection
        </CardTitle>
        <CardDescription>
          Search and select the customer for this additional delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <Label htmlFor="customer-search">Search Customer</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="customer-search"
              placeholder="Search by name, contact person, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Selected Customer Display */}
        {selectedCustomer && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-green-800">{selectedCustomer.billing_name}</h3>
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Selected
                    </Badge>
                  </div>
                  <div className="text-sm text-green-700">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {selectedCustomer.contact_person}
                    </div>
                  </div>
                  <div className="text-sm text-green-700">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedCustomer.phone_primary}
                    </div>
                  </div>
                  <div className="text-sm text-green-700">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Route • {selectedCustomer.delivery_time}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCustomerSelect(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Search Results */}
        {!selectedCustomer && searchQuery && (
          <div className="space-y-2">
            <Label>Search Results ({filteredCustomers.length})</Label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No customers found matching &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <Button
                    key={customer.id}
                    variant="outline"
                    className={cn(
                      "w-full p-4 h-auto text-left justify-start",
                      "hover:bg-blue-50 hover:border-blue-300"
                    )}
                    onClick={() => {
                      onCustomerSelect(customer)
                      setSearchQuery("")
                    }}
                  >
                    <div className="w-full space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{customer.billing_name}</h3>
                        <Badge variant={customer.status === "Active" ? "default" : "secondary"}>
                          {customer.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {customer.contact_person}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone_primary}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Route • {customer.delivery_time} • {customer.address.substring(0, 50)}...
                        </div>
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!selectedCustomer && !searchQuery && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Start typing to search for customers</p>
            <p className="text-sm">Search by customer name, contact person, or phone number</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}