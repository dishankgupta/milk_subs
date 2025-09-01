"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerSchema, type CustomerFormData } from "@/lib/validations"
import { createCustomer, updateCustomer, getRoutes } from "@/lib/actions/customers"
import { Route, Customer } from "@/lib/types"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface CustomerFormProps {
  customer?: Customer
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const router = useRouter()
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billing_name: customer?.billing_name || "",
      contact_person: customer?.contact_person || "",
      address: customer?.address || "",
      phone_primary: customer?.phone_primary || "",
      phone_secondary: customer?.phone_secondary || undefined,
      phone_tertiary: customer?.phone_tertiary || undefined,
      route_id: customer?.route_id || "",
      delivery_time: customer?.delivery_time || "Morning",
      payment_method: customer?.payment_method || "Monthly",
      billing_cycle_day: customer?.billing_cycle_day || 1,
      opening_balance: customer?.opening_balance ?? 0,
      status: customer?.status || "Active",
    },
  })

  useEffect(() => {
    loadRoutes()
  }, [])

  const loadRoutes = async () => {
    try {
      const data = await getRoutes()
      setRoutes(data)
    } catch (error) {
      console.error("Failed to load routes:", error)
      toast.error("Failed to load routes")
    }
  }

  const onSubmit = async (data: CustomerFormData) => {
    setLoading(true)
    try {
      const result = customer
        ? await updateCustomer(customer.id, data)
        : await createCustomer(data)

      if (result.success) {
        toast.success(customer ? "Customer updated successfully" : "Customer created successfully")
        router.push("/dashboard/customers")
      } else {
        toast.error(result.error || "Operation failed")
      }
    } catch (error) {
      console.error("Form submission error:", error)
      toast.error("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const billingCycleDays = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="billing_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter billing name" {...field} />
                </FormControl>
                <FormDescription>
                  The name used for billing and invoicing
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter contact person name" {...field} />
                </FormControl>
                <FormDescription>
                  The person to contact for delivery
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter complete delivery address"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="phone_primary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Primary Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter primary phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_secondary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secondary Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter secondary phone (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_tertiary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tertiary Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter tertiary phone (optional)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="route_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Route *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery route" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="delivery_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery Time *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Prepaid">Prepaid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="billing_cycle_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Cycle Day *</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {billingCycleDays.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Day of the month for billing
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="opening_balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening Balance</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  Historical outstanding amount (if any)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : customer ? "Update Customer" : "Create Customer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/customers")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}