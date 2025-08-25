# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application called "milk_subs" - a comprehensive dairy business management system featuring both subscription management and manual sales tracking using:
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
- `deliveries` - Actual vs planned delivery tracking
- `payments` - Enhanced payment history with allocation tracking and status management
- `product_pricing_history` - Price change audit trail
- `sales` - Manual sales tracking (Cash/Credit) with GST compliance

### Invoice & Outstanding Management Tables
- `invoice_metadata` - Enhanced invoice generation with status tracking, payment tracking, and financial year numbering
- `invoice_line_items` - Detailed line items for each invoice (subscriptions, manual sales, adjustments)
- `invoice_payments` - Payment allocation tracking for invoice-to-payment mapping
- `unapplied_payments` - Payments not yet allocated to specific invoices
- `opening_balance_payments` - **NEW** - Tracks payments allocated to opening balance (immutable historical data)
- `gst_calculations` - GST breakdowns for compliance reporting

### Database Functions & Views
- `calculate_customer_outstanding()` - **ENHANCED** - Function to calculate outstanding using immutable opening balance logic
- `update_invoice_status()` - Function to automatically update invoice status based on payments
- `customer_outstanding_summary` - **UPDATED** - Performance view with corrected invoice status filtering ('sent' included)
- `getEffectiveOpeningBalance()` - **NEW** - Function to calculate remaining opening balance after payments

## Current Implementation Status

### ✅ Phase 1: Foundation Complete
- Complete database schema with 12 tables and comprehensive relationships
- Admin-only authentication with Supabase Auth and SSR support
- Responsive UI framework with mobile-first sidebar navigation
- Indian Rupee currency formatting throughout
- Complete TypeScript integration with strict mode

### ✅ Phase 2: Customer Management Complete
- Full customer CRUD operations with form validation
- Advanced search and filtering system with sortable columns
- Customer creation/edit forms with Zod schema validation
- Customer detail views with organized information cards
- Multiple phone number support (primary, secondary, tertiary)
- Outstanding payment tracking with opening balance integration
- Route and delivery time management
- Duplicate billing name detection and prevention

### ✅ Phase 3: Subscription Management Complete
- Complete subscription CRUD operations with comprehensive validation
- 2-day pattern subscription logic with visual preview system
- Pattern cycle calculation with automatic date management
- Subscription search and filtering with sortable table interface
- Customer-subscription integration on detail pages
- Duplicate subscription prevention (same customer + product)
- Subscription status management (active/inactive)
- Form validation with real-time pattern preview for 7-14 day cycles

### ✅ Phase 4: Order Generation & Daily Operations Complete
- Automated daily order generation from active subscriptions
- 2-day pattern cycle tracking with precise position calculation
- Order generation UI with date selection and comprehensive preview
- Daily orders list with advanced filtering and sortable columns
- Complete modification system for temporary changes (skip/increase/decrease)
- Order preview with detailed summary statistics and breakdowns
- Order management with delete/regenerate functionality
- Daily production summary reports with route and time slot analysis
- Route-wise delivery reports with mobile-optimized printing
- Modification integration seamlessly applied during order generation

### ✅ Phase 5: Payment Management System Complete
- Full payment CRUD operations with automatic outstanding calculations
- Payment entry forms with customer selection and validation
- Payment history with advanced search and sortable columns
- Outstanding amount management with real-time balance updates
- Customer payment integration with history on detail pages
- Comprehensive payment reports with collection analytics
- Payment collection rate tracking and trend analysis
- Priority-based outstanding customer reports with risk categorization
- Mobile-responsive interfaces with professional reporting

### ✅ Phase 6: Delivery Confirmation System Complete
- Complete delivery CRUD operations with variance tracking
- Delivery confirmation with actual quantity entry and calculations
- Advanced delivery list views with search and sortable columns
- Bulk delivery confirmation system with 70-80% time savings
- Delivery status management with personnel assignment
- Real-time delivery statistics with completion rates
- Comprehensive delivery performance reports with analytics
- Customer and product performance analysis with variance tracking
- Bulk selection and deletion capabilities with progress feedback

### ✅ Phase 7: Sales Management System Complete
- **Database Schema Extensions**: Complete GST integration and opening balance support
- **Manual Sales Entry**: Cash vs Credit business logic with real-time validation
- **GST-Compliant Invoicing**: Professional PDF generation with financial year numbering
- **Outstanding Reports Enhancement**: Triple-level expandable reports with comprehensive data
- **Bulk Invoice Generation**: Robust PDF generation with retry mechanisms and Chrome integration
- **Customer Integration**: Enhanced outstanding display with detailed sales history
- **Product Management**: Complete GST configuration with preview calculations

### ✅ Phase 8: Outstanding System Rework Complete
- **Database Architecture Overhaul**: Complete outstanding system redesign with invoice-based calculations
- **New Table Structure**: Added invoice_line_items, invoice_payments, unapplied_payments tables
- **Enhanced Payment Allocation**: Advanced payment-to-invoice allocation with auto-allocation modes
- **Outstanding Dashboard**: Comprehensive outstanding management section with real-time calculations
- **Invoice Status Management**: Automatic invoice status updates based on payment allocation
- **Customer Outstanding Detail**: Detailed invoice breakdown with payment history integration
- **Professional Statements**: Enhanced customer statement printing with invoice-based data

### ✅ Phase 9: Invoice Generation System Fix Complete
- **Critical Database Query Fixes**: Resolved broken outstanding_amount field references in getInvoiceStats()
- **Transaction-Based Business Logic**: Implemented correct workflow using unbilled transactions instead of circular outstanding logic
- **Enhanced Customer Selection**: New selection options (unbilled deliveries, credit sales, any transactions)
- **Helper Function Implementation**: Created getUnbilledDeliveryAmount and getUnbilledCreditSalesAmount for accurate calculations
- **Data Integrity Improvements**: Fixed invoice deletion to properly clean up invoice_line_items table
- **UI/UX Enhancement**: Updated customer selection interface with clear, descriptive options
- **Error Handling**: Added comprehensive error handling with toast notifications for better user feedback

### ✅ Phase 10: Invoice Line Items & Performance Optimization Complete
- **Schema Alignment**: Fixed invoice_line_items table schema to match code expectations (line_type → line_item_type, added order_id/sale_id columns)
- **Line Items Population**: Resolved empty invoice_line_items table by adding missing required fields (product_name, quantity, unit_price, line_total) to insert operations
- **Performance Optimization**: Eliminated N+1 query problem in invoice preview (426 queries → 1 query = 99.8% reduction)
- **Database Function**: Created optimized get_bulk_invoice_preview_optimized() function for bulk operations
- **Deletion Error Fix**: Removed obsolete outstanding_amount column references from invoice deletion process
- **Data Integrity**: Verified both subscription and manual sale line items creation with proper foreign key relationships

### ✅ Phase 11: IST Date Migration & System-Wide Timezone Compliance Complete
- **Critical Business Logic Migration**: Migrated 25+ critical files from prohibited date patterns to IST-compliant utilities
- **Financial System Accuracy**: Fixed financial year calculations, invoice numbering, and outstanding amount calculations to use consistent IST timezone
- **UI Component Standardization**: Updated dashboard statistics, order generation, invoice management, and outstanding displays with IST date handling
- **Print System Enhancement**: Migrated customer statements, route delivery reports, and production summaries to use IST formatting
- **Schema Validation Fixes**: Resolved TypeScript errors and form validation mismatches (customer opening_balance schema fix)
- **Infrastructure Improvements**: Added legacy compatibility functions and missing IST utilities for backward compatibility
- **Zero Breaking Changes**: Maintained full system functionality while eliminating timezone-related data inconsistencies
- **Production Ready**: Achieved zero TypeScript compilation errors with comprehensive IST date handling throughout the system

## Key Features Implemented

### Customer Management (`/dashboard/customers`)
- **Customer List**: Searchable table with filters (status, route, delivery time) + **sortable columns**
- **Add Customer**: Complete form with validation (`/dashboard/customers/new`)
- **Customer Details**: Comprehensive profile view (`/dashboard/customers/[id]`)
- **Edit Customer**: Pre-populated form for updates (`/dashboard/customers/[id]/edit`)

### Product Management (`/dashboard/products`)
- **Product List**: Comprehensive product catalog with GST details and subscription indicators + **sortable display**
- **Add Product**: Complete form with GST configuration and real-time breakdown preview (`/dashboard/products/new`)
- **Product Details**: Comprehensive product information with GST calculations
- **Edit Product**: Pre-populated form for product updates (`/dashboard/products/[id]/edit`)
- **GST Integration**: Real-time GST calculations with base amount and tax separation
- **Subscription Support**: Toggle for subscription-eligible products

### Subscription Management (`/dashboard/subscriptions`)
- **Subscription List**: Searchable table with filters (status, type) and customer integration + **sortable columns**
- **Add Subscription**: Complete form with pattern preview (`/dashboard/subscriptions/new`)
- **Subscription Details**: Comprehensive view with pattern visualization (`/dashboard/subscriptions/[id]`)
- **Edit Subscription**: Pre-populated form for updates (`/dashboard/subscriptions/[id]/edit`)
- **Pattern Preview**: Visual 2-day cycle preview for next 7-14 days
- **Customer Integration**: Subscription management from customer detail pages

### Order Generation System (`/dashboard/orders`)
- **Orders Dashboard**: Real-time statistics and order management overview
- **Generate Orders**: Date-based order generation with preview (`/dashboard/orders/generate`)
- **Order Preview**: Summary statistics with breakdown by route and product
- **Order Management**: List, filter, and manage daily orders by date and status + **billing name sort**
- **Modification Support**: Complete system for skip/increase/decrease temporary changes
- **Delete/Regenerate**: Ability to delete existing orders and regenerate as needed

### Modification Management (`/dashboard/modifications`)
- **Modification List**: Searchable card-based interface with filters (status, type) + **custom sort controls**
- **Add Modification**: Complete form with date range selection (`/dashboard/modifications/new`)
- **Modification Details**: Comprehensive view with customer and product info (`/dashboard/modifications/[id]`)
- **Edit Modification**: Pre-populated form for updates (`/dashboard/modifications/[id]/edit`)
- **Date Range Support**: Calendar-based start and end date selection
- **Automatic Application**: Modifications automatically applied during order generation

### Payment Management (`/dashboard/payments`)
- **Payment List**: Searchable table with filters (customer, method, date range) + **sortable columns**
- **Add Payment**: Enhanced form with invoice allocation interface (`/dashboard/payments/new`)
- **Payment Details**: Comprehensive payment view with customer info (`/dashboard/payments/[id]`)
- **Edit Payment**: Pre-populated form for payment updates (`/dashboard/payments/[id]/edit`)
- **Invoice Allocation**: Advanced payment allocation to specific invoices with auto-allocation modes
- **Unapplied Payments**: Management of payments not yet allocated to invoices
- **Customer Integration**: Payment history sections on customer detail pages

### Outstanding Management (`/dashboard/outstanding`)
- **Outstanding Dashboard**: Comprehensive overview with summary cards and advanced filtering
- **Customer Outstanding Detail**: Invoice-based outstanding breakdown with unpaid invoice tracking (`/dashboard/outstanding/[customer_id]`)
- **Outstanding Reports**: Enhanced reports with invoice-based calculations (`/dashboard/outstanding/reports`)
- **Payment Integration**: Quick payment recording with automatic customer pre-selection
- **Print Customer Statements**: Professional PDF statements with PureDairy branding
- **Invoice Status Tracking**: Real-time invoice status updates (paid, partially_paid, overdue)

### Delivery Management (`/dashboard/deliveries`)
- **Delivery List**: Searchable card-based interface with filters (date, route, completion status) + **custom sort controls with variance sorting**
- **Delivery Confirmation**: Select orders and record actual delivery details (`/dashboard/deliveries/new`)
- **Bulk Delivery Confirmation**: Multi-select orders with quick filters and batch confirmation (`/dashboard/deliveries/bulk`)
- **Bulk Selection & Deletion**: Complete bulk selection with checkboxes, "Select All" functionality, and batch delete operations with progress feedback
- **Delivery Details**: Comprehensive delivery view with variance analysis (`/dashboard/deliveries/[id]`)
- **Edit Delivery**: Pre-populated form for delivery updates (`/dashboard/deliveries/[id]/edit`)
- **Performance Analytics**: Real-time completion rates and quantity variance tracking
- **Order Integration**: Direct delivery confirmation from orders workflow
- **Consistent Search Experience**: Client-side real-time search and filtering matching other tables

### Reports & Analytics (`/dashboard/reports`)
- **Production Summary**: Daily production planning with product and route breakdowns
- **Route Delivery Reports**: Mobile-friendly delivery lists with customer contact info + **modification tracking with visual indicators and enhanced sorting**
- **Payment Collection Reports**: Monthly collection summaries and trends (`/dashboard/reports/payments`)
- **Outstanding Amounts Report**: Priority-based customer list with pending payments (`/dashboard/reports/outstanding`)
- **Delivery Performance Reports**: Comprehensive analytics with completion rates and variance tracking (`/dashboard/reports/delivery-performance`)
- **Time Slot Analysis**: Morning vs evening delivery statistics
- **Print Functionality**: ✅ **WORKING** - Dedicated print API routes with professional layouts, PureDairy branding, and auto-print functionality
- **Modification Integration**: Route delivery reports show modification details, base quantities (strikethrough), and modification summaries

### Sales Management (`/dashboard/sales`)
- **Sales Entry**: Cash vs Credit sales with automatic customer validation
- **Sales History**: ✅ **ENHANCED** - Professional sortable table with real-time search, advanced filtering (sale type, payment status), CSV export functionality, and instant client-side performance
- **Product Management**: GST rate configuration and product catalog management
- **GST Calculations**: Real-time inclusive/exclusive pricing with tax breakdowns
- **Customer Integration**: Sales history sections on customer detail pages

### Invoice Management (`/dashboard/invoices`)
- **Invoice Generation**: ✅ **FIXED** - Combined subscription + manual sales invoicing with transaction-based logic
- **Bulk Processing**: ✅ **ENHANCED** - Real-time progress updates with EventSource, cancellation support, and improved user feedback during invoice generation
- **Invoice Management**: ✅ **NEW** - Date filtering by invoice generation date with intuitive range picker, bulk selection with checkboxes, and bulk delete functionality with comprehensive safety warnings
- **Customer Selection**: ✅ **IMPROVED** - Transaction-based selection (unbilled deliveries, credit sales, any transactions) instead of circular outstanding logic
- **Preview System**: ✅ **RESTORED** - Invoice preview now loads correctly with accurate customer statistics and selection filters
- **Financial Year Management**: Automatic invoice numbering (YYYYYYYYNNNNN format)
- **PDF Storage**: Organized file structure with dated subfolders
- **Professional Layouts**: PureDairy branding with GST-compliant formatting
- **Robust PDF Generation**: Automatic retry mechanism with up to 3 attempts for transient failures
- **Enhanced Stability**: Chrome browser integration with proper timeout handling and error recovery
- **Data Integrity**: Complete invoice deletion with proper cleanup of invoice_line_items for transaction tracking accuracy

### Outstanding Reports System (`/dashboard/reports/outstanding`)
- **Triple-Level Expandable Reports**: Customer → Transaction Type → Individual Details
- **Comprehensive Data Integration**: Opening balance + current outstanding calculations
- **Monthly Subscription Grouping**: Product-level breakdowns with quantity tracking
- **Professional Print Options**: Summary, customer statements, and complete reports
- **Real-time Calculations**: Dynamic outstanding amount updates

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

- Application currently running at localhost:3000 with Turbopack for optimal development
- Database: 16 tables with comprehensive relationships and RLS policies
- Authentication: Admin-only access with Supabase Auth and SSR support
- All core business features are fully functional and production-ready
- Complete dairy business management system with subscription and manual sales capabilities

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

### Recent Achievements (August 2025)
- **Sales Management System**: Complete manual sales tracking with Cash/Credit business logic
- **Sales History Enhancement**: Professional sortable table with real-time search, advanced filtering, CSV export, and hydration fix implementation
- **Invoice Generation**: Professional PDF generation with financial year numbering and bulk processing
- **Bulk Invoice Enhancement**: Real-time progress updates, cancellation support, and improved user feedback during generation
- **Invoice Management Enhancement**: Date filtering and bulk delete functionality with comprehensive safety features
- **Outstanding System Rework**: Complete overhaul of outstanding calculations with invoice-based tracking (August 20, 2025)
- **Payment Allocation System**: Advanced payment-to-invoice allocation with auto-allocation modes and unapplied payment management
- **Outstanding Dashboard**: New comprehensive section with real-time calculations and customer detail views
- **Database Architecture Enhancement**: Added 3 new tables and enhanced existing tables for proper invoice-payment tracking
- **System Stability**: Resolved all PDF generation errors with robust retry mechanisms and outstanding calculation accuracy
- **Invoice System Fix**: Complete resolution of invoice generation blockage with transaction-based logic (August 21, 2025)
- **Opening Balance System Fix**: Complete resolution of opening balance data integrity issue with immutable historical tracking (August 21, 2025)
- **Outstanding Dashboard Recovery**: Fixed missing outstanding customers by including 'sent' invoice status in calculations
- **Invoice Line Items Population Fix**: Resolved empty invoice_line_items table by fixing schema mismatch and missing required fields in insert operations (August 22, 2025)
- **Outstanding Report Timezone Fix**: Complete resolution of timezone date issues in outstanding reports print API causing incorrect period dates (August 22, 2025)
- **IST Date Migration Complete**: Comprehensive system-wide migration from prohibited date patterns to IST-compliant utilities across 25+ critical files, eliminating timezone inconsistencies in financial calculations, invoice numbering, and business logic (August 25, 2025)
- **Date Runtime Error Fix**: Resolved `date.toLocaleDateString is not a function` error by standardizing date parsing architecture - formatting functions now only accept Date objects while properly parsing strings at component boundaries (August 25, 2025)

## Phase 5 Sales System Architecture (COMPLETE)

### Database Schema Extensions
- **Products Table**: GST rate fields (gst_rate, unit_of_measure, is_subscription_product)
- **Customers Table**: opening_balance field for historical outstanding tracking
- **Sales Table**: Cash/Credit sale types with GST amount tracking and payment status
- **Invoice Metadata**: Financial year-based numbering with file path storage

### Business Logic Implementation
- **Cash Sales**: No customer assignment, immediate payment completion
- **Credit Sales**: Customer required, automatic outstanding amount updates
- **GST Calculations**: Inclusive pricing with base amount and tax separation
- **Invoice Numbering**: YYYYYYYYNNNNN format with financial year tracking

### UI Integration Plan
- **Enhanced Navigation**: Sales and Invoices sections with sub-menus
- **Dashboard Extensions**: Sales metrics cards and pending invoice indicators
- **Customer Profiles**: Sales history sections with enhanced outstanding display
- **Outstanding Reports**: Triple-level expandable tables (Customer → Transaction Type → Details)

### Professional Invoice System
- **PDF Generation**: Professional layouts with PureDairy branding
- **Bulk Processing**: Date range selection with progress tracking
- **File Organization**: Dated subfolders with individual and combined PDFs
- **GST Compliance**: Proper tax breakdowns and regulatory formatting

### Critical Features
- **Outstanding Report Enhancement**: Most critical feature - comprehensive customer balance tracking
- **Opening Balance Integration**: Historical outstanding amounts + current period = total
- **Real-time Calculations**: Automatic updates to customer outstanding on credit sales
- **Print System Integration**: Leveraging existing print infrastructure for consistency

## Development Workflow

1. **Server Actions**: Use `/src/lib/actions/` for database operations
   - `/src/lib/actions/customers.ts` - Customer CRUD operations and opening balance management
   - `/src/lib/actions/subscriptions.ts` - Subscription CRUD operations
   - `/src/lib/actions/orders.ts` - Order generation and management operations
   - `/src/lib/actions/modifications.ts` - Modification CRUD operations
   - `/src/lib/actions/payments.ts` - Enhanced payment CRUD with invoice allocation and unapplied payment management
   - `/src/lib/actions/deliveries.ts` - Individual and bulk delivery confirmation operations
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

**🇮🇳 CRITICAL: ALL date operations MUST use Indian Standard Time (IST) utilities to ensure data consistency across the dairy management system.**

### Required IST Utilities (src/lib/date-utils.ts)

**Core Functions - MANDATORY for all date operations:**
- `getCurrentISTDate()` - Get current date in IST context (replaces `new Date()`)
- `formatDateIST(date)` - Format dates for display (dd/MM/yyyy format)
- `parseLocalDateIST(dateString)` - Parse date strings in IST context
- `formatDateForDatabase(date)` - Format dates for database storage (YYYY-MM-DD)
- `formatTimestampForDatabase(date)` - Format timestamps for database storage

**Business Logic Functions:**
- `calculateFinancialYear(date)` - Calculate Indian financial year (April-March)
- `addDaysIST(date, days)` - Add days while maintaining IST context (all days are working days)
- `isWithinBusinessHours(date)` - Check if date falls within business hours (6 AM - 12 PM, 5 PM - 9 PM IST)

**Validation Functions:**
- `isValidISTDate(date)` - Validate if date object is valid
- `validateDateRange(startDate, endDate)` - Validate date ranges
- `checkTimezoneConsistency(date)` - Ensure date maintains IST context

**Display Functions:**
- `formatDateTimeIST(date)` - Format date with time (dd/MM/yyyy, HH:mm)
- `formatBusinessDate(date)` - Format for business documents (DD-MM-YYYY)
- `getRelativeTimeIST(date)` - Get relative time strings ("2 days ago", "in 3 hours")

### PROHIBITED Patterns - NEVER USE THESE:

❌ **Forbidden Date Patterns:**
```typescript
// NEVER use these patterns - they cause timezone inconsistencies
new Date()                           // Use getCurrentISTDate()
new Date(dateString)                 // Use parseLocalDateIST(dateString)
date.toISOString().split('T')[0]     // Use formatDateForDatabase(date)
new Date().toISOString()             // Use formatTimestampForDatabase(getCurrentISTDate())
Date.now()                           // Use getCurrentISTDate().getTime()
```

### Required Patterns - ALWAYS USE THESE:

✅ **Correct IST Patterns:**
```typescript
// Server Actions - Date Operations
import { getCurrentISTDate, formatDateForDatabase, parseLocalDateIST } from '@/lib/date-utils'

// Get current date
const now = getCurrentISTDate()

// Format date for database
const dbDate = formatDateForDatabase(getCurrentISTDate())

// Parse user input
const userDate = parseLocalDateIST(formData.dateString)

// Format for display
const displayDate = formatDateIST(date)
```

### TypeScript Types for IST

**Use IST-specific types from `/src/lib/types.ts`:**
- `ISTDateString` - For date strings in IST format
- `ISTTimestamp` - For timestamp strings with IST context
- `ISTDateRange` - For date range objects with IST dates

### Code Review Checklist

**Before committing any code with date operations, verify:**
- [ ] No usage of `new Date()` without IST context
- [ ] No `toISOString().split('T')[0]` patterns
- [ ] All date formatting uses IST utilities
- [ ] Database operations use `formatDateForDatabase()` or `formatTimestampForDatabase()`
- [ ] Display dates use `formatDateIST()` or appropriate display functions
- [ ] User input parsing uses `parseLocalDateIST()`
- [ ] Business logic uses IST-aware calculation functions
- [ ] Financial year calculations use `calculateFinancialYear()`

### Common Pitfalls & Solutions

**1. Database Date Storage:**
```typescript
// ❌ Wrong - timezone inconsistency
const date = new Date().toISOString().split('T')[0]

// ✅ Correct - IST context maintained
const date = formatDateForDatabase(getCurrentISTDate())
```

**2. User Input Processing:**
```typescript
// ❌ Wrong - loses IST context
const userDate = new Date(formData.date)

// ✅ Correct - maintains IST context
const userDate = parseLocalDateIST(formData.date)
```

**3. Display Formatting:**
```typescript
// ❌ Wrong - inconsistent formatting
const display = date.toLocaleDateString()

// ✅ Correct - consistent dd/MM/yyyy format
const display = formatDateIST(date)
```

### Testing Requirements

**All date-dependent code MUST include:**
- Unit tests for IST utility usage
- Edge case testing (month boundaries, leap years, financial year transitions)
- Performance validation for bulk date operations
- Integration tests for business workflows with dates

**Run comprehensive test suite:**
```bash
pnpm test  # All IST tests must pass before deployment
```

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

### Schema Reference (Quick Access)
**16 Tables Overview:**
- **Core**: customers, products, routes, base_subscriptions, modifications, daily_orders, deliveries, payments, product_pricing_history, sales
- **Invoice System**: invoice_metadata, invoice_line_items, invoice_payments, unapplied_payments, opening_balance_payments, gst_calculations
- **Functions**: calculate_customer_outstanding(), update_invoice_status(), getEffectiveOpeningBalance()
- **Views**: customer_outstanding_summary

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

## Deployment Notes

- Remember to use MCP servers as per your need.
- IMPORTANT - All Linear issues have to be created and updated in the Milk Subs - Dairy Management System Project in Linear. URL is https://linear.app/dishank/project/milk-subs-dairy-business-management-system-638a16f66b40