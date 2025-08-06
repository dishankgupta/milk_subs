import { NextRequest } from 'next/server'
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { getDeliveryPerformanceReport } from '@/lib/actions/reports'
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
    
    const start = startDate || format(defaultStart, 'yyyy-MM-dd')
    const end = endDate || format(defaultEnd, 'yyyy-MM-dd')
    
    const result = await getDeliveryPerformanceReport(start, end)
    
    if (!result.success) {
      return new Response('Failed to fetch delivery performance data', { status: 500 })
    }

    const report = result.data!
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Performance Report - ${format(parseISO(start), 'MMM yyyy')} to ${format(parseISO(end), 'MMM yyyy')}</title>
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
      color: #333;
    }
    
    .stat-card .percentage {
      font-size: 14px;
      font-weight: bold;
    }
    
    .stat-card .percentage.good { color: #333; }
    .stat-card .percentage.warning { color: #ea580c; }
    .stat-card .percentage.danger { color: #dc2626; }
    
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
    
    .performance-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
    }
    
    .performance-table th,
    .performance-table td {
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 9px;
    }
    
    .performance-table th {
      background: #FFD580;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .performance-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .performance-table .number {
      text-align: center;
    }
    
    .performance-table .amount {
      text-align: right;
      font-weight: bold;
    }
    
    .variance-positive { color: #333; }
    .variance-negative { color: #dc2626; }
    .variance-neutral { color: #666; }
    
    .completion-rate {
      font-weight: bold;
    }
    .completion-rate.excellent { color: #333; }
    .completion-rate.good { color: #65a30d; }
    .completion-rate.warning { color: #ea580c; }
    .completion-rate.poor { color: #dc2626; }
    
    .grid-two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body { print-color-adjust: exact; }
      .performance-table { break-inside: avoid; }
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
        <p>Surety of Purity</p>
      </div>
    </div>
    <div class="report-info">
      <h2>Delivery Performance Report</h2>
      <p>Period: ${format(parseISO(start), 'PPP')} to ${format(parseISO(end), 'PPP')}</p>
    </div>
  </div>

  ${report.summary.totalOrders === 0 ? `
  <div class="no-data">
    <h3>No delivery data found</h3>
    <p>No delivery records available for the selected period.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Orders</h3>
      <div class="value">${report.summary.totalOrders}</div>
    </div>
    <div class="stat-card">
      <h3>Delivered Orders</h3>
      <div class="value">${report.summary.deliveredOrders}</div>
    </div>
    <div class="stat-card">
      <h3>Completion Rate</h3>
      <div class="percentage ${report.summary.completionRate >= 95 ? 'good' : report.summary.completionRate >= 85 ? 'warning' : 'danger'}">${report.summary.completionRate}%</div>
    </div>
    <div class="stat-card">
      <h3>Quantity Variance</h3>
      <div class="value ${report.summary.quantityVariance > 0 ? 'variance-positive' : report.summary.quantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
        ${report.summary.quantityVariance > 0 ? '+' : ''}${report.summary.quantityVariance}L
      </div>
    </div>
  </div>

  <!-- Performance Overview -->
  <div class="section">
    <div class="section-title">Performance Overview</div>
    <div class="grid-two-columns">
      <div class="stat-card" style="text-align: left; padding: 15px;">
        <h4 style="font-size: 12px; margin-bottom: 8px; color: #333;">Quantity Analysis</h4>
        <div style="font-size: 10px; line-height: 1.6;">
          <div>Planned Quantity: <strong>${report.summary.totalPlannedQuantity}L</strong></div>
          <div>Actual Quantity: <strong>${report.summary.totalActualQuantity}L</strong></div>
          <div class="${report.summary.quantityVariance > 0 ? 'variance-positive' : report.summary.quantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            Variance: <strong>${report.summary.quantityVariance > 0 ? '+' : ''}${report.summary.quantityVariance}L</strong>
          </div>
        </div>
      </div>
      
      <div class="stat-card" style="text-align: left; padding: 15px;">
        <h4 style="font-size: 12px; margin-bottom: 8px; color: #333;">Value Analysis</h4>
        <div style="font-size: 10px; line-height: 1.6;">
          <div>Planned Value: <strong>${formatCurrency(report.summary.totalPlannedValue)}</strong></div>
          <div>Actual Value: <strong>${formatCurrency(report.summary.totalActualValue)}</strong></div>
          <div class="${report.summary.valueVariance > 0 ? 'variance-positive' : report.summary.valueVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            Variance: <strong>${report.summary.valueVariance > 0 ? '+' : ''}${formatCurrency(report.summary.valueVariance)}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  ${report.dailyBreakdown.length > 0 ? `
  <!-- Daily Performance Breakdown -->
  <div class="section">
    <div class="section-title">Daily Performance Breakdown</div>
    <table class="performance-table">
      <thead>
        <tr>
          <th style="width: 15%;">Date</th>
          <th style="width: 12%;">Orders</th>
          <th style="width: 12%;">Delivered</th>
          <th style="width: 15%;">Completion</th>
          <th style="width: 15%;">Planned Qty</th>
          <th style="width: 15%;">Actual Qty</th>
          <th style="width: 16%;">Variance</th>
        </tr>
      </thead>
      <tbody>
        ${report.dailyBreakdown.slice(0, 15).map(day => `
        <tr>
          <td>${format(parseISO(day.date), 'MMM dd')}</td>
          <td class="number">${day.orders}</td>
          <td class="number">${day.delivered}</td>
          <td class="completion-rate ${day.completionRate >= 95 ? 'excellent' : day.completionRate >= 85 ? 'good' : day.completionRate >= 70 ? 'warning' : 'poor'}">${day.completionRate}%</td>
          <td class="number">${day.plannedQuantity}L</td>
          <td class="number">${day.actualQuantity}L</td>
          <td class="number ${day.quantityVariance > 0 ? 'variance-positive' : day.quantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${day.quantityVariance > 0 ? '+' : ''}${day.quantityVariance}L
          </td>
        </tr>
        `).join('')}
        ${report.dailyBreakdown.length > 15 ? `
        <tr>
          <td colspan="7" style="text-align: center; font-style: italic; padding: 8px;">
            ... and ${report.dailyBreakdown.length - 15} more days
          </td>
        </tr>
        ` : ''}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${report.customerPerformance.length > 0 ? `
  <!-- Top Customer Performance -->
  <div class="section">
    <div class="section-title">Customer Performance Analysis (Top 15)</div>
    <table class="performance-table">
      <thead>
        <tr>
          <th style="width: 30%;">Customer</th>
          <th style="width: 12%;">Orders</th>
          <th style="width: 12%;">Delivered</th>
          <th style="width: 16%;">Completion</th>
          <th style="width: 15%;">Avg Variance</th>
          <th style="width: 15%;">Value Impact</th>
        </tr>
      </thead>
      <tbody>
        ${report.customerPerformance.slice(0, 15).map(customer => `
        <tr>
          <td>${customer.customerName}</td>
          <td class="number">${customer.totalOrders}</td>
          <td class="number">${customer.deliveredOrders}</td>
          <td class="completion-rate ${customer.completionRate >= 95 ? 'excellent' : customer.completionRate >= 85 ? 'good' : customer.completionRate >= 70 ? 'warning' : 'poor'}">${customer.completionRate}%</td>
          <td class="number ${customer.avgQuantityVariance > 0 ? 'variance-positive' : customer.avgQuantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${customer.avgQuantityVariance > 0 ? '+' : ''}${customer.avgQuantityVariance}L
          </td>
          <td class="amount ${customer.totalValueVariance > 0 ? 'variance-positive' : customer.totalValueVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${customer.totalValueVariance > 0 ? '+' : ''}${formatCurrency(customer.totalValueVariance)}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${report.productPerformance.length > 0 ? `
  <!-- Product Performance Analysis -->
  <div class="section">
    <div class="section-title">Product Performance Analysis</div>
    <table class="performance-table">
      <thead>
        <tr>
          <th style="width: 30%;">Product</th>
          <th style="width: 15%;">Total Orders</th>
          <th style="width: 15%;">Delivered</th>
          <th style="width: 20%;">Avg Variance</th>
          <th style="width: 20%;">Total Variance</th>
        </tr>
      </thead>
      <tbody>
        ${report.productPerformance.map(product => `
        <tr>
          <td>${product.productName}</td>
          <td class="number">${product.totalOrders}</td>
          <td class="number">${product.deliveredOrders}</td>
          <td class="number ${product.avgQuantityVariance > 0 ? 'variance-positive' : product.avgQuantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${product.avgQuantityVariance > 0 ? '+' : ''}${product.avgQuantityVariance}L
          </td>
          <td class="number ${product.totalQuantityVariance > 0 ? 'variance-positive' : product.totalQuantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${product.totalQuantityVariance > 0 ? '+' : ''}${product.totalQuantityVariance}L
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  `}


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
    console.error('Error generating delivery performance print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}