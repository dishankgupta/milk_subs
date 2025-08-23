/**
 * Comprehensive IST Date Utility Library
 * 
 * This library provides timezone-safe date operations for Indian Standard Time (IST).
 * All functions ensure consistent date handling across the dairy management system.
 * 
 * Database: UTC storage with IST conversion
 * Display: IST with en-IN locale formatting
 * Business Hours: 06:00-12:00 (Morning), 17:00-21:00 (Evening)
 */

import { format, parseISO, addDays, startOfDay, endOfDay, differenceInDays } from 'date-fns'
import { enIN } from 'date-fns/locale'

// =============================================================================
// CONSTANTS
// =============================================================================

export const IST_TIMEZONE = 'Asia/Kolkata' as const
export const IST_LOCALE = 'en-IN' as const
export const IST_OFFSET = '+05:30' as const

export const IST_CONFIG = {
  timezone: IST_TIMEZONE,
  locale: IST_LOCALE,
  offset: IST_OFFSET,
  businessHours: {
    morning: { start: '06:00', end: '12:00' },
    evening: { start: '17:00', end: '21:00' }
  },
  workingDays: [0, 1, 2, 3, 4, 5, 6], // All 7 days (0=Sunday, 1=Monday, ..., 6=Saturday)
  dateFormats: {
    display: 'dd/MM/yyyy',
    displayWithTime: 'dd/MM/yyyy, HH:mm',
    displayTimestamp: "dd/MM/yyyy 'at' HH:mm",
    api: 'yyyy-MM-dd',
    timestamp: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
  }
} as const

// =============================================================================
// CORE IST FUNCTIONS
// =============================================================================

/**
 * Get current date and time in IST
 * 
 * This is the primary function for getting the current date in IST context.
 * Use this instead of `new Date()` to ensure IST timezone consistency.
 * 
 * @returns {Date} Current date and time in IST
 * 
 * @example
 * ```typescript
 * // ❌ Wrong - uses system timezone
 * const now = new Date()
 * 
 * // ✅ Correct - uses IST timezone
 * const nowIST = getCurrentISTDate()
 * 
 * // Usage in server actions
 * const payment = {
 *   payment_date: formatDateForDatabase(getCurrentISTDate()),
 *   created_at: formatTimestampForDatabase(getCurrentISTDate())
 * }
 * ```
 * 
 * @see {@link formatDateForDatabase} For database storage
 * @see {@link formatDateIST} For display formatting
 */
export function getCurrentISTDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: IST_TIMEZONE }))
}

/**
 * Get current IST timestamp as ISO string
 */
export function getCurrentISTTimestamp(): string {
  return getCurrentISTDate().toISOString()
}

/**
 * Convert UTC date to IST equivalent
 */
export function convertUTCToIST(utcDate: Date): Date {
  return new Date(utcDate.toLocaleString('en-US', { timeZone: IST_TIMEZONE }))
}

/**
 * Convert IST date to UTC equivalent
 */
export function convertISTToUTC(istDate: Date): Date {
  const istString = istDate.toLocaleString('sv-SE') // YYYY-MM-DD HH:mm:ss format
  return new Date(istString + '+05:30') // Add IST offset
}

// =============================================================================
// DISPLAY FORMATTING FUNCTIONS
// =============================================================================

/**
 * Format date for display in IST (dd/MM/yyyy)
 * 
 * Primary function for formatting dates in user interfaces.
 * Ensures consistent dd/MM/yyyy format across the application.
 * 
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string in dd/MM/yyyy format
 * 
 * @example
 * ```typescript
 * // ❌ Wrong - inconsistent formatting
 * const display = date.toLocaleDateString()
 * 
 * // ✅ Correct - consistent IST formatting
 * const display = formatDateIST(getCurrentISTDate())  // "23/08/2025"
 * 
 * // Usage in UI components
 * <span>{formatDateIST(customer.created_at)}</span>
 * <TableCell>{formatDateIST(invoice.invoice_date)}</TableCell>
 * ```
 * 
 * @throws {Error} If date is invalid
 * @see {@link formatDateTimeIST} For date with time
 * @see {@link formatTimestampIST} For timestamp display
 */
export function formatDateIST(date: Date): string {
  return date.toLocaleDateString(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Format date and time for display in IST (dd/MM/yyyy, HH:mm)
 */
export function formatDateTimeIST(date: Date): string {
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
 * Format timestamp for display in IST (dd/MM/yyyy 'at' HH:mm)
 */
export function formatTimestampIST(date: Date): string {
  const datePart = formatDateIST(date)
  const timePart = date.toLocaleTimeString(IST_LOCALE, {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  return `${datePart} at ${timePart}`
}

/**
 * Format date using date-fns with IST context
 */
export function formatWithIST(date: Date, formatString: string): string {
  const istDate = convertUTCToIST(date)
  return format(istDate, formatString, { locale: enIN })
}

// =============================================================================
// DATABASE & API UTILITIES
// =============================================================================

/**
 * Format date for database storage (YYYY-MM-DD)
 * 
 * MANDATORY function for all database date operations.
 * Ensures consistent YYYY-MM-DD format for database storage.
 * Enhanced version of existing formatDateForAPI with IST validation.
 * 
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string in YYYY-MM-DD format
 * 
 * @example
 * ```typescript
 * // ❌ Wrong - causes timezone issues
 * const dbDate = new Date().toISOString().split('T')[0]
 * 
 * // ✅ Correct - IST-aware database formatting
 * const dbDate = formatDateForDatabase(getCurrentISTDate())  // "2025-08-23"
 * 
 * // Usage in server actions
 * const order = await supabase
 *   .from('daily_orders')
 *   .insert({
 *     order_date: formatDateForDatabase(getCurrentISTDate()),
 *     delivery_date: formatDateForDatabase(addDaysIST(getCurrentISTDate(), 1))
 *   })
 * ```
 * 
 * @throws {Error} If date is invalid
 * @see {@link formatTimestampForDatabase} For timestamp storage
 * @see {@link parseLocalDateIST} For parsing database dates
 */
export function formatDateForDatabase(date: Date): string {
  if (!isValidISTDate(date)) {
    throw new Error('Invalid date provided for database formatting')
  }
  
  // Use the existing logic but with validation
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format timestamp for database storage (ISO string)
 */
export function formatTimestampForDatabase(date: Date): string {
  if (!isValidISTDate(date)) {
    throw new Error('Invalid date provided for database timestamp formatting')
  }
  return date.toISOString()
}

/**
 * Parse date string as local IST date (YYYY-MM-DD)
 * 
 * MANDATORY function for parsing database date strings and user input.
 * Ensures proper validation and IST context maintenance.
 * Enhanced version of existing parseLocalDate with IST context.
 * 
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Parsed date in IST context
 * 
 * @example
 * ```typescript
 * // ❌ Wrong - loses timezone context
 * const userDate = new Date(formData.date)
 * 
 * // ✅ Correct - maintains IST context  
 * const userDate = parseLocalDateIST('2025-08-23')
 * 
 * // Usage in server actions
 * const orderDate = parseLocalDateIST(searchParams.date || formatDateForDatabase(getCurrentISTDate()))
 * 
 * // Usage with form data
 * const startDate = parseLocalDateIST(formData.start_date)
 * const subscription = {
 *   start_date: formatDateForDatabase(startDate)
 * }
 * ```
 * 
 * @throws {Error} If date string is invalid or not in YYYY-MM-DD format
 * @see {@link formatDateForDatabase} For creating compatible date strings
 * @see {@link isValidISTDateString} For validation before parsing
 */
export function parseLocalDateIST(dateString: string): Date {
  if (typeof dateString !== 'string' || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error(`Invalid date string format for IST: ${dateString}`)
  }
  
  const [year, month, day] = dateString.split('-').map(Number)
  
  // Validate the input values before creating the date
  if (month < 1 || month > 12) {
    throw new Error(`Invalid date string for IST: ${dateString}`)
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid date string for IST: ${dateString}`)
  }
  
  const parsed = new Date(year, month - 1, day)
  
  // Check if the date was auto-corrected by JavaScript
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
    throw new Error(`Invalid date string for IST: ${dateString}`)
  }
  
  if (!isValidISTDate(parsed)) {
    throw new Error(`Invalid date string for IST: ${dateString}`)
  }
  
  return parsed
}

/**
 * Parse ISO date string with IST context
 */
export function parseISODateIST(isoString: string): Date {
  try {
    const parsed = parseISO(isoString)
    if (!isValidISTDate(parsed)) {
      throw new Error(`Invalid ISO date string for IST: ${isoString}`)
    }
    return parsed
  } catch {
    throw new Error(`Failed to parse ISO date string: ${isoString}`)
  }
}

// =============================================================================
// BUSINESS LOGIC UTILITIES
// =============================================================================

/**
 * Add days to date with IST context
 */
export function addDaysIST(date: Date, days: number): Date {
  return addDays(date, days)
}

/**
 * Get start of day in IST (00:00:00)
 */
export function getStartOfDayIST(date: Date): Date {
  return startOfDay(convertUTCToIST(date))
}

/**
 * Get end of day in IST (23:59:59)
 */
export function getEndOfDayIST(date: Date): Date {
  return endOfDay(convertUTCToIST(date))
}

/**
 * Get IST business hours configuration
 */
export function getISTBusinessHours(): typeof IST_CONFIG.businessHours {
  return IST_CONFIG.businessHours
}

/**
 * Check if two dates are the same day in IST
 */
export function isSameDayIST(date1: Date, date2: Date): boolean {
  const ist1 = convertUTCToIST(date1)
  const ist2 = convertUTCToIST(date2)
  return formatDateForDatabase(ist1) === formatDateForDatabase(ist2)
}

/**
 * Compare dates in IST context (-1, 0, 1)
 */
export function compareDatesIST(date1: Date, date2: Date): number {
  const ist1 = convertUTCToIST(date1)
  const ist2 = convertUTCToIST(date2)
  
  if (ist1 < ist2) return -1
  if (ist1 > ist2) return 1
  return 0
}

/**
 * Check if date is within range in IST context
 */
export function isWithinRangeIST(date: Date, start: Date, end: Date): boolean {
  const istDate = convertUTCToIST(date)
  const istStart = convertUTCToIST(start)
  const istEnd = convertUTCToIST(end)
  
  return istDate >= istStart && istDate <= istEnd
}

/**
 * Get difference in days between dates in IST
 */
export function getDaysDifferenceIST(date1: Date, date2: Date): number {
  const ist1 = convertUTCToIST(date1)
  const ist2 = convertUTCToIST(date2)
  
  return differenceInDays(ist2, ist1)
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate if a value is a valid Date object
 */
export function isValidISTDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Check if date falls within IST business hours
 */
export function isISTBusinessHour(date: Date): boolean {
  const istTime = date.toLocaleTimeString('en-US', { 
    timeZone: IST_TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
  
  const businessHours = getISTBusinessHours()
  
  // Check morning hours (06:00-12:00)
  if (istTime >= businessHours.morning.start && istTime < businessHours.morning.end) {
    return true
  }
  
  // Check evening hours (17:00-21:00)
  if (istTime >= businessHours.evening.start && istTime < businessHours.evening.end) {
    return true
  }
  
  return false
}

/**
 * Check if date falls on IST working day (all 7 days for dairy business)
 */
export function isISTWorkingDay(date: Date): boolean {
  const istDate = convertUTCToIST(date)
  const dayOfWeek = istDate.getDay() // 0=Sunday, 1=Monday, etc.
  return IST_CONFIG.workingDays.includes(dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6)
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
export function isValidISTDateString(dateString: string): boolean {
  if (typeof dateString !== 'string') return false
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/
  if (!pattern.test(dateString)) return false
  
  try {
    const [year, month, day] = dateString.split('-').map(Number)
    
    // Basic range validation
    if (month < 1 || month > 12) return false
    if (day < 1 || day > 31) return false
    
    // Create date and check if it was auto-corrected
    const parsed = new Date(year, month - 1, day)
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      return false
    }
    
    return isValidISTDate(parsed)
  } catch {
    return false
  }
}

// =============================================================================
// BUSINESS HELPER FUNCTIONS
// =============================================================================

/**
 * Get next IST business day from given date
 * Since all 7 days are working days for dairy business, returns next day
 */
export function getNextISTBusinessDay(date: Date): Date {
  // All days are working days for dairy operations
  return addDaysIST(date, 1)
}

/**
 * Get the current financial year based on IST date
 * Financial year runs April 1 to March 31
 */
export function getCurrentFinancialYearIST(): string {
  const now = getCurrentISTDate()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  
  if (currentMonth >= 4) {
    // April onwards = current year to next year
    return `${currentYear}${currentYear + 1}`
  } else {
    // Jan-Mar = previous year to current year
    return `${currentYear - 1}${currentYear}`
  }
}

/**
 * Create date range for IST operations
 */
export function createISTDateRange(start: Date, end: Date): {
  start: Date
  end: Date
  timezone: typeof IST_TIMEZONE
  days: number
} {
  const istStart = convertUTCToIST(start)
  const istEnd = convertUTCToIST(end)
  
  return {
    start: istStart,
    end: istEnd,
    timezone: IST_TIMEZONE,
    days: getDaysDifferenceIST(istStart, istEnd)
  }
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ISTDateString = string // YYYY-MM-DD format
export type ISTTimestamp = string  // ISO string with timezone
export type ISTBusinessHour = 'morning' | 'evening'

export interface ISTDateRange {
  start: Date
  end: Date
  timezone: typeof IST_TIMEZONE
}

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

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * Legacy alias for formatDateForDatabase (maintains backward compatibility)
 * @deprecated Use formatDateForDatabase instead
 */
export function formatDateForAPI(date: Date): string {
  return formatDateForDatabase(date)
}

/**
 * Legacy alias for parseLocalDateIST (maintains backward compatibility)
 * @deprecated Use parseLocalDateIST instead
 */
export function parseLocalDate(dateString: string): Date {
  return parseLocalDateIST(dateString)
}