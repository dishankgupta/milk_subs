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
- `calculate_customer_outstanding()` - **ENHANCED** - Function to calculate outstanding using immutable opening balance logic
- `update_invoice_status()` - Function to automatically update invoice status based on payments
- `customer_outstanding_summary` - **UPDATED** - Performance view with corrected invoice status filtering ('sent' included)
- `getEffectiveOpeningBalance()` - **NEW** - Function to calculate remaining opening balance after payments

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
- **Unapplied Payments Tab**: ✅ **NEW** - Dedicated tab for unapplied payment management with customer-first allocation workflow
- **Unapplied Payment Statistics**: ✅ **NEW** - Real-time dashboard statistics showing total unapplied amounts across customers
- **Customer Selection Workflow**: ✅ **NEW** - Optimized customer selection for efficient credit allocation
- **Customer Integration**: Payment history sections on customer detail pages with available credit display

### Outstanding Management (`/dashboard/outstanding`)
- **Outstanding Dashboard**: Comprehensive overview with summary cards and advanced filtering
- **Available Credit Display**: ✅ **NEW** - Credit information visible next to customer outstanding amounts with green styling
- **Customer Outstanding Detail**: Invoice-based outstanding breakdown with unpaid invoice tracking (`/dashboard/outstanding/[customer_id]`)
- **Outstanding Reports**: Enhanced reports with invoice-based calculations (`/dashboard/outstanding/reports`)
- **Credit Filter Enhancement**: ✅ **NEW** - "Customers with Credit" filter option in outstanding reports for quick identification
- **Three-Tier Financial Display**: ✅ **NEW** - Gross Outstanding → Credits Available → Net Outstanding in all reports
- **Payment Integration**: Quick payment recording with automatic customer pre-selection
- **Print Customer Statements**: Professional PDF statements with PureDairy branding and comprehensive credit sections
- **Invoice Status Tracking**: Real-time invoice status updates (paid, partially_paid, overdue)

### Delivery Management (`/dashboard/deliveries`) ⭐ **MAJOR ARCHITECTURAL RESTRUCTURE COMPLETE**
- **Delivery List**: Searchable card-based interface with filters (date, route, completion status) + **comprehensive sort controls**
- **Filter-Responsive Dashboard**: ✅ **NEW** - Task cards dynamically update to reflect current filter state with real-time statistics
- **Professional Print System**: ✅ **NEW** - Print Report button generates professional deliveries report with filter and sort preservation
- **Advanced Sorting**: ✅ **ENHANCED** - All sorting options work correctly (Customer, Order Date, Quantity, Delivered At, Variance) with print integration
- **Additional Items Support**: ✅ **NEW** - Delivery personnel can record additional products without subscriptions (daily_order_id = NULL)
- **Self-Contained Data Model**: ✅ **RESTRUCTURED** - Deliveries table now contains all necessary fields eliminating complex joins (32% performance improvement)
- **Enhanced Variance Tracking**: ✅ **IMPROVED** - Planned vs actual vs additional items with comprehensive analytics
- **Delivery Confirmation**: Select orders and record actual delivery details (`/dashboard/deliveries/new`)
- **Bulk Delivery Confirmation**: ✅ **OPTIMIZED** - Simplified bulk confirmation with radio button interface (As Planned vs Custom Quantities)
- **Bulk Selection & Deletion**: Complete bulk selection with checkboxes, "Select All" functionality, and batch delete operations with progress feedback
- **Delivery Details**: Comprehensive delivery view with variance analysis (`/dashboard/deliveries/[id]`)
- **Edit Delivery**: Pre-populated form for delivery updates (`/dashboard/deliveries/[id]/edit`)
- **Performance Analytics**: Real-time completion rates and quantity variance tracking with filter-aware calculations
- **Order Integration**: Direct delivery confirmation from orders workflow
- **Consistent Search Experience**: Client-side real-time search and filtering matching other tables
- **Additional Items Workflow**: ✅ **ENHANCED** - Additional items managed through individual delivery pages with Phase 1 functionality intact

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
- **Sales Entry**: Cash vs QR vs Credit sales with automatic customer validation
- **Sales History**: ✅ **ENHANCED** - Professional sortable table with real-time search, advanced filtering (sale type, payment status), CSV export functionality, and instant client-side performance
- **Advanced Filtering**: ✅ **NEW** - QR filter option, intelligent date range filtering with current month defaults and smart filter state tracking
- **Professional Print System**: ✅ **NEW** - Print API route generates comprehensive sales reports with filter integration and PureDairy branding
- **Sale Details & Editing**: ✅ **NEW** - Complete view/edit workflow with GST-inclusive pricing corrections and edit restrictions for billed credit sales
- **Product Management**: GST rate configuration and product catalog management
- **GST Calculations**: Real-time inclusive/exclusive pricing with tax breakdowns
- **Customer Integration**: Sales history sections on customer detail pages
- **QR Sales Support**: ✅ **NEW** - QR sale type works identically to Cash sales but tracked separately for reporting

### Invoice Management (`/dashboard/invoices`) ⭐ **COMPLETE ARCHITECTURAL REFACTOR**
- **Additional Deliveries Integration**: ✅ **NEW** - All deliveries (subscription + additional) now properly included in invoicing for complete revenue capture
- **Cleaner Architecture**: ✅ **REFACTORED** - Direct delivery→invoice relationships via delivery_id field, eliminated complex order/subscription dependencies  
- **Simplified Data Model**: ✅ **OPTIMIZED** - Single "Delivered products" category instead of subscription/additional split, cleaner invoice presentation
- **Invoice Generation**: ✅ **ENHANCED** - Combined all deliveries + manual sales invoicing with streamlined transaction-based logic
- **Bulk Processing**: ✅ **ENHANCED** - Real-time progress updates with EventSource, cancellation support, and improved user feedback during invoice generation
- **Invoice Management**: ✅ **NEW** - Date filtering by invoice generation date with intuitive range picker, bulk selection with checkboxes, and bulk delete functionality with comprehensive safety warnings
- **Customer Selection**: ✅ **IMPROVED** - Transaction-based selection (all unbilled deliveries, credit sales, any transactions) with complete billing coverage
- **Preview System**: ✅ **FIXED** - Invoice preview now includes additional deliveries with accurate customer statistics and selection filters
- **Business Process**: ✅ **STREAMLINED** - Additional deliveries default to "delivered" status for immediate billing capability
- **Financial Year Management**: Automatic invoice numbering (YYYYYYYYNNNNN format)
- **PDF Storage**: Organized file structure with dated subfolders
- **Professional Layouts**: PureDairy branding with GST-compliant formatting, clean totals breakdown
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
- **Unapplied Payments Management Enhancement**: Complete 4-phase implementation enhancing unapplied payment visibility and allocation workflows across all system interfaces (August 27, 2025)
  - **Phase 1**: Enhanced payments dashboard with dedicated unapplied payments tab and customer-first allocation workflow
  - **Phase 2**: Integrated credit visibility across customer profiles, payments dashboard, and outstanding dashboard with consistent formatting
  - **Phase 3**: Enhanced print reports with three-tier totals system and comprehensive credit sections in customer statements and outstanding reports
  - **Phase 4**: Added "Customers with Credit" filter option in outstanding reports with efficient database filtering and Invalid Date error fixes
- **QR Sales Type Implementation**: Added new 'QR' sale type that functions identically to Cash sales but provides separate reporting capabilities for payment method analytics (August 29, 2025)
- **Deliveries Dashboard Enhancement**: Complete filter-responsive dashboard implementation with professional print system and comprehensive sorting fixes (September 1, 2025)
  - **Filter-Responsive Task Cards**: Dashboard statistics dynamically update to reflect current filter state for accurate real-time metrics
  - **Professional Print Integration**: New Print Report button with full filter and sort parameter passing for consistent report generation
  - **Sorting System Overhaul**: Fixed all sorting options (Customer, Order Date, Quantity, Delivered At, Variance) with enhanced useSorting hook fallback logic
  - **Print API Enhancement**: New `/api/print/deliveries` route with comprehensive filtering, sorting, and professional PureDairy styling
- **Deliveries Table Architectural Restructure**: Complete 5-phase implementation enabling additional items delivery capability (September 2, 2025)
  - **Database Migration**: Successfully migrated deliveries table to self-contained structure with 17 fields, nullable daily_order_id and planned_quantity
  - **Server Actions Rewrite**: Complete rewrite of deliveries.ts (684 lines) eliminating joins with 32% performance improvement
  - **UI Components Update**: All delivery components updated to DeliveryExtended interface with comprehensive TypeScript compliance
  - **Reports & APIs Enhancement**: All print routes updated for new schema with professional layouts and additional items support
  - **Integration & Testing**: End-to-end workflow testing, performance validation, and production-ready rollback procedures documented
- **Bulk Delivery Form Optimization**: Critical performance fixes and UX improvements (September 2, 2025)
  - **React Infinite Loop Resolution**: Fixed "Maximum update depth exceeded" errors affecting large datasets (91+ deliveries)
  - **BulkAdditionalItemsManager Removal**: Eliminated complex component causing rendering loops, simplified bulk workflow
  - **Radio Button Interface**: Replaced dropdown with professional radio button cards for delivery mode selection
  - **Performance Enhancement**: Optimized state management and form handling for reliable large-batch processing
  - **Alternative Workflow**: Additional items now managed through individual delivery pages for better stability
- **Invoice System Complete Refactor**: Revolutionary architectural improvements for additional deliveries billing (September 3, 2025)
  - **Additional Deliveries Integration**: Fixed critical business logic gap where additional deliveries (daily_order_id = NULL) were excluded from invoicing
  - **Cleaner Invoice Architecture**: Eliminated complex order/subscription dependencies, direct delivery→invoice relationships via delivery_id field
  - **Database Schema Enhancement**: Added delivery_id field to invoice_line_items table for clean delivery-invoice mapping
  - **Simplified Data Model**: Single deliveryItems grouping instead of separate subscription/additional categories, ~50+ lines code reduction
  - **Business Process Fix**: Additional deliveries now default to "delivered" status for immediate billing capability
  - **Database Function Update**: Fixed get_bulk_invoice_preview_optimized() to include all deliveries using self-contained delivery data
  - **Revenue Capture**: Complete billing coverage - customers now pay for all products received regardless of source
  - **Professional Invoice Layout**: Clean "Delivered products" presentation with simplified totals (Delivery Total + Manual Sales = Grand Total)
- **Sales History Management Enhancement**: Complete sales workflow and reporting implementation (September 3, 2025)
  - **QR Filter Integration**: Added QR sale type to dropdown filters for complete sales type coverage
  - **Smart Date Range Filtering**: Implemented intelligent current month defaults with filter state tracking to distinguish user modifications from system defaults
  - **Professional Print Reports**: New `/api/print/sales-history` route with comprehensive filtering, statistics, and PureDairy branding
  - **View/Edit Workflow**: Complete sale details viewing system with edit restrictions for billed credit sales maintaining accounting integrity
  - **GST Calculation Fixes**: Corrected edit form to use GST-inclusive pricing matching new sales form behavior
  - **Enhanced User Experience**: Clean filter alignment, smart reset functionality, and filter-aware print reports showing only user-applied filters

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

### Code Review Checklist ✅❌
- [ ] NEVER use `new Date()`, `Date.now()`, or `toISOString().split('T')[0]` patterns
- [ ] ALWAYS use IST utilities: `getCurrentISTDate()`, `formatDateForDatabase()`, `parseLocalDateIST()`
- [ ] Database operations use proper formatting functions
- [ ] Display dates use `formatDateIST()` for consistency
- [ ] Financial year calculations use `calculateFinancialYear()`

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