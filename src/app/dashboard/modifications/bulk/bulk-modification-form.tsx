"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus, Save, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

import { ModificationRow } from "@/components/bulk-modifications/modification-row"
import { ModificationSummary } from "@/components/bulk-modifications/modification-summary"

import { bulkModificationSchema, type BulkModificationFormData, type BulkModificationRow } from "@/lib/validations"
import { createBulkModifications, type BulkModificationsResult } from "@/lib/actions/bulk-modifications"
import { getProducts } from "@/lib/actions/products"
import { getCustomers } from "@/lib/actions/customers"
import { getCurrentISTDate } from "@/lib/date-utils"

import type { Product, Customer } from "@/lib/types"

interface BulkModificationFormProps {
  onSuccess?: () => void
}

export function BulkModificationForm({ onSuccess }: BulkModificationFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<BulkModificationsResult | null>(null)

  const form = useForm<BulkModificationFormData>({
    resolver: zodResolver(bulkModificationSchema),
    defaultValues: {
      modifications: [
        {
          customer_id: '',
          product_id: '',
          modification_type: 'Skip',
          start_date: getCurrentISTDate(),
          end_date: getCurrentISTDate(),
          quantity_change: undefined,
          reason: ''
        }
      ]
    }
  })

  const modifications = form.watch("modifications")

  const addModificationRow = () => {
    const newModification: BulkModificationRow = {
      customer_id: '',
      product_id: '',
      modification_type: 'Skip',
      start_date: getCurrentISTDate(),
      end_date: getCurrentISTDate(),
      quantity_change: undefined,
      reason: ''
    }

    const currentModifications = form.getValues("modifications")
    form.setValue("modifications", [...currentModifications, newModification])
  }

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
      } catch {
        toast.error("Failed to load form data")
      }
    }
    loadData()
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        addModificationRow()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeModificationRow = (index: number) => {
    const currentModifications = form.getValues("modifications")
    if (currentModifications.length > 1) {
      const newModifications = currentModifications.filter((_, i) => i !== index)
      form.setValue("modifications", newModifications)
    }
  }

  const clearAllRows = () => {
    form.setValue("modifications", [{
      customer_id: '',
      product_id: '',
      modification_type: 'Skip',
      start_date: getCurrentISTDate(),
      end_date: getCurrentISTDate(),
      quantity_change: undefined,
      reason: ''
    }])
    setSubmissionResult(null)
  }

  const onSubmit = async (data: BulkModificationFormData) => {
    setIsSubmitting(true)
    setSubmissionResult(null)

    try {
      const result = await createBulkModifications(data)
      setSubmissionResult(result)

      if (result.success) {
        toast.success(`All ${result.processed} modifications created successfully!`)
        // Clear form after successful submission
        setTimeout(() => {
          clearAllRows()
          onSuccess?.()
        }, 2000)
      } else {
        toast.error(`${result.errors.length} modification(s) failed to process. Check details below.`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to process bulk modifications")
      setSubmissionResult({
        success: false,
        processed: 0,
        total: data.modifications.length,
        errors: [{ index: 0, error: "Bulk processing failed" }],
        successfulModifications: []
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const validModifications = modifications.filter(mod =>
    mod.customer_id &&
    mod.product_id &&
    mod.modification_type &&
    mod.start_date &&
    mod.end_date
  )

  const canSubmit = validModifications.length > 0 && !isSubmitting

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <ModificationSummary form={form} />

      {/* Progress/Error Display */}
      {submissionResult && (
        <Card className={submissionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {submissionResult.success ? '✓ Success' : '⚠ Completed with errors'}
                </span>
                <span className="text-sm">
                  {submissionResult.processed} / {submissionResult.total} processed
                </span>
              </div>

              {submissionResult.errors.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  {submissionResult.errors.map((error) => (
                    <div key={error.index} className="text-sm text-red-700 bg-red-100 p-2 rounded">
                      Row {error.index + 1}: {error.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modification Entry Form */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Modification Entry</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addModificationRow}
                disabled={isSubmitting}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Row (Alt+A)
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
            {/* Modifications Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Remove</TableHead>
                    <TableHead className="min-w-[200px]">Customer</TableHead>
                    <TableHead className="min-w-[200px]">Product</TableHead>
                    <TableHead className="min-w-[150px]">Type</TableHead>
                    <TableHead className="min-w-[140px]">Start Date</TableHead>
                    <TableHead className="min-w-[140px]">End Date</TableHead>
                    <TableHead className="min-w-[120px]">Quantity</TableHead>
                    <TableHead className="min-w-[200px]">Reason/Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modifications.map((_, index) => (
                    <ModificationRow
                      key={index}
                      index={index}
                      form={form}
                      products={products}
                      customers={customers}
                      onRemove={removeModificationRow}
                      canRemove={modifications.length > 1}
                      onAddRow={addModificationRow}
                      isLastRow={index === modifications.length - 1}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Form Errors */}
            {form.formState.errors.modifications && (
              <div className="text-sm text-red-600">
                {form.formState.errors.modifications.message}
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
                    Save All ({validModifications.length})
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
