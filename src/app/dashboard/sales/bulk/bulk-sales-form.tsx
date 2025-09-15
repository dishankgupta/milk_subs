"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Save, RotateCcw, Download } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

import { SalesRow } from "@/components/bulk-sales/sales-row"
import { SalesSummary } from "@/components/bulk-sales/sales-summary"
import { BulkProgress } from "@/components/bulk-sales/bulk-progress"

import { saleSchema, type SaleFormData } from "@/lib/validations"
import { createBulkSales, type BulkSalesResult } from "@/lib/actions/bulk-sales"
import { getProducts } from "@/lib/actions/products"
import { getCustomers } from "@/lib/actions/customers"
import { getCurrentISTDate } from "@/lib/date-utils"

import type { Product, Customer } from "@/lib/types"

const bulkSalesSchema = z.object({
  sales: z.array(saleSchema).min(1, "At least one sale is required")
})

type BulkSalesFormData = z.infer<typeof bulkSalesSchema>

interface BulkSalesFormProps {
  onSuccess?: () => void
}

export function BulkSalesForm({ onSuccess }: BulkSalesFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<BulkSalesResult | null>(null)

  const form = useForm<BulkSalesFormData>({
    resolver: zodResolver(bulkSalesSchema),
    defaultValues: {
      sales: [
        {
          customer_id: null,
          product_id: "",
          quantity: 1,
          unit_price: 0,
          sale_type: "Cash",
          sale_date: getCurrentISTDate(),
          notes: ""
        }
      ]
    }
  })

  const sales = form.watch("sales")

  // Load products and customers
  useEffect(() => {
    async function loadData() {
      try {
        const [productsData, customersData] = await Promise.all([
          getProducts(),
          getCustomers()
        ])
        setProducts(productsData)
        setCustomers(customersData.customers)
      } catch (error) {
        toast.error("Failed to load form data")
      }
    }
    loadData()
  }, [])

  const addSaleRow = () => {
    const newSale: SaleFormData = {
      customer_id: null,
      product_id: "",
      quantity: 1,
      unit_price: 0,
      sale_type: "Cash",
      sale_date: getCurrentISTDate(),
      notes: ""
    }

    const currentSales = form.getValues("sales")
    form.setValue("sales", [...currentSales, newSale])
  }

  const removeSaleRow = (index: number) => {
    const currentSales = form.getValues("sales")
    if (currentSales.length > 1) {
      const newSales = currentSales.filter((_, i) => i !== index)
      form.setValue("sales", newSales)
    }
  }

  const clearAllRows = () => {
    form.setValue("sales", [{
      customer_id: null,
      product_id: "",
      quantity: 1,
      unit_price: 0,
      sale_type: "Cash",
      sale_date: getCurrentISTDate(),
      notes: ""
    }])
    setSubmissionResult(null)
  }

  const onSubmit = async (data: BulkSalesFormData) => {
    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const result = await createBulkSales(data)
      setSubmissionResult(result)

      if (result.success) {
        toast.success(`All ${result.processed} sales recorded successfully!`)
        // Clear form after successful submission
        setTimeout(() => {
          clearAllRows()
          onSuccess?.()
        }, 2000)
      } else {
        toast.error(`${result.errors.length} sales failed to process. Check details below.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process bulk sales")
      setSubmissionResult({
        success: false,
        processed: 0,
        total: data.sales.length,
        errors: [{ index: 0, error: "Bulk processing failed" }],
        successfulSales: []
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validSales = sales.filter(sale =>
    sale.product_id &&
    sale.quantity > 0 &&
    sale.unit_price > 0
  )

  const canSubmit = validSales.length > 0 && !isSubmitting

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <SalesSummary form={form} products={products} />

      {/* Progress Indicator */}
      {(isSubmitting || submissionResult) && (
        <BulkProgress
          isSubmitting={isSubmitting}
          processed={submissionResult?.processed || 0}
          total={submissionResult?.total || sales.length}
          errors={submissionResult?.errors || []}
          isComplete={!!submissionResult && !isSubmitting}
        />
      )}

      {/* Sales Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Sales Entry</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSaleRow}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllRows}
                disabled={isSubmitting}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Sales Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Remove</TableHead>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    <TableHead className="min-w-[200px]">Customer</TableHead>
                    <TableHead className="min-w-[250px]">Product</TableHead>
                    <TableHead className="min-w-[100px]">Quantity</TableHead>
                    <TableHead className="min-w-[100px]">Unit Price</TableHead>
                    <TableHead className="min-w-[120px]">Total</TableHead>
                    <TableHead className="min-w-[140px]">Date</TableHead>
                    <TableHead className="min-w-[150px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((_, index) => (
                    <SalesRow
                      key={index}
                      index={index}
                      form={form}
                      products={products}
                      customers={customers}
                      onRemove={removeSaleRow}
                      canRemove={sales.length > 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Form Errors */}
            {form.formState.errors.sales && (
              <div className="text-sm text-red-600">
                {form.formState.errors.sales.message}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSuccess?.()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!canSubmit}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  "Processing..."
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save All ({validSales.length})
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}