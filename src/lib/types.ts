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

export interface DashboardStats {
  totalCustomers: number
  activeCustomers: number
  totalProducts: number
  totalRoutes: number
}