import { NextRequest } from 'next/server'
import { getPaymentReport, type PaymentReportFilters } from '@/lib/actions/reports'
import { formatCurrency } from '@/lib/utils'
import { getCurrentISTDate, formatDateIST, formatDateForDatabase, parseLocalDateIST } from '@/lib/date-utils'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'

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
      const lastMonth = subMonths(today, 1)
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || undefined
    const datePreset = searchParams.get('datePreset') || undefined
    const dateFrom = searchParams.get('date_from') || searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('date_to') || searchParams.get('dateTo') || undefined
    const paymentMethodFilter = searchParams.get('paymentMethod') || undefined
    const allocationStatusFilter = searchParams.get('allocationStatus') || undefined

    // Determine date range for filtering
    let dateRange: { fromDate: Date, toDate: Date } | undefined = undefined
    const filters: PaymentReportFilters = {}

    // First, fetch all payments to determine most recent date if needed
    const allPaymentsResult = await getPaymentReport({})
    if (!allPaymentsResult.success || !allPaymentsResult.data) {
      throw new Error('Failed to fetch payments')
    }

    let mostRecentDate: string | undefined = undefined
    if (datePreset) {
      // Find the most recent date from payments for "mostRecent" preset
      if (datePreset === 'mostRecent' && allPaymentsResult.data.length > 0) {
        const sortedByDate = [...allPaymentsResult.data].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
        mostRecentDate = sortedByDate[0].payment_date
      }

      const range = getDateRangeFromPreset(datePreset, mostRecentDate)
      if (range) {
        dateRange = range
        filters.startDate = formatDateForDatabase(range.fromDate)
        filters.endDate = formatDateForDatabase(range.toDate)
      }
    } else if (dateFrom && dateTo) {
      // Handle custom date range
      try {
        dateRange = {
          fromDate: parseLocalDateIST(dateFrom),
          toDate: parseLocalDateIST(dateTo)
        }
        filters.startDate = formatDateForDatabase(dateRange.fromDate)
        filters.endDate = formatDateForDatabase(dateRange.toDate)
      } catch (error) {
        console.error("Error parsing custom date range:", error)
      }
    }

    // Apply other filters
    if (searchQuery) filters.search = searchQuery
    if (paymentMethodFilter) filters.paymentMethod = paymentMethodFilter
    if (allocationStatusFilter) filters.allocationStatus = allocationStatusFilter

    // Fetch filtered payments
    const result = await getPaymentReport(filters)
    if (!result.success || !result.data) {
      throw new Error('Failed to fetch payment report')
    }

    const payments = result.data

    // Calculate stats
    const totalPayments = payments.length
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalApplied = payments.reduce((sum, p) => sum + p.amount_applied, 0)
    const totalUnapplied = payments.reduce((sum, p) => sum + p.amount_unapplied, 0)
    const averagePayment = totalPayments > 0 ? totalAmount / totalPayments : 0

    // Payment method breakdown
    const methodBreakdown: { [key: string]: { count: number; amount: number } } = {}
    payments.forEach(payment => {
      const method = payment.payment_method || 'Not specified'
      if (!methodBreakdown[method]) {
        methodBreakdown[method] = { count: 0, amount: 0 }
      }
      methodBreakdown[method].count++
      methodBreakdown[method].amount += payment.amount
    })

    // Allocation status breakdown
    const statusBreakdown: { [key: string]: { count: number; amount: number } } = {}
    payments.forEach(payment => {
      const status = payment.allocation_status || 'Unknown'
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = { count: 0, amount: 0 }
      }
      statusBreakdown[status].count++
      statusBreakdown[status].amount += payment.amount
    })

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
    if (paymentMethodFilter) filterParts.push(`Method: ${paymentMethodFilter}`)
    if (allocationStatusFilter) filterParts.push(`Status: ${allocationStatusFilter}`)

    // Generate document title following the new convention
    const titleParts = ['PaymentCollectionReport']

    // Add date filter to title
    if (datePreset) {
      if (datePreset === 'mostRecent' && mostRecentDate) {
        titleParts.push(`Date_MostRecent_${mostRecentDate}`)
      } else {
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
      const fromDateISO = formatDateForDatabase(dateRange.fromDate)
      const toDateISO = formatDateForDatabase(dateRange.toDate)
      titleParts.push(`Date_${fromDateISO}_to_${toDateISO}`)
    }

    // Add method filter to title
    if (paymentMethodFilter) {
      titleParts.push(`Method_${paymentMethodFilter.replace(/[^a-zA-Z0-9]/g, '')}`)
    }

    // Add status filter to title
    if (allocationStatusFilter) {
      titleParts.push(`Status_${allocationStatusFilter.replace(/[^a-zA-Z0-9]/g, '')}`)
    }

    // Add search filter to title
    if (searchQuery) {
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
      gap: 15px;
      margin-bottom: 20px;
    }

    .breakdown-item {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 10px;
    }

    .breakdown-item h4 {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #333;
    }

    .breakdown-details {
      font-size: 9px;
      color: #666;
      line-height: 1.6;
    }

    .breakdown-details div {
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .value-badge {
      background: #FFD580;
      color: #333;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: bold;
    }

    .payments-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
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
      background: #FFD580;
      color: #333;
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
      color: #333;
    }

    .status-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: bold;
    }

    .status-fully_applied { background: #d1fae5; color: #065f46; }
    .status-partially_applied { background: #fef3c7; color: #92400e; }
    .status-unapplied { background: #fee2e2; color: #991b1b; }

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
        <p>Surety of Purity</p>
      </div>
    </div>
    <div class="report-info">
      <h2>Payment Collection Report</h2>
      <p>Generated on: ${formatDateIST(getCurrentISTDate())}</p>
      <p>Total Records: ${totalPayments}</p>
    </div>
  </div>

  ${filterDescription ? `
  <!-- Filter Information -->
  <div class="filter-info">
    <h3>Applied Filters</h3>
    <p>${filterParts.join(' • ')}</p>
  </div>
  ` : ''}

  ${totalPayments === 0 ? `
  <div class="no-data">
    <h3>No payment records found</h3>
    <p>No payment records match the applied filters.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Payments</h3>
      <div class="value">${totalPayments}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">${formatCurrency(totalAmount)} collected</div>
    </div>
    <div class="stat-card">
      <h3>Amount Allocated</h3>
      <div class="value" style="color: #2563eb;">${formatCurrency(totalApplied)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">Applied to invoices/sales</div>
    </div>
    <div class="stat-card">
      <h3>Unapplied Amount</h3>
      <div class="value" style="color: #ea580c;">${formatCurrency(totalUnapplied)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">Pending allocation</div>
    </div>
    <div class="stat-card">
      <h3>Average Payment</h3>
      <div class="value">${formatCurrency(averagePayment)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">Per transaction</div>
    </div>
  </div>

  <!-- Payment Analysis -->
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
      <h4>Allocation Status</h4>
      <div class="breakdown-details">
        ${Object.entries(statusBreakdown).map(([status, data]) => {
          const statusLabel = status === 'fully_applied' ? 'Fully Applied' :
                             status === 'partially_applied' ? 'Partially Applied' :
                             status === 'unapplied' ? 'Unapplied' : status
          return `
          <div>
            <span><strong>${statusLabel}</strong></span>
            <span class="value-badge">${data.count} (${formatCurrency(data.amount)})</span>
          </div>
          `
        }).join('')}
      </div>
    </div>
  </div>

  <!-- Payment Records Table -->
  <div class="section-title">Payment Records</div>
  <table class="payments-table">
    <thead>
      <tr>
        <th style="width: 10%;">Date</th>
        <th style="width: 20%;">Customer</th>
        <th style="width: 12%;">Amount</th>
        <th style="width: 10%;">Method</th>
        <th style="width: 12%;">Status</th>
        <th style="width: 10%;">Applied</th>
        <th style="width: 10%;">Unapplied</th>
        <th style="width: 16%;">Allocations</th>
      </tr>
    </thead>
    <tbody>
      ${payments.map(payment => {
        const statusClass = payment.allocation_status.replace(/_/g, '_')
        const statusLabel = payment.allocation_status === 'fully_applied' ? 'Fully Applied' :
                           payment.allocation_status === 'partially_applied' ? 'Partially Applied' :
                           payment.allocation_status === 'unapplied' ? 'Unapplied' : payment.allocation_status

        return `
        <tr>
          <td>${formatDateIST(new Date(payment.payment_date))}</td>
          <td class="customer-name">
            ${payment.customer_name}
            ${payment.customer_contact ? `<div style="font-size: 8px; font-weight: normal; color: #666;">${payment.customer_contact}</div>` : ''}
          </td>
          <td class="amount">${formatCurrency(payment.amount)}</td>
          <td>${payment.payment_method || 'N/A'}</td>
          <td>
            <span class="status-badge status-${statusClass}">${statusLabel}</span>
          </td>
          <td style="text-align: right; color: #16a34a;">${formatCurrency(payment.amount_applied)}</td>
          <td style="text-align: right; color: #ea580c;">${formatCurrency(payment.amount_unapplied)}</td>
          <td style="font-size: 8px;">
            ${payment.invoice_allocations.length > 0 ? `<div>Invoices: ${payment.invoice_allocations.length}</div>` : ''}
            ${payment.sales_allocations.length > 0 ? `<div>Sales: ${payment.sales_allocations.length}</div>` : ''}
            ${payment.opening_balance_allocation > 0 ? `<div>Opening: ${formatCurrency(payment.opening_balance_allocation)}</div>` : ''}
          </td>
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
    console.error('Error generating payment collection print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
