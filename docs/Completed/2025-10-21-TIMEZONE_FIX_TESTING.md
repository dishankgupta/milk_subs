# Timezone Fix Testing Plan

## Overview
This document outlines comprehensive testing procedures for the timezone double conversion bug fix.

**Bug Fixed**: Dates showing next day in the evening (after 6:30 PM IST) and month-end dates showing as next month.

**Root Cause**: Double timezone conversion when using `getCurrentISTDate()` with `formatDateIST()`.

**Solution**: Use `new Date()` directly and let formatting functions handle IST conversion.

---

## Automated Tests

### 1. Run Existing Tests
```bash
# Run all date utility tests
pnpm test tests/unit/lib/date-utils

# Run integration tests
pnpm test tests/unit/lib/date-utils/date-integration.test.ts

# Run new timezone fix tests
pnpm test tests/unit/lib/date-utils/timezone-fix.test.ts
```

**Expected Results**: All tests should pass ✅

### 2. Test Coverage
The automated tests cover:
- ✅ Evening time scenarios (8:00 PM - 11:59 PM IST)
- ✅ Midnight boundary transitions
- ✅ Month-end date calculations (all months including Feb leap year)
- ✅ Report generation dates
- ✅ Date preset filters (Today, This Week, This Month, etc.)
- ✅ Cross-timezone consistency
- ✅ Performance regression tests

---

## Manual Testing

### Test Environment Setup

**Option 1: Wait for Evening** ⏰
- Test after 6:30 PM IST in production

**Option 2: Mock System Time** 🔧
- Temporarily change system clock to 8:00 PM
- **Warning**: May affect other processes. Use carefully!

**Option 3: Use Browser DevTools** 🛠️
```javascript
// In browser console, mock Date
Date = class extends Date {
  constructor(...args) {
    if (args.length === 0) {
      // October 21, 2025 at 8:00 PM IST = 2:30 PM UTC
      super('2025-10-21T14:30:00.000Z');
    } else {
      super(...args);
    }
  }
};
```

---

## Manual Test Cases

### Test 1: Report Generation Date (CRITICAL)

**Steps:**
1. Navigate to Deliveries page: `/dashboard/deliveries`
2. Click "Print" button to open print dialog
3. Look at "Generated on:" date in header

**Test at:** 8:00 PM IST on October 21, 2025

**Expected Result:**
- ✅ Should show: "Generated on: 21/10/2025"
- ❌ NOT: "Generated on: 22/10/2025"

**Test Files:**
- `/api/print/deliveries`
- `/api/print/customer-delivered-quantity`
- `/api/print/sales-history`
- `/api/print/payment-collection`
- `/api/print/invoice-preview`
- `/api/print/outstanding-report`

---

### Test 2: "This Month" Filter End Date

**Steps:**
1. Navigate to Deliveries page
2. Select "This Month" from date filter dropdown
3. Look at the date range shown in filter display

**Test at:** 8:00 PM IST on October 21, 2025

**Expected Result:**
- ✅ Should show: "01/10/2025 - 31/10/2025"
- ❌ NOT: "01/10/2025 - 01/11/2025"

**Pages to Test:**
- Deliveries
- Sales History
- Payment Collection
- All report pages with date filters

---

### Test 3: Custom Date Range Report

**Steps:**
1. Navigate to Deliveries page
2. Select "Custom" from date filter
3. Set date range: October 1, 2025 - October 21, 2025
4. Click "Print" button

**Test at:** 8:00 PM IST on October 21, 2025

**Expected Results:**
- ✅ Report should include data only from Oct 1-21
- ✅ "Generated on" should show 21/10/2025
- ✅ Filter display should show "Date: 01/10/2025 - 21/10/2025"

---

### Test 4: Date Presets Consistency

**Test each preset at 8:00 PM IST on October 21, 2025:**

| Preset | Expected Range | Notes |
|--------|---------------|-------|
| Most Recent | 21/10/2025 | Single day |
| Today | 21/10/2025 | Not 22/10/2025 |
| Yesterday | 20/10/2025 | Day before |
| Last 7 Days | 15/10/2025 - 21/10/2025 | 7-day range |
| Last 30 Days | 22/09/2025 - 21/10/2025 | 30-day range |
| This Week | Start - 21/10/2025 | Week end correct |
| This Month | 01/10/2025 - 31/10/2025 | **Critical: End = 31st** |
| Last Month | 01/09/2025 - 30/09/2025 | Previous month |

**Pages to Test:**
- Deliveries
- Sales History
- Payment Collection

---

### Test 5: Financial Year Calculation (Customer Statement)

**Steps:**
1. Navigate to Outstanding Reports page
2. Click on any customer to view statement
3. Check the FY date range displayed

**Test at:** 8:00 PM IST on October 21, 2025

**Expected Result:**
- ✅ FY 2025-26: April 1, 2025 - Today (Oct 21, 2025)
- ✅ Date calculations should not overflow into next day

---

### Test 6: Database Date Storage

**Steps:**
1. Create a new delivery/sale/payment at 8:00 PM IST
2. Check database directly (Supabase dashboard)
3. Verify the stored `created_at` and date fields

**Expected Result:**
- ✅ Dates should be October 21, 2025
- ❌ NOT October 22, 2025

---

### Test 7: Cross-Timezone Consistency

**Test Scenario:** User accessing from different timezones

**Steps:**
1. Generate report at 8:00 PM IST
2. Share report URL with colleague in different timezone
3. Both should see same dates

**Expected Result:**
- ✅ All users see consistent dates regardless of local timezone

---

## Edge Cases to Test

### Test 8: Midnight Transition

**Test at:** 11:59 PM IST on October 21, 2025

**Expected:**
- Should still show October 21

**Test at:** 12:01 AM IST on October 22, 2025

**Expected:**
- Should now show October 22

---

### Test 9: Month Boundaries

**Test months:**
- January (31 days)
- February (28/29 days) - **Critical for leap year**
- April (30 days)
- December (31 days → year transition)

**For each month:**
1. Set date to last day of month at 8:00 PM
2. Check "This Month" filter end date
3. Verify correct last day shown

---

### Test 10: Leap Year February

**Test at:** February 28, 2024 (leap year) at 8:00 PM IST

**Expected:**
- ✅ "This Month" end should be 29/02/2024
- ✅ NOT 01/03/2024

**Test at:** February 28, 2025 (non-leap) at 8:00 PM IST

**Expected:**
- ✅ "This Month" end should be 28/02/2025
- ✅ NOT 29/02/2025 or 01/03/2025

---

## Regression Testing

### Verify No Breaking Changes

**Areas to check:**
1. ✅ Deliveries page loads correctly
2. ✅ Reports generate successfully
3. ✅ Filters work as expected
4. ✅ Date pickers function properly
5. ✅ Database operations succeed
6. ✅ No console errors

---

## Performance Testing

### Response Time Benchmarks

**Measure:**
1. Report generation time (should be < 3 seconds)
2. Date filter application (should be instant)
3. Page load time (no degradation)

**Test with:**
- Large datasets (1000+ deliveries)
- Multiple concurrent users
- Various date ranges

---

## Test Results Template

```markdown
## Test Results - [Date] [Time IST] [Tester Name]

### Environment
- Server Timezone: UTC
- Test Time (IST): [Time]
- Browser: [Browser + Version]

### Test 1: Report Generation Date
- Status: ✅ PASS / ❌ FAIL
- Expected: 21/10/2025
- Actual: [Actual Date]
- Notes:

### Test 2: This Month Filter
- Status: ✅ PASS / ❌ FAIL
- Expected: 31/10/2025
- Actual: [Actual Date]
- Notes:

### Test 3: Custom Date Range
- Status: ✅ PASS / ❌ FAIL
- Notes:

[Continue for all tests...]

### Issues Found
1. [Issue description]
2. [Issue description]

### Overall Status
- Total Tests: [N]
- Passed: [N]
- Failed: [N]
- Status: ✅ ALL PASS / ⚠️ NEEDS ATTENTION / ❌ CRITICAL ISSUES
```

---

## Quick Verification Checklist

Use this for rapid verification:

- [ ] Report "Generated on" shows correct date at 8 PM
- [ ] "This Month" filter shows October 31, not November 1
- [ ] Custom date filter works correctly
- [ ] All date presets show correct dates
- [ ] No dates shifted by +1 day in evening
- [ ] Database stores correct dates
- [ ] No console errors
- [ ] Reports print correctly
- [ ] All automated tests pass
- [ ] Performance is acceptable

---

## If Tests Fail

### Debugging Steps

1. **Check Browser Console**
   - Look for JavaScript errors
   - Check network requests

2. **Verify Server Timezone**
   ```bash
   # On server
   date
   # Should show UTC
   ```

3. **Check Date Utility Functions**
   - Verify no `getCurrentISTDate()` + `formatDateIST()` combinations
   - Ensure using `new Date()` directly

4. **Database Timestamps**
   - Check `created_at` and date fields
   - Verify timezone consistency

5. **Clear Cache**
   - Hard refresh browser (Ctrl+Shift+R)
   - Clear application cache
   - Restart development server

---

## Contact & Support

If you encounter issues during testing:
1. Document the exact scenario (time, page, actions)
2. Take screenshots of incorrect dates
3. Check browser console for errors
4. Verify server logs
5. Create detailed bug report with reproduction steps

---

## Success Criteria

All tests must pass for deployment:
- ✅ All automated tests pass
- ✅ All manual test cases pass
- ✅ No regressions in existing functionality
- ✅ Performance meets benchmarks
- ✅ Cross-timezone consistency verified
- ✅ Edge cases handled correctly

**Sign-off required from:** QA Lead, Product Owner, Technical Lead
