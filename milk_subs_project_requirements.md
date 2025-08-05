# Dairy Subscription Manager - Project Requirements Document

## Project Overview

**Project Name:** Dairy Subscription Manager  
**Version:** 1.0  
**Date:** August 2025  
**Developer:** Solo Development using Claude Code  

### Executive Summary
A comprehensive web application to manage dairy subscription services, replacing manual Excel-based tracking with automated order generation, delivery management, and payment tracking.

## Business Context

### Current Situation
- **Business Type:** Local dairy with home delivery service
- **Products:** A2 Cow Milk (CM) and Buffalo Milk (BM)
- **Delivery Model:** Home delivery, 7 days a week
- **Delivery Schedule:** Morning (6 AM start) and Evening (5 PM start)
- **Routes:** Two delivery routes with dedicated personnel
- **Current System:** Manual Excel tracking leading to delivery errors

### Business Goals
- Eliminate delivery mistakes caused by manual tracking
- Streamline daily operations and reporting
- Support flexible customer subscription needs
- Enable accurate production planning
- Provide mobile-friendly interface for field operations

## Functional Requirements

### 1. Customer Management

#### 1.1 Customer Profile Management
- **Create/Edit Customer Profiles**
  - Billing name (primary identifier for invoicing)
  - Contact person (actual delivery contact)
  - Address and up to 3 phone numbers (1 primary)
  - Delivery time preference (Morning/Evening)
  - Route assignment (Route 1/Route 2)
  - Payment method and billing cycle
  - Outstanding payment amount tracking
  - Customer status (Active/Inactive)

#### 1.2 Base Subscription Setup
- **Standard Daily Subscriptions**
  - Set default daily quantities for CM and BM
  - Per-liter pricing: ₹75/L for CM, ₹80/L for BM
  - Monthly or prepaid billing options
  - Indian Rupee (₹) currency formatting

#### 1.3 Alternate Day Patterns
- **Pattern-Based Subscriptions**
  - Define repeating 2-day cycles only
  - Example: Day 1: 1L BM, Day 2: 2L BM, repeat on Day 3: 1L BM, Day 4: 2L BM
  - Calculate current day in cycle automatically

### 2. Subscription Modifications

#### 2.1 Temporary Changes
- **Skip Orders**
  - Skip deliveries for specific date ranges
  - Reason tracking (out of town, vacation, etc.)

- **Quantity Modifications**
  - Temporary increase/decrease for specific periods
  - One-time additions for special occasions
  - Next-day modifications only (order today for tomorrow)

#### 2.2 Modification Interface
- Quick customer search functionality
- Easy-to-use modification forms
- Date range selection
- Modification history tracking

### 3. Daily Operations

#### 3.1 Order Generation
- **Automated Daily Orders**
  - Calculate daily orders from base subscriptions
  - Apply active modifications
  - Handle alternate day patterns
  - Generate orders for next day

#### 3.2 Delivery Reports
- **Route-wise Reports**
  - Separate reports for each route
  - Mobile-friendly printable format
  - Customer details, address, quantities
  - Morning and evening delivery segregation

#### 3.3 Production Planning
- **Daily Production Summary**
  - Total CM required per day
  - Total BM required per day
  - Route-wise breakdown
  - Time slot breakdown (Morning/Evening)

### 4. Delivery Management

#### 4.1 Delivery Confirmation
- **Actual Delivery Tracking**
  - Record actual quantities delivered
  - Handle customer requests for additional milk at delivery time
  - Delivery status updates
  - Delivery person notes

#### 4.2 Delivery History
- **Historical Records**
  - Track planned vs actual deliveries
  - Customer delivery patterns
  - Delivery completion rates

### 5. Payment Management

#### 5.1 Payment Tracking
- **Billing Cycles**
  - Monthly billing for regular customers
  - Prepaid account management
  - Payment due dates and reminders

#### 5.2 Payment Status
- **Status Management**
  - Paid/Pending/Overdue status tracking
  - Outstanding amount calculations
  - Payment history per customer

## Technical Requirements

### 6. System Architecture

#### 6.1 Technology Stack
- **Frontend:** Next.js 14+ with React and TypeScript
- **Styling:** Tailwind CSS with Shadcn/ui components
- **Backend:** Supabase (Database + Authentication + API)
- **Architecture:** Server Actions (no separate API routes)
- **Deployment:** Vercel
- **Development:** Claude Code integration

#### 6.2 Database Design
**Core Tables:**
- `customers` - Customer profiles and preferences
- `products` - CM and BM with pricing
- `routes` - Delivery routes and personnel
- `base_subscriptions` - Default daily orders per customer
- `subscription_patterns` - Alternate day pattern definitions
- `modifications` - Temporary changes to subscriptions
- `daily_orders` - Generated daily delivery orders
- `deliveries` - Actual delivery records
- `payments` - Payment history and status

### 7. User Interface Requirements

#### 7.1 Responsive Design
- **Mobile-First Approach**
  - Optimized for mobile devices (delivery personnel use)
  - Responsive design for desktop admin access
  - Touch-friendly interface elements

#### 7.2 Navigation Structure
- **Sidebar Navigation**
  - Dashboard overview
  - Customer management
  - Daily orders
  - Delivery reports
  - Payment tracking
  - Settings

#### 7.3 User Experience
- **Modern UI Design**
  - Clean, professional interface
  - Consistent design system
  - Fast loading times
  - Intuitive navigation flow

### 8. Performance Requirements

#### 8.1 Response Times
- Page load times under 2 seconds
- Form submissions under 1 second
- Real-time updates for order changes

#### 8.2 Scalability
- Support for 500+ customers initially
- Database optimization for daily order generation
- Efficient query patterns for reporting

## Non-Functional Requirements

### 9. Security
- **Data Protection**
  - Customer data encryption
  - Secure authentication
  - Regular backups via Supabase

### 10. Reliability
- **System Availability**
  - 99% uptime target
  - Error handling and recovery
  - Data consistency checks

### 11. Maintainability
- **Code Quality**
  - TypeScript for type safety
  - Clean, documented code
  - Modular component structure

## Development Phases

### Phase 1: Foundation (Week 1-2)
- Project setup and configuration
- Database schema creation
- Basic UI framework
- Authentication setup

### Phase 2: Core Features (Week 3-4)
- Customer management system
- Subscription setup and patterns
- Basic order generation

### Phase 3: Operations (Week 5-6)
- Daily order processing
- Delivery reports generation
- Payment tracking

### Phase 4: Optimization (Week 7-8)
- Delivery confirmation system
- Mobile optimization
- Performance tuning
- Testing and deployment

## Success Criteria

### Business Metrics
- 100% elimination of Excel-based tracking
- 90% reduction in delivery errors
- 50% time savings in daily report generation
- Improved customer satisfaction scores

### Technical Metrics
- All core features functional
- Mobile-responsive design
- Sub-2-second page load times
- Zero data loss incidents

## Constraints and Assumptions

### Constraints
- Solo development using Claude Code
- Budget-conscious technology choices
- Phase 1 limited to admin-only access
- Manual data upload for existing customer records

### Assumptions
- Stable internet connectivity for cloud-based solution
- Delivery personnel have smartphone access
- Customer modification requests via phone calls initially

## Future Enhancements

### Phase 2 Features
- Customer communication (SMS/WhatsApp)
- Advanced reporting and analytics
- Route optimization
- Inventory management alerts

### Phase 3 Features
- Customer self-service portal
- Multi-location support
- Predictive demand forecasting
- Integration with accounting systems

---

**Document Approval:**
- **Business Owner:** ✓ Approved
- **Developer:** ✓ Ready for implementation
- **Date:** August 2025