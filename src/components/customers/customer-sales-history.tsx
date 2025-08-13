"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Eye, Receipt, CreditCard } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { getCustomerSales } from "@/lib/actions/sales"

import type { Sale } from "@/lib/types"

interface CustomerSalesHistoryProps {
  customerId: string
  onGenerateInvoice?: () => void
}

export function CustomerSalesHistory({ customerId, onGenerateInvoice }: CustomerSalesHistoryProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSales() {
      try {
        const salesData = await getCustomerSales(customerId)
        setSales(salesData)
      } catch (error) {
        console.error("Failed to load customer sales:", error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSales()
  }, [customerId])

  if (isLoading) {
    return <div>Loading sales history...</div>
  }

  const cashSales = sales.filter(sale => sale.sale_type === 'Cash')
  const creditSales = sales.filter(sale => sale.sale_type === 'Credit')
  const unbilledCreditSales = creditSales.filter(sale => sale.payment_status === 'Pending')

  const totalCashSales = cashSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
  const totalCreditSales = creditSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)
  const unbilledAmount = unbilledCreditSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Sales History
          </CardTitle>
          {unbilledCreditSales.length > 0 && (
            <Button onClick={onGenerateInvoice} size="sm">
              <Eye className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sales Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-green-800">Cash Sales</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCashSales)}</div>
            <div className="text-sm text-green-600">{cashSales.length} transactions</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-blue-800">Total Credit Sales</div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalCreditSales)}</div>
            <div className="text-sm text-blue-600">{creditSales.length} transactions</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm font-medium text-orange-800">Unbilled Credit</div>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(unbilledAmount)}</div>
            <div className="text-sm text-orange-600">{unbilledCreditSales.length} pending</div>
          </div>
        </div>

        {/* Recent Sales Table */}
        {sales.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium">Recent Sales</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.slice(0, 10).map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{format(new Date(sale.sale_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.product?.name}</div>
                          <div className="text-sm text-gray-500">{sale.product?.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sale.quantity} {sale.product?.unit_of_measure}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(sale.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.sale_type === 'Cash' ? 'secondary' : 'outline'}>
                          {sale.sale_type === 'Cash' && <CreditCard className="h-3 w-3 mr-1" />}
                          {sale.sale_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.payment_status === 'Completed' 
                              ? 'default' 
                              : sale.payment_status === 'Pending' 
                              ? 'destructive' 
                              : 'secondary'
                          }
                        >
                          {sale.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {sales.length > 10 && (
              <div className="text-center text-sm text-gray-500">
                Showing 10 most recent sales ({sales.length} total)
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sales recorded for this customer yet.
          </div>
        )}

        {/* Important Note */}
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
          <strong>Note:</strong> Cash sales are shown here for reporting purposes only. 
          They will not appear in customer invoices. Only credit sales are included in billing.
        </div>
      </CardContent>
    </Card>
  )
}