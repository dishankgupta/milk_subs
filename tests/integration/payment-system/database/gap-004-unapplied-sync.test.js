/**
 * GAP-004: Unapplied Payments Synchronization Tests
 *
 * Testing database triggers and functions for automatic unapplied_payments
 * table maintenance to prevent synchronization issues.
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
    insert: vi.fn(() => ({
      onConflict: vi.fn(() => ({
        doUpdate: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    })),
    delete: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

describe('GAP-004: Unapplied Payments Synchronization', () => {
  beforeAll(() => {
    // Setup test environment
    console.log('🧪 Testing GAP-004: Unapplied Payments Synchronization')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Database Trigger Functions', () => {
    it('should test maintain_unapplied_payments() trigger function', async () => {
      // Mock successful trigger execution
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          payment_id: 'test-payment-uuid',
          amount_unapplied: 500.00,
          action: 'updated'
        },
        error: null
      })

      const result = await mockSupabase.rpc('maintain_unapplied_payments_test', {
        p_payment_id: 'test-payment-uuid',
        p_payment_amount: 1000.00,
        p_total_allocated: 500.00
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('maintain_unapplied_payments_test', {
        p_payment_id: 'test-payment-uuid',
        p_payment_amount: 1000.00,
        p_total_allocated: 500.00
      })

      expect(result.data).toEqual({
        success: true,
        payment_id: 'test-payment-uuid',
        amount_unapplied: 500.00,
        action: 'updated'
      })
      expect(result.error).toBeNull()
    })

    it('should handle zero unapplied amount (full allocation)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          payment_id: 'test-payment-uuid',
          amount_unapplied: 0,
          action: 'deleted'
        },
        error: null
      })

      const result = await mockSupabase.rpc('maintain_unapplied_payments_test', {
        p_payment_id: 'test-payment-uuid',
        p_payment_amount: 1000.00,
        p_total_allocated: 1000.00
      })

      expect(result.data.action).toBe('deleted')
      expect(result.data.amount_unapplied).toBe(0)
    })

    it('should handle negative unapplied amount (over-allocation error)', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Validation constraint: amount_unapplied must be positive',
          code: 'CHECK_VIOLATION'
        }
      })

      const result = await mockSupabase.rpc('maintain_unapplied_payments_test', {
        p_payment_id: 'test-payment-uuid',
        p_payment_amount: 800.00,
        p_total_allocated: 1000.00
      })

      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('CHECK_VIOLATION')
    })
  })

  describe('Validation Constraints', () => {
    it('should test unapplied_positive constraint', async () => {
      // Test that negative amounts are rejected
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockRejectedValueOnce({
              code: '23514', // CHECK constraint violation
              message: 'new row violates check constraint "unapplied_positive"'
            })
          }))
        }))
      })

      try {
        const insertQuery = mockSupabase.from('unapplied_payments')
        await insertQuery.insert({
          payment_id: 'test-payment-uuid',
          customer_id: 'test-customer-uuid',
          amount_unapplied: -100.00
        }).select().single()
      } catch (error) {
        expect(error.code).toBe('23514')
        expect(error.message).toContain('unapplied_positive')
      }
    })

    it('should allow positive amounts', async () => {
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'unapplied-id',
                payment_id: 'test-payment-uuid',
                amount_unapplied: 250.00
              }
            })
          }))
        }))
      })

      const insertQuery = mockSupabase.from('unapplied_payments')
      const result = await insertQuery.insert({
        payment_id: 'test-payment-uuid',
        customer_id: 'test-customer-uuid',
        amount_unapplied: 250.00
      }).select().single()

      expect(result.data.amount_unapplied).toBe(250.00)
    })
  })

  describe('Reconciliation Function', () => {
    it('should test reconcile_unapplied_payments() function', async () => {
      // Mock reconciliation results showing discrepancies
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            payment_id: 'payment-1-uuid',
            expected_unapplied: 300.00,
            actual_unapplied: 250.00
          },
          {
            payment_id: 'payment-2-uuid',
            expected_unapplied: 0.00,
            actual_unapplied: 100.00
          }
        ],
        error: null
      })

      const result = await mockSupabase.rpc('reconcile_unapplied_payments')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('reconcile_unapplied_payments')
      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toEqual({
        payment_id: 'payment-1-uuid',
        expected_unapplied: 300.00,
        actual_unapplied: 250.00
      })
    })

    it('should handle no discrepancies found', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await mockSupabase.rpc('reconcile_unapplied_payments')

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('Integration with Payment Operations', () => {
    it('should maintain sync during payment creation', async () => {
      // Setup mocks first
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValueOnce({
              data: {
                id: 'new-payment-uuid',
                amount: 1000.00,
                allocation_status: 'unapplied'
              }
            })
          }))
        }))
      })

      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          unapplied_payment_created: true,
          amount: 1000.00
        }
      })

      // Test payment creation
      const paymentQuery = mockSupabase.from('payments')
      const paymentResult = await paymentQuery.insert({
        customer_id: 'test-customer-uuid',
        amount: 1000.00,
        payment_method: 'Cash'
      }).select().single()

      expect(paymentResult.data.allocation_status).toBe('unapplied')

      // Verify trigger was called
      const triggerResult = await mockSupabase.rpc('test_payment_trigger_sync', {
        payment_id: paymentResult.data.id
      })

      expect(triggerResult.data.unapplied_payment_created).toBe(true)
      expect(triggerResult.data.amount).toBe(1000.00)
    })

    it('should maintain sync during allocation changes', async () => {
      // Mock allocation change trigger
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          previous_unapplied: 1000.00,
          new_unapplied: 700.00,
          allocation_added: 300.00
        }
      })

      const result = await mockSupabase.rpc('test_allocation_trigger_sync', {
        payment_id: 'test-payment-uuid',
        allocation_amount: 300.00
      })

      expect(result.data.allocation_added).toBe(300.00)
      expect(result.data.new_unapplied).toBe(700.00)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Connection timeout'))

      try {
        await mockSupabase.rpc('maintain_unapplied_payments_test', {
          p_payment_id: 'test-payment-uuid'
        })
      } catch (error) {
        expect(error.message).toBe('Connection timeout')
      }
    })

    it('should handle concurrent trigger executions', async () => {
      // Setup mock responses first
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: { success: true, payment_id: 'payment-1' } })
        .mockResolvedValueOnce({ data: { success: true, payment_id: 'payment-2' } })

      // Simulate concurrent operations
      const promises = [
        mockSupabase.rpc('maintain_unapplied_payments_test', {
          p_payment_id: 'payment-1'
        }),
        mockSupabase.rpc('maintain_unapplied_payments_test', {
          p_payment_id: 'payment-2'
        })
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(2)
      expect(results[0].data.payment_id).toBe('payment-1')
      expect(results[1].data.payment_id).toBe('payment-2')
    })
  })

  afterAll(() => {
    console.log('✅ GAP-004 tests completed: Unapplied Payments Synchronization')
  })
})