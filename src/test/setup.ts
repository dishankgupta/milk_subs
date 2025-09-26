import '@testing-library/jest-dom'
import { expect } from 'vitest'

// Setup test environment
// Note: NODE_ENV is read-only in some environments, so only set if possible
try {
  (process.env as any).NODE_ENV = 'test'
} catch (e) {
  // Ignore if assignment fails
}

// Extend expect with custom matchers for payment system tests
expect.extend({
  toBeValidPaymentAllocation(received) {
    const pass = received &&
                 received.isValid !== undefined &&
                 received.totalAllocations !== undefined &&
                 received.maxAllowable !== undefined

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid payment allocation`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid payment allocation with isValid, totalAllocations, and maxAllowable properties`,
        pass: false,
      }
    }
  },
})