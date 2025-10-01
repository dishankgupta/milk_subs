import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { generateOutstandingReport } from '@/lib/actions/outstanding-reports'
import { formatCurrency, parseLocalDate } from '@/lib/utils'
import { getCurrentISTDate, formatDateIST, formatDateTimeIST } from '@/lib/date-utils'
import type { OutstandingCustomerData, OutstandingReportSummary } from '@/lib/types/outstanding-reports'

// Helper function to sort customers based on sort key and direction
function sortCustomers(
  customers: OutstandingCustomerData[],
  sortKey: string,
  sortDirection: 'asc' | 'desc'
): OutstandingCustomerData[] {
  const sorted = [...customers].sort((a, b) => {
    let aValue: number | string = 0
    let bValue: number | string = 0

    // Extract the value based on the sort key (matching dashboard logic)
    switch (sortKey) {
      case 'customer.billing_name':
        aValue = a.customer.billing_name
        bValue = b.customer.billing_name
        break
      case 'opening_balance':
        aValue = a.opening_balance
        bValue = b.opening_balance
        break
      case 'subscription_amount':
        aValue = a.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
        bValue = b.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
        break
      case 'manual_sales_amount':
        aValue = a.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
        bValue = b.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
        break
      case 'payments_amount':
        aValue = a.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
        bValue = b.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
        break
      case 'total_outstanding':
        aValue = a.total_outstanding
        bValue = b.total_outstanding
        break
      default:
        aValue = a.customer.billing_name
        bValue = b.customer.billing_name
    }

    // Compare values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    } else {
      return sortDirection === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    }
  })

  return sorted
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const printType = searchParams.get('type') || 'summary' // 'summary', 'statements', 'complete'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const customerSelection = searchParams.get('customer_selection') || 'with_outstanding'
    const selectedCustomerIds = searchParams.get('selected_customer_ids')?.split(',')
    const sortKey = searchParams.get('sort_key') || 'customer.billing_name'
    const sortDirection = searchParams.get('sort_direction') || 'asc'

    if (!startDate || !endDate) {
      return new Response('Missing required date parameters', { status: 400 })
    }

    const reportData = await generateOutstandingReport({
      start_date: parseLocalDate(startDate),
      end_date: parseLocalDate(endDate),
      customer_selection: customerSelection as 'all' | 'with_outstanding' | 'with_subscription_and_outstanding' | 'with_credit' | 'selected',
      selected_customer_ids: selectedCustomerIds
    })

    // Apply sorting based on the sort configuration from the dashboard
    reportData.customers = sortCustomers(reportData.customers, sortKey, sortDirection as 'asc' | 'desc')

    let html: string
    switch (printType) {
      case 'summary':
        html = generateSummaryHTML(reportData, startDate, endDate)
        break
      case 'statements':
        html = generateCustomerStatementsHTML(reportData, startDate, endDate, selectedCustomerIds)
        break
      case 'complete':
        html = generateCompleteReportHTML(reportData, startDate, endDate)
        break
      default:
        return new Response('Invalid print type', { status: 400 })
    }

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Outstanding report print error:', error)
    return new Response('Failed to generate print layout', { status: 500 })
  }
}

function generateSummaryHTML(
  reportData: { customers: OutstandingCustomerData[], summary: OutstandingReportSummary },
  startDate: string,
  endDate: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outstanding Amounts Summary - ${format(parseLocalDate(startDate), 'dd/MM/yyyy')} to ${format(parseLocalDate(endDate), 'dd/MM/yyyy')}</title>
  <style>
    ${getCommonPrintStyles()}
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .stat-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 10px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-table {
      margin-top: 30px;
    }
    
    .outstanding-amount {
      font-weight: bold;
      color: #dc2626;
    }
    
    .no-outstanding {
      color: #16a34a;
    }
  </style>
</head>
<body>
  ${getPrintHeader('Outstanding Amounts Summary Report', `Report Period: ${format(parseLocalDate(startDate), 'dd MMMM yyyy')} to ${format(parseLocalDate(endDate), 'dd MMMM yyyy')}`)}

  ${reportData.customers.length > 0 ? `
  <div class="report-period">
    <strong>Customers:</strong> ${reportData.customers.length} •
    <strong>With Outstanding:</strong> ${reportData.summary.customers_with_outstanding}
  </div>
  ` : ''}

  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <div class="stat-value">${reportData.summary.total_customers}</div>
      <div class="stat-label">Total Customers</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${reportData.summary.customers_with_outstanding}</div>
      <div class="stat-label">With Outstanding</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatCurrency(reportData.summary.total_opening_balance)}</div>
      <div class="stat-label">Total Opening Balance</div>
    </div>
    <div class="stat-card" style="background: #fef3c7; border-color: #fcd34d;">
      <div class="stat-value" style="color: #92400e;">${formatCurrency(reportData.summary.total_outstanding_amount)}</div>
      <div class="stat-label">Total Outstanding</div>
    </div>
  </div>

  <!-- Customer Summary Table -->
  <div class="summary-table">
    <h3>Customer Outstanding Summary</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Customer Name</th>
          <th>Route</th>
          <th style="text-align: right;">Opening Balance</th>
          <th style="text-align: right;">Subscription</th>
          <th style="text-align: right;">Manual Sales</th>
          <th style="text-align: right;">Payments</th>
          <th style="text-align: right;">Total Outstanding</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.customers
          .map(customer => `
            <tr>
              <td>
                <strong>${customer.customer.billing_name}</strong><br>
                <small>${customer.customer.contact_person}</small>
              </td>
              <td>${customer.customer.route?.name || 'N/A'}</td>
              <td style="text-align: right;">${formatCurrency(customer.opening_balance)}</td>
              <td style="text-align: right;">${formatCurrency(
                customer.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
              )}</td>
              <td style="text-align: right;">${formatCurrency(
                customer.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
              )}</td>
              <td class="payment-amount" style="text-align: right;">-${formatCurrency(
                customer.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
              )}</td>
              <td class="${customer.total_outstanding > 0 ? 'outstanding-amount' : 'no-outstanding'}" style="font-weight: bold; text-align: right;">
                ${formatCurrency(customer.total_outstanding)}
              </td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  ${getPrintFooter()}
  
  <script>
    setTimeout(function() { window.print(); }, 1000);
  </script>
</body>
</html>
`
}

function generateCustomerStatementsHTML(
  reportData: { customers: OutstandingCustomerData[], summary: OutstandingReportSummary },
  startDate: string,
  endDate: string,
  selectedCustomerIds?: string[]
): string {
  const customersToProcess = selectedCustomerIds 
    ? reportData.customers.filter(c => selectedCustomerIds.includes(c.customer.id))
    : reportData.customers // Show all customers returned by the filter logic

  const statements = customersToProcess.map(customerData => {
    return `
    <div class="customer-statement" style="page-break-after: always;">
      <div class="statement-header">
        <h2>Customer Statement</h2>
        <div class="customer-details">
          <h3>${customerData.customer.billing_name}</h3>
          <p>${customerData.customer.address}</p>
          <p>Contact: ${customerData.customer.contact_person}</p>
          <p>Phone: ${customerData.customer.phone_primary}</p>
        </div>
        <div class="statement-period">
          <p><strong>Statement Period:</strong><br>
          ${formatDateIST(parseLocalDate(startDate))} to ${formatDateIST(parseLocalDate(endDate))}</p>
        </div>
      </div>

      <div class="balance-summary">
        <div class="balance-row">
          <span>Opening Balance (as of ${formatDateIST(parseLocalDate(startDate))}):</span>
          <span class="amount">${formatCurrency(customerData.opening_balance)}</span>
        </div>
      </div>

      <!-- Subscription Details -->
      ${customerData.subscription_breakdown.length > 0 ? `
      <div class="transaction-section">
        <h4>Subscription Deliveries</h4>
        <table class="transaction-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Product</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.subscription_breakdown.map(month =>
              month.product_details.map(product => `
                <tr>
                  <td>${month.month_display}</td>
                  <td>${product.product_name}</td>
                  <td style="text-align: right;">${product.quantity} ${product.unit_of_measure}</td>
                  <td style="text-align: right;">${formatCurrency(product.total_amount)}</td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Manual Sales Details -->
      ${customerData.manual_sales_breakdown.length > 0 ? `
      <div class="transaction-section">
        <h4>Manual Credit Sales</h4>
        <table class="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.manual_sales_breakdown.map(salesGroup =>
              salesGroup.sale_details.map(sale => `
                <tr>
                  <td>${formatDateIST(new Date(sale.sale_date))}</td>
                  <td>${sale.product_name}</td>
                  <td style="text-align: right;">${sale.quantity} ${sale.unit_of_measure}</td>
                  <td style="text-align: right;">${formatCurrency(sale.total_amount)}</td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Payment History -->
      ${customerData.payment_breakdown.length > 0 ? `
      <div class="transaction-section">
        <h4>Payment History</h4>
        <table class="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Payment Method</th>
              <th style="text-align: right;">Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.payment_breakdown.map(paymentGroup =>
              paymentGroup.payment_details.map(payment => `
                <tr>
                  <td>${payment.payment_date && !isNaN(new Date(payment.payment_date).getTime()) ? formatDateIST(new Date(payment.payment_date)) : 'N/A'}</td>
                  <td>${payment.payment_method}</td>
                  <td class="payment-amount" style="text-align: right;">-${formatCurrency(payment.amount)}</td>
                  <td>${payment.notes || ''}</td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Final Balance -->
      <div class="balance-summary final-balance">
        <div class="balance-row total-row">
          <span><strong>Total Outstanding Balance:</strong></span>
          <span class="amount ${customerData.total_outstanding > 0 ? 'outstanding' : ''}" style="color: ${customerData.total_outstanding > 0 ? '#dc2626' : customerData.total_outstanding < 0 ? '#15803d' : '#6b7280'};">
            ${customerData.total_outstanding >= 0 ? formatCurrency(customerData.total_outstanding) : 'Cr. ' + formatCurrency(Math.abs(customerData.total_outstanding))}
          </span>
        </div>
      </div>

      ${(() => {
        if (customerData.total_outstanding > 0) {
          return `<div class="payment-notice">
            <p><strong>Payment Due:</strong> ${formatCurrency(customerData.total_outstanding)}</p>
            <p>Please remit payment at your earliest convenience.</p>
          </div>`;
        } else if (customerData.total_outstanding < 0) {
          return `<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin-top: 30px;">
            <p style="color: #15803d; font-weight: bold; margin: 5px 0;">✓ Account in Credit</p>
            <p style="color: #15803d; margin: 5px 0;">Excess credit of ${formatCurrency(Math.abs(customerData.total_outstanding))} available.</p>
          </div>`;
        } else {
          return `<div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin-top: 30px;">
            <p style="color: #6b7280; font-weight: bold; margin: 5px 0;">✓ Account Balanced</p>
            <p style="color: #6b7280; margin: 5px 0;">No outstanding amount.</p>
          </div>`;
        }
      })()}
    </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Statements - ${formatDateIST(getCurrentISTDate())}</title>
  <style>
    ${getCommonPrintStyles()}
    
    .customer-statement {
      min-height: calc(100vh - 60mm);
      padding: 20px 0;
    }
    
    .statement-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      border-bottom: 2px solid #22c55e;
      padding-bottom: 20px;
    }

    .customer-details h3 {
      color: #333;
      margin-bottom: 10px;
      font-size: 18px;
    }
    
    .customer-details p {
      margin: 5px 0;
      color: #666;
    }
    
    .balance-summary {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .balance-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
    }
    
    .total-row {
      border-top: 2px solid #ddd;
      padding-top: 10px;
      margin-top: 10px;
      font-size: 16px;
    }
    
    .amount.outstanding {
      color: #dc2626;
      font-size: 18px;
    }
    
    .transaction-section {
      margin: 25px 0;
    }
    
    .transaction-section h4 {
      color: #333;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }

    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
    }

    .transaction-table th,
    .transaction-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
    }

    .transaction-table th {
      background: #FFD580;
      font-weight: bold;
      color: #333;
    }
    
    .payment-amount {
      color: #16a34a;
      font-weight: bold;
    }
    
    .payment-notice {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin-top: 30px;
    }

    .payment-notice p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  ${getPrintHeader('Customer Outstanding Statements', `Report Period: ${format(parseLocalDate(startDate), 'dd MMMM yyyy')} to ${format(parseLocalDate(endDate), 'dd MMMM yyyy')}`)}
  
  ${statements}
  
  <script>
    setTimeout(function() { window.print(); }, 1000);
  </script>
</body>
</html>
`
}

function generateCompleteReportHTML(
  reportData: { customers: OutstandingCustomerData[], summary: OutstandingReportSummary },
  startDate: string,
  endDate: string
): string {
  // Combination of summary + detailed customer breakdowns
  const summaryHtml = generateSummaryHTML(reportData, startDate, endDate)
  const detailedHtml = generateCustomerStatementsHTML(reportData, startDate, endDate)
  
  // Combine both with page breaks
  const statementsContent = detailedHtml.match(/<div class="customer-statement"[\s\S]*?<\/div>/g)?.join('') || ''
  
  return summaryHtml.replace(
    '<script>setTimeout(function() { window.print(); }, 1000);</script>',
    `
    <div style="page-break-before: always;">
      <h2 style="color: #333; text-align: center; margin: 30px 0; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">Detailed Customer Statements</h2>
    </div>
    ${statementsContent}
    <script>setTimeout(function() { window.print(); }, 1000);</script>
    `
  )
}

// Common print styles
function getCommonPrintStyles(): string {
  return `
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: white;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #22c55e;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo {
      width: 80px;
      height: auto;
    }

    .company-info h1 {
      font-size: 24px;
      color: #333;
      margin-bottom: 2px;
    }

    .company-info p {
      font-size: 12px;
      color: #666;
    }

    .report-info {
      text-align: right;
    }

    .report-info h2 {
      font-size: 16px;
      margin-bottom: 5px;
      color: #333;
    }

    .report-info p {
      font-size: 10px;
      color: #666;
      margin-bottom: 2px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border: 1px solid #e9ecef;
    }

    .data-table th,
    .data-table td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      border-right: 1px solid #e9ecef;
    }

    .data-table th {
      background: #FFD580;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }

    .data-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }

    .report-period {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 20px;
      font-size: 10px;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `
}

function getPrintHeader(title: string, subtitle?: string): string {
  return `
  <div class="header">
    <div class="logo-section">
      <img src="/PureDairy_Logo-removebg-preview.png" alt="PureDairy" class="logo">
      <div class="company-info">
        <h1>PureDairy</h1>
        <p>Surety of Purity</p>
      </div>
    </div>
    <div class="report-info">
      <h2>${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
      <p>Generated on: ${formatDateTimeIST(getCurrentISTDate())}</p>
    </div>
  </div>
  `
}

function getPrintFooter(): string {
  return `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #22c55e; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #666;">
    <div style="display: flex; align-items: center; gap: 30px;">
      <div style="display: flex; align-items: center; gap: 5px;">
        <span>🌐</span>
        <span style="font-weight: bold; color: #22c55e;">puredairy.net</span>
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span>📞</span>
        <span>8767-206-236</span>
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span>📧</span>
        <span>info@puredairy.net</span>
      </div>
    </div>
  </div>
  `
}