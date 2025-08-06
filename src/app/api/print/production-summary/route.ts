import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { getDailyProductionSummary } from '@/lib/actions/reports'
import { formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    
    const result = await getDailyProductionSummary(date)
    
    if (!result.success) {
      return new Response('Failed to fetch production data', { status: 500 })
    }

    const summary = result.data!
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Production Summary - ${format(new Date(date), 'PPP')}</title>
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
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    
    .stat-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      text-align: center;
    }
    
    .stat-card h3 {
      font-size: 11px;
      color: #666;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stat-card .value {
      font-size: 18px;
      font-weight: bold;
      color: #333;
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
    }
    
    .value-badge {
      display: inline-block;
      background: #FFD580;
      color: #333;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: bold;
    }
    
    .time-slot-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    
    .time-slot {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 15px;
    }
    
    .time-slot h4 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
    }
    
    .time-slot-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    
    .time-slot-stat {
      text-align: center;
    }
    
    .time-slot-stat .label {
      font-size: 9px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    
    .time-slot-stat .value {
      font-size: 11px;
      font-weight: bold;
      color: #333;
    }
    
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body { print-color-adjust: exact; }
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
      <h2>Daily Production Summary</h2>
      <p>Report Date: ${format(new Date(date), 'PPPP')}</p>
    </div>
  </div>

  ${summary.totalOrders === 0 ? `
  <div class="no-data">
    <h3>No orders found for ${format(new Date(date), 'PPP')}</h3>
    <p>No production data available for the selected date.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Orders</h3>
      <div class="value">${summary.totalOrders}</div>
    </div>
    <div class="stat-card">
      <h3>Total Value</h3>
      <div class="value">${formatCurrency(summary.totalValue)}</div>
    </div>
    <div class="stat-card">
      <h3>Average Order</h3>
      <div class="value">${formatCurrency(summary.totalValue / summary.totalOrders)}</div>
    </div>
  </div>

  <!-- Product & Route Breakdown -->
  <div class="section">
    <div class="section-title">Product & Route Analysis</div>
    <div class="breakdown-grid">
      <div class="breakdown-item">
        <h4>Product Breakdown</h4>
        ${Object.entries(summary.productBreakdown).map(([code, data]) => `
        <div class="breakdown-details">
          <div><strong>${data.name}</strong></div>
          <div>${data.orderCount} orders • ${data.totalQuantity}L</div>
          <div>Value: <span class="value-badge">${formatCurrency(data.totalValue)}</span></div>
        </div>
        <br>
        `).join('')}
      </div>
      
      <div class="breakdown-item">
        <h4>Route Breakdown</h4>
        ${Object.entries(summary.routeBreakdown).map(([routeId, data]) => `
        <div class="breakdown-details">
          <div><strong>${data.name}</strong></div>
          <div>Morning: ${data.morningOrders} • Evening: ${data.eveningOrders}</div>
          <div>Total: ${data.totalQuantity}L • ${data.morningOrders + data.eveningOrders} orders</div>
          <div>Value: <span class="value-badge">${formatCurrency(data.totalValue)}</span></div>
        </div>
        <br>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Time Slot Summary -->
  <div class="section">
    <div class="section-title">Time Slot Distribution</div>
    <div class="time-slot-grid">
      <div class="time-slot">
        <h4>Morning Delivery</h4>
        <div class="time-slot-stats">
          <div class="time-slot-stat">
            <div class="label">Orders</div>
            <div class="value">${summary.timeSlotBreakdown.morning.orders}</div>
          </div>
          <div class="time-slot-stat">
            <div class="label">Quantity</div>
            <div class="value">${summary.timeSlotBreakdown.morning.quantity}L</div>
          </div>
          <div class="time-slot-stat">
            <div class="label">Value</div>
            <div class="value">${formatCurrency(summary.timeSlotBreakdown.morning.value)}</div>
          </div>
        </div>
      </div>
      
      <div class="time-slot">
        <h4>Evening Delivery</h4>
        <div class="time-slot-stats">
          <div class="time-slot-stat">
            <div class="label">Orders</div>
            <div class="value">${summary.timeSlotBreakdown.evening.orders}</div>
          </div>
          <div class="time-slot-stat">
            <div class="label">Quantity</div>
            <div class="value">${summary.timeSlotBreakdown.evening.quantity}L</div>
          </div>
          <div class="time-slot-stat">
            <div class="label">Value</div>
            <div class="value">${formatCurrency(summary.timeSlotBreakdown.evening.value)}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
    console.error('Error generating production summary print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}