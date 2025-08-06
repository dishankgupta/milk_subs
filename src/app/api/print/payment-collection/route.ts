import { NextRequest } from 'next/server'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date') 
    const endDate = searchParams.get('end_date')
    
    // Default to current month if no dates provided
    const today = new Date()
    const defaultStart = startOfMonth(today)
    const defaultEnd = endOfMonth(today)
    
    const start = startDate ? parseISO(startDate) : defaultStart
    const end = endDate ? parseISO(endDate) : defaultEnd
    
    const supabase = await createClient()
    
    // Get payments in the date range
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        *,
        customer:customers(billing_name, contact_person, phone_primary)
      `)
      .gte('payment_date', format(start, 'yyyy-MM-dd'))
      .lte('payment_date', format(end, 'yyyy-MM-dd'))
      .order('payment_date', { ascending: false })

    if (paymentsError) {
      throw paymentsError
    }

    // Get payment statistics
    const { data: stats } = await supabase
      .from('payments')
      .select('amount, payment_method')
      .gte('payment_date', format(start, 'yyyy-MM-dd'))
      .lte('payment_date', format(end, 'yyyy-MM-dd'))

    // Calculate stats
    const totalPayments = payments?.length || 0
    const totalAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0
    const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0
    
    // Payment method breakdown
    const methodBreakdown: { [key: string]: { count: number; amount: number } } = {}
    payments?.forEach(payment => {
      const method = payment.payment_method || 'Not specified'
      if (!methodBreakdown[method]) {
        methodBreakdown[method] = { count: 0, amount: 0 }
      }
      methodBreakdown[method].count++
      methodBreakdown[method].amount += payment.amount
    })

    // Daily breakdown
    const dailyBreakdown: { [key: string]: { count: number; amount: number } } = {}
    payments?.forEach(payment => {
      const date = payment.payment_date
      if (!dailyBreakdown[date]) {
        dailyBreakdown[date] = { count: 0, amount: 0 }
      }
      dailyBreakdown[date].count++
      dailyBreakdown[date].amount += payment.amount
    })
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Collection Report - ${format(start, 'MMM yyyy')} to ${format(end, 'MMM yyyy')}</title>
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
      color: #22c55e;
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
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    
    .stat-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
    }
    
    .stat-card h3 {
      font-size: 10px;
      color: #666;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-card .value {
      font-size: 16px;
      font-weight: bold;
      color: #22c55e;
    }
    
    .section {
      margin-bottom: 25px;
      break-inside: avoid;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 3px;
    }
    
    .breakdown-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .breakdown-item {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 12px;
    }
    
    .breakdown-item h4 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
    }
    
    .breakdown-details {
      font-size: 10px;
      color: #666;
      line-height: 1.5;
    }
    
    .breakdown-details div {
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .value-badge {
      background: #22c55e;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    
    .payments-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      border: 1px solid #e9ecef;
    }
    
    .payments-table th,
    .payments-table td {
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 9px;
    }
    
    .payments-table th {
      background: #22c55e;
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .payments-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .customer-name {
      font-weight: bold;
      color: #333;
    }
    
    .amount {
      font-weight: bold;
      text-align: right;
      color: #22c55e;
    }
    
    .footer {
      position: fixed;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      text-align: center;
      font-size: 9px;
      color: #666;
      border-top: 1px solid #e9ecef;
      padding-top: 5px;
    }
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body { print-color-adjust: exact; }
      .payments-table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="logo-section">
      <img src="/PureDairy_Logo-removebg-preview.png" alt="PureDairy" class="logo">
      <div class="company-info">
        <h1>PureDairy</h1>
        <p>Premium Dairy Products</p>
      </div>
    </div>
    <div class="report-info">
      <h2>Payment Collection Report</h2>
      <p>Period: ${format(start, 'PPP')} to ${format(end, 'PPP')}</p>
      <p>Generated: ${format(new Date(), 'PPP p')}</p>
      <p>Page 1</p>
    </div>
  </div>

  ${totalPayments === 0 ? `
  <div class="no-data">
    <h3>No payments found</h3>
    <p>No payment records available for the selected period.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Payments</h3>
      <div class="value">${totalPayments}</div>
    </div>
    <div class="stat-card">
      <h3>Total Amount</h3>
      <div class="value">${formatCurrency(totalAmount)}</div>
    </div>
    <div class="stat-card">
      <h3>Average Payment</h3>
      <div class="value">${formatCurrency(averagePayment)}</div>
    </div>
    <div class="stat-card">
      <h3>Collection Days</h3>
      <div class="value">${Object.keys(dailyBreakdown).length}</div>
    </div>
  </div>

  <!-- Breakdown Analysis -->
  <div class="section">
    <div class="section-title">Payment Analysis</div>
    <div class="breakdown-grid">
      <div class="breakdown-item">
        <h4>Payment Methods</h4>
        <div class="breakdown-details">
          ${Object.entries(methodBreakdown).map(([method, data]) => `
          <div>
            <span><strong>${method}</strong></span>
            <span class="value-badge">${data.count} (${formatCurrency(data.amount)})</span>
          </div>
          `).join('')}
        </div>
      </div>
      
      <div class="breakdown-item">
        <h4>Daily Collection Summary</h4>
        <div class="breakdown-details">
          ${Object.entries(dailyBreakdown)
            .sort(([a], [b]) => b.localeCompare(a))
            .slice(0, 10)
            .map(([date, data]) => `
          <div>
            <span>${format(parseISO(date), 'MMM dd')}</span>
            <span class="value-badge">${data.count} (${formatCurrency(data.amount)})</span>
          </div>
          `).join('')}
          ${Object.keys(dailyBreakdown).length > 10 ? '<div><em>... and more</em></div>' : ''}
        </div>
      </div>
    </div>
  </div>

  <!-- Recent Payments Table -->
  <div class="section">
    <div class="section-title">Payment Records</div>
    <table class="payments-table">
      <thead>
        <tr>
          <th style="width: 12%;">Date</th>
          <th style="width: 25%;">Customer</th>
          <th style="width: 15%;">Contact</th>
          <th style="width: 15%;">Method</th>
          <th style="width: 12%;">Amount</th>
          <th style="width: 21%;">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${payments?.slice(0, 25).map(payment => `
        <tr>
          <td>${format(parseISO(payment.payment_date), 'MMM dd')}</td>
          <td class="customer-name">${payment.customer?.billing_name || 'Unknown'}</td>
          <td>${payment.customer?.phone_primary || 'N/A'}</td>
          <td>${payment.payment_method || 'N/A'}</td>
          <td class="amount">${formatCurrency(payment.amount)}</td>
          <td>${payment.notes || '-'}</td>
        </tr>
        `).join('') || ''}
        ${(payments?.length || 0) > 25 ? `
        <tr>
          <td colspan="6" style="text-align: center; font-style: italic; padding: 8px;">
            ... and ${(payments?.length || 0) - 25} more payments
          </td>
        </tr>
        ` : ''}
      </tbody>
    </table>
  </div>
  `}

  <!-- Footer -->
  <div class="footer">
    <div>PureDairy - Payment Collection Report | Generated on ${format(new Date(), 'PPP')}</div>
  </div>

  <script>
    // Auto-trigger print dialog after 1000ms delay
    setTimeout(() => {
      window.print();
    }, 1000);
  </script>
</body>
</html>
    `
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
    
  } catch (error) {
    console.error('Error generating payment collection print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}