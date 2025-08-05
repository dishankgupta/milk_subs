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

### 🔄 Phase 2: Subscription Management (In Progress)
- Subscription CRUD operations (pending)
- 2-day pattern subscription logic (pending)
- Pattern preview and cycle calculation (pending)

## Key Features Implemented

### Customer Management (`/dashboard/customers`)
- **Customer List**: Searchable table with filters (status, route, delivery time)
- **Add Customer**: Complete form with validation (`/dashboard/customers/new`)
- **Customer Details**: Comprehensive profile view (`/dashboard/customers/[id]`)
- **Edit Customer**: Pre-populated form for updates (`/dashboard/customers/[id]/edit`)

### Technical Features
- Form validation with Zod schemas and React Hook Form
- Toast notifications for user feedback
- Loading states and error handling
- Mobile-responsive design throughout
- TypeScript strict mode with proper type definitions
- ESLint compliant code

## TypeScript Configuration

- Uses path mapping with `@/*` pointing to `./src/*`
- Strict mode enabled
- ES2017 target for modern browser support

## Development Notes

- Application currently running at localhost:3001 (port 3000 was in use)
- Database: 9 tables with proper relationships and RLS policies
- Authentication: Admin-only access with test credentials in .env.local
- Remember to update @dev-journal.md after every small milestone
- Remember to update @plan.md when a task is completed
- All customer management features are fully functional and tested

## Development Workflow

1. **Server Actions**: Use `/src/lib/actions/` for database operations
2. **Validation**: Zod schemas in `/src/lib/validations.ts`
3. **Types**: TypeScript interfaces in `/src/lib/types.ts`
4. **UI Components**: Shadcn/ui components in `/src/components/ui/`
5. **Forms**: React Hook Form with Zod resolver for validation
6. **Database**: Supabase with MCP server integration for CLI operations

## Testing & Validation

- Build process: `pnpm build` (zero TypeScript errors)
- Linting: `pnpm lint` (ESLint compliant)
- Form validation: Prevents invalid data entry
- Database constraints: Proper foreign key relationships
- Authentication: Protected routes with middleware

## Deployment Notes

- Remember to use MCP servers as per your need.