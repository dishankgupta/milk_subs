# **Feature Requirement Q\&A Summary**

This document summarizes the questions asked and answers provided during the feature planning session, including all available options for each question.

### **Initial Requirements**

1. **Product Expansion:** Add new products (e.g., Malai Paneer, Buffalo Ghee) with GST. These products will not have subscriptions. HSN code and GST rate will be added at product creation.  
2. **Sales Page:** Create a page to record individual sales. Subscription deliveries will automatically count as unbilled sales.  
3. **Invoice Generation:**  
   * Option to generate bulk invoices for all or selected customers by date range.  
   * Option to generate an invoice for a single sale.  
   * Invoices to be generated as individual PDFs and a single combined PDF.  
   * PDFs to be stored in a sub-folder named yyyymmdd\_generated\_invoices.  
4. **Sale Types:** User must select if a sale is **cash** (payment received) or **credit** (added to customer's account for monthly billing).  
5. **Billing Cycle:** Bulk invoices are typically generated on the last day of the month.  
6. **Duplicate Prevention:** A check is needed to confirm with the user if they are trying to generate invoices for a period or sale that has already been invoiced.  
7. **Reporting:** Proper reports for all new features are required.

### **Round 1: Core Concepts**

Question 1: Product & GST Structure  
For the new products with GST (like Malai Paneer, Buffalo Ghee), which pricing model makes most sense?  
A) Single price per unit with GST calculated on top (e.g., ₹100 \+ 18% GST \= ₹118 total)  
B) GST-inclusive pricing where the display price already includes GST (e.g., ₹118 with GST included)  
C) Both options available as a setting per product  
D) Different pricing tiers based on quantity purchased (with GST applied accordingly)

* **Your Answer: (D)**  
* *(Note: This was later simplified in subsequent answers to focus on a single GST-inclusive price).*

Question 2: Sales Recording & Integration  
How should unbilled subscription deliveries interact with the new sales system?  
A) Auto-create sales entries daily as deliveries happen, mark as "pending billing"  
B) Batch-create sales entries at month-end when generating invoices  
C) Keep subscription deliveries separate from manual sales, merge only during invoice generation  
D) Create provisional sales entries that can be edited before final billing

* **Your Answer: (B)**  
* *(Note: Later refined to keep daily\_orders and sales separate until invoice generation).*

Question 3: Invoice Generation Workflow  
For bulk invoice generation with mixed cash/credit sales, what's the preferred approach?  
A) Generate all invoices but mark cash sales as "Paid" and credit as "Pending"  
B) Separate invoice runs for cash and credit sales  
C) Single consolidated invoice per customer showing both cash (paid) and credit (unpaid) transactions  
D) Generate invoices only for credit sales; cash sales get receipts instead

* **Your Answer: (A)**

Question 4: Duplicate Invoice Prevention  
When the system detects potential duplicate invoice generation, what should happen?  
A) Block completely and show list of existing invoices for that period  
B) Allow regeneration but create a new version (v2, v3, etc.) with timestamp  
C) Show comparison of what was previously generated vs. current data, allow selective regeneration  
D) Allow override with admin password/confirmation, log the action

* **Your Answer: (D)**  
* **Your Comment:** "As the cash is already received as soon as the sale is made."

### **Round 2: Workflow & UI**

Question 5: Sales Entry Interface  
When recording a new sale on the sales page, what's the optimal workflow?  
A) Quick entry: Select customer → Select product → Enter quantity → Auto-calculate with GST → Save  
B) Cart style: Select customer → Add multiple products to cart → Review totals → Choose cash/credit → Save  
C) Hybrid: Quick single-product entry button \+ "Add multiple items" option for bulk sales  
D) Order-first: Create sale order → Add items → Convert to cash receipt or credit sale

* **Your Answer: (D)**  
* *(Note: This was later simplified to a cart-style entry).*

Question 6: Credit Sales & Monthly Billing  
For credit sales that get added to customer accounts, how should the monthly billing work?  
A) Fixed billing date for all customers (e.g., every 30th) with all pending credit sales included  
B) Customer-specific billing cycles (some on 15th, some on 30th) set during customer creation  
C) Flexible billing \- user can generate invoice for any customer anytime, system tracks last billed date  
D) Auto-generate on month-end for all customers with outstanding credit, but allow manual generation anytime

* **Your Answer: (B)**  
* *(Note: Later simplified to a flexible month-end generation for all).*

Question 7: HSN & GST Management  
How should HSN codes and GST rates be managed for flexibility?  
A) Hard-code common HSN codes in a dropdown, allow manual entry for others  
B) Maintain a master HSN database that can be updated, products link to HSN entries  
C) Free text entry for HSN and GST rate at product creation, no validation  
D) Pre-defined product categories, each with default HSN and GST that can be overridden

* **Your Answer: (C)**

Question 8: Reporting Requirements  
Which reports are most critical for the new features?  
A) Daily sales summary (cash vs credit), GST collected report, customer outstanding balances  
B) Product-wise sales analysis, HSN-wise GST summary, payment collection report  
C) Comprehensive dashboard with all sales metrics, separate detailed reports for tax filing  
D) Customer statements, product movement report, cash flow analysis, GST return reports

* **Your Answer: (C)**  
* **Your Clarification:** "I dont need any tax filing or GST Reports. Daily and Monthly sales summary (cash vs credit), customer outstanding balances and so on. Customer outstanding report has to be detailed."

### **Round 3: Details & Data**

Question 9: Customer Outstanding Report Details  
What information should the detailed customer outstanding report include?  
A) Just current balance: Customer name, total outstanding amount, aging (30/60/90 days)  
B) Transaction level: Each unbilled sale with date, products, amounts, plus running balance  
C) Comprehensive: Opening balance, all transactions (sales/payments/returns), closing balance, aging analysis  
D) Summary \+ Detail: Overview section with totals, expandable detailed transaction history, payment history

* **Your Answer: (D)**

Question 10: Invoice Numbering & Organization  
How should invoice numbers be generated and organized?  
A) Single sequential series for all invoices (INV-0001, INV-0002, etc.)  
B) Separate series for cash and credit (CASH-0001, CREDIT-0001)  
C) Financial year based (2024-25/0001, 2024-25/0002) with automatic reset  
D) Customer-specific prefixes (CUST001-0001) or customizable format with variables

* **Your Answer: (C)**  
* *(Note: Later simplified to a single sequential series).*

Question 11: Payment Recording for Credit Sales  
How should payments against credit sales be handled?  
A) Simple payment entry: Select customer → Enter amount → Auto-adjust against oldest outstanding  
B) Invoice-specific: Select specific invoices to pay → Enter amounts → Track partial payments  
C) Flexible allocation: Enter total payment → Manually allocate across multiple invoices or keep as advance  
D) Integrated: Payment recording on sales page with payment modes (cash/UPI/bank) and reference numbers

* **Your Answer: (A)**  
* **Your Clarification:** "If payment is extra please show needful in reports."

Question 12: Data Validation & Business Rules  
What validation rules are critical for sales entries?  
A) Basic: Can't sell products not in inventory, can't exceed credit limits (if set)  
B) Moderate: Above \+ duplicate sale warning, unusual quantity alerts, price override logging  
C) Strict: Above \+ mandatory approval for discounts, block back-dated entries beyond X days  
D) Flexible: Minimal validation, rely on user judgment, focus on audit trail and easy corrections

* **Your Answer: (A)**  
* **Your Clarification:** "No Audit trail needed for now."

### **Round 4: Edge Cases & System Setup**

Question 13: Handling Returns & Adjustments  
How should product returns and sales adjustments be managed?  
A) No returns feature needed for now, handle manually outside system  
B) Simple credit note: Create negative sales entry that adjusts customer balance  
C) Full return workflow: Return entry → Stock adjustment → Credit note/refund option  
D) Basic adjustment: Allow editing/canceling unbilled sales only, no changes after invoicing

* **Your Answer: (D)**

Question 14: Multi-location/Multi-user Considerations  
What's your setup for users and data access?  
A) Single user, single location \- keep it simple  
B) Multiple users but single location \- need user tracking on sales  
C) Single owner but multiple sales points/delivery persons \- need source tracking  
D) Multiple users with different permissions (admin, sales, view-only)

* **Your Answer: (B)**  
* *(Note: Later simplified to a single admin user).*

Question 15: Subscription vs Manual Sales Integration  
How should subscription deliveries appear alongside manual sales?  
A) Merge seamlessly: Show all as "sales" with a tag indicating source (subscription/manual)  
B) Separate sections: Subscription deliveries on top, manual sales below, combined totals  
C) Filter view: Toggle to show all/subscriptions only/manual only  
D) Keep completely separate until invoice generation, then combine

* **Your Answer: (A)**

Question 16: PDF Invoice Features  
What special features do you need in the generated PDF invoices?  
A) Basic: Clean invoice with all transaction details, totals, GST breakdown  
B) Business info: Include bank details, terms & conditions, signature space  
C) Enhanced: QR code for payment, invoice barcode, email-ready format  
D) Complete: All of above \+ company logo, custom footer, duplicate/triplicate copies

* **Your Answer: (A)**

### **Round 5: Invoice Template & Integration**

Invoice Template Clarification (Q1): Daily Summary Section  
The "Daily Summary" section at the bottom \- is this showing all deliveries made to this customer during the month?  
A) Only for subscription customers showing their delivery history  
B) For all customers showing all their transactions in the period  
C) Optional section that can be toggled on/off during invoice generation  
D) This is just sample data \- remove this section entirely

* **Your Answer: (B)**

Question 17: Price Management & Display  
How should the system handle price display and calculations?  
A) All prices stored GST-inclusive, show breakdown only in totals (like your template)  
B) Store base price and GST rate, calculate and display inclusive price  
C) Store both base and inclusive prices for quick access  
D) Store inclusive price, reverse-calculate GST when needed for reports

* **Your Answer: (A)**

Question 18: QR Code Functionality  
What should the QR code in invoices do?  
A) UPI payment link with pre-filled amount and merchant details  
B) Link to online payment page on your website  
C) Just company contact info/website  
D) Dynamic \- different for cash (paid receipt) vs credit (payment link)

* **Your Answer:** "Hard coded QR for now."

Question 19: Delivery Tracking for Subscriptions  
How granular should delivery tracking be for subscription products?  
A) Just mark delivered/not delivered each day  
B) Track quantity delivered (might vary from subscribed amount)  
C) Track delivery time, person who received, quantity delivered  
D) Simple checkbox \- delivered yes/no, with optional notes field

* **Your Answer:** "There is already a subscription delivery system in the project please note that and then ask questions."

Question 20: Opening Balances & Migration  
How will you handle existing customer balances when starting with this new system?  
A) Start fresh \- no old balances carried forward  
B) Manual entry of opening balance for each customer  
C) Import opening balances from Excel/CSV file  
D) Start with zero, add historical invoices if needed

* **Your Answer: (A)**

### **Round 6: Project Context & Final Simplifications**

*After providing the CLAUDE.md file detailing your existing project.*

Question 30: GST Implementation Strategy  
Given your existing products table, how should we extend it?  
A) Add columns: hsn\_code, gst\_rate, is\_subscription\_product to existing table  
B) Create new product\_variants table for non-subscription products with GST info  
C) Keep products table as-is, create separate sales\_products table  
D) Modify products table \+ create tax\_config table for HSN/GST management

* **Your Answer: (D)**  
* **Your Clarification:** "Actually you know what, forget HSN also for all the implementations. We will do that later."

Question 31: Sales Integration with Existing Orders  
Your daily\_orders table tracks subscription deliveries. How should manual sales integrate?  
A) Add order\_type enum ('subscription'|'manual'|'cash') to daily\_orders  
B) Create separate sales table, union data during invoice generation  
C) Create sales table that references daily\_orders for subscription items  
D) Extend daily\_orders with is\_manual\_sale, payment\_status fields

* **Your Answer: (A)**  
* **Your Clarification:** "We will not be creating orders for manual sales. Manual sales deliveries will not be tracked for now." *(This led to the decision to create a separate sales table).*

Question 32: Invoice Storage & Generation  
Where should we store generated invoices and their data?  
A) New invoices table with JSON for line items \+ invoice\_pdfs for file references  
B) Single invoices table with separate invoice\_items table for normalization  
C) Use existing tables, generate invoices on-the-fly from orders/sales/payments  
D) invoices \+ invoice\_items \+ invoice\_payments for complete tracking

* **Your Answer:** "I do not think that we should store the invoices, just the data is enough."

Question 33: Unit of Measure Management  
How should we handle different units (L, gms, kg, pieces)?  
A) Add unit\_of\_measure enum to products table  
B) Create units lookup table, add unit\_id to products  
C) Simple text field unit in products table  
D) Add unit and base\_unit\_multiplier for conversions

* **Your Answer: (C)**

Question 34: Existing Reports Enhancement  
You have comprehensive reports. How should sales data integrate?  
A) Add new "Sales Reports" section with cash/credit analysis  
B) Integrate sales data into existing reports (modify production, payment reports)  
C) Both \- enhance existing \+ add new sales-specific reports  
D) Keep separate initially, plan integration later

* **Your Answer: (A)**  
* **Your Clarification:** "But integrate with payments."

### **Round 7 & 8: Final Details & Clarifications**

Question 35 (Simplified): What information to save for each sale?  
When someone buys Malai Paneer or Ghee, what details do you want to record?  
A) Just basics: Which customer, what product, how much, price, cash or credit, date  
B) More details: Above \+ GST amount separately, any notes, who made the sale  
C) Everything: Above \+ invoice number it belongs to, customer's billing name  
D) Keep it minimal: Customer, product, quantity, total amount, date

* **Your Answer: (D)**  
* *(Note: This was later clarified that cash sales have no customer).*

Question 43: What happens to deleted/cancelled sales?  
If someone cancels a cash sale or you delete a wrong entry?  
A) Just delete it completely, no trace  
B) Soft delete \- mark as cancelled but keep record  
C) Create reverse entry (negative sale) to cancel out  
D) Don't allow deletion after invoice is generated

* **Your Answer: (D)**

Question 48: Starting Point  
What should we build first?  
A) Products with GST → Sales page → Invoice generation → Reports  
B) Sales page with existing products → Invoice generation → Add GST products later  
C) Invoice generation for existing subscriptions → Then add sales  
D) Complete everything, then deploy all at once

* **Your Answer: (A)**

Question 53 (Clarified): What connection between sales and your existing system is most important?  
A) Making sure customer's total pending amount includes both subscription dues AND credit sales  
B) When you open a customer's profile, seeing their recent manual purchases along with subscriptions  
C) Monthly invoice should show subscription charges \+ manual sales together  
D) All connections are equally important

* **Your Answer: (D)**

Question 54: Sales Data in Existing Reports  
Your payment reports currently show subscription payments. Should they:  
A) Include cash sales as auto-paid entries  
B) Keep cash sales separate, only show actual payment entries  
C) Show cash sales in a separate section of payment report  
D) No change to payment reports

* **Your Answer: (A)**  
* **Your Clarification:** "Cash sales are not made by customer name. They are just cash sales not linked to any customer. This is only for Sales reporting." *(This was a key clarification).*

Question 60: Sales Entry Validation  
When entering a sale, the system should:  
A) Cash sale \= no customer required; Credit sale \= customer mandatory  
B) Always optional customer (can be blank for both types)  
C) Default to cash if no customer selected  
D) Two different forms \- one for cash, one for credit

* **Your Answer: (A)**

Question 61: Daily Operations  
Your typical manual sales flow would be:  
A) Random walk-in → cash sale (no customer) → done  
B) Known customer → credit sale → add to their monthly bill  
C) Both A and B happen regularly  
D) Mostly B, rarely A

* **Your Answer: (C)**

Question 62: Final Confirmation  
Ready for sales\_plan.md with the final feature set?  
A) Yes, create the plan now\!  
B) Wait, I need to clarify something else

* **Your Answer: (A)**