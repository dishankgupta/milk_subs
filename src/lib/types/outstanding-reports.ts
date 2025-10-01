// Outstanding Reports System Types
// Comprehensive type definitions for the triple-level expandable outstanding report system

import type { Customer } from "../types"

export interface OutstandingReportConfiguration {
  start_date: Date
  end_date: Date
  customer_selection: 'all' | 'with_outstanding' | 'with_subscription_and_outstanding' | 'with_credit' | 'with_any_balance' | 'selected'
  selected_customer_ids?: string[]
}

export interface OutstandingCustomerData {
  customer: Customer
  opening_balance: number
  subscription_breakdown: MonthlySubscriptionBreakdown[]
  manual_sales_breakdown: ManualSalesBreakdown[]
  payment_breakdown: PaymentBreakdown[]
  invoice_breakdown: InvoiceBreakdown[]
  unapplied_payments_breakdown?: UnappliedPaymentsBreakdown
  current_outstanding: number
  total_outstanding: number
}

export interface MonthlySubscriptionBreakdown {
  month: string // "2025-08"
  month_display: string // "August 2025"
  total_amount: number
  product_details: SubscriptionProductDetail[]
}

export interface SubscriptionProductDetail {
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  total_amount: number
  unit_of_measure: string
  delivery_days: number
  daily_quantity: number
}

export interface ManualSalesBreakdown {
  total_amount: number
  sale_details: ManualSaleDetail[]
}

export interface ManualSaleDetail {
  sale_id: string
  product_name: string
  product_code: string
  quantity: number
  unit_price: number
  total_amount: number
  gst_amount: number
  unit_of_measure: string
  sale_date: string
  notes?: string
}

export interface PaymentBreakdown {
  total_amount: number
  payment_details: PaymentDetail[]
}

export interface PaymentDetail {
  payment_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes?: string
  period_start?: string
  period_end?: string
}

export interface UnappliedPaymentsBreakdown {
  total_amount: number
  unapplied_payment_details: UnappliedPaymentDetail[]
}

export interface UnappliedPaymentDetail {
  payment_id: string
  payment_date: string
  payment_amount: number
  amount_unapplied: number
  payment_method: string
  notes?: string
}

export interface InvoiceBreakdown {
  invoice_details: InvoiceDetail[]
}

export interface InvoiceDetail {
  invoice_id: string
  invoice_number: string
  invoice_date: string
  total_amount: number
  invoice_status: string
  payment_dates: string[]
}

export interface OutstandingReportSummary {
  total_customers: number
  customers_with_outstanding: number
  total_opening_balance: number
  total_subscription_amount: number
  total_manual_sales_amount: number
  total_payments_amount: number
  total_unapplied_payments_amount: number
  total_outstanding_amount: number
  net_outstanding_amount: number
}

// Form validation types
export interface OutstandingReportFormData {
  start_date: Date
  end_date: Date
  customer_selection: 'all' | 'with_outstanding' | 'with_subscription_and_outstanding' | 'with_credit' | 'with_any_balance' | 'selected'
  selected_customer_ids?: string[]
}

// Print layout types
export type OutstandingReportPrintType = 'summary' | 'statements' | 'complete'

export interface OutstandingReportPrintConfig {
  type: OutstandingReportPrintType
  start_date: string
  end_date: string
  customer_selection: string
  selected_customer_ids?: string[]
}