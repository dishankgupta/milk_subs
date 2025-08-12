# Sales System - Comprehensive User Journey

## Overview
This document outlines the complete user journey for the new Sales Management System that will be integrated into the existing PureDairy subscription management platform.

---

## Journey 1: Adding New GST Products

### User Goal: Add new products (subscription or manual-only) like Malai Paneer, Buffalo Ghee with GST

**Important Note:** Subscription products (Cow Milk, Buffalo Milk) can also be sold manually through the sales system.

**Steps:**
1. **Navigate to Products Management**
   - Access through existing dashboard navigation
   - Current: Shows only Cow Milk (₹75/L) and Buffalo Milk (₹80/L)

2. **Add New Product**
   - Click "Add Product" button
   - Fill product form:
     - Product Name: "Malai Paneer"
     - Product Code: "MP" 
     - Unit of Measure: "gms"
     - GST Rate: "5" (percentage)
     - GST-Inclusive Price: "₹15.00" (per gms)
     - Is Subscription Product: No (checkbox)

3. **Product Validation & Save**
   - System validates GST rate (0-30% range)
   - Saves product with GST information
   - Shows in products list with GST indicator

**Expected Outcome:** New products available for manual sales, clearly marked as non-subscription items.

---

## Journey 2: Recording Manual Sales (Cash Sale)

### User Goal: Record a walk-in cash sale with no customer tracking

**Daily Scenario:** Customer walks in, buys 250gms Malai Paneer for ₹15/gms = ₹3,750 cash

**Steps:**
1. **Navigate to Sales Page**
   - New "Sales" section in dashboard navigation
   - Click "Record New Sale"

2. **Sales Entry Form**
   - Customer Field: Leave blank (optional for cash sales)
   - Product Selection: Choose "Malai Paneer" from dropdown
   - Quantity: Enter "250"
   - Unit Price: Auto-fills "₹15.00/gms" (GST-inclusive) - **EDITABLE**
   - Total Amount: Auto-calculates "₹3,750.00"
   - GST Amount: Auto-shows "₹178.57" (calculated from inclusive price)
   - Sale Type: Select "Cash" radio button
   - Sale Date: Defaults to today, can change if needed

3. **Review & Save**
   - Review calculated totals
   - Click "Record Sale"
   - System shows success message

4. **Immediate Impact**
   - Cash sale recorded in database with customer_id = NULL
   - Appears in sales reports under "Cash Sales"
   - No impact on any customer's outstanding balance

**Expected Outcome:** Cash sale recorded for reporting, no customer account affected.

---

## Journey 3: Recording Credit Sale for Existing Customer

### User Goal: Record credit sale that will be added to customer's monthly invoice

**Daily Scenario:** Regular customer "Sanjay Udyog" purchases 500gms Buffalo Ghee on credit

**Steps:**
1. **Navigate to Sales Page**
   - Click "Record New Sale"

2. **Credit Sales Entry**
   - Customer Field: Start typing "Sanjay" → System shows dropdown with matching customers
   - Select "Sanjay Udyog" from customer list
   - Product Selection: Choose "Buffalo Ghee" 
   - Quantity: Enter "500"
   - Unit Price: Auto-fills "₹80.00/gms" (GST-inclusive) - **EDITABLE**
   - Total Amount: Auto-calculates "₹40,000.00"
   - GST Amount: Auto-shows calculated GST
   - Sale Type: "Credit" radio button auto-selected (since customer chosen)
   - Sale Date: Confirm date

3. **Save Credit Sale**
   - Click "Record Sale"
   - System updates customer's outstanding amount: +₹40,000
   - Success message with updated customer balance

4. **Customer Account Impact**
   - Sanjay Udyog's outstanding_amount increases by ₹40,000
   - Sale appears in customer's "Sales History" when viewing profile
   - Will be included in next invoice generation

**Expected Outcome:** Credit sale recorded, customer outstanding balance updated automatically.

---

## Journey 4: Monthly Invoice Generation (Bulk Process)

### User Goal: Generate invoices for all customers with outstanding amounts at month-end

**Monthly Scenario:** End of August 2025, need to invoice all customers with credit sales + subscription dues

**Steps:**
1. **Navigate to Invoice Generation**
   - New "Invoices" section in dashboard
   - Click "Generate Bulk Invoices"

2. **Invoice Generation Setup**
   - Date Range Picker: "01/08/2025" to "31/08/2025"
   - Customer Selection: 
     - Radio buttons: "All Customers" / "Customers with Outstanding Amounts" / "Selected Customers"
     - Choose "Customers with Outstanding Amounts"
   - Output Folder: Browse/select folder (e.g., "C:\PureDairy\Invoices\")

3. **Preview Generation Data**
   - System shows preview table:
     - Customer Name | Subscription Dues | Credit Sales | Total Amount | Action
     - Sanjay Udyog | ₹15,000 | ₹40,000 | ₹55,000 | ✓ Include
     - Mrs. Helene | ₹12,000 | ₹3,000 | ₹15,000 | ✓ Include
   - Shows total: "25 customers, ₹2,35,000 total billing"

4. **Duplicate Check & Confirmation**
   - System checks: "Some customers already have invoices for Aug 2025"
   - Shows warning list with existing invoice details
   - Option: "Override and regenerate" with confirmation
   - User confirms: "Yes, generate new invoices"

5. **Invoice Generation Process**
   - Progress bar: "Generating invoices... 15 of 25 completed"
   - System creates:
     - Individual PDFs: `20242500015-SanjayUdyog.pdf`, `20242500016-MrsHelene.pdf`
     - Combined PDF: `20242500015-20242500039-BulkInvoices.pdf`
   - Storage: `C:\PureDairy\Invoices\20250831_generated_invoices\`

6. **Completion Summary**
   - Success message: "25 invoices generated successfully"
   - Next invoice number: "20242500040"
   - Links to: "Open Folder" | "View Combined PDF" | "Print Combined PDF"

**Expected Outcome:** Professional invoices generated with subscription + manual sales data, stored in organized folders.

---

## Journey 5: Single Customer Invoice

### User Goal: Generate invoice for specific customer outside of bulk process

**Scenario:** Customer requests immediate invoice for recent purchases

**Steps:**
1. **Navigate to Customer Profile**
   - Go to Customers → Search "Sanjay Udyog" → Click customer

2. **Customer Detail View - Sales History**
   - See existing sections: Contact Info, Subscriptions, Payment History
   - **New section: "Sales History"**
     - Shows manual sales (cash + credit) with dates and amounts
     - Credit sales marked as "Unbilled" / "Billed"
     - Quick action: "Generate Invoice" button

3. **Individual Invoice Generation**
   - Click "Generate Invoice"
   - Mini-form appears:
     - Date Range: Auto-fills current month, can adjust
     - Include: Checkboxes for "Subscription Dues" ✓ "Credit Sales" ✓  
     - Output Folder: Browse/select location
   - Click "Generate"

4. **Invoice Creation**
   - System generates individual invoice: `20242500040-SanjayUdyog.pdf`
   - Opens PDF preview in browser
   - Option to print directly or save

**Expected Outcome:** Single customer invoice created on-demand with full transaction history.

---

## Journey 6: Sales Reporting & Analytics

### User Goal: View daily/monthly sales summaries and customer purchase patterns

**Reporting Scenarios:**

### 6A: Daily Sales Summary
1. **Navigate to Sales Reports**
   - Dashboard → Reports → "Sales Reports" (new section)
   - Click "Daily Sales Summary"

2. **Daily Report View**
   - Date picker: Select specific date
   - Report shows:
     - **Cash Sales**: Total ₹25,000 (15 transactions)
     - **Credit Sales**: Total ₹45,000 (8 customers)
     - **Product Breakdown**: Malai Paneer ₹15K, Buffalo Ghee ₹30K, etc.
     - **Payment Status**: Cash ₹25K, Credit Pending ₹45K
   - **Print Option**: Uses existing print layout system (like other reports)

### 6B: Customer Purchase Analysis
1. **Customer Sales History**
   - From customer profile → Sales History tab
   - Shows: Subscription deliveries + Manual purchases
   - Timeline view with amounts and payment status
   - Note: Cash sales with customer name show here for reporting only

2. **Customer Total Purchases**
   - Running total includes: Subscription payments + Credit sales + Cash sales (if customer name provided)
   - Useful for loyalty tracking and customer value analysis

### 6C: Integration with Existing Payment Reports
1. **Enhanced Payment Collection Report**
   - Existing report now includes:
     - **Subscription Payments**: ₹1,50,000
     - **Manual Sales (Cash)**: ₹45,000 (marked as immediate payments)
     - **Total Collection**: ₹1,95,000
   - Clear distinction between payment types
   - **Print Option**: Uses existing print layout system

**Expected Outcome:** Comprehensive sales visibility integrated with existing reporting structure.

---

## Journey 7: Comprehensive Outstanding Report (Most Critical Feature)

### User Goal: Generate detailed customer outstanding balances with opening balance, transaction breakdown, and print capabilities

**Business Scenario:** Month-end review of all customer outstanding amounts with complete transaction history

**Steps:**

1. **Navigate to Enhanced Outstanding Report**
   - Dashboard → Reports → "Outstanding Amounts Report" (replaces existing simple report)
   - Click "Generate Outstanding Report"

2. **Outstanding Report Configuration**
   - **Date Range Selection**: 
     - Start Date: "01/08/2025" (for opening balance calculation as of start date)
     - End Date: "31/08/2025" (outstanding calculation as of this date)
   - **Customer Selection**: 
     - Radio buttons: "All Customers" / "Customers with Outstanding > 0" / "Selected Customers"
     - If "Selected": Checkbox list of customers with search functionality

3. **Outstanding Report Generation**
   - System calculates for each customer:
     - **Opening Balance**: Customer balance as of start date (₹5,000)
     - **Subscription Dues**: Monthly grouped totals (Aug ₹15,000, Sep ₹12,000)
     - **Manual Sales**: Credit sales in date range (₹8,000)
     - **Payments**: All payments in date range (₹12,000)
     - **Current Outstanding**: Opening + Subscriptions + Sales - Payments (₹16,000)

4. **Outstanding Report Display**
   - **Table Format with Expandable Rows**:
   ```
   Customer Name    | Opening Balance | Subscription | Manual Sales | Payments | Current Outstanding | [Expand]
   Sanjay Udyog     | ₹5,000         | ₹27,000      | ₹8,000      | ₹12,000  | ₹28,000            | [+]
   Mrs. Helene      | ₹2,000         | ₹15,000      | ₹3,000      | ₹8,000   | ₹12,000            | [+]
   ```

5. **Detailed Transaction Breakdown (Expandable)**
   - Click [+] on "Sanjay Udyog" row expands to show:
   ```
   Opening Balance (as of 01/08/2025): ₹5,000
   
   Subscription Dues:
   + Aug 2025 Subscriptions: ₹15,000     [+]
   + Sep 2025 Subscriptions: ₹12,000     [+]
   
   Manual Sales:
   + Manual Credit Sales: ₹8,000         [+]
   
   Payments:
   - Payment History: ₹12,000            [+]
   
   Current Outstanding: ₹28,000
   ```

6. **Deep Dive Transaction Details**
   - Click [+] on "Aug 2025 Subscriptions" shows:
   ```
   • Cow Milk: 25L × ₹75 = ₹1,875 (Daily: 1L × 25 days)
   • Buffalo Milk: 12.5L × ₹80 = ₹1,000 (Pattern: 0.5L × 25 days)
   Total: ₹2,875
   ```

7. **Print Options (Modular)**
   - **Print Buttons**: 
     - "Print Summary" - Overview table only
     - "Print Customer Statements" - Individual customer pages
     - "Print Complete Report" - Full detailed report
   - **Customer Statement Selection**: Choose specific customers for individual statements
   - Uses existing print system infrastructure with professional PureDairy branding

**Expected Outcome:** Complete outstanding balance analysis with drill-down capability, replacing existing simple outstanding report with comprehensive solution.

---

## Journey 8: Customer Opening Balance Management

### User Goal: Set and manage opening balances for existing customers when starting with new system

**Migration Scenario:** Moving from Excel-based tracking, need to set historical balances

**Steps:**

1. **Customer Profile Opening Balance**
   - Navigate to customer profile → "Outstanding Amount" section
   - **New field**: "Opening Balance: ₹5,000" (editable)
   - Shows: "Opening Balance + Current Outstanding = Total Due"

2. **Opening Balance in Customer Form**
   - Customer creation/edit form includes "Opening Balance" field
   - Defaults to ₹0.00 for new customers
   - Historical customers: manually entered amount

3. **Outstanding Calculation Integration**
   - **Formula**: Total Outstanding = Opening Balance + Current Outstanding Amount
   - Opening balance becomes part of total due calculation
   - Affects all outstanding reports and invoice generation

**Expected Outcome:** Seamless integration of historical balances with new system tracking.

---

## Journey 9: Error Handling & Edge Cases

### 9A: Duplicate Invoice Prevention
**Scenario:** Accidentally trying to regenerate invoices for same period

**Flow:**
1. User selects date range that overlaps with existing invoices
2. System shows warning: "Found existing invoices for 5 customers in this period"
3. Options provided: "Skip existing" / "Regenerate all" / "Cancel"
4. If regenerate chosen: Requires confirmation with list of affected customers

### 9B: Product Price Changes
**Scenario:** GST product price needs to be updated

**Flow:**
1. Edit product → Change price from ₹15/gms to ₹18/gms
2. System asks: "Update existing unbilled sales with new price?" Yes/No
3. If Yes: Updates all credit sales not yet invoiced
4. Maintains price history for accurate reporting

### 9C: Customer Outstanding Corrections
**Scenario:** Need to adjust customer balance due to return/adjustment

**Flow:**
1. Customer profile → Outstanding Amount section
2. "Adjust Balance" button → Manual adjustment form
3. Enter adjustment amount (positive/negative)
4. Reason field: "Product return - Malai Paneer quality issue"
5. Creates adjustment record, updates balance

---

## Technical Integration Points

### Database Changes Required
1. **Products table**: Add `gst_rate`, `unit_of_measure`, `is_subscription_product` columns
2. **Sales table**: New table with customer integration
3. **Invoice tracking**: Metadata storage without PDF storage
4. **Outstanding amount**: Enhanced with sales data integration
5. **Customers table**: Add `opening_balance` column for starting balances

### UI Integration Points
1. **Dashboard**: New "Sales" and "Invoices" navigation items
2. **Customer profiles**: Sales History section added
3. **Reports**: Sales reports section added, payment reports enhanced
4. **Print system**: New invoice print API following existing pattern

### Data Flow Integration
1. **Credit sales** → `updateCustomerOutstanding()` function (existing)
2. **Invoice generation** → Combines `daily_orders` + `sales` data
3. **Payment reports** → Include cash sales as immediate payments
4. **Customer total purchases** → Include all sales types for comprehensive view

---

## Success Criteria

### Business Impact
- ✅ Complete Excel replacement for manual sales tracking
- ✅ Professional invoice generation with PureDairy branding  
- ✅ Integrated customer outstanding balance management
- ✅ Cash sales tracking for business analytics
- ✅ Month-end bulk processing with organized file storage

### User Experience
- ✅ Intuitive single-form sales entry (customer optional)
- ✅ Seamless integration with existing customer/subscription workflow
- ✅ Professional invoice templates matching provided design
- ✅ Bulk processing with progress feedback and error handling
- ✅ Enhanced reporting maintaining existing report structure

### Technical Achievement  
- ✅ Maintain existing database patterns and server actions
- ✅ Leverage existing print system infrastructure
- ✅ Preserve current customer/payment/subscription functionality
- ✅ Follow established TypeScript/validation patterns
- ✅ Mobile-responsive design consistency

---

**Document Status:** Ready for review and sales_plan.md creation  
**Next Step:** Review this journey, then request comprehensive sales_plan.md  
**Integration Approach:** Enhance existing system, maintain current workflows, add new capabilities seamlessly