"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { UseFormReturn } from "react-hook-form"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, calculateGSTFromInclusive } from "@/lib/utils"

import type { Product, Customer, SaleFormData } from "@/lib/types"

interface SalesRowProps {
  index: number
  form: UseFormReturn<{ sales: SaleFormData[] }>
  products: Product[]
  customers: Customer[]
  onRemove: (index: number) => void
  canRemove: boolean
  onAddRow?: () => void
  isLastRow?: boolean
}

export function SalesRow({
  index,
  form,
  products,
  customers,
  onRemove,
  canRemove,
  onAddRow,
  isLastRow = false
}: SalesRowProps) {
  const notesRef = useRef<HTMLInputElement>(null)

  const watchedSale = form.watch(`sales.${index}`)
  const selectedProduct = products.find(p => p.id === watchedSale?.product_id)

  // Simple search states
  const [customerSearch, setCustomerSearch] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [customerDropdownPosition, setCustomerDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [productDropdownPosition, setProductDropdownPosition] = useState({ top: 0, left: 0, width: 0 })
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1)
  const [selectedProductIndex, setSelectedProductIndex] = useState(-1)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const productInputRef = useRef<HTMLInputElement>(null)

  // Filter options based on search
  const filteredCustomers = customers.filter(customer =>
    customer.billing_name.toLowerCase().includes(customerSearch.toLowerCase())
  ).slice(0, 10)

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  ).slice(0, 10)

  // Get selected customer/product names for display
  const selectedCustomerName = customers.find(c => c.id === watchedSale?.customer_id)?.billing_name || ""
  const selectedProductName = products.find(p => p.id === watchedSale?.product_id)?.name || ""

  // Auto-fill unit price when product changes
  useEffect(() => {
    if (selectedProduct && watchedSale && watchedSale.product_id) {
      // Only auto-fill if the price is currently 0 or empty (don't overwrite user edits)
      if (watchedSale.unit_price === 0 || !watchedSale.unit_price) {
        form.setValue(`sales.${index}.unit_price`, selectedProduct.current_price)
      }
    }
  }, [selectedProduct, form, index, watchedSale?.product_id])

  // Auto-update sale type based on customer selection
  useEffect(() => {
    if (watchedSale?.customer_id) {
      form.setValue(`sales.${index}.sale_type`, "Credit")
    }
  }, [watchedSale?.customer_id, form, index])

  // Calculate totals
  const quantity = watchedSale?.quantity || 0
  const unitPrice = watchedSale?.unit_price || 0
  const totalAmount = quantity * unitPrice

  const gstBreakdown = selectedProduct && totalAmount > 0
    ? calculateGSTFromInclusive(totalAmount, selectedProduct.gst_rate)
    : null

  const errors = form.formState.errors.sales?.[index]

  // Handle customer dropdown keyboard navigation
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
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
          form.setValue(`sales.${index}.customer_id`, customer.id)
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

  // Handle product dropdown keyboard navigation
  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (!showProductDropdown || !filteredProducts.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedProductIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedProductIndex(prev =>
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedProductIndex >= 0) {
          const product = filteredProducts[selectedProductIndex]
          form.setValue(`sales.${index}.product_id`, product.id)
          setProductSearch("")
          setShowProductDropdown(false)
          setSelectedProductIndex(-1)
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowProductDropdown(false)
        setSelectedProductIndex(-1)
        break
    }
  }

  // Handle Tab key in notes field
  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && isLastRow && onAddRow) {
      e.preventDefault()
      onAddRow()
      // Focus will be handled by the new row
    }
  }

  // Handle row-specific keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.altKey) {
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        onAddRow?.()
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        if (canRemove) {
          onRemove(index)
        }
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
        setShowProductDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [index])

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

      {/* Sale Type */}
      <td className="p-2 min-w-[120px]">
        <Select
          value={watchedSale?.sale_type || "Cash"}
          onValueChange={(value) => {
            form.setValue(`sales.${index}.sale_type`, value as "Cash" | "Credit" | "QR")
            if (value === "Cash" || value === "QR") {
              form.setValue(`sales.${index}.customer_id`, null)
            }
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="QR">QR</SelectItem>
            <SelectItem value="Credit">Credit</SelectItem>
          </SelectContent>
        </Select>
        {errors?.sale_type && (
          <p className="text-xs text-red-600 mt-1">{errors.sale_type.message}</p>
        )}
      </td>

      {/* Customer */}
      <td className="p-2 min-w-[200px] relative" onKeyDown={handleKeyDown}>
        <div className="relative">
          <Input
            ref={customerInputRef}
            className="h-8"
            placeholder={watchedSale?.sale_type === "Cash" || watchedSale?.sale_type === "QR" ? "No Customer" : "Type to search..."}
            value={selectedCustomerName || customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value)
              setShowCustomerDropdown(true)
              setSelectedCustomerIndex(-1)
              if (!e.target.value) {
                form.setValue(`sales.${index}.customer_id`, null)
              }
            }}
            onFocus={() => {
              setShowCustomerDropdown(true)
              setCustomerDropdownPosition(calculateDropdownPosition(customerInputRef))
            }}
            onKeyDown={handleCustomerKeyDown}
            disabled={watchedSale?.sale_type === "Cash" || watchedSale?.sale_type === "QR"}
          />
        </div>
        {showCustomerDropdown && !selectedCustomerName && customerSearch && !(watchedSale?.sale_type === "Cash" || watchedSale?.sale_type === "QR") && (
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
                      form.setValue(`sales.${index}.customer_id`, customer.id)
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
      <td className="p-2 min-w-[250px] relative" onKeyDown={handleKeyDown}>
        <div className="relative">
          <Input
            ref={productInputRef}
            className="h-8"
            placeholder="Type to search products..."
            value={selectedProductName || productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value)
              setShowProductDropdown(true)
              setSelectedProductIndex(-1)
              if (!e.target.value) {
                form.setValue(`sales.${index}.product_id`, "")
              }
            }}
            onFocus={() => {
              setShowProductDropdown(true)
              setProductDropdownPosition(calculateDropdownPosition(productInputRef))
            }}
            onKeyDown={handleProductKeyDown}
          />
        </div>
        {showProductDropdown && !selectedProductName && productSearch && (
          <div
            className="dropdown-portal fixed z-50 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto"
            style={{
              top: productDropdownPosition.top,
              left: productDropdownPosition.left,
              width: productDropdownPosition.width
            }}
          >
              {filteredProducts.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">No products found</div>
              ) : (
                filteredProducts.map((product, productIndex) => (
                  <div
                    key={product.id}
                    className={`p-2 cursor-pointer text-sm ${
                      productIndex === selectedProductIndex
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      form.setValue(`sales.${index}.product_id`, product.id)
                      setProductSearch("")
                      setShowProductDropdown(false)
                      setSelectedProductIndex(-1)
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        ₹{product.current_price} {product.gst_rate > 0 && `• ${product.gst_rate}% GST`}
                      </div>
                    </div>
                  </div>
                ))
              )}
          </div>
        )}
        {errors?.product_id && (
          <p className="text-xs text-red-600 mt-1">{errors.product_id.message}</p>
        )}
      </td>

      {/* Quantity */}
      <td className="p-2 min-w-[100px]" onKeyDown={handleKeyDown}>
        <div className="flex items-center space-x-1">
          <Input
            type="number"
            min="0"
            step="0.001"
            className="h-8 flex-1"
            placeholder="Qty"
            value={watchedSale?.quantity !== undefined ? watchedSale.quantity : ""}
            onChange={(e) => {
              const value = e.target.value
              // Allow empty string and valid numbers (including 0)
              if (value === "" || !isNaN(parseFloat(value))) {
                form.setValue(`sales.${index}.quantity`, value === "" ? 0 : parseFloat(value))
              }
            }}
          />
          {selectedProduct && (
            <span className="text-xs text-gray-500 shrink-0">
              {selectedProduct.unit_of_measure}
            </span>
          )}
        </div>
        {errors?.quantity && (
          <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>
        )}
      </td>

      {/* Unit Price */}
      <td className="p-2 min-w-[100px]" onKeyDown={handleKeyDown}>
        <Input
          type="number"
          min="0.01"
          step="0.01"
          className="h-8"
          placeholder="Price"
          value={watchedSale?.unit_price !== undefined ? watchedSale.unit_price : ""}
          onChange={(e) => {
            const value = e.target.value
            // Allow empty string and valid numbers
            if (value === "" || !isNaN(parseFloat(value))) {
              form.setValue(`sales.${index}.unit_price`, value === "" ? 0 : parseFloat(value))
            }
          }}
        />
        {errors?.unit_price && (
          <p className="text-xs text-red-600 mt-1">{errors.unit_price.message}</p>
        )}
      </td>

      {/* Total */}
      <td className="p-2 min-w-[120px]">
        <div className="space-y-1">
          <div className="font-medium text-green-600">
            {formatCurrency(totalAmount)}
          </div>
          {gstBreakdown && selectedProduct?.gst_rate && selectedProduct.gst_rate > 0 && (
            <div className="text-xs text-gray-600">
              GST: {formatCurrency(gstBreakdown.gstAmount)}
            </div>
          )}
        </div>
      </td>

      {/* Sale Date */}
      <td className="p-2 min-w-[140px]" onKeyDown={handleKeyDown}>
        <UnifiedDatePicker
          value={watchedSale?.sale_date}
          onChange={(date) => date && form.setValue(`sales.${index}.sale_date`, date)}
          placeholder="DD-MM-YYYY"
          className="h-8"
        />
        {errors?.sale_date && (
          <p className="text-xs text-red-600 mt-1">{errors.sale_date.message}</p>
        )}
      </td>

      {/* Notes */}
      <td className="p-2 min-w-[150px]" onKeyDown={handleKeyDown}>
        <Input
          ref={notesRef}
          className="h-8"
          placeholder="Notes (Tab to add row)"
          value={watchedSale?.notes || ""}
          onChange={(e) => form.setValue(`sales.${index}.notes`, e.target.value)}
          onKeyDown={handleNotesKeyDown}
        />
        {errors?.notes && (
          <p className="text-xs text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </td>
    </tr>
  )
}