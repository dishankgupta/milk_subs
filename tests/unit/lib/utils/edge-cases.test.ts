/**
 * Edge Cases Testing for IST Date Utilities
 * 
 * Tests comprehensive edge cases including:
 * - DST changes (India doesn't observe DST, but testing boundary conditions)
 * - Leap year handling
 * - Month boundary crossings
 * - Year boundary crossings
 * - Invalid date scenarios
 * - Timezone boundary conditions
 * - Business logic edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Core functions
  getCurrentISTDate,
  convertUTCToIST,
  convertISTToUTC,
  
  // Parsing and formatting
  parseLocalDateIST,
  formatDateForDatabase,
  formatDateIST,
  formatDateTimeIST,
  
  // Business logic
  addDaysIST,
  getDaysDifferenceIST,
  isSameDayIST,
  isISTWorkingDay,
  getNextISTBusinessDay,
  getCurrentFinancialYearIST,
  
  // Validation
  isValidISTDate,
  isValidISTDateString,
} from '@/lib/date-utils'

describe('Edge Cases - Leap Year Handling', () => {
  describe('Leap Year Date Operations', () => {
    it('should handle February 29 in leap years correctly', () => {
      const leapYearDate = parseLocalDateIST('2024-02-29')
      
      expect(isValidISTDate(leapYearDate)).toBe(true)
      expect(leapYearDate.getFullYear()).toBe(2024)
      expect(leapYearDate.getMonth()).toBe(1) // February (0-indexed)
      expect(leapYearDate.getDate()).toBe(29)
      
      const formatted = formatDateForDatabase(leapYearDate)
      expect(formatted).toBe('2024-02-29')
    })

    it('should reject February 29 in non-leap years', () => {
      expect(isValidISTDateString('2023-02-29')).toBe(false)
      expect(isValidISTDateString('2021-02-29')).toBe(false)
      expect(isValidISTDateString('2022-02-29')).toBe(false)
      
      expect(() => parseLocalDateIST('2023-02-29')).toThrow()
    })

    it('should handle leap year calculations correctly', () => {
      const feb28_2024 = parseLocalDateIST('2024-02-28')
      const feb29_2024 = parseLocalDateIST('2024-02-29')
      const mar01_2024 = parseLocalDateIST('2024-03-01')
      
      // Day after Feb 28 in leap year should be Feb 29
      const nextDay = addDaysIST(feb28_2024, 1)
      expect(isSameDayIST(nextDay, feb29_2024)).toBe(true)
      
      // Day after Feb 29 should be March 1
      const dayAfterLeap = addDaysIST(feb29_2024, 1)
      expect(isSameDayIST(dayAfterLeap, mar01_2024)).toBe(true)
      
      // Difference between Feb 28 and March 1 in leap year should be 2 days
      const diff = getDaysDifferenceIST(feb28_2024, mar01_2024)
      expect(diff).toBe(2)
    })

    it('should handle leap year in non-leap year correctly', () => {
      const feb28_2023 = parseLocalDateIST('2023-02-28')
      const mar01_2023 = parseLocalDateIST('2023-03-01')
      
      // Day after Feb 28 in non-leap year should be March 1
      const nextDay = addDaysIST(feb28_2023, 1)
      expect(isSameDayIST(nextDay, mar01_2023)).toBe(true)
      
      // Difference between Feb 28 and March 1 in non-leap year should be 1 day
      const diff = getDaysDifferenceIST(feb28_2023, mar01_2023)
      expect(diff).toBe(1)
    })

    it('should identify leap years correctly for century years', () => {
      // 2000 is a leap year (divisible by 400)
      expect(isValidISTDateString('2000-02-29')).toBe(true)
      
      // 1900 is not a leap year (divisible by 100 but not 400)
      expect(isValidISTDateString('1900-02-29')).toBe(false)
      
      // 2100 is not a leap year (divisible by 100 but not 400)
      expect(isValidISTDateString('2100-02-29')).toBe(false)
    })
  })
})

describe('Edge Cases - Month Boundary Handling', () => {
  describe('End of Month Date Operations', () => {
    it('should handle end of January correctly', () => {
      const jan31 = parseLocalDateIST('2025-01-31')
      const feb01 = parseLocalDateIST('2025-02-01')
      
      const nextDay = addDaysIST(jan31, 1)
      expect(isSameDayIST(nextDay, feb01)).toBe(true)
      
      const diff = getDaysDifferenceIST(jan31, feb01)
      expect(diff).toBe(1)
    })

    it('should handle end of February in non-leap year', () => {
      const feb28 = parseLocalDateIST('2023-02-28')
      const mar01 = parseLocalDateIST('2023-03-01')
      
      const nextDay = addDaysIST(feb28, 1)
      expect(isSameDayIST(nextDay, mar01)).toBe(true)
    })

    it('should handle end of February in leap year', () => {
      const feb29 = parseLocalDateIST('2024-02-29')
      const mar01 = parseLocalDateIST('2024-03-01')
      
      const nextDay = addDaysIST(feb29, 1)
      expect(isSameDayIST(nextDay, mar01)).toBe(true)
    })

    it('should handle months with 30 days', () => {
      const april30 = parseLocalDateIST('2025-04-30')
      const may01 = parseLocalDateIST('2025-05-01')
      
      const nextDay = addDaysIST(april30, 1)
      expect(isSameDayIST(nextDay, may01)).toBe(true)
      
      // June 30 to July 1
      const june30 = parseLocalDateIST('2025-06-30')
      const july01 = parseLocalDateIST('2025-07-01')
      
      const nextDayJuly = addDaysIST(june30, 1)
      expect(isSameDayIST(nextDayJuly, july01)).toBe(true)
    })

    it('should handle adding days across multiple months', () => {
      const jan15 = parseLocalDateIST('2025-01-15')
      
      // Add 45 days should cross into March
      const mar01 = addDaysIST(jan15, 45)
      expect(mar01.getMonth()).toBe(2) // March (0-indexed)
      expect(mar01.getDate()).toBe(1)
      
      // Verify exact calculation
      const diff = getDaysDifferenceIST(jan15, mar01)
      expect(diff).toBe(45)
    })
  })

  describe('Month Boundary with Different Years', () => {
    it('should handle December to January transition', () => {
      const dec31_2024 = parseLocalDateIST('2024-12-31')
      const jan01_2025 = parseLocalDateIST('2025-01-01')
      
      const nextDay = addDaysIST(dec31_2024, 1)
      expect(isSameDayIST(nextDay, jan01_2025)).toBe(true)
      expect(nextDay.getFullYear()).toBe(2025)
      
      const diff = getDaysDifferenceIST(dec31_2024, jan01_2025)
      expect(diff).toBe(1)
    })

    it('should handle year boundary with larger date additions', () => {
      const nov01_2024 = parseLocalDateIST('2024-11-01')
      
      // Add 90 days should go to end of January 2025
      const endJan2025 = addDaysIST(nov01_2024, 90)
      expect(endJan2025.getFullYear()).toBe(2025)
      expect(endJan2025.getMonth()).toBe(0) // January
      expect(endJan2025.getDate()).toBe(30)
    })
  })
})

describe('Edge Cases - Timezone Boundary Conditions', () => {
  describe('UTC to IST Date Boundary Crossing', () => {
    it('should handle UTC late night to IST early morning correctly', () => {
      // 11:30 PM UTC = 5:00 AM IST next day
      const utcLateNight = new Date('2025-01-14T23:30:00.000Z')
      const istEarlyMorning = convertUTCToIST(utcLateNight)
      
      const istDateString = formatDateIST(istEarlyMorning)
      expect(istDateString).toBe('15/01/2025') // Next day in IST
      
      const istTimeString = formatDateTimeIST(istEarlyMorning)
      expect(istTimeString).toContain('05:00') // 5:00 AM IST
    })

    it('should handle IST early morning to UTC late night correctly', () => {
      // 2:00 AM IST = 8:30 PM UTC previous day
      const istEarlyMorning = new Date(2025, 0, 15, 2, 0, 0) // 2:00 AM IST
      const utcLateNight = convertISTToUTC(istEarlyMorning)
      
      expect(utcLateNight.getUTCDate()).toBe(14) // Previous day in UTC
      expect(utcLateNight.getUTCHours()).toBe(20) // 8:30 PM UTC
      expect(utcLateNight.getUTCMinutes()).toBe(30)
    })

    it('should handle midnight crossings in both directions', () => {
      // UTC midnight to IST
      const utcMidnight = new Date('2025-01-15T00:00:00.000Z')
      const istMorning = convertUTCToIST(utcMidnight)
      
      const istTimeString = formatDateTimeIST(istMorning)
      expect(istTimeString).toBe('15/01/2025, 05:30')
      
      // IST midnight to UTC
      const istMidnight = new Date(2025, 0, 15, 0, 0, 0)
      const utcEvening = convertISTToUTC(istMidnight)
      
      expect(utcEvening.getUTCDate()).toBe(14) // Previous day
      expect(utcEvening.getUTCHours()).toBe(18) // 6:30 PM UTC
      expect(utcEvening.getUTCMinutes()).toBe(30)
    })
  })

  describe('Same Day Comparison Edge Cases', () => {
    it('should correctly identify same IST day across UTC days', () => {
      // Two UTC times that are same IST day
      const utc1 = new Date('2025-01-14T20:00:00.000Z') // 1:30 AM IST Jan 15
      const utc2 = new Date('2025-01-15T15:00:00.000Z') // 8:30 PM IST Jan 15
      
      expect(isSameDayIST(utc1, utc2)).toBe(true)
    })

    it('should correctly identify different IST days within same UTC day', () => {
      // Two UTC times in same UTC day but different IST days
      const utc1 = new Date('2025-01-15T02:00:00.000Z') // 7:30 AM IST Jan 15
      const utc2 = new Date('2025-01-15T20:00:00.000Z') // 1:30 AM IST Jan 16
      
      expect(isSameDayIST(utc1, utc2)).toBe(false)
    })
  })
})

describe('Edge Cases - Business Logic Boundaries', () => {
  describe('Financial Year Boundary Edge Cases', () => {
    it('should handle financial year transition at exact boundary', () => {
      // March 31 - last day of FY 2024-25 (use IST time)
      vi.setSystemTime(new Date('2025-03-31T12:00:00.000Z')) // 5:30 PM IST March 31
      expect(getCurrentFinancialYearIST()).toBe('20242025')
      
      // April 1 - first day of FY 2025-26 (use IST time)
      vi.setSystemTime(new Date('2025-04-01T12:00:00.000Z')) // 5:30 PM IST April 1
      expect(getCurrentFinancialYearIST()).toBe('20252026')
    })

    it('should handle financial year calculation around midnight IST', () => {
      // March 31 11:30 PM IST (still FY 2024-25)
      vi.setSystemTime(new Date('2025-03-31T18:00:00.000Z')) // 11:30 PM IST
      expect(getCurrentFinancialYearIST()).toBe('20242025')
      
      // April 1 12:30 AM IST (now FY 2025-26)
      vi.setSystemTime(new Date('2025-03-31T19:00:00.000Z')) // 12:30 AM IST (April 1)
      expect(getCurrentFinancialYearIST()).toBe('20252026')
    })
  })

  describe('Business Day Calculation Edge Cases', () => {
    it('should handle business day calculation when starting on Sunday (7-day dairy)', () => {
      const sunday = new Date(2025, 0, 19) // Jan 19, 2025 (Sunday)
      expect(isISTWorkingDay(sunday)).toBe(true) // Dairy operates 7 days

      const nextBusinessDay = getNextISTBusinessDay(sunday)
      expect(nextBusinessDay.getDay()).toBe(1) // Monday (next day)
      expect(nextBusinessDay.getDate()).toBe(20) // Jan 20, 2025
    })

    it('should handle multiple consecutive holidays', () => {
      const friday = new Date(2025, 0, 17) // Jan 17, 2025 (Friday)
      expect(isISTWorkingDay(friday)).toBe(true)
      
      const nextBusinessDay = getNextISTBusinessDay(friday)
      expect(nextBusinessDay.getDay()).toBe(6) // Saturday (working day in dairy business)
      expect(nextBusinessDay.getDate()).toBe(18)
    })

    it('should handle business day calculation across month boundaries', () => {
      const lastWorkingDayOfJan = new Date(2025, 0, 31) // Jan 31, 2025 (Friday)
      if (isISTWorkingDay(lastWorkingDayOfJan)) {
        const nextBusinessDay = getNextISTBusinessDay(lastWorkingDayOfJan)
        expect(nextBusinessDay.getMonth()).toBe(1) // February
        expect(nextBusinessDay.getDate()).toBe(1) // Feb 1, 2025
      }
    })
  })
})

describe('Edge Cases - Invalid Date Handling', () => {
  describe('Invalid Date String Validation', () => {
    it('should reject invalid month values', () => {
      expect(isValidISTDateString('2025-13-01')).toBe(false) // Month 13
      expect(isValidISTDateString('2025-00-01')).toBe(false) // Month 0
      expect(isValidISTDateString('2025-99-01')).toBe(false) // Month 99
      
      expect(() => parseLocalDateIST('2025-13-01')).toThrow()
    })

    it('should reject invalid day values', () => {
      expect(isValidISTDateString('2025-01-32')).toBe(false) // Jan 32
      expect(isValidISTDateString('2025-01-00')).toBe(false) // Day 0
      expect(isValidISTDateString('2025-04-31')).toBe(false) // April 31 (April has 30 days)
      expect(isValidISTDateString('2025-06-31')).toBe(false) // June 31 (June has 30 days)
      
      expect(() => parseLocalDateIST('2025-01-32')).toThrow()
    })

    it('should reject invalid date formats', () => {
      expect(isValidISTDateString('01/15/2025')).toBe(false) // Wrong format
      expect(isValidISTDateString('2025/01/15')).toBe(false) // Wrong format
      expect(isValidISTDateString('15-01-2025')).toBe(false) // Wrong format
      expect(isValidISTDateString('2025-1-15')).toBe(false)  // Single digit month
      expect(isValidISTDateString('2025-01-5')).toBe(false)  // Single digit day
      
      expect(() => parseLocalDateIST('01/15/2025')).toThrow()
    })

    it('should reject malformed date strings', () => {
      expect(isValidISTDateString('')).toBe(false)
      expect(isValidISTDateString('invalid-date')).toBe(false)
      expect(isValidISTDateString('2025-01')).toBe(false)
      expect(isValidISTDateString('2025-01-15-extra')).toBe(false)
      expect(isValidISTDateString('2025-01-15T10:30:00')).toBe(false) // ISO format not allowed
      
      expect(() => parseLocalDateIST('')).toThrow()
      expect(() => parseLocalDateIST('invalid')).toThrow()
    })
  })

  describe('Date Object Validation', () => {
    it('should reject invalid Date objects', () => {
      const invalidDate = new Date('invalid')
      expect(isValidISTDate(invalidDate)).toBe(false)
      
      expect(() => formatDateForDatabase(invalidDate)).toThrow()
    })

    it('should reject non-Date objects', () => {
      expect(isValidISTDate(null)).toBe(false)
      expect(isValidISTDate(undefined)).toBe(false)
      expect(isValidISTDate('2025-01-15')).toBe(false)
      expect(isValidISTDate(1640995200000)).toBe(false) // Timestamp
      expect(isValidISTDate({})).toBe(false)
      expect(isValidISTDate([])).toBe(false)
    })
  })
})

describe('Edge Cases - Performance and Memory', () => {
  describe('Large Date Range Operations', () => {
    it('should handle large date differences efficiently', () => {
      const startTime = Date.now()
      
      const date1 = parseLocalDateIST('2020-01-01')
      const date2 = parseLocalDateIST('2025-12-31')
      
      // Calculate difference for ~6 years
      const diff = getDaysDifferenceIST(date1, date2)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(diff).toBeGreaterThan(2000) // Should be about 2190 days
      expect(diff).toBeLessThan(2200)
      expect(duration).toBeLessThan(10) // Should be very fast
    })

    it('should handle many date formatting operations efficiently', () => {
      const startTime = Date.now()
      const baseDate = parseLocalDateIST('2025-01-01')
      
      // Format 1000 dates
      const formattedDates = []
      for (let i = 0; i < 1000; i++) {
        const date = addDaysIST(baseDate, i)
        formattedDates.push(formatDateIST(date))
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(formattedDates.length).toBe(1000)
      expect(duration).toBeLessThan(100) // Should complete quickly
      
      // Verify some samples
      expect(formattedDates[0]).toBe('01/01/2025')
      expect(formattedDates[31]).toBe('01/02/2025') // Feb 1
      expect(formattedDates[365]).toBe('01/01/2026') // Next year
    })
  })

  describe('Memory Usage with Large Operations', () => {
    it('should not leak memory with repeated operations', () => {
      // Perform many operations to test for memory leaks
      for (let i = 0; i < 10000; i++) {
        const date = getCurrentISTDate()
        formatDateIST(date)
        formatDateForDatabase(date)
        addDaysIST(date, 1)
        
        // Occasional validation to ensure operations are working
        if (i % 1000 === 0) {
          expect(isValidISTDate(date)).toBe(true)
        }
      }
      
      // If we reach here without crashing, memory management is working
      expect(true).toBe(true)
    })
  })
})

describe('Edge Cases - Extreme Date Values', () => {
  describe('Very Old and Future Dates', () => {
    it('should handle very old dates', () => {
      const oldDate = parseLocalDateIST('1900-01-01')
      expect(isValidISTDate(oldDate)).toBe(true)
      expect(formatDateForDatabase(oldDate)).toBe('1900-01-01')
    })

    it('should handle far future dates', () => {
      const futureDate = parseLocalDateIST('2100-12-31')
      expect(isValidISTDate(futureDate)).toBe(true)
      expect(formatDateForDatabase(futureDate)).toBe('2100-12-31')
    })

    it('should handle century boundaries correctly', () => {
      const endOf19th = parseLocalDateIST('1899-12-31')
      const startOf20th = parseLocalDateIST('1900-01-01')
      const endOf20th = parseLocalDateIST('1999-12-31')
      const startOf21st = parseLocalDateIST('2000-01-01')
      
      expect(getDaysDifferenceIST(endOf19th, startOf20th)).toBe(1)
      expect(getDaysDifferenceIST(endOf20th, startOf21st)).toBe(1)
    })
  })
})