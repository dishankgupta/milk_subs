"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { paymentSchema, type PaymentFormData } from "@/lib/validations"
import { createPayment, updatePayment } from "@/lib/actions/payments"
import { toast } from "sonner"
import type { Payment, Customer } from "@/lib/types"
import { InvoiceAllocationSection } from "@/components/payments/InvoiceAllocationSection"

interface PaymentFormProps {
  payment?: Payment
  customers: Customer[]
  preSelectedCustomerId?: string
}

export default function PaymentForm({ payment, customers, preSelectedCustomerId }: PaymentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentAllocations, setPaymentAllocations] = useState<{
    id: string; 
    type: 'invoice' | 'opening_balance'; 
    amount: number 
  }[]>([])

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_id: payment?.customer_id || preSelectedCustomerId || "",
      amount: payment?.amount || 0,
      payment_date: payment?.payment_date ? new Date(payment.payment_date) : new Date(),
      payment_method: payment?.payment_method || "",
      period_start: payment?.period_start ? new Date(payment.period_start) : undefined,
      period_end: payment?.period_end ? new Date(payment.period_end) : undefined,
      notes: payment?.notes || "",
    },
  })

  const selectedCustomerId = form.watch("customer_id")
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
  const paymentAmount = form.watch("amount") || 0

  async function onSubmit(data: PaymentFormData) {
    setIsSubmitting(true)
    
    try {
      if (payment) {
        // For payment updates, we'll need to handle reallocation separately
        await updatePayment(payment.id, data)
        toast.success("Payment updated successfully!")
        router.push(`/dashboard/payments/${payment.id}`)
      } else {
        // For new payments, pass the allocations
        const newPayment = await createPayment(data, paymentAllocations)
        toast.success("Payment created successfully!")
        router.push(`/dashboard/payments/${newPayment.id}`)
      }
    } catch (error) {
      toast.error(`Failed to ${payment ? "update" : "create"} payment: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{payment ? "Edit Payment" : "Add New Payment"}</CardTitle>
          <CardDescription>
            {payment ? "Update payment information" : "Record a new payment from a customer"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Selection */}
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            <div>
                              <div className="font-medium">{customer.billing_name}</div>
                              {customer.contact_person && (
                                <div className="text-sm text-muted-foreground">
                                  {customer.contact_person}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Info Display */}
              {selectedCustomer && (
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Outstanding:</span>
                      <span className="font-bold text-blue-600">
                        View in Outstanding Section
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Payment Method:</span>
                      <span>{selectedCustomer.payment_method}</span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Payment Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the payment amount received from the customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Date */}
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                    <FormDescription>
                      Date when the payment was received
                    </FormDescription>
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
                    <FormLabel>Payment Method (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Cash, UPI, Bank Transfer"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      How the payment was received
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Period Start Date */}
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Period Start Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                    <FormDescription>
                      Start of the billing period this payment covers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Period End Date */}
              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Period End Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
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
                    <FormDescription>
                      End of the billing period this payment covers
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes about this payment..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Additional information about the payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Allocation - Only show for new payments with selected customer and amount */}
              {!payment && selectedCustomerId && paymentAmount > 0 && (
                <InvoiceAllocationSection
                  customerId={selectedCustomerId}
                  paymentAmount={paymentAmount}
                  onAllocationChange={setPaymentAllocations}
                />
              )}

              {/* Submit Button */}
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {payment ? "Update Payment" : "Add Payment"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}