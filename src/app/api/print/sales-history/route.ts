import { NextRequest } from 'next/server'
import { getSales } from '@/lib/actions/sales'
import { formatDateIST, getCurrentISTDate, parseLocalDateIST, formatDateForDatabase } from '@/lib/date-utils'
import { formatCurrency } from '@/lib/utils'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'
import type { Sale } from '@/lib/types'

// Function to convert date presets to date ranges (matching deliveries format)
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
      // Fallback to today if no most recent date available
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
      const sevenDaysAgo = subDays(today, 6) // Include today
      return {
        fromDate: startOfDay(sevenDaysAgo),
        toDate: endOfDay(today)
      }

    case "last30days":
      const thirtyDaysAgo = subDays(today, 29) // Include today
      return {
        fromDate: startOfDay(thirtyDaysAgo),
        toDate: endOfDay(today)
      }

    case "thisWeek":
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday start
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

function calculateSalesStats(sales: Sale[]) {
  const totalSales = sales.length
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const totalGST = sales.reduce((sum, sale) => sum + (sale.gst_amount || 0), 0)
  const baseAmount = totalRevenue - totalGST

  // Revenue by sale type
  const revenueByType = sales.reduce((acc, sale) => {
    acc[sale.sale_type] = (acc[sale.sale_type] || 0) + sale.total_amount
    return acc
  }, {} as Record<string, number>)

  // Sales count by type
  const salesByType = sales.reduce((acc, sale) => {
    acc[sale.sale_type] = (acc[sale.sale_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Payment status distribution
  const statusDistribution = sales.reduce((acc, sale) => {
    acc[sale.payment_status] = (acc[sale.payment_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Product-wise breakdown for quantities
  const productWiseQuantities = sales.reduce((acc, sale) => {
    const productName = sale.product?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = 0
    }
    acc[productName] += sale.quantity
    return acc
  }, {} as Record<string, number>)

  // Product-wise revenue
  const productWiseRevenue = sales.reduce((acc, sale) => {
    const productName = sale.product?.name || 'Unknown Product'
    if (!acc[productName]) {
      acc[productName] = 0
    }
    acc[productName] += sale.total_amount
    return acc
  }, {} as Record<string, number>)

  return {
    totalSales,
    totalRevenue,
    totalGST,
    baseAmount,
    revenueByType,
    salesByType,
    statusDistribution,
    productWiseQuantities,
    productWiseRevenue
  }
}

function filterSales(sales: Sale[], searchQuery?: string, dateRange?: { fromDate: Date, toDate: Date }, saleTypeFilter?: string, paymentStatusFilter?: string) {
  return sales.filter(sale => {
    const matchesSearch = !searchQuery ||
      sale.customer?.billing_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customer?.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.product?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.notes?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDate = !dateRange || (() => {
      try {
        const saleDate = parseLocalDateIST(sale.sale_date)
        return isWithinInterval(saleDate, {
          start: startOfDay(dateRange.fromDate),
          end: endOfDay(dateRange.toDate)
        })
      } catch (error) {
        console.error("Error parsing sale date:", sale.sale_date, error)
        return false
      }
    })()

    const matchesSaleType = !saleTypeFilter || sale.sale_type === saleTypeFilter
    const matchesPaymentStatus = !paymentStatusFilter || sale.payment_status === paymentStatusFilter

    return matchesSearch && matchesDate && matchesSaleType && matchesPaymentStatus
  })
}

function sortSales(sales: Sale[], sortKey: string, sortDirection: 'asc' | 'desc') {
  const sorted = [...sales].sort((a, b) => {
    let aValue: string | number | Date
    let bValue: string | number | Date

    switch (sortKey) {
      case 'customer.billing_name':
        aValue = a.customer?.billing_name || ''
        bValue = b.customer?.billing_name || ''
        break
      case 'sale_date':
        aValue = new Date(a.sale_date)
        bValue = new Date(b.sale_date)
        break
      case 'total_amount':
        aValue = a.total_amount
        bValue = b.total_amount
        break
      case 'product.name':
        aValue = a.product?.name || ''
        bValue = b.product?.name || ''
        break
      case 'quantity':
        aValue = a.quantity
        bValue = b.quantity
        break
      default:
        aValue = a.sale_date
        bValue = b.sale_date
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
    const datePreset = searchParams.get('datePreset') || undefined
    const dateFrom = searchParams.get('date_from') || undefined
    const dateTo = searchParams.get('date_to') || undefined
    const saleTypeFilter = searchParams.get('sale_type') || undefined
    const paymentStatusFilter = searchParams.get('payment_status') || undefined
    const sortKey = searchParams.get('sort_by') || searchParams.get('sortKey') || 'sale_date'
    const sortDirection = ((searchParams.get('sort_order') || searchParams.get('sortDirection')) as 'asc' | 'desc') || 'desc'

    // First, determine date range for filtering
    let dateRange: { fromDate: Date, toDate: Date } | undefined = undefined

    if (datePreset) {
      // For date presets, we need to fetch a sample of sales first to find the most recent date
      // for "mostRecent" preset, then apply the proper date range
      if (datePreset === 'mostRecent') {
        // Fetch recent sales to find the most recent date
        const recentSalesData = await getSales({ limit: 1 })
        const mostRecentDate = recentSalesData.sales.length > 0 ? recentSalesData.sales[0].sale_date : undefined
        const range = getDateRangeFromPreset(datePreset, mostRecentDate)
        if (range) {
          dateRange = range
        }
      } else {
        const range = getDateRangeFromPreset(datePreset)
        if (range) {
          dateRange = range
        }
      }
    } else if (dateFrom && dateTo) {
      // Handle custom date range
      try {
        dateRange = {
          fromDate: new Date(dateFrom),
          toDate: new Date(dateTo)
        }
      } catch (error) {
        console.error("Error parsing custom date range:", error)
      }
    }

    // Now fetch sales with all applicable filters at database level
    const getSalesParams: any = { limit: 10000 }

    // Apply sale type and payment status filters at database level
    if (saleTypeFilter) {
      getSalesParams.sale_type = saleTypeFilter
    }
    if (paymentStatusFilter) {
      getSalesParams.payment_status = paymentStatusFilter
    }

    // Apply date range filters at database level
    if (dateRange) {
      getSalesParams.date_from = formatDateForDatabase(dateRange.fromDate)
      getSalesParams.date_to = formatDateForDatabase(dateRange.toDate)
    } else {
      // No date filters provided - apply default current month range like the sales history page
      const today = getCurrentISTDate()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      getSalesParams.date_from = formatDateForDatabase(firstDay)
      getSalesParams.date_to = formatDateForDatabase(today)
    }

    const salesData = await getSales(getSalesParams)
    const allSales = salesData.sales

    // Apply remaining client-side filters (mainly search since other filters are handled at DB level)
    const filteredSales = filterSales(allSales, searchQuery, undefined, undefined, undefined)

    // Calculate stats
    const stats = calculateSalesStats(filteredSales)

    // Apply sorting
    const sortedSales = sortSales(filteredSales, sortKey, sortDirection)


    // Generate filter description for title
    const filterParts = []
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`)
    if (dateRange) {
      if (datePreset) {
        // Use preset label with actual date range for clarity
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
    if (saleTypeFilter) filterParts.push(`Type: ${saleTypeFilter}`)
    if (paymentStatusFilter) filterParts.push(`Status: ${paymentStatusFilter}`)
    // Generate document title following the new convention
    // Format: SalesHistoryReport_FilterType_Value_FilterType_Value_Generated_YYYY-MM-DD
    const titleParts = ['SalesHistoryReport']

    // Add date filter to title - prioritize preset names over date ranges
    if (datePreset) {
      if (datePreset === 'mostRecent' && dateRange) {
        // For most recent, show the actual date
        const targetDate = formatDateForDatabase(dateRange.fromDate)
        titleParts.push(`Date_MostRecent_${targetDate}`)
      } else {
        // For other presets, use descriptive names
        const presetNames: Record<string, string> = {
          'today': 'Today',
          'yesterday': 'Yesterday',
          'last7days': 'Last7Days',
          'last30days': 'Last30Days',
          'thisWeek': 'ThisWeek',
          'thisMonth': 'ThisMonth',
          'lastMonth': 'LastMonth'
        }
        const presetName = presetNames[datePreset] || datePreset.charAt(0).toUpperCase() + datePreset.slice(1)
        titleParts.push(`Date_${presetName}`)
      }
    } else if (dateRange) {
      // Custom date range
      const fromDateISO = formatDateForDatabase(dateRange.fromDate)
      const toDateISO = formatDateForDatabase(dateRange.toDate)
      titleParts.push(`Date_${fromDateISO}_to_${toDateISO}`)
    } else {
      // No date filters applied - use default current month range like the sales history page
      const today = getCurrentISTDate()
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const fromDateISO = formatDateForDatabase(firstDay)
      const toDateISO = formatDateForDatabase(today)
      titleParts.push(`Date_${fromDateISO}_to_${toDateISO}`)
    }

    // Add sale type filter to title
    if (saleTypeFilter) {
      titleParts.push(`Type_${saleTypeFilter}`)
    }

    // Add payment status filter to title
    if (paymentStatusFilter) {
      titleParts.push(`Status_${paymentStatusFilter}`)
    }

    // Add search filter to title
    if (searchQuery) {
      // Clean search query for filename safety
      const cleanQuery = searchQuery.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)
      titleParts.push(`Search_${cleanQuery}`)
    }

    // Add generated date
    const generatedDate = formatDateForDatabase(getCurrentISTDate())
    titleParts.push(`Generated_${generatedDate}`)

    const documentTitle = titleParts.join('_')

    // Keep the old format for the filter display card
    const filterDescription = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
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

    .stat-card .revenue {
      font-size: 14px;
      font-weight: bold;
      color: #22c55e;
    }

    .section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #e9ecef;
      padding-bottom: 3px;
    }

    .sales-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
    }

    .sales-table th,
    .sales-table td {
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 9px;
    }

    .sales-table th {
      background: #FFD580;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .sales-table tr:nth-child(even) {
      background: #f8f9fa;
    }

    .sales-table .number {
      text-align: center;
    }

    .sales-table .amount {
      text-align: right;
      font-weight: bold;
    }

    .sale-status {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: bold;
    }

    .status-completed { background: #d1fae5; color: #065f46; }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-billed { background: #dbeafe; color: #1e40af; }

    .type-cash { background: #dcfce7; color: #166534; }
    .type-credit { background: #fed7aa; color: #9a3412; }
    .type-qr { background: #e0e7ff; color: #3730a3; }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-size: 14px;
    }

    @media print {
      body { print-color-adjust: exact; }
      .sales-table { break-inside: avoid; }
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
      <h2>Sales History Report</h2>
      <p>Generated on: ${formatDateIST(getCurrentISTDate())}</p>
      <p>Total Records: ${filteredSales.length}</p>
    </div>
  </div>

  ${filterDescription ? `
  <!-- Filter Information -->
  <div class="filter-info">
    <h3>Applied Filters</h3>
    <p>${filterParts.join(' • ')}</p>
  </div>
  ` : ''}

  ${filteredSales.length === 0 ? `
  <div class="no-data">
    <h3>No sales records found</h3>
    <p>No sales records match the applied filters.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Sales</h3>
      <div class="value">${stats.totalSales}</div>
      <div style="font-size: 8px; color: #666; margin-top: 4px;">
        ${Object.entries(stats.salesByType).map(([type, count]) =>
          `<div>${type}: ${count}</div>`
        ).join('')}
      </div>
    </div>
    <div class="stat-card">
      <h3>Total Revenue</h3>
      <div class="revenue">${formatCurrency(stats.totalRevenue)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 4px;">
        ${Object.entries(stats.revenueByType).map(([type, amount]) =>
          `<div>${type}: ${formatCurrency(amount)}</div>`
        ).join('')}
      </div>
    </div>
    <div class="stat-card">
      <h3>Total GST</h3>
      <div class="value">${formatCurrency(stats.totalGST)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">
        ${((stats.totalGST / stats.totalRevenue) * 100).toFixed(1)}% of revenue
      </div>
    </div>
    <div class="stat-card">
      <h3>Base Amount</h3>
      <div class="value">${formatCurrency(stats.baseAmount)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">
        Avg: ${formatCurrency(stats.baseAmount / (stats.totalSales || 1))}
      </div>
    </div>
  </div>


  <!-- Sales Details -->
  <div class="section-title">Sales Transaction Details</div>
  <table class="sales-table">
    <thead>
      <tr>
        <th style="width: 10%;">Date</th>
        <th style="width: 20%;">Customer</th>
        <th style="width: 18%;">Product</th>
        <th style="width: 8%;">Qty</th>
        <th style="width: 10%;">Unit Price</th>
        <th style="width: 10%;">Total</th>
        <th style="width: 8%;">GST</th>
        <th style="width: 8%;">Type</th>
        <th style="width: 8%;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${sortedSales.map(sale => `
        <tr>
          <td>${formatDateIST(new Date(sale.sale_date))}</td>
          <td>${sale.customer?.billing_name || '-'}</td>
          <td>
            <div style="font-weight: 500;">${sale.product?.name || 'Unknown'}</div>
            ${sale.product?.code ? `<div style="color: #666; font-size: 8px;">${sale.product.code}</div>` : ''}
          </td>
          <td class="number">${sale.quantity}${sale.product?.unit_of_measure ? ' ' + sale.product.unit_of_measure : ''}</td>
          <td class="amount">${formatCurrency(sale.unit_price)}</td>
          <td class="amount">${formatCurrency(sale.total_amount)}</td>
          <td class="amount">${formatCurrency(sale.gst_amount || 0)}</td>
          <td>
            <span class="sale-status type-${sale.sale_type.toLowerCase()}">
              ${sale.sale_type}
            </span>
          </td>
          <td>
            <span class="sale-status status-${sale.payment_status.toLowerCase()}">
              ${sale.payment_status}
            </span>
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
    console.error('Error generating sales print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}