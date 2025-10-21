# CLAUDE2.md

This file provides essential guidance for Claude Code when working with the milk_subs dairy business management system.

## Project Overview

**milk_subs** is a comprehensive Next.js 15 dairy business management system built with modern React patterns and TypeScript. It manages subscriptions, manual sales, deliveries, payments, and invoicing for dairy businesses.

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **UI Components**: Radix UI primitives + Shadcn/ui component library
- **Backend**: Supabase (PostgreSQL) with Server-Side Rendering
- **Forms**: React Hook Form + Zod validation
- **PDF Generation**: Puppeteer with Chrome browser
- **Testing**: Vitest with Testing Library
- **Package Manager**: pnpm
- **Fonts**: Geist Sans & Geist Mono

## Development Commands

```bash
pnpm dev          # Development server with Turbopack
pnpm build        # Production build
pnpm lint         # ESLint code quality check
pnpm test         # Run all tests with Vitest
pnpm test:unit    # Unit tests only
pnpm test:integration # Integration tests only
pnpm test-pdf     # Test PDF generation with Chrome
```

## Architecture

### App Router Structure
```
src/app/
├── layout.tsx              # Root layout with Geist fonts & Sonner toasts
├── page.tsx                # Homepage with auth redirect
├── auth/login/             # Authentication pages
├── dashboard/              # Protected admin dashboard
│   ├── customers/          # Customer management CRUD
│   ├── products/           # Product catalog with GST rates
│   ├── subscriptions/      # Subscription management
│   ├── orders/             # Daily order generation
│   ├── deliveries/         # Delivery tracking & confirmation
│   ├── modifications/      # Temporary subscription changes
│   │   └── bulk/           # Bulk modification entry
│   ├── payments/           # Payment processing & allocation
│   │   └── bulk/           # Bulk payment entry with allocation dialog
│   ├── invoices/           # Invoice generation & management
│   ├── sales/              # Manual sales (Cash/QR/Credit)
│   │   └── bulk/           # Bulk sales entry
│   ├── outstanding/        # Outstanding amount tracking
│   └── reports/            # Business analytics & printing
└── api/                    # API routes
    ├── print/              # Professional PDF report endpoints
    ├── customers/          # Customer-specific APIs
    └── invoices/           # Invoice processing APIs
```

### Core Library Structure
```
src/lib/
├── actions/                # Server actions for database operations
│   ├── customers.ts        # Customer CRUD & opening balance
│   ├── products.ts         # Product management
│   ├── subscriptions.ts    # Subscription CRUD
│   ├── orders.ts           # Order generation & management
│   ├── deliveries.ts       # Delivery confirmation & bulk operations
│   ├── modifications.ts    # Subscription modifications
│   ├── payments.ts         # Payment processing & invoice allocation
│   ├── invoices.ts         # Invoice generation & status management
│   ├── sales.ts            # Manual sales CRUD
│   ├── outstanding.ts      # Outstanding calculations & payment allocation
│   ├── reports.ts          # Report generation
│   ├── bulk-sales.ts       # Bulk sales operations
│   ├── bulk-payments.ts    # Bulk Payments operations
│   └── bulk-modifications.ts # Bulk modification operations
├── supabase/               # Database client configuration
│   ├── client.ts           # Client-side Supabase
│   └── server.ts           # Server-side Supabase with SSR
├── utils/                  # Business logic utilities
│   ├── date-utils.ts       # IST timezone handling (CRITICAL)
│   ├── gst-utils.ts        # GST calculations & tax compliance
│   ├── invoice-utils.ts    # PDF generation & templates
│   ├── subscription-utils.ts # Subscription pattern calculations
│   ├── file-utils.ts       # PDF utilities with Chrome integration
│   └── pagination.ts       # Reusable pagination utilities
├── hooks/                  # Custom React hooks
│   ├── useSorting.ts       # Table sorting functionality
│   └── usePagination.ts    # Client-side pagination
├── components/ui/          # Shadcn/ui component library
├── types.ts                # TypeScript interfaces & types
├── validations.ts          # Zod schemas for form validation
└── utils.ts                # General utility functions
```

## Database Schema (Supabase PostgreSQL)

### Migration Files Setup
Complete database recreation available through migration files in `supabase/migrations/`:
- **001_initial_schema.sql** - All 20+ core tables with constraints & relationships
- **002_functions_and_procedures.sql** - 25+ business logic functions & procedures
- **003_triggers_and_policies.sql** - RLS policies, triggers & security settings
- **004_indexes_and_constraints.sql** - 50+ performance indexes & constraints
- **005_seed_data.sql** - Essential routes & product data with validation

**Setup Instructions**: Apply migrations in numerical order to recreate complete database structure on any fresh Supabase project.

### Core Business Tables
- **customers** - Customer profiles with billing info, routes, opening balance
- **products** - Product catalog with GST rates (Milk, Paneer, Ghee varieties)
- **routes** - Route 1 & Route 2 with personnel management
- **base_subscriptions** - Daily/Pattern subscription types with 2-day cycles
- **modifications** - Temporary subscription changes (skip/increase/decrease)
- **daily_orders** - Generated orders with pricing & delivery details
- **deliveries** - Self-contained delivery tracking with additional items
- **payments** - Payment history with allocation tracking
- **sales** - Manual sales tracking (Cash/Credit/QR) with GST compliance

### Financial Management Tables
- **invoice_metadata** - Invoice generation with status & payment tracking
- **invoice_line_items** - Detailed line items with delivery references
- **invoice_payments** - Payment allocation for invoice-to-payment mapping
- **sales_payments** - Direct payment allocation to sales (bypassing invoices)
- **unapplied_payments** - Payments not yet allocated to invoices
- **opening_balance_payments** - Historical opening balance payment tracking
- **product_pricing_history** - Price change audit trail

### Additional System Tables
- **invoice_sales_mapping** - Invoice-to-sales relationship mapping for legacy compatibility
- **audit_trail** - System audit logging for compliance tracking
- **bulk_operation_logs** - Bulk operation progress and error tracking

### Database Functions
- `calculate_customer_outstanding()` - Outstanding calculations with opening balance
- `update_invoice_status()` - Automatic invoice status management
- `process_invoice_payment_atomic()` - Atomic payment processing
- `allocate_payment_atomic()` - Race condition prevention for payments
- `delete_invoice_and_revert_sales()` - Safe invoice deletion with sales reversion
- `rollback_partial_allocation()` - Complete error recovery mechanism
- `update_invoice_status_with_sales_completion()` - Enhanced status flow with sales completion

**Additional Functions** (18 more): Including bulk operations (`generate_bulk_invoices_atomic`), data reconciliation (`fix_unapplied_payments_inconsistencies`), and advanced business logic functions for comprehensive dairy business management.

## Key Features

### Business Management Modules
1. **Customer Management** - Complete CRUD with searchable tables & opening balances
2. **Product Management** - GST-integrated catalog with real-time calculations
3. **Subscription Management** - Pattern-based subscriptions with cycle preview
4. **Order Generation** - Automated daily orders with modification support
5. **Modification Management** - Temporary subscription changes (skip/increase/decrease/add note) with bulk entry support
6. **Delivery Management** - Individual & bulk confirmation with additional items
7. **Payment Management** - Invoice allocation with unapplied payment tracking, bulk entry with per-row allocation dialog
8. **Sales Management** - Manual sales (Cash/QR/Credit) with bulk operations
9. **Invoice Management** - Professional PDF generation with automatic status flow
10. **Outstanding Management** - Total Outstandings display with Detailed Outstanding reports, Customer Statements and Outstanding Invoices Report (FY-based unpaid invoices with payment allocation details)

### Professional Features
- **IST Date Compliance** - System-wide Indian Standard Time utilities
- **Professional PDF Reports** - Puppeteer-based generation with Chrome integration
- **Real-time Search** - Client-side filtering across all data tables
- **Mobile-responsive Design** - Optimized for mobile devices throughout
- **Comprehensive Error Handling** - Graceful error boundaries & validation
- **Performance Optimization** - Bulk operations with real-time progress tracking
- **Product-wise Summary Report** - Customer-product quantity matrix report in deliveries
- **Multi-Factor Authentication** - Google Authenticator TOTP integration with zero database changes

## Critical Development Guidelines

### IST Date Handling (MANDATORY)

**⚠️ CRITICAL: Timezone Double Conversion Bug Prevention**

Using `getCurrentISTDate()` with `formatDateIST()` causes dates to show as next day after 6:30 PM IST due to double timezone conversion. See `TIMEZONE_FIX_SUMMARY.md` for details.

#### IST Date Utilities Use Case Matrix

| Use Case | Function to Use | Example | Notes |
|----------|----------------|---------|-------|
| **Current date for database storage** | `formatDateForDatabase(getCurrentISTDate())` | `order_date: formatDateForDatabase(getCurrentISTDate())` | ✅ Stores as YYYY-MM-DD in IST |
| **Current timestamp for database** | `formatTimestampForDatabase(getCurrentISTDate())` | `created_at: formatTimestampForDatabase(getCurrentISTDate())` | ✅ Stores as ISO timestamp |
| **Display current date in reports** | `formatDateIST(new Date())` | `Generated on: ${formatDateIST(new Date())}` | ✅ Use `new Date()` NOT `getCurrentISTDate()` |
| **Display database date** | `formatDateIST(new Date(dbDate))` | `formatDateIST(new Date(order.order_date))` | ✅ Parse database string first |
| **Date preset calculations** | `new Date()` with date-fns | `const today = new Date(); endOfMonth(today)` | ✅ Use plain `new Date()` for presets |
| **Parse user input** | `parseLocalDateIST(dateString)` | `parseLocalDateIST('2025-10-21')` | ✅ Parses YYYY-MM-DD format |
| **Date arithmetic** | `addDaysIST(date, days)` | `addDaysIST(getCurrentISTDate(), 1)` | ✅ Add/subtract days |
| **Compare dates** | `isSameDayIST(date1, date2)` | `isSameDayIST(orderDate, deliveryDate)` | ✅ IST-aware comparison |

#### ❌ NEVER DO THIS (Causes Double Conversion Bug)
```typescript
// ❌ WRONG - Double timezone conversion!
const today = getCurrentISTDate()
const display = formatDateIST(today)  // Shifts date by +5:30 hours TWICE!

// ❌ WRONG - In print routes
const today = getCurrentISTDate()
const monthEnd = endOfMonth(today)
formatDateIST(monthEnd)  // October 31 shows as November 1!

// ❌ WRONG - For current date display
formatDateIST(getCurrentISTDate())  // Shows next day after 6:30 PM IST!
```

#### ✅ CORRECT PATTERNS
```typescript
// ✅ For database storage
import { getCurrentISTDate, formatDateForDatabase } from '@/lib/date-utils'
const payment = {
  payment_date: formatDateForDatabase(getCurrentISTDate()),
  amount: 1000
}

// ✅ For report generation (print routes)
import { formatDateIST } from '@/lib/date-utils'
const today = new Date()  // Use plain Date, NOT getCurrentISTDate()
const formatted = formatDateIST(today)
console.log(`Generated on: ${formatted}`)

// ✅ For date presets
import { startOfMonth, endOfMonth } from 'date-fns'
const today = new Date()  // Use plain Date
const monthStart = startOfMonth(today)
const monthEnd = endOfMonth(today)
const displayStart = formatDateIST(monthStart)
const displayEnd = formatDateIST(monthEnd)  // October 31, not November 1!

// ✅ For displaying database dates
const dbDate = order.order_date  // "2025-10-21"
const display = formatDateIST(new Date(dbDate))

// ✅ For parsing user input
import { parseLocalDateIST, formatDateForDatabase } from '@/lib/date-utils'
const userDate = parseLocalDateIST('2025-10-21')
const dbFormat = formatDateForDatabase(userDate)
```

#### Quick Reference

**When to use `getCurrentISTDate()`:**
- ✅ Database storage: `formatDateForDatabase(getCurrentISTDate())`
- ✅ Date calculations: `addDaysIST(getCurrentISTDate(), 1)`
- ✅ Timestamp storage: `formatTimestampForDatabase(getCurrentISTDate())`
- ❌ NEVER with `formatDateIST()` or any display formatting function!

**When to use `new Date()`:**
- ✅ Report generation and print routes
- ✅ Date preset calculations (Today, This Month, etc.)
- ✅ Display current date/time in UI
- ✅ Any operation where result will be formatted with `formatDateIST()`

**ESLint Protection:**
The custom rule `custom/no-double-ist-conversion` will catch and prevent double conversion patterns. It will show errors if you try to use:
- `formatDateIST(getCurrentISTDate())`
- `formatDateTimeIST(getCurrentISTDate())`
- `const today = getCurrentISTDate()` in print routes

### Date Picker Usage (MANDATORY)
```typescript
// ✅ ALWAYS use UnifiedDatePicker for all date/time inputs
import { UnifiedDatePicker } from '@/components/ui/unified-date-picker'

// Date only (DD-MM-YYYY)
<UnifiedDatePicker value={date} onChange={setDate} placeholder="DD-MM-YYYY" />

// Date + Time (DD-MM-YYYY HH:mm for delivery timestamps)
<UnifiedDatePicker value={deliveredAt} onChange={setDeliveredAt} withTime={true} />

// Date Range (use TWO separate pickers)
<UnifiedDatePicker value={startDate} onChange={setStartDate} placeholder="Start Date" />
<UnifiedDatePicker value={endDate} onChange={setEndDate} placeholder="End Date" minDate={startDate} />

// ❌ DO NOT use native <input type="date"> or old Calendar+Popover patterns
// ❌ DO NOT create range picker components (always use two separate pickers)
```

### Database Operations
```typescript
// Use server actions for all database operations
import { createCustomer } from '@/lib/actions/customers'
import { generateDailyOrders } from '@/lib/actions/orders'

// Prefer Promise.all for parallel operations
const [customers, products] = await Promise.all([
  getCustomers(),
  getProducts()
])
```

### Database Migration Guidelines
```bash
# Creating new migration files after successful database changes
# Use Supabase MCP server through Task tool for proper migration creation

**Migration Best Practices:**
- Always test migrations on development branch before production
- Use `IF EXISTS` clauses for safe drops and rollbacks
- Include descriptive comments explaining business logic
- Maintain numerical order (001, 002, 003...) for proper sequencing
- Never modify existing migration files - always create new ones

### Form Validation
```typescript
// Use Zod schemas from validations.ts
import { customerSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const form = useForm({
  resolver: zodResolver(customerSchema),
  defaultValues: { ... }
})
```

### PDF Generation
```typescript
// Use robust PDF utilities with retry mechanisms
import { generatePDF } from '@/lib/file-utils'
import { createInvoiceTemplate } from '@/lib/invoice-utils'

const pdfBuffer = await generatePDF(htmlContent, {
  format: 'A4',
  margin: { top: '0.5in', bottom: '0.5in' }
})
```

## Business Logic Patterns

### Subscription Flow
1. Create base subscriptions with patterns (daily/alternate/custom)
2. Generate daily orders from active subscriptions
3. Apply temporary modifications (skip/increase/decrease)
4. Confirm deliveries with additional items support
5. Generate invoices from delivered items
6. Process payments with automatic allocation

### Payment Processing
1. Record payments (Cash/QR/Credit/UPI) - single or bulk entry
2. Allocate to invoices, opening balance, or credit sales via allocation dialog
3. Bulk payment: per-row allocation with auto-add on save, real-time status badges
4. Automatic invoice status updates (Pending→Paid→Completed)
5. Outstanding calculation with opening balance consideration

### Invoice Generation
- Bulk invoice generation with delivery consolidation
- Professional PDF templates with PureDairy branding
- Automatic sales status completion for credit transactions
- GST compliance with proper tax calculations

## Error Handling Standards

```typescript
// Use error boundaries for component isolation
import { ErrorBoundary } from '@/components/ui/error-boundary'

<ErrorBoundary>
  <SuspenseWrapper fallback={<LoadingSkeleton />}>
    <DataComponent />
  </SuspenseWrapper>
</ErrorBoundary>

// Server action error handling
try {
  const result = await serverAction(data)
  if (result.error) {
    toast.error(result.error)
    return
  }
  toast.success('Operation completed successfully')
} catch (error) {
  console.error('Action failed:', error)
  toast.error('An unexpected error occurred')
}
```

## Performance Best Practices

### Server-Side Data Fetching
```typescript
// Parallel queries in server components
export default async function Page() {
  const [data1, data2] = await Promise.all([
    getData1(),
    getData2()
  ])

  return <Component initialData={data1} additionalData={data2} />
}
```

### Component Optimization
```typescript
// Use React.memo for expensive components
import { memo } from 'react'

const ExpensiveComponent = memo(({ data }: Props) => {
  const processed = useMemo(() =>
    processData(data), [data]
  )

  return <div>{processed}</div>
})
```

### Pagination & Sorting
```typescript
// Use standard pagination hooks
import { usePagination } from '@/hooks/usePagination'
import { useSorting } from '@/hooks/useSorting'

const { currentPage, itemsPerPage, paginatedData } = usePagination(data)
const { sortedData, sortConfig, handleSort } = useSorting(paginatedData)
```

## Testing Strategy

### Unit Tests (`tests/unit/`)
- Date utilities and business logic functions
- Form validation schemas
- Utility functions and calculations

### Integration Tests (`tests/integration/`)
- Payment system with race condition prevention
- Multi-component workflows
- Database operations with mock data

### Test Commands
```bash
pnpm test:unit              # Fast unit tests
pnpm test:integration       # Multi-component tests
pnpm test:watch:unit        # Unit tests in watch mode
pnpm test:watch:integration # Integration tests in watch mode
```

## Production Considerations

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# PDF Generation
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome  # Production Chrome path
```

### Build Optimization
- TypeScript strict mode enabled
- ESLint compliance required (`pnpm lint`)
- Chrome browser auto-installation for PDF generation
- Production build verification (`pnpm build`)

### Security Standards
- Row Level Security (RLS) enabled on all Supabase tables
- Server-side authentication with middleware protection
- Input validation with Zod schemas
- SQL injection prevention through parameterized queries

## Common Patterns

### Data Tables with Search & Sorting
```typescript
const DataTable = ({ data }: Props) => {
  const [searchTerm, setSearchTerm] = useState('')
  const { sortedData, handleSort } = useSorting(data)
  const { paginatedData, pagination } = usePagination(sortedData)

  const filteredData = paginatedData.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <SearchInput value={searchTerm} onChange={setSearchTerm} />
      <Table data={filteredData} onSort={handleSort} />
      <Pagination {...pagination} />
    </>
  )
}
```

### Server Actions with Validation
```typescript
import { revalidatePath } from 'next/cache'
import { customerSchema } from '@/lib/validations'

export async function createCustomer(formData: FormData) {
  try {
    const validatedData = customerSchema.parse({
      name: formData.get('name'),
      phone: formData.get('phone'),
      // ... other fields
    })

    const { error } = await supabase
      .from('customers')
      .insert(validatedData)

    if (error) throw error

    revalidatePath('/dashboard/customers')
    return { success: true }
  } catch (error) {
    return { error: 'Failed to create customer' }
  }
}
```

## Project Status

This is a production-ready dairy business management system with:
- ✅ Complete CRUD operations for all entities
- ✅ Professional PDF report generation
- ✅ GST compliance and tax calculations
- ✅ Mobile-responsive design throughout
- ✅ Comprehensive error handling and validation
- ✅ Performance optimization with bulk operations
- ✅ Race condition prevention in payment systems
- ✅ IST timezone compliance for Indian market
- ✅ Direct sales payment allocation (bypassing invoice generation)

The system successfully manages subscriptions, deliveries, sales, payments, and invoicing for dairy businesses with robust financial tracking and professional reporting capabilities.

### Recent Features
- **Sales Payment Bypass (Sep 2025)**: Direct payment allocation to credit sales without invoice generation. Enables mixed allocations (invoices + opening balance + sales) from payment screen. Outstanding calculations remain unaffected.
- **Outstanding Invoices Report (Oct 2025)**: Financial year-based report showing unpaid/partially paid invoices with detailed payment allocation tracking. Accessible from outstanding reports page, displays invoices with status sent/pending/partially_paid/overdue in compact table format.
- **Bulk Modifications (Oct 2025)**: Multi-row modification entry with customer search, product dropdown (filtered by active subscriptions), real-time subscription display, and validation. Supports Skip/Increase/Decrease/Add Note types with date range selection and keyboard shortcuts (Alt+A to add row, Tab on last field to add new row).
- **Unified Date Picker (Oct 2025)**: Standardized date input component (`src/components/ui/unified-date-picker.tsx`) with DD-MM-YYYY format, manual typing with auto-formatting, calendar popup with month/year dropdowns, year validation (2000-2099), and optional time picker support. **Migration complete**: All 30+ files migrated across 5 phases. Deprecated components: `date-filter.tsx`, `order-date-filter.tsx` (kept for server-side forms), `enhanced-date-filter.tsx` (replaced with preset dropdown + UnifiedDatePicker pattern).
- **Multi-Factor Authentication (Oct 2025)**: Google Authenticator TOTP integration with QR code enrollment (`src/components/auth/enroll-mfa-dialog.tsx`), login verification screen (`src/components/auth/mfa-challenge-screen.tsx`), and complete MFA management in Settings page. Features: enable/disable MFA, backup authenticator support, AAL (Authenticator Assurance Level) checking, graceful error handling, mobile-responsive design.