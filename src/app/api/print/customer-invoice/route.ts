import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { prepareInvoiceData } from '@/lib/actions/invoices'
import { formatCurrency } from '@/lib/utils'
import type { InvoiceData } from '@/lib/actions/invoices'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const periodStart = searchParams.get('period_start')
    const periodEnd = searchParams.get('period_end')
    const invoiceNumber = searchParams.get('invoice_number')

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
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoiceData.invoiceNumber} - ${invoiceData.customer.billing_name}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      background: white;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2D5F2D;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
    }
    
    .logo {
      width: 60px;
      height: 60px;
      background: #2D5F2D;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      margin-right: 15px;
    }
    
    .company-name {
      font-size: 28px;
      font-weight: bold;
      color: #2D5F2D;
      margin-bottom: 2px;
    }
    
    .company-tagline {
      font-size: 12px;
      color: #666;
      font-style: italic;
    }
    
    .company-address {
      text-align: right;
      font-size: 11px;
      color: #666;
      line-height: 1.3;
    }
    
    .invoice-title {
      text-align: center;
      font-size: 36px;
      font-weight: bold;
      color: #2D5F2D;
      margin: 20px 0;
      letter-spacing: 2px;
    }
    
    .invoice-details {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .customer-details {
      flex: 1;
    }
    
    .customer-title {
      font-size: 16px;
      font-weight: bold;
      color: #2D5F2D;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .customer-info {
      background: #f8f9fa;
      padding: 15px;
      border-left: 4px solid #2D5F2D;
      border-radius: 0 8px 8px 0;
    }
    
    .customer-name {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }
    
    .invoice-meta {
      text-align: right;
      background: #2D5F2D;
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-left: 30px;
    }
    
    .invoice-number {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    
    .qr-code {
      width: 120px;
      height: 120px;
      background: white;
      border: 2px solid #ddd;
      border-radius: 8px;
      margin: 15px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #666;
      text-align: center;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      border: 2px solid #2D5F2D;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .items-table th {
      background: #2D5F2D;
      color: white;
      padding: 15px 10px;
      text-align: left;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-right: 1px solid rgba(255,255,255,0.2);
    }
    
    .items-table th:last-child {
      border-right: none;
      text-align: right;
    }
    
    .items-table td {
      padding: 12px 10px;
      border-bottom: 1px solid #eee;
      border-right: 1px solid #eee;
    }
    
    .items-table td:last-child {
      border-right: none;
      text-align: right;
      font-weight: bold;
    }
    
    .items-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .items-table tbody tr:hover {
      background: #e8f5e8;
    }
    
    .totals-section {
      margin: 30px 0;
      display: flex;
      justify-content: flex-end;
    }
    
    .totals-table {
      border-collapse: collapse;
      min-width: 300px;
    }
    
    .totals-table td {
      padding: 10px 20px;
      border: 1px solid #ddd;
    }
    
    .totals-table .label {
      font-weight: bold;
      background: #f8f9fa;
      text-align: right;
    }
    
    .totals-table .amount {
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    
    .grand-total {
      background: #2D5F2D !important;
      color: white !important;
      font-size: 16px;
      font-weight: bold;
    }
    
    .daily-summary {
      margin: 40px 0;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .daily-summary-title {
      background: #f0f0f0;
      padding: 15px 20px;
      font-size: 16px;
      font-weight: bold;
      color: #2D5F2D;
      border-bottom: 1px solid #ddd;
    }
    
    .daily-summary-content {
      padding: 20px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .daily-entry {
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px dotted #ccc;
    }
    
    .daily-entry:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    .daily-date {
      font-weight: bold;
      color: #2D5F2D;
      margin-bottom: 5px;
    }
    
    .daily-items {
      font-size: 11px;
      color: #666;
      margin-left: 20px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #2D5F2D;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #666;
    }
    
    .contact-info {
      display: flex;
      align-items: center;
      gap: 30px;
    }
    
    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .website {
      font-weight: bold;
      color: #2D5F2D;
    }
    
    /* Print optimizations */
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      
      .items-table {
        break-inside: avoid;
      }
      
      .daily-summary {
        break-inside: avoid;
      }
    }
    
    /* Auto-print after load */
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Header with Logo and Company Info -->
  <div class="header">
    <div class="logo-section">
      <div class="logo">👑</div>
      <div>
        <div class="company-name">PureDairy</div>
        <div class="company-tagline">Premium Quality Dairy Products</div>
      </div>
    </div>
    <div class="company-address">
      Plot No. G-2/8, MIDC,<br>
      Jalgaon - 3, MS, India.
    </div>
  </div>

  <!-- Invoice Title -->
  <h1 class="invoice-title">INVOICE</h1>

  <!-- Customer and Invoice Details -->
  <div class="invoice-details">
    <div class="customer-details">
      <div class="customer-title">Customer Name</div>
      <div class="customer-info">
        <div class="customer-name">${invoiceData.customer.billing_name}</div>
        <div>${invoiceData.customer.address}</div>
        <div>Contact: ${invoiceData.customer.contact_person}</div>
        <div>Phone: ${invoiceData.customer.phone_primary}</div>
      </div>
    </div>
    
    <div class="invoice-meta">
      <div class="invoice-number">Invoice No: ${invoiceData.invoiceNumber}</div>
      <div>Date: ${format(new Date(invoiceData.invoiceDate), 'dd/MM/yyyy')}</div>
      <div>Period: ${format(new Date(invoiceData.periodStart), 'dd/MM/yyyy')} to ${format(new Date(invoiceData.periodEnd), 'dd/MM/yyyy')}</div>
      
      <div class="qr-code">
        QR Code<br>
        (Payment Link)
      </div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Qty</th>
        <th>Price<br>Incl. GST</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${invoiceData.subscriptionItems.map(item => `
        <tr>
          <td>
            <strong>${item.productName}</strong><br>
            <small>Subscription deliveries</small>
          </td>
          <td>${item.quantity} ${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.unitPrice)}/${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.totalAmount)}</td>
        </tr>
      `).join('')}
      
      ${invoiceData.manualSalesItems.map(item => `
        <tr>
          <td>
            <strong>${item.productName}</strong><br>
            <small>Manual sale (${format(new Date(item.saleDate), 'dd/MM/yyyy')})</small>
          </td>
          <td>${item.quantity} ${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.unitPrice)}/${item.unitOfMeasure}</td>
          <td>${formatCurrency(item.totalAmount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-section">
    <table class="totals-table">
      <tr>
        <td class="label">Sub Total:</td>
        <td class="amount">${formatCurrency(invoiceData.totals.subscriptionAmount + invoiceData.totals.manualSalesAmount)}</td>
      </tr>
      ${invoiceData.totals.totalGstAmount > 0 ? `
      <tr>
        <td class="label">G.S.T.:</td>
        <td class="amount">${formatCurrency(invoiceData.totals.totalGstAmount)}</td>
      </tr>
      ` : ''}
      <tr class="grand-total">
        <td class="label">Grand Total:</td>
        <td class="amount">${formatCurrency(invoiceData.totals.grandTotal)}</td>
      </tr>
    </table>
  </div>

  <!-- Daily Summary -->
  ${invoiceData.dailySummary.length > 0 ? `
  <div class="daily-summary">
    <div class="daily-summary-title">Daily Summary:</div>
    <div class="daily-summary-content">
      ${invoiceData.dailySummary.map(day => `
        <div class="daily-entry">
          <div class="daily-date">${format(new Date(day.date), 'dd/MM/yyyy')}</div>
          <div class="daily-items">
            ${day.items.map(item => 
              `${item.productName} - ${item.quantity} ${item.unitOfMeasure}`
            ).join(', ')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="contact-info">
      <div class="contact-item">
        <span>🌐</span>
        <span class="website">puredairy.net</span>
      </div>
      <div class="contact-item">
        <span>📞</span>
        <span>8767-206-236</span>
      </div>
      <div class="contact-item">
        <span>📧</span>
        <span>info@puredairy.net</span>
      </div>
    </div>
  </div>

  <script>
    // Auto-print after 1 second delay
    setTimeout(function() {
      window.print();
    }, 1000);
  </script>
</body>
</html>
`
}