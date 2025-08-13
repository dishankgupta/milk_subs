"use client"

import { useState, useEffect } from "react"
import { Calculator, Plus, Receipt } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { calculateTotalOutstanding } from "@/lib/actions/customers"

import type { Customer } from "@/lib/types"

interface CustomerOutstandingProps {
  customer: Customer
  onAdjustBalance?: () => void
  onGenerateInvoice?: () => void
}

export function CustomerOutstanding({ 
  customer, 
  onAdjustBalance, 
  onGenerateInvoice 
}: CustomerOutstandingProps) {
  const [totalOutstanding, setTotalOutstanding] = useState(0)
  const [breakdown, setBreakdown] = useState({
    opening_balance: 0,
    current_outstanding: 0,
    total: 0
  })

  useEffect(() => {
    async function loadOutstanding() {
      try {
        const result = await calculateTotalOutstanding(customer.id)
        setTotalOutstanding(result.total)
        setBreakdown(result)
      } catch (error) {
        console.error("Failed to calculate total outstanding:", error)
        setTotalOutstanding((customer.outstanding_amount || 0) + (customer.opening_balance || 0))
      }
    }
    loadOutstanding()
  }, [customer.id, customer.outstanding_amount, customer.opening_balance])

  const hasOutstanding = totalOutstanding > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Outstanding Amount
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Outstanding Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium">Opening Balance:</span>
            <span className="font-semibold">{formatCurrency(customer.opening_balance || 0)}</span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">Current Outstanding:</span>
            <span className="font-semibold text-blue-600">
              {formatCurrency(customer.outstanding_amount || 0)}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-2 border-green-200">
            <span className="font-bold text-green-800">Total Outstanding:</span>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={hasOutstanding ? 'destructive' : 'default'}
            className="px-4 py-2"
          >
            {hasOutstanding ? 'Amount Due' : 'No Outstanding Amount'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {onAdjustBalance && (
            <Button
              variant="outline"
              onClick={onAdjustBalance}
              className="flex-1"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adjust Balance
            </Button>
          )}
          
          {hasOutstanding && onGenerateInvoice && (
            <Button
              onClick={onGenerateInvoice}
              className="flex-1"
              size="sm"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          )}
        </div>

        {/* Calculation Formula */}
        <div className="text-xs text-gray-500 border-t pt-3">
          <div className="font-medium mb-1">Calculation:</div>
          <div>Opening Balance + Current Outstanding = Total Due</div>
          <div className="font-mono">
            {formatCurrency(customer.opening_balance || 0)} + {formatCurrency(customer.outstanding_amount || 0)} = {formatCurrency(totalOutstanding)}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}