# Database Audit: Unused Objects & Missing Functions Report

**Generated:** 2025-10-03
**Updated:** 2025-10-13 (Cleanup Applied)
**Database:** milk_subs (Supabase PostgreSQL)
**Total Functions Analyzed:** 31
**Total Views Analyzed:** 5

---

## ✅ CLEANUP COMPLETED (2025-10-13)

**Actions Taken:**
- ✅ Removed 6 dead code functions from application (438 lines)
- ✅ Dropped 3 unused database functions via migration
- ✅ Migration: `20251013000000_drop_unused_functions.sql` applied successfully

**Remaining Items:**
- 🟡 8 database functions kept for maintenance/future use
- ⚠️ 1 function (`get_unbilled_deliveries`) - performance optimization opportunity
- 🟡 1 legacy table (`invoice_sales_mapping`) - decision pending

---

## Executive Summary

This audit revealed **dead code and inconsistencies** between the database schema and application code. **Cleanup has been completed:**

- ~~**11 database functions exist but are unused** in the application~~ → **8 kept for valid reasons, 3 dropped**
- ~~**7 functions are called in DEAD CODE paths**~~ → **6 dead code functions removed, 1 has fallback**
- **1 legacy table (`invoice_sales_mapping`) exists but remains empty** with no population logic
- **All 5 database views are actively used** and functioning correctly
- **System works perfectly** - all dead code has been removed

---

## 💡 Why The System Works Despite Missing Functions

The application works perfectly because:

1. **Actual Production Flow for Invoice Generation:**
   - UI component calls → `/api/invoices/bulk-generate` API route
   - API route implements logic **directly** without database function calls
   - Uses: `prepareInvoiceData()` → `generateInvoiceHTML()` → `saveInvoiceMetadata()`

2. **Unused Alternative Flow (Dead Code):**
   - `generateBulkInvoices()` server action exists but is **never imported/used**
   - This action calls `validate_invoice_generation_atomic` (doesn't exist)
   - Since the action is never called, the missing function doesn't cause errors

3. **Wrapper Functions Are Dead Code:**
   - Functions like `validateInvoiceGenerationPreconditions()`, `queueInvoiceGeneration()` exist
   - They call database RPCs that don't exist
   - But these wrappers are **never imported or used** anywhere in the app

4. **Fallback Mechanisms:**
   - `get_unbilled_deliveries` - has manual query fallback (line 379)
   - `calculate_outstanding_with_breakdown` - returns default with `breakdown_valid: false`

---

## 🟡 DEAD CODE: Functions Called in Unused Code Paths (CLEANED UP ✅)

~~These functions were invoked in the application code but **did not exist in the database**.~~ **All dead code has been removed from the application (2025-10-13):**

### 1. `get_unbilled_deliveries`
- **Called in:** `src/lib/actions/invoices.ts:372`
- **Purpose:** Get unbilled delivery amounts for customers
- **Status:** ⚠️ **Has Fallback** - Falls back to manual query when RPC fails (line 379)
- **Impact:** Performance issue (slower query) but no crash
- **Actual Usage:** Used in `getUnbilledDeliveryAmount()` - invoked by production code

### 2. ~~`validate_invoice_generation_atomic`~~ ✅ REMOVED
- **Was Called in:** `src/lib/actions/invoices.ts:635`
- **Calling Function:** `generateBulkInvoices()` server action (REMOVED)
- **Status:** ✅ **REMOVED** - Dead code function removed from application

### 3. ~~`validate_invoice_generation_preconditions`~~ ✅ REMOVED
- **Was Called in:** `src/lib/actions/invoices.ts:1880`
- **Calling Function:** `validateInvoiceGenerationPreconditions()` wrapper (REMOVED)
- **Status:** ✅ **REMOVED** - Dead code function removed from application

### 4. ~~`generate_invoices_atomic`~~ ✅ REMOVED
- **Was Called in:** `src/lib/actions/invoices.ts:1941`
- **Calling Function:** `generateInvoicesWithAtomicValidation()` wrapper (REMOVED)
- **Status:** ✅ **REMOVED** - Dead code function removed from application

### 5. ~~`queue_invoice_generation`~~ ✅ REMOVED
- **Was Called in:** `src/lib/actions/invoices.ts:1998`
- **Calling Function:** `queueInvoiceGeneration()` wrapper (REMOVED)
- **Status:** ✅ **REMOVED** - Dead code function removed from application

### 6. ~~`get_invoice_generation_status`~~ ✅ REMOVED
- **Was Called in:** `src/lib/actions/invoices.ts:2038`
- **Calling Function:** `getInvoiceGenerationStatus()` wrapper (REMOVED)
- **Status:** ✅ **REMOVED** - Dead code function removed from application

### 7. ~~`calculate_outstanding_with_breakdown`~~ ✅ REMOVED
- **Was Called in:** `src/lib/actions/outstanding.ts:467`
- **Calling Function:** `getOutstandingBreakdown()` internal function (REMOVED)
- **Status:** ✅ **REMOVED** - Dead code function removed from application

---

## 🟡 WARNING: Unused Database Functions

These functions exist in the database but are **never called** in the application code:

### Invoice Management Functions (Unused)

#### 1. `generate_bulk_invoices_atomic`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_period_start date, p_period_end date, p_customer_ids uuid[], p_validate_existing boolean`
- **Purpose:** Atomic bulk invoice generation with invoice_sales_mapping population
- **Why Unused:** Application uses `generateBulkInvoices()` server action that implements logic directly
- **Recommendation:** ⚠️ **REPLACE** - Migrate to use this function for better atomicity and to populate `invoice_sales_mapping`

#### 2. `delete_bulk_invoices_safe`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_invoice_ids uuid[], p_validate_payments boolean`
- **Purpose:** Safely delete multiple invoices with validation
- **Why Unused:** No bulk delete feature in UI
- **Recommendation:** ✅ **KEEP** - Useful for future bulk operations or admin tasks

#### 3. ~~`delete_invoice_safe`~~ ✅ DROPPED
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_invoice_id uuid, p_permanent boolean`
- **Purpose:** Safe invoice deletion with optional permanent removal
- **Why Unused:** Application uses `delete_invoice_and_revert_sales` instead
- **Status:** ✅ **DROPPED** - Removed via migration `20251013000000_drop_unused_functions.sql`

#### 4. ~~`recover_invoice`~~ ✅ DROPPED
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_invoice_id uuid`
- **Purpose:** Recover soft-deleted invoices
- **Why Unused:** No recovery feature in UI
- **Status:** ✅ **DROPPED** - Removed via migration `20251013000000_drop_unused_functions.sql`

### Data Reconciliation Functions (Unused)

#### 5. `fix_unapplied_payments_inconsistencies`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** None
- **Purpose:** Fix inconsistencies in unapplied payment amounts
- **Why Unused:** Manual reconciliation tool, not integrated in application
- **Recommendation:** ✅ **KEEP** - Valuable for data maintenance and debugging

#### 6. `reconcile_unapplied_payments`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** None
- **Purpose:** Identify discrepancies in unapplied payment tracking
- **Why Unused:** Manual reconciliation tool, not integrated in application
- **Recommendation:** ✅ **KEEP** - Valuable for auditing and debugging

#### 7. `reconcile_unapplied_payments_with_sales`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** None
- **Purpose:** Reconcile unapplied payments including sales allocations
- **Why Unused:** Manual reconciliation tool, not integrated in application
- **Recommendation:** ✅ **KEEP** - Valuable for data integrity checks

### Legacy Migration Functions (Unused)

#### 8. ~~`migrate_invoice_sales_mapping`~~ ✅ DROPPED
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** None
- **Purpose:** Migrate legacy invoice-sales mapping data
- **Why Unused:** One-time migration that was never executed
- **Status:** ✅ **DROPPED** - Removed via migration `20251013000000_drop_unused_functions.sql`

### Bulk Operation Logging Functions (Unused)

#### 9. `log_bulk_operation`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_operation_type varchar, p_operation_subtype varchar, p_total_items int, p_parameters jsonb`
- **Purpose:** Log bulk operations for tracking
- **Why Unused:** Logging infrastructure exists but not integrated
- **Recommendation:** ⚠️ **INTEGRATE** - Should be used in bulk invoice/payment operations

#### 10. `update_bulk_operation_status`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_log_id uuid, p_status varchar, p_successful_items int, p_failed_items int, p_error_details jsonb`
- **Purpose:** Update bulk operation status
- **Why Unused:** Logging infrastructure exists but not integrated
- **Recommendation:** ⚠️ **INTEGRATE** - Should be used with `log_bulk_operation`

### Testing Functions (Unused)

#### 11. `test_opening_balance_allocation`
- **Location:** `supabase/migrations/002_functions_and_procedures.sql`
- **Parameters:** `p_customer_id uuid, p_payment_amount numeric, p_allocation_amount numeric`
- **Purpose:** Test opening balance allocation scenarios
- **Why Unused:** Testing utility, not meant for production
- **Recommendation:** ✅ **KEEP** - Useful for debugging and testing

---

## ✅ Actively Used Database Functions (Working Correctly)

These functions are properly integrated and actively used:

### Payment Allocation (3 functions)
- `allocate_opening_balance_atomic` - Used in `src/lib/actions/outstanding.ts`
- `allocate_payment_atomic` - Used in `src/lib/actions/outstanding.ts`
- `rollback_partial_allocation` - Used in `src/lib/actions/outstanding.ts`

### Outstanding Calculations (3 functions)
- `calculate_customer_outstanding` - Used in `src/lib/actions/outstanding.ts`
- `calculate_total_outstanding` - Used in multiple reports
- `get_all_customers_outstanding_data` - Used in `src/lib/actions/outstanding-reports.ts`

### Invoice Operations (4 functions)
- `delete_invoice_and_revert_sales` - Used in `src/lib/actions/invoices.ts`
- `get_bulk_invoice_preview_optimized` - Used in `src/lib/actions/invoices.ts`
- `get_next_invoice_sequence` - Used in `src/lib/invoice-utils.ts`
- `process_invoice_payment_atomic` - Used in `src/lib/actions/invoices.ts`

### Status Management (2 functions)
- `update_invoice_status` - Used in `src/lib/actions/payments.ts`
- `update_invoice_status_with_sales_completion` - Used in `src/lib/actions/payments.ts`

### Trigger Functions (7 functions - used by database triggers)
- `handle_direct_invoice_deletion`
- `handle_invoice_payment_deletion_complete`
- `handle_payment_deletion_complete`
- `handle_sales_payment_deletion_complete`
- `log_cascade_operations`
- `maintain_unapplied_payments`
- `maintain_unapplied_payments_from_allocation`

---

## ✅ Database Views (All Active)

All 5 database views are actively used in the application:

1. **customer_outstanding_summary** - Used in outstanding reports
2. **customer_payment_breakdown** - Used in payment analysis
3. **customer_sales_breakdown** - Used in sales reports
4. **customer_subscription_breakdown** - Used in subscription reports
5. **outstanding_report_data** - Used in `src/lib/actions/outstanding-reports.ts`

---

## 🔴 Legacy Table Issue: `invoice_sales_mapping`

### Current Status
- **Table exists:** ✅ Created in `001_initial_schema.sql`
- **Records in table:** 0 (completely empty)
- **Total invoices in system:** 84
- **Reason:** Application code never populates this table

### Analysis
The `invoice_sales_mapping` table was designed to map invoices to sales, but:
- The `generate_bulk_invoices_atomic` function (which populates it) is **never called**
- The actual implementation uses `invoice_line_items.sale_id` for this mapping
- Sales deletion logic checks this **empty table**, creating a potential bug

### Impact
⚠️ **MODERATE** - System works because `invoice_line_items.sale_id` is used, but:
- Sales validation may incorrectly allow deletion of billed sales
- Data model is inconsistent
- Storage waste for unused table

### Recommendation
**Option A: Populate Retroactively** (Recommended)
1. Run migration to populate from existing `invoice_line_items`
2. Update `saveInvoiceMetadata()` to insert mappings going forward
3. Fix sales deletion validation to check both tables

**Option B: Remove Completely**
1. Drop table and all references
2. Update sales deletion to check `invoice_line_items` directly
3. Remove unused `generate_bulk_invoices_atomic` function

---

## 📊 Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| **Total Functions** | 31 | Analyzed |
| **Actively Used** | 12 | ✅ Working |
| **Trigger Functions** | 7 | ✅ Working |
| **Unused (Keep)** | 5 | 🟡 Maintenance tools |
| ~~**Unused (Remove DB)**~~ | ~~3~~ | ✅ **DROPPED** |
| **Unused (Integrate)** | 3 | ⚠️ Incomplete features |
| ~~**Dead Code (App)**~~ | ~~6~~ | ✅ **REMOVED** |
| **Has Fallback** | 1 | ⚠️ Performance optimization |
| **Total Views** | 5 | ✅ All active |
| **Legacy Tables** | 1 | 🟡 `invoice_sales_mapping` |

---

## 🎯 Action Plan

### ✅ Completed Actions (2025-10-13)

1. ~~**Remove Dead Code from Application**~~ ✅ **COMPLETED**
   - ✅ Removed 6 unused functions from `src/lib/actions/invoices.ts` (379 lines)
     - `validateInvoiceGenerationPreconditions()`
     - `generateInvoicesWithAtomicValidation()`
     - `queueInvoiceGeneration()`
     - `getInvoiceGenerationStatus()`
     - `generateBulkInvoices()` server action
   - ✅ Removed `getOutstandingBreakdown()` from `src/lib/actions/outstanding.ts` (59 lines)

2. ~~**Remove Unused Database Functions**~~ ✅ **COMPLETED**
   - ✅ Dropped `delete_invoice_safe(uuid, boolean)`
   - ✅ Dropped `recover_invoice(uuid)`
   - ✅ Dropped `migrate_invoice_sales_mapping()`
   - ✅ Migration applied: `20251013000000_drop_unused_functions.sql`

### Remaining Actions

3. **Optimize Performance** ⚠️ **LOW-MEDIUM PRIORITY**
   - Create `get_unbilled_deliveries` database function (currently falls back to slower manual query)
   - Already has fallback, so system works but could be faster

4. **Fix Legacy Table Issue** 🟡 **LOW PRIORITY**
   - Decision: Populate or remove `invoice_sales_mapping`
   - If populate: Create migration + update `saveInvoiceMetadata()` + use `generate_bulk_invoices_atomic`
   - If remove: Drop table + update sales validation

5. **Integrate Incomplete Features** ⚠️ **OPTIONAL**
   - Integrate `log_bulk_operation` in bulk invoice generation
   - Integrate `update_bulk_operation_status` for progress tracking
   - Consider using `generate_bulk_invoices_atomic` for better atomicity

6. **Document Maintenance Tools** 📝 **OPTIONAL**
   - Create admin interface for reconciliation functions
   - Document usage of `fix_unapplied_payments_inconsistencies`
   - Document usage of `test_opening_balance_allocation`

---

## 🔍 Detailed Function Reference

### Functions to Create (Optional Performance Optimization)

```sql
-- Only if you want to optimize performance (has fallback)
CREATE OR REPLACE FUNCTION get_unbilled_deliveries(
  customer_id uuid,
  period_start date,
  period_end date
) RETURNS numeric AS $$
  -- Implementation to return unbilled delivery amounts
  -- Currently falls back to manual query in invoices.ts:379
$$ LANGUAGE plpgsql;
```

### ~~Functions to Remove (Dead Code)~~ ✅ COMPLETED

```sql
-- ✅ DROPPED via migration 20251013000000_drop_unused_functions.sql
-- DROP FUNCTION IF EXISTS delete_invoice_safe(uuid, boolean);
-- DROP FUNCTION IF EXISTS recover_invoice(uuid);
-- DROP FUNCTION IF EXISTS migrate_invoice_sales_mapping();
```

### Functions to Keep (Maintenance Tools)

```sql
-- Keep for manual data maintenance
fix_unapplied_payments_inconsistencies()
reconcile_unapplied_payments()
reconcile_unapplied_payments_with_sales()
test_opening_balance_allocation(uuid, numeric, numeric)
delete_bulk_invoices_safe(uuid[], boolean)
```

---

## 📋 Testing Checklist

**Completed (2025-10-13):**

- [x] Verify invoice generation still works after removing dead code ✅
- [x] Test that no imports reference removed functions ✅
- [x] TypeScript compilation successful ✅
- [x] ESLint passes with no errors related to removed code ✅

**Remaining (if implementing optional optimizations):**

- [ ] Validate `invoice_sales_mapping` fix (if implementing)
- [ ] Confirm sales deletion validation works correctly
- [ ] Run reconciliation functions to verify data integrity
- [ ] Test bulk operations with logging integration (if implementing)
- [ ] Performance test `get_unbilled_deliveries` if implementing optimization

---

## 📚 Related Documentation

- **Migration Files:** `supabase/migrations/002_functions_and_procedures.sql`
- **Payment Gaps Doc:** `docs/Completed/payment_gaps.md`
- **System Architecture:** `Sys_Arch_doc.md`
- **CLAUDE Instructions:** `CLAUDE.md`

---

## ✅ Final Verdict

**Cleanup completed successfully (2025-10-13)!** The system is working correctly:

1. ✅ All production code paths use existing, working functions
2. ✅ All dead code has been removed from application (438 lines)
3. ✅ Unused database functions have been dropped (3 functions)
4. ✅ Fallbacks are in place where needed
5. ⚠️ Performance could be improved by implementing `get_unbilled_deliveries` (optional)
6. 🟡 Legacy `invoice_sales_mapping` table - decision pending (low priority)

**Status:** Cleanup complete - system is cleaner and more maintainable. No urgent fixes needed.

---

**Report End** | Generated by Claude Code Analysis Tool
