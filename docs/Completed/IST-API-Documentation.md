# IST Date Utilities - API Documentation

## Overview

The IST Date Utilities library (`/src/lib/date-utils.ts`) provides comprehensive timezone-safe date operations for the dairy management system. All functions ensure consistent IST (Indian Standard Time) handling across the application.

## Core Principles

- **Database Storage:** UTC with IST conversion
- **Display Format:** dd/MM/yyyy with en-IN locale
- **Business Hours:** 06:00-12:00 (Morning), 17:00-21:00 (Evening)  
- **Working Days:** All 7 days (Sunday-Saturday)
- **Financial Year:** April-March (Indian standard)

## API Reference

### Core IST Functions

#### `getCurrentISTDate(): Date`
Gets current date and time in IST context.

**Returns:** `Date` - Current date in IST
**Usage:** Replace all `new Date()` calls with this function

```typescript
// ❌ Wrong
const now = new Date()

// ✅ Correct
const now = getCurrentISTDate()
```

#### `getCurrentISTTimestamp(): string`
Gets current IST timestamp as ISO string.

**Returns:** `string` - ISO timestamp string
**Use Case:** Quick timestamp generation

```typescript
const timestamp = getCurrentISTTimestamp()
// Output: "2025-08-23T14:30:00.000Z"
```

#### `convertUTCToIST(utcDate: Date): Date`
Converts UTC date to IST equivalent.

**Parameters:**
- `utcDate: Date` - UTC date to convert

**Returns:** `Date` - IST equivalent date

```typescript
const utcDate = new Date('2025-08-23T09:00:00.000Z')
const istDate = convertUTCToIST(utcDate)
// IST: 2025-08-23T14:30:00.000Z
```

#### `convertISTToUTC(istDate: Date): Date` 
Converts IST date to UTC equivalent.

**Parameters:**
- `istDate: Date` - IST date to convert

**Returns:** `Date` - UTC equivalent date

### Display Formatting Functions

#### `formatDateIST(date: Date): string`
**PRIMARY DISPLAY FUNCTION** - Formats date for UI display in dd/MM/yyyy format.

**Parameters:**
- `date: Date` - Date to format

**Returns:** `string` - Formatted date (dd/MM/yyyy)
**Use Case:** All UI date displays

```typescript
const date = getCurrentISTDate()
const display = formatDateIST(date)
// Output: "23/08/2025"

// UI Usage
<span>{formatDateIST(customer.created_at)}</span>
<TableCell>{formatDateIST(invoice.invoice_date)}</TableCell>
```

#### `formatDateTimeIST(date: Date): string`
Formats date with time in IST (dd/MM/yyyy, HH:mm).

**Parameters:**
- `date: Date` - Date to format

**Returns:** `string` - Formatted datetime (dd/MM/yyyy, HH:mm)
**Use Case:** Timestamps in reports, detailed views

```typescript
const datetime = formatDateTimeIST(getCurrentISTDate())
// Output: "23/08/2025, 14:30"
```

#### `formatTimestampIST(date: Date): string`
Formats timestamp for display (dd/MM/yyyy 'at' HH:mm).

**Parameters:**
- `date: Date` - Date to format

**Returns:** `string` - Formatted timestamp with 'at' separator
**Use Case:** User-friendly timestamps

```typescript
const timestamp = formatTimestampIST(getCurrentISTDate())
// Output: "23/08/2025 at 14:30"
```

#### `formatWithIST(date: Date, formatString: string): string`
Advanced formatting using date-fns with IST context.

**Parameters:**
- `date: Date` - Date to format
- `formatString: string` - date-fns format string

**Returns:** `string` - Custom formatted string
**Use Case:** Special formatting requirements

```typescript
const custom = formatWithIST(date, 'EEEE, dd MMMM yyyy')
// Output: "Friday, 23 August 2025"
```

### Database & API Utilities

#### `formatDateForDatabase(date: Date): string`
**MANDATORY DATABASE FUNCTION** - Formats date for database storage.

**Parameters:**
- `date: Date` - Date to format

**Returns:** `string` - YYYY-MM-DD format
**Use Case:** All database date operations

```typescript
const order = {
  order_date: formatDateForDatabase(getCurrentISTDate()),
  delivery_date: formatDateForDatabase(addDaysIST(getCurrentISTDate(), 1))
}

await supabase.from('daily_orders').insert(order)
```

#### `formatTimestampForDatabase(date: Date): string`
Formats timestamp for database storage (ISO string).

**Parameters:**
- `date: Date` - Date to format

**Returns:** `string` - ISO timestamp string
**Use Case:** Database timestamp fields

```typescript
const record = {
  created_at: formatTimestampForDatabase(getCurrentISTDate()),
  updated_at: formatTimestampForDatabase(getCurrentISTDate())
}
```

#### `parseLocalDateIST(dateString: string): Date`
**MANDATORY PARSING FUNCTION** - Parses date strings in IST context.

**Parameters:**
- `dateString: string` - Date string in YYYY-MM-DD format

**Returns:** `Date` - Parsed date in IST
**Throws:** `Error` - If date string is invalid

```typescript
// Form data parsing
const startDate = parseLocalDateIST(formData.start_date)

// Database date parsing  
const orderDate = parseLocalDateIST(searchParams.date)

// Supported format: YYYY-MM-DD only
const date = parseLocalDateIST('2025-08-23')
```

### Date Calculation Functions

#### `addDaysIST(date: Date, days: number): Date`
Adds days to date while maintaining IST context.

**Parameters:**
- `date: Date` - Source date
- `days: number` - Number of days to add (can be negative)

**Returns:** `Date` - New date with days added

```typescript
const tomorrow = addDaysIST(getCurrentISTDate(), 1)
const lastWeek = addDaysIST(getCurrentISTDate(), -7)
const dueDate = addDaysIST(invoiceDate, 30)
```

#### `getStartOfDayIST(date: Date): Date`
Gets start of day (00:00:00) for given date in IST.

**Parameters:**
- `date: Date` - Input date

**Returns:** `Date` - Start of day in IST

#### `getEndOfDayIST(date: Date): Date`
Gets end of day (23:59:59) for given date in IST.

**Parameters:**
- `date: Date` - Input date

**Returns:** `Date` - End of day in IST

#### `getDaysDifferenceIST(date1: Date, date2: Date): number`
Calculates days difference between two IST dates.

**Parameters:**
- `date1: Date` - First date
- `date2: Date` - Second date

**Returns:** `number` - Difference in days (date1 - date2)

### Validation Functions

#### `isValidISTDate(date: unknown): date is Date`
Type guard to check if value is a valid Date object.

**Parameters:**
- `date: unknown` - Value to check

**Returns:** `boolean` - True if valid Date

```typescript
if (isValidISTDate(userInput)) {
  const formatted = formatDateIST(userInput)
}
```

#### `isValidISTDateString(dateString: string): boolean`
Validates if string is a valid date in YYYY-MM-DD format.

**Parameters:**
- `dateString: string` - String to validate

**Returns:** `boolean` - True if valid format and date

```typescript
if (isValidISTDateString(input)) {
  const date = parseLocalDateIST(input)
}
```

#### `validateDateRange(startDate: Date, endDate: Date): boolean`
Validates that start date is not after end date.

**Parameters:**
- `startDate: Date` - Range start
- `endDate: Date` - Range end

**Returns:** `boolean` - True if valid range

### Business Logic Functions

#### `getCurrentFinancialYearIST(): string`
Gets current Indian financial year (April-March).

**Returns:** `string` - Financial year in format "YYYY-YYYY"

```typescript
const fy = getCurrentFinancialYearIST()
// Output: "2025-2026" (if current date is Aug 2025)
```

#### `calculateFinancialYear(date: Date): string`
Calculates financial year for given date.

**Parameters:**
- `date: Date` - Date to calculate financial year for

**Returns:** `string` - Financial year in format "YYYY-YYYY"

```typescript
const invoiceDate = parseLocalDateIST('2025-03-15')
const fy = calculateFinancialYear(invoiceDate)
// Output: "2024-2025" (March is end of FY)
```

#### `isISTBusinessHour(date: Date): boolean`
Checks if date falls within business hours (6-12 AM or 5-9 PM IST).

**Parameters:**
- `date: Date` - Date to check

**Returns:** `boolean` - True if within business hours

```typescript
if (isISTBusinessHour(getCurrentISTDate())) {
  // Process business operations
}
```

#### `isISTWorkingDay(date: Date): boolean`
Checks if date is a working day (all 7 days for dairy business).

**Parameters:**
- `date: Date` - Date to check

**Returns:** `boolean` - True if working day (always true for dairy operations)

#### `getNextISTBusinessDay(date: Date): Date`
Gets next business day (all days are working days for dairy business).

**Parameters:**
- `date: Date` - Starting date

**Returns:** `Date` - Next business day (always the next calendar day)

### Comparison Functions

#### `isSameDayIST(date1: Date, date2: Date): boolean`
Checks if two dates are the same day in IST.

**Parameters:**
- `date1: Date` - First date
- `date2: Date` - Second date

**Returns:** `boolean` - True if same IST day

#### `compareDatesIST(date1: Date, date2: Date): number`
Compares two dates in IST context.

**Parameters:**
- `date1: Date` - First date
- `date2: Date` - Second date

**Returns:** `number` - -1, 0, or 1 (for sorting)

#### `isWithinRangeIST(date: Date, start: Date, end: Date): boolean`
Checks if date falls within IST date range (inclusive).

**Parameters:**
- `date: Date` - Date to check
- `start: Date` - Range start
- `end: Date` - Range end

**Returns:** `boolean` - True if within range

## TypeScript Types

### IST-Specific Types (from `/src/lib/types.ts`)

```typescript
// Date string in IST format (YYYY-MM-DD)
type ISTDateString = string & { __brand: 'ISTDateString' }

// Timestamp with IST context
type ISTTimestamp = string & { __brand: 'ISTTimestamp' }

// Date range with IST dates
interface ISTDateRange {
  start: Date
  end: Date
  timezone: 'Asia/Kolkata'
}
```

## Configuration Constants

### IST_CONFIG
Central configuration for IST operations:

```typescript
export const IST_CONFIG = {
  timezone: 'Asia/Kolkata',
  locale: 'en-IN', 
  offset: '+05:30',
  businessHours: {
    morning: { start: '06:00', end: '12:00' },
    evening: { start: '17:00', end: '21:00' }
  },
  workingDays: [0, 1, 2, 3, 4, 5, 6], // All 7 days
  dateFormats: {
    display: 'dd/MM/yyyy',
    displayWithTime: 'dd/MM/yyyy, HH:mm', 
    displayTimestamp: "dd/MM/yyyy 'at' HH:mm",
    api: 'yyyy-MM-dd',
    timestamp: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
  }
} as const
```

## Migration from Legacy Code

### Common Replacements

| Legacy Pattern | IST Replacement |
|---------------|-----------------|
| `new Date()` | `getCurrentISTDate()` |
| `new Date(dateString)` | `parseLocalDateIST(dateString)` |
| `date.toISOString().split('T')[0]` | `formatDateForDatabase(date)` |
| `date.toLocaleDateString()` | `formatDateIST(date)` |
| `Date.now()` | `getCurrentISTDate().getTime()` |

### Server Action Migration Example

**Before:**
```typescript
export async function createPayment(formData: FormData) {
  const payment_date = new Date(formData.get('date')).toISOString().split('T')[0]
  const created_at = new Date().toISOString()
  
  // Insert payment...
}
```

**After:**
```typescript
import { getCurrentISTDate, formatDateForDatabase, formatTimestampForDatabase, parseLocalDateIST } from '@/lib/date-utils'

export async function createPayment(formData: FormData) {
  const payment_date = formatDateForDatabase(parseLocalDateIST(formData.get('date')))
  const created_at = formatTimestampForDatabase(getCurrentISTDate())
  
  // Insert payment...
}
```

## Error Handling

All functions throw descriptive errors for invalid inputs:

```typescript
try {
  const date = parseLocalDateIST(userInput)
  const formatted = formatDateForDatabase(date)
} catch (error) {
  // Handle specific date parsing errors
  console.error('Date operation failed:', error.message)
}
```

## Performance Notes

- Functions are optimized for frequent use
- Caching is recommended for bulk operations
- Avoid creating new Date objects in loops
- Use batch formatting for large datasets

## Testing

Comprehensive test coverage available in:
- `/src/lib/__tests__/date-utils.test.ts` - Unit tests
- `/src/lib/__tests__/date-integration.test.ts` - Integration tests  
- `/src/lib/__tests__/edge-cases.test.ts` - Edge case validation
- `/src/lib/__tests__/performance-simple.test.ts` - Performance benchmarks

Run tests with:
```bash
pnpm test
```

## Support

For issues or questions:
1. Check `/docs/IST-Troubleshooting-Guide.md`
2. Review test examples for usage patterns
3. Refer to CLAUDE.md for coding standards