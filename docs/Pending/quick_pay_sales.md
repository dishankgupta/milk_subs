# Quick Pay Feature for Sales History

## Overview
Add a "Quick Pay" button to the sales history triple-dot menu that streamlines payment creation for pending credit sales with date picker functionality.

## Business Requirement
Enable users to quickly process payments for pending credit sales directly from the sales history page without navigating through the full payment creation flow.

## Implementation Steps

### 1. Create QuickPayModal Component
- **Location**: `src/components/sales/QuickPayModal.tsx`
- **Inputs**:
  - Payment date (date picker component - user selectable)
  - Payment method (select dropdown)
- **Validation**: Simple Zod schema for the two fields
- **UI**: Clean modal with form + confirm/cancel buttons
- **Default**: Payment date defaults to today but user can change it

### 2. Server Action
- **Location**: Add `quickPaySale()` to `src/lib/actions/sales.ts`
- **Parameters**: `saleId`, `paymentDate`, `paymentMethod`
- **Logic**:
  1. Get sale details (customer_id, total_amount)
  2. Create payment using existing `createPayment()`
  3. Immediately allocate to sale using `allocatePaymentToSales()`
  4. Return success/error response

### 3. UI Integration
- **Location**: `src/app/dashboard/sales/history/sales-history-table.tsx`
- **Changes**:
  1. Add QuickPayModal import and state management
  2. Add "Quick Pay" option to existing DropdownMenu (lines 609-629)
  3. Conditional visibility: Only show for Credit + Pending sales
  4. Handle modal open/close + success refresh

### 4. Type Updates
- **Location**: Update relevant TypeScript interfaces for new action

## Conditional Logic
```typescript
// Show Quick Pay only for pending credit sales
{sale.sale_type === 'Credit' && sale.payment_status === 'Pending' && (
  <DropdownMenuItem onClick={() => handleQuickPay(sale)}>
    <CreditCard className="h-4 w-4 mr-2" />
    Quick Pay
  </DropdownMenuItem>
)}
```

## User Experience Flow
1. Navigate to `/dashboard/sales/history`
2. Find pending credit sale → Click three dots menu
3. "Quick Pay" option appears (only for pending credit sales)
4. Modal opens with:
   - **Payment Date**: Date picker (defaults to today, user can change)
   - **Payment Method**: Dropdown (Cash, UPI, Card, etc.)
5. User selects desired payment date and method
6. Click confirm → Payment created + allocated + sale status updated to "Completed"
7. Success toast + automatic table refresh

## Technical Integration Benefits
- Leverages existing direct payment allocation system
- Minimal code changes to existing components
- Consistent with current UI patterns
- No impact on other payment workflows
- Utilizes our new `allocatePaymentToSales()` function

## Modal Component Structure
```typescript
interface QuickPayModalProps {
  sale: Sale
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface QuickPayFormData {
  payment_date: Date
  payment_method: string
}
```

## Payment Methods
Standard dropdown options:
- Cash
- UPI
- Card
- Bank Transfer
- Cheque

## Validation Schema
```typescript
const quickPaySchema = z.object({
  payment_date: z.date({ message: "Payment date is required" }),
  payment_method: z.string().min(1, "Payment method is required")
})
```

## Status: Pending Implementation
This feature will provide a streamlined payment experience for users managing day-to-day sales transactions while maintaining full audit trail and leveraging the new direct payment allocation system.