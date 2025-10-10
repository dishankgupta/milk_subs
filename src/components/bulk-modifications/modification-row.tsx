"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { UseFormReturn } from "react-hook-form"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"

import type { Product, Customer, Subscription } from "@/lib/types"
import type { BulkModificationRow } from "@/lib/validations"

interface ModificationRowProps {
  index: number
  form: UseFormReturn<{ modifications: BulkModificationRow[] }>
  products: Product[]
  customers: Customer[]
  onRemove: (index: number) => void
  canRemove: boolean
  onAddRow?: () => void
  isLastRow?: boolean
}

export function ModificationRow({
  index,
  form,
  products,
  customers,
  onRemove,
  canRemove,
  onAddRow,
  isLastRow = false
}: ModificationRowProps) {
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  const watchedModification = form.watch(`modifications.${index}`)

  // Simple search states
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerDropdownPosition, setCustomerDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1)
  const customerInputRef = useRef<HTMLInputElement>(null)

  // Filter customers
  const filteredCustomers = customers.filter(customer =>
    customer.billing_name.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 10)

  // Filter products - only show products from selected customer's subscriptions
  const [customerProducts, setCustomerProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loadingSubscription, setLoadingSubscription] = useState(false)

  // Get selected customer name for display
  const selectedCustomerName = customers.find(c => c.id === watchedModification?.customer_id)?.billing_name || ""

  // Fetch products for selected customer
  useEffect(() => {
    async function fetchCustomerProducts() {
      if (!watchedModification?.customer_id) {
        setCustomerProducts([])
        return
      }

      setLoadingProducts(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data, error } = await supabase
          .from('base_subscriptions')
          .select(`product:products(*)`)
          .eq('customer_id', watchedModification.customer_id)
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

    fetchCustomerProducts()
  }, [watchedModification?.customer_id])

  // Fetch subscription details when both customer and product are selected
  useEffect(() => {
    async function fetchSubscription() {
      if (!watchedModification?.customer_id || !watchedModification?.product_id) {
        setSubscription(null)
        return
      }

      setLoadingSubscription(true)
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()

        const { data, error } = await supabase
          .from('base_subscriptions')
          .select('*')
          .eq('customer_id', watchedModification.customer_id)
          .eq('product_id', watchedModification.product_id)
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

    fetchSubscription()
  }, [watchedModification?.customer_id, watchedModification?.product_id])

  const errors = form.formState.errors.modifications?.[index]

  // Handle customer dropdown keyboard navigation
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    // Show dropdown on ArrowDown if not already shown
    if (e.key === 'ArrowDown' && !showCustomerDropdown) {
      e.preventDefault()
      setShowCustomerDropdown(true)
      setCustomerDropdownPosition(calculateDropdownPosition(customerInputRef))
      return
    }

    if (!showCustomerDropdown || !filteredCustomers.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedCustomerIndex(prev =>
          prev < filteredCustomers.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedCustomerIndex(prev =>
          prev > 0 ? prev - 1 : filteredCustomers.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedCustomerIndex >= 0) {
          const customer = filteredCustomers[selectedCustomerIndex]
          form.setValue(`modifications.${index}.customer_id`, customer.id)
          setCustomerSearch("")
          setShowCustomerDropdown(false)
          setSelectedCustomerIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowCustomerDropdown(false)
        setSelectedCustomerIndex(-1)
        break
    }
  }

  // Handle Tab key in reason field
  const handleReasonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && isLastRow && onAddRow) {
      e.preventDefault()
      onAddRow()
    }
  }

  // Handle row-specific keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Alt+A is handled globally in the form component to prevent duplicate row additions
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
      e.preventDefault()
      if (canRemove) {
        onRemove(index)
      }
    }
  }

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback((inputRef: React.RefObject<HTMLInputElement | null>) => {
    if (!inputRef.current) return { top: 0, left: 0, width: 0 }

    const rect = inputRef.current.getBoundingClientRect()
    return {
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest(`[data-row="${index}"]`) && !target.closest('.dropdown-portal')) {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [index])

  // Reset product when customer changes
  useEffect(() => {
    if (watchedModification?.customer_id) {
      form.setValue(`modifications.${index}.product_id`, '')
    }
  }, [watchedModification?.customer_id, form, index])

  return (
    <tr className="border-b" data-row={index}>
      {/* Remove Button */}
      <td className="p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>

      {/* Customer */}
      <td className="p-2 min-w-[200px] relative" onKeyDown={handleKeyDown}>
        <div className="relative">
          <Input
            ref={customerInputRef}
            className="h-8"
            placeholder="Type to search..."
            value={selectedCustomerName || customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setShowCustomerDropdown(true)
              setSelectedCustomerIndex(-1)
              if (!e.target.value) {
                form.setValue(`modifications.${index}.customer_id`, '')
              }
            }}
            onFocus={() => {
              setShowCustomerDropdown(true)
              setCustomerDropdownPosition(calculateDropdownPosition(customerInputRef))
            }}
            onKeyDown={handleCustomerKeyDown}
          />
        </div>
        {showCustomerDropdown && !selectedCustomerName && customerSearch && (
          <div
            className="dropdown-portal fixed z-50 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
            style={{
              top: customerDropdownPosition.top,
              left: customerDropdownPosition.left,
              width: customerDropdownPosition.width
            }}
          >
            {filteredCustomers.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No customers found</div>
            ) : (
              filteredCustomers.map((customer, customerIndex) => (
                <div
                  key={customer.id}
                  className={`p-2 cursor-pointer text-sm ${
                    customerIndex === selectedCustomerIndex
                      ? 'bg-blue-100 text-blue-900'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    form.setValue(`modifications.${index}.customer_id`, customer.id)
                    setCustomerSearch("")
                    setShowCustomerDropdown(false)
                    setSelectedCustomerIndex(-1)
                  }}
                >
                  <div className="font-medium">{customer.billing_name}</div>
                  <div className="text-xs text-gray-500">{customer.phone_primary}</div>
                </div>
              ))
            )}
          </div>
        )}
        {errors?.customer_id && (
          <p className="text-xs text-red-600 mt-1">{errors.customer_id.message}</p>
        )}
      </td>

      {/* Product */}
      <td className="p-2 min-w-[200px]" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2">
          <Select
            value={watchedModification?.product_id || ''}
            onValueChange={(value) => form.setValue(`modifications.${index}.product_id`, value)}
            disabled={!watchedModification?.customer_id || loadingProducts}
          >
            <SelectTrigger className="h-8 flex-1">
              <SelectValue placeholder={
                !watchedModification?.customer_id
                  ? "Select customer first"
                  : loadingProducts
                    ? "Loading products..."
                    : customerProducts.length === 0
                      ? "No active subscriptions"
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
          {watchedModification?.customer_id && watchedModification?.product_id && (
            <div className="shrink-0">
              {loadingSubscription ? (
                <p className="text-xs text-gray-500">Loading...</p>
              ) : subscription ? (
                <div className="text-xs text-blue-600 font-medium">
                  {subscription.subscription_type === 'Daily' ? (
                    <span>{subscription.daily_quantity}L/day</span>
                  ) : (
                    <span>{subscription.pattern_day1_quantity}L/{subscription.pattern_day2_quantity}L</span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-orange-600">No sub</p>
              )}
            </div>
          )}
        </div>
        {errors?.product_id && (
          <p className="text-xs text-red-600 mt-1">{errors.product_id.message}</p>
        )}
      </td>

      {/* Modification Type */}
      <td className="p-2 min-w-[150px]">
        <Select
          value={watchedModification?.modification_type || "Skip"}
          onValueChange={(value) => {
            form.setValue(`modifications.${index}.modification_type`, value as "Skip" | "Increase" | "Decrease" | "Add Note")
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Skip">Skip</SelectItem>
            <SelectItem value="Increase">Increase</SelectItem>
            <SelectItem value="Decrease">Decrease</SelectItem>
            <SelectItem value="Add Note">Add Note</SelectItem>
          </SelectContent>
        </Select>
        {errors?.modification_type && (
          <p className="text-xs text-red-600 mt-1">{errors.modification_type.message}</p>
        )}
      </td>

      {/* Start Date */}
      <td className="p-2 min-w-[140px]" onKeyDown={handleKeyDown}>
        <UnifiedDatePicker
          value={watchedModification?.start_date}
          onChange={(date) => form.setValue(`modifications.${index}.start_date`, date)}
          placeholder="DD-MM-YYYY"
          className="h-8"
        />
        {errors?.start_date && (
          <p className="text-xs text-red-600 mt-1">{errors.start_date.message}</p>
        )}
      </td>

      {/* End Date */}
      <td className="p-2 min-w-[140px]" onKeyDown={handleKeyDown}>
        <UnifiedDatePicker
          value={watchedModification?.end_date}
          onChange={(date) => form.setValue(`modifications.${index}.end_date`, date)}
          placeholder="DD-MM-YYYY"
          className="h-8"
        />
        {errors?.end_date && (
          <p className="text-xs text-red-600 mt-1">{errors.end_date.message}</p>
        )}
      </td>

      {/* Quantity Change */}
      <td className="p-2 min-w-[120px]" onKeyDown={handleKeyDown}>
        <Input
          type="number"
          min="0"
          step="0.1"
          className="h-8"
          placeholder={
            watchedModification?.modification_type === 'Increase' || watchedModification?.modification_type === 'Decrease'
              ? "Quantity"
              : "N/A"
          }
          value={watchedModification?.quantity_change !== undefined ? watchedModification.quantity_change : ""}
          onChange={(e) => {
            const value = e.target.value
            if (value === "" || !isNaN(parseFloat(value))) {
              form.setValue(`modifications.${index}.quantity_change`, value === "" ? undefined : parseFloat(value))
            }
          }}
          disabled={watchedModification?.modification_type !== 'Increase' && watchedModification?.modification_type !== 'Decrease'}
        />
        {errors?.quantity_change && (
          <p className="text-xs text-red-600 mt-1">{errors.quantity_change.message}</p>
        )}
      </td>

      {/* Reason */}
      <td className="p-2 min-w-[200px]" onKeyDown={handleKeyDown}>
        <Textarea
          ref={reasonRef}
          className="h-8 min-h-8 resize-none"
          placeholder={
            watchedModification?.modification_type === 'Add Note'
              ? "Note (required, Tab to add row)"
              : "Reason (Tab to add row)"
          }
          value={watchedModification?.reason || ""}
          onChange={(e) => form.setValue(`modifications.${index}.reason`, e.target.value)}
          onKeyDown={handleReasonKeyDown}
          rows={1}
        />
        {errors?.reason && (
          <p className="text-xs text-red-600 mt-1">{errors.reason.message}</p>
        )}
      </td>
    </tr>
  )
}
