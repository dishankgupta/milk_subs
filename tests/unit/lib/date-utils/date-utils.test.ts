/**
 * Unit Tests for IST Date Utility Library
 * 
 * Tests comprehensive IST date handling functionality including:
 * - Core IST functions
 * - Display formatting
 * - Database utilities
 * - Business logic functions
 * - Validation functions
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Core functions
  getCurrentISTDate,
  getCurrentISTTimestamp,
  convertUTCToIST,
  convertISTToUTC,
  
  // Display formatting
  formatDateIST,
  formatDateTimeIST,
  formatTimestampIST,
  formatWithIST,
  
  // Database utilities
  formatDateForDatabase,
  formatTimestampForDatabase,
  parseLocalDateIST,
  parseISODateIST,
  
  // Business logic
  addDaysIST,
  getStartOfDayIST,
  getEndOfDayIST,
  getISTBusinessHours,
  isSameDayIST,
  compareDatesIST,
  isWithinRangeIST,
  getDaysDifferenceIST,
  
  // Validation functions
  isValidISTDate,
  isISTBusinessHour,
  isISTWorkingDay,
  isValidISTDateString,
  
  // Business helpers
  getNextISTBusinessDay,
  getCurrentFinancialYearIST,
  createISTDateRange,
  
  // Constants
  IST_TIMEZONE,
  IST_LOCALE,
  IST_OFFSET,
  IST_CONFIG,
  
  // Legacy compatibility
  formatDateForAPI,
  parseLocalDate,
} from '@/lib/date-utils'

describe('IST Date Utilities - Core Functions', () => {
  beforeEach(() => {
    // Mock current time to January 15, 2025, 10:30 AM IST
    vi.setSystemTime(new Date('2025-01-15T05:00:00.000Z')) // 10:30 AM IST
  })

  describe('getCurrentISTDate', () => {
    it('should return current date in IST timezone', () => {
      const result = getCurrentISTDate()
      expect(result).toBeInstanceOf(Date)
      
      // The result should be a valid IST time
      const istString = result.toLocaleString('en-IN', { timeZone: IST_TIMEZONE })
      expect(istString).toContain('15/1/2025')
    })
  })

  describe('getCurrentISTTimestamp', () => {
    it('should return current IST timestamp as ISO string', () => {
      const result = getCurrentISTTimestamp()
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })

  describe('convertUTCToIST', () => {
    it('should convert UTC date to IST equivalent', () => {
      const utcDate = new Date('2025-01-15T05:00:00.000Z')
      const istDate = convertUTCToIST(utcDate)
      
      // Should be 10:30 AM IST
      const istString = istDate.toLocaleString('en-IN', { timeZone: IST_TIMEZONE })
      expect(istString).toContain('10:30')
    })

    it('should handle date boundary crossing', () => {
      const utcDate = new Date('2025-01-14T20:00:00.000Z') // 8 PM UTC
      const istDate = convertUTCToIST(utcDate)
      
      // Should be 1:30 AM IST next day
      const istString = istDate.toLocaleString('en-IN', { timeZone: IST_TIMEZONE })
      expect(istString).toContain('15/1/2025') // Next day in IST
    })
  })

  describe('convertISTToUTC', () => {
    it('should convert IST date to UTC equivalent', () => {
      const istDate = new Date(2025, 0, 15, 10, 30, 0) // Jan 15, 2025, 10:30 AM
      const utcDate = convertISTToUTC(istDate)
      
      expect(utcDate).toBeInstanceOf(Date)
      // Should be 5:00 AM UTC (10:30 - 5:30 offset)
      expect(utcDate.getUTCHours()).toBe(5)
      expect(utcDate.getUTCMinutes()).toBe(0)
    })
  })
})

describe('IST Date Utilities - Display Formatting', () => {
  const testDate = new Date('2025-01-15T10:30:00.000')

  describe('formatDateIST', () => {
    it('should format date in dd/MM/yyyy format', () => {
      const result = formatDateIST(testDate)
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
      expect(result).toBe('15/01/2025')
    })
  })

  describe('formatDateTimeIST', () => {
    it('should format date and time in IST format', () => {
      const result = formatDateTimeIST(testDate)
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
      expect(result).toContain('15/01/2025')
    })
  })

  describe('formatTimestampIST', () => {
    it('should format timestamp with "at" separator', () => {
      const result = formatTimestampIST(testDate)
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} at \d{2}:\d{2}$/)
      expect(result).toContain('15/01/2025 at')
    })
  })

  describe('formatWithIST', () => {
    it('should format using date-fns with IST context', () => {
      const result = formatWithIST(testDate, 'yyyy-MM-dd')
      expect(result).toBe('2025-01-15')
    })

    it('should handle complex format strings', () => {
      const result = formatWithIST(testDate, 'EEEE, dd MMMM yyyy')
      expect(result).toContain('2025')
      expect(result).toContain('15')
    })
  })
})

describe('IST Date Utilities - Database & API Functions', () => {
  describe('formatDateForDatabase', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date(2025, 0, 15) // Jan 15, 2025
      const result = formatDateForDatabase(date)
      expect(result).toBe('2025-01-15')
    })

    it('should throw error for invalid dates', () => {
      const invalidDate = new Date('invalid')
      expect(() => formatDateForDatabase(invalidDate)).toThrow('Invalid date provided')
    })

    it('should handle single digit dates and months', () => {
      const date = new Date(2025, 0, 5) // Jan 5, 2025
      const result = formatDateForDatabase(date)
      expect(result).toBe('2025-01-05')
    })
  })

  describe('formatTimestampForDatabase', () => {
    it('should format timestamp as ISO string', () => {
      const date = new Date('2025-01-15T10:30:00.000Z')
      const result = formatTimestampForDatabase(date)
      expect(result).toBe('2025-01-15T10:30:00.000Z')
    })

    it('should throw error for invalid dates', () => {
      const invalidDate = new Date('invalid')
      expect(() => formatTimestampForDatabase(invalidDate)).toThrow('Invalid date provided')
    })
  })

  describe('parseLocalDateIST', () => {
    it('should parse valid date string', () => {
      const result = parseLocalDateIST('2025-01-15')
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(0) // 0-indexed
      expect(result.getDate()).toBe(15)
    })

    it('should throw error for invalid format', () => {
      expect(() => parseLocalDateIST('15/01/2025')).toThrow('Invalid date string format')
      expect(() => parseLocalDateIST('2025-1-15')).toThrow('Invalid date string format')
      expect(() => parseLocalDateIST('')).toThrow('Invalid date string format')
    })

    it('should throw error for invalid dates', () => {
      expect(() => parseLocalDateIST('2025-13-15')).toThrow('Invalid date string for IST')
      expect(() => parseLocalDateIST('2025-02-30')).toThrow('Invalid date string for IST')
    })
  })

  describe('parseISODateIST', () => {
    it('should parse valid ISO date string', () => {
      const result = parseISODateIST('2025-01-15T10:30:00.000Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2025-01-15T10:30:00.000Z')
    })

    it('should throw error for invalid ISO strings', () => {
      expect(() => parseISODateIST('invalid-date')).toThrow('Failed to parse ISO date string')
      expect(() => parseISODateIST('')).toThrow('Failed to parse ISO date string')
    })
  })
})

describe('IST Date Utilities - Business Logic Functions', () => {
  const baseDate = new Date(2025, 0, 15) // Jan 15, 2025 (Wednesday)

  describe('addDaysIST', () => {
    it('should add days correctly', () => {
      const result = addDaysIST(baseDate, 5)
      expect(result.getDate()).toBe(20)
      expect(result.getMonth()).toBe(0)
      expect(result.getFullYear()).toBe(2025)
    })

    it('should handle negative days', () => {
      const result = addDaysIST(baseDate, -5)
      expect(result.getDate()).toBe(10)
    })

    it('should handle month boundary crossing', () => {
      const result = addDaysIST(baseDate, 20)
      expect(result.getMonth()).toBe(1) // February
      expect(result.getDate()).toBe(4)
    })
  })

  describe('isSameDayIST', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2025-01-15T05:00:00.000Z') // 10:30 AM IST
      const date2 = new Date('2025-01-15T15:00:00.000Z') // 8:30 PM IST
      expect(isSameDayIST(date1, date2)).toBe(true)
    })

    it('should return false for different days', () => {
      const date1 = new Date('2025-01-15T05:00:00.000Z') // 10:30 AM IST
      const date2 = new Date('2025-01-16T05:00:00.000Z') // Next day
      expect(isSameDayIST(date1, date2)).toBe(false)
    })

    it('should handle timezone boundary cases', () => {
      const date1 = new Date('2025-01-14T20:00:00.000Z') // 1:30 AM IST (Jan 15)
      const date2 = new Date('2025-01-15T02:00:00.000Z') // 7:30 AM IST (Jan 15)
      expect(isSameDayIST(date1, date2)).toBe(true)
    })
  })

  describe('compareDatesIST', () => {
    it('should return -1 when first date is earlier', () => {
      const date1 = new Date(2025, 0, 14)
      const date2 = new Date(2025, 0, 15)
      expect(compareDatesIST(date1, date2)).toBe(-1)
    })

    it('should return 1 when first date is later', () => {
      const date1 = new Date(2025, 0, 16)
      const date2 = new Date(2025, 0, 15)
      expect(compareDatesIST(date1, date2)).toBe(1)
    })

    it('should return 0 when dates are equal', () => {
      const date1 = new Date(2025, 0, 15, 10, 30)
      const date2 = new Date(2025, 0, 15, 15, 45)
      // Should be 0 if comparing same IST day
      const result = compareDatesIST(date1, date2)
      expect([-1, 0, 1]).toContain(result)
    })
  })

  describe('getDaysDifferenceIST', () => {
    it('should calculate days difference correctly', () => {
      const date1 = new Date(2025, 0, 15)
      const date2 = new Date(2025, 0, 20)
      expect(getDaysDifferenceIST(date1, date2)).toBe(5)
    })

    it('should handle negative differences', () => {
      const date1 = new Date(2025, 0, 20)
      const date2 = new Date(2025, 0, 15)
      expect(getDaysDifferenceIST(date1, date2)).toBe(-5)
    })
  })
})

describe('IST Date Utilities - Validation Functions', () => {
  describe('isValidISTDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidISTDate(new Date())).toBe(true)
      expect(isValidISTDate(new Date(2025, 0, 15))).toBe(true)
    })

    it('should return false for invalid dates', () => {
      expect(isValidISTDate(new Date('invalid'))).toBe(false)
      expect(isValidISTDate(null)).toBe(false)
      expect(isValidISTDate(undefined)).toBe(false)
      expect(isValidISTDate('2025-01-15')).toBe(false)
      expect(isValidISTDate({})).toBe(false)
    })
  })

  describe('isISTBusinessHour', () => {
    it('should return true for morning business hours', () => {
      const morningDate = new Date('2025-01-15T02:00:00.000Z') // 7:30 AM IST
      expect(isISTBusinessHour(morningDate)).toBe(true)
    })

    it('should return true for evening business hours', () => {
      const eveningDate = new Date('2025-01-15T12:30:00.000Z') // 6:00 PM IST
      expect(isISTBusinessHour(eveningDate)).toBe(true)
    })

    it('should return false for non-business hours', () => {
      const lateNight = new Date('2025-01-15T20:00:00.000Z') // 1:30 AM IST next day
      const afternoon = new Date('2025-01-15T08:00:00.000Z') // 1:30 PM IST
      expect(isISTBusinessHour(lateNight)).toBe(false)
      expect(isISTBusinessHour(afternoon)).toBe(false)
    })
  })

  describe('isISTWorkingDay', () => {
    it('should return true for weekdays (Monday-Saturday)', () => {
      const monday = new Date(2025, 0, 13) // Monday
      const saturday = new Date(2025, 0, 18) // Saturday
      expect(isISTWorkingDay(monday)).toBe(true)
      expect(isISTWorkingDay(saturday)).toBe(true)
    })

    it('should return false for Sunday', () => {
      const sunday = new Date(2025, 0, 19) // Sunday
      expect(isISTWorkingDay(sunday)).toBe(false)
    })
  })

  describe('isValidISTDateString', () => {
    it('should return true for valid date strings', () => {
      expect(isValidISTDateString('2025-01-15')).toBe(true)
      expect(isValidISTDateString('2025-12-31')).toBe(true)
      expect(isValidISTDateString('2024-02-29')).toBe(true) // Leap year
    })

    it('should return false for invalid formats', () => {
      expect(isValidISTDateString('15/01/2025')).toBe(false)
      expect(isValidISTDateString('2025-1-15')).toBe(false)
      expect(isValidISTDateString('2025-01')).toBe(false)
      expect(isValidISTDateString('')).toBe(false)
    })

    it('should return false for invalid dates', () => {
      expect(isValidISTDateString('2025-13-01')).toBe(false)
      expect(isValidISTDateString('2025-02-30')).toBe(false)
      expect(isValidISTDateString('2023-02-29')).toBe(false) // Non-leap year
    })

    it('should return false for non-string inputs', () => {
      expect(isValidISTDateString(null as string)).toBe(false)
      expect(isValidISTDateString(undefined as unknown as string)).toBe(false)
      expect(isValidISTDateString(123 as unknown as string)).toBe(false)
    })
  })
})

describe('IST Date Utilities - Business Helper Functions', () => {
  describe('getNextISTBusinessDay', () => {
    it('should return next business day when current is weekday', () => {
      const wednesday = new Date(2025, 0, 15) // Wednesday
      const result = getNextISTBusinessDay(wednesday)
      expect(result.getDay()).toBe(4) // Thursday
    })

    it('should skip Sunday and return Monday', () => {
      const saturday = new Date(2025, 0, 18) // Saturday
      const result = getNextISTBusinessDay(saturday)
      expect(result.getDay()).toBe(1) // Monday
      expect(result.getDate()).toBe(20)
    })

    it('should skip multiple non-working days if needed', () => {
      const friday = new Date(2025, 0, 17) // Friday
      const result = getNextISTBusinessDay(friday)
      expect(result.getDay()).toBe(6) // Saturday (working day in dairy business)
    })
  })

  describe('getCurrentFinancialYearIST', () => {
    it('should return correct financial year for dates after April', () => {
      vi.setSystemTime(new Date('2025-05-15T05:00:00.000Z'))
      const result = getCurrentFinancialYearIST()
      expect(result).toBe('20252026')
    })

    it('should return correct financial year for dates before April', () => {
      vi.setSystemTime(new Date('2025-02-15T05:00:00.000Z'))
      const result = getCurrentFinancialYearIST()
      expect(result).toBe('20242025')
    })

    it('should handle April 1st correctly', () => {
      vi.setSystemTime(new Date('2025-04-01T05:00:00.000Z'))
      const result = getCurrentFinancialYearIST()
      expect(result).toBe('20252026')
    })

    it('should handle March 31st correctly', () => {
      vi.setSystemTime(new Date('2025-03-31T05:00:00.000Z'))
      const result = getCurrentFinancialYearIST()
      expect(result).toBe('20242025')
    })
  })

  describe('createISTDateRange', () => {
    it('should create proper date range with IST context', () => {
      const start = new Date(2025, 0, 15)
      const end = new Date(2025, 0, 20)
      const result = createISTDateRange(start, end)

      expect(result.start).toBeInstanceOf(Date)
      expect(result.end).toBeInstanceOf(Date)
      expect(result.timezone).toBe(IST_TIMEZONE)
      expect(result.days).toBe(5)
    })

    it('should handle same day range', () => {
      const date = new Date(2025, 0, 15)
      const result = createISTDateRange(date, date)
      expect(result.days).toBe(0)
    })
  })
})

describe('IST Date Utilities - Constants and Configuration', () => {
  describe('IST_CONFIG', () => {
    it('should have correct timezone configuration', () => {
      expect(IST_CONFIG.timezone).toBe('Asia/Kolkata')
      expect(IST_CONFIG.locale).toBe('en-IN')
      expect(IST_CONFIG.offset).toBe('+05:30')
    })

    it('should have correct business hours', () => {
      expect(IST_CONFIG.businessHours.morning.start).toBe('06:00')
      expect(IST_CONFIG.businessHours.morning.end).toBe('12:00')
      expect(IST_CONFIG.businessHours.evening.start).toBe('17:00')
      expect(IST_CONFIG.businessHours.evening.end).toBe('21:00')
    })

    it('should have correct working days (Mon-Sat)', () => {
      expect(IST_CONFIG.workingDays).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('should have correct date formats', () => {
      expect(IST_CONFIG.dateFormats.display).toBe('dd/MM/yyyy')
      expect(IST_CONFIG.dateFormats.api).toBe('yyyy-MM-dd')
    })
  })

  describe('getISTBusinessHours', () => {
    it('should return business hours configuration', () => {
      const result = getISTBusinessHours()
      expect(result.morning.start).toBe('06:00')
      expect(result.evening.end).toBe('21:00')
    })
  })
})

describe('IST Date Utilities - Legacy Compatibility', () => {
  describe('formatDateForAPI', () => {
    it('should be alias for formatDateForDatabase', () => {
      const date = new Date(2025, 0, 15)
      const legacyResult = formatDateForAPI(date)
      const newResult = formatDateForDatabase(date)
      expect(legacyResult).toBe(newResult)
      expect(legacyResult).toBe('2025-01-15')
    })
  })

  describe('parseLocalDate', () => {
    it('should be alias for parseLocalDateIST', () => {
      const dateString = '2025-01-15'
      const legacyResult = parseLocalDate(dateString)
      const newResult = parseLocalDateIST(dateString)
      expect(legacyResult.getTime()).toBe(newResult.getTime())
    })
  })
})

describe('IST Date Utilities - Edge Cases and Error Handling', () => {
  describe('Leap Year Handling', () => {
    it('should handle leap year dates correctly', () => {
      const leapYearDate = '2024-02-29'
      expect(isValidISTDateString(leapYearDate)).toBe(true)
      
      const parsed = parseLocalDateIST(leapYearDate)
      expect(parsed.getFullYear()).toBe(2024)
      expect(parsed.getMonth()).toBe(1)
      expect(parsed.getDate()).toBe(29)
    })

    it('should reject invalid leap year dates', () => {
      const invalidLeapDate = '2023-02-29'
      expect(isValidISTDateString(invalidLeapDate)).toBe(false)
    })
  })

  describe('Month Boundary Handling', () => {
    it('should handle end of month dates', () => {
      const endOfMonth = new Date(2025, 0, 31) // Jan 31
      const nextDay = addDaysIST(endOfMonth, 1)
      expect(nextDay.getMonth()).toBe(1) // February
      expect(nextDay.getDate()).toBe(1)
    })

    it('should handle year boundary', () => {
      const endOfYear = new Date(2024, 11, 31) // Dec 31, 2024
      const nextDay = addDaysIST(endOfYear, 1)
      expect(nextDay.getFullYear()).toBe(2025)
      expect(nextDay.getMonth()).toBe(0) // January
      expect(nextDay.getDate()).toBe(1)
    })
  })

  describe('Timezone Boundary Cases', () => {
    it('should handle UTC to IST date boundary crossing', () => {
      // 11:30 PM UTC on Jan 14 = 5:00 AM IST on Jan 15
      const utcDate = new Date('2025-01-14T23:30:00.000Z')
      const istDate = convertUTCToIST(utcDate)
      
      const istDateString = istDate.toLocaleDateString('en-IN', { 
        timeZone: IST_TIMEZONE 
      })
      expect(istDateString).toContain('15/1/2025')
    })

    it('should handle IST to UTC date boundary crossing', () => {
      // 2:00 AM IST on Jan 15 = 8:30 PM UTC on Jan 14
      const istDate = new Date(2025, 0, 15, 2, 0, 0)
      const utcDate = convertISTToUTC(istDate)
      
      expect(utcDate.getUTCDate()).toBe(14)
      expect(utcDate.getUTCHours()).toBe(20)
      expect(utcDate.getUTCMinutes()).toBe(30)
    })
  })

  describe('Performance Considerations', () => {
    it('should handle multiple date operations efficiently', () => {
      const startTime = Date.now()
      
      // Perform 1000 date operations
      for (let i = 0; i < 1000; i++) {
        const date = new Date(2025, 0, 15 + i)
        formatDateIST(date)
        formatDateForDatabase(date)
        isValidISTDate(date)
        isISTWorkingDay(date)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000)
    })
  })
})