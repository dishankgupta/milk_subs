// GST Calculation Utilities for Sales Management System
// Handles inclusive pricing calculations and GST breakdowns

/**
 * Calculate GST breakdown from inclusive amount
 * Used when total amount includes GST and we need to separate base amount and GST
 */
export function calculateGSTFromInclusive(inclusiveAmount: number, gstRate: number): {
  baseAmount: number
  gstAmount: number
} {
  const baseAmount = inclusiveAmount / (1 + (gstRate / 100))
  const gstAmount = inclusiveAmount - baseAmount
  
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100
  }
}

/**
 * Calculate GST inclusive amount from base amount
 * Used when base amount is known and we need to add GST
 */
export function calculateGSTInclusive(baseAmount: number, gstRate: number): {
  baseAmount: number
  gstAmount: number
  totalAmount: number
} {
  const gstAmount = (baseAmount * gstRate) / 100
  const totalAmount = baseAmount + gstAmount
  
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  }
}

/**
 * Format GST breakdown for display
 * Creates a human-readable string showing base amount and GST
 */
export function formatGSTBreakdown(totalAmount: number, gstRate: number): string {
  const { baseAmount, gstAmount } = calculateGSTFromInclusive(totalAmount, gstRate)
  return `Base: ₹${baseAmount.toFixed(2)} + GST(${gstRate}%): ₹${gstAmount.toFixed(2)}`
}

/**
 * Calculate sale totals with GST
 * Main function for sales form calculations
 */
export function calculateSaleTotals(quantity: number, unitPrice: number, gstRate: number): {
  subtotal: number
  gstAmount: number
  totalAmount: number
  breakdown: string
} {
  const subtotal = quantity * unitPrice
  const gstAmount = (subtotal * gstRate) / 100
  const totalAmount = subtotal + gstAmount
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    breakdown: formatGSTBreakdown(totalAmount, gstRate)
  }
}

/**
 * Validate GST rate
 * Ensures GST rate is within acceptable range (0-30%)
 */
export function validateGSTRate(gstRate: number): boolean {
  return gstRate >= 0 && gstRate <= 30
}

/**
 * Format currency for display
 * Consistent currency formatting across the application
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`
}

/**
 * Parse currency string to number
 * Remove currency symbol and convert to number
 */
export function parseCurrency(currencyString: string): number {
  return parseFloat(currencyString.replace(/[₹,]/g, '')) || 0
}