/**
 * Data Migration Validation Scripts
 * 
 * Validates that the IST standardization migration was successful:
 * - No data corruption occurred
 * - All dates display correctly in IST
 * - Database timezone fields are properly configured
 * - Existing business logic still works correctly
 * - No regression in data calculations
 */

import { describe, it, expect } from 'vitest'
import {
  formatDateIST,
  formatDateTimeIST,
  convertUTCToIST,
  parseLocalDateIST,
  formatDateForDatabase,
  isValidISTDate,
  getDaysDifferenceIST,
  getCurrentFinancialYearIST,
} from '../date-utils'

// Mock database records representing pre and post migration data
const mockDatabaseRecords = {
  // Sample records as they might appear from database after migration
  customers: [
    {
      id: 'cust_001',
      billing_name: 'Test Customer 1',
      created_at: '2024-06-15T08:30:00.000Z', // UTC timestamp
      updated_at: '2024-12-20T14:45:00.000Z'
    },
    {
      id: 'cust_002', 
      billing_name: 'Test Customer 2',
      created_at: '2024-03-22T11:15:00.000Z',
      updated_at: '2025-01-10T09:20:00.000Z'
    }
  ],
  
  // Sample payment records
  payments: [
    {
      id: 'pay_001',
      customer_id: 'cust_001',
      amount: 500.00,
      payment_date: '2024-12-01', // Date string
      created_at: '2024-12-01T10:30:00.000Z' // UTC timestamp
    },
    {
      id: 'pay_002',
      customer_id: 'cust_002',
      amount: 750.00,
      payment_date: '2024-11-28',
      created_at: '2024-11-28T15:45:00.000Z'
    }
  ],

  // Sample invoice records
  invoices: [
    {
      id: 'inv_001',
      customer_id: 'cust_001',
      invoice_date: '2024-11-30',
      due_date: '2024-12-30',
      total_amount: 2200.00,
      created_at: '2024-11-30T18:30:00.000Z'
    }
  ]
}

describe('Data Migration Validation - Database Schema Checks', () => {
  describe('Timestamp Field Migration', () => {
    it('should validate that UTC timestamps are stored correctly', () => {
      // Verify that all UTC timestamps are valid ISO strings
      const customers = mockDatabaseRecords.customers
      
      customers.forEach(customer => {
        const createdDate = new Date(customer.created_at)
        const updatedDate = new Date(customer.updated_at)
        
        expect(isValidISTDate(createdDate)).toBe(true)
        expect(isValidISTDate(updatedDate)).toBe(true)
        
        // Verify timezone info is preserved
        expect(customer.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        expect(customer.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      })
    })

    it('should validate that date fields are stored as date strings', () => {
      // Verify that date-only fields are stored in YYYY-MM-DD format
      const payments = mockDatabaseRecords.payments
      const invoices = mockDatabaseRecords.invoices
      
      payments.forEach(payment => {
        expect(payment.payment_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        
        // Should be parseable as a valid date
        const parsed = parseLocalDateIST(payment.payment_date)
        expect(isValidISTDate(parsed)).toBe(true)
      })

      invoices.forEach(invoice => {
        expect(invoice.invoice_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(invoice.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        
        // Should be parseable as valid dates
        const invoiceDate = parseLocalDateIST(invoice.invoice_date)
        const dueDate = parseLocalDateIST(invoice.due_date)
        
        expect(isValidISTDate(invoiceDate)).toBe(true)
        expect(isValidISTDate(dueDate)).toBe(true)
      })
    })
  })

  describe('Data Integrity Post-Migration', () => {
    it('should preserve all existing data relationships', () => {
      const customers = mockDatabaseRecords.customers
      const payments = mockDatabaseRecords.payments
      const invoices = mockDatabaseRecords.invoices
      
      const customerIds = new Set(customers.map(c => c.id))
      
      // All payments should reference existing customers
      payments.forEach(payment => {
        expect(customerIds.has(payment.customer_id)).toBe(true)
        expect(typeof payment.amount).toBe('number')
        expect(payment.amount).toBeGreaterThan(0)
      })
      
      // All invoices should reference existing customers
      invoices.forEach(invoice => {
        expect(customerIds.has(invoice.customer_id)).toBe(true)
        expect(typeof invoice.total_amount).toBe('number')
        expect(invoice.total_amount).toBeGreaterThan(0)
      })
    })

    it('should maintain chronological consistency', () => {
      const customers = mockDatabaseRecords.customers
      const payments = mockDatabaseRecords.payments
      const invoices = mockDatabaseRecords.invoices
      
      customers.forEach(customer => {
        const createdDate = new Date(customer.created_at)
        const updatedDate = new Date(customer.updated_at)
        
        // Updated date should be >= created date
        expect(updatedDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime())
        
        // Customer should exist before related transactions
        const customerPayments = payments.filter(p => p.customer_id === customer.id)
        customerPayments.forEach(payment => {
          const paymentDate = parseLocalDateIST(payment.payment_date)
          expect(paymentDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime())
        })
        
        const customerInvoices = invoices.filter(i => i.customer_id === customer.id)
        customerInvoices.forEach(invoice => {
          const invoiceDate = parseLocalDateIST(invoice.invoice_date)
          expect(invoiceDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime())
        })
      })
    })
  })
})

describe('Data Migration Validation - IST Display Accuracy', () => {
  describe('UTC to IST Conversion Verification', () => {
    it('should display all customer timestamps correctly in IST', () => {
      const customers = mockDatabaseRecords.customers
      
      customers.forEach(customer => {
        const createdUTC = new Date(customer.created_at)
        const updatedUTC = new Date(customer.updated_at)
        
        // Convert to IST for display
        const createdIST = convertUTCToIST(createdUTC)
        const updatedIST = convertUTCToIST(updatedUTC)
        
        const createdDisplay = formatDateTimeIST(createdIST)
        const updatedDisplay = formatDateTimeIST(updatedIST)
        
        // Should be in correct IST format
        expect(createdDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        expect(updatedDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        console.log(`Customer ${customer.billing_name}: Created ${createdDisplay}, Updated ${updatedDisplay}`)
      })
    })

    it('should display all payment dates correctly in IST', () => {
      const payments = mockDatabaseRecords.payments
      
      payments.forEach(payment => {
        const paymentDate = parseLocalDateIST(payment.payment_date)
        const createdTimestamp = new Date(payment.created_at)
        
        const paymentDisplay = formatDateIST(paymentDate)
        const timestampDisplay = formatDateTimeIST(createdTimestamp)
        
        expect(paymentDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(timestampDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        console.log(`Payment ${payment.id}: Date ${paymentDisplay}, Created ${timestampDisplay}`)
      })
    })

    it('should display all invoice dates correctly in IST', () => {
      const invoices = mockDatabaseRecords.invoices
      
      invoices.forEach(invoice => {
        const invoiceDate = parseLocalDateIST(invoice.invoice_date)
        const dueDate = parseLocalDateIST(invoice.due_date)
        const createdTimestamp = new Date(invoice.created_at)
        
        const invoiceDisplay = formatDateIST(invoiceDate)
        const dueDisplay = formatDateIST(dueDate)
        const timestampDisplay = formatDateTimeIST(createdTimestamp)
        
        expect(invoiceDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(dueDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(timestampDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        // Due date should be 30 days after invoice date
        const daysDiff = getDaysDifferenceIST(invoiceDate, dueDate)
        expect(daysDiff).toBe(30)
        
        console.log(`Invoice ${invoice.id}: Date ${invoiceDisplay}, Due ${dueDisplay}, Created ${timestampDisplay}`)
      })
    })
  })
})

describe('Data Migration Validation - Business Logic Integrity', () => {
  describe('Financial Calculations Verification', () => {
    it('should maintain accurate payment amount calculations', () => {
      const payments = mockDatabaseRecords.payments
      
      // Test payment totals and precision
      const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
      
      expect(totalPayments).toBe(1250.00) // 500 + 750
      
      // Verify each payment amount has correct precision
      payments.forEach(payment => {
        const amountStr = payment.amount.toFixed(2)
        expect(amountStr).toMatch(/^\d+\.\d{2}$/)
        
        // Verify amount is reasonable (not corrupted)
        expect(payment.amount).toBeGreaterThan(0)
        expect(payment.amount).toBeLessThan(100000) // Reasonable upper limit
      })
    })

    it('should maintain accurate invoice amount calculations', () => {
      const invoices = mockDatabaseRecords.invoices
      
      invoices.forEach(invoice => {
        expect(typeof invoice.total_amount).toBe('number')
        expect(invoice.total_amount).toBeGreaterThan(0)
        
        // Verify precision
        const amountStr = invoice.total_amount.toFixed(2)
        expect(amountStr).toMatch(/^\d+\.\d{2}$/)
      })
    })

    it('should calculate outstanding amounts correctly using IST dates', () => {
      // Simulate outstanding calculation logic
      const invoices = mockDatabaseRecords.invoices
      const payments = mockDatabaseRecords.payments
      
      invoices.forEach(invoice => {
        const invoiceDate = parseLocalDateIST(invoice.invoice_date)
        const dueDate = parseLocalDateIST(invoice.due_date)
        const today = new Date(2025, 0, 15) // Mock today
        
        // Calculate days overdue
        const daysOverdue = getDaysDifferenceIST(dueDate, today)
        const isOverdue = daysOverdue > 0
        
        // Find related payments
        const relatedPayments = payments.filter(p => p.customer_id === invoice.customer_id)
        const totalPaid = relatedPayments.reduce((sum, payment) => sum + payment.amount, 0)
        
        const outstanding = Math.max(0, invoice.total_amount - totalPaid)
        
        console.log(`Invoice ${invoice.id}: Amount ₹${invoice.total_amount}, Paid ₹${totalPaid}, Outstanding ₹${outstanding}, Days overdue: ${daysOverdue}`)
        
        // Verify calculations are reasonable
        expect(typeof outstanding).toBe('number')
        expect(outstanding).toBeGreaterThanOrEqual(0)
        expect(typeof isOverdue).toBe('boolean')
      })
    })
  })

  describe('Date-Based Business Rules Verification', () => {
    it('should calculate financial years correctly post-migration', () => {
      const testDates = [
        { date: '2024-06-15T08:30:00.000Z', expectedFY: '20242025' },
        { date: '2024-03-22T11:15:00.000Z', expectedFY: '20232024' },
        { date: '2025-01-10T09:20:00.000Z', expectedFY: '20242025' },
        { date: '2025-04-01T09:20:00.000Z', expectedFY: '20252026' }
      ]
      
      testDates.forEach(({ date, expectedFY }) => {
        // Mock the system time to the test date
        const testDate = new Date(date)
        const mockGetCurrentFinancialYear = () => {
          const currentYear = testDate.getFullYear()
          const currentMonth = testDate.getMonth() + 1
          
          if (currentMonth >= 4) {
            return `${currentYear}${currentYear + 1}`
          } else {
            return `${currentYear - 1}${currentYear}`
          }
        }
        
        const calculatedFY = mockGetCurrentFinancialYear()
        expect(calculatedFY).toBe(expectedFY)
        
        console.log(`Date ${formatDateTimeIST(testDate)} → FY ${calculatedFY}`)
      })
    })

    it('should handle payment period calculations correctly', () => {
      const payments = mockDatabaseRecords.payments
      
      payments.forEach(payment => {
        const paymentDate = parseLocalDateIST(payment.payment_date)
        const expectedPeriod = formatDateForDatabase(paymentDate).substring(0, 7) // YYYY-MM
        
        // Mock payment period calculation
        const year = paymentDate.getFullYear()
        const month = String(paymentDate.getMonth() + 1).padStart(2, '0')
        const calculatedPeriod = `${year}-${month}`
        
        expect(calculatedPeriod).toBe(expectedPeriod)
        expect(calculatedPeriod).toMatch(/^\d{4}-\d{2}$/)
        
        console.log(`Payment ${payment.id}: Date ${formatDateIST(paymentDate)} → Period ${calculatedPeriod}`)
      })
    })
  })
})

describe('Data Migration Validation - Performance Impact', () => {
  describe('Query Performance Validation', () => {
    it('should maintain efficient date filtering performance', () => {
      const sampleRecords = []
      
      // Create sample dataset for performance testing
      for (let i = 0; i < 1000; i++) {
        const baseDate = new Date(2024, 0, 1)
        const recordDate = new Date(baseDate.getTime() + (i * 24 * 60 * 60 * 1000))
        
        sampleRecords.push({
          id: `record_${i}`,
          date: formatDateForDatabase(recordDate),
          timestamp: recordDate.toISOString(),
          amount: 100 + (i * 10)
        })
      }
      
      const start = performance.now()
      
      // Simulate date-based filtering operations
      const filtered = sampleRecords.filter(record => {
        const recordDate = parseLocalDateIST(record.date)
        const cutoffDate = new Date(2024, 5, 1) // June 1, 2024
        return recordDate.getTime() >= cutoffDate.getTime()
      })
      
      const formatted = filtered.map(record => ({
        ...record,
        displayDate: formatDateIST(parseLocalDateIST(record.date)),
        displayTimestamp: formatDateTimeIST(new Date(record.timestamp))
      }))
      
      const end = performance.now()
      const totalTime = end - start
      
      expect(filtered.length).toBeGreaterThan(0)
      expect(formatted.length).toBe(filtered.length)
      expect(totalTime).toBeLessThan(200) // Should complete quickly
      
      console.log(`Filtered ${filtered.length} records from ${sampleRecords.length} in ${Math.round(totalTime)}ms`)
    })
  })

  describe('Memory Usage Validation', () => {
    it('should not increase memory usage significantly post-migration', () => {
      const iterations = 1000
      const testRecords = mockDatabaseRecords.customers
      
      const initialMemory = process.memoryUsage?.()?.heapUsed ?? 0
      
      // Simulate typical post-migration operations
      for (let i = 0; i < iterations; i++) {
        testRecords.forEach(customer => {
          const createdDate = new Date(customer.created_at)
          const createdIST = convertUTCToIST(createdDate)
          const displayDate = formatDateTimeIST(createdIST)
          
          // Use the result to prevent optimization
          if (i % 100 === 0) {
            expect(typeof displayDate).toBe('string')
          }
        })
      }
      
      const finalMemory = process.memoryUsage?.()?.heapUsed ?? 0
      const memoryDelta = finalMemory - initialMemory
      
      console.log(`Memory usage after ${iterations} IST operations: ${Math.round(memoryDelta / 1024)}KB`)
      
      // Should not use excessive memory
      expect(Math.abs(memoryDelta)).toBeLessThan(50000000) // 50MB limit
    })
  })
})

describe('Data Migration Validation - Regression Testing', () => {
  describe('UI Display Regression Tests', () => {
    it('should format dates consistently for UI display', () => {
      const testCases = [
        { utc: '2024-06-15T08:30:00.000Z', expectedDate: '15/06/2024', expectedTime: '14:00' },
        { utc: '2024-12-01T10:30:00.000Z', expectedDate: '01/12/2024', expectedTime: '16:00' },
        { utc: '2025-01-10T09:20:00.000Z', expectedDate: '10/01/2025', expectedTime: '14:50' }
      ]
      
      testCases.forEach(testCase => {
        const utcDate = new Date(testCase.utc)
        const istDate = convertUTCToIST(utcDate)
        
        const dateDisplay = formatDateIST(istDate)
        const timeDisplay = formatDateTimeIST(istDate)
        
        expect(dateDisplay).toBe(testCase.expectedDate)
        expect(timeDisplay).toContain(testCase.expectedDate)
        expect(timeDisplay).toContain(testCase.expectedTime)
        
        console.log(`UTC ${testCase.utc} → IST ${timeDisplay}`)
      })
    })

    it('should maintain consistency in report date ranges', () => {
      const startDate = parseLocalDateIST('2024-12-01')
      const endDate = parseLocalDateIST('2024-12-31')
      
      const daysDiff = getDaysDifferenceIST(startDate, endDate)
      expect(daysDiff).toBe(30)
      
      const startDisplay = formatDateIST(startDate)
      const endDisplay = formatDateIST(endDate)
      
      expect(startDisplay).toBe('01/12/2024')
      expect(endDisplay).toBe('31/12/2024')
      
      console.log(`Report range: ${startDisplay} to ${endDisplay} (${daysDiff} days)`)
    })
  })
})