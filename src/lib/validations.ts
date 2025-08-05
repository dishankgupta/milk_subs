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
  is_active: z.boolean().default(true),
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

export type CustomerFormData = z.infer<typeof customerSchema>
export type SubscriptionFormData = z.infer<typeof subscriptionSchema>