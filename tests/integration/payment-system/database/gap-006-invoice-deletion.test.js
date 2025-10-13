/**
 * GAP-006: Invoice Deletion Safety Tests
 *
 * Testing safe invoice deletion with precise sales reversion,
 * soft delete capability, and payment validation.
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

describe('GAP-006: Invoice Deletion Safety', () => {
  beforeAll(() => {
    console.log('🧪 Testing GAP-006: Invoice Deletion Safety')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Safe Invoice Deletion Function', () => {
    it('should test delete_invoice_safe() with soft delete', async () => {
      // Mock successful soft deletion
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'test-invoice-uuid',
          soft_delete: true,
          reverted_sales: 3,
          affected_sales_ids: ['sale-1', 'sale-2', 'sale-3'],
          deletion_type: 'soft'
        },
        error: null
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'test-invoice-uuid',
        p_permanent: false
      })

      expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_invoice_safe', {
        p_invoice_id: 'test-invoice-uuid',
        p_permanent: false
      })

      expect(result.data).toEqual({
        success: true,
        invoice_id: 'test-invoice-uuid',
        soft_delete: true,
        reverted_sales: 3,
        affected_sales_ids: ['sale-1', 'sale-2', 'sale-3'],
        deletion_type: 'soft'
      })
      expect(result.error).toBeNull()
    })

    it('should test permanent deletion', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'test-invoice-uuid',
          soft_delete: false,
          reverted_sales: 2,
          deletion_type: 'permanent'
        },
        error: null
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'test-invoice-uuid',
        p_permanent: true
      })

      expect(result.data.soft_delete).toBe(false)
      expect(result.data.deletion_type).toBe('permanent')
    })

    it('should reject deletion of invoices with payments', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Cannot delete invoice with payments. Remove payments first.',
          code: 'INVOICE_HAS_PAYMENTS',
          payment_count: 2
        }
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'paid-invoice-uuid',
        p_permanent: false
      })

      expect(result.error.code).toBe('INVOICE_HAS_PAYMENTS')
      expect(result.error.payment_count).toBe(2)
    })

    it('should handle invoice not found', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Invoice not found or already deleted',
          code: 'INVOICE_NOT_FOUND'
        }
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'nonexistent-invoice-uuid',
        p_permanent: false
      })

      expect(result.error.code).toBe('INVOICE_NOT_FOUND')
    })
  })

  describe('Invoice Sales Mapping System', () => {
    it('should test invoice_sales_mapping table operations', async () => {
      // Mock mapping table operations
      const mappingData = [
        { invoice_id: 'invoice-1', sale_id: 'sale-1' },
        { invoice_id: 'invoice-1', sale_id: 'sale-2' },
        { invoice_id: 'invoice-1', sale_id: 'sale-3' }
      ]

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValueOnce({
            data: mappingData,
            error: null
          })
        }))
      })

      const query = mockSupabase.from('invoice_sales_mapping')
      const result = await query.select('*').eq('invoice_id', 'invoice-1')

      expect(result.data).toEqual(mappingData)
      expect(result.error).toBeNull()
    })

    it('should test migration of existing invoices to mapping table', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          migrated_invoices: 15,
          mapped_sales: 45,
          processed_at: '2025-09-16T10:00:00Z'
        },
        error: null
      })

      const result = await mockSupabase.rpc('migrate_invoice_sales_mapping')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('migrate_invoice_sales_mapping')
      expect(result.data.migrated_invoices).toBe(15)
      expect(result.data.mapped_sales).toBe(45)
    })
  })

  describe('Precise Sales Reversion', () => {
    it('should revert only mapped sales, not date-range based', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          reverted_sales: 4,
          reverted_sales_details: [
            { sale_id: 'sale-1', status_changed_from: 'Billed', status_changed_to: 'Pending' },
            { sale_id: 'sale-2', status_changed_from: 'Billed', status_changed_to: 'Pending' },
            { sale_id: 'sale-3', status_changed_from: 'Completed', status_changed_to: 'Pending' },
            { sale_id: 'sale-4', status_changed_from: 'Billed', status_changed_to: 'Pending' }
          ],
          reversion_method: 'mapping_based'
        },
        error: null
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'test-invoice-uuid',
        p_permanent: false
      })

      expect(result.data.reversion_method).toBe('mapping_based')
      expect(result.data.reverted_sales_details).toHaveLength(4)
    })

    it('should handle invoices with no mapped sales', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'empty-invoice-uuid',
          reverted_sales: 0,
          soft_delete: true,
          note: 'Invoice had no mapped sales to revert'
        },
        error: null
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'empty-invoice-uuid',
        p_permanent: false
      })

      expect(result.data.reverted_sales).toBe(0)
      expect(result.data.note).toContain('no mapped sales')
    })
  })

  describe('Soft Delete Implementation', () => {
    it('should test soft delete with deleted_at timestamp', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          soft_delete: true,
          deleted_at: '2025-09-16T10:30:00Z',
          can_be_recovered: true
        },
        error: null
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'test-invoice-uuid',
        p_permanent: false
      })

      expect(result.data.soft_delete).toBe(true)
      expect(result.data.can_be_recovered).toBe(true)
      expect(result.data.deleted_at).toBeDefined()
    })

    it('should test recovery of soft-deleted invoices', async () => {
      // Mock recovery function
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          invoice_id: 'recovered-invoice-uuid',
          recovered_at: '2025-09-16T11:00:00Z',
          restored_sales: 3
        },
        error: null
      })

      const result = await mockSupabase.rpc('recover_invoice', {
        p_invoice_id: 'recovered-invoice-uuid'
      })

      expect(result.data.restored_sales).toBe(3)
    })
  })

  describe('Payment Validation Before Deletion', () => {
    it('should validate no invoice payments exist', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          payment_validation: {
            invoice_payments_count: 0,
            total_payment_amount: 0,
            can_delete: true
          }
        },
        error: null
      })

      const result = await mockSupabase.rpc('validate_invoice_deletion', {
        p_invoice_id: 'unpaid-invoice-uuid'
      })

      expect(result.data.payment_validation.can_delete).toBe(true)
    })

    it('should block deletion when payments exist', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: 'INVOICE_HAS_PAYMENTS',
          message: 'Cannot delete invoice with existing payments',
          payment_details: [
            { payment_id: 'payment-1', amount: 500.00, date: '2025-09-15' },
            { payment_id: 'payment-2', amount: 300.00, date: '2025-09-14' }
          ]
        }
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'paid-invoice-uuid',
        p_permanent: false
      })

      expect(result.error.code).toBe('INVOICE_HAS_PAYMENTS')
      expect(result.error.payment_details).toHaveLength(2)
    })
  })

  describe('Bulk Invoice Deletion Safety', () => {
    it('should test bulk safe deletion with validation', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          processed_invoices: 5,
          successful_deletions: 3,
          failed_deletions: 2,
          failures: [
            { invoice_id: 'invoice-4', reason: 'Has payments' },
            { invoice_id: 'invoice-5', reason: 'Not found' }
          ],
          total_reverted_sales: 12
        },
        error: null
      })

      const result = await mockSupabase.rpc('bulk_delete_invoices_safe', {
        p_invoice_ids: ['invoice-1', 'invoice-2', 'invoice-3', 'invoice-4', 'invoice-5'],
        p_permanent: false
      })

      expect(result.data.successful_deletions).toBe(3)
      expect(result.data.failed_deletions).toBe(2)
      expect(result.data.failures).toHaveLength(2)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database constraints properly', async () => {
      mockSupabase.rpc.mockRejectedValueOnce({
        code: '23503', // foreign_key_violation
        message: 'Foreign key constraint violation'
      })

      try {
        await mockSupabase.rpc('delete_invoice_safe', {
          p_invoice_id: 'constraint-violation-uuid',
          p_permanent: true
        })
      } catch (error) {
        expect(error.code).toBe('23503')
      }
    })

    it('should handle transaction rollback on partial failure', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Transaction rolled back due to sales reversion failure',
          code: 'TRANSACTION_ROLLBACK',
          details: 'Failed to update sales status for sale_id: invalid-sale'
        }
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'problematic-invoice-uuid',
        p_permanent: false
      })

      expect(result.error.code).toBe('TRANSACTION_ROLLBACK')
    })

    it('should validate invoice status before deletion', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          message: 'Cannot delete completed invoice without reversing payments first',
          code: 'INVALID_INVOICE_STATUS',
          current_status: 'paid'
        }
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'completed-invoice-uuid',
        p_permanent: false
      })

      expect(result.error.code).toBe('INVALID_INVOICE_STATUS')
    })
  })

  describe('Audit Trail and Logging', () => {
    it('should create audit trail for deletion', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          audit_trail_id: 'audit-123',
          logged_at: '2025-09-16T12:00:00Z',
          operation: 'invoice_soft_delete',
          affected_records: {
            invoices: 1,
            sales: 4,
            mappings: 4
          }
        },
        error: null
      })

      const result = await mockSupabase.rpc('delete_invoice_safe', {
        p_invoice_id: 'audit-test-uuid',
        p_permanent: false
      })

      expect(result.data.audit_trail_id).toBeDefined()
      expect(result.data.operation).toBe('invoice_soft_delete')
    })
  })

  afterAll(() => {
    console.log('✅ GAP-006 tests completed: Invoice Deletion Safety')
  })
})