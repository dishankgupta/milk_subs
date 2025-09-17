/**
 * Performance Tests for IST Date Utilities
 * 
 * Tests performance characteristics of IST date operations:
 * - Individual function performance benchmarks
 * - Bulk operation scalability
 * - Memory usage patterns
 * - Performance regression detection
 * - Real-world usage scenario simulations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Core functions
  getCurrentISTDate,
  convertUTCToIST,
  convertISTToUTC,
  
  // Formatting functions
  formatDateIST,
  formatDateTimeIST,
  formatTimestampIST,
  formatDateForDatabase,
  formatTimestampForDatabase,
  
  // Parsing functions
  parseLocalDateIST,
  parseISODateIST,
  
  // Business logic
  addDaysIST,
  getDaysDifferenceIST,
  isSameDayIST,
  compareDatesIST,
  isWithinRangeIST,
  
  // Validation functions
  isValidISTDate,
  isValidISTDateString,
  isISTWorkingDay,
  isISTBusinessHour,
  
  // Business helpers
  getNextISTBusinessDay,
  getCurrentFinancialYearIST,
  createISTDateRange,
} from '@/lib/date-utils'

// Performance measurement utilities
const measurePerformance = (name: string, fn: () => void, iterations: number = 1000) => {
  const start = performance.now()
  
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  
  const end = performance.now()
  const totalTime = end - start
  const avgTime = totalTime / iterations
  
  return {
    name,
    totalTime: Math.round(totalTime * 100) / 100, // Round to 2 decimal places
    avgTime: Math.round(avgTime * 10000) / 10000, // Round to 4 decimal places
    iterations
  }
}

const measureMemory = (fn: () => void, iterations: number = 1000) => {
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  const initialMemory = process.memoryUsage?.()?.heapUsed ?? 0
  
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  
  const finalMemory = process.memoryUsage?.()?.heapUsed ?? 0
  
  return {
    memoryDelta: finalMemory - initialMemory,
    avgMemoryPerOperation: (finalMemory - initialMemory) / iterations
  }
}

describe('Performance Tests - Core Function Benchmarks', () => {
  const testDate = new Date(2025, 0, 15, 10, 30, 0) // Jan 15, 2025, 10:30 AM
  const testDateString = '2025-01-15'
  const testISOString = '2025-01-15T10:30:00.000Z'
  
  beforeEach(() => {
    vi.setSystemTime(new Date('2025-01-15T05:00:00.000Z'))
  })

  describe('Date Creation and Conversion Performance', () => {
    it('should perform getCurrentISTDate efficiently', () => {
      const result = measurePerformance('getCurrentISTDate', () => {
        getCurrentISTDate()
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(500) // Should complete in < 500ms
      expect(result.avgTime).toBeLessThan(0.1) // < 0.1ms per operation
      
      console.log(`getCurrentISTDate: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform UTC to IST conversion efficiently', () => {
      const result = measurePerformance('convertUTCToIST', () => {
        convertUTCToIST(testDate)
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(500)
      expect(result.avgTime).toBeLessThan(0.1)
      
      console.log(`convertUTCToIST: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform IST to UTC conversion efficiently', () => {
      const result = measurePerformance('convertISTToUTC', () => {
        convertISTToUTC(testDate)
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(500)
      expect(result.avgTime).toBeLessThan(0.1)
      
      console.log(`convertISTToUTC: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })
  })

  describe('Formatting Function Performance', () => {
    it('should perform formatDateIST efficiently', () => {
      const result = measurePerformance('formatDateIST', () => {
        formatDateIST(testDate)
      }, 3000)
      
      expect(result.totalTime).toBeLessThan(300)
      expect(result.avgTime).toBeLessThan(0.1)
      
      console.log(`formatDateIST: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform formatDateTimeIST efficiently', () => {
      const result = measurePerformance('formatDateTimeIST', () => {
        formatDateTimeIST(testDate)
      }, 3000)
      
      expect(result.totalTime).toBeLessThan(300)
      expect(result.avgTime).toBeLessThan(0.1)
      
      console.log(`formatDateTimeIST: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform formatDateForDatabase efficiently', () => {
      const result = measurePerformance('formatDateForDatabase', () => {
        formatDateForDatabase(testDate)
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(50)
      expect(result.avgTime).toBeLessThan(0.01)
      
      console.log(`formatDateForDatabase: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })
  })

  describe('Parsing Function Performance', () => {
    it('should perform parseLocalDateIST efficiently', () => {
      const result = measurePerformance('parseLocalDateIST', () => {
        parseLocalDateIST(testDateString)
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(500)
      expect(result.avgTime).toBeLessThan(0.1)
      
      console.log(`parseLocalDateIST: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform parseISODateIST efficiently', () => {
      const result = measurePerformance('parseISODateIST', () => {
        parseISODateIST(testISOString)
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(150)
      expect(result.avgTime).toBeLessThan(0.03)
      
      console.log(`parseISODateIST: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })
  })

  describe('Validation Function Performance', () => {
    it('should perform isValidISTDate efficiently', () => {
      const result = measurePerformance('isValidISTDate', () => {
        isValidISTDate(testDate)
      }, 10000)
      
      expect(result.totalTime).toBeLessThan(50)
      expect(result.avgTime).toBeLessThan(0.005)
      
      console.log(`isValidISTDate: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform isValidISTDateString efficiently', () => {
      const result = measurePerformance('isValidISTDateString', () => {
        isValidISTDateString(testDateString)
      }, 5000)
      
      expect(result.totalTime).toBeLessThan(500)
      expect(result.avgTime).toBeLessThan(0.1)
      
      console.log(`isValidISTDateString: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })

    it('should perform isISTWorkingDay efficiently', () => {
      const result = measurePerformance('isISTWorkingDay', () => {
        isISTWorkingDay(testDate)
      }, 10000)
      
      expect(result.totalTime).toBeLessThan(100)
      expect(result.avgTime).toBeLessThan(0.01)
      
      console.log(`isISTWorkingDay: ${result.totalTime}ms total, ${result.avgTime}ms avg`)
    })
  })
})

describe('Performance Tests - Bulk Operations', () => {
  describe('Large Dataset Processing', () => {
    it('should handle bulk date formatting efficiently', () => {
      const dates = []
      const baseDate = new Date(2025, 0, 1)
      
      // Generate 1000 dates
      for (let i = 0; i < 1000; i++) {
        dates.push(new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000)))
      }
      
      const start = performance.now()
      
      const formattedDates = dates.map(date => formatDateIST(date))
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(formattedDates.length).toBe(1000)
      expect(totalTime).toBeLessThan(200) // Should complete in < 200ms
      expect(totalTime / 1000).toBeLessThan(0.2) // < 0.2ms per date
      
      console.log(`Bulk format 1000 dates: ${Math.round(totalTime)}ms total, ${Math.round((totalTime / 1000) * 1000) / 1000}ms avg`)
    })

    it('should handle bulk date parsing efficiently', () => {
      const dateStrings = []
      
      // Generate 1000 date strings
      for (let i = 0; i < 1000; i++) {
        const date = new Date(2025, 0, 1 + (i % 365))
        dateStrings.push(formatDateForDatabase(date))
      }
      
      const start = performance.now()
      
      const parsedDates = dateStrings.map(dateStr => parseLocalDateIST(dateStr))
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(parsedDates.length).toBe(1000)
      expect(totalTime).toBeLessThan(100) // Should complete in < 100ms
      expect(totalTime / 1000).toBeLessThan(0.1) // < 0.1ms per parse
      
      console.log(`Bulk parse 1000 dates: ${Math.round(totalTime)}ms total, ${Math.round((totalTime / 1000) * 1000) / 1000}ms avg`)
    })

    it('should handle bulk date validation efficiently', () => {
      const validDates = []
      const invalidDates = []
      
      // Generate mix of valid and invalid date strings
      for (let i = 0; i < 500; i++) {
        validDates.push(`2025-01-${String(i % 28 + 1).padStart(2, '0')}`)
        invalidDates.push(`2025-${String(i % 12 + 13).padStart(2, '0')}-01`) // Invalid months
      }
      
      const allDates = [...validDates, ...invalidDates]
      
      const start = performance.now()
      
      const validationResults = allDates.map(dateStr => isValidISTDateString(dateStr))
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(validationResults.length).toBe(1000)
      expect(totalTime).toBeLessThan(150) // Should complete in < 150ms
      
      const validCount = validationResults.filter(Boolean).length
      const invalidCount = validationResults.filter(v => !v).length
      
      expect(validCount).toBe(500) // All valid dates should pass
      expect(invalidCount).toBe(500) // All invalid dates should fail
      
      console.log(`Bulk validate 1000 dates: ${Math.round(totalTime)}ms total, ${validCount} valid, ${invalidCount} invalid`)
    })
  })

  describe('Complex Business Logic Performance', () => {
    it('should handle subscription pattern generation efficiently', () => {
      const startDate = new Date(2025, 0, 1)
      const customers = 100
      const daysPerPattern = 30
      
      const start = performance.now()
      
      const patterns = []
      for (let customer = 0; customer < customers; customer++) {
        const customerStartDate = addDaysIST(startDate, customer % 7) // Vary start dates
        const pattern = []
        
        for (let day = 0; day < daysPerPattern; day++) {
          const date = addDaysIST(customerStartDate, day)
          pattern.push({
            date: formatDateForDatabase(date),
            isDeliveryDay: day % 2 === 0, // Alternate days
            dayOfWeek: date.getDay(),
            isWorkingDay: isISTWorkingDay(date)
          })
        }
        
        patterns.push(pattern)
      }
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(patterns.length).toBe(100) // 100 customers
      expect(patterns[0].length).toBe(30) // 30 days per pattern
      expect(totalTime).toBeLessThan(100) // Should complete in < 100ms
      
      console.log(`Generate 100 subscription patterns (30 days each): ${Math.round(totalTime)}ms total`)
    })

    it('should handle financial year calculations efficiently', () => {
      const dates = []
      
      // Generate dates across multiple financial years
      for (let year = 2020; year <= 2030; year++) {
        for (let month = 0; month < 12; month++) {
          dates.push(new Date(year, month, 15)) // 15th of each month
        }
      }
      
      const start = performance.now()
      
      const financialYears = dates.map(date => {
        vi.setSystemTime(date)
        return getCurrentFinancialYearIST()
      })
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(financialYears.length).toBe(132) // 11 years * 12 months
      expect(totalTime).toBeLessThan(50) // Should complete in < 50ms
      
      // Verify some financial year calculations
      expect(financialYears[0]).toBe('20192020') // Jan 2020 -> FY 2019-20
      expect(financialYears[3]).toBe('20202021') // Apr 2020 -> FY 2020-21
      
      console.log(`Calculate 132 financial years: ${Math.round(totalTime)}ms total`)
    })
  })
})

describe('Performance Tests - Memory Usage', () => {
  describe('Memory Efficiency Tests', () => {
    it('should not leak memory with repeated date operations', () => {
      const iterations = 5000
      const testDate = new Date(2025, 0, 15)
      
      const memoryResult = measureMemory(() => {
        const formatted = formatDateIST(testDate)
        const parsed = parseLocalDateIST('2025-01-15')
        const added = addDaysIST(testDate, 1)
        const valid = isValidISTDate(testDate)
        
        // Use results to prevent optimization
        expect(typeof formatted).toBe('string')
        expect(parsed).toBeInstanceOf(Date)
        expect(added).toBeInstanceOf(Date)
        expect(typeof valid).toBe('boolean')
      }, iterations)
      
      // Memory usage should be reasonable (less than 1KB per 1000 operations)
      expect(Math.abs(memoryResult.memoryDelta)).toBeLessThan(5000)
      
      console.log(`Memory usage for ${iterations} operations: ${memoryResult.memoryDelta} bytes total`)
    })

    it('should handle large arrays of dates without excessive memory usage', () => {
      const dateCount = 10000
      const baseDate = new Date(2025, 0, 1)
      
      const start = performance.now()
      
      // Create large array of dates
      const dates = Array.from({ length: dateCount }, (_, i) => 
        addDaysIST(baseDate, i % 365)
      )
      
      // Process all dates
      const results = dates.map(date => ({
        formatted: formatDateIST(date),
        isWorkingDay: isISTWorkingDay(date),
        dbFormat: formatDateForDatabase(date)
      }))
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(results.length).toBe(dateCount)
      expect(totalTime).toBeLessThan(1000) // Should complete in < 1 second
      
      console.log(`Process ${dateCount} dates: ${Math.round(totalTime)}ms total`)
    })
  })
})

describe('Performance Tests - Real-World Scenarios', () => {
  describe('Dashboard Loading Simulation', () => {
    it('should handle dashboard data processing efficiently', () => {
      // Simulate dashboard loading scenario
      const customers = 150 // Typical customer count
      const baseDate = new Date(2025, 0, 1)
      
      const start = performance.now()
      
      // Simulate customer data processing
      const customerData = Array.from({ length: customers }, (_, i) => {
        const customerCreated = addDaysIST(baseDate, -(i * 30)) // Spread over time
        const lastPayment = addDaysIST(baseDate, -(i % 45)) // Various payment dates
        
        return {
          id: `cust_${i}`,
          createdDate: formatDateIST(customerCreated),
          createdDateTime: formatDateTimeIST(customerCreated),
          lastPaymentDate: formatDateIST(lastPayment),
          daysSincePayment: getDaysDifferenceIST(lastPayment, baseDate),
          isOverdue: getDaysDifferenceIST(lastPayment, baseDate) > 30,
          financialYear: (() => {
            vi.setSystemTime(customerCreated)
            return getCurrentFinancialYearIST()
          })()
        }
      })
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(customerData.length).toBe(customers)
      expect(totalTime).toBeLessThan(200) // Should load in < 200ms
      
      // Verify data quality
      const overdueCustomers = customerData.filter(c => c.isOverdue).length
      const recentCustomers = customerData.filter(c => c.daysSincePayment < 7).length
      
      expect(overdueCustomers).toBeGreaterThan(0)
      expect(recentCustomers).toBeGreaterThan(0)
      
      console.log(`Dashboard simulation (${customers} customers): ${Math.round(totalTime)}ms total`)
      console.log(`${overdueCustomers} overdue, ${recentCustomers} recent payments`)
    })
  })

  describe('Report Generation Simulation', () => {
    it('should handle monthly report generation efficiently', () => {
      const transactionsPerDay = 50
      const daysInMonth = 31
      const totalTransactions = transactionsPerDay * daysInMonth
      
      const baseDate = new Date(2025, 0, 1)
      
      const start = performance.now()
      
      // Generate monthly transaction data
      const transactions = []
      for (let day = 0; day < daysInMonth; day++) {
        const transactionDate = addDaysIST(baseDate, day)
        
        for (let txn = 0; txn < transactionsPerDay; txn++) {
          transactions.push({
            id: `txn_${day}_${txn}`,
            date: formatDateForDatabase(transactionDate),
            displayDate: formatDateIST(transactionDate),
            timestamp: formatTimestampForDatabase(transactionDate),
            isWorkingDay: isISTWorkingDay(transactionDate),
            dayOfWeek: transactionDate.getDay(),
            amount: (txn * 50) + 100 // Varying amounts
          })
        }
      }
      
      // Generate report summaries
      const summary = {
        totalTransactions: transactions.length,
        workingDayTransactions: transactions.filter(t => t.isWorkingDay).length,
        weekendTransactions: transactions.filter(t => !t.isWorkingDay).length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        avgPerDay: transactions.reduce((sum, t) => sum + t.amount, 0) / daysInMonth,
        dateRange: {
          start: formatDateIST(baseDate),
          end: formatDateIST(addDaysIST(baseDate, daysInMonth - 1))
        }
      }
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(transactions.length).toBe(totalTransactions)
      expect(summary.totalTransactions).toBe(totalTransactions)
      expect(totalTime).toBeLessThan(500) // Should complete in < 500ms
      
      console.log(`Monthly report (${totalTransactions} transactions): ${Math.round(totalTime)}ms total`)
      console.log(`${summary.workingDayTransactions} working day, ${summary.weekendTransactions} weekend transactions`)
    })
  })

  describe('Order Generation Simulation', () => {
    it('should handle daily order generation efficiently', () => {
      const activeSubscriptions = 200
      const baseDate = new Date(2025, 0, 15)
      
      const start = performance.now()
      
      // Simulate subscription patterns
      const subscriptions = Array.from({ length: activeSubscriptions }, (_, i) => ({
        id: `sub_${i}`,
        customerId: `cust_${i}`,
        product: i % 3 === 0 ? 'Cow Milk' : i % 3 === 1 ? 'Buffalo Milk' : 'Paneer',
        quantity: (i % 3) + 1, // 1-3 liters
        pattern: i % 2 === 0 ? [0] : [0, 1], // Alternating or daily
        startDate: addDaysIST(baseDate, -(i % 90)) // Various start dates
      }))
      
      // Generate orders for today
      const orders = []
      const today = baseDate
      
      subscriptions.forEach(sub => {
        const daysSinceStart = getDaysDifferenceIST(sub.startDate, today)
        const cyclePosition = daysSinceStart % 2 // 2-day cycle
        const isDeliveryDay = sub.pattern.includes(cyclePosition)
        
        if (isDeliveryDay && isISTWorkingDay(today)) {
          orders.push({
            id: `order_${sub.id}_${formatDateForDatabase(today)}`,
            subscriptionId: sub.id,
            customerId: sub.customerId,
            product: sub.product,
            quantity: sub.quantity,
            orderDate: formatDateForDatabase(today),
            deliveryDate: formatDateForDatabase(addDaysIST(today, 1)),
            cyclePosition,
            isWorkingDay: isISTWorkingDay(today)
          })
        }
      })
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(subscriptions.length).toBe(activeSubscriptions)
      expect(orders.length).toBeGreaterThan(0)
      expect(totalTime).toBeLessThan(100) // Should complete in < 100ms
      
      console.log(`Daily order generation (${activeSubscriptions} subscriptions → ${orders.length} orders): ${Math.round(totalTime)}ms total`)
    })
  })
})

describe('Performance Tests - Regression Detection', () => {
  describe('Performance Benchmarks', () => {
    it('should meet core function performance benchmarks', () => {
      const benchmarks = [
        { fn: () => getCurrentISTDate(), name: 'getCurrentISTDate', maxAvgMs: 0.01 },
        { fn: () => formatDateIST(new Date()), name: 'formatDateIST', maxAvgMs: 0.05 },
        { fn: () => parseLocalDateIST('2025-01-15'), name: 'parseLocalDateIST', maxAvgMs: 0.02 },
        { fn: () => isValidISTDate(new Date()), name: 'isValidISTDate', maxAvgMs: 0.005 },
        { fn: () => addDaysIST(new Date(), 1), name: 'addDaysIST', maxAvgMs: 0.01 },
      ]
      
      benchmarks.forEach(benchmark => {
        const result = measurePerformance(benchmark.name, benchmark.fn, 1000)
        
        expect(result.avgTime).toBeLessThan(benchmark.maxAvgMs)
        console.log(`${benchmark.name}: ${result.avgTime}ms avg (limit: ${benchmark.maxAvgMs}ms)`)
      })
    })

    it('should handle increasing data sizes with linear performance', () => {
      const sizes = [100, 500, 1000, 2000]
      const results = []
      
      sizes.forEach(size => {
        const dates = Array.from({ length: size }, (_, i) => 
          new Date(2025, 0, 1 + (i % 365))
        )
        
        const start = performance.now()
        
        dates.forEach(date => {
          formatDateIST(date)
          isISTWorkingDay(date)
        })
        
        const end = performance.now()
        const totalTime = end - start
        
        results.push({
          size,
          totalTime,
          avgTime: totalTime / size
        })
      })
      
      // Performance should scale approximately linearly
      results.forEach((result, i) => {
        if (i > 0) {
          const prevResult = results[i - 1]
          const sizeRatio = result.size / prevResult.size
          const timeRatio = result.totalTime / prevResult.totalTime
          
          // Time ratio should be close to size ratio (linear scaling)
          expect(timeRatio).toBeLessThan(sizeRatio * 1.5) // Allow some overhead
          
          console.log(`Size ${result.size}: ${Math.round(result.totalTime)}ms (${Math.round(result.avgTime * 1000) / 1000}ms avg)`)
        }
      })
    })
  })
})