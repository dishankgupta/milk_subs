'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { modificationSchema, type ModificationFormData } from '@/lib/validations'
import { createModification, updateModification } from '@/lib/actions/modifications'
import type { Customer, Product, Modification, Subscription } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { getCurrentISTDate, parseLocalDateIST } from '@/lib/date-utils'

interface ModificationFormProps {
  customers: Customer[]
  products: Product[]
  modification?: Modification
  isEditing?: boolean
}

export function ModificationForm({ 
  customers, 
  products: _, // Keep for interface compatibility but don't use 
  modification, 
  isEditing = false 
}: ModificationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(false)
  const [customerProducts, setCustomerProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<ModificationFormData>({
    resolver: zodResolver(modificationSchema),
    defaultValues: modification ? {
      customer_id: modification.customer_id,
      product_id: modification.product_id,
      modification_type: modification.modification_type,
      start_date: parseLocalDateIST(modification.start_date),
      end_date: parseLocalDateIST(modification.end_date),
      quantity_change: modification.quantity_change || undefined,
      reason: modification.reason || undefined,
    } : {
      modification_type: 'Skip',
      start_date: getCurrentISTDate(),
      end_date: getCurrentISTDate(),
    }
  })

  const modificationType = watch('modification_type')
  const startDate = watch('start_date')
  const endDate = watch('end_date')
  const watchedCustomerId = watch('customer_id')
  const watchedProductId = watch('product_id')

  // Fetch products for selected customer
  const fetchCustomerProducts = async (customerId: string) => {
    setLoadingProducts(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('base_subscriptions')
        .select(`
          product:products(*)
        `)
        .eq('customer_id', customerId)
        .eq('is_active', true)

      if (error) {
        console.error('Error fetching customer products:', error)
        setCustomerProducts([])
        return
      }

      // Extract unique products
      const uniqueProducts = data?.reduce((acc: Product[], current: { product: unknown }) => {
        const product = current.product
        if (product && typeof product === 'object' && !acc.find(p => p.id === (product as Product).id)) {
          acc.push(product as Product)
        }
        return acc
      }, []) || []

      setCustomerProducts(uniqueProducts)
    } catch (error) {
      console.error('Error fetching customer products:', error)
      setCustomerProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  // Fetch subscription details when customer and product are selected
  const fetchSubscriptionDetails = async (customerId: string, productId: string) => {
    setLoadingSubscription(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('base_subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .eq('product_id', productId)
        .eq('is_active', true)
        .single()

      if (error) {
        console.error('Error fetching subscription:', error)
        setSubscription(null)
        return
      }

      setSubscription(data)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setSubscription(null)
    } finally {
      setLoadingSubscription(false)
    }
  }

  useEffect(() => {
    if (watchedCustomerId) {
      fetchCustomerProducts(watchedCustomerId)
      // Clear product selection when customer changes
      setValue('product_id', '')
      setSubscription(null)
    } else {
      setCustomerProducts([])
      setSubscription(null)
    }
  }, [watchedCustomerId, setValue])

  useEffect(() => {
    if (watchedCustomerId && watchedProductId) {
      fetchSubscriptionDetails(watchedCustomerId, watchedProductId)
    } else {
      setSubscription(null)
    }
  }, [watchedCustomerId, watchedProductId])

  const onSubmit = async (data: ModificationFormData) => {
    setIsSubmitting(true)
    
    try {
      // Validate decrease modification against subscription quantity
      if (data.modification_type === 'Decrease' && subscription && data.quantity_change) {
        if (subscription.subscription_type === 'Daily') {
          const maxQuantity = subscription.daily_quantity || 0
          if (data.quantity_change > maxQuantity) {
            toast.error(`Cannot decrease by ${data.quantity_change}L. Maximum daily quantity is ${maxQuantity}L.`)
            setIsSubmitting(false)
            return
          }
        } else {
          // For pattern subscriptions, get maximum of day1 and day2 quantities
          const maxQuantity = Math.max(
            subscription.pattern_day1_quantity || 0,
            subscription.pattern_day2_quantity || 0
          )
          if (data.quantity_change > maxQuantity) {
            toast.error(`Cannot decrease by ${data.quantity_change}L. Maximum pattern quantity is ${maxQuantity}L.`)
            setIsSubmitting(false)
            return
          }
        }
      }

      const formattedData = {
        customer_id: data.customer_id,
        product_id: data.product_id,
        modification_type: data.modification_type,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.end_date, 'yyyy-MM-dd'),
        quantity_change: data.quantity_change,
        reason: data.reason,
      }

      let result
      if (isEditing && modification) {
        result = await updateModification(modification.id, formattedData)
      } else {
        result = await createModification(formattedData)
      }

      if (result.success) {
        toast.success(
          isEditing 
            ? 'Modification updated successfully' 
            : 'Modification created successfully'
        )
        router.push('/dashboard/modifications')
        router.refresh()
      } else {
        toast.error(result.error || 'Something went wrong')
      }
    } catch (error) {
      toast.error('Something went wrong')
      console.error('Error submitting modification:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCustomer = customers.find(c => c.id === watch('customer_id'))
  const selectedProduct = customerProducts.find(p => p.id === watch('product_id'))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="customer_id">Customer</Label>
          <Select
            value={watch('customer_id') || ''}
            onValueChange={(value) => setValue('customer_id', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.billing_name} ({customer.contact_person})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customer_id && (
            <p className="text-sm text-red-600">{errors.customer_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="product_id">Product</Label>
          <Select
            value={watch('product_id') || ''}
            onValueChange={(value) => setValue('product_id', value)}
            disabled={!watchedCustomerId}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !watchedCustomerId 
                  ? "Select customer first" 
                  : loadingProducts 
                    ? "Loading products..."
                    : customerProducts.length === 0 
                      ? "No products found"
                      : "Select product"
              } />
            </SelectTrigger>
            <SelectContent>
              {customerProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.product_id && (
            <p className="text-sm text-red-600">{errors.product_id.message}</p>
          )}
        </div>
      </div>

      {selectedCustomer && selectedProduct && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-900">Customer Details</p>
                <p className="text-gray-600">{selectedCustomer.billing_name}</p>
                <p className="text-gray-600">{selectedCustomer.contact_person}</p>
                <p className="text-gray-600">{selectedCustomer.phone_primary}</p>
                <p className="text-gray-600">Route: {selectedCustomer.route?.name || 'Route not found'}</p>
                <p className="text-gray-600">{selectedCustomer.delivery_time} Delivery</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Product Details</p>
                <p className="text-gray-600">{selectedProduct.name}</p>
                <p className="text-gray-600">Code: {selectedProduct.code}</p>
                <p className="text-gray-600">₹{selectedProduct.current_price.toFixed(2)}/{selectedProduct.unit}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Subscription Details</p>
                {loadingSubscription ? (
                  <p className="text-gray-600">Loading subscription...</p>
                ) : subscription ? (
                  <>
                    <p className="text-gray-600">
                      Type: <span className="font-medium">{subscription.subscription_type}</span>
                    </p>
                    {subscription.subscription_type === 'Daily' ? (
                      <p className="text-gray-600">
                        Quantity: <span className="font-medium">{subscription.daily_quantity || 0}L per day</span>
                      </p>
                    ) : (
                      <>
                        <p className="text-gray-600">
                          Pattern: <span className="font-medium">2-day cycle</span>
                        </p>
                        <p className="text-gray-600">
                          Day 1: <span className="font-medium">{subscription.pattern_day1_quantity || 0}L</span>
                        </p>
                        <p className="text-gray-600">
                          Day 2: <span className="font-medium">{subscription.pattern_day2_quantity || 0}L</span>
                        </p>
                      </>
                    )}
                    <p className="text-gray-600">
                      Status: <span className={`font-medium ${subscription.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {subscription.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-orange-600">No active subscription found for this customer-product combination</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Label htmlFor="modification_type">Modification Type</Label>
        <Select
          value={watch('modification_type') || ''}
          onValueChange={(value) => setValue('modification_type', value as 'Skip' | 'Increase' | 'Decrease')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select modification type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Skip">Skip Delivery</SelectItem>
            <SelectItem value="Increase">Increase Quantity</SelectItem>
            <SelectItem value="Decrease">Decrease Quantity</SelectItem>
          </SelectContent>
        </Select>
        {errors.modification_type && (
          <p className="text-sm text-red-600">{errors.modification_type.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setValue('start_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.start_date && (
            <p className="text-sm text-red-600">{errors.start_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setValue('end_date', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.end_date && (
            <p className="text-sm text-red-600">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      {(modificationType === 'Increase' || modificationType === 'Decrease') && (
        <div className="space-y-2">
          <Label htmlFor="quantity_change">
            Quantity Change ({modificationType === 'Increase' ? 'Additional' : 'Reduction'} in liters)
          </Label>
          <Input
            id="quantity_change"
            type="number"
            step="0.1"
            min="0.1"
            placeholder="0.0"
            {...register('quantity_change', { valueAsNumber: true })}
          />
          {modificationType === 'Decrease' && subscription && (
            <p className="text-sm text-blue-600">
              {subscription.subscription_type === 'Daily' 
                ? `Maximum reduction: ${subscription.daily_quantity || 0}L (current daily quantity)`
                : `Maximum reduction: ${Math.max(subscription.pattern_day1_quantity || 0, subscription.pattern_day2_quantity || 0)}L (highest pattern day)`
              }
            </p>
          )}
          {errors.quantity_change && (
            <p className="text-sm text-red-600">{errors.quantity_change.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Textarea
          id="reason"
          placeholder="Reason for modification..."
          rows={3}
          {...register('reason')}
        />
        {errors.reason && (
          <p className="text-sm text-red-600">{errors.reason.message}</p>
        )}
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Modification' : 'Create Modification'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push('/dashboard/modifications')}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}