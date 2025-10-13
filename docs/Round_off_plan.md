# Rounding Off / Adjustment Feature - Implementation Plan

**Date**: 2025-10-11
**Status**: Planning Phase
**Version**: 1.0

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Current System Analysis](#current-system-analysis)
4. [Proposed Solutions](#proposed-solutions)
5. [Recommended Approach](#recommended-approach)
6. [Database Schema Changes](#database-schema-changes)
7. [Implementation Details](#implementation-details)
8. [Migration Strategy](#migration-strategy)
9. [Testing Strategy](#testing-strategy)
10. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### The Problem
In real-world dairy business transactions, customers often pay rounded amounts that differ from exact invoice/sale amounts:
- **Overpayment Example**: Sale of ₹13.50, customer pays ₹14 → Needs to handle ₹0.50 excess
- **Underpayment Example**: Sale of ₹13.50, customer pays ₹13 → Needs to settle ₹0.50 shortage

Currently, the system has no mechanism to handle these rounding differences, leading to:
- Payment allocation failures
- Outstanding amount discrepancies
- Manual reconciliation work
- Customer confusion

### The Solution
Implement a comprehensive rounding adjustment system that:
1. **Leverages existing infrastructure** (`invoice_line_items.adjustment` type already exists)
2. **Maintains financial integrity** with proper audit trails
3. **Automates settlement** of small rounding differences
4. **Provides flexibility** for manual overrides when needed

---

## Problem Statement

### Business Scenarios

#### Scenario 1: Cash Sale Rounding
```
Sale Amount: ₹13.50
Customer Pays: ₹14.00
Rounding Difference: +₹0.50 (overpayment)

Current Issue: No way to record or settle this ₹0.50
Required Action: System should accept ₹14 and auto-adjust ₹0.50
```

#### Scenario 2: Invoice Payment Rounding
```
Invoice Total: ₹1,432.50
Customer Pays: ₹1,433.00
Rounding Difference: +₹0.50 (overpayment)

Current Issue: Payment allocation fails due to amount mismatch
Required Action: Accept payment and create adjustment line item
```

#### Scenario 3: Underpayment Settlement
```
Sale Amount: ₹13.50
Customer Pays: ₹13.00
Rounding Difference: -₹0.50 (underpayment, not recoverable)

Current Issue: Outstanding remains ₹0.50 indefinitely
Required Action: Waive ₹0.50 as business decision
```

### Impact Areas
1. **Sales Module** - Manual cash/QR sales with rounded payments
2. **Invoices Module** - Invoice generation and payment allocation
3. **Payments Module** - Payment processing and allocation
4. **Outstanding Module** - Outstanding calculations must account for adjustments

---

## Current System Analysis

### Database Infrastructure (Already Available)

#### ✅ Adjustment Support EXISTS
```sql
-- invoice_line_items table ALREADY supports 'adjustment' type
CREATE TABLE public.invoice_line_items (
    id uuid PRIMARY KEY,
    invoice_id uuid NOT NULL,
    line_item_type varchar CHECK (line_item_type IN ('subscription', 'manual_sale', 'adjustment')),
    product_name varchar NOT NULL,
    quantity numeric NOT NULL,
    unit_price numeric NOT NULL,  -- Can be negative for discounts
    line_total numeric NOT NULL,   -- Can be negative
    gst_rate numeric DEFAULT 0,
    gst_amount numeric DEFAULT 0,
    -- Reference fields
    delivery_id uuid,
    sale_id uuid,
    order_id uuid,
    product_id uuid,
    reference_id uuid
);

-- Constraint ensures adjustment items don't have delivery/sale references
CONSTRAINT invoice_line_items_reference_check CHECK (
    (line_item_type = 'adjustment' AND delivery_id IS NULL AND sale_id IS NULL)
    OR ...
)
```

**Current Status**:
- Schema supports adjustments ✅
- Currently 0 adjustment records in use ⚠️
- No UI or business logic implemented ❌

### Payment Allocation Flow

```
┌─────────────────┐
│ Payment Created │
│   (amount: ₹N)  │
└────────┬────────┘
         │
         ▼
┌────────────────────────┐
│ Allocation Requested   │
│ (allocations array)    │
└────────┬───────────────┘
         │
         ▼
┌────────────────────────────────────┐
│ allocate_payment_atomic()          │
│ • Validates total ≤ payment amount │
│ • Creates invoice_payments records │
│ • Updates payment.amount_applied   │
│ • Updates invoice.amount_paid      │
└────────┬───────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Auto-Status Updates     │
│ • Invoice status        │
│ • Payment status        │
│ • Sales completion      │
└─────────────────────────┘
```

**Key Finding**: Payment system is **very robust** with atomic operations, but requires **exact amount matching**.

### Outstanding Calculation Logic

Current formula:
```typescript
totalOutstanding = effectiveOpeningBalance + invoiceOutstanding

where:
  effectiveOpeningBalance = opening_balance - payments_allocated_to_opening
  invoiceOutstanding = SUM(invoice.amount_outstanding) for unpaid invoices
```

**Impact**: Adjustments will automatically reduce `invoice.amount_outstanding`, which flows through to total outstanding calculations.

---

## Proposed Solutions

### Option 1: Invoice Line Item Adjustments (RECOMMENDED)

**Concept**: Use existing `invoice_line_items` with `line_item_type = 'adjustment'`

#### Advantages
- ✅ **Leverages existing schema** - Minimal database changes
- ✅ **Automatic inclusion in invoice totals** - Adjustments auto-flow to `invoice_metadata.total_amount`
- ✅ **PDF generation ready** - Invoice templates already iterate over line items
- ✅ **Audit trail built-in** - Each adjustment is a separate record
- ✅ **Flexible** - Can add multiple adjustments per invoice
- ✅ **Payment flow unchanged** - Existing allocation logic works as-is

#### Implementation
```sql
-- Example: Add ₹0.50 discount adjustment to invoice
INSERT INTO invoice_line_items (
    invoice_id,
    line_item_type,
    product_name,
    quantity,
    unit_price,
    line_total,
    gst_rate,
    gst_amount
) VALUES (
    '<invoice_id>',
    'adjustment',
    'Rounding Adjustment',  -- Descriptive name
    1,                      -- Quantity always 1 for adjustments
    -0.50,                  -- Negative for discount
    -0.50,                  -- Same as unit_price
    0,                      -- No GST on adjustments
    0
);
```

#### User Experience Flow
```
1. Generate invoice with line items
   └─> Total calculated from deliveries + manual sales

2. User reviews invoice total (e.g., ₹1,432.50)

3. User decides to round to ₹1,433.00
   └─> Clicks "Add Adjustment" button
   └─> Enters: +₹0.50 with reason "Rounding"

4. System creates adjustment line item
   └─> invoice_metadata.total_amount auto-recalculated to ₹1,433.00

5. Invoice PDF shows adjustment line
   └─> "Rounding Adjustment: +₹0.50"

6. Customer pays ₹1,433.00
   └─> Payment allocation succeeds (amount matches invoice total)
```

---

### Option 2: Dedicated Adjustment Fields in Metadata

**Concept**: Add adjustment fields directly to `invoice_metadata` table

```sql
ALTER TABLE invoice_metadata
ADD COLUMN adjustment_amount NUMERIC DEFAULT 0,
ADD COLUMN adjustment_reason TEXT,
ADD COLUMN subtotal_before_adjustment NUMERIC;
```

#### Advantages
- ✅ **Simpler query logic** - Single field instead of joining line items
- ✅ **Quick reporting** - Direct access to adjustment amounts
- ✅ **One adjustment per invoice** - Enforces simplicity

#### Disadvantages
- ❌ **Schema migration required** - Need to alter production table
- ❌ **Less flexible** - Only one adjustment per invoice
- ❌ **Duplicate tracking** - Adjustment in both metadata and line items
- ❌ **Trigger complexity** - Need triggers to sync metadata ↔ line items

**Verdict**: Not recommended due to added complexity without significant benefits.

---

### Option 3: Sales-Level Adjustments

**Concept**: Add `adjustment_amount` field to `sales` table

```sql
ALTER TABLE sales
ADD COLUMN adjustment_amount NUMERIC DEFAULT 0,
ADD COLUMN adjustment_reason TEXT;
```

#### Advantages
- ✅ **Direct cash sale handling** - Adjustments at point of sale
- ✅ **No invoice dependency** - Works for Cash/QR sales

#### Disadvantages
- ❌ **Doesn't solve invoice rounding** - Need separate invoice solution
- ❌ **Schema changes required** - Alter sales table
- ❌ **Inconsistent patterns** - Different logic for sales vs invoices

**Verdict**: Could be used in conjunction with Option 1, but not as standalone solution.

---

## Recommended Approach

### Hybrid Solution: Option 1 + Enhanced Metadata

**Primary Method**: Use invoice line item adjustments (Option 1)
**Enhancement**: Add optional metadata fields for quick access (Option 2 light)

### Database Changes

```sql
-- Migration: 006_rounding_adjustments.sql

-- STEP 1: Add metadata fields for convenience (optional, denormalized)
ALTER TABLE invoice_metadata
ADD COLUMN has_adjustment BOOLEAN DEFAULT FALSE,
ADD COLUMN net_adjustment_amount NUMERIC DEFAULT 0;

-- STEP 2: Add tracking fields to invoice_line_items
ALTER TABLE invoice_line_items
ADD COLUMN adjustment_reason TEXT,
ADD COLUMN adjustment_type VARCHAR(20) CHECK (adjustment_type IN ('rounding', 'discount', 'waiver', 'other'));

-- STEP 3: Create index for performance
CREATE INDEX idx_invoice_line_items_adjustment
ON invoice_line_items(invoice_id)
WHERE line_item_type = 'adjustment';

-- STEP 4: Add validation constraint
ALTER TABLE invoice_metadata
ADD CONSTRAINT check_total_amount_non_negative
CHECK (total_amount >= 0);

-- STEP 5: Create audit table for adjustment tracking
CREATE TABLE adjustment_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoice_metadata(id),
    sales_id UUID REFERENCES sales(id),
    adjustment_amount NUMERIC NOT NULL,
    adjustment_type VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    created_by VARCHAR(100),  -- Future: user tracking
    created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 6: Create trigger to sync metadata fields
CREATE OR REPLACE FUNCTION sync_invoice_adjustment_metadata()
RETURNS TRIGGER AS $$
DECLARE
    v_total_adjustment NUMERIC;
    v_has_adjustment BOOLEAN;
BEGIN
    -- Calculate total adjustment for this invoice
    SELECT
        COALESCE(SUM(line_total), 0),
        COUNT(*) > 0
    INTO
        v_total_adjustment,
        v_has_adjustment
    FROM invoice_line_items
    WHERE invoice_id = NEW.invoice_id
    AND line_item_type = 'adjustment';

    -- Update invoice metadata
    UPDATE invoice_metadata
    SET
        has_adjustment = v_has_adjustment,
        net_adjustment_amount = v_total_adjustment
    WHERE id = NEW.invoice_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_invoice_adjustment_metadata
AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW
WHEN (NEW.line_item_type = 'adjustment' OR OLD.line_item_type = 'adjustment')
EXECUTE FUNCTION sync_invoice_adjustment_metadata();
```

---

## Implementation Details

### Phase 1: Core Infrastructure (Week 1)

#### 1.1 Database Migration
- Create migration `006_rounding_adjustments.sql`
- Apply to development environment
- Verify triggers and constraints
- Test with sample data

#### 1.2 Server Actions Enhancement
```typescript
// src/lib/actions/adjustments.ts (NEW FILE)

"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface AdjustmentInput {
  invoiceId: string
  amount: number  // Can be positive or negative
  reason: string
  adjustmentType: 'rounding' | 'discount' | 'waiver' | 'other'
}

export async function createInvoiceAdjustment(input: AdjustmentInput) {
  const supabase = await createClient()

  try {
    // Validate invoice exists and is not paid
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoice_metadata')
      .select('id, total_amount, invoice_status')
      .eq('id', input.invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return { error: 'Invoice not found' }
    }

    if (invoice.invoice_status === 'paid') {
      return { error: 'Cannot adjust paid invoices' }
    }

    // Calculate new total
    const newTotal = invoice.total_amount + input.amount
    if (newTotal < 0) {
      return { error: 'Adjustment would make invoice total negative' }
    }

    // Create adjustment line item
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('invoice_line_items')
      .insert({
        invoice_id: input.invoiceId,
        line_item_type: 'adjustment',
        product_name: getAdjustmentDisplayName(input.adjustmentType),
        quantity: 1,
        unit_price: input.amount,
        line_total: input.amount,
        gst_rate: 0,
        gst_amount: 0,
        adjustment_reason: input.reason,
        adjustment_type: input.adjustmentType
      })
      .select()
      .single()

    if (adjustmentError) {
      return { error: `Failed to create adjustment: ${adjustmentError.message}` }
    }

    // Log adjustment for audit
    await supabase
      .from('adjustment_audit_log')
      .insert({
        invoice_id: input.invoiceId,
        adjustment_amount: input.amount,
        adjustment_type: input.adjustmentType,
        reason: input.reason
      })

    // Recalculate invoice total (automatic via database trigger)
    const { error: recalcError } = await supabase.rpc('recalculate_invoice_totals', {
      p_invoice_id: input.invoiceId
    })

    if (recalcError) {
      console.warn('Invoice total recalculation failed:', recalcError)
    }

    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/invoices/${input.invoiceId}`)

    return {
      success: true,
      adjustment,
      newTotal
    }

  } catch (error) {
    console.error('Adjustment creation error:', error)
    return {
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

function getAdjustmentDisplayName(type: string): string {
  const names = {
    'rounding': 'Rounding Adjustment',
    'discount': 'Discount',
    'waiver': 'Amount Waived',
    'other': 'Adjustment'
  }
  return names[type] || 'Adjustment'
}

export async function getInvoiceAdjustments(invoiceId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoice_line_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .eq('line_item_type', 'adjustment')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch adjustments: ${error.message}`)
  }

  return data || []
}

export async function deleteInvoiceAdjustment(adjustmentId: string) {
  const supabase = await createClient()

  try {
    // Get adjustment details for audit
    const { data: adjustment } = await supabase
      .from('invoice_line_items')
      .select('invoice_id, line_total')
      .eq('id', adjustmentId)
      .single()

    if (!adjustment) {
      return { error: 'Adjustment not found' }
    }

    // Delete adjustment
    const { error: deleteError } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('id', adjustmentId)

    if (deleteError) {
      return { error: `Failed to delete adjustment: ${deleteError.message}` }
    }

    // Recalculate invoice total
    await supabase.rpc('recalculate_invoice_totals', {
      p_invoice_id: adjustment.invoice_id
    })

    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/invoices/${adjustment.invoice_id}`)

    return { success: true }

  } catch (error) {
    console.error('Adjustment deletion error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
```

#### 1.3 Database Function for Total Recalculation
```sql
-- Create function to recalculate invoice totals
CREATE OR REPLACE FUNCTION recalculate_invoice_totals(p_invoice_id UUID)
RETURNS void AS $$
DECLARE
    v_subscription_total NUMERIC;
    v_manual_sales_total NUMERIC;
    v_adjustment_total NUMERIC;
    v_gst_total NUMERIC;
    v_grand_total NUMERIC;
BEGIN
    -- Calculate subscription items total
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subscription_total
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id
    AND line_item_type = 'subscription';

    -- Calculate manual sales total
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_manual_sales_total
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id
    AND line_item_type = 'manual_sale';

    -- Calculate adjustment total (can be negative)
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_adjustment_total
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id
    AND line_item_type = 'adjustment';

    -- Calculate GST total
    SELECT COALESCE(SUM(gst_amount), 0)
    INTO v_gst_total
    FROM invoice_line_items
    WHERE invoice_id = p_invoice_id;

    -- Calculate grand total
    v_grand_total := v_subscription_total + v_manual_sales_total + v_adjustment_total;

    -- Update invoice metadata
    UPDATE invoice_metadata
    SET
        subscription_amount = v_subscription_total,
        manual_sales_amount = v_manual_sales_total,
        total_amount = v_grand_total,
        gst_amount = v_gst_total,
        amount_outstanding = v_grand_total - COALESCE(amount_paid, 0),
        updated_at = now()
    WHERE id = p_invoice_id;

END;
$$ LANGUAGE plpgsql;
```

### Phase 2: UI Components (Week 2)

#### 2.1 Invoice Adjustment Dialog
```typescript
// src/components/invoices/adjustment-dialog.tsx

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createInvoiceAdjustment } from '@/lib/actions/adjustments'

interface AdjustmentDialogProps {
  invoiceId: string
  currentTotal: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdjustmentDialog({ invoiceId, currentTotal, open, onOpenChange }: AdjustmentDialogProps) {
  const [amount, setAmount] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'rounding' | 'discount' | 'waiver' | 'other'>('rounding')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amountNum = parseFloat(amount) || 0
  const newTotal = currentTotal + amountNum

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || amountNum === 0) {
      toast.error('Please enter an adjustment amount')
      return
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for the adjustment')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createInvoiceAdjustment({
        invoiceId,
        amount: amountNum,
        reason: reason.trim(),
        adjustmentType
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Adjustment of ₹${amountNum.toFixed(2)} applied successfully`)
        onOpenChange(false)
        setAmount('')
        setReason('')
      }
    } catch (error) {
      toast.error('Failed to create adjustment')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Invoice Adjustment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adjustment-type">Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
              <SelectTrigger id="adjustment-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rounding">Rounding</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="waiver">Waiver</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (use negative for discount)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 0.50 or -0.50"
              required
            />
            <p className="text-sm text-muted-foreground">
              Current Total: ₹{currentTotal.toFixed(2)} → New Total: ₹{newTotal.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer paid rounded amount"
              rows={3}
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Adjustment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2.2 Cash Sale Adjustment Component
```typescript
// src/components/sales/cash-sale-form-with-adjustment.tsx

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function CashSaleFormWithAdjustment() {
  const [saleAmount, setSaleAmount] = useState('')
  const [amountReceived, setAmountReceived] = useState('')

  const saleAmountNum = parseFloat(saleAmount) || 0
  const receivedNum = parseFloat(amountReceived) || 0
  const difference = receivedNum - saleAmountNum

  const needsAdjustment = Math.abs(difference) > 0 && Math.abs(difference) <= 1.0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Sale with Adjustment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sale-amount">Sale Amount</Label>
          <Input
            id="sale-amount"
            type="number"
            step="0.01"
            value={saleAmount}
            onChange={(e) => setSaleAmount(e.target.value)}
            placeholder="13.50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount-received">Amount Received</Label>
          <Input
            id="amount-received"
            type="number"
            step="0.01"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder="14.00"
          />
        </div>

        {needsAdjustment && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md space-y-2">
            <p className="font-medium text-yellow-900">
              {difference > 0 ? 'Overpayment' : 'Underpayment'} Detected
            </p>
            <p className="text-sm text-yellow-800">
              Difference: {difference > 0 ? '+' : ''}₹{difference.toFixed(2)}
            </p>
            <p className="text-xs text-yellow-700">
              This will be recorded as a rounding adjustment.
            </p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!saleAmountNum || !receivedNum}
        >
          Complete Sale
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Phase 3: PDF Template Updates (Week 2)

#### 3.1 Invoice PDF Adjustment Line
```typescript
// In src/lib/actions/invoices.ts - generateInvoiceHTML()

// Add adjustment items to invoice HTML
${(invoiceData.adjustmentItems || []).map(item => `
  <tr class="adjustment-row">
    <td>${item.productName}</td>
    <td style="text-align: center;">1</td>
    <td style="text-align: center;">₹ ${item.unitPrice.toFixed(2)}</td>
    <td class="${item.totalAmount < 0 ? 'text-red-600' : 'text-green-600'}">
      ${item.totalAmount >= 0 ? '+' : ''}₹ ${item.totalAmount.toFixed(2)}
    </td>
  </tr>
`).join('')}
```

#### 3.2 CSS Styles for Adjustments
```css
<style>
  .adjustment-row {
    background-color: #f0f9ff; /* Light blue background */
    font-style: italic;
  }

  .adjustment-row td {
    border: 1px dashed #93c5fd; /* Dashed border to distinguish */
  }
</style>
```

---

## Migration Strategy

### Development Environment
```bash
# 1. Create migration file
cd supabase/migrations
touch 006_rounding_adjustments.sql

# 2. Apply migration locally using Supabase MCP
Task: Apply migration 006_rounding_adjustments.sql to development database

# 3. Test with sample data
psql> INSERT INTO invoice_line_items ...  -- Create test adjustment
psql> SELECT * FROM invoice_metadata WHERE id = ...  -- Verify total updated

# 4. Verify triggers
psql> SELECT * FROM pg_trigger WHERE tgname LIKE '%adjustment%';

# 5. Test rollback
psql> BEGIN;
psql> DELETE FROM invoice_line_items WHERE line_item_type = 'adjustment';
psql> ROLLBACK;
```

### Staging Environment
1. Backup database: `pg_dump milk_subs > backup_pre_adjustment.sql`
2. Apply migration in transaction: `BEGIN; \i 006_rounding_adjustments.sql; COMMIT;`
3. Verify schema: `\d+ invoice_line_items`, `\d+ invoice_metadata`
4. Run integration tests
5. Test with real-world scenarios

### Production Deployment
**Pre-Deployment Checklist:**
- [ ] Database backup completed
- [ ] Migration tested on staging
- [ ] Rollback plan documented
- [ ] Downtime window scheduled (if needed)
- [ ] User communication sent

**Deployment Steps:**
```sql
-- Step 1: Enable maintenance mode (optional)
UPDATE system_config SET maintenance_mode = TRUE;

-- Step 2: Apply migration in transaction
BEGIN;
    -- Run migration script
    \i supabase/migrations/006_rounding_adjustments.sql

    -- Verify critical constraints
    SELECT COUNT(*) FROM invoice_line_items WHERE line_item_type = 'adjustment';
    -- Expected: 0 (no adjustments yet)

COMMIT;

-- Step 3: Verify deployment
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'invoice_line_items'
AND column_name IN ('adjustment_reason', 'adjustment_type');

-- Step 4: Test adjustment creation
-- (Use admin UI or SQL)

-- Step 5: Disable maintenance mode
UPDATE system_config SET maintenance_mode = FALSE;
```

---

## Testing Strategy

### Unit Tests
```typescript
// tests/unit/adjustments.test.ts

import { describe, it, expect } from 'vitest'
import { createInvoiceAdjustment, calculateAdjustedTotal } from '@/lib/actions/adjustments'

describe('Invoice Adjustments', () => {
  it('should create positive rounding adjustment', async () => {
    const result = await createInvoiceAdjustment({
      invoiceId: 'test-invoice-1',
      amount: 0.50,
      reason: 'Customer paid rounded amount',
      adjustmentType: 'rounding'
    })

    expect(result.success).toBe(true)
    expect(result.newTotal).toBeGreaterThan(0)
  })

  it('should reject adjustment that makes total negative', async () => {
    const result = await createInvoiceAdjustment({
      invoiceId: 'test-invoice-1',
      amount: -5000,  // Way too large discount
      reason: 'Test',
      adjustmentType: 'discount'
    })

    expect(result.error).toContain('negative')
  })

  it('should prevent adjustment on paid invoice', async () => {
    const result = await createInvoiceAdjustment({
      invoiceId: 'paid-invoice-1',
      amount: 0.50,
      reason: 'Test',
      adjustmentType: 'rounding'
    })

    expect(result.error).toContain('paid invoices')
  })
})
```

### Integration Tests
```typescript
// tests/integration/adjustment-payment-flow.test.ts

describe('Adjustment Payment Flow', () => {
  it('should allow payment allocation with adjustment', async () => {
    // 1. Create invoice with deliveries (total: ₹1,432.50)
    const invoice = await createTestInvoice()

    // 2. Add rounding adjustment (+₹0.50)
    await createInvoiceAdjustment({
      invoiceId: invoice.id,
      amount: 0.50,
      reason: 'Rounding',
      adjustmentType: 'rounding'
    })

    // 3. Verify new total
    const updatedInvoice = await getInvoice(invoice.id)
    expect(updatedInvoice.total_amount).toBe(1433.00)

    // 4. Create payment for new total
    const payment = await createPayment({
      customer_id: invoice.customer_id,
      amount: 1433.00,
      payment_date: new Date()
    })

    // 5. Allocate payment to invoice
    const allocation = await allocatePayment(payment.id, [{
      invoiceId: invoice.id,
      amount: 1433.00
    }])

    expect(allocation.success).toBe(true)

    // 6. Verify invoice marked as paid
    const paidInvoice = await getInvoice(invoice.id)
    expect(paidInvoice.invoice_status).toBe('paid')
  })
})
```

### Manual Test Scenarios
```markdown
## Scenario 1: Invoice Rounding Up
1. Generate invoice for customer with total ₹1,432.50
2. Click "Add Adjustment" button
3. Select "Rounding" type
4. Enter amount: +0.50
5. Enter reason: "Customer requested rounded amount"
6. Save adjustment
7. Verify invoice total shows ₹1,433.00
8. Generate PDF and verify adjustment line appears
9. Create payment for ₹1,433.00
10. Allocate to invoice
11. Verify invoice marked as paid

## Scenario 2: Cash Sale Overpayment
1. Create cash sale for ₹13.50
2. Enter received amount: ₹14.00
3. System detects ₹0.50 overpayment
4. Complete sale with auto-adjustment
5. Verify sale recorded as ₹14.00 with adjustment
6. Check daily sales report shows correct amounts

## Scenario 3: Multiple Adjustments
1. Create invoice with total ₹500.00
2. Add discount adjustment: -₹50.00 (reason: "Loyalty discount")
3. Verify total: ₹450.00
4. Add rounding adjustment: +₹0.50 (reason: "Rounding")
5. Verify final total: ₹450.50
6. Generate PDF and verify both adjustments shown

## Scenario 4: Outstanding Calculation
1. Customer has opening balance: ₹1,000.00
2. Create invoice with adjustment (₹500.00 → ₹498.00)
3. Verify outstanding shows: ₹1,498.00
4. Create payment: ₹498.00
5. Allocate to invoice
6. Verify outstanding updated to: ₹1,000.00
```

---

## Business Rules & Validations

### Adjustment Limits
```typescript
const ADJUSTMENT_RULES = {
  maxRoundingAmount: 1.00,      // Max ₹1 for rounding
  maxDiscountPercent: 10,        // Max 10% discount
  maxWaiverAmount: 100.00,       // Max ₹100 waiver
  requiresReason: true,          // Reason always mandatory
  requiresApproval: {            // Future: approval workflow
    amount: 50.00,               // Adjustments > ₹50 need approval
    enabled: false               // Not implemented in Phase 1
  }
}

function validateAdjustment(
  amount: number,
  type: string,
  invoiceTotal: number
): { valid: boolean; error?: string } {

  if (type === 'rounding' && Math.abs(amount) > ADJUSTMENT_RULES.maxRoundingAmount) {
    return { valid: false, error: 'Rounding adjustment cannot exceed ₹1.00' }
  }

  if (type === 'discount') {
    const discountPercent = Math.abs(amount) / invoiceTotal * 100
    if (discountPercent > ADJUSTMENT_RULES.maxDiscountPercent) {
      return { valid: false, error: 'Discount cannot exceed 10% of invoice total' }
    }
  }

  if (type === 'waiver' && Math.abs(amount) > ADJUSTMENT_RULES.maxWaiverAmount) {
    return { valid: false, error: 'Waiver amount cannot exceed ₹100.00' }
  }

  return { valid: true }
}
```

### Audit Trail Requirements
Every adjustment must log:
- Invoice ID or Sales ID
- Adjustment amount
- Adjustment type
- Reason
- Timestamp
- User ID (future enhancement)

### Reporting Requirements
Monthly reports must include:
- Total adjustments by type
- Total rounding adjustments (positive vs negative)
- Customer-wise adjustment summary
- Adjustment impact on revenue

---

## Future Enhancements

### Phase 4: Advanced Features (Month 2+)

#### 1. Auto-Rounding
```typescript
// Automatically suggest rounding when invoice total ends in .25, .50, or .75
function suggestAutoRounding(invoiceTotal: number): number | null {
  const decimal = invoiceTotal % 1

  if (decimal === 0) return null  // Already rounded

  // Round to nearest rupee if within ₹0.50
  if (decimal >= 0.50) {
    return Math.ceil(invoiceTotal) - invoiceTotal  // Round up
  } else {
    return Math.floor(invoiceTotal) - invoiceTotal  // Round down
  }
}
```

#### 2. Bulk Adjustment Operations
- Apply same adjustment to multiple invoices
- Bulk waiver for small outstanding amounts (<₹5)
- Month-end rounding for all open invoices

#### 3. Customer-Specific Rounding Preferences
```sql
ALTER TABLE customers
ADD COLUMN auto_round_invoices BOOLEAN DEFAULT FALSE,
ADD COLUMN rounding_preference VARCHAR(10) CHECK (rounding_preference IN ('up', 'down', 'nearest'));
```

#### 4. Adjustment Approval Workflow
- Multi-level approval for large adjustments
- Approval history tracking
- Email notifications

#### 5. Comprehensive Adjustment Analytics
- Adjustment trends over time
- Impact on profit margins
- Customer-wise adjustment patterns
- Anomaly detection (unusual adjustments)

---

## Appendix

### A. SQL Queries for Common Operations

#### A.1 Find All Invoices with Adjustments
```sql
SELECT
    im.invoice_number,
    c.billing_name,
    im.total_amount,
    ili.line_total as adjustment_amount,
    ili.adjustment_reason,
    ili.created_at
FROM invoice_metadata im
JOIN customers c ON im.customer_id = c.id
JOIN invoice_line_items ili ON im.id = ili.invoice_id
WHERE ili.line_item_type = 'adjustment'
ORDER BY ili.created_at DESC;
```

#### A.2 Calculate Total Adjustments by Type
```sql
SELECT
    adjustment_type,
    COUNT(*) as adjustment_count,
    SUM(line_total) as total_adjustment_amount,
    AVG(line_total) as avg_adjustment_amount
FROM invoice_line_items
WHERE line_item_type = 'adjustment'
GROUP BY adjustment_type
ORDER BY adjustment_count DESC;
```

#### A.3 Find Customers with Most Adjustments
```sql
SELECT
    c.billing_name,
    COUNT(ili.id) as adjustment_count,
    SUM(ili.line_total) as total_adjustments
FROM customers c
JOIN invoice_metadata im ON c.id = im.customer_id
JOIN invoice_line_items ili ON im.id = ili.invoice_id
WHERE ili.line_item_type = 'adjustment'
GROUP BY c.id, c.billing_name
ORDER BY adjustment_count DESC
LIMIT 20;
```

### B. API Endpoints

#### B.1 Create Adjustment
```
POST /api/invoices/{invoiceId}/adjustments
Content-Type: application/json

{
  "amount": 0.50,
  "adjustmentType": "rounding",
  "reason": "Customer paid rounded amount"
}

Response:
{
  "success": true,
  "adjustment": {
    "id": "uuid",
    "amount": 0.50,
    "newTotal": 1433.00
  }
}
```

#### B.2 Get Invoice Adjustments
```
GET /api/invoices/{invoiceId}/adjustments

Response:
{
  "adjustments": [
    {
      "id": "uuid",
      "amount": 0.50,
      "type": "rounding",
      "reason": "Customer paid rounded amount",
      "createdAt": "2025-10-11T10:30:00Z"
    }
  ],
  "totalAdjustments": 0.50
}
```

### C. Glossary

| Term | Definition |
|------|------------|
| **Adjustment** | A modification to an invoice or sale amount to handle rounding, discounts, or waivers |
| **Rounding Adjustment** | Specifically for handling customer payments of rounded amounts (typically ≤₹1) |
| **Line Item** | A single row in an invoice representing a product or adjustment |
| **Waiver** | An adjustment that writes off an amount that will not be collected |
| **Discount** | A price reduction applied as an adjustment |
| **Atomic Operation** | A database operation that completes entirely or not at all, preventing partial updates |
| **Audit Trail** | A chronological record of system activities for accountability |

---

## Summary & Next Steps

### Recommended Implementation
1. ✅ **Use invoice line item adjustments** (leverages existing infrastructure)
2. ✅ **Add metadata fields for convenience** (denormalized for performance)
3. ✅ **Create comprehensive audit logging**
4. ✅ **Implement UI components** (dialog, form enhancements)
5. ✅ **Update PDF templates** to show adjustments
6. ✅ **Add business rules & validations**

### Timeline
- **Week 1**: Database migration + Server actions
- **Week 2**: UI components + PDF templates
- **Week 3**: Testing + Bug fixes
- **Week 4**: Staging deployment + User training

### Success Metrics
- Payment allocation success rate: >99%
- Outstanding discrepancies: <1% of customers
- User adoption of adjustment feature: >80%
- Audit compliance: 100% of adjustments logged

### Risk Mitigation
- Comprehensive testing strategy
- Transaction-based migrations
- Rollback plan documented
- User training materials prepared
- Gradual rollout (development → staging → production)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Author**: Claude Code
**Status**: Ready for Review & Implementation
