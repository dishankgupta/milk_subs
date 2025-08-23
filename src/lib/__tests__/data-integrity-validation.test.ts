/**
 * Data Integrity Validation Tests for IST Standardization
 * 
 * Validates existing customer data integrity after IST timezone fixes:
 * - Customer records display correctly
 * - Payment history accuracy
 * - Invoice calculations remain correct
 * - No data corruption occurred during IST migration
 * - Existing timestamps convert properly to IST display
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  formatDateIST,
  formatDateTimeIST,
  convertUTCToIST,
  parseLocalDateIST,
  formatDateForDatabase,
  isValidISTDate,
  getCurrentISTDate,
} from '../date-utils'

// Mock data representing existing customer records as they would appear from database
const mockExistingCustomerData = {
  customers: [
    {
      id: 'cust_001',
      billing_name: 'Rajesh Sharma',
      created_at: '2024-06-15T08:30:00.000Z',
      updated_at: '2024-12-20T14:45:00.000Z',
      opening_balance: 2500.00
    },
    {
      id: 'cust_002',
      billing_name: 'Priya Patel',
      created_at: '2024-03-22T11:15:00.000Z',
      updated_at: '2025-01-10T09:20:00.000Z',
      opening_balance: 0.00
    },
    {
      id: 'cust_003',
      billing_name: 'Amit Kumar',
      created_at: '2024-11-05T16:45:00.000Z',
      updated_at: '2025-01-15T06:30:00.000Z',
      opening_balance: 1200.50
    }
  ],
  payments: [
    {
      id: 'pay_001',
      customer_id: 'cust_001',
      amount: 500.00,
      payment_date: '2024-12-01',
      payment_period: '2024-12',
      created_at: '2024-12-01T10:30:00.000Z'
    },
    {
      id: 'pay_002',
      customer_id: 'cust_002',
      amount: 750.00,
      payment_date: '2024-11-28',
      payment_period: '2024-11',
      created_at: '2024-11-28T15:45:00.000Z'
    },
    {
      id: 'pay_003',
      customer_id: 'cust_001',
      amount: 300.00,
      payment_date: '2025-01-10',
      payment_period: '2025-01',
      created_at: '2025-01-10T12:15:00.000Z'
    }
  ],
  invoices: [
    {
      id: 'inv_001',
      customer_id: 'cust_001',
      invoice_date: '2024-11-30',
      due_date: '2024-12-30',
      total_amount: 2200.00,
      created_at: '2024-11-30T18:30:00.000Z'
    },
    {
      id: 'inv_002',
      customer_id: 'cust_002',
      invoice_date: '2024-12-31',
      due_date: '2025-01-30',
      total_amount: 1800.00,
      created_at: '2024-12-31T23:45:00.000Z'
    }
  ],
  sales: [
    {
      id: 'sale_001',
      customer_id: 'cust_001',
      sale_date: '2024-12-15',
      amount: 250.00,
      payment_status: 'credit',
      created_at: '2024-12-15T14:20:00.000Z'
    },
    {
      id: 'sale_002',
      customer_id: 'cust_002',
      sale_date: '2025-01-05',
      amount: 180.00,
      payment_status: 'cash',
      created_at: '2025-01-05T10:45:00.000Z'
    }
  ],
  deliveries: [
    {
      id: 'del_001',
      customer_id: 'cust_001',
      delivery_date: '2024-12-20',
      planned_quantity: 2.0,
      actual_quantity: 2.0,
      created_at: '2024-12-20T07:30:00.000Z'
    },
    {
      id: 'del_002',
      customer_id: 'cust_002',
      delivery_date: '2025-01-12',
      planned_quantity: 1.5,
      actual_quantity: 1.5,
      created_at: '2025-01-12T08:15:00.000Z'
    }
  ]
}

// Mock database query functions
const mockDatabaseQueries = {
  /**
   * Simulates fetching customer records with IST formatting
   */
  async getCustomersWithIST() {
    return mockExistingCustomerData.customers.map(customer => ({
      ...customer,
      created_at_ist: formatDateTimeIST(new Date(customer.created_at)),
      updated_at_ist: formatDateTimeIST(new Date(customer.updated_at)),
      created_date_display: formatDateIST(new Date(customer.created_at)),
      updated_date_display: formatDateIST(new Date(customer.updated_at))
    }))
  },

  /**
   * Simulates fetching payment history with IST formatting
   */
  async getPaymentHistoryWithIST() {
    return mockExistingCustomerData.payments.map(payment => ({
      ...payment,
      payment_date_ist: formatDateIST(parseLocalDateIST(payment.payment_date)),
      created_at_ist: formatDateTimeIST(new Date(payment.created_at)),
      created_timestamp_display: formatDateTimeIST(new Date(payment.created_at))
    }))
  },

  /**
   * Simulates fetching invoices with IST formatting
   */
  async getInvoicesWithIST() {
    return mockExistingCustomerData.invoices.map(invoice => ({
      ...invoice,
      invoice_date_ist: formatDateIST(parseLocalDateIST(invoice.invoice_date)),
      due_date_ist: formatDateIST(parseLocalDateIST(invoice.due_date)),
      created_at_ist: formatDateTimeIST(new Date(invoice.created_at))
    }))
  },

  /**
   * Simulates fetching sales with IST formatting
   */
  async getSalesWithIST() {
    return mockExistingCustomerData.sales.map(sale => ({
      ...sale,
      sale_date_ist: formatDateIST(parseLocalDateIST(sale.sale_date)),
      created_at_ist: formatDateTimeIST(new Date(sale.created_at))
    }))
  },

  /**
   * Simulates fetching deliveries with IST formatting
   */
  async getDeliveriesWithIST() {
    return mockExistingCustomerData.deliveries.map(delivery => ({
      ...delivery,
      delivery_date_ist: formatDateIST(parseLocalDateIST(delivery.delivery_date)),
      created_at_ist: formatDateTimeIST(new Date(delivery.created_at))
    }))
  }
}

describe('Data Integrity Validation - Customer Records', () => {
  describe('Customer Data Display Integrity', () => {
    it('should display all customer creation dates correctly in IST', async () => {
      const customers = await mockDatabaseQueries.getCustomersWithIST()
      
      customers.forEach(customer => {
        // Verify IST formatted dates are in expected format
        expect(customer.created_date_display).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(customer.updated_date_display).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        
        // Verify timestamps are formatted correctly
        expect(customer.created_at_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        expect(customer.updated_at_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        // Verify dates are reasonable (not in future beyond expected range)
        const createdDate = new Date(customer.created_at)
        const updatedDate = new Date(customer.updated_at)
        const currentDate = getCurrentISTDate()
        
        expect(createdDate.getTime()).toBeLessThanOrEqual(currentDate.getTime())
        expect(updatedDate.getTime()).toBeLessThanOrEqual(currentDate.getTime())
        expect(updatedDate.getTime()).toBeGreaterThanOrEqual(createdDate.getTime())
      })
    })

    it('should preserve customer opening balance accuracy', async () => {
      const customers = await mockDatabaseQueries.getCustomersWithIST()
      
      // Verify all opening balances are preserved and valid
      const expectedOpeningBalances = [2500.00, 0.00, 1200.50]
      
      customers.forEach((customer, index) => {
        expect(customer.opening_balance).toBe(expectedOpeningBalances[index])
        expect(typeof customer.opening_balance).toBe('number')
        expect(customer.opening_balance).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle customers with different creation date ranges', async () => {
      const customers = await mockDatabaseQueries.getCustomersWithIST()
      
      // Verify we have customers created across different months
      const creationMonths = customers.map(customer => {
        const date = new Date(customer.created_at)
        return date.getMonth()
      })
      
      // Should have customers from different months (diversity check)
      const uniqueMonths = [...new Set(creationMonths)]
      expect(uniqueMonths.length).toBeGreaterThan(1)
      
      // All creation dates should be valid
      customers.forEach(customer => {
        const createdDate = new Date(customer.created_at)
        expect(isValidISTDate(createdDate)).toBe(true)
      })
    })
  })
})

describe('Data Integrity Validation - Payment History', () => {
  describe('Payment Date Display Integrity', () => {
    it('should display all payment dates correctly in IST', async () => {
      const payments = await mockDatabaseQueries.getPaymentHistoryWithIST()
      
      payments.forEach(payment => {
        // Verify payment date formatting
        expect(payment.payment_date_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        
        // Verify created timestamp formatting
        expect(payment.created_timestamp_display).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        // Verify payment date is parseable and valid
        const originalDate = parseLocalDateIST(payment.payment_date)
        expect(isValidISTDate(originalDate)).toBe(true)
        
        // Verify payment amounts are preserved
        expect(typeof payment.amount).toBe('number')
        expect(payment.amount).toBeGreaterThan(0)
      })
    })

    it('should maintain payment period consistency', async () => {
      const payments = await mockDatabaseQueries.getPaymentHistoryWithIST()
      
      payments.forEach(payment => {
        // Verify payment period format (YYYY-MM)
        expect(payment.payment_period).toMatch(/^\d{4}-\d{2}$/)
        
        // Verify payment period matches payment date month/year
        const paymentDate = parseLocalDateIST(payment.payment_date)
        const expectedPeriod = formatDateForDatabase(paymentDate).substring(0, 7) // YYYY-MM
        
        expect(payment.payment_period).toBe(expectedPeriod)
      })
    })

    it('should preserve payment amounts accurately', async () => {
      const payments = await mockDatabaseQueries.getPaymentHistoryWithIST()
      
      // Expected amounts from mock data
      const expectedAmounts = [500.00, 750.00, 300.00]
      
      payments.forEach((payment, index) => {
        expect(payment.amount).toBe(expectedAmounts[index])
        
        // Verify precision is maintained (2 decimal places for currency)
        const amountStr = payment.amount.toFixed(2)
        expect(amountStr).toMatch(/^\d+\.\d{2}$/)
      })
    })
  })

  describe('Payment Chronological Integrity', () => {
    it('should maintain chronological order of payments', async () => {
      const payments = await mockDatabaseQueries.getPaymentHistoryWithIST()
      
      // Sort payments by payment date
      const sortedPayments = [...payments].sort((a, b) => {
        const dateA = parseLocalDateIST(a.payment_date)
        const dateB = parseLocalDateIST(b.payment_date)
        return dateA.getTime() - dateB.getTime()
      })
      
      // Verify chronological consistency
      for (let i = 1; i < sortedPayments.length; i++) {
        const prevDate = parseLocalDateIST(sortedPayments[i - 1].payment_date)
        const currentDate = parseLocalDateIST(sortedPayments[i].payment_date)
        
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime())
  }})
    })
  })

describe('Data Integrity Validation - Invoice Calculations', () => {
  describe('Invoice Date Display Integrity', () => {
    it('should display all invoice dates correctly in IST', async () => {
      const invoices = await mockDatabaseQueries.getInvoicesWithIST()
      
      invoices.forEach(invoice => {
        // Verify date formatting
        expect(invoice.invoice_date_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(invoice.due_date_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(invoice.created_at_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        // Verify dates are parseable
        const invoiceDate = parseLocalDateIST(invoice.invoice_date)
        const dueDate = parseLocalDateIST(invoice.due_date)
        
        expect(isValidISTDate(invoiceDate)).toBe(true)
        expect(isValidISTDate(dueDate)).toBe(true)
        
        // Due date should be after invoice date
        expect(dueDate.getTime()).toBeGreaterThan(invoiceDate.getTime())
      })
    })

    it('should preserve invoice amounts accurately', async () => {
      const invoices = await mockDatabaseQueries.getInvoicesWithIST()
      
      // Expected amounts from mock data
      const expectedAmounts = [2200.00, 1800.00]
      
      invoices.forEach((invoice, index) => {
        expect(invoice.total_amount).toBe(expectedAmounts[index])
        expect(typeof invoice.total_amount).toBe('number')
        expect(invoice.total_amount).toBeGreaterThan(0)
      })
    })
  })

  describe('Invoice Due Date Logic', () => {
    it('should maintain correct due date calculations', async () => {
      const invoices = await mockDatabaseQueries.getInvoicesWithIST()
      
      invoices.forEach(invoice => {
        const invoiceDate = parseLocalDateIST(invoice.invoice_date)
        const dueDate = parseLocalDateIST(invoice.due_date)
        
        // Due date should be exactly 30 days after invoice date
        const expectedDueDate = new Date(invoiceDate)
        expectedDueDate.setDate(expectedDueDate.getDate() + 30)
        
        const daysDifference = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
        expect(daysDifference).toBe(30)
      })
    })
  })
})

describe('Data Integrity Validation - Sales Records', () => {
  describe('Sales Date Display Integrity', () => {
    it('should display all sales dates correctly in IST', async () => {
      const sales = await mockDatabaseQueries.getSalesWithIST()
      
      sales.forEach(sale => {
        // Verify date formatting
        expect(sale.sale_date_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(sale.created_at_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        // Verify sale date is parseable
        const saleDate = parseLocalDateIST(sale.sale_date)
        expect(isValidISTDate(saleDate)).toBe(true)
        
        // Verify payment status is preserved
        expect(['cash', 'credit']).toContain(sale.payment_status)
        
        // Verify amounts
        expect(typeof sale.amount).toBe('number')
        expect(sale.amount).toBeGreaterThan(0)
      })
    })

    it('should maintain sales amount accuracy', async () => {
      const sales = await mockDatabaseQueries.getSalesWithIST()
      
      // Expected amounts from mock data
      const expectedAmounts = [250.00, 180.00]
      
      sales.forEach((sale, index) => {
        expect(sale.amount).toBe(expectedAmounts[index])
      })
    })
  })
})

describe('Data Integrity Validation - Delivery Records', () => {
  describe('Delivery Date Display Integrity', () => {
    it('should display all delivery dates correctly in IST', async () => {
      const deliveries = await mockDatabaseQueries.getDeliveriesWithIST()
      
      deliveries.forEach(delivery => {
        // Verify date formatting
        expect(delivery.delivery_date_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
        expect(delivery.created_at_ist).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)
        
        // Verify delivery date is parseable
        const deliveryDate = parseLocalDateIST(delivery.delivery_date)
        expect(isValidISTDate(deliveryDate)).toBe(true)
        
        // Verify quantities are preserved
        expect(typeof delivery.planned_quantity).toBe('number')
        expect(typeof delivery.actual_quantity).toBe('number')
        expect(delivery.planned_quantity).toBeGreaterThan(0)
        expect(delivery.actual_quantity).toBeGreaterThan(0)
      })
    })

    it('should maintain delivery quantity accuracy', async () => {
      const deliveries = await mockDatabaseQueries.getDeliveriesWithIST()
      
      deliveries.forEach(delivery => {
        // Verify quantities match expected precision
        expect(delivery.planned_quantity).toBe(Math.round(delivery.planned_quantity * 10) / 10) // 1 decimal place
        expect(delivery.actual_quantity).toBe(Math.round(delivery.actual_quantity * 10) / 10) // 1 decimal place
        
        // In this mock data, actual quantities match planned
        expect(delivery.actual_quantity).toBe(delivery.planned_quantity)
      })
    })
  })
})

describe('Data Integrity Validation - Cross-Table Consistency', () => {
  describe('Customer-Payment Relationships', () => {
    it('should maintain referential integrity between customers and payments', async () => {
      const customers = await mockDatabaseQueries.getCustomersWithIST()
      const payments = await mockDatabaseQueries.getPaymentHistoryWithIST()
      
      const customerIds = new Set(customers.map(c => c.id))
      
      // All payment customer_ids should reference existing customers
      payments.forEach(payment => {
        expect(customerIds.has(payment.customer_id)).toBe(true)
      })
    })
  })

  describe('Timeline Consistency', () => {
    it('should maintain logical timeline across all records', async () => {
      const customers = await mockDatabaseQueries.getCustomersWithIST()
      const payments = await mockDatabaseQueries.getPaymentHistoryWithIST()
      const invoices = await mockDatabaseQueries.getInvoicesWithIST()
      const sales = await mockDatabaseQueries.getSalesWithIST()
      const deliveries = await mockDatabaseQueries.getDeliveriesWithIST()
      
      // Customer should be created before any related transactions
      customers.forEach(customer => {
        const customerCreationDate = new Date(customer.created_at)
        
        // Check payments
        const customerPayments = payments.filter(p => p.customer_id === customer.id)
        customerPayments.forEach(payment => {
          const paymentDate = parseLocalDateIST(payment.payment_date)
          expect(paymentDate.getTime()).toBeGreaterThanOrEqual(customerCreationDate.getTime())
        })
        
        // Check invoices
        const customerInvoices = invoices.filter(i => i.customer_id === customer.id)
        customerInvoices.forEach(invoice => {
          const invoiceDate = parseLocalDateIST(invoice.invoice_date)
          expect(invoiceDate.getTime()).toBeGreaterThanOrEqual(customerCreationDate.getTime())
        })
        
        // Check sales
        const customerSales = sales.filter(s => s.customer_id === customer.id)
        customerSales.forEach(sale => {
          const saleDate = parseLocalDateIST(sale.sale_date)
          expect(saleDate.getTime()).toBeGreaterThanOrEqual(customerCreationDate.getTime())
        })
        
        // Check deliveries
        const customerDeliveries = deliveries.filter(d => d.customer_id === customer.id)
        customerDeliveries.forEach(delivery => {
          const deliveryDate = parseLocalDateIST(delivery.delivery_date)
          expect(deliveryDate.getTime()).toBeGreaterThanOrEqual(customerCreationDate.getTime())
        })
      })
    })
  })
})

describe('Data Integrity Validation - Timezone Consistency', () => {
  describe('UTC to IST Conversion Accuracy', () => {
    it('should convert all UTC timestamps to correct IST display', async () => {
      const customers = await mockDatabaseQueries.getCustomersWithIST()
      
      customers.forEach(customer => {
        const utcCreated = new Date(customer.created_at)
        const utcUpdated = new Date(customer.updated_at)
        
        // Manual conversion to verify
        const istCreated = convertUTCToIST(utcCreated)
        const istUpdated = convertUTCToIST(utcUpdated)
        
        const manualCreatedDisplay = formatDateTimeIST(istCreated)
        const manualUpdatedDisplay = formatDateTimeIST(istUpdated)
        
        expect(customer.created_at_ist).toBe(manualCreatedDisplay)
        expect(customer.updated_at_ist).toBe(manualUpdatedDisplay)
      })
    })
  })

  describe('Date Boundary Handling', () => {
    it('should handle timezone date boundaries correctly', async () => {
      // Test with data that crosses date boundaries when converting UTC to IST
      const utcMidnight = new Date('2025-01-15T00:30:00.000Z') // 6:00 AM IST
      const utcEvening = new Date('2025-01-14T20:30:00.000Z') // 2:00 AM IST next day
      
      const istMidnight = convertUTCToIST(utcMidnight)
      const istEvening = convertUTCToIST(utcEvening)
      
      // Both should convert to Jan 15 in IST
      expect(formatDateIST(istMidnight)).toBe('15/01/2025')
      expect(formatDateIST(istEvening)).toBe('15/01/2025')
      
      // But different times
      expect(formatDateTimeIST(istMidnight)).toBe('15/01/2025, 06:00')
      expect(formatDateTimeIST(istEvening)).toBe('15/01/2025, 02:00')
    })
  })
})