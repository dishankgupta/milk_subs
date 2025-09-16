"use client"

import { UseFormReturn } from "react-hook-form"
import { TrendingUp, DollarSign, Hash, Receipt } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, calculateGSTFromInclusive } from "@/lib/utils"

import type { Product, SaleFormData } from "@/lib/types"

interface SalesSummaryProps {
  form: UseFormReturn<{ sales: SaleFormData[] }>
  products: Product[]
}

export function SalesSummary({ form, products }: SalesSummaryProps) {
  const sales = form.watch("sales")

  // Calculate summary in real-time without memoization for immediate updates
  const validSales = sales.filter(sale =>
    sale.product_id &&
    sale.quantity > 0 &&
    sale.unit_price > 0
  )

  let totalAmount = 0
  let totalGST = 0
  const saleTypes = { Cash: 0, Credit: 0, QR: 0 }

  validSales.forEach(sale => {
    const product = products.find(p => p.id === sale.product_id)
    const amount = sale.quantity * sale.unit_price

    totalAmount += amount

    if (product && product.gst_rate > 0) {
      const gstBreakdown = calculateGSTFromInclusive(amount, product.gst_rate)
      totalGST += gstBreakdown.gstAmount
    }

    if (sale.sale_type) {
      saleTypes[sale.sale_type]++
    }
  })

  const summary = {
    totalEntries: validSales.length,
    totalSales: sales.length,
    totalAmount,
    totalGST,
    baseAmount: totalAmount - totalGST,
    saleTypes
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.totalEntries}
            <span className="text-sm text-muted-foreground ml-1">
              / {summary.totalSales}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Valid entries ready to save
          </p>
        </CardContent>
      </Card>

      {/* Total Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalAmount)}
          </div>
          <p className="text-xs text-muted-foreground">
            Including all taxes
          </p>
        </CardContent>
      </Card>

      {/* GST Breakdown */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">GST Breakdown</CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="text-sm">
              <span className="text-muted-foreground">Base: </span>
              {formatCurrency(summary.baseAmount)}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">GST: </span>
              {formatCurrency(summary.totalGST)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sale Types */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sale Types</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {summary.saleTypes.Cash > 0 && (
              <Badge variant="default" className="text-xs">
                Cash: {summary.saleTypes.Cash}
              </Badge>
            )}
            {summary.saleTypes.QR > 0 && (
              <Badge variant="secondary" className="text-xs">
                QR: {summary.saleTypes.QR}
              </Badge>
            )}
            {summary.saleTypes.Credit > 0 && (
              <Badge variant="outline" className="text-xs">
                Credit: {summary.saleTypes.Credit}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Payment methods used
          </p>
        </CardContent>
      </Card>
    </div>
  )
}