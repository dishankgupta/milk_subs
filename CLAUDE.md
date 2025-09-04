# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application called "milk_subs" - a comprehensive dairy business management system featuring both subscription management and manual sales tracking using:
- React 19 for modern UI development
- TypeScript for type safety
- Tailwind CSS 4 for styling
- pnpm as the package manager
- Supabase for backend services (@supabase/ssr, @supabase/supabase-js)
- Radix UI components for accessible UI primitives
- Shadcn/ui component library for forms and UI elements
- React Hook Form + Zod for form validation
- Sonner for toast notifications
- Lucide React for icons

## Development Commands

- `pnpm dev` - Start development server with Turbopack (recommended)
- `pnpm build` - Build production application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test-pdf` - Test PDF generation functionality with Chrome browser

## Architecture

The project follows Next.js App Router structure:
- `/src/app/` - App Router pages and layouts
- `/src/app/layout.tsx` - Root layout with Geist fonts and toast provider
- `/src/app/page.tsx` - Homepage with authentication redirect
- `/src/app/auth/login/` - Authentication pages
- `/src/app/dashboard/` - Protected admin dashboard
- `/src/app/dashboard/customers/` - Customer management pages
- `/src/app/dashboard/products/` - Product management pages
- `/src/app/globals.css` - Global styles with CSS variables
- `/src/components/` - Reusable UI components
- `/src/components/ui/` - Shadcn/ui component library
  - `/src/components/ui/error-boundary.tsx` - **NEW** - Reusable error boundary component for graceful error handling
- `/src/lib/` - Utilities, types, validations, and server actions
- `/public/` - Static assets

## Database Schema

Complete Supabase database with 16 tables:

### Core Business Tables
- `customers` - Customer profiles with billing/contact info, routes, and opening balance (outstanding_amount removed)
- `products` - Extended product catalog with GST rates (Cow/Buffalo Milk, Malai Paneer, Buffalo/Cow Ghee)
- `routes` - Route 1 and Route 2 with personnel management
- `base_subscriptions` - Daily/Pattern subscription types with 2-day cycle support
- `modifications` - Temporary subscription changes (skip/increase/decrease)
- `daily_orders` - Generated orders with pricing and delivery info
- `deliveries` - **RESTRUCTURED** - Self-contained delivery tracking with additional items support (17 fields, nullable daily_order_id, nullable planned_quantity)
- `payments` - Enhanced payment history with allocation tracking and status management
- `product_pricing_history` - Price change audit trail
- `sales` - Manual sales tracking (Cash/Credit/QR) with GST compliance

### Invoice & Outstanding Management Tables
- `invoice_metadata` - Enhanced invoice generation with status tracking, payment tracking, and financial year numbering
- `invoice_line_items` - **ENHANCED** - Detailed line items with direct delivery_id references for cleaner architecture (subscriptions, additional deliveries, manual sales, adjustments)
- `invoice_payments` - Payment allocation tracking for invoice-to-payment mapping
- `unapplied_payments` - Payments not yet allocated to specific invoices
- `opening_balance_payments` - **NEW** - Tracks payments allocated to opening balance (immutable historical data)
- `gst_calculations` - GST breakdowns for compliance reporting

### Database Functions & Views
**Functions:**
- `calculate_customer_outstanding()` - **ENHANCED** - Function to calculate outstanding using immutable opening balance logic
- `update_invoice_status()` - Function to automatically update invoice status based on payments
- `getEffectiveOpeningBalance()` - **NEW** - Function to calculate remaining opening balance after payments

**Views:**
- `customer_outstanding_summary` - **UPDATED** - Performance view with corrected invoice status filtering ('sent' included)
- `customer_payment_breakdown` - Payment history reporting with customer details
- `customer_subscription_breakdown` - Monthly subscription analytics with product breakdowns
- `customer_sales_breakdown` - Manual sales reporting through invoice line items
- `outstanding_report_data` - Extended outstanding reporting with full customer details

## Current Implementation Status

### ✅ All Major Phases Complete
- **Phase 1-3**: Foundation, Customer & Subscription Management with complete CRUD operations
- **Phase 4-6**: Order Generation, Payment & Delivery Systems with advanced automation  
- **Phase 7-9**: Sales Management & Outstanding System Rework with invoice-based calculations
- **Phase 10-12**: Performance Optimization (99.8% query reduction), IST Migration & Unapplied Payments

### Recent Critical Achievements (August 2025)
- **IST Timezone Migration**: Complete system-wide migration across 25+ files ensuring data consistency
- **Unapplied Payments System**: 4-phase enhancement with customer-first allocation workflows
- **Invoice-Based Outstanding**: Complete overhaul from circular logic to transaction-based calculations
- **Performance Optimization**: Eliminated N+1 queries, optimized bulk operations with real-time progress
- **Professional PDF System**: Robust generation with retry mechanisms and Chrome integration
- **Performance Optimization**: Customer-specific queries and batch processing for efficient unapplied payment operations
- **Error Handling**: Comprehensive validation and graceful error handling including Invalid Date fixes for print reports

## Key Features Implemented

### Core Management Modules
- **Customer Management** (`/dashboard/customers`): Complete CRUD with searchable tables, sortable columns, opening balance tracking
- **Product Management** (`/dashboard/products`): GST-integrated catalog with subscription support and real-time calculations
- **Subscription Management** (`/dashboard/subscriptions`): Pattern-based subscriptions with 2-day cycle preview and customer integration
- **Order Generation** (`/dashboard/orders`): Automated daily order generation with modification support and bulk operations
- **Modification System** (`/dashboard/modifications`): Temporary subscription changes (skip/increase/decrease) with date range support

### Financial & Operations Modules
- **Payment Management** (`/dashboard/payments`): Invoice allocation system with unapplied payments tracking and credit management
- **Outstanding Management** (`/dashboard/outstanding`): Invoice-based calculations with three-tier display (Gross→Credit→Net)
- **Delivery Management** (`/dashboard/deliveries`): ⭐ **RESTRUCTURED** - Self-contained delivery tracking with additional items support (32% performance improvement)
- **Sales Management** (`/dashboard/sales`): Manual sales tracking (Cash/QR/Credit) with GST compliance and professional reporting
- **Invoice Management** (`/dashboard/invoices`): ⭐ **REFACTORED** - Complete revenue capture with direct delivery-invoice relationships

### Reports & Analytics
- **Production Reports**: Daily planning with route and product breakdowns
- **Delivery Reports**: Mobile-friendly lists with modification tracking and variance analysis
- **Outstanding Reports**: Triple-level expandable reports with comprehensive print options
- **Professional Print System**: Dedicated API routes with PureDairy branding across all modules

### Technical Features
- Form validation with Zod schemas and React Hook Form
- Toast notifications with Sonner for user feedback  
- Loading states and comprehensive error handling
- Mobile-responsive design throughout all interfaces
- TypeScript strict mode with proper type definitions
- ESLint compliant codebase
- **IST Date Compliance** - Complete system-wide migration to Indian Standard Time utilities for timezone consistency
- **Comprehensive table sorting functionality** - All data tables support column sorting with visual indicators
- **Professional print system** - Dedicated API routes for all reports with PureDairy branding
- **Bulk operations** - Efficient bulk delivery confirmation and invoice generation
- **PDF generation** - Robust Puppeteer-based system with retry mechanisms
- **Real-time search** - Client-side search and filtering across all data tables

## TypeScript Configuration

- Uses path mapping with `@/*` pointing to `./src/*`
- Strict mode enabled
- ES2017 target for modern browser support

## Development Notes

- Application currently running at localhost:3002 with Turbopack for optimal development
- Authentication: Admin-only access with Supabase Auth and SSR support
- All core business features are fully functional and production-ready
- Complete dairy business management system with subscription and manual sales capabilities

## Critical Architecture Decisions (September 2025)

### Invoice System Complete Refactor (September 3, 2025)
**Problem**: Additional deliveries (daily_order_id = NULL) were excluded from invoicing, creating revenue leakage and complex billing logic.

**Solution**: Revolutionary architectural simplification with complete revenue capture
- **Direct Delivery-Invoice Relationships**: Added delivery_id field to invoice_line_items, eliminated complex order/subscription dependencies
- **Unified Delivery Processing**: Single deliveryItems grouping instead of separate subscription/additional categories
- **Business Process Streamlining**: Additional deliveries default to "delivered" status for immediate billing
- **Database Function Optimization**: Updated get_bulk_invoice_preview_optimized() for complete delivery inclusion

**Technical Benefits**:
- ✅ Eliminated ~50+ lines of complex separation logic
- ✅ Cleaner invoice architecture with direct delivery references
- ✅ Simplified data model with single delivery category
- ✅ Improved database query performance with self-contained delivery data

**Business Impact**:
- ✅ **Complete Revenue Capture**: All delivered products now properly billed regardless of source
- ✅ **Simplified Billing Process**: No manual status changes required for additional deliveries
- ✅ **Professional Invoice Layout**: Clean "Delivered products" presentation with simplified totals
- ✅ **Accurate Financial Reporting**: Invoice previews show complete customer billing amounts

### Bulk Delivery Form Optimization (September 2, 2025)
**Problem**: React infinite loop errors ("Maximum update depth exceeded") when handling 91+ deliveries in bulk confirmation.

**Solution**: Architectural simplification and performance optimization
- **BulkAdditionalItemsManager Removed**: Complex component causing rendering loops eliminated
- **Simplified Workflow**: Bulk form focuses on core delivery confirmation without additional items complexity
- **Radio Button Interface**: Professional radio button cards replace dropdown for better UX
- **Alternative Path**: Additional items managed through individual delivery pages (Phase 1 functionality preserved)

**Technical Benefits**:
- ✅ Eliminated React rendering loops and performance issues
- ✅ Improved form stability with large datasets (91+ deliveries tested)
- ✅ Better user experience with radio button interface
- ✅ Simplified codebase maintenance and debugging

**Business Impact**:
- ✅ Reliable bulk delivery confirmation for high-volume operations
- ✅ Preserved additional items functionality through alternative workflow
- ✅ Enhanced user experience with professional interface design
- ✅ Scalable architecture supporting business growth

### Development Journal
- Journal entries stored in /dev-journal/ folder using format YYYYMMDDHHMM-dev-journal.md
- New Entries to /dev-journal/ have to be in the following format of sections:
   **Date - Title**
   **Time**
   **Goals**
   **What I accomplished:**
   **Challenges faced:**
   **Key learnings:**
   **Next session goals:**
- Development history shows systematic implementation from basic CRUD to advanced features
- Latest entries document complete sales management system implementation

### System Status
- ✅ **ALL MAJOR PHASES COMPLETE**: Customer management, subscriptions, orders, payments, deliveries, sales, invoicing, IST date migration
- ✅ **PRODUCTION-READY**: All features tested and validated with comprehensive error handling
- ✅ **MOBILE-OPTIMIZED**: Responsive design throughout with mobile-friendly interfaces
- ✅ **PROFESSIONAL REPORTS**: Complete print system with PureDairy branding across all reports
- ✅ **GST COMPLIANCE**: Full GST integration with proper tax calculations and invoice formatting
- ✅ **ROBUST PDF GENERATION**: Puppeteer-based system with retry mechanisms and Chrome integration
- ✅ **COMPREHENSIVE DATA MANAGEMENT**: Advanced search, filtering, and sorting across all data tables
- ✅ **IST TIMEZONE COMPLIANCE**: Complete system-wide migration to IST date utilities ensuring data consistency and accuracy

### Recent Major Achievements (Aug-Sep 2025)

**Critical System Enhancements:**
- **IST Date Migration**: Complete system-wide migration across 25+ files ensuring timezone consistency (Aug 25)
- **Outstanding System Overhaul**: Invoice-based calculations with immutable opening balance logic (Aug 20-22)
- **Unapplied Payments System**: 4-phase enhancement with customer-first allocation workflows (Aug 27)
- **Performance Optimization**: 99.8% query reduction with bulk operations and real-time progress

**Major Architectural Improvements:**
- **Deliveries Restructure**: Self-contained data model with 17 fields, 32% performance improvement (Sep 2)
- **Invoice System Refactor**: Complete revenue capture with direct delivery-invoice relationships (Sep 3)
- **Bulk Form Optimization**: Resolved React infinite loops, radio button interface for 91+ deliveries (Sep 2)
- **Professional PDF System**: Robust generation with retry mechanisms and Chrome integration

**Business Logic Fixes:**
- **Additional Deliveries Billing**: Fixed critical gap where additional deliveries were excluded from invoicing
- **QR Sales Implementation**: New payment method tracking identical to Cash but separate reporting (Aug 29)
- **Sales History Enhancement**: Professional reporting with advanced filtering and print integration (Sep 3)
- **Filter-Responsive Dashboards**: Dynamic statistics with print system integration (Sep 1)

## Development Workflow

1. **Server Actions**: Use `/src/lib/actions/` for database operations
   - `/src/lib/actions/customers.ts` - Customer CRUD operations and opening balance management
   - `/src/lib/actions/subscriptions.ts` - Subscription CRUD operations
   - `/src/lib/actions/orders.ts` - Order generation and management operations
   - `/src/lib/actions/modifications.ts` - Modification CRUD operations
   - `/src/lib/actions/payments.ts` - Enhanced payment CRUD with invoice allocation and unapplied payment management
   - `/src/lib/actions/deliveries.ts` - **RESTRUCTURED** - Individual and bulk delivery confirmation with additional items support (684 lines rewritten)
   - `/src/lib/actions/reports.ts` - Production and delivery report generation
   - `/src/lib/actions/sales.ts` - Manual sales CRUD operations with GST calculations
   - `/src/lib/actions/invoices.ts` - Invoice generation, bulk processing, and line item management
   - `/src/lib/actions/outstanding.ts` - Outstanding calculations, invoice-based tracking, and payment allocation
2. **Validation**: Zod schemas in `/src/lib/validations.ts` (includes sales and invoice schemas)
3. **Types**: TypeScript interfaces in `/src/lib/types.ts` (extended for sales system)
4. **Utilities**: Helper functions for business logic
   - `/src/lib/subscription-utils.ts` - Pattern calculations
   - `/src/lib/gst-utils.ts` - GST calculations and invoice numbering
   - `/src/lib/invoice-utils.ts` - PDF generation and file management
5. **UI Components**: Shadcn/ui components in `/src/components/ui/`
6. **Forms**: React Hook Form with Zod resolver for validation
7. **Database**: Supabase with MCP server integration for CLI operations
8. **Print System**: Dedicated API routes under `/src/app/api/print/` for professional report printing
   - `/src/app/api/print/deliveries/` - **NEW** - Professional deliveries report with filter and sort integration
   - `/src/app/api/print/sales-history/` - **NEW** - Comprehensive sales history reports with advanced filtering and statistics
9. **PDF Generation**: Puppeteer-based PDF generation with Chrome browser integration
   - `/src/lib/file-utils.ts` - PDF generation utilities with retry mechanisms and timeout handling
   - `/scripts/test-pdf.js` - PDF generation testing script for validation
   - Automatic Chrome installation via postinstall script
10. **Sorting Infrastructure**: 
    - `/src/hooks/useSorting.ts` - Reusable sorting hook with support for nested objects
    - `/src/components/ui/sortable-table-head.tsx` - Sortable table headers with visual indicators
    - Sort types and configurations in `/src/lib/types.ts`
11. **IST Date Handling**: **MANDATORY** - Use only IST utilities from `/src/lib/date-utils.ts` for ALL date operations
    - `/src/lib/date-utils.ts` - Comprehensive IST utilities (400+ lines, 40+ functions)
    - **NEVER** use `new Date()`, `Date.now()`, or `toISOString().split('T')[0]` patterns
    - **ALWAYS** use `getCurrentISTDate()`, `formatDateIST()`, `parseLocalDateIST()` for consistency

## IST Date Handling Standards

**🇮🇳 CRITICAL: ALL date operations MUST use IST utilities from `/src/lib/date-utils.ts` (400+ lines, 40+ functions)**

### Mandatory Functions
- **Core**: `getCurrentISTDate()`, `formatDateIST()`, `parseLocalDateIST()`, `formatDateForDatabase()`, `formatTimestampForDatabase()`
- **Business**: `calculateFinancialYear()`, `addDaysIST()`, `isWithinBusinessHours()`
- **Display**: `formatDateTimeIST()`, `formatBusinessDate()`, `getRelativeTimeIST()`
- **Validation**: `isValidISTDate()`, `validateDateRange()`, `checkTimezoneConsistency()`

### Critical Rules
❌ **NEVER** use `new Date()`, `Date.now()`, or `toISOString().split('T')[0]`
✅ **ALWAYS** use IST utilities for consistency across financial calculations and business logic

## Testing & Validation

- Build process: `pnpm build` (zero TypeScript errors)
- Linting: `pnpm lint` (ESLint compliant)
- Form validation: Prevents invalid data entry
- Database constraints: Proper foreign key relationships
- Authentication: Protected routes with middleware

## Database Operations Guidelines

**CRITICAL: To optimize token usage and avoid context consumption:**

### Database Query Strategy
- **ALWAYS use Task tool with general-purpose agent** for any database schema exploration, table discovery, or structural analysis
- **NEVER use `mcp__supabase__list_tables` directly** - delegate to Task tool to preserve context
- **Reference CLAUDE.md schema documentation first** before making any live database calls
- **Use targeted SQL queries** with `mcp__supabase__execute_sql` for specific data operations only

### When to Use Live Database Calls
- ✅ Specific data queries (`SELECT * FROM customers WHERE...`)
- ✅ Data modifications (`INSERT`, `UPDATE`, `DELETE`)
- ✅ Function calls (`SELECT calculate_customer_outstanding(...)`)
- ❌ Schema exploration (use Task tool instead)
- ❌ Table structure discovery (use CLAUDE.md reference above)
- ❌ Column listing (reference existing code patterns)

### Context Preservation Rules
1. **Schema Discovery**: Always delegate to Task tool
2. **Data Operations**: Use direct MCP calls for efficiency
3. **Code References**: Use existing server actions as schema reference
4. **Documentation**: This CLAUDE.md file contains complete schema information

## Performance Optimization Standards

**🚀 CRITICAL: All customer-facing pages MUST follow these performance optimization patterns implemented in the outstanding detail page (`/dashboard/outstanding/[customer_id]`).**

### Server-Side Data Fetching (MANDATORY)
- **Move data fetching to server components** for better caching and faster initial load
- **Use Promise.all for parallel queries** instead of sequential database calls
- **Pre-fetch essential data** on server to eliminate client-side loading waterfalls
- **Limit large datasets** by default (e.g., recent payments only, with "view more" options)

### Component Performance Standards
- **Wrap components with React.memo** to prevent unnecessary re-renders
- **Use useMemo for expensive calculations** (date comparisons, filtering, aggregations)
- **Accept initialData props** to avoid double-fetching when data is available server-side
- **Implement progressive loading** with meaningful skeleton states

### Error Handling & UX Requirements
- **ErrorBoundary components** must wrap all major page sections
- **Suspense boundaries** with detailed skeleton loading states
- **Graceful error recovery** with retry functionality
- **Meaningful loading states** that match the actual content structure

### Database Query Optimization
- **Parallel query execution** using Promise.all for independent data
- **Smart query limits** (default 5-10 items, expandable on demand)
- **Efficient joins** and proper indexing considerations
- **Avoid N+1 query patterns** through batched operations

### Implementation Example (Outstanding Detail Page)
```typescript
// ✅ Correct Pattern - Server Component with Parallel Data Fetching
export default async function Page({ params }) {
  const [data, payments] = await Promise.all([
    getCustomerOutstanding(customerId),
    getCustomerPayments(customerId, 5) // Limited for performance
  ])
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<DetailedSkeleton />}>
        <OptimizedComponent 
          initialData={data} 
          initialPayments={payments} 
        />
      </Suspense>
    </ErrorBoundary>
  )
}
```

### Performance Metrics to Achieve
- **First Contentful Paint**: < 1.5s on average network
- **Time to Interactive**: < 3s on average network  
- **Database Queries**: < 3 parallel queries per page load
- **Bundle Size**: Minimize client-side JavaScript for data fetching

## Deployment Notes

- Remember to use MCP servers as per your need.
- IMPORTANT - All Linear issues have to be created and updated in the Milk Subs - Dairy Management System Project in Linear. URL is https://linear.app/dishank/project/milk-subs-dairy-business-management-system-638a16f66b40

## Documentation References

### Core Architecture Documentation
- **DELIVERIES-RESTRUCTURE-PLAN.md**: Complete 5-phase deliveries table architectural restructure implementation plan with database schema changes, performance improvements, and migration procedures
- **deliveries-new-ui-plan.md**: Comprehensive deliveries UI enhancement plan including Phase 1-4 completion reports and critical architecture revision decisions (BulkAdditionalItemsManager removal and radio button interface implementation)

### Key Documentation Status
- ✅ **Database Migration**: Complete deliveries table restructure with 17 fields, nullable foreign keys
- ✅ **Performance Optimization**: 32% query performance improvement with self-contained data model  
- ✅ **UI Enhancement**: Additional items support through individual delivery pages
- ✅ **Bulk Form Optimization**: React infinite loop resolution and radio button interface implementation
- ✅ **Production Ready**: All phases tested and validated with rollback procedures documented