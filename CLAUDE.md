# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application called "milk_subs" - a dairy subscription management system using:
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

## Architecture

The project follows Next.js App Router structure:
- `/src/app/` - App Router pages and layouts
- `/src/app/layout.tsx` - Root layout with Geist fonts and toast provider
- `/src/app/page.tsx` - Homepage with authentication redirect
- `/src/app/auth/login/` - Authentication pages
- `/src/app/dashboard/` - Protected admin dashboard
- `/src/app/dashboard/customers/` - Customer management pages
- `/src/app/globals.css` - Global styles with CSS variables
- `/src/components/` - Reusable UI components
- `/src/components/ui/` - Shadcn/ui component library
- `/src/lib/` - Utilities, types, validations, and server actions
- `/public/` - Static assets

## Database Schema

Complete Supabase database with 9 tables:
- `customers` - Customer profiles with billing/contact info, routes, payment details
- `products` - Cow Milk (₹75/L) and Buffalo Milk (₹80/L) 
- `routes` - Route 1 and Route 2 with personnel management
- `base_subscriptions` - Daily/Pattern subscription types with 2-day cycle support
- `modifications` - Temporary subscription changes (skip/increase/decrease)
- `daily_orders` - Generated orders with pricing and delivery info
- `deliveries` - Actual vs planned delivery tracking
- `payments` - Customer payment history and outstanding amounts
- `product_pricing_history` - Price change audit trail

## Current Implementation Status

### ✅ Phase 1: Foundation Complete
- Database schema with all 9 tables and relationships
- Admin-only authentication with Supabase Auth
- Responsive UI framework with sidebar navigation
- Indian Rupee currency formatting
- Mobile-first responsive design

### ✅ Phase 2: Customer Management Complete
- Complete customer CRUD operations
- Advanced search and filtering system
- Customer creation/edit forms with validation
- Customer detail views with organized information cards
- Multiple phone number support (primary, secondary, tertiary)
- Outstanding payment tracking
- Route and delivery time management
- Duplicate billing name detection

### ✅ Phase 2: Subscription Management Complete
- Complete subscription CRUD operations with validation
- 2-day pattern subscription logic with visual preview
- Pattern cycle calculation and date management
- Subscription search and filtering system
- Customer-subscription integration on detail pages
- Duplicate subscription prevention (same customer + product)
- Subscription status management (active/inactive)
- Form validation with pattern preview (7-day and 14-day cycles)

### ✅ Phase 3: Order Generation & Daily Operations Complete
- Automated daily order generation from active subscriptions
- 2-day pattern cycle tracking and position calculation
- Order generation UI with date selection and preview functionality
- Daily orders list view with filtering and management capabilities
- Complete modification system for temporary subscription changes (skip/increase/decrease)
- Order preview with summary statistics (total orders, value, breakdowns)
- Order management with delete/regenerate functionality
- Daily production summary reports with comprehensive breakdowns
- Route-wise delivery reports with mobile-friendly printing
- Modification integration with order generation system

### ✅ Phase 4.1: Payment Management System Complete
- Complete payment CRUD operations with automatic outstanding amount calculations
- Payment entry forms with customer selection, amount, date, method tracking
- Payment history views with advanced search and filtering capabilities
- Outstanding amount management with real-time balance updates
- Customer payment integration with payment history on detail pages
- Comprehensive payment reports (collection summaries, outstanding amounts)
- Payment collection rate tracking and analytics
- Priority-based outstanding customer reports (high/medium/low priority)
- Mobile-responsive payment interfaces throughout

### ✅ Phase 4.2: Delivery Confirmation System Complete
- Complete delivery CRUD operations with planned vs actual quantity tracking
- Delivery confirmation forms with actual quantity entry and variance calculations
- Delivery list views with advanced search and filtering capabilities
- Delivery status management with delivery person assignment and notes
- Real-time delivery statistics with completion rates and quantity variance
- Delivery performance reports with comprehensive analytics
- Customer and product performance analysis with variance tracking
- Daily, customer-wise, and product-wise delivery breakdowns
- Mobile-responsive delivery interfaces with professional reporting

## Key Features Implemented

### Customer Management (`/dashboard/customers`)
- **Customer List**: Searchable table with filters (status, route, delivery time) + **sortable columns**
- **Add Customer**: Complete form with validation (`/dashboard/customers/new`)
- **Customer Details**: Comprehensive profile view (`/dashboard/customers/[id]`)
- **Edit Customer**: Pre-populated form for updates (`/dashboard/customers/[id]/edit`)

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
- **Add Payment**: Complete form with validation and customer pre-selection (`/dashboard/payments/new`)
- **Payment Details**: Comprehensive payment view with customer info (`/dashboard/payments/[id]`)
- **Edit Payment**: Pre-populated form for payment updates (`/dashboard/payments/[id]/edit`)
- **Outstanding Tracking**: Real-time outstanding amount calculations and updates
- **Customer Integration**: Payment history sections on customer detail pages

### Delivery Management (`/dashboard/deliveries`)
- **Delivery List**: Searchable card-based interface with filters (date, route, completion status) + **custom sort controls**
- **Delivery Confirmation**: Select orders and record actual delivery details (`/dashboard/deliveries/new`)
- **Bulk Delivery Confirmation**: Multi-select orders with quick filters and batch confirmation (`/dashboard/deliveries/bulk`)
- **Delivery Details**: Comprehensive delivery view with variance analysis (`/dashboard/deliveries/[id]`)
- **Edit Delivery**: Pre-populated form for delivery updates (`/dashboard/deliveries/[id]/edit`)
- **Performance Analytics**: Real-time completion rates and quantity variance tracking
- **Order Integration**: Direct delivery confirmation from orders workflow

### Reports & Analytics (`/dashboard/reports`)
- **Production Summary**: Daily production planning with product and route breakdowns
- **Route Delivery Reports**: Mobile-friendly delivery lists with customer contact info
- **Payment Collection Reports**: Monthly collection summaries and trends (`/dashboard/reports/payments`)
- **Outstanding Amounts Report**: Priority-based customer list with pending payments (`/dashboard/reports/outstanding`)
- **Delivery Performance Reports**: Comprehensive analytics with completion rates and variance tracking (`/dashboard/reports/delivery-performance`)
- **Time Slot Analysis**: Morning vs evening delivery statistics
- **Print Functionality**: ✅ **WORKING** - Dedicated print API routes with professional layouts, PureDairy branding, and auto-print functionality

### Technical Features
- Form validation with Zod schemas and React Hook Form
- Toast notifications for user feedback
- Loading states and error handling
- Mobile-responsive design throughout
- TypeScript strict mode with proper type definitions
- ESLint compliant code
- **Comprehensive table sorting functionality** - All data tables support column sorting with visual indicators

## TypeScript Configuration

- Uses path mapping with `@/*` pointing to `./src/*`
- Strict mode enabled
- ES2017 target for modern browser support

## Development Notes

- Application currently running at localhost:3000
- Database: 9 tables with proper relationships and RLS policies
- Authentication: Admin-only access with test credentials in .env.local
- Create new development journal entries in /dev-journal/ folder using the format YYYYMMDDHHMM-dev-journal.md after every small milestone
- Remember to update @plan.md when a task is completed
- Development journal is organized as individual session files in the /dev-journal/ folder for better organization and smaller file sizes
- New Entries to /dev-journal/ have to be in the following format of sections:
   **Date - Title**
   **Time**
   **Goals**
   **What I accomplished:**
   **Challenges faced:**
   **Key learnings:**
   **Next session goals:**
- All customer management features are fully functional and tested
- All subscription management features are fully functional and tested
- All order generation features are fully functional and tested
- Complete modification system with date ranges and automatic order integration
- Daily production and route delivery reports with mobile-friendly printing
- 2-day pattern logic implemented with visual preview and cycle calculation
- Order generation system processes subscriptions and calculates quantities correctly
- Phase 3 complete: All major operational features implemented and tested
- All payment management features are fully functional and tested
- Complete outstanding amount tracking with real-time calculations
- Comprehensive payment reports with collection analytics and priority-based outstanding customer tracking
- Phase 4.1 complete: Payment management system ready for production use
- All delivery confirmation features are fully functional and tested
- Complete delivery tracking with planned vs actual quantity analysis
- Comprehensive delivery performance reports with variance tracking and analytics
- Phase 4.2 complete: Delivery confirmation system ready for production use
- **BULK DELIVERY SYSTEM COMPLETE**: Bulk delivery confirmation system with 70-80% time savings for batch operations
- **PRINT SYSTEM COMPLETE**: Print functionality ✅ **WORKING** - Professional print layouts implemented via dedicated API routes with PureDairy branding
- **TABLE SORTING COMPLETE**: All 6 data display tables now have comprehensive sorting functionality with reusable infrastructure and consistent UX patterns

## Development Workflow

1. **Server Actions**: Use `/src/lib/actions/` for database operations
   - `/src/lib/actions/customers.ts` - Customer CRUD operations
   - `/src/lib/actions/subscriptions.ts` - Subscription CRUD operations
   - `/src/lib/actions/orders.ts` - Order generation and management operations
   - `/src/lib/actions/modifications.ts` - Modification CRUD operations
   - `/src/lib/actions/payments.ts` - Payment CRUD operations and outstanding amount management
   - `/src/lib/actions/deliveries.ts` - Individual and bulk delivery confirmation operations
   - `/src/lib/actions/reports.ts` - Production and delivery report generation
2. **Validation**: Zod schemas in `/src/lib/validations.ts`
3. **Types**: TypeScript interfaces in `/src/lib/types.ts`
4. **Utilities**: Helper functions in `/src/lib/subscription-utils.ts` for pattern calculations
5. **UI Components**: Shadcn/ui components in `/src/components/ui/`
6. **Forms**: React Hook Form with Zod resolver for validation
7. **Database**: Supabase with MCP server integration for CLI operations
8. **Print System**: Dedicated API routes under `/src/app/api/print/` for professional report printing
9. **Sorting Infrastructure**: 
   - `/src/hooks/useSorting.ts` - Reusable sorting hook with support for nested objects
   - `/src/components/ui/sortable-table-head.tsx` - Sortable table headers with visual indicators
   - Sort types and configurations in `/src/lib/types.ts`

## Testing & Validation

- Build process: `pnpm build` (zero TypeScript errors)
- Linting: `pnpm lint` (ESLint compliant)
- Form validation: Prevents invalid data entry
- Database constraints: Proper foreign key relationships
- Authentication: Protected routes with middleware

## Deployment Notes

- Remember to use MCP servers as per your need.