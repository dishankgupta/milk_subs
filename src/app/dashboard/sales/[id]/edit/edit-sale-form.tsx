'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

import { saleSchema, type SaleFormData } from '@/lib/validations'
import { updateSale } from '@/lib/actions/sales'
import { formatCurrency } from '@/lib/utils'
import { calculateGSTFromInclusive } from '@/lib/gst-utils'
import type { Sale, Product, Customer } from '@/lib/types'
import { UnifiedDatePicker } from '@/components/ui/unified-date-picker'

interface EditSaleFormProps {
  sale: Sale
  products: Product[]
  customers: Customer[]
}

export function EditSaleForm({ sale, products, customers }: EditSaleFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customer_id: sale.customer_id || null,
      product_id: sale.product_id,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      sale_type: sale.sale_type as 'Cash' | 'Credit' | 'QR',
      sale_date: new Date(sale.sale_date),
      notes: sale.notes || '',
    },
  })

  const watchedFields = form.watch(['product_id', 'quantity', 'unit_price'])

  // Calculate totals when relevant fields change
  useEffect(() => {
    const productId = form.getValues('product_id')
    const quantity = form.getValues('quantity')
    const unitPrice = form.getValues('unit_price')

    if (productId && quantity && unitPrice) {
      const selectedProduct = products.find(p => p.id === productId)
      if (selectedProduct) {
        const subtotal = quantity * unitPrice
        calculateGSTFromInclusive(subtotal, selectedProduct.gst_rate || 0)
      }
    }
  }, [form.watch('product_id'), form.watch('quantity'), form.watch('unit_price')])

  // Update unit price when product changes
  useEffect(() => {
    const productId = form.getValues('product_id')
    if (productId) {
      const selectedProduct = products.find(p => p.id === productId)
      if (selectedProduct) {
        form.setValue('unit_price', selectedProduct.current_price)
      }
    }
  }, [form.watch('product_id')])

  const onSubmit = async (data: SaleFormData) => {
    setIsSubmitting(true)
    try {
      const selectedProduct = products.find(p => p.id === data.product_id)
      if (!selectedProduct) {
        throw new Error('Selected product not found')
      }

      const totalAmount = data.quantity * data.unit_price
      const { baseAmount, gstAmount } = calculateGSTFromInclusive(totalAmount, selectedProduct.gst_rate || 0)

      await updateSale(sale.id, {
        ...data,
        total_amount: totalAmount,
        gst_amount: gstAmount
      })

      toast.success('Sale updated successfully')
      router.push('/dashboard/sales/history')
    } catch (error) {
      console.error('Error updating sale:', error)
      toast.error('Failed to update sale. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedProduct = products.find(p => p.id === form.watch('product_id'))
  const totalAmount = (form.watch('quantity') || 0) * (form.watch('unit_price') || 0)
  const gstCalculation = selectedProduct ? calculateGSTFromInclusive(totalAmount, selectedProduct.gst_rate || 0) : { baseAmount: totalAmount, gstAmount: 0 }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Sale Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Sale Type */}
            <FormField
              control={form.control}
              name="sale_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Cash" id="cash" />
                        <Label htmlFor="cash">Cash Sale</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="QR" id="qr" />
                        <Label htmlFor="qr">QR Sale</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Credit" id="credit" />
                        <Label htmlFor="credit">Credit Sale</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Customer Selection (only for Credit sales) */}
            {form.watch('sale_type') === 'Credit' && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.billing_name} - {customer.contact_person}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Required for credit sales to track outstanding amounts
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Product Selection */}
              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{product.name}</span>
                              <div className="flex gap-2 ml-2">
                                <Badge variant="outline" className="text-xs">
                                  {formatCurrency(product.current_price)}/{product.unit_of_measure}
                                </Badge>
                                {product.gst_rate && product.gst_rate > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {product.gst_rate}% GST
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sale Date */}
              <FormField
                control={form.control}
                name="sale_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Date *</FormLabel>
                    <FormControl>
                      <UnifiedDatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="DD-MM-YYYY"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Quantity */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantity * 
                      {selectedProduct && (
                        <span className="text-sm text-muted-foreground ml-1">
                          ({selectedProduct.unit_of_measure})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Price */}
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Unit Price * 
                      {selectedProduct && (
                        <span className="text-sm text-muted-foreground ml-1">
                          (per {selectedProduct.unit_of_measure})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Default: {selectedProduct ? formatCurrency(selectedProduct.current_price) : 'Select a product'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing Preview */}
            {selectedProduct && totalAmount > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Base Amount ({form.watch('quantity')} × {formatCurrency(form.watch('unit_price'))})</span>
                  <span>{formatCurrency(gstCalculation.baseAmount)}</span>
                </div>
                {selectedProduct.gst_rate && selectedProduct.gst_rate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>GST ({selectedProduct.gst_rate}%)</span>
                    <span>{formatCurrency(gstCalculation.gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Amount</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this sale..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Updating Sale...' : 'Update Sale'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}