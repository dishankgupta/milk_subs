import { NextRequest, NextResponse } from 'next/server'
import { getCustomerOutstanding } from '@/lib/actions/outstanding'
import { getCustomerPayments } from '@/lib/actions/payments'
import { formatCurrency } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ customer_id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.customer_id
    
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const data = await getCustomerOutstanding(customerId)
    const recentPayments = await getCustomerPayments(customerId)
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Outstanding Statement</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .company-tagline {
              font-size: 14px;
              color: #666;
            }
            .customer-info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .customer-info h2 {
              margin-top: 0;
              color: #1e40af;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              margin-top: 15px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-weight: bold;
              color: #374151;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 4px;
            }
            .info-value {
              color: #111827;
              font-size: 14px;
            }
            .outstanding-summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            @media print {
              .outstanding-summary {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
              }
            }
            .summary-card {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 16px;
              text-align: center;
              min-height: 90px;
              display: flex;
              flex-direction: column;
              justify-content: center;
            }
            .summary-card.total {
              background: #fef2f2;
              border-color: #fca5a5;
            }
            .summary-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 8px;
            }
            .summary-amount {
              font-size: 20px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 4px;
            }
            .summary-card.total .summary-amount {
              color: #dc2626;
            }
            .invoices-section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 15px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              font-size: 13px;
            }
            th, td {
              padding: 12px 8px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
            }
            th {
              background: #f8fafc;
              font-weight: bold;
              color: #374151;
              text-transform: uppercase;
              font-size: 11px;
            }
            tr:hover {
              background: #f9fafb;
            }
            .amount {
              text-align: right;
              font-weight: 500;
            }
            .overdue {
              color: #dc2626;
              font-weight: bold;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .status-overdue {
              background: #fee2e2;
              color: #991b1b;
            }
            .status-sent {
              background: #e0e7ff;
              color: #3730a3;
            }
            .status-partially-paid {
              background: #fef3c7;
              color: #92400e;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
            }
            .no-invoices {
              text-align: center;
              padding: 40px;
              color: #6b7280;
              font-style: italic;
            }
            .text-xs {
              font-size: 11px;
            }
            .text-gray-500 {
              color: #6b7280;
            }
            .text-white {
              color: white;
            }
            .mt-1 {
              margin-top: 4px;
            }
            .opacity-80 {
              opacity: 0.8;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .outstanding-summary {
                page-break-inside: avoid;
              }
              .invoices-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">PureDairy</div>
            <div class="company-tagline">Fresh • Pure • Natural</div>
          </div>

          <div class="customer-info">
            <h2>Customer Outstanding Statement</h2>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Customer Name</div>
                <div class="info-value">${data.customer.billing_name}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Contact Person</div>
                <div class="info-value">${data.customer.contact_person}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Phone</div>
                <div class="info-value">${data.customer.phone_primary}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Route</div>
                <div class="info-value">${data.customer.routes?.name || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div class="outstanding-summary">
            <div class="summary-card">
              <div class="summary-title">Opening Balance</div>
              <div class="summary-amount">${formatCurrency(data.openingBalance)}</div>
              <div class="text-xs text-gray-500 mt-1">Historical outstanding</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Invoice Outstanding</div>
              <div class="summary-amount">${formatCurrency(data.invoiceOutstanding)}</div>
              <div class="text-xs text-gray-500 mt-1">${data.unpaidInvoices.length} unpaid invoices</div>
            </div>
            <div class="summary-card total">
              <div class="summary-title">Total Outstanding</div>
              <div class="summary-amount">${formatCurrency(data.totalOutstanding)}</div>
              <div class="text-xs text-white mt-1 opacity-80">Amount to be collected</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Recent Payments</div>
              <div class="summary-amount">${formatCurrency(recentPayments.slice(0, 10).reduce((sum, p) => sum + p.amount, 0))}</div>
              <div class="text-xs text-gray-500 mt-1">Last ${Math.min(recentPayments.length, 10)} payments</div>
            </div>
          </div>

          <div class="invoices-section">
            <div class="section-title">Unpaid Invoices (${data.unpaidInvoices.length})</div>
            ${data.unpaidInvoices.length === 0 ? `
              <div class="no-invoices">
                No unpaid invoices found
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th>Invoice Number</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Total Amount</th>
                    <th>Paid Amount</th>
                    <th>Outstanding</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.unpaidInvoices.map((invoice) => {
                    const isOverdue = new Date(invoice.due_date) < new Date()
                    const statusClass = invoice.invoice_status === 'overdue' 
                      ? 'status-overdue' 
                      : invoice.invoice_status === 'partially_paid'
                      ? 'status-partially-paid'
                      : 'status-sent'
                    
                    return `
                      <tr>
                        <td>${invoice.invoice_number}</td>
                        <td>${new Date(invoice.invoice_date).toLocaleDateString()}</td>
                        <td ${isOverdue ? 'class="overdue"' : ''}>
                          ${new Date(invoice.due_date).toLocaleDateString()}
                        </td>
                        <td class="amount">${formatCurrency(invoice.total_amount)}</td>
                        <td class="amount">${formatCurrency(invoice.amount_paid)}</td>
                        <td class="amount overdue">${formatCurrency(invoice.amount_outstanding)}</td>
                        <td>
                          <span class="status-badge ${statusClass}">
                            ${invoice.invoice_status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>

          {/* Payment History Section */}
          <div class="invoices-section">
            <div class="section-title">Recent Payment History (Last 10 Payments)</div>
            ${recentPayments.length === 0 ? `
              <div class="no-invoices">
                No payment history found
              </div>
            ` : `
              <table>
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Period</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentPayments.slice(0, 10).map((payment) => {
                    return `
                      <tr>
                        <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                        <td class="amount">${formatCurrency(payment.amount)}</td>
                        <td>${payment.payment_method || 'N/A'}</td>
                        <td>${payment.period_start && payment.period_end ? `${new Date(payment.period_start).toLocaleDateString()} - ${new Date(payment.period_end).toLocaleDateString()}` : 'N/A'}</td>
                        <td>${payment.notes || '-'}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            `}
          </div>

          <div class="footer">
            <p>Statement generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            <p>PureDairy - Customer Outstanding Statement</p>
          </div>

          <script>
            // Auto-print when the page loads
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating customer statement:', error)
    return NextResponse.json(
      { error: 'Failed to generate customer statement' },
      { status: 500 }
    )
  }
}