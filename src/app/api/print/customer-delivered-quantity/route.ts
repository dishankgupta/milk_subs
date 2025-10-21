import { NextRequest } from 'next/server'
import { getDeliveries } from '@/lib/actions/deliveries'
import { formatDateIST, getCurrentISTDate, parseLocalDateIST } from '@/lib/date-utils'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import type { DeliveryExtended } from '@/lib/types'

// Function to convert date presets to date ranges
function getDateRangeFromPreset(preset: string, mostRecentDate?: string): { fromDate: Date, toDate: Date } | null {
  const today = getCurrentISTDate()

  switch (preset) {
    case "mostRecent":
      if (mostRecentDate) {
        const recentDate = parseLocalDateIST(mostRecentDate)
        return {
          fromDate: startOfDay(recentDate),
          toDate: endOfDay(recentDate)
        }
      }
      return {
        fromDate: startOfDay(today),
        toDate: endOfDay(today)
      }

    case "today":
      return {
        fromDate: startOfDay(today),
        toDate: endOfDay(today)
      }

    case "yesterday":
      const yesterday = subDays(today, 1)
      return {
        fromDate: startOfDay(yesterday),
        toDate: endOfDay(yesterday)
      }

    case "last7days":
      const sevenDaysAgo = subDays(today, 6)
      return {
        fromDate: startOfDay(sevenDaysAgo),
        toDate: endOfDay(today)
      }

    case "last30days":
      const thirtyDaysAgo = subDays(today, 29)
      return {
        fromDate: startOfDay(thirtyDaysAgo),
        toDate: endOfDay(today)
      }

    case "thisWeek":
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      return {
        fromDate: weekStart,
        toDate: weekEnd
      }

    case "thisMonth":
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      return {
        fromDate: monthStart,
        toDate: monthEnd
      }

    case "lastMonth":
      const lastMonth = subDays(startOfMonth(today), 1)
      const lastMonthStart = startOfMonth(lastMonth)
      const lastMonthEnd = endOfMonth(lastMonth)
      return {
        fromDate: lastMonthStart,
        toDate: lastMonthEnd
      }

    default:
      return null
  }
}

function filterDeliveries(deliveries: DeliveryExtended[], searchQuery?: string, dateRange?: { fromDate: Date, toDate: Date }, routeFilter?: string) {
  return deliveries.filter(delivery => {
    const matchesSearch = !searchQuery ||
      delivery.delivery_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.delivery_notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.customer?.billing_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.customer?.contact_person.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDate = !dateRange || (() => {
      try {
        const deliveryDate = parseLocalDateIST(delivery.order_date)
        return isWithinInterval(deliveryDate, {
          start: startOfDay(dateRange.fromDate),
          end: endOfDay(dateRange.toDate)
        })
      } catch (error) {
        console.error("Error parsing delivery date:", delivery.order_date, error)
        return false
      }
    })()

    const matchesRoute = !routeFilter ||
      delivery.route?.name === routeFilter

    return matchesSearch && matchesDate && matchesRoute
  })
}

// Transform deliveries into customer-product summary
function createCustomerProductSummary(deliveries: DeliveryExtended[]) {
  // Only include delivered items (actual_quantity is not null)
  const deliveredItems = deliveries.filter(d => d.actual_quantity !== null)

  // Get unique products
  const products = [...new Set(deliveredItems.map(d => d.product?.name || 'Unknown Product'))].sort()

  // Group by customer and calculate totals per product (both quantity and amount)
  const customerSummary = deliveredItems.reduce((acc, delivery) => {
    const customerName = delivery.customer?.billing_name || 'Unknown Customer'
    const productName = delivery.product?.name || 'Unknown Product'
    const quantity = delivery.actual_quantity || 0
    const amount = delivery.total_amount || 0

    if (!acc[customerName]) {
      acc[customerName] = {}
    }

    if (!acc[customerName][productName]) {
      acc[customerName][productName] = { quantity: 0, amount: 0 }
    }

    acc[customerName][productName].quantity += quantity
    acc[customerName][productName].amount += amount

    return acc
  }, {} as Record<string, Record<string, { quantity: number, amount: number }>>)

  // Calculate product totals (both quantity and amount)
  const productTotals = products.reduce((acc, product) => {
    const totals = Object.values(customerSummary).reduce((total, customerData) => {
      const productData = customerData[product] || { quantity: 0, amount: 0 }
      return {
        quantity: total.quantity + productData.quantity,
        amount: total.amount + productData.amount
      }
    }, { quantity: 0, amount: 0 })

    acc[product] = totals
    return acc
  }, {} as Record<string, { quantity: number, amount: number }>)

  // Calculate grand totals
  const grandTotals = Object.values(productTotals).reduce((sum, totals) => ({
    quantity: sum.quantity + totals.quantity,
    amount: sum.amount + totals.amount
  }), { quantity: 0, amount: 0 })

  return {
    customerSummary,
    products,
    productTotals,
    totalCustomers: Object.keys(customerSummary).length,
    totalDeliveries: deliveredItems.length,
    grandTotals
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || undefined
    const datePreset = searchParams.get('datePreset') || undefined
    const dateFrom = searchParams.get('date_from') || searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('date_to') || searchParams.get('dateTo') || undefined
    const routeFilter = searchParams.get('route') || undefined

    // Fetch all deliveries
    const allDeliveries = await getDeliveries()

    // Determine date range for filtering
    let dateRange: { fromDate: Date, toDate: Date } | undefined = undefined

    if (datePreset) {
      let mostRecentDate: string | undefined = undefined
      if (datePreset === 'mostRecent' && allDeliveries.length > 0) {
        const sortedByDate = [...allDeliveries].sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())
        mostRecentDate = sortedByDate[0].order_date
      }

      const range = getDateRangeFromPreset(datePreset, mostRecentDate)
      if (range) {
        dateRange = range
      }
    } else if (dateFrom && dateTo) {
      try {
        dateRange = {
          fromDate: new Date(dateFrom),
          toDate: new Date(dateTo)
        }
      } catch (error) {
        console.error("Error parsing custom date range:", error)
      }
    }

    // Apply filters
    const filteredDeliveries = filterDeliveries(allDeliveries, searchQuery, dateRange, routeFilter)

    // Create customer-product summary
    const summary = createCustomerProductSummary(filteredDeliveries)

    // Generate filter description for title
    const filterParts = []
    if (searchQuery) filterParts.push(`Search: &quot;${searchQuery}&quot;`)
    if (dateRange) {
      if (datePreset) {
        switch (datePreset) {
          case 'mostRecent':
            filterParts.push(`Date: Most Recent (${formatDateIST(dateRange.fromDate)})`)
            break
          case 'today':
            filterParts.push(`Date: Today (${formatDateIST(dateRange.fromDate)})`)
            break
          case 'yesterday':
            filterParts.push(`Date: Yesterday (${formatDateIST(dateRange.fromDate)})`)
            break
          case 'last7days':
            filterParts.push(`Date: Last 7 days (${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)})`)
            break
          case 'last30days':
            filterParts.push(`Date: Last 30 days (${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)})`)
            break
          case 'thisWeek':
            filterParts.push(`Date: This week (${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)})`)
            break
          case 'thisMonth':
            filterParts.push(`Date: This month (${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)})`)
            break
          case 'lastMonth':
            filterParts.push(`Date: Last month (${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)})`)
            break
          default:
            filterParts.push(`Date: ${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)}`)
        }
      } else {
        filterParts.push(`Date: ${formatDateIST(dateRange.fromDate)} - ${formatDateIST(dateRange.toDate)}`)
      }
    }
    if (routeFilter) filterParts.push(`Route: ${routeFilter}`)
    const filterDescription = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Customer Delivered Quantity Report${filterDescription} - ${formatDateIST(getCurrentISTDate())}</title>
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
      font-family: &apos;Segoe UI&apos;, Tahoma, Geneva, Verdana, sans-serif;
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
      grid-template-columns: repeat(5, 1fr);
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

    .section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 3px;
    }

    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
    }

    .summary-table th,
    .summary-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      border-right: 1px solid #e9ecef;
      font-size: 10px;
    }

    .summary-table th {
      background: #FFD580;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-table tr:nth-child(even) {
      background: #f8f9fa;
    }

    .summary-table .customer-name {
      font-weight: bold;
      min-width: 150px;
    }

    .summary-table .quantity {
      text-align: center;
      font-weight: bold;
    }

    .summary-table .amount {
      text-align: right;
      font-weight: bold;
      color: #333;
    }

    .summary-table .total-row {
      background: #e9ecef !important;
      font-weight: bold;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body { print-color-adjust: exact; }
      .summary-table { break-inside: avoid; }
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
      <h2>Customer Delivered Quantity Report</h2>
      <p>Generated on: ${formatDateIST(getCurrentISTDate())}</p>
      <p>Total Customers: ${summary.totalCustomers}</p>
      <p>Total Deliveries: ${summary.totalDeliveries}</p>
    </div>
  </div>

  ${filterDescription ? `
  <!-- Filter Information -->
  <div class="filter-info">
    <h3>Applied Filters</h3>
    <p>${filterParts.join(' • ')}</p>
  </div>
  ` : ''}

  ${summary.totalCustomers === 0 ? `
  <div class="no-data">
    <h3>No delivery records found</h3>
    <p>No delivered items match the applied filters.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Customers</h3>
      <div class="value">${summary.totalCustomers}</div>
    </div>
    <div class="stat-card">
      <h3>Total Deliveries</h3>
      <div class="value">${summary.totalDeliveries}</div>
    </div>
    <div class="stat-card">
      <h3>Product Types</h3>
      <div class="value">${summary.products.length}</div>
    </div>
    <div class="stat-card">
      <h3>Total Quantity</h3>
      <div class="value">${summary.grandTotals.quantity.toFixed(2)}L</div>
    </div>
    <div class="stat-card">
      <h3>Total Amount</h3>
      <div class="value">₹${summary.grandTotals.amount.toFixed(2)}</div>
    </div>
  </div>

  <!-- Customer-Product Summary Table -->
  <div class="section-title">Customer Delivered Quantity Summary</div>
  <table class="summary-table">
    <thead>
      <tr>
        <th class="customer-name">Customer Name</th>
        ${summary.products.map(product =>
          `<th class="quantity">${product} Qty</th><th class="amount">${product} Amount</th>`
        ).join('')}
        <th class="quantity">Total Qty</th>
        <th class="amount">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(summary.customerSummary)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([customerName, customerProducts]) => {
          const customerTotals = Object.values(customerProducts).reduce((sum, data) => ({
            quantity: sum.quantity + data.quantity,
            amount: sum.amount + data.amount
          }), { quantity: 0, amount: 0 })

          return `
          <tr>
            <td class="customer-name">${customerName}</td>
            ${summary.products.map(product => {
              const productData = customerProducts[product] || { quantity: 0, amount: 0 }
              return `<td class="quantity">${productData.quantity > 0 ? productData.quantity.toFixed(2) + 'L' : '-'}</td><td class="amount">${productData.amount > 0 ? '₹' + productData.amount.toFixed(2) : '-'}</td>`
            }).join('')}
            <td class="quantity" style="font-weight: bold; color: #15803d;">${customerTotals.quantity.toFixed(2)}L</td>
            <td class="amount" style="font-weight: bold; color: #15803d;">₹${customerTotals.amount.toFixed(2)}</td>
          </tr>
          `
        }).join('')}
      <!-- Total Row -->
      <tr class="total-row">
        <td class="customer-name">TOTAL</td>
        ${summary.products.map(product =>
          `<td class="quantity">${summary.productTotals[product].quantity.toFixed(2)}L</td><td class="amount">₹${summary.productTotals[product].amount.toFixed(2)}</td>`
        ).join('')}
        <td class="quantity" style="color: #15803d;">${summary.grandTotals.quantity.toFixed(2)}L</td>
        <td class="amount" style="color: #15803d;">₹${summary.grandTotals.amount.toFixed(2)}</td>
      </tr>
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
    console.error('Error generating customer delivered quantity print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}