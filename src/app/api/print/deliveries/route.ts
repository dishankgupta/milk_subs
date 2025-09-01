import { NextRequest } from 'next/server'
import { getDeliveries } from '@/lib/actions/deliveries'
import { formatDateIST, getCurrentISTDate } from '@/lib/date-utils'
import type { Delivery, DailyOrder, Customer, Product, Route } from '@/lib/types'

type DeliveryWithOrder = Delivery & { 
  daily_order: DailyOrder & { 
    customer: Customer, 
    product: Product, 
    route: Route 
  } 
}

function calculateDeliveryStats(deliveries: DeliveryWithOrder[]) {
  const totalOrders = deliveries.length
  const deliveredOrders = deliveries.filter(d => d.actual_quantity !== null).length
  const pendingOrders = totalOrders - deliveredOrders
  
  const totalPlannedQuantity = deliveries.reduce((sum, d) => sum + d.daily_order.planned_quantity, 0)
  const totalActualQuantity = deliveries.reduce((sum, d) => sum + (d.actual_quantity || 0), 0)
  
  const completionRate = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0
  const quantityVariance = totalActualQuantity - totalPlannedQuantity

  return {
    totalOrders,
    deliveredOrders,
    pendingOrders,
    totalPlannedQuantity,
    totalActualQuantity,
    completionRate,
    quantityVariance
  }
}

function filterDeliveries(deliveries: DeliveryWithOrder[], searchQuery?: string, dateFilter?: string, routeFilter?: string) {
  return deliveries.filter(delivery => {
    const matchesSearch = !searchQuery || 
      delivery.delivery_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.delivery_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.daily_order.customer.billing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.daily_order.customer.contact_person.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDate = !dateFilter || 
      delivery.daily_order.order_date === dateFilter
    
    const matchesRoute = !routeFilter || 
      delivery.daily_order.route.name === routeFilter

    return matchesSearch && matchesDate && matchesRoute
  })
}

function sortDeliveries(deliveries: DeliveryWithOrder[], sortKey: string, sortDirection: 'asc' | 'desc') {
  const sorted = [...deliveries].sort((a, b) => {
    let aValue: string | number | Date
    let bValue: string | number | Date

    switch (sortKey) {
      case 'daily_order.customer.billing_name':
        aValue = a.daily_order.customer.billing_name
        bValue = b.daily_order.customer.billing_name
        break
      case 'daily_order.order_date':
        aValue = new Date(a.daily_order.order_date)
        bValue = new Date(b.daily_order.order_date)
        break
      case 'actual_quantity':
        aValue = a.actual_quantity || 0
        bValue = b.actual_quantity || 0
        break
      case 'delivered_at':
        aValue = a.delivered_at ? new Date(a.delivered_at) : new Date(0)
        bValue = b.delivered_at ? new Date(b.delivered_at) : new Date(0)
        break
      case 'variance':
        aValue = (a.actual_quantity || 0) - a.daily_order.planned_quantity
        bValue = (b.actual_quantity || 0) - b.daily_order.planned_quantity
        break
      default:
        aValue = a.daily_order.order_date
        bValue = b.daily_order.order_date
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return sorted
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || undefined
    const dateFilter = searchParams.get('date') || undefined
    const routeFilter = searchParams.get('route') || undefined
    const sortKey = searchParams.get('sortKey') || 'daily_order.order_date'
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc'
    
    // Fetch all deliveries
    const allDeliveries = await getDeliveries()
    
    // Apply filters
    const filteredDeliveries = filterDeliveries(allDeliveries, searchQuery, dateFilter, routeFilter)
    
    // Calculate stats
    const stats = calculateDeliveryStats(filteredDeliveries)
    
    // Apply sorting
    const sortedDeliveries = sortDeliveries(filteredDeliveries, sortKey, sortDirection)
    
    // Get variance deliveries (only those with non-zero variances)
    const varianceDeliveries = sortedDeliveries.filter(delivery => {
      const variance = (delivery.actual_quantity || 0) - delivery.daily_order.planned_quantity
      return variance !== 0
    })

    // Generate filter description for title
    const filterParts = []
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`)
    if (dateFilter) filterParts.push(`Date: ${formatDateIST(new Date(dateFilter))}`)
    if (routeFilter) filterParts.push(`Route: ${routeFilter}`)
    const filterDescription = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : ''
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Report${filterDescription} - ${formatDateIST(getCurrentISTDate())}</title>
  <style>
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
    
    .filter-info {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 20px;
      font-size: 10px;
    }
    
    .filter-info h3 {
      font-size: 12px;
      margin-bottom: 5px;
      color: #333;
    }
    
    .summary-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
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
    
    .section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 3px;
    }
    
    .deliveries-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
    }
    
    .deliveries-table th,
    .deliveries-table td {
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 9px;
    }
    
    .deliveries-table th {
      background: #FFD580;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .deliveries-table tr:nth-child(even) {
      background: #f8f9fa;
    }
    
    .deliveries-table .number {
      text-align: center;
    }
    
    .deliveries-table .amount {
      text-align: right;
      font-weight: bold;
    }
    
    .variance-positive { color: #22c55e; }
    .variance-negative { color: #dc2626; }
    .variance-neutral { color: #666; }
    
    .delivery-status {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: bold;
    }
    
    .status-delivered { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fed7d7; color: #742a2a; }
    
    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body { print-color-adjust: exact; }
      .deliveries-table { break-inside: avoid; }
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
      <h2>Delivery Report</h2>
      <p>Generated on: ${formatDateIST(getCurrentISTDate())}</p>
      <p>Total Records: ${filteredDeliveries.length}</p>
    </div>
  </div>

  ${filterDescription ? `
  <!-- Filter Information -->
  <div class="filter-info">
    <h3>Applied Filters</h3>
    <p>${filterParts.join(' • ')}</p>
  </div>
  ` : ''}

  ${filteredDeliveries.length === 0 ? `
  <div class="no-data">
    <h3>No delivery records found</h3>
    <p>No delivery records match the applied filters.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Orders</h3>
      <div class="value">${stats.totalOrders}</div>
    </div>
    <div class="stat-card">
      <h3>Completion Rate</h3>
      <div class="percentage ${stats.completionRate >= 95 ? 'good' : stats.completionRate >= 85 ? 'warning' : 'danger'}">${stats.completionRate}%</div>
    </div>
    <div class="stat-card">
      <h3>Planned Quantity</h3>
      <div class="value">${stats.totalPlannedQuantity}L</div>
    </div>
    <div class="stat-card">
      <h3>Actual Delivered</h3>
      <div class="value ${stats.quantityVariance > 0 ? 'variance-positive' : stats.quantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
        ${stats.totalActualQuantity}L
      </div>
    </div>
  </div>

  ${varianceDeliveries.length > 0 ? `
  <!-- Variance Summary -->
  <div class="section-title">Variance Summary (${varianceDeliveries.length} deliveries with variances)</div>
  <table class="deliveries-table">
    <thead>
      <tr>
        <th style="width: 12%;">Date</th>
        <th style="width: 20%;">Customer</th>
        <th style="width: 15%;">Product</th>
        <th style="width: 10%;">Route</th>
        <th style="width: 8%;">Planned</th>
        <th style="width: 8%;">Actual</th>
        <th style="width: 8%;">Variance</th>
        <th style="width: 8%;">Status</th>
        <th style="width: 11%;">Delivery Person</th>
      </tr>
    </thead>
    <tbody>
      ${varianceDeliveries.map(delivery => {
        const order = delivery.daily_order
        const quantityVariance = (delivery.actual_quantity || 0) - order.planned_quantity
        const isDelivered = delivery.actual_quantity !== null
        
        return `
        <tr>
          <td>${formatDateIST(new Date(order.order_date))}</td>
          <td>${order.customer.billing_name}</td>
          <td>${order.product.name}</td>
          <td class="number">${order.route.name}</td>
          <td class="number">${order.planned_quantity}L</td>
          <td class="number">${delivery.actual_quantity || 0}L</td>
          <td class="number ${quantityVariance > 0 ? 'variance-positive' : quantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${quantityVariance > 0 ? '+' : ''}${quantityVariance}L
          </td>
          <td>
            <span class="delivery-status ${isDelivered ? 'status-delivered' : 'status-pending'}">
              ${isDelivered ? 'DELIVERED' : 'PENDING'}
            </span>
          </td>
          <td>${delivery.delivery_person || '-'}</td>
        </tr>
        `
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Deliveries Details -->
  <div class="section-title">Delivery Details</div>
  <table class="deliveries-table">
    <thead>
      <tr>
        <th style="width: 12%;">Date</th>
        <th style="width: 20%;">Customer</th>
        <th style="width: 15%;">Product</th>
        <th style="width: 10%;">Route</th>
        <th style="width: 8%;">Planned</th>
        <th style="width: 8%;">Actual</th>
        <th style="width: 8%;">Variance</th>
        <th style="width: 8%;">Status</th>
        <th style="width: 11%;">Delivery Person</th>
      </tr>
    </thead>
    <tbody>
      ${sortedDeliveries.map(delivery => {
        const order = delivery.daily_order
        const quantityVariance = (delivery.actual_quantity || 0) - order.planned_quantity
        const isDelivered = delivery.actual_quantity !== null
        
        return `
        <tr>
          <td>${formatDateIST(new Date(order.order_date))}</td>
          <td>${order.customer.billing_name}</td>
          <td>${order.product.name}</td>
          <td class="number">${order.route.name}</td>
          <td class="number">${order.planned_quantity}L</td>
          <td class="number">${delivery.actual_quantity || 0}L</td>
          <td class="number ${quantityVariance > 0 ? 'variance-positive' : quantityVariance < 0 ? 'variance-negative' : 'variance-neutral'}">
            ${quantityVariance > 0 ? '+' : ''}${quantityVariance}L
          </td>
          <td>
            <span class="delivery-status ${isDelivered ? 'status-delivered' : 'status-pending'}">
              ${isDelivered ? 'DELIVERED' : 'PENDING'}
            </span>
          </td>
          <td>${delivery.delivery_person || '-'}</td>
        </tr>
        `
      }).join('')}
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
    console.error('Error generating deliveries print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}