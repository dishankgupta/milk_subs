# Invoice Template Enhancement Plan

## Goal
Update our invoice generation to match the template exactly while maintaining single A4 page constraint. The template is located at (`/public/invoice_template.png).

## Key Changes Required

### 1. Add QR Code Section
- Position existing QR code (`/public/QR_code.png`) on bottom-left
- QR PNG already contains G Pay, Paytm, PhonePe logos - no need to add separately
- Size and position to match template layout

### 2. Implement Daily Summary Section  
- **CRITICAL**: Include BOTH delivery and manual sales in day-wise breakdown
- Main invoice table shows aggregated totals per product
- Daily summary shows: "DD/MM/YYYY - Product - Qty, Product - Qty" for each day
- Must handle mixed delivery + manual sales per day
- Optimize layout for A4 single-page constraint

### 3. Update Table Headers
- Change "PRICE" to "PRICE INCL GST" in main items table

### 4. Font Implementation
- Implement Open Sans font family with provided CSS:
```css
.open-sans-<uniquifier> {
  font-family: "Open Sans", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
  font-variation-settings: "wdth" 100;
}
```

### 5. Layout Optimization for A4 Constraint
- Responsive font sizing based on content volume
- Smart spacing adjustments
- Ensure 30-day invoices fit on single page

### 6. The logo is not showing
- Postion existing logo (`public\PureDairy_Logo-removebg-preview.png`) at the correct location

## Files to Modify

1. **Invoice PDF Generation** (`/src/lib/invoice-utils.ts`)
   - Update HTML template structure  
   - Add QR code and daily summary sections
   - Implement Open Sans font CSS
   - Optimize responsive layout for A4

2. **Invoice Data Processing** (`/src/lib/actions/invoices.ts`)
   - Extract daily breakdown from BOTH deliveries AND manual sales
   - Aggregate totals for main table
   - Process day-wise data for daily summary

3. **Database Queries** (if needed)
   - Optimize data retrieval for combined delivery + manual sales daily breakdown

## Answered Clarification Questions ✅

### Daily Summary Format & Logic
1. **Daily Summary Layout**: ✅ **ANSWERED** - Combined display format: "Sep 1 - Cow Milk - 1L, Buffalo Milk - 2L, Malai Paneer - 250 gms" (no distinction between delivery/manual sale needed)

2. **Main Table vs Daily Summary**: ✅ **ANSWERED** - Daily summary totals MUST match main table totals for each product across entire period

### Font & Styling  
3. **Font Weights**: ✅ **ANSWERED** - Suggest optimal weight distribution (to be recommended)

4. **Color Matching**: ✅ **ANSWERED** - Exact color matching required including green scheme AND orange in footer section, plus light off-white background

### Space Management
5. **Priority Order**: ✅ **ANSWERED** - Content MUST fit (max 31 days, max 7 products) - no compression acceptable

6. **Long Content Handling**: ✅ **ANSWERED** - Max 31 days only, optimal layout strategy needed

### Data Processing
7. **Invoice Period Logic**: ✅ **ANSWERED** - Skip empty days (show only days with transactions)

8. **Product Name Display**: ✅ **ANSWERED** - Full names required ("Cow Milk" not "CM")

### Technical Implementation  
9. **Date Format**: ✅ **ANSWERED** - "Sep 1" format preferred for daily summary

10. **PDF Settings**: ✅ **ANSWERED** - Need examples of possible requirements



## Additional Technical Questions - ANSWERED ✅

### Font Weight Recommendations
**Question 11: Suggested Font Weight Distribution** ✅ **ANSWERED**
**Answer: Option C** - Headers (800 extra-bold), Content (500 medium), Summary (400 regular)

### Color Scheme Specifications
**Question 12: Exact Color Codes** ✅ **ANSWERED**
**Answer: Custom Colors**
- Green Header: `#025e24`
- Footer text: Black 
- Footer symbols: Orange (using SVG files `@1www.svg`, `@2phone.svg`, `@3email.svg`)
- Main table background: `#fdfbf9`
- Remaining background: `#f8f9fa`

### Daily Summary Layout Strategy
**Question 13: 31-Day Layout Optimization** ✅ **ANSWERED**
**Answer: 4-Column Layout**
- 4 columns with 7-8 days per column
- Product quantity list directly below respective date
- Optimal space utilization for 31-day maximum

### QR Code Positioning & Size
**Question 14: QR Code Specifications** ✅ **ANSWERED**
**Answer: Custom Positioning**
- Position: Just above Daily Summary section
- Size: Match template dimensions (529 x 627 pixels)

### Data Aggregation Logic
**Question 15: Same Product Multiple Times Per Day** ✅ **ANSWERED**
**Answer: Option A** - Combined quantities ("Sep 1 - Cow Milk - 2L")

### PDF Generation Requirements
**Question 16: PDF Technical Specifications** ✅ **ANSWERED**
**Answer: Custom Configuration**
- Page margins: 15mm all sides, 10mm right margin
- Print quality: 300 DPI
- File size: Optimize for <500KB
- Metadata: Include invoice number, date, customer name
- Security: No restrictions, no password
- Orientation: Portrait
- Font embedding: Embed Open Sans fonts

### Template Background Matching
**Question 17: Background Color Implementation** ✅ **ANSWERED**
**Answer: Option B** - Apply `#fdfbf9` only to main items table area

### Mobile/Print Compatibility
**Question 18: Cross-Platform Requirements** ✅ **ANSWERED**
**Answer: Option A** - Desktop viewing optimization only

## Final Implementation Questions - ANSWERED ✅

### SVG Footer Icons Integration
**Question 19: Footer Icon Implementation** ✅ **ANSWERED**
**Answer: Option C** - Convert SVGs to base64 and embed
**Reason**: Best for PDF generation compatibility, ensures icons render correctly in all contexts

### 4-Column Daily Summary Layout
**Question 20: Column Distribution Logic** ✅ **ANSWERED**
**Answer: Option B** - Dynamic distribution based on actual transaction days

### QR Code Size Scaling  
**Question 21: QR Code Template Scaling** ✅ **ANSWERED**
**Answer: Option A** - Scale proportionally to fit available space (maintain aspect ratio)

### Daily Summary Date Grouping
**Question 22: Product Grouping Per Day** ✅ **ANSWERED**
**Answer: Custom Vertical Layout**
```
|   Column 1             Column 2             Column 3             Column 4        |
|                                                                                  |
|   Sep 1                Sep 2                Sep 3                Sep 4           |
|   Cow Milk - 2L        Cow Milk - 2L        Cow Milk - 2L        Cow Milk - 2L   |
|   Buffalo Milk - 1L    Buffalo Milk - 1L    Buffalo Milk - 1L    Buffalo Milk - 1L |
|   Paneer - 250g        Paneer - 250g        Paneer - 250g        Paneer - 250g   |
```
**Format**: Date on separate line, each product on new line below date, continues for all transaction days

## Success Criteria
- Invoice matches template design exactly
- All content fits on single A4 page  
- QR code positioned just above daily summary
- Daily summary in 4-column layout (7-8 days per column)
- Open Sans font with specified weights implemented
- Exact color matching with custom color scheme
- SVG footer icons integrated
- PDF optimized for desktop viewing with 300 DPI quality
