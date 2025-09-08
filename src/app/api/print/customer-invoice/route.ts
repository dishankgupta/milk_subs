import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { prepareInvoiceData } from '@/lib/actions/invoices'
import type { InvoiceData } from '@/lib/actions/invoices'
import { 
  getInvoiceAssets, 
  calculateResponsiveFontSizes, 
  getOpenSansFontCSS,
  formatDailySummaryForColumns 
} from '@/lib/invoice-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')
    if (!customerId || !periodStart || !periodEnd) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // If invoice number provided, use it; otherwise generate new one
    const invoiceData = await prepareInvoiceData(customerId, periodStart, periodEnd)

    const html = generateInvoiceHTML(invoiceData)

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Invoice generation error:', error)
    return new Response('Failed to generate invoice', { status: 500 })
  }
}

function generateInvoiceHTML(invoiceData: InvoiceData): string {
  // Get all assets converted to base64
  const assets = getInvoiceAssets()
  
  // Calculate responsive font sizes based on content volume
  const totalLineItems = invoiceData.deliveryItems.length + invoiceData.manualSalesItems.length
  const fontSizes = calculateResponsiveFontSizes({
    dailySummaryDays: invoiceData.dailySummary.length,
    productCount: [...new Set([...invoiceData.deliveryItems, ...invoiceData.manualSalesItems].map(item => item.productName))].length,
    totalLineItems
  })
  
  // Format daily summary for 4-column layout
  const dailySummaryColumns = formatDailySummaryForColumns(invoiceData.dailySummary)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber} - ${invoiceData.customer.billing_name}</title>
  <style>
    ${getOpenSansFontCSS()}
    
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 10mm; /* 15mm all sides, 10mm right as per spec */
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "Open Sans", sans-serif;
      font-size: ${fontSizes.baseSize}px;
      line-height: 1.4;
      color: #333;
      background: #f8f9fa; /* Light off-white background as per spec */
    }
    
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      padding: 15px 0;
      background: white;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1; /* Equal space for centering */
    }
    
    .logo-img {
      width: 120px; /* Reduced back to 120px */
      height: auto;
    }
    
    .invoice-title {
      text-align: left;
      font-size: ${fontSizes.titleSize}px;
      font-weight: 800; /* Extra bold for title */
      color: #025e24;
      letter-spacing: 2px;
      flex: 1; /* Equal space */
    }
    
    .company-address {
      text-align: right;
      flex: 1; /* Equal space */
      font-size: 11px;
      font-weight: 400; /* Regular weight */
      color: #666;
      line-height: 1.3;
    }
    
    .main-content {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .left-section {
      flex: 1;
      max-width: 35%;
    }
    
    .customer-title {
      font-size: ${fontSizes.baseSize + 2}px;
      font-weight: 800; /* Extra bold for headers */
      color: black;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .customer-info {
      font-weight: 500; /* Medium weight for content */
      margin-bottom: 20px;
    }
    
    .customer-name {
      font-size: ${fontSizes.baseSize + 2}px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }
    
    .invoice-meta {
      font-weight: 500;
      margin-bottom: 20px;
    }
    
    .invoice-number {
      font-size: ${fontSizes.baseSize + 2}px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    
    .right-section {
      flex: 2;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      background: #fdfbf9; /* Main table background as per spec */
      border: 1px solid #025e24;
    }
    
    .items-table th {
      background: #025e24; /* Custom green header */
      color: white;
      padding: 12px 8px;
      text-align: center;
      font-weight: 800; /* Extra bold for headers */
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
      text-transform: uppercase;
      border: 1px solid #025e24;
    }
    
    .items-table th:first-child {
      text-align: left;
    }
    
    .items-table th:last-child {
      text-align: right;
    }
    
    .items-table td {
      padding: 8px;
      border: 1px solid #ddd;
      font-weight: 500; /* Medium weight for content */
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
    }
    
    .items-table td:last-child {
      text-align: right;
      font-weight: 500;
    }
    
    .totals-section {
      margin: 15px 0;
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-table {
      border-collapse: collapse;
      background: #fdfbf9;
    }
    
    .totals-table td {
      padding: 6px 15px;
      border: 1px solid #ddd;
      font-weight: 500;
      font-size: ${Math.max(fontSizes.baseSize - 1, 9)}px;
    }
    
    .totals-table .label {
      text-align: right;
      font-weight: 500;
    }
    
    .totals-table .amount {
      text-align: right;
    }
    
    .grand-total {
      font-weight: 800;
      font-size: ${fontSizes.baseSize}px;
    }
    
    .qr-section {
      margin: 20px 0;
      text-align: center;
    }
    
    .qr-code-img {
      max-width: 105px; /* 140px * 0.75 = 105px */
      height: auto;
      border: 1px solid #ddd;
    }
    
    .daily-summary {
      margin: 20px 0;
      border: 1px solid #666;
      background: white;
    }
    
    .daily-summary-title {
      padding: 8px 15px;
      font-size: ${fontSizes.baseSize}px;
      font-weight: 800; /* Extra bold for headers */
      color: black;
      border-bottom: 1px solid #666;
    }
    
    .daily-summary-content {
      padding: 15px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      font-size: ${fontSizes.summarySize}px;
      font-weight: 400; /* Regular weight for summary */
    }
    
    .daily-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .daily-entry {
      margin-bottom: 8px;
    }
    
    .daily-date {
      font-weight: 500;
      color: black;
      margin-bottom: 3px;
    }
    
    .daily-product {
      font-size: ${Math.max(fontSizes.summarySize - 1, 8)}px;
      color: #666;
      margin-left: 8px;
      line-height: 1.2;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 40px;
      font-size: ${Math.max(fontSizes.baseSize - 2, 8)}px;
      color: black;
      background: white;
      padding: 10px;
    }
    
    .footer-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .footer-icon {
      width: 16px;
      height: 16px;
    }
    
    /* Print optimizations for 300 DPI */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .items-table, .daily-summary {
        break-inside: avoid;
      }
      
      .daily-summary-content {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- Header with Invoice Title, Logo (Center), and Company Address -->
  <div class="header">
    <h1 class="invoice-title">INVOICE</h1>
    <div class="logo-section">
      ${assets.logo ? `<img src="${assets.logo}" alt="PureDairy Logo" class="logo-img">` : ''}
    </div>
    <div class="company-address">
      Plot No. G-2/8, MIDC,<br>
      Jalgaon - 3, MS, India.
    </div>
  </div>

  <!-- Main Content Layout -->
  <div class="main-content">
    <!-- Left Section: Customer Details + QR Code -->
    <div class="left-section">
      <div class="customer-title">CUSTOMER NAME</div>
      <div class="customer-info">
        <div class="customer-name">${invoiceData.customer.billing_name}</div>
        <div>${invoiceData.customer.address || ''}</div>
      </div>
      
      <div class="invoice-meta">
        <div class="invoice-number">Invoice No: ${invoiceData.invoiceNumber}</div>
        <div>Invoice Period: ${format(new Date(invoiceData.periodStart), 'dd/MM/yyyy')} - ${format(new Date(invoiceData.periodEnd), 'dd/MM/yyyy')}</div>
        <div>Invoice Date: ${format(new Date(invoiceData.invoiceDate), 'dd/MM/yyyy')}</div>
      </div>

      <!-- QR Code positioned above daily summary -->
      ${assets.qrCode ? `
      <div class="qr-section">
        <img src="${assets.qrCode}" alt="Payment QR Code" class="qr-code-img">
      </div>
      ` : ''}
    </div>

    <!-- Right Section: Items Table -->
    <div class="right-section">
      <table class="items-table">
        <thead>
          <tr>
            <th>ITEM DESCRIPTION</th>
            <th>QTY</th>
            <th>PRICE<br><small>INCL. GST</small></th>
            <th>TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${(invoiceData.deliveryItems || []).map(item => `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align: center;">${item.quantity} ${item.unitOfMeasure}</td>
              <td style="text-align: center;">₹ ${item.unitPrice.toFixed(2)}</td>
              <td>₹ ${item.totalAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
          ${(invoiceData.manualSalesItems || []).map(item => `
            <tr>
              <td>${item.productName}</td>
              <td style="text-align: center;">${item.quantity} ${item.unitOfMeasure}</td>
              <td style="text-align: center;">₹ ${item.unitPrice.toFixed(2)}</td>
              <td>₹ ${item.totalAmount.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="totals-section">
        <table class="totals-table">
          <tr>
            <td class="label">SUB TOTAL</td>
            <td class="amount">₹ ${(invoiceData.totals.deliveryAmount + invoiceData.totals.manualSalesAmount - invoiceData.totals.totalGstAmount).toFixed(2)}</td>
          </tr>
          ${invoiceData.totals.totalGstAmount > 0 ? `
          <tr>
            <td class="label">G.S.T.</td>
            <td class="amount">₹ ${invoiceData.totals.totalGstAmount.toFixed(2)}</td>
          </tr>
          ` : ''}
          <tr class="grand-total">
            <td class="label">GRAND TOTAL</td>
            <td class="amount">₹ ${invoiceData.totals.grandTotal.toFixed(2)}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- 4-Column Daily Summary -->
  ${invoiceData.dailySummary.length > 0 ? `
  <div class="daily-summary">
    <div class="daily-summary-title">Daily Summary:</div>
    <div class="daily-summary-content">
      ${dailySummaryColumns.map(column => `
        <div class="daily-column">
          ${column.map(day => `
            <div class="daily-entry">
              <div class="daily-date">${day.formattedDate}</div>
              ${day.items.map(item => `
                <div class="daily-product">${item}</div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Footer with SVG Icons -->
  <div class="footer">
    <div class="footer-item">
      ${assets.footerIcons.website ? `<img src="${assets.footerIcons.website}" alt="Website" class="footer-icon">` : '🌐'}
      <span>puredairy.net</span>
    </div>
    <div class="footer-item">
      ${assets.footerIcons.phone ? `<img src="${assets.footerIcons.phone}" alt="Phone" class="footer-icon">` : '📞'}
      <span>8767-206-236</span>
    </div>
    <div class="footer-item">
      ${assets.footerIcons.email ? `<img src="${assets.footerIcons.email}" alt="Email" class="footer-icon">` : '📧'}
      <span>info@puredairy.net</span>
    </div>
  </div>

  <script>
    // Auto-print after 2 second delay (increased for font loading)
    setTimeout(function() {
      window.print();
    }, 2000);
  </script>
</body>
</html>
`
}