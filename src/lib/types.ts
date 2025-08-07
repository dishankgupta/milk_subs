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
  outstanding_amount: number
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
  daily_order_id: string
  actual_quantity: number | null
  delivery_notes: string | null
  delivered_at: string | null
  delivery_person: string | null
  created_at: string
  updated_at: string
  daily_order?: DailyOrder
}

export interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  totalProducts: number
  totalRoutes: number
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