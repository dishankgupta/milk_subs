import { z } from "zod"

export const customerSchema = z.object({
  billing_name: z.string().min(1, "Billing name is required").max(100, "Billing name must be less than 100 characters"),
  contact_person: z.string().min(1, "Contact person is required").max(100, "Contact person must be less than 100 characters"),
  address: z.string().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  phone_primary: z.string().min(10, "Primary phone must be at least 10 digits").max(15, "Primary phone must be less than 15 digits").regex(/^\+?[\d\s-()]+$/, "Invalid phone number format"),
  phone_secondary: z.string().max(15, "Secondary phone must be less than 15 digits").regex(/^\+?[\d\s-()]*$/, "Invalid phone number format").optional(),
  phone_tertiary: z.string().max(15, "Tertiary phone must be less than 15 digits").regex(/^\+?[\d\s-()]*$/, "Invalid phone number format").optional(),
  route_id: z.string().uuid("Please select a valid route"),
  delivery_time: z.enum(["Morning", "Evening"], { message: "Please select delivery time" }),
  payment_method: z.enum(["Monthly", "Prepaid"], { message: "Please select payment method" }),
  billing_cycle_day: z.number().min(1, "Billing cycle day must be between 1 and 31").max(31, "Billing cycle day must be between 1 and 31"),
  opening_balance: z.number().min(0, "Opening balance cannot be negative"),
  status: z.enum(["Active", "Inactive"]),
})

export const subscriptionSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  product_id: z.string().uuid("Please select a valid product"),
  subscription_type: z.enum(["Daily", "Pattern"], { message: "Please select subscription type" }),
  daily_quantity: z.number().positive("Daily quantity must be positive").optional(),
  pattern_day1_quantity: z.number().min(0, "Day 1 quantity cannot be negative").optional(),
  pattern_day2_quantity: z.number().min(0, "Day 2 quantity cannot be negative").optional(),
  pattern_start_date: z.date({ message: "Pattern start date is required" }).nullable().optional(),
  is_active: z.boolean(),
}).refine((data) => {
  if (data.subscription_type === "Daily") {
    return data.daily_quantity !== undefined && data.daily_quantity > 0
  }
  if (data.subscription_type === "Pattern") {
    return data.pattern_day1_quantity !== undefined && 
           data.pattern_day2_quantity !== undefined && 
           data.pattern_start_date !== undefined && 
           data.pattern_start_date !== null &&
           data.pattern_day1_quantity >= 0 &&
           data.pattern_day2_quantity >= 0 &&
           (data.pattern_day1_quantity > 0 || data.pattern_day2_quantity > 0) // At least one day must have delivery
  }
  return true
}, {
  message: "For Pattern subscriptions, at least one day must have a delivery quantity greater than 0",
  path: ["pattern_day1_quantity"]
})

export const modificationSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  product_id: z.string().uuid("Please select a valid product"),
  modification_type: z.enum(["Skip", "Increase", "Decrease", "Add Note"], { message: "Please select modification type" }),
  start_date: z.date({ message: "Start date is required" }),
  end_date: z.date({ message: "End date is required" }),
  quantity_change: z.number().optional(),
  reason: z.string().max(500, "Reason must be less than 500 characters").optional(),
}).refine((data) => {
  return data.end_date >= data.start_date
}, {
  message: "End date must be after or equal to start date",
  path: ["end_date"]
}).refine((data) => {
  if (data.modification_type === "Increase" || data.modification_type === "Decrease") {
    return data.quantity_change !== undefined && data.quantity_change > 0
  }
  return true
}, {
  message: "Quantity change is required for increase/decrease modifications",
  path: ["quantity_change"]
}).refine((data) => {
  if (data.modification_type === "Add Note") {
    return data.reason !== undefined && data.reason.trim().length > 0
  }
  return true
}, {
  message: "Note is required when adding a note modification",
  path: ["reason"]
})

export type CustomerFormData = z.infer<typeof customerSchema>
// Create a cleaner subscription form data type
export type SubscriptionFormData = {
  customer_id: string
  product_id: string
  subscription_type: "Daily" | "Pattern"
  daily_quantity?: number
  pattern_day1_quantity?: number
  pattern_day2_quantity?: number
  pattern_start_date?: Date | null
  is_active: boolean
}

export type ModificationFormData = z.infer<typeof modificationSchema>

export const paymentSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  amount: z.number().positive("Payment amount must be positive"),
  payment_date: z.date({ message: "Payment date is required" }),
  payment_method: z.string().max(50, "Payment method must be less than 50 characters").optional(),
  period_start: z.date({ message: "Period start date is required" }).optional(),
  period_end: z.date({ message: "Period end date is required" }).optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
}).refine((data) => {
  if (data.period_start && data.period_end) {
    return data.period_end >= data.period_start
  }
  return true
}, {
  message: "Period end date must be after or equal to period start date",
  path: ["period_end"]
})

export type PaymentFormData = z.infer<typeof paymentSchema>

// GAP-009: Payment Method Validation Enhancement
export const STANDARD_PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Cheque',
  'Online',
  'Card'
] as const

export type PaymentMethod = typeof STANDARD_PAYMENT_METHODS[number]

export function getStandardPaymentMethods(): readonly PaymentMethod[] {
  return STANDARD_PAYMENT_METHODS
}

export function normalizePaymentMethod(method: string): PaymentMethod | null {
  if (!method) return null

  const normalized = method.toLowerCase().trim()

  const mappings: Record<string, PaymentMethod> = {
    'cash': 'Cash',
    'upi': 'UPI',
    'bank transfer': 'Bank Transfer',
    'banktransfer': 'Bank Transfer',
    'cheque': 'Cheque',
    'check': 'Cheque',
    'online': 'Online',
    'card': 'Card',
    'credit card': 'Card',
    'debit card': 'Card'
  }

  return mappings[normalized] || null
}

export function validatePaymentMethod(method: string | undefined): { isValid: boolean; error: string | null; normalizedMethod?: PaymentMethod } {
  if (!method || typeof method !== 'string') {
    return { isValid: false, error: 'Payment method is required' }
  }

  if (method.length > 50) {
    return { isValid: false, error: 'Payment method must be less than 50 characters' }
  }

  const normalizedMethod = normalizePaymentMethod(method)
  if (!normalizedMethod) {
    return {
      isValid: false,
      error: `Invalid payment method. Allowed: ${STANDARD_PAYMENT_METHODS.join(', ')}`
    }
  }

  return { isValid: true, error: null, normalizedMethod }
}

export function validatePaymentMethodBusinessRules(method: PaymentMethod, amount: number): { isValid: boolean; error: string | null } {
  const rules: Record<PaymentMethod, { min: number; max: number }> = {
    'Cash': { min: 0, max: 50000 },
    'UPI': { min: 1, max: 100000 },
    'Cheque': { min: 1000, max: 1000000 },
    'Bank Transfer': { min: 1, max: 1000000 },
    'Online': { min: 1, max: 100000 },
    'Card': { min: 1, max: 100000 }
  }

  const rule = rules[method]
  if (amount < rule.min || amount > rule.max) {
    return {
      isValid: false,
      error: `Amount for ${method} must be between ₹${rule.min.toLocaleString()} and ₹${rule.max.toLocaleString()}`
    }
  }

  return { isValid: true, error: null }
}

// Enhanced payment schema with enum validation
export const enhancedPaymentSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  amount: z.number().positive("Payment amount must be positive"),
  payment_date: z.date({ message: "Payment date is required" }),
  payment_method: z.string()
    .max(50, "Payment method must be less than 50 characters")
    .refine((method) => {
      if (!method) return true // Optional field
      const validation = validatePaymentMethod(method)
      return validation.isValid
    }, {
      message: `Invalid payment method. Allowed: ${STANDARD_PAYMENT_METHODS.join(', ')}`
    })
    .optional(),
  period_start: z.date({ message: "Period start date is required" }).optional(),
  period_end: z.date({ message: "Period end date is required" }).optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
}).refine((data) => {
  if (data.period_start && data.period_end) {
    return data.period_end >= data.period_start
  }
  return true
}, {
  message: "Period end date must be after or equal to period start date",
  path: ["period_end"]
}).refine((data) => {
  // Business rules validation for payment method and amount
  if (data.payment_method && data.amount) {
    const validation = validatePaymentMethod(data.payment_method)
    if (validation.isValid && validation.normalizedMethod) {
      const businessValidation = validatePaymentMethodBusinessRules(validation.normalizedMethod, data.amount)
      return businessValidation.isValid
    }
  }
  return true
}, {
  message: "Payment amount exceeds limits for selected payment method",
  path: ["amount"]
})

export type EnhancedPaymentFormData = z.infer<typeof enhancedPaymentSchema>

// GAP-003: Enhanced payment allocation validation functions
interface PaymentAllocationValidationInput {
  payment: {
    id: string
    amount: number
    existingAllocations?: number
  }
  allocations: Array<{
    invoiceId: string
    amount: number
  }>
}

interface PaymentUpdateValidationInput {
  oldPayment: {
    id: string
    amount: number
    allocation_status: string
  }
  newPaymentData: {
    amount: number
    payment_method?: string
  }
  newAllocations?: Array<{
    invoiceId: string
    amount: number
  }>
}

export function validatePaymentAllocation({ payment, allocations }: PaymentAllocationValidationInput) {
  const totalAllocations = allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
  const existingAllocations = payment.existingAllocations || 0
  const maxAllowable = payment.amount - existingAllocations

  // Validate individual allocation amounts
  const invalidAllocations = allocations.filter(alloc =>
    alloc.amount <= 0 || !Number.isFinite(alloc.amount)
  )

  if (invalidAllocations.length > 0) {
    return {
      isValid: false,
      error: `Invalid allocation amounts detected. All amounts must be positive numbers.`,
      totalAllocations,
      maxAllowable,
      excess: 0
    }
  }

  // Validate total doesn't exceed available amount
  const excess = Math.max(0, totalAllocations - maxAllowable)
  const isValid = totalAllocations <= maxAllowable && totalAllocations >= 0

  return {
    isValid,
    totalAllocations,
    maxAllowable,
    excess,
    error: isValid ? null : `Allocation amount (₹${totalAllocations}) exceeds available balance (₹${maxAllowable})`
  }
}

export function validatePaymentUpdate({ oldPayment, newPaymentData, newAllocations }: PaymentUpdateValidationInput) {
  // No validation needed if amount hasn't changed
  if (oldPayment.amount === newPaymentData.amount) {
    return { isValid: true, error: null }
  }

  // If payment has existing allocations and amount changed, require new allocation breakdown
  if (oldPayment.allocation_status !== 'unapplied' && !newAllocations) {
    return {
      isValid: false,
      error: 'Payment amount changed but no new allocations provided. Please provide allocation breakdown for the updated amount.'
    }
  }

  // If new allocations provided, validate they don't exceed new payment amount
  if (newAllocations) {
    const totalNewAllocations = newAllocations.reduce((sum, alloc) => sum + alloc.amount, 0)

    // Check for invalid allocation amounts
    const invalidAllocations = newAllocations.filter(alloc =>
      alloc.amount <= 0 || !Number.isFinite(alloc.amount)
    )

    if (invalidAllocations.length > 0) {
      return {
        isValid: false,
        error: 'Invalid allocation amounts in new allocations. All amounts must be positive numbers.'
      }
    }

    if (totalNewAllocations > newPaymentData.amount) {
      return {
        isValid: false,
        error: `New allocations (₹${totalNewAllocations}) exceed updated payment amount (₹${newPaymentData.amount})`
      }
    }
  }

  return { isValid: true, error: null }
}

export const deliverySchema = z.object({
  // MODIFIED: Now optional for additional items
  daily_order_id: z.string().uuid("Please select a valid order").optional(),
  
  // NEW: Required fields for self-contained deliveries
  customer_id: z.string().uuid("Please select a valid customer"),
  product_id: z.string().uuid("Please select a valid product"),
  route_id: z.string().uuid("Please select a valid route"),
  order_date: z.date({ message: "Order date is required" }),
  delivery_time: z.enum(["Morning", "Evening"], { message: "Please select delivery time" }),
  
  // NEW: Pricing fields
  unit_price: z.number().positive("Unit price must be positive"),
  // total_amount is now a computed column in database (actual_quantity * unit_price) - removed from validation

  // MODIFIED: Now optional for additional items
  planned_quantity: z.number().min(0, "Planned quantity cannot be negative").optional(),
  
  // NEW: Status field
  delivery_status: z.enum(["pending", "delivered", "cancelled"]).default("pending").optional(),
  
  // Existing fields remain unchanged
  actual_quantity: z.number().min(0, "Actual quantity cannot be negative"),
  delivery_notes: z.string().max(500, "Delivery notes must be less than 500 characters").optional(),
  delivery_person: z.string().max(100, "Delivery person name must be less than 100 characters").optional(),
  delivered_at: z.date({ message: "Delivery time is required" }).optional(),
}).refine((data) => {
  // Business rule: Additional items (no daily_order_id) must have actual_quantity
  if (!data.daily_order_id && (!data.actual_quantity || data.actual_quantity <= 0)) {
    return false
  }
  return true
}, {
  message: "Additional items must have a positive actual quantity",
  path: ["actual_quantity"]
}).refine((data) => {
  // Business rule: Planned deliveries should have planned_quantity
  if (data.daily_order_id && (!data.planned_quantity || data.planned_quantity < 0)) {
    return false
  }
  return true
}, {
  message: "Planned deliveries must have a planned quantity",
  path: ["planned_quantity"]
})

export type DeliveryFormData = z.infer<typeof deliverySchema>

// New Additional Items Schema
export const additionalItemSchema = z.object({
  product_id: z.string().uuid("Please select a valid product"),
  quantity: z.number().positive("Quantity must be positive"),
  unit_price: z.number().positive("Unit price must be positive"),
  notes: z.string().max(200, "Notes must be less than 200 characters").optional(),
})

export const deliveryWithAdditionalItemsSchema = deliverySchema.extend({
  additional_items: z.array(additionalItemSchema).optional()
})

export type AdditionalItemFormData = z.infer<typeof additionalItemSchema>
export type DeliveryWithAdditionalItemsFormData = z.infer<typeof deliveryWithAdditionalItemsSchema>

export const bulkDeliverySchema = z.object({
  order_ids: z.array(z.string().uuid("Invalid order ID")).min(1, "At least one order must be selected"),
  delivery_mode: z.enum(["as_planned", "custom"], { message: "Please select delivery mode" }),
  delivery_person: z.string().max(100, "Delivery person name must be less than 100 characters").optional(),
  delivered_at: z.date({ message: "Delivery time is required" }).optional(),
  delivery_notes: z.string().max(500, "Delivery notes must be less than 500 characters").optional(),
  custom_quantities: z.array(z.object({
    order_id: z.string().uuid(),
    actual_quantity: z.number().min(0, "Actual quantity cannot be negative")
  })).optional(),
  
  // NEW: Support for additional items in bulk operations
  additional_items_by_customer: z.array(z.object({
    customer_id: z.string().uuid(),
    route_id: z.string().uuid(),
    items: z.array(additionalItemSchema)
  })).optional()
})

export type BulkDeliveryFormData = z.infer<typeof bulkDeliverySchema>

// Sales Management System Validation Schemas

export const saleSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  product_id: z.string().uuid("Product selection is required"),
  quantity: z.number()
    .min(0, "Quantity cannot be negative")
    .max(10000, "Quantity too large"),
  unit_price: z.number()
    .min(0.01, "Unit price must be greater than 0")
    .max(100000, "Unit price too high"),
  sale_type: z.enum(['Cash', 'Credit', 'QR']),
  sale_date: z.date().refine((date) => {
    const today = new Date();
    const saleDate = new Date(date);
    // Reset time to compare only dates
    today.setHours(23, 59, 59, 999);
    return saleDate <= today;
  }, "Sale date cannot be in the future"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional()
}).refine((data) => {
  // Business rule: Credit sales must have customer_id (Cash and QR sales can optionally have customer for reporting)
  if (data.sale_type === 'Credit' && data.customer_id === null) {
    return false
  }
  return true
}, {
  message: "Credit sales must have a customer selected",
  path: ["customer_id"]
}).refine((data) => {
  // Business rule: Quantity must be greater than 0 for saving
  if (data.quantity <= 0) {
    return false
  }
  return true
}, {
  message: "Quantity must be greater than 0",
  path: ["quantity"]
})

export type SaleFormData = z.infer<typeof saleSchema>

// Extended product schema with GST fields
export const productSchema = z.object({
  name: z.string()
    .min(2, "Product name must be at least 2 characters")
    .max(100, "Product name too long"),
  code: z.string()
    .min(2, "Product code must be at least 2 characters")
    .max(10, "Product code too long")
    .regex(/^[A-Z0-9]+$/, "Product code must be uppercase letters and numbers only"),
  current_price: z.number()
    .min(0.01, "Price must be greater than 0")
    .max(100000, "Price too high"),
  unit: z.string()
    .min(1, "Unit is required"),
  gst_rate: z.number()
    .min(0, "GST rate cannot be negative")
    .max(30, "GST rate cannot exceed 30%"),
  unit_of_measure: z.string()
    .min(1, "Unit of measure is required")
    .max(20, "Unit of measure too long"),
  is_subscription_product: z.boolean()
})

export type ProductFormData = z.infer<typeof productSchema>

// Outstanding report validation
export const outstandingReportSchema = z.object({
  start_date: z.date(),
  end_date: z.date(),
  customer_selection: z.enum(['all', 'with_outstanding', 'with_subscription_and_outstanding', 'with_credit', 'with_any_balance', 'selected']),
  selected_customer_ids: z.array(z.string().uuid()).optional()
}).refine((data) => {
  // End date must be after start date
  if (data.end_date <= data.start_date) {
    return false
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["end_date"]
}).refine((data) => {
  // Selected customers must be provided if selection is 'selected'
  if (data.customer_selection === 'selected' && (!data.selected_customer_ids || data.selected_customer_ids.length === 0)) {
    return false
  }
  return true
}, {
  message: "At least one customer must be selected",
  path: ["selected_customer_ids"]
})

export type OutstandingReportFormData = z.infer<typeof outstandingReportSchema>

// Invoice Generation Validation Schemas

export const bulkInvoiceSchema = z.object({
  period_start: z.date(),
  period_end: z.date(),
  customer_selection: z.enum(['all', 'with_unbilled_deliveries', 'with_unbilled_credit_sales', 'with_unbilled_transactions', 'selected']),
  selected_customer_ids: z.array(z.string().uuid()).optional(),
  output_folder: z.string().min(1, "Output folder is required"),
  invoice_date_override: z.date().optional(),
  invoice_number_override: z.string().regex(/^\d{11}$/, "Invoice number must be 11 digits (e.g., 20242500001)").optional()
}).refine((data) => {
  // End date must be after start date
  if (data.period_end <= data.period_start) {
    return false
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["period_end"]
}).refine((data) => {
  // Selected customers must be provided if selection is 'selected'
  if (data.customer_selection === 'selected' && (!data.selected_customer_ids || data.selected_customer_ids.length === 0)) {
    return false
  }
  return true
}, {
  message: "At least one customer must be selected",
  path: ["selected_customer_ids"]
})

export type BulkInvoiceFormData = z.infer<typeof bulkInvoiceSchema>

export const singleInvoiceSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  period_start: z.date(),
  period_end: z.date(),
  include_subscriptions: z.boolean(),
  include_credit_sales: z.boolean(),
  output_folder: z.string().optional(),
  invoice_date_override: z.date().optional(),
  invoice_number_override: z.string().regex(/^\d{11}$/, "Invoice number must be 11 digits (e.g., 20242500001)").optional()
}).refine((data) => {
  // End date must be after start date
  if (data.period_end <= data.period_start) {
    return false
  }
  return true
}, {
  message: "End date must be after start date",
  path: ["period_end"]
}).refine((data) => {
  // At least one option must be selected
  if (!data.include_subscriptions && !data.include_credit_sales) {
    return false
  }
  return true
}, {
  message: "At least one option (subscriptions or credit sales) must be selected",
  path: ["include_subscriptions"]
})

export type SingleInvoiceFormData = z.infer<typeof singleInvoiceSchema>