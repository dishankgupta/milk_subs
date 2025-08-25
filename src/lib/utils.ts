import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
  formatDateForDatabase, 
  parseLocalDateIST, 
  formatDateTimeIST, 
  isValidISTDate,
  IST_LOCALE,
  IST_TIMEZONE,
  formatDateToIST,
  formatDateTimeToIST
} from './date-utils'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '₹0.00'
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '₹0.00'
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount)
}

export function formatQuantity(quantity: number | string | null | undefined): string {
  if (quantity === null || quantity === undefined) return '0L'
  
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity
  if (isNaN(numQuantity)) return '0L'
  
  return `${numQuantity}L`
}

// GST calculation utilities
export function calculateGSTFromInclusive(inclusiveAmount: number, gstRate: number) {
  const baseAmount = inclusiveAmount / (1 + (gstRate / 100))
  const gstAmount = inclusiveAmount - baseAmount
  
  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: inclusiveAmount
  }
}

export function calculateGSTFromExclusive(exclusiveAmount: number, gstRate: number) {
  const gstAmount = exclusiveAmount * (gstRate / 100)
  const totalAmount = exclusiveAmount + gstAmount
  
  return {
    baseAmount: exclusiveAmount,
    gstAmount: Math.round(gstAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100
  }
}

// =============================================================================
// ENHANCED DATE UTILITIES WITH IST SUPPORT
// =============================================================================

/**
 * Format date for API/Database operations with IST validation
 * Enhanced version with validation - maintains backward compatibility
 */
export function formatDateForAPI(date: Date): string {
  // Use the new IST-aware function for validation and consistency
  return formatDateForDatabase(date)
}

/**
 * Parse date string as local IST date with validation
 * Enhanced version with IST context - maintains backward compatibility
 */
export function parseLocalDate(dateString: string): Date {
  // Use the new IST-aware function for validation and consistency
  return parseLocalDateIST(dateString)
}

/**
 * Enhanced currency formatting with optional IST timestamp
 */
export function formatCurrencyIST(
  amount: number | string | null | undefined, 
  options?: { includeTimestamp?: boolean }
): string {
  const formatted = formatCurrency(amount)
  
  if (options?.includeTimestamp) {
    const timestamp = formatDateTimeIST(new Date())
    return `${formatted} (as of ${timestamp})`
  }
  
  return formatted
}

/**
 * Date-fns configuration for IST operations
 */
export const DATE_FNS_IST_CONFIG = {
  locale: 'enIN', // Will be imported from date-fns when needed
  timeZone: IST_TIMEZONE
} as const

/**
 * Standardized date display for IST context
 */
export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Standardized datetime display for IST context
 */
export function formatDateTimeDisplay(date: Date): string {
  return date.toLocaleString(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

/**
 * Validate and format date input for IST operations
 */
export function validateAndFormatDate(date: unknown): string | null {
  if (!isValidISTDate(date)) {
    return null
  }
  
  return formatDateDisplay(date)
}

// Export legacy date functions for backward compatibility
export { formatDateToIST, formatDateTimeToIST }