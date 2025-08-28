import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { getRouteDeliveryReport } from '@/lib/actions/reports'
import { formatCurrency } from '@/lib/utils'
import { formatDateForDatabase, getCurrentISTDate } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || formatDateForDatabase(getCurrentISTDate())
    const routeId = searchParams.get('route')
    const timeSlot = searchParams.get('time_slot') as 'Morning' | 'Evening'
    const sortKey = searchParams.get('sort_key') || 'customerName'
    const sortDirection = searchParams.get('sort_direction') as 'asc' | 'desc' || 'asc'
    
    if (!routeId || !timeSlot) {
      return new Response('Missing required parameters: route and time_slot', { status: 400 })
    }
    
    const result = await getRouteDeliveryReport(date, routeId, timeSlot)
    
    if (!result.success) {
      return new Response('Failed to fetch delivery data', { status: 500 })
    }

    const report = result.data!
    
    // Apply sorting to the orders
    if (report.orders && report.orders.length > 0) {
      report.orders.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number
        
        switch (sortKey) {
          case 'customerName':
            aValue = a.customerName
            bValue = b.customerName
            break
          case 'productName':
            aValue = a.productName
            bValue = b.productName
            break
          case 'quantity':
            aValue = a.quantity
            bValue = b.quantity
            break
          case 'totalAmount':
            aValue = a.totalAmount
            bValue = b.totalAmount
            break
          default:
            aValue = a.customerName
            bValue = b.customerName
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue)
          return sortDirection === 'asc' ? comparison : -comparison
        }
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
        }
        
        return 0
      })
    }
    
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
      color: #333;
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
      background: #FFD580;
      color: #333;
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
      color: #333;
    }
    
    .quantity {
      font-weight: bold;
      text-align: center;
    }
    
    .amount {
      font-weight: bold;
      text-align: right;
      color: #333;
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
      color: #333;
    }
    
    .modification-indicator {
      font-size: 8px;
      color: #666;
      font-style: italic;
      margin-top: 2px;
    }
    
    .base-quantity {
      text-decoration: line-through;
      color: #999;
      font-size: 9px;
      margin-right: 5px;
    }
    
    .modified-row {
      background-color: #fffbeb !important;
    }
    
    .skipped-row {
      background-color: #fef2f2 !important;
      opacity: 0.8;
    }
    
    .skipped-row .customer-name,
    .skipped-row .quantity,
    .skipped-row .amount {
      text-decoration: line-through;
      color: #999 !important;
    }
    
    .skip-indicator {
      display: inline-block;
      background-color: #dc2626;
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 8px;
      font-weight: bold;
      margin-left: 5px;
    }
    
    .modification-icon {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      font-size: 8px;
      line-height: 12px;
      text-align: center;
      margin-right: 3px;
      color: white;
      font-weight: bold;
    }
    
    .mod-skip { background-color: #dc2626; }
    .mod-increase { background-color: #059669; }
    .mod-decrease { background-color: #ea580c; }
    
    .modification-details {
      margin-bottom: 15px;
    }
    
    .modification-detail-item {
      page-break-inside: avoid;
      break-inside: avoid;
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
        <p>Surety of Purity</p>
      </div>
    </div>
    <div class="report-info">
      <h2>${report.routeName} - ${report.deliveryTime} Delivery</h2>
      <p>Delivery Date: ${format(new Date(date), 'PPPP')}</p>
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
      <h3>Modified Orders</h3>
      <div class="value">${report.summary.modifiedOrders}</div>
    </div>
  </div>

  ${report.summary.modifiedOrders > 0 ? `
  <!-- Detailed Modification Summary -->
  <div class="product-summary">
    <h3>Modification Details</h3>
    <div class="modification-details">
      ${report.orders.filter(order => order.isModified).map(order => `
        <div class="modification-detail-item" style="background: ${order.isSkipped ? '#fee2e2' : '#fffbeb'}; border: 1px solid ${order.isSkipped ? '#fecaca' : '#fed7aa'}; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: #333; font-size: 10px;">${order.customerName}</strong>
            <span style="font-size: 9px; color: #666;">${order.productName}</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${order.appliedModifications.map(mod => `
              <div style="display: flex; align-items: center; gap: 4px;">
                <span class="modification-icon mod-${mod.type.toLowerCase()}">
                  ${mod.type === 'Skip' ? '−' : mod.type === 'Increase' ? '+' : '↓'}
                </span>
                <span style="font-size: 9px; color: #333;">
                  <strong>${mod.type}</strong>
                  ${mod.quantityChange ? ` (${mod.quantityChange > 0 ? '+' : ''}${mod.quantityChange}L)` : ''}
                </span>
              </div>
              ${mod.reason ? `
                <div style="font-size: 8px; color: #666; font-style: italic; width: 100%; margin-top: 2px;">
                  Reason: ${mod.reason}
                </div>
              ` : ''}
            `).join('')}
          </div>
          <div style="font-size: 9px; color: #666; margin-top: 4px;">
            ${order.baseQuantity ? `Base: ${order.baseQuantity}L → ` : ''}Final: <strong>${order.quantity}L</strong>
          </div>
        </div>
      `).join('')}
    </div>
    
    <!-- Summary counts -->
    <div class="product-breakdown" style="margin-top: 15px;">
      ${report.summary.modificationSummary.skip > 0 ? `
      <div class="product-item" style="background: #fee2e2;">
        <div class="name" style="color: #dc2626;">Total Skipped</div>
        <div class="value" style="color: #dc2626;">${report.summary.modificationSummary.skip}</div>
      </div>
      ` : ''}
      ${report.summary.modificationSummary.increase > 0 ? `
      <div class="product-item" style="background: #dcfce7;">
        <div class="name" style="color: #059669;">Total Increased</div>
        <div class="value" style="color: #059669;">${report.summary.modificationSummary.increase}</div>
      </div>
      ` : ''}
      ${report.summary.modificationSummary.decrease > 0 ? `
      <div class="product-item" style="background: #fed7aa;">
        <div class="name" style="color: #ea580c;">Total Decreased</div>
        <div class="value" style="color: #ea580c;">${report.summary.modificationSummary.decrease}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

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
        <th style="width: 22%;">Customer Details</th>
        <th style="width: 26%;">Address</th>
        <th style="width: 12%;">Phone</th>
        <th style="width: 13%;">Product</th>
        <th style="width: 10%;">Qty</th>
        <th style="width: 9%;">Amount</th>
        <th style="width: 8%;">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${report.orders.map((order, index) => `
      <tr ${order.isSkipped ? 'class="skipped-row"' : order.isModified ? 'class="modified-row"' : ''}>
        <td>
          <div class="customer-name">
            ${order.customerName}
            ${order.isSkipped ? '<span class="skip-indicator">SKIP</span>' : ''}
          </div>
          ${order.contactPerson ? `<div class="contact-info">Contact: ${order.contactPerson}</div>` : ''}
        </td>
        <td>
          <div class="address">${order.address || 'Address not provided'}</div>
        </td>
        <td>
          <div class="phone">${order.phone || 'Not provided'}</div>
        </td>
        <td>
          ${order.productName}
          ${order.isSkipped ? '<div style="color: #dc2626; font-size: 9px; font-weight: bold; margin-top: 2px;">DELIVERY SKIPPED</div>' : ''}
        </td>
        <td class="quantity">
          ${order.isModified && order.baseQuantity && !order.isSkipped ? `<span class="base-quantity">${order.baseQuantity}L</span>` : ''}
          <strong>${order.isSkipped ? '0L' : `${order.quantity}L`}</strong>
        </td>
        <td class="amount">${order.isSkipped ? '₹0.00' : formatCurrency(order.totalAmount)}</td>
        <td style="font-size: 8px;">
          ${order.isModified && order.appliedModifications.length > 0 ? 
            order.appliedModifications.map(mod => `
              <div style="margin-bottom: 2px;">
                <span class="modification-icon mod-${mod.type.toLowerCase()}">
                  ${mod.type === 'Skip' ? '−' : mod.type === 'Increase' ? '+' : '↓'}
                </span>
                ${mod.type}${mod.quantityChange ? ` (${mod.quantityChange > 0 ? '+' : ''}${mod.quantityChange}L)` : ''}
                ${mod.reason ? `<br><em>${mod.reason}</em>` : ''}
              </div>
            `).join('') : 
            '—'
          }
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>
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
        'Content-Type': 'text/html; charset=UTF-8',
      },
    })
    
  } catch (error) {
    console.error('Error generating route delivery print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}