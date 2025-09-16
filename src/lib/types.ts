// =============================================================================
// IST DATE & TIMEZONE TYPES
// =============================================================================

// IST-specific date types
export type ISTDate = Date & { __istMarker?: never }
export type ISTDateString = string // YYYY-MM-DD format
export type ISTTimestamp = string // ISO string with timezone
export type ISTBusinessHour = 'morning' | 'evening'

// Date range types
export interface ISTDateRange {
  start: Date
  end: Date
  timezone: 'Asia/Kolkata'
}

// Business context types
export interface ISTBusinessCalendar {
  businessHours: {
    morning: { start: string, end: string }
    evening: { start: string, end: string }
  }
  workingDays: number[] // 0-6, Sunday=0
  holidays: ISTDateString[]
}

// Utility function types
export type ISTFormatter = (date: Date) => string
export type ISTParser = (dateString: string) => Date
export type ISTValidator = (date: Date) => boolean
export type ISTComparator = (date1: Date, date2: Date) => number

// Options types
export interface ISTFormatOptions {
  includeTime?: boolean
  includeSeconds?: boolean
  format?: 'short' | 'long' | 'numeric'
  business?: boolean
}

export interface ISTValidationOptions {
  allowFuture?: boolean
  allowPast?: boolean
  businessHoursOnly?: boolean
  workingDaysOnly?: boolean
}

// Database operation types
export interface ISTDatabaseDate {
  raw: string // UTC timestamp from database
  ist: Date   // Converted to IST
  formatted: string // Display format
}

// API request/response types
export interface ISTDateFilter {
  from?: ISTDateString
  to?: ISTDateString
  timezone: 'Asia/Kolkata'
}

export interface ISTTimestampResponse {
  timestamp: ISTTimestamp
  formatted: string
  businessContext?: {
    isBusinessHour: boolean
    isWorkingDay: boolean
    nextBusinessDay: ISTDateString
  }
}

// =============================================================================
// BUSINESS DOMAIN TYPES
// =============================================================================

export interface Customer {
  id: string
  billing_name: string
  contact_person: string
  address: string
  phone_primary: string
  phone_secondary: string | null
  phone_tertiary: string | null
  route_id: string
  delivery_time: "Morning" | "Evening"
  payment_method: "Monthly" | "Prepaid"
  billing_cycle_day: number
  opening_balance: number
  status: "Active" | "Inactive"
  created_at: string
  updated_at: string
  route?: Route
}

export interface Route {
  id: string
  name: string
  description: string | null
  personnel_name: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  code: string
  current_price: number
  unit: string
  gst_rate: number
  unit_of_measure: string
  is_subscription_product: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  customer_id: string
  product_id: string
  subscription_type: "Daily" | "Pattern"
  daily_quantity: number | null
  pattern_day1_quantity: number | null
  pattern_day2_quantity: number | null
  pattern_start_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  customer?: Customer
  product?: Product
}

export interface DailyOrder {
  id: string
  customer_id: string
  product_id: string
  order_date: string
  planned_quantity: number
  unit_price: number
  total_amount: number
  route_id: string
  delivery_time: "Morning" | "Evening"
  status: "Pending" | "Generated" | "Delivered"
  created_at: string
  updated_at: string
  customer?: Customer
  product?: Product
  route?: Route
}

export interface Modification {
  id: string
  customer_id: string
  product_id: string
  modification_type: "Skip" | "Increase" | "Decrease"
  start_date: string
  end_date: string
  quantity_change: number | null
  reason: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  customer?: Customer
  product?: Product
  // Computed fields for expiration handling
  isExpired?: boolean
  displayStatus?: 'Active' | 'Expired' | 'Disabled'
  effectivelyActive?: boolean
}

export interface Payment {
  id: string
  customer_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  period_start: string | null
  period_end: string | null
  notes: string | null
  created_at: string
  updated_at: string
  customer?: Customer
}

export interface Delivery {
  id: string
  daily_order_id: string | null // MODIFIED: Now nullable for additional items
  actual_quantity: number | null
  delivery_notes: string | null
  delivered_at: string | null
  delivery_person: string | null
  created_at: string
  updated_at: string
  daily_order?: DailyOrder
}

// Enhanced delivery type with self-contained fields
export interface DeliveryExtended {
  // Core fields
  id: string
  daily_order_id: string | null  // MODIFIED: Now nullable

  // NEW: Self-contained business fields
  customer_id: string
  product_id: string
  route_id: string
  order_date: string
  delivery_time: "Morning" | "Evening"

  // NEW: Pricing fields
  unit_price: number
  total_amount: number

  // MODIFIED: Now nullable for additional items
  planned_quantity: number | null

  // NEW: Status tracking
  delivery_status: "pending" | "delivered" | "cancelled"

  // Existing fields
  actual_quantity: number | null
  delivery_notes: string | null
  delivered_at: string | null
  delivery_person: string | null
  created_at: string
  updated_at: string

  // Direct relations (no longer through joins)
  customer?: Customer
  product?: Product
  route?: Route

  // Optional: Keep for backward compatibility during transition
  daily_order?: DailyOrder
}

// Additional item types
export interface AdditionalDeliveryItem {
  id: string
  delivery_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
  product?: Product
}

export interface DeliveryWithItems extends DeliveryExtended {
  additional_items?: AdditionalDeliveryItem[]
}

export interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  totalProducts: number
  totalRoutes: number
}

// Sales Management System Types

export interface Sale {
  id: string
  customer_id: string | null // NULL for cash sales
  product_id: string
  quantity: number
  unit_price: number
  total_amount: number
  gst_amount: number
  sale_type: 'Cash' | 'Credit' | 'QR'
  sale_date: string
  payment_status: 'Completed' | 'Pending' | 'Billed'
  notes: string | null
  created_at: string
  updated_at: string
  // Relations
  customer?: Customer
  product?: Product
}

export interface InvoiceMetadata {
  id: string
  invoice_number: string
  customer_id: string
  invoice_date: string
  period_start: string
  period_end: string
  subscription_amount: number
  manual_sales_amount: number
  total_amount: number
  gst_amount: number
  file_path: string | null
  status: 'Generated' | 'Sent' | 'Paid'
  created_at: string
  updated_at: string
  customer?: Customer
}

// Sales Form Types

export interface SaleFormData {
  customer_id: string | null
  product_id: string
  quantity: number
  unit_price: number
  sale_type: 'Cash' | 'Credit' | 'QR'
  sale_date: Date
  notes?: string
}

// Outstanding Report Types

export interface OutstandingReportFilter {
  start_date: Date
  end_date: Date
  customer_selection: 'all' | 'with_outstanding' | 'with_subscription_and_outstanding' | 'with_credit' | 'selected'
  selected_customer_ids?: string[]
}

export interface OutstandingReportData {
  customer_id: string
  customer_name: string
  opening_balance: number
  subscription_amount: number
  manual_sales_amount: number
  payments_amount: number
  current_outstanding: number
  // Detailed breakdowns
  subscription_details: MonthlySubscriptionDetail[]
  manual_sales_details: Sale[]
  payment_details: Payment[]
}

export interface MonthlySubscriptionDetail {
  month: string // "2025-08"
  total_amount: number
  product_details: {
    product_name: string
    quantity: number
    amount: number
  }[]
}

// Sort configuration types
export type SortDirection = 'asc' | 'desc'

export interface SortConfig<T> {
  key: keyof T | string
  direction: SortDirection
}

export interface SortableColumn {
  key: string
  label: string
  sortable?: boolean
}