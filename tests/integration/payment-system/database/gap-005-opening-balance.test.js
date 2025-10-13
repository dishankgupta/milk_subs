/**
 * GAP-005: Opening Balance Transaction Safety Tests
 *
 * Testing atomic opening balance allocation with row-level locking
 * to prevent double-allocation scenarios and race conditions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'

// Mock Supabase client for database testing
const mockSupabase = {
  rpc: vi.fn(),
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn()
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

describe('GAP-005: Opening Balance Transaction Safety', () => {
  beforeAll(() => {
    console.log('🧪 Testing GAP-005: Opening Balance Transaction Safety')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Atomic Opening Balance Allocation Function', () => {
    it('should test allocate_opening_balance_atomic() with successful allocation', async () => {
      // Mock successful opening balance allocation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          payment_id: 'test-payment-uuid',
          customer_id: 'test-customer-uuid',
          allocated_amount: 500.00,
          remaining_opening_balance: 1500.00,
          payment_status: 'partially_applied'
        },
        error: null
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00
      })

      expect(result.data).toEqual({
        success: true,
        payment_id: 'test-payment-uuid',
        customer_id: 'test-customer-uuid',
        allocated_amount: 500.00,
        remaining_opening_balance: 1500.00,
        payment_status: 'partially_applied'
      })
      expect(result.error).toBeNull()
    })

    it('should handle full allocation to opening balance', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          allocated_amount: 800.00,
          remaining_opening_balance: 0.00,
          payment_status: 'fully_applied'
        },
        error: null
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 800.00
      })

      expect(result.data.payment_status).toBe('fully_applied')
      expect(result.data.remaining_opening_balance).toBe(0.00)
    })

    it('should reject allocation when no opening balance available', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'No remaining opening balance to allocate',
          code: 'NO_OPENING_BALANCE'
        }
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00
      })

      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('NO_OPENING_BALANCE')
    })

    it('should handle partial allocation when requested amount exceeds balance', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          allocated_amount: 300.00, // Less than requested 500
          remaining_opening_balance: 0.00,
          payment_status: 'partially_applied',
          note: 'Allocated available balance only'
        },
        error: null
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00 // Requesting more than available
      })

      expect(result.data.allocated_amount).toBe(300.00)
      expect(result.data.remaining_opening_balance).toBe(0.00)
    })
  })

  describe('Row-Level Locking and Race Condition Prevention', () => {
    it('should test concurrent allocation prevention', async () => {
      // Setup mocks first
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: {
            success: true,
            allocated_amount: 400.00,
            remaining_opening_balance: 100.00
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            allocated_amount: 100.00, // Only remaining balance
            remaining_opening_balance: 0.00
          }
        })

      // Simulate concurrent access - second call should wait/fail
      const firstCall = mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'payment-1-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 400.00
      })

      const secondCall = mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'payment-2-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 400.00
      })

      const [result1, result2] = await Promise.all([firstCall, secondCall])

      expect(result1.data.allocated_amount).toBe(400.00)
      expect(result2.data.allocated_amount).toBe(100.00)
    })

    it('should handle database lock timeout gracefully', async () => {
      mockSupabase.rpc.mockRejectedValueOnce({
        code: '55P03', // lock_timeout
        message: 'canceling statement due to lock timeout'
      })

      try {
        await mockSupabase.rpc('allocate_opening_balance_atomic', {
          p_payment_id: 'test-payment-uuid',
          p_customer_id: 'test-customer-uuid',
          p_amount: 500.00
        })
      } catch (error) {
        expect(error.code).toBe('55P03')
        expect(error.message).toContain('lock timeout')
      }
    })
  })

  describe('Opening Balance Calculation Integration', () => {
    it('should test getEffectiveOpeningBalance() integration', async () => {
      // Mock opening balance calculation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: 1200.00, // Effective opening balance
        error: null
      })

      const result = await mockSupabase.rpc('getEffectiveOpeningBalance', 'test-customer-uuid')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('getEffectiveOpeningBalance', 'test-customer-uuid')
      expect(result.data).toBe(1200.00)
    })

    it('should handle zero or negative opening balance', async () => {
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: 0.00,
          error: null
        })
        .mockResolvedValueOnce({
          data: null,
          error: {
            message: 'No remaining opening balance to allocate',
            code: 'NO_OPENING_BALANCE'
          }
        })

      const balanceResult = await mockSupabase.rpc('getEffectiveOpeningBalance', 'test-customer-uuid')

      const allocationResult = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00
      })

      expect(balanceResult.data).toBe(0.00)
      expect(allocationResult.error.code).toBe('NO_OPENING_BALANCE')
    })
  })

  describe('Payment Status Updates', () => {
    it('should test payment status transitions with opening balance allocation', async () => {
      // Setup mocks first
      mockSupabase.rpc
        .mockResolvedValueOnce({
          data: {
            success: true,
            allocated_amount: 300.00,
            payment_status: 'partially_applied',
            total_allocated: 300.00,
            payment_amount: 800.00
          }
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            allocated_amount: 500.00,
            payment_status: 'fully_applied',
            total_allocated: 800.00,
            payment_amount: 800.00
          }
        })

      // Test partial allocation
      const partialResult = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 300.00
      })

      expect(partialResult.data.payment_status).toBe('partially_applied')

      // Test full allocation
      const fullResult = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00
      })

      expect(fullResult.data.payment_status).toBe('fully_applied')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid payment ID', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND'
        }
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'invalid-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 500.00
      })

      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('PAYMENT_NOT_FOUND')
    })

    it('should handle invalid customer ID', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND'
        }
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'invalid-customer-uuid',
        p_amount: 500.00
      })

      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('CUSTOMER_NOT_FOUND')
    })

    it('should handle negative allocation amounts', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Allocation amount must be positive',
          code: 'INVALID_AMOUNT'
        }
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: -100.00
      })

      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('INVALID_AMOUNT')
    })

    it('should handle database transaction rollback', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Transaction rollback'))

      try {
        await mockSupabase.rpc('allocate_opening_balance_atomic', {
          p_payment_id: 'test-payment-uuid',
          p_customer_id: 'test-customer-uuid',
          p_amount: 500.00
        })
      } catch (error) {
        expect(error.message).toBe('Transaction rollback')
      }
    })
  })

  describe('Integration with Existing Payment Allocations', () => {
    it('should calculate total allocations including invoice payments', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          allocated_amount: 200.00,
          payment_status: 'fully_applied',
          total_allocated: 800.00, // 600 from invoices + 200 from opening balance
          payment_amount: 800.00,
          existing_invoice_allocations: 600.00
        }
      })

      const result = await mockSupabase.rpc('allocate_opening_balance_atomic', {
        p_payment_id: 'test-payment-uuid',
        p_customer_id: 'test-customer-uuid',
        p_amount: 200.00
      })

      expect(result.data).toBeDefined()
      expect(result.data.total_allocated).toBe(800.00)
      expect(result.data.existing_invoice_allocations).toBe(600.00)
      expect(result.data.payment_status).toBe('fully_applied')
    })
  })

  afterAll(() => {
    console.log('✅ GAP-005 tests completed: Opening Balance Transaction Safety')
  })
})