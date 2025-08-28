import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { generateOutstandingReport } from '@/lib/actions/outstanding-reports'
import { formatCurrency, parseLocalDate } from '@/lib/utils'
import { getCurrentISTDate, formatDateIST, formatDateTimeIST } from '@/lib/date-utils'
import type { OutstandingCustomerData, OutstandingReportSummary } from '@/lib/types/outstanding-reports'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const printType = searchParams.get('type') || 'summary' // 'summary', 'statements', 'complete'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const customerSelection = searchParams.get('customer_selection') || 'with_outstanding'
    const selectedCustomerIds = searchParams.get('selected_customer_ids')?.split(',')

    if (!startDate || !endDate) {
      return new Response('Missing required date parameters', { status: 400 })
    }

    const reportData = await generateOutstandingReport({
      start_date: parseLocalDate(startDate),
      end_date: parseLocalDate(endDate),
      customer_selection: customerSelection as 'all' | 'with_outstanding' | 'with_subscription_and_outstanding' | 'with_credit' | 'selected',
      selected_customer_ids: selectedCustomerIds
    })

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
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2D5F2D;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #2D5F2D;
      margin-bottom: 5px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
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
  ${getPrintHeader('Outstanding Amounts Summary Report')}
  
  <div class="report-period">
    <strong>Report Period:</strong> ${format(parseLocalDate(startDate), 'dd MMMM yyyy')} to ${format(parseLocalDate(endDate), 'dd MMMM yyyy')}<br>
    <strong>Generated On:</strong> ${formatDateTimeIST(getCurrentISTDate())}
  </div>

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
    <div class="stat-card">
      <div class="stat-value">${formatCurrency(reportData.summary.total_outstanding_amount)}</div>
      <div class="stat-label">Gross Outstanding</div>
    </div>
    <div class="stat-card" style="background: #f0fdf4; border-color: #86efac;">
      <div class="stat-value" style="color: #15803d;">${formatCurrency(reportData.summary.total_unapplied_payments_amount)}</div>
      <div class="stat-label">Total Credits Available</div>
    </div>
    <div class="stat-card" style="background: ${reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount >= 0 ? '#fef3c7' : '#f0fdf4'}; border-color: ${reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount >= 0 ? '#fcd34d' : '#86efac'};">
      <div class="stat-value" style="color: ${reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount >= 0 ? '#92400e' : '#15803d'};">
        ${reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount >= 0 
          ? formatCurrency(reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount)
          : formatCurrency(Math.abs(reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount))
        }
      </div>
      <div class="stat-label">${reportData.summary.total_outstanding_amount - reportData.summary.total_unapplied_payments_amount >= 0 ? 'Net Outstanding' : 'Net Credit Balance'}</div>
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
          <th>Opening Balance</th>
          <th>Subscription</th>
          <th>Manual Sales</th>
          <th>Payments</th>
          <th>Credits Available</th>
          <th>Gross Outstanding</th>
          <th>Net Balance</th>
        </tr>
      </thead>
      <tbody>
        ${reportData.customers
          .filter(c => c.total_outstanding > 0) // Only customers with outstanding
          .sort((a, b) => b.total_outstanding - a.total_outstanding) // Sort by outstanding desc
          .map(customer => `
            <tr>
              <td>
                <strong>${customer.customer.billing_name}</strong><br>
                <small>${customer.customer.contact_person}</small>
              </td>
              <td>${customer.customer.route?.name || 'N/A'}</td>
              <td>${formatCurrency(customer.opening_balance)}</td>
              <td>${formatCurrency(
                customer.subscription_breakdown.reduce((sum, month) => sum + month.total_amount, 0)
              )}</td>
              <td>${formatCurrency(
                customer.manual_sales_breakdown.reduce((sum, sales) => sum + sales.total_amount, 0)
              )}</td>
              <td class="payment-amount">-${formatCurrency(
                customer.payment_breakdown.reduce((sum, payments) => sum + payments.total_amount, 0)
              )}</td>
              <td style="color: #15803d; font-weight: bold;">
                ${formatCurrency(customer.unapplied_payments_breakdown ? customer.unapplied_payments_breakdown.total_amount : 0)}
              </td>
              <td class="${customer.total_outstanding > 0 ? 'outstanding-amount' : 'no-outstanding'}">
                ${formatCurrency(customer.total_outstanding)}
              </td>
              <td style="font-weight: bold;">
                ${(() => {
                  const netBalance = customer.total_outstanding - (customer.unapplied_payments_breakdown ? customer.unapplied_payments_breakdown.total_amount : 0);
                  if (netBalance > 0) {
                    return `<span style="color: #dc2626;">${formatCurrency(netBalance)}</span>`;
                  } else if (netBalance < 0) {
                    return `<span style="color: #15803d;">Cr. ${formatCurrency(Math.abs(netBalance))}</span>`;
                  } else {
                    return `<span style="color: #6b7280;">₹0.00</span>`;
                  }
                })()}
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
    : reportData.customers.filter(c => c.total_outstanding > 0)

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
              <th>Quantity</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.subscription_breakdown.map(month => 
              month.product_details.map(product => `
                <tr>
                  <td>${month.month_display}</td>
                  <td>${product.product_name}</td>
                  <td>${product.quantity} ${product.unit_of_measure}</td>
                  <td>${formatCurrency(product.total_amount)}</td>
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
              <th>Quantity</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.manual_sales_breakdown.map(salesGroup =>
              salesGroup.sale_details.map(sale => `
                <tr>
                  <td>${formatDateIST(new Date(sale.sale_date))}</td>
                  <td>${sale.product_name}</td>
                  <td>${sale.quantity} ${sale.unit_of_measure}</td>
                  <td>${formatCurrency(sale.total_amount)}</td>
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
              <th>Amount</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.payment_breakdown.map(paymentGroup =>
              paymentGroup.payment_details.map(payment => `
                <tr>
                  <td>${payment.payment_date && !isNaN(new Date(payment.payment_date).getTime()) ? formatDateIST(new Date(payment.payment_date)) : 'N/A'}</td>
                  <td>${payment.payment_method}</td>
                  <td class="payment-amount">-${formatCurrency(payment.amount)}</td>
                  <td>${payment.notes || ''}</td>
                </tr>
              `).join('')
            ).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <!-- Available Credit Section -->
      ${customerData.unapplied_payments_breakdown && customerData.unapplied_payments_breakdown.unapplied_payment_details.length > 0 ? `
      <div class="transaction-section">
        <h4>Available Credit (${customerData.unapplied_payments_breakdown.unapplied_payment_details.length} Unapplied Payments)</h4>
        <table class="transaction-table">
          <thead>
            <tr>
              <th>Payment Date</th>
              <th>Original Amount</th>
              <th>Available Credit</th>
              <th>Payment Method</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${customerData.unapplied_payments_breakdown.unapplied_payment_details.map(payment => `
              <tr>
                <td>${payment.payment_date && !isNaN(new Date(payment.payment_date).getTime()) ? formatDateIST(new Date(payment.payment_date)) : 'N/A'}</td>
                <td>${formatCurrency(payment.payment_amount)}</td>
                <td style="color: #15803d; font-weight: bold;">${formatCurrency(payment.amount_unapplied)}</td>
                <td>${payment.payment_method}</td>
                <td>${payment.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 15px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #15803d;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: #15803d; font-size: 14px;">Total Credit Available</strong>
              <div style="color: #6b7280; font-size: 11px; margin-top: 2px;">
                Can be applied to outstanding invoices or opening balance
              </div>
            </div>
            <div style="color: #15803d; font-size: 18px; font-weight: bold;">
              ${formatCurrency(customerData.unapplied_payments_breakdown.total_amount)}
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Final Balance -->
      <div class="balance-summary final-balance">
        <div class="balance-row">
          <span><strong>Gross Outstanding Balance:</strong></span>
          <span class="amount outstanding">${formatCurrency(customerData.total_outstanding)}</span>
        </div>
        ${customerData.unapplied_payments_breakdown ? `
        <div class="balance-row">
          <span><strong>Less: Available Credit:</strong></span>
          <span class="amount" style="color: #15803d;">-${formatCurrency(customerData.unapplied_payments_breakdown.total_amount)}</span>
        </div>
        <div class="balance-row total-row">
          ${(() => {
            const netBalance = customerData.total_outstanding - customerData.unapplied_payments_breakdown.total_amount;
            if (netBalance > 0) {
              return `<span><strong>Net Outstanding Balance:</strong></span>
                      <span class="amount" style="color: #dc2626;">${formatCurrency(netBalance)}</span>`;
            } else if (netBalance < 0) {
              return `<span><strong>Net Credit Balance:</strong></span>
                      <span class="amount" style="color: #15803d;">${formatCurrency(Math.abs(netBalance))}</span>`;
            } else {
              return `<span><strong>Net Balance:</strong></span>
                      <span class="amount" style="color: #6b7280;">₹0.00</span>`;
            }
          })()}
        </div>
        ` : `
        <div class="balance-row total-row">
          <span><strong>Net Outstanding Balance:</strong></span>
          <span class="amount outstanding">${formatCurrency(customerData.total_outstanding)}</span>
        </div>
        `}
      </div>

      ${(() => {
        const netBalance = customerData.total_outstanding - (customerData.unapplied_payments_breakdown ? customerData.unapplied_payments_breakdown.total_amount : 0);
        if (netBalance > 0) {
          return `<div class="payment-notice">
            <p><strong>Payment Due:</strong> ${formatCurrency(netBalance)}</p>
            <p>Please remit payment at your earliest convenience.</p>
          </div>`;
        } else if (netBalance < 0) {
          return `<div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin-top: 30px;">
            <p style="color: #15803d; font-weight: bold; margin: 5px 0;">✓ Account in Credit</p>
            <p style="color: #15803d; margin: 5px 0;">Excess credit of ${formatCurrency(Math.abs(netBalance))} available.</p>
          </div>`;
        } else {
          return `<div style="background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px; margin-top: 30px;">
            <p style="color: #6b7280; font-weight: bold; margin: 5px 0;">✓ Account Balanced</p>
            <p style="color: #6b7280; margin: 5px 0;">No outstanding amount or excess credit.</p>
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
      border-bottom: 2px solid #2D5F2D;
      padding-bottom: 20px;
    }
    
    .customer-details h3 {
      color: #2D5F2D;
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
      color: #2D5F2D;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      margin-bottom: 15px;
    }
    
    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .transaction-table th,
    .transaction-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .transaction-table th {
      background: #f8f9fa;
      font-weight: bold;
      color: #2D5F2D;
    }
    
    .payment-amount {
      color: #16a34a;
      font-weight: bold;
    }
    
    .payment-notice {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 15px;
      margin-top: 30px;
    }
    
    .payment-notice p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  ${getPrintHeader('Customer Outstanding Statements')}
  
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
      <h2 style="color: #2D5F2D; text-align: center; margin: 30px 0;">Detailed Customer Statements</h2>
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
      margin: 20mm;
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
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      border: 1px solid #ddd;
    }
    
    .data-table th,
    .data-table td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #eee;
      border-right: 1px solid #eee;
    }
    
    .data-table th {
      background: #2D5F2D;
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    
    .data-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .report-period {
      background: #f0f8f0;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-size: 12px;
    }
    
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `
}

function getPrintHeader(title: string): string {
  return `
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2D5F2D;">
    <div style="display: flex; align-items: center;">
      <div style="width: 50px; height: 50px; background: #2D5F2D; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold; margin-right: 15px;">👑</div>
      <div>
        <div style="font-size: 24px; font-weight: bold; color: #2D5F2D; margin-bottom: 2px;">PureDairy</div>
        <div style="font-size: 10px; color: #666; font-style: italic;">Premium Quality Dairy Products</div>
      </div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #666;">
      Plot No. G-2/8, MIDC,<br>
      Jalgaon - 3, MS, India.
    </div>
  </div>
  <h1 style="text-align: center; font-size: 28px; font-weight: bold; color: #2D5F2D; margin: 20px 0; letter-spacing: 2px;">${title.toUpperCase()}</h1>
  `
}

function getPrintFooter(): string {
  return `
  <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #2D5F2D; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #666;">
    <div style="display: flex; align-items: center; gap: 30px;">
      <div style="display: flex; align-items: center; gap: 5px;">
        <span>🌐</span>
        <span style="font-weight: bold; color: #2D5F2D;">puredairy.net</span>
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