-- Migration: Drop Unused Database Functions
-- Date: 2025-10-13
-- Description: Remove dead database functions that are never called in the application code
-- Reference: docs/database-audit-unused-objects.md

-- Drop unused invoice management functions
DROP FUNCTION IF EXISTS delete_invoice_safe(uuid, boolean);
DROP FUNCTION IF EXISTS recover_invoice(uuid);

-- Drop unused legacy migration function
DROP FUNCTION IF EXISTS migrate_invoice_sales_mapping();

-- Note: The following functions are KEPT as they serve important purposes:
-- - fix_unapplied_payments_inconsistencies() - Manual data maintenance tool
-- - reconcile_unapplied_payments() - Auditing and debugging tool
-- - reconcile_unapplied_payments_with_sales() - Data integrity checks
-- - test_opening_balance_allocation() - Testing and debugging utility
-- - delete_bulk_invoices_safe() - Future bulk operations support
-- - log_bulk_operation() - Potential future integration for progress tracking
-- - update_bulk_operation_status() - Potential future integration for status updates
-- - generate_bulk_invoices_atomic() - Better atomicity option for future use
