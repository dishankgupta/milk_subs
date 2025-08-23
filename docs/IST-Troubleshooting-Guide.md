# IST Date Handling - Troubleshooting Guide

## Common Issues & Solutions

This guide provides solutions to common date-related issues in the dairy management system after IST standardization implementation.

## Issue Categories

### 1. Date Display Issues

#### Problem: Dates showing in wrong format
```
Expected: 23/08/2025
Actual: 8/23/2025 or 2025-08-23
```

**Solution:**
```typescript
// ❌ Wrong - using default locale
const display = date.toLocaleDateString()

// ✅ Correct - using IST formatting
const display = formatDateIST(date)
```

#### Problem: Inconsistent date formats across UI
**Root Cause:** Multiple formatting methods being used
**Solution:** Always use IST utility functions
- `formatDateIST()` for dates
- `formatDateTimeIST()` for dates with time
- `formatTimestampIST()` for timestamps

### 2. Database Storage Issues

#### Problem: Dates storing incorrectly in database
```sql
-- Wrong: 2025-08-22 (timezone shifted)
-- Expected: 2025-08-23
```

**Solution:**
```typescript
// ❌ Wrong - loses timezone context
const dbDate = new Date().toISOString().split('T')[0]

// ✅ Correct - maintains IST context
const dbDate = formatDateForDatabase(getCurrentISTDate())
```

#### Problem: Timestamp storage issues
**Solution:**
```typescript
// ❌ Wrong
created_at: new Date().toISOString()

// ✅ Correct
created_at: formatTimestampForDatabase(getCurrentISTDate())
```

### 3. User Input Parsing Issues

#### Problem: Form date inputs not parsing correctly
**Symptoms:**
- Invalid date errors
- Off-by-one day issues
- Timezone inconsistencies

**Solution:**
```typescript
// ❌ Wrong - direct Date constructor
const userDate = new Date(formData.date)

// ✅ Correct - IST-aware parsing
const userDate = parseLocalDateIST(formData.date)
```

#### Problem: Date picker values incorrect
**Common Cause:** HTML date inputs return YYYY-MM-DD strings
**Solution:**
```typescript
// Form handler
const handleSubmit = (formData: FormData) => {
  const dateString = formData.get('start_date') as string
  const startDate = parseLocalDateIST(dateString)
  
  // Now safe to use
  const dbValue = formatDateForDatabase(startDate)
}
```

### 4. Business Logic Issues

#### Problem: Financial year calculations incorrect
**Symptoms:**
- Wrong financial year in reports
- Incorrect invoice numbering
- Period calculations off

**Solution:**
```typescript
// ❌ Wrong - using system date
const financialYear = new Date().getFullYear()

// ✅ Correct - using IST context
const financialYear = getCurrentFinancialYearIST()
```

#### Problem: Business hours validation failing
**Solution:**
```typescript
// Check if current time is within business hours
if (isISTBusinessHour(getCurrentISTDate())) {
  // Process business logic
}
```

### 5. Report Generation Issues

#### Problem: Report dates showing incorrectly
**Common in:** PDF reports, print layouts
**Solution:** Ensure all print APIs use IST utilities

```typescript
// In print API routes
const reportDate = getCurrentISTDate()
const formattedDate = formatDateIST(reportDate)
const timestamp = formatTimestampIST(reportDate)
```

### 6. Performance Issues

#### Problem: Slow date operations in bulk processing
**Symptoms:**
- Slow invoice generation
- Timeout errors in reports
- UI lag with date calculations

**Solutions:**

**Batch Processing:**
```typescript
// ❌ Wrong - individual date processing
orders.map(order => formatDateIST(order.created_at))

// ✅ Better - batch formatting
const formatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit'
})
const formattedDates = orders.map(order => formatter.format(order.created_at))
```

**Caching:**
```typescript
// Cache current date for multiple operations
const currentIST = getCurrentISTDate()
const dbDate = formatDateForDatabase(currentIST)
const displayDate = formatDateIST(currentIST)
```

## Debugging Steps

### Step 1: Verify IST Utilities Import
Check that proper imports are used:
```typescript
// ✅ Correct imports
import {
  getCurrentISTDate,
  formatDateIST,
  formatDateForDatabase,
  parseLocalDateIST
} from '@/lib/date-utils'
```

### Step 2: Console Log Date Values
```typescript
const date = getCurrentISTDate()
console.log('IST Date:', date)
console.log('Formatted:', formatDateIST(date))
console.log('For DB:', formatDateForDatabase(date))
```

### Step 3: Check Database Values
```sql
-- Verify dates are storing correctly
SELECT 
  id,
  created_at::timestamptz AT TIME ZONE 'Asia/Kolkata' as ist_time,
  order_date
FROM daily_orders 
WHERE order_date = '2025-08-23'
ORDER BY created_at DESC 
LIMIT 5;
```

### Step 4: Validate Form Data
```typescript
// Add validation in form handlers
const dateString = formData.get('date') as string
console.log('Input:', dateString)

if (!isValidISTDateString(dateString)) {
  throw new Error(`Invalid date format: ${dateString}`)
}

const parsed = parseLocalDateIST(dateString)
console.log('Parsed:', parsed)
```

## Error Messages & Solutions

### Common Error Messages:

#### "Invalid date string for IST"
**Cause:** Date string not in expected format
**Fix:** Ensure YYYY-MM-DD format or use proper parsing
```typescript
// Check format before parsing
if (isValidISTDateString(dateString)) {
  const date = parseLocalDateIST(dateString)
}
```

#### "Invalid date provided for database formatting"
**Cause:** Trying to format invalid Date object
**Fix:** Validate date before formatting
```typescript
if (isValidISTDate(date)) {
  const dbValue = formatDateForDatabase(date)
}
```

#### "Unsupported date format for IST parsing"
**Cause:** Using deprecated parsing function with unsupported format
**Fix:** Use correct parsing function for format
```typescript
// For YYYY-MM-DD format
const date = parseLocalDateIST('2025-08-23')

// For other formats, convert first
const userInput = '23/08/2025'
const parts = userInput.split('/')
const isoFormat = `${parts[2]}-${parts[1]}-${parts[0]}`
const date = parseLocalDateIST(isoFormat)
```

## Testing Your Changes

### Unit Tests
```bash
# Run IST-specific tests
pnpm test src/lib/__tests__/date-utils.test.ts

# Run all tests
pnpm test
```

### Manual Testing Checklist

1. **Date Display:**
   - [ ] Customer creation dates show dd/MM/yyyy format
   - [ ] Invoice dates consistent across UI
   - [ ] Report timestamps include IST context

2. **Database Operations:**
   - [ ] New records store dates correctly
   - [ ] Date filters work as expected
   - [ ] Timezone consistency in queries

3. **User Input:**
   - [ ] Date pickers parse correctly
   - [ ] Form validation works properly
   - [ ] Error messages are helpful

4. **Business Logic:**
   - [ ] Financial year calculations correct
   - [ ] Business hours validation works
   - [ ] Date arithmetic produces expected results

## Getting Help

### Code Review Checklist
Before submitting code with date operations:
- [ ] No direct `new Date()` usage
- [ ] No `toISOString().split('T')[0]` patterns  
- [ ] All formatting uses IST utilities
- [ ] Database operations use proper formatting functions
- [ ] User input uses IST parsing functions
- [ ] Tests cover date-dependent functionality

### Resources
- **Main Utilities:** `/src/lib/date-utils.ts`
- **Test Examples:** `/src/lib/__tests__/` directory
- **Type Definitions:** `/src/lib/types.ts`
- **Documentation:** `/docs/IST-API-Documentation.md`

### Common Patterns Reference
```typescript
// Current date operations
const now = getCurrentISTDate()
const today = formatDateForDatabase(now)
const display = formatDateIST(now)

// User input handling  
const userDate = parseLocalDateIST(formInput)
const dbValue = formatDateForDatabase(userDate)

// Date calculations
const tomorrow = addDaysIST(now, 1)
const nextWeek = addDaysIST(now, 7)
const isBusinessHour = isISTBusinessHour(now)

// Validation
if (!isValidISTDate(date)) {
  throw new Error('Invalid date')
}
```

This troubleshooting guide should help resolve 95% of date-related issues in the system. For complex scenarios not covered here, refer to the comprehensive test suite examples in `/src/lib/__tests__/` for additional patterns and edge cases.