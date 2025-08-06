import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { getRouteDeliveryReport } from '@/lib/actions/reports'
import { formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
    const routeId = searchParams.get('route')
    const timeSlot = searchParams.get('time_slot') as 'Morning' | 'Evening'
    
    if (!routeId || !timeSlot) {
      return new Response('Missing required parameters: route and time_slot', { status: 400 })
    }
    
    const result = await getRouteDeliveryReport(date, routeId, timeSlot)
    
    if (!result.success) {
      return new Response('Failed to fetch delivery data', { status: 500 })
    }

    const report = result.data!
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Route Delivery - ${report.routeName} ${report.deliveryTime} - ${format(new Date(date), 'PPP')}</title>
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
    
    .delivery-summary {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      text-align: center;
    }
    
    .summary-item h3 {
      font-size: 10px;
      color: #666;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .summary-item .value {
      font-size: 16px;
      font-weight: bold;
      color: #22c55e;
    }
    
    .orders-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
    }
    
    .orders-table th,
    .orders-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 10px;
    }
    
    .orders-table th {
      background: #22c55e;
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9px;
    }
    
    .orders-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .orders-table tr:hover {
      background: #e9ecef;
    }
    
    .customer-name {
      font-weight: bold;
      color: #333;
    }
    
    .contact-info {
      font-size: 9px;
      color: #666;
      margin-top: 2px;
    }
    
    .address {
      font-size: 9px;
      color: #666;
      max-width: 120px;
      word-wrap: break-word;
    }
    
    .phone {
      font-weight: bold;
      color: #22c55e;
    }
    
    .quantity {
      font-weight: bold;
      text-align: center;
    }
    
    .amount {
      font-weight: bold;
      text-align: right;
      color: #22c55e;
    }
    
    .product-summary {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 15px;
      margin-bottom: 20px;
    }
    
    .product-summary h3 {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 3px;
    }
    
    .product-breakdown {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }
    
    .product-item {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
    }
    
    .product-item .name {
      font-weight: bold;
      margin-bottom: 5px;
      color: #333;
    }
    
    .product-item .stats {
      font-size: 9px;
      color: #666;
      margin-bottom: 3px;
    }
    
    .product-item .value {
      font-weight: bold;
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
      .orders-table { break-inside: avoid; }
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
      <h2>${report.routeName} - ${report.deliveryTime} Delivery</h2>
      <p>Delivery Date: ${format(new Date(date), 'PPPP')}</p>
      <p>Generated: ${format(new Date(), 'PPP p')}</p>
      <p>Page 1</p>
    </div>
  </div>

  ${report.orders.length === 0 ? `
  <div class="no-data">
    <h3>No deliveries scheduled</h3>
    <p>No orders found for ${report.routeName} ${report.deliveryTime} delivery on ${format(new Date(date), 'PPP')}.</p>
  </div>
  ` : `
  <!-- Delivery Summary -->
  <div class="delivery-summary">
    <div class="summary-item">
      <h3>Total Orders</h3>
      <div class="value">${report.summary.totalOrders}</div>
    </div>
    <div class="summary-item">
      <h3>Total Quantity</h3>
      <div class="value">${report.summary.totalQuantity}L</div>
    </div>
    <div class="summary-item">
      <h3>Total Value</h3>
      <div class="value">${formatCurrency(report.summary.totalValue)}</div>
    </div>
    <div class="summary-item">
      <h3>Avg per Order</h3>
      <div class="value">${formatCurrency(report.summary.totalValue / report.summary.totalOrders)}</div>
    </div>
  </div>

  <!-- Product Summary -->
  ${Object.keys(report.summary.productBreakdown).length > 0 ? `
  <div class="product-summary">
    <h3>Product Summary</h3>
    <div class="product-breakdown">
      ${Object.entries(report.summary.productBreakdown).map(([code, data]) => `
      <div class="product-item">
        <div class="name">${data.name}</div>
        <div class="stats">${data.quantity}L total</div>
        <div class="value">${formatCurrency(data.value)}</div>
      </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Orders Table -->
  <table class="orders-table">
    <thead>
      <tr>
        <th style="width: 25%;">Customer Details</th>
        <th style="width: 30%;">Address</th>
        <th style="width: 12%;">Phone</th>
        <th style="width: 15%;">Product</th>
        <th style="width: 8%;">Qty</th>
        <th style="width: 10%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${report.orders.map((order, index) => `
      <tr>
        <td>
          <div class="customer-name">${order.customerName}</div>
          ${order.contactPerson ? `<div class="contact-info">Contact: ${order.contactPerson}</div>` : ''}
        </td>
        <td>
          <div class="address">${order.address || 'Address not provided'}</div>
        </td>
        <td>
          <div class="phone">${order.phone || 'Not provided'}</div>
        </td>
        <td>${order.productName}</td>
        <td class="quantity">${order.quantity}L</td>
        <td class="amount">${formatCurrency(order.totalAmount)}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  `}

  <!-- Footer -->
  <div class="footer">
    <div>PureDairy - ${report.routeName} ${report.deliveryTime} Delivery List | Generated on ${format(new Date(), 'PPP')}</div>
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
    console.error('Error generating route delivery print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}