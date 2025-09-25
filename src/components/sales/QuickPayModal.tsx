'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, CreditCard } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateIST, getCurrentISTDate } from '@/lib/date-utils'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const quickPaySchema = z.object({
  payment_date: z.date({ message: "Payment date is required" }),
  payment_method: z.string().min(1, "Payment method is required")
})

type QuickPayFormData = z.infer<typeof quickPaySchema>

interface Sale {
  id: string
  customer_id: string
  customer_name: string
  total_amount: number
  sale_date: string
  sale_type: string
  payment_status: string
}

interface QuickPayModalProps {
  sale: Sale
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const paymentMethods = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
  'Cheque'
]

export function QuickPayModal({ sale, isOpen, onClose, onSuccess }: QuickPayModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<QuickPayFormData>({
    resolver: zodResolver(quickPaySchema),
    defaultValues: {
      payment_date: getCurrentISTDate(),
      payment_method: ''
    }
  })

  const handleSubmit = async (data: QuickPayFormData) => {
    try {
      setIsSubmitting(true)

      // Call the server action via a form action approach
      const formData = new FormData()
      formData.set('saleId', sale.id)
      formData.set('paymentDate', data.payment_date.toISOString())
      formData.set('paymentMethod', data.payment_method)

      const response = await fetch('/api/sales/quick-pay', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        toast.error(result.error || 'Failed to process payment')
        return
      }

      toast.success('Payment processed successfully!')
      form.reset()
      onClose()
      onSuccess()
    } catch (error) {
      console.error('Quick pay error:', error)
      toast.error('Failed to process payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Quick Pay</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-lg">{sale.customer_name}</h4>
                <p className="text-sm text-gray-600">
                  Sale Date: {formatDateIST(new Date(sale.sale_date))}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(sale.total_amount)}
                </div>
                <div className="text-sm text-gray-600">Amount Due</div>
              </div>
            </div>
          </div>

          {/* Quick Pay Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Payment Date */}
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              formatDateIST(field.value)
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-24"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}