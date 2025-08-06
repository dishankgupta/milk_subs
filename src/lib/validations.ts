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
  outstanding_amount: z.number().min(0, "Outstanding amount cannot be negative"),
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