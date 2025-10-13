import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, parseLocalDate } from '@/lib/utils'
import { formatDateIST, formatDateTimeIST, getCurrentISTDate } from '@/lib/date-utils'
import { format } from 'date-fns'

interface InvoiceWithPayments {
  id: string
  invoice_number: string
  invoice_date: string
  total_amount: number
  amount_paid: number
  invoice_status: string
  customer_id: string
  customer_name: string
  payments: {
    payment_id: string
    payment_date: string
    payment_method: string
    allocated_amount: number
  }[]
}

interface CustomerInvoiceData {
  customer_id: string
  customer_name: string
  invoices: InvoiceWithPayments[]
}

/**
 * Calculate financial year based on a date
 * Indian FY: April 1 to March 31
 * Returns [start_date, end_date] of the FY
 */
function getFinancialYear(date: Date): [Date, Date] {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-indexed

  let fyStart: Date
  let fyEnd: Date

  if (month >= 3) {
    // April (3) to December (11) - Current FY
    fyStart = new Date(year, 3, 1) // April 1st of current year
    fyEnd = new Date(year + 1, 2, 31) // March 31st of next year
  } else {
    // January (0) to March (2) - Previous FY
    fyStart = new Date(year - 1, 3, 1) // April 1st of previous year
    fyEnd = new Date(year, 2, 31) // March 31st of current year
  }

  return [fyStart, fyEnd]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const selectedCustomerIds = searchParams.get('selected_customer_ids')?.split(',')

    if (!startDate || !endDate) {
      return new Response('Missing required date parameters', { status: 400 })
    }

    if (!selectedCustomerIds || selectedCustomerIds.length === 0) {
      return new Response('No customers selected', { status: 400 })
    }

    // Calculate financial year from the date range
    const dateRangeStart = parseLocalDate(startDate)
    const [fyStart, fyEnd] = getFinancialYear(dateRangeStart)

    // Format dates for database query
    const fyStartStr = format(fyStart, 'yyyy-MM-dd')
    const fyEndStr = format(fyEnd, 'yyyy-MM-dd')

    const supabase = await createClient()

    // Fetch all invoices for selected customers in FY with status Pending or Partially Paid
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoice_metadata')
      .select(`
        id,
        invoice_number,
        invoice_date,
        total_amount,
        amount_paid,
        invoice_status,
        customer_id,
        customer:customers (
          billing_name
        )
      `)
      .in('customer_id', selectedCustomerIds)
      .gte('invoice_date', fyStartStr)
      .lte('invoice_date', fyEndStr)
      .in('invoice_status', ['sent', 'pending', 'partially_paid', 'overdue'])
      .order('customer_id, invoice_date')

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError)
      return new Response('Failed to fetch invoices', { status: 500 })
    }

    if (!invoices || invoices.length === 0) {
      return new Response(generateEmptyReportHTML(startDate, endDate, fyStart, fyEnd), {
        headers: {
          'Content-Type': 'text/html; charset=UTF-8',
          'Cache-Control': 'no-cache'
        }
      })
    }

    // Fetch payment allocations for these invoices
    const invoiceIds = invoices.map(inv => inv.id)
    const { data: paymentAllocations, error: paymentsError } = await supabase
      .from('invoice_payments')
      .select(`
        invoice_id,
        amount_allocated,
        payment:payments (
          id,
          payment_date,
          payment_method
        )
      `)
      .in('invoice_id', invoiceIds)
      .order('invoice_id')

    if (paymentsError) {
      console.error('Error fetching payment allocations:', paymentsError)
    }

    // Build payment map: invoice_id -> payment details
    const paymentsMap = new Map<string, Array<{
      payment_id: string
      payment_date: string
      payment_method: string
      allocated_amount: number
    }>>()

    if (paymentAllocations) {
      for (const allocation of paymentAllocations) {
        if (!paymentsMap.has(allocation.invoice_id)) {
          paymentsMap.set(allocation.invoice_id, [])
        }

        const payment = Array.isArray(allocation.payment) ? allocation.payment[0] : allocation.payment
        if (payment) {
          paymentsMap.get(allocation.invoice_id)!.push({
            payment_id: payment.id,
            payment_date: payment.payment_date,
            payment_method: payment.payment_method,
            allocated_amount: Number(allocation.amount_allocated || 0)
          })
        }
      }
    }

    // Build customer invoice data
    const customerMap = new Map<string, CustomerInvoiceData>()

    for (const invoice of invoices) {
      const customer = Array.isArray(invoice.customer) ? invoice.customer[0] : invoice.customer
      const customerName = customer?.billing_name || 'Unknown Customer'

      if (!customerMap.has(invoice.customer_id)) {
        customerMap.set(invoice.customer_id, {
          customer_id: invoice.customer_id,
          customer_name: customerName,
          invoices: []
        })
      }

      const invoiceData: InvoiceWithPayments = {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        total_amount: Number(invoice.total_amount || 0),
        amount_paid: Number(invoice.amount_paid || 0),
        invoice_status: invoice.invoice_status,
        customer_id: invoice.customer_id,
        customer_name: customerName,
        payments: paymentsMap.get(invoice.id) || []
      }

      customerMap.get(invoice.customer_id)!.invoices.push(invoiceData)
    }

    // Convert to array and sort by customer name
    const customerData = Array.from(customerMap.values()).sort((a, b) =>
      a.customer_name.localeCompare(b.customer_name)
    )

    const html = generateReportHTML(customerData, startDate, endDate, fyStart, fyEnd)

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Outstanding invoices report error:', error)
    return new Response('Failed to generate report', { status: 500 })
  }
}

function generateReportHTML(
  customerData: CustomerInvoiceData[],
  startDate: string,
  endDate: string,
  fyStart: Date,
  fyEnd: Date
): string {
  const totalInvoices = customerData.reduce((sum, c) => sum + c.invoices.length, 0)
  const totalOutstanding = customerData.reduce((sum, c) =>
    sum + c.invoices.reduce((invSum, inv) => invSum + (inv.total_amount - inv.amount_paid), 0), 0
  )

  const customersHTML = customerData.map(customer => {
    const customerTotal = customer.invoices.reduce((sum, inv) => sum + inv.total_amount, 0)
    const customerPaid = customer.invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)
    const customerOutstanding = customerTotal - customerPaid

    return `
    <div class="customer-section" style="page-break-inside: avoid; margin-bottom: 25px;">
      <div class="customer-header">
        <h3>${customer.customer_name}</h3>
        <div class="customer-summary">
          <span>${customer.invoices.length} Invoice${customer.invoices.length > 1 ? 's' : ''}</span>
          <span class="outstanding-badge">Outstanding: ${formatCurrency(customerOutstanding)}</span>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 20%;">Invoice Number</th>
            <th style="width: 15%;">Date</th>
            <th style="width: 15%; text-align: right;">Total</th>
            <th style="width: 15%; text-align: right;">Paid</th>
            <th style="width: 15%; text-align: right;">Outstanding</th>
            <th style="width: 20%;">Payment Allocations</th>
          </tr>
        </thead>
        <tbody>
          ${customer.invoices.map(invoice => {
            const outstanding = invoice.total_amount - invoice.amount_paid

            return `
            <tr class="invoice-row">
              <td class="invoice-number">${invoice.invoice_number}</td>
              <td>${formatDateIST(new Date(invoice.invoice_date))}</td>
              <td style="text-align: right;">${formatCurrency(invoice.total_amount)}</td>
              <td style="text-align: right; color: #16a34a;">${formatCurrency(invoice.amount_paid)}</td>
              <td style="text-align: right; font-weight: bold; color: #dc2626;">${formatCurrency(outstanding)}</td>
              <td style="text-align: right;">${invoice.payments.length}</td>
            </tr>
            ${invoice.payments.length > 0 ? `
            <tr class="payment-details-row">
              <td colspan="6" class="payment-details">
                <div class="payment-list">
                  ${invoice.payments.map(payment => `
                    <div class="payment-item">
                      • ${formatDateIST(new Date(payment.payment_date))} - ${payment.payment_method} - ${formatCurrency(payment.allocated_amount)}
                    </div>
                  `).join('')}
                </div>
              </td>
            </tr>
            ` : `
            <tr class="payment-details-row">
              <td colspan="6" class="payment-details no-payments-cell">
                <em>No payments allocated yet</em>
              </td>
            </tr>
            `}
            `
          }).join('')}
        </tbody>
      </table>
    </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outstanding Invoices Report - FY ${format(fyStart, 'yyyy')}-${format(fyEnd, 'yyyy').slice(-2)}</title>
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
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
    }

    .stat-value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .customer-section {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      background: white;
    }

    .customer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 10px;
      margin-bottom: 12px;
      border-bottom: 2px solid #22c55e;
    }

    .customer-header h3 {
      font-size: 14px;
      color: #333;
      margin: 0;
    }

    .customer-summary {
      display: flex;
      gap: 15px;
      align-items: center;
      font-size: 11px;
    }

    .outstanding-badge {
      background: #fef3c7;
      color: #92400e;
      padding: 3px 10px;
      border-radius: 4px;
      font-weight: bold;
    }

    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      border: 1px solid #e9ecef;
    }

    .invoice-table th {
      background: #FFD580;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 2px solid #ddd;
      font-weight: bold;
      color: #333;
      font-size: 10px;
    }

    .invoice-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #f0f0f0;
    }

    .invoice-row {
      background: white;
    }

    .invoice-row:hover {
      background: #f8f9fa;
    }

    .invoice-number {
      font-weight: bold;
      color: #333;
    }

    .payment-details-row {
      background: #f8f9fa;
    }

    .payment-details {
      padding: 8px 12px !important;
      border-bottom: 1px solid #e9ecef !important;
    }

    .payment-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .payment-item {
      font-size: 9px;
      color: #16a34a;
      padding-left: 8px;
    }

    .no-payments-cell {
      text-align: center;
      color: #999;
      font-style: italic;
      padding: 6px !important;
    }
  </style>
</head>
<body onload="window.print()">
  ${getPrintHeader('Outstanding Invoices Report', `Financial Year: ${format(fyStart, 'dd MMM yyyy')} to ${format(fyEnd, 'dd MMM yyyy')}`)}

  <div class="report-period">
    <strong>Report Period:</strong> ${format(parseLocalDate(startDate), 'dd MMMM yyyy')} to ${format(parseLocalDate(endDate), 'dd MMMM yyyy')} •
    <strong>Customers:</strong> ${customerData.length} •
    <strong>Total Invoices:</strong> ${totalInvoices}
  </div>

  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <div class="stat-value">${customerData.length}</div>
      <div class="stat-label">Customers</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalInvoices}</div>
      <div class="stat-label">Unpaid Invoices</div>
    </div>
    <div class="stat-card" style="background: #fef3c7; border-color: #fcd34d;">
      <div class="stat-value" style="color: #92400e;">${formatCurrency(totalOutstanding)}</div>
      <div class="stat-label">Total Outstanding</div>
    </div>
  </div>

  ${customersHTML}

  ${getPrintFooter()}
</body>
</html>
`
}

function generateEmptyReportHTML(
  startDate: string,
  endDate: string,
  fyStart: Date,
  fyEnd: Date
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outstanding Invoices Report - No Data</title>
  <style>
    ${getCommonPrintStyles()}

    .no-data {
      text-align: center;
      padding: 60px 20px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin: 40px 0;
    }

    .no-data h3 {
      color: #666;
      font-size: 18px;
      margin-bottom: 10px;
    }

    .no-data p {
      color: #999;
      font-size: 13px;
    }
  </style>
</head>
<body onload="window.print()">
  ${getPrintHeader('Outstanding Invoices Report', `Financial Year: ${format(fyStart, 'dd MMM yyyy')} to ${format(fyEnd, 'dd MMM yyyy')}`)}

  <div class="report-period">
    <strong>Report Period:</strong> ${format(parseLocalDate(startDate), 'dd MMMM yyyy')} to ${format(parseLocalDate(endDate), 'dd MMMM yyyy')}
  </div>

  <div class="no-data">
    <h3>No Outstanding Invoices Found</h3>
    <p>All selected customers have either fully paid invoices (status: Paid/Completed) or no invoices in this financial year.</p>
  </div>

  ${getPrintFooter()}
</body>
</html>
`
}

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

    .report-period {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 20px;
      font-size: 11px;
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
