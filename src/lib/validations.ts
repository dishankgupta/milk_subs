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
  opening_balance: z.number().min(0, "Opening balance cannot be negative").default(0),
  status: z.enum(["Active", "Inactive"]),
})

export const subscriptionSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  product_id: z.string().uuid("Please select a valid product"),
  subscription_type: z.enum(["Daily", "Pattern"], { message: "Please select subscription type" }),
  daily_quantity: z.number().positive("Daily quantity must be positive").optional(),
  pattern_day1_quantity: z.number().positive("Day 1 quantity must be positive").optional(),
  pattern_day2_quantity: z.number().positive("Day 2 quantity must be positive").optional(),
  pattern_start_date: z.date({ message: "Pattern start date is required" }).optional(),
  is_active: z.boolean(),
}).refine((data) => {
  if (data.subscription_type === "Daily") {
    return data.daily_quantity !== undefined && data.daily_quantity > 0
  }
  if (data.subscription_type === "Pattern") {
    return data.pattern_day1_quantity !== undefined && 
           data.pattern_day2_quantity !== undefined && 
           data.pattern_start_date !== undefined &&
           data.pattern_day1_quantity > 0 &&
           data.pattern_day2_quantity > 0
  }
  return true
}, {
  message: "Please provide valid quantities for the selected subscription type",
  path: ["subscription_type"]
})

export const modificationSchema = z.object({
  customer_id: z.string().uuid("Please select a valid customer"),
  product_id: z.string().uuid("Please select a valid product"),
  modification_type: z.enum(["Skip", "Increase", "Decrease"], { message: "Please select modification type" }),
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
  pattern_start_date?: Date
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

export const deliverySchema = z.object({
  daily_order_id: z.string().uuid("Please select a valid order"),
  actual_quantity: z.number().min(0, "Actual quantity cannot be negative"),
  delivery_notes: z.string().max(500, "Delivery notes must be less than 500 characters").optional(),
  delivery_person: z.string().max(100, "Delivery person name must be less than 100 characters").optional(),
  delivered_at: z.date({ message: "Delivery time is required" }).optional(),
})

export type DeliveryFormData = z.infer<typeof deliverySchema>

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
})

export type BulkDeliveryFormData = z.infer<typeof bulkDeliverySchema>

// Sales Management System Validation Schemas

export const saleSchema = z.object({
  customer_id: z.string().uuid().nullable(),
  product_id: z.string().uuid("Product selection is required"),
  quantity: z.number()
    .min(0.001, "Quantity must be greater than 0")
    .max(10000, "Quantity too large"),
  unit_price: z.number()
    .min(0.01, "Unit price must be greater than 0")
    .max(100000, "Unit price too high"),
  sale_type: z.enum(['Cash', 'Credit']),
  sale_date: z.date().max(new Date(), "Sale date cannot be in the future"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional()
}).refine((data) => {
  // Business rule: Cash sales cannot have customer_id
  if (data.sale_type === 'Cash' && data.customer_id !== null) {
    return false
  }
  // Business rule: Credit sales must have customer_id
  if (data.sale_type === 'Credit' && data.customer_id === null) {
    return false
  }
  return true
}, {
  message: "Cash sales cannot have customer, Credit sales must have customer",
  path: ["customer_id"]
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
  customer_selection: z.enum(['all', 'with_outstanding', 'with_subscription_and_outstanding', 'selected']),
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
  output_folder: z.string().min(1, "Output folder is required")
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
  output_folder: z.string().optional()
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