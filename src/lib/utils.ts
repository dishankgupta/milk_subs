import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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

// Date conversion utility that avoids timezone issues
export function formatDateForAPI(date: Date): string {
  // Get local date components and format as YYYY-MM-DD
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // getMonth() is 0-indexed
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

// Parse date string as local date to avoid timezone issues
export function parseLocalDate(dateString: string): Date {
  // Parse YYYY-MM-DD as local date to avoid timezone shift
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day) // month is 0-indexed in Date constructor
}