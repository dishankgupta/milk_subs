# Sales Management System - Phase 5: Integration & Testing

## Overview
This final phase focuses on seamless integration with the existing PureDairy subscription platform, comprehensive testing strategies, deployment considerations, and the complete implementation roadmap for the sales management system.

---

## UI Integration with Existing Dashboard

### 1. Navigation Menu Enhancement

**Current Navigation Structure:**
```typescript
// /src/components/layout/sidebar.tsx (enhancement)
const navigationItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Customers", href: "/dashboard/customers", icon: UsersIcon },
  { name: "Subscriptions", href: "/dashboard/subscriptions", icon: CalendarIcon },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingCartIcon },
  { name: "Modifications", href: "/dashboard/modifications", icon: EditIcon },
  
  // NEW SALES SECTION
  {
    name: "Sales",
    icon: TagIcon,
    children: [
      { name: "Record Sale", href: "/dashboard/sales/new" },
      { name: "Sales History", href: "/dashboard/sales" },
      { name: "Daily Summary", href: "/dashboard/sales/daily" }
    ]
  },
  
  // NEW INVOICES SECTION
  {
    name: "Invoices", 
    icon: DocumentIcon,
    children: [
      { name: "Generate Invoices", href: "/dashboard/invoices/generate" },
      { name: "Invoice History", href: "/dashboard/invoices" },
      { name: "Bulk Generation", href: "/dashboard/invoices/bulk" }
    ]
  },
  
  { name: "Deliveries", href: "/dashboard/deliveries", icon: TruckIcon },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCardIcon },
  
  // ENHANCED REPORTS SECTION
  {
    name: "Reports",
    icon: ChartBarIcon,
    children: [
      { name: "Production Summary", href: "/dashboard/reports/production" },
      { name: "Route Delivery", href: "/dashboard/reports/delivery" },
      { name: "Payment Collection", href: "/dashboard/reports/payments" },
      { name: "Outstanding Report", href: "/dashboard/reports/outstanding" }, // ENHANCED
      { name: "Sales Analytics", href: "/dashboard/reports/sales" }, // NEW
      { name: "Delivery Performance", href: "/dashboard/reports/delivery-performance" }
    ]
  }
]
```

### 2. Dashboard Overview Enhancement

**Enhanced Dashboard Cards:**
```typescript
// /src/app/dashboard/page.tsx (enhancements)
export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Existing cards */}
      <StatsCard title="Active Customers" value={totalCustomers} />
      <StatsCard title="Active Subscriptions" value={totalSubscriptions} />
      <StatsCard title="Today's Orders" value={todayOrders} />
      
      {/* NEW SALES CARDS */}
      <StatsCard 
        title="Today's Sales" 
        value={`₹${todaySalesTotal}`} 
        subtitle={`${todaySalesCount} transactions`}
      />
      <StatsCard 
        title="Cash Sales" 
        value={`₹${todayCashSales}`}
        subtitle="Immediate payment"
      />
      <StatsCard 
        title="Credit Sales" 
        value={`₹${todayCreditSales}`}
        subtitle="Added to outstanding"
      />
      
      {/* ENHANCED OUTSTANDING CARD */}
      <StatsCard 
        title="Total Outstanding" 
        value={`₹${totalOutstanding}`}
        subtitle={`Including ₹${openingBalanceTotal} opening balance`}
      />
      
      {/* NEW INVOICE CARD */}
      <StatsCard 
        title="Pending Invoices" 
        value={pendingInvoicesCount}
        subtitle={`₹${pendingInvoicesAmount} total value`}
      />
    </div>
  )
}
```

### 3. Customer Profile Integration

**Enhanced Customer Detail Page:**
```typescript
// /src/app/dashboard/customers/[id]/page.tsx (enhancements)
export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      {/* Existing sections */}
      <CustomerInfoCard customer={customer} />
      <SubscriptionsSection customerId={customer.id} />
      <PaymentHistorySection customerId={customer.id} />
      
      {/* NEW SALES HISTORY SECTION */}
      <SalesHistorySection 
        customerId={customer.id}
        showCashSales={true} // Include cash sales with customer name
        showCreditSales={true}
        showInvoiceGeneration={true}
      />
      
      {/* ENHANCED OUTSTANDING SECTION */}
      <OutstandingAmountSection 
        customer={customer}
        showOpeningBalance={true}
        showDetailedBreakdown={true}
        allowOpeningBalanceEdit={true}
      />
    </div>
  )
}
```

---

## Component Library Extensions

### 1. Sales-Specific Components

**Sales Entry Form Component:**
```typescript
// /src/components/sales/sales-form.tsx
interface SalesFormProps {
  initialData?: Partial<SaleFormData>
  onSubmit: (data: SaleFormData) => Promise<void>
  customers: Customer[]
  products: Product[]
}

export function SalesForm({ initialData, onSubmit, customers, products }: SalesFormProps) {
  // Form implementation with:
  // - Customer autocomplete (optional)
  // - Product selection with GST display
  // - Quantity and price inputs with real-time calculation
  // - Sale type radio buttons with business logic
  // - Date picker with validation
  // - Notes textarea
}
```

**Outstanding Report Component:**
```typescript
// /src/components/reports/outstanding-report.tsx
interface OutstandingReportProps {
  reportData: OutstandingReportData[]
  showExpandableDetails: boolean
  printOptions: {
    summary: boolean
    statements: boolean
    complete: boolean
  }
}

export function OutstandingReport({ reportData, showExpandableDetails, printOptions }: OutstandingReportProps) {
  // Triple-level expandable table:
  // Level 1: Customer summary row
  // Level 2: Transaction type groups (Subscriptions, Sales, Payments)
  // Level 3: Individual transaction details
  
  // Includes:
  // - Sortable columns
  // - Expand/collapse all functionality
  // - Individual customer statement generation
  // - Modular print options
}
```

**Invoice Generation Components:**
```typescript
// /src/components/invoices/bulk-invoice-form.tsx
export function BulkInvoiceForm() {
  // Date range selection
  // Customer selection with preview
  // Duplicate check warnings
  // Progress indicator during generation
  // Success summary with file links
}

// /src/components/invoices/invoice-preview.tsx
export function InvoicePreview({ invoiceData }: { invoiceData: InvoiceData }) {
  // Professional invoice layout matching provided template
  // Subscription breakdown + manual sales integration
  // GST calculations and breakdowns
  // PureDairy branding consistency
}
```

### 2. Enhanced Table Components

**Sales History Table:**
```typescript
// /src/components/sales/sales-history-table.tsx
interface SalesHistoryTableProps {
  sales: Sale[]
  showCustomer?: boolean
  showActions?: boolean
  allowEdit?: boolean
}

export function SalesHistoryTable({ sales, showCustomer, showActions, allowEdit }: SalesHistoryTableProps) {
  // Features:
  // - Sortable columns (Date, Customer, Product, Amount, Type, Status)
  // - Filter by sale type (Cash/Credit)
  // - Filter by payment status
  // - Quick actions: Edit, Invoice, Print
  // - Bulk selection for operations
}
```

---

## API Route Structure

### 1. Sales API Endpoints

```typescript
// /src/app/api/sales/route.ts
export async function GET(request: Request) {
  // List sales with filtering and pagination
  // Query params: customer_id, product_id, sale_type, date_range, page, limit
}

export async function POST(request: Request) {
  // Create new sale
  // Validate business rules (cash/credit logic)
  // Update customer outstanding if credit sale
  // Return created sale with relations
}

// /src/app/api/sales/[id]/route.ts
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  // Update existing sale
  // Recalculate customer outstanding if needed
  // Validate business rule changes
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // Soft delete sale
  // Adjust customer outstanding if credit sale
  // Maintain audit trail
}
```

### 2. Invoice Generation API

```typescript
// /src/app/api/invoices/generate/route.ts
export async function POST(request: Request) {
  // Bulk invoice generation
  // Combine subscription + sales data
  // Generate PDFs with professional layout
  // Store invoice metadata
  // Return file paths and summary
}

// /src/app/api/invoices/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Serve generated PDF
  // Stream file with proper headers
  // Handle file not found gracefully
}
```

### 3. Enhanced Print API Routes

```typescript
// /src/app/api/print/outstanding-report/route.ts
export async function POST(request: Request) {
  // Generate outstanding report PDF
  // Support multiple print formats:
  // - summary: Overview table only
  // - statements: Individual customer pages
  // - complete: Full detailed report with breakdowns
  
  const { reportData, format, selectedCustomers } = await request.json()
  
  // Use existing print infrastructure
  // Professional layout with PureDairy branding
  // Return PDF buffer for download/display
}

// /src/app/api/print/sales-summary/route.ts
export async function POST(request: Request) {
  // Daily/monthly sales summary reports
  // Include cash/credit breakdown
  // Product-wise analysis
  // Professional formatting
}
```

---

## Server Actions Integration

### 1. Sales Management Actions

```typescript
// /src/lib/actions/sales.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { saleSchema, type SaleFormData } from "@/lib/validations"
import { updateCustomerOutstandingWithSales } from "./customers"

export async function createSale(data: SaleFormData) {
  try {
    const supabase = await createClient()
    
    // Validate form data
    const validatedData = saleSchema.parse(data)
    
    // Calculate totals and GST
    const { baseAmount, gstAmount } = calculateGSTFromInclusive(
      validatedData.quantity * validatedData.unit_price,
      product.gst_rate
    )
    
    // Create sale record
    const { data: sale, error } = await supabase
      .from("sales")
      .insert({
        customer_id: validatedData.customer_id,
        product_id: validatedData.product_id,
        quantity: validatedData.quantity,
        unit_price: validatedData.unit_price,
        total_amount: validatedData.quantity * validatedData.unit_price,
        gst_amount: gstAmount,
        sale_type: validatedData.sale_type,
        sale_date: validatedData.sale_date,
        payment_status: validatedData.sale_type === 'Cash' ? 'Completed' : 'Pending',
        notes: validatedData.notes
      })
      .select("*, customer(billing_name), product(name)")
      .single()

    if (error) throw error

    // Update customer outstanding if credit sale
    if (validatedData.sale_type === 'Credit' && validatedData.customer_id) {
      await updateCustomerOutstandingWithSales(
        validatedData.customer_id,
        sale.total_amount,
        'credit_sale'
      )
    }

    return { success: true, data: sale }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getSalesHistory(filters: {
  customer_id?: string
  date_range?: { start: Date, end: Date }
  sale_type?: 'Cash' | 'Credit'
  page?: number
  limit?: number
}) {
  // Implementation with filtering and pagination
  // Return sales with customer and product relations
}

export async function updateSale(saleId: string, updates: Partial<SaleFormData>) {
  // Implementation with validation
  // Handle outstanding amount adjustments
  // Maintain audit trail
}
```

### 2. Invoice Generation Actions

```typescript
// /src/lib/actions/invoices.ts
"use server"

import { generateInvoiceNumber } from "@/lib/invoice-utils"

export async function generateBulkInvoices(config: {
  date_range: { start: Date, end: Date }
  customer_selection: 'all' | 'with_outstanding' | 'selected'
  selected_customer_ids?: string[]
  output_folder: string
}) {
  try {
    const supabase = await createClient()
    
    // Get customers based on selection criteria
    const customers = await getCustomersForInvoicing(config)
    
    // Check for existing invoices
    const duplicateCheck = await checkExistingInvoices(customers, config.date_range)
    
    const results = []
    
    for (const customer of customers) {
      // Get subscription data for period
      const subscriptionData = await getSubscriptionDataForPeriod(
        customer.id, 
        config.date_range
      )
      
      // Get manual sales data for period
      const salesData = await getSalesDataForPeriod(
        customer.id, 
        config.date_range
      )
      
      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber(await getNextSequenceNumber())
      
      // Generate PDF
      const pdfBuffer = await generateInvoicePDF({
        customer,
        subscriptionData,
        salesData,
        invoiceNumber,
        period: config.date_range
      })
      
      // Save file
      const filePath = await saveInvoiceFile(pdfBuffer, invoiceNumber, customer.billing_name)
      
      // Store metadata
      await storeInvoiceMetadata({
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        file_path: filePath,
        // ... other metadata
      })
      
      results.push({
        customer_name: customer.billing_name,
        invoice_number: invoiceNumber,
        file_path: filePath,
        total_amount: subscriptionData.total + salesData.total
      })
    }
    
    return { success: true, data: results }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### 3. Enhanced Outstanding Reports Actions

```typescript
// /src/lib/actions/outstanding-reports.ts
"use server"

export async function generateOutstandingReport(config: OutstandingReportFormData): Promise<{
  success: boolean
  data?: OutstandingReportData[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get customers based on selection
    const customers = await getCustomersForReport(config)
    
    const reportData: OutstandingReportData[] = []
    
    for (const customer of customers) {
      // Calculate opening balance as of start date
      const openingBalance = await calculateOpeningBalance(customer.id, config.start_date)
      
      // Get subscription data grouped by month
      const subscriptionDetails = await getMonthlySubscriptionBreakdown(
        customer.id, 
        config.start_date, 
        config.end_date
      )
      
      // Get manual sales in period
      const manualSalesDetails = await getManualSalesForPeriod(
        customer.id,
        config.start_date,
        config.end_date
      )
      
      // Get payments in period
      const paymentDetails = await getPaymentsForPeriod(
        customer.id,
        config.start_date,
        config.end_date
      )
      
      // Calculate totals
      const subscriptionAmount = subscriptionDetails.reduce((sum, month) => sum + month.total_amount, 0)
      const manualSalesAmount = manualSalesDetails.reduce((sum, sale) => sum + sale.total_amount, 0)
      const paymentsAmount = paymentDetails.reduce((sum, payment) => sum + payment.amount, 0)
      const currentOutstanding = openingBalance + subscriptionAmount + manualSalesAmount - paymentsAmount
      
      reportData.push({
        customer_id: customer.id,
        customer_name: customer.billing_name,
        opening_balance: openingBalance,
        subscription_amount: subscriptionAmount,
        manual_sales_amount: manualSalesAmount,
        payments_amount: paymentsAmount,
        current_outstanding: currentOutstanding,
        subscription_details: subscriptionDetails,
        manual_sales_details: manualSalesDetails,
        payment_details: paymentDetails
      })
    }
    
    return { success: true, data: reportData }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

---

## Testing Strategy

### 1. Unit Testing

**Database Function Testing:**
```typescript
// /src/lib/__tests__/sales-actions.test.ts
import { describe, test, expect, beforeEach } from 'vitest'
import { createSale, updateCustomerOutstandingWithSales } from '@/lib/actions/sales'

describe('Sales Actions', () => {
  beforeEach(async () => {
    // Setup test database with clean state
    await setupTestDatabase()
  })

  test('should create cash sale without customer', async () => {
    const saleData = {
      customer_id: null,
      product_id: 'test-product',
      quantity: 2,
      unit_price: 15,
      sale_type: 'Cash' as const,
      sale_date: new Date()
    }
    
    const result = await createSale(saleData)
    
    expect(result.success).toBe(true)
    expect(result.data?.sale_type).toBe('Cash')
    expect(result.data?.payment_status).toBe('Completed')
  })

  test('should create credit sale and update customer outstanding', async () => {
    const customerId = 'test-customer'
    const initialOutstanding = 1000
    
    // Setup customer with initial outstanding
    await setupCustomer(customerId, { outstanding_amount: initialOutstanding })
    
    const saleData = {
      customer_id: customerId,
      product_id: 'test-product',
      quantity: 1,
      unit_price: 500,
      sale_type: 'Credit' as const,
      sale_date: new Date()
    }
    
    const result = await createSale(saleData)
    const updatedCustomer = await getCustomer(customerId)
    
    expect(result.success).toBe(true)
    expect(updatedCustomer.outstanding_amount).toBe(1500) // 1000 + 500
  })

  test('should enforce cash sale without customer constraint', async () => {
    const saleData = {
      customer_id: 'test-customer', // Invalid: cash sale with customer
      product_id: 'test-product',
      quantity: 1,
      unit_price: 100,
      sale_type: 'Cash' as const,
      sale_date: new Date()
    }
    
    const result = await createSale(saleData)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('Cash sales cannot have customer')
  })
})
```

**GST Calculation Testing:**
```typescript
// /src/lib/__tests__/gst-utils.test.ts
import { calculateGSTFromInclusive, generateInvoiceNumber } from '@/lib/utils'

describe('GST Utilities', () => {
  test('should calculate 18% GST correctly', () => {
    const result = calculateGSTFromInclusive(118, 18)
    
    expect(result.baseAmount).toBe(100)
    expect(result.gstAmount).toBe(18)
  })

  test('should handle 5% GST for Malai Paneer', () => {
    const result = calculateGSTFromInclusive(15.75, 5) // ₹15 base + 5% GST
    
    expect(result.baseAmount).toBe(15)
    expect(result.gstAmount).toBe(0.75)
  })

  test('should generate correct financial year invoice numbers', () => {
    // Mock date to August 2024 (FY 2024-25)
    jest.useFakeTimers().setSystemTime(new Date('2024-08-15'))
    
    const invoiceNumber = generateInvoiceNumber(1)
    
    expect(invoiceNumber).toBe('20242500001') // FY 2024-25, sequence 1
    
    jest.useRealTimers()
  })
})
```

### 2. Integration Testing

**Sales Flow Integration:**
```typescript
// /src/app/__tests__/sales-integration.test.ts
import { test, expect } from '@playwright/test'

test.describe('Sales Management Integration', () => {
  test('complete sales workflow', async ({ page }) => {
    await page.goto('/dashboard/sales/new')
    
    // Test cash sale
    await page.fill('[data-testid="quantity"]', '2')
    await page.selectOption('[data-testid="product"]', 'malai-paneer')
    await page.check('[data-testid="sale-type-cash"]')
    await page.click('[data-testid="submit-sale"]')
    
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Sale recorded')
    
    // Verify sale appears in history
    await page.goto('/dashboard/sales')
    await expect(page.locator('[data-testid="sales-table"]')).toContainText('Malai Paneer')
  })

  test('credit sale updates customer outstanding', async ({ page }) => {
    await page.goto('/dashboard/sales/new')
    
    // Select customer for credit sale
    await page.fill('[data-testid="customer-search"]', 'Sanjay')
    await page.click('[data-testid="customer-option-sanjay"]')
    
    // Fill sale details
    await page.fill('[data-testid="quantity"]', '1')
    await page.selectOption('[data-testid="product"]', 'buffalo-ghee')
    
    // Credit sale auto-selected when customer chosen
    await page.click('[data-testid="submit-sale"]')
    
    // Verify customer outstanding updated
    await page.goto('/dashboard/customers/sanjay-udyog')
    await expect(page.locator('[data-testid="outstanding-amount"]')).toContainText('Updated')
  })
})
```

### 3. Performance Testing

**Load Testing for Invoice Generation:**
```typescript
// /scripts/performance/invoice-load-test.ts
import { generateBulkInvoices } from '@/lib/actions/invoices'

async function testBulkInvoicePerformance() {
  const testSizes = [10, 50, 100, 200] // Number of customers
  
  for (const size of testSizes) {
    console.log(`Testing ${size} customers...`)
    
    const startTime = Date.now()
    
    const result = await generateBulkInvoices({
      date_range: {
        start: new Date('2024-08-01'),
        end: new Date('2024-08-31')
      },
      customer_selection: 'selected',
      selected_customer_ids: generateTestCustomerIds(size)
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`${size} customers: ${duration}ms (${duration/size}ms per invoice)`)
    
    // Performance targets:
    // - Under 2 seconds for 10 customers
    // - Under 10 seconds for 50 customers  
    // - Under 30 seconds for 100 customers
    expect(duration).toBeLessThan(getPerformanceTarget(size))
  }
}
```

---

## Data Migration Strategy

### 1. Opening Balance Migration

**CSV Import Script:**
```typescript
// /scripts/migration/import-opening-balances.ts
import fs from 'fs'
import csv from 'csv-parser'
import { createClient } from '@supabase/supabase-js'

interface OpeningBalanceRow {
  customer_name: string
  billing_name: string
  opening_balance: number
}

export async function importOpeningBalances(csvFilePath: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
  
  const results: OpeningBalanceRow[] = []
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data: OpeningBalanceRow) => results.push(data))
      .on('end', async () => {
        console.log(`Processing ${results.length} opening balance records...`)
        
        for (const row of results) {
          try {
            // Find customer by billing name
            const { data: customer } = await supabase
              .from('customers')
              .select('id')
              .eq('billing_name', row.billing_name)
              .single()
            
            if (!customer) {
              console.warn(`Customer not found: ${row.billing_name}`)
              continue
            }
            
            // Update opening balance
            await supabase
              .from('customers')
              .update({ opening_balance: row.opening_balance })
              .eq('id', customer.id)
            
            console.log(`✓ Updated ${row.billing_name}: ₹${row.opening_balance}`)
          } catch (error) {
            console.error(`✗ Error updating ${row.billing_name}:`, error.message)
          }
        }
        
        resolve(results.length)
      })
  })
}

// Usage: node -r ts-node/register scripts/migration/import-opening-balances.ts opening-balances.csv
```

### 2. Historical Sales Data Migration

**Excel to Sales Table Migration:**
```typescript
// /scripts/migration/import-historical-sales.ts
interface HistoricalSaleRow {
  date: string
  customer_name: string
  product_name: string
  quantity: number
  unit_price: number
  sale_type: 'Cash' | 'Credit'
  notes?: string
}

export async function importHistoricalSales(excelFilePath: string) {
  // Read Excel file using xlsx library
  // Validate data against existing customers and products
  // Insert sales records with historical dates
  // Update customer outstanding amounts for credit sales
  // Generate import summary report
}
```

---

## Deployment Considerations

### 1. Environment Configuration

**Production Environment Variables:**
```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_KEY=your_production_service_key

# Invoice file storage
INVOICE_STORAGE_PATH=/app/storage/invoices
INVOICE_BACKUP_PATH=/app/backups/invoices

# PDF generation
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Performance settings
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

### 2. File System Considerations

**Invoice Storage Structure:**
```
/app/storage/invoices/
├── 20240831_generated_invoices/
│   ├── individual/
│   │   ├── 20242500001-SanjayUdyog.pdf
│   │   ├── 20242500002-MrsHelene.pdf
│   │   └── ...
│   ├── combined/
│   │   └── 20242500001-20242500025-BulkInvoices.pdf
│   └── metadata.json
├── 20240930_generated_invoices/
└── ...
```

**Backup Strategy:**
```typescript
// /scripts/deployment/backup-invoices.ts
export async function createInvoiceBackup() {
  const backupDate = new Date().toISOString().split('T')[0]
  const backupPath = `/app/backups/invoices/backup-${backupDate}.tar.gz`
  
  // Create compressed backup of invoice files
  // Upload to cloud storage (optional)
  // Maintain local retention policy (30 days)
  // Log backup completion
}
```

### 3. Database Migration Deployment

**Production Migration Checklist:**
```sql
-- Pre-deployment verification
SELECT COUNT(*) FROM customers WHERE opening_balance IS NULL;
SELECT COUNT(*) FROM products WHERE gst_rate IS NULL;

-- Migration execution order
-- 1. Run Phase 1 migrations (products, customers)
-- 2. Run Phase 2 migrations (sales table)
-- 3. Run Phase 3 migrations (invoice_metadata)
-- 4. Verify constraints and indexes
-- 5. Update RLS policies
-- 6. Import opening balance data

-- Post-deployment verification  
SELECT 
  table_name,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name IN ('sales', 'products', 'customers', 'invoice_metadata');
```

---

## Monitoring and Maintenance

### 1. Performance Monitoring

**Key Metrics to Track:**
```typescript
// /src/lib/monitoring/sales-metrics.ts
export interface SalesMetrics {
  daily_sales_count: number
  daily_sales_value: number
  invoice_generation_time: number
  pdf_generation_success_rate: number
  outstanding_calculation_accuracy: number
  customer_satisfaction_score: number
}

export async function collectSalesMetrics(): Promise<SalesMetrics> {
  // Collect metrics from database
  // Calculate performance indicators
  // Return structured metrics for dashboard
}
```

### 2. Error Handling and Logging

**Comprehensive Error Logging:**
```typescript
// /src/lib/monitoring/error-logger.ts
export function logSalesError(operation: string, error: Error, context: any) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    operation,
    error: error.message,
    stack: error.stack,
    context,
    user_id: context.user_id,
    request_id: context.request_id
  }
  
  // Log to file system
  // Send to monitoring service (if configured)
  // Alert on critical errors
  console.error(`Sales Error [${operation}]:`, errorLog)
}
```

### 3. Data Integrity Checks

**Automated Data Validation:**
```typescript
// /scripts/maintenance/data-integrity-check.ts
export async function runDataIntegrityChecks() {
  const checks = [
    // Outstanding amount accuracy
    async () => {
      const inconsistencies = await checkOutstandingAmountAccuracy()
      return { check: 'outstanding_amounts', status: inconsistencies.length === 0 ? 'PASS' : 'FAIL', details: inconsistencies }
    },
    
    // GST calculation accuracy  
    async () => {
      const errors = await validateGSTCalculations()
      return { check: 'gst_calculations', status: errors.length === 0 ? 'PASS' : 'FAIL', details: errors }
    },
    
    // Invoice sequence integrity
    async () => {
      const gaps = await checkInvoiceSequenceGaps()
      return { check: 'invoice_sequence', status: gaps.length === 0 ? 'PASS' : 'FAIL', details: gaps }
    },
    
    // Foreign key consistency
    async () => {
      const orphans = await findOrphanedSalesRecords()
      return { check: 'foreign_keys', status: orphans.length === 0 ? 'PASS' : 'FAIL', details: orphans }
    }
  ]
  
  const results = await Promise.all(checks.map(check => check()))
  
  return {
    timestamp: new Date().toISOString(),
    overall_status: results.every(r => r.status === 'PASS') ? 'HEALTHY' : 'ISSUES_DETECTED',
    checks: results
  }
}
```

---

## Implementation Roadmap

### Week 1: Foundation Integration
**Day 1-2: Database Migrations**
- [ ] Execute Phase 1 migrations (products, customers, sales table)
- [ ] Verify constraints and indexes
- [ ] Update RLS policies
- [ ] Test database integrity

**Day 3-4: Core Server Actions**
- [ ] Implement sales CRUD actions
- [ ] Create invoice generation actions
- [ ] Enhanced outstanding report actions
- [ ] Unit test all server actions

**Day 5-7: API Routes**
- [ ] Sales management endpoints
- [ ] Invoice generation endpoints
- [ ] Enhanced print API routes
- [ ] Integration testing

### Week 2: UI Integration
**Day 1-3: Component Development**
- [ ] Sales entry form component
- [ ] Outstanding report component
- [ ] Invoice generation components
- [ ] Sales history table

**Day 4-5: Page Integration**
- [ ] Enhanced customer detail pages
- [ ] New sales management pages
- [ ] Invoice generation pages
- [ ] Enhanced reports pages

**Day 6-7: Navigation & Dashboard**
- [ ] Update sidebar navigation
- [ ] Enhance dashboard overview
- [ ] Mobile responsiveness testing
- [ ] User acceptance testing

### Week 3: Advanced Features
**Day 1-3: Invoice System**
- [ ] PDF generation implementation
- [ ] Bulk invoice processing
- [ ] File organization system
- [ ] Print integration

**Day 4-5: Outstanding Reports**
- [ ] Triple-level expandable tables
- [ ] Modular print options
- [ ] Customer statement generation
- [ ] Performance optimization

**Day 6-7: Error Handling & Polish**
- [ ] Comprehensive error handling
- [ ] Loading states and feedback
- [ ] Form validation enhancement
- [ ] Edge case handling

### Week 4: Testing & Deployment
**Day 1-2: Testing**
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] Load testing for bulk operations
- [ ] User acceptance testing

**Day 3-4: Data Migration**
- [ ] Opening balance import
- [ ] Historical data validation
- [ ] Migration script testing
- [ ] Backup procedures

**Day 5-7: Deployment**
- [ ] Production environment setup
- [ ] Database migration execution
- [ ] Application deployment
- [ ] Monitoring setup
- [ ] Post-deployment verification

---

## Success Criteria Validation

### Business Requirements ✅
- **Excel Replacement**: Complete replacement of manual Excel-based sales tracking
- **Professional Invoicing**: Automated generation with PureDairy branding
- **Outstanding Management**: Comprehensive customer balance tracking with opening balance integration
- **Cash/Credit Tracking**: Separate handling of immediate vs. billed sales
- **GST Compliance**: Accurate GST calculations and reporting

### Technical Integration ✅
- **Seamless Integration**: No disruption to existing subscription workflows
- **Database Consistency**: All foreign key relationships and constraints maintained
- **Performance**: Sub-2-second response times for standard operations
- **Type Safety**: Full TypeScript coverage with Zod validation
- **Mobile Responsive**: Consistent UX across all device sizes

### User Experience ✅
- **Intuitive Workflow**: Single-form sales entry with smart defaults
- **Professional Output**: High-quality PDF invoices matching provided template
- **Comprehensive Reporting**: Triple-level expandable outstanding reports
- **Print Integration**: Leverages existing print system infrastructure
- **Error Prevention**: Form validation prevents common data entry errors

### Operational Impact ✅
- **Time Savings**: 80% reduction in manual invoice preparation time
- **Accuracy Improvement**: Automated calculations eliminate human errors
- **Better Cash Flow**: Real-time outstanding balance tracking
- **Audit Trail**: Complete transaction history with timestamps
- **Scalability**: System handles growing customer base efficiently

---

## Post-Launch Roadmap

### Phase 6: Customer Communication (Future)
- **SMS Integration**: Automated invoice delivery via WhatsApp/SMS
- **Customer Portal**: Self-service outstanding balance viewing
- **Payment Reminders**: Automated reminder system

### Phase 7: Advanced Analytics (Future)
- **Sales Trends**: Product performance analysis
- **Customer Insights**: Purchase pattern analysis
- **Revenue Forecasting**: Predictive analytics based on historical data

### Phase 8: Mobile Application (Future)
- **Field Sales App**: Mobile sales entry for delivery personnel
- **Customer App**: Order placement and balance viewing
- **Offline Capability**: Sales recording without internet connectivity

---

**Phase 5 Status:** Ready for Implementation  
**Implementation Timeline:** 4 weeks  
**Priority:** High (Critical for system completion)  
**Dependencies:** Phases 1-4 completion required

**Estimated Total Implementation Time:** 4 weeks  
**Team Requirements:** 1-2 full-stack developers + 1 QA engineer  
**Risk Level:** Medium (Well-defined requirements, proven technology stack)

**Final Deliverable:** Complete sales management system integrated seamlessly with existing PureDairy subscription platform, ready for production deployment with comprehensive testing, monitoring, and maintenance procedures.