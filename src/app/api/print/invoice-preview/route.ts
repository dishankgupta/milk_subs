import { NextRequest } from 'next/server'
import { getBulkInvoicePreview } from '@/lib/actions/invoices'
import { formatDateIST, getCurrentISTDate } from '@/lib/date-utils'
import { formatCurrency } from '@/lib/utils'

interface BulkInvoicePreviewItem {
  customerId: string
  customerName: string
  subscriptionAmount: number
  creditSalesAmount: number
  totalAmount: number
  hasExistingInvoice: boolean
  existingInvoiceNumber?: string
}

function filterInvoices(
  invoices: BulkInvoicePreviewItem[],
  searchQuery?: string,
  statusFilter?: string,
  amountFilter?: string
) {
  return invoices.filter(item => {
    const matchesSearch = !searchQuery ||
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = !statusFilter || statusFilter === "all" ||
      (statusFilter === "ready" && !item.hasExistingInvoice && item.totalAmount > 0) ||
      (statusFilter === "duplicate" && item.hasExistingInvoice) ||
      (statusFilter === "no_amount" && !item.hasExistingInvoice && item.totalAmount === 0)

    const matchesAmount = !amountFilter || amountFilter === "all" ||
      (amountFilter === "with_subscription" && item.subscriptionAmount > 0) ||
      (amountFilter === "with_credit_sales" && item.creditSalesAmount > 0) ||
      (amountFilter === "above_100" && item.totalAmount > 100) ||
      (amountFilter === "below_100" && item.totalAmount <= 100 && item.totalAmount > 0)

    return matchesSearch && matchesStatus && matchesAmount
  })
}

function sortInvoices(invoices: BulkInvoicePreviewItem[], sortKey: string, sortDirection: 'asc' | 'desc') {
  const sorted = [...invoices].sort((a, b) => {
    let aValue: string | number
    let bValue: string | number

    switch (sortKey) {
      case 'customerName':
        aValue = a.customerName
        bValue = b.customerName
        break
      case 'subscriptionAmount':
        aValue = a.subscriptionAmount
        bValue = b.subscriptionAmount
        break
      case 'creditSalesAmount':
        aValue = a.creditSalesAmount
        bValue = b.creditSalesAmount
        break
      case 'totalAmount':
        aValue = a.totalAmount
        bValue = b.totalAmount
        break
      default:
        aValue = a.customerName
        bValue = b.customerName
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
    const statusFilter = searchParams.get('status') || undefined
    const amountFilter = searchParams.get('amount') || undefined
    const sortKey = searchParams.get('sortKey') || 'customerName'
    const sortDirection = (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc'

    // Get period parameters
    const periodStart = searchParams.get('period_start') || undefined
    const periodEnd = searchParams.get('period_end') || undefined
    const customerSelection = searchParams.get('customer_selection') || 'with_unbilled_transactions'

    if (!periodStart || !periodEnd) {
      return new Response('Period start and end dates are required', { status: 400 })
    }

    // Fetch invoice preview data
    const previewData = await getBulkInvoicePreview({
      period_start: periodStart,
      period_end: periodEnd,
      customer_selection: customerSelection as any
    })

    // Apply filters
    const filteredData = filterInvoices(previewData, searchQuery, statusFilter, amountFilter)

    // Apply sorting
    const sortedData = sortInvoices(filteredData, sortKey, sortDirection)

    // Calculate statistics
    const stats = {
      totalCustomers: sortedData.length,
      readyCount: sortedData.filter(item => !item.hasExistingInvoice && item.totalAmount > 0).length,
      duplicateCount: sortedData.filter(item => item.hasExistingInvoice).length,
      noAmountCount: sortedData.filter(item => !item.hasExistingInvoice && item.totalAmount === 0).length,
      totalSubscriptionAmount: sortedData.reduce((sum, item) => sum + item.subscriptionAmount, 0),
      totalCreditSalesAmount: sortedData.reduce((sum, item) => sum + item.creditSalesAmount, 0),
      totalAmount: sortedData.reduce((sum, item) => sum + item.totalAmount, 0)
    }

    // Generate filter description for title
    const filterParts = []
    if (searchQuery) filterParts.push(`Search: "${searchQuery}"`)
    if (statusFilter && statusFilter !== 'all') {
      const statusLabels: Record<string, string> = {
        ready: 'Ready for Generation',
        duplicate: 'Duplicate Invoices',
        no_amount: 'No Amount Due'
      }
      filterParts.push(`Status: ${statusLabels[statusFilter] || statusFilter}`)
    }
    if (amountFilter && amountFilter !== 'all') {
      const amountLabels: Record<string, string> = {
        with_subscription: 'With Subscription',
        with_credit_sales: 'With Credit Sales',
        above_100: 'Above ₹100',
        below_100: 'Below ₹100'
      }
      filterParts.push(`Amount: ${amountLabels[amountFilter] || amountFilter}`)
    }
    filterParts.push(`Period: ${formatDateIST(new Date(periodStart))} - ${formatDateIST(new Date(periodEnd))}`)
    const filterDescription = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : ''

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice Preview Report${filterDescription} - ${formatDateIST(getCurrentISTDate())}</title>
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

    .stat-card .currency {
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

    .invoices-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
    }

    .invoices-table th,
    .invoices-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 10px;
    }

    .invoices-table th {
      background: #FFD580;
      color: #333;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .invoices-table tr:nth-child(even) {
      background: #f8f9fa;
    }

    .invoices-table .number {
      text-align: center;
    }

    .invoices-table .amount {
      text-align: right;
      font-weight: bold;
    }

    .status-ready {
      background: #d1fae5;
      color: #065f46;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: bold;
    }

    .status-duplicate {
      background: #fecaca;
      color: #7f1d1d;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: bold;
    }

    .status-no-amount {
      background: #f3f4f6;
      color: #374151;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8px;
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
      .invoices-table { break-inside: avoid; }
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
      <h2>Invoice Preview Report</h2>
      <p>Generated on: ${formatDateIST(getCurrentISTDate())}</p>
      <p>Total Records: ${sortedData.length}</p>
    </div>
  </div>

  ${filterDescription ? `
  <!-- Filter Information -->
  <div class="filter-info">
    <h3>Applied Filters</h3>
    <p>${filterParts.join(' • ')}</p>
  </div>
  ` : ''}

  ${sortedData.length === 0 ? `
  <div class="no-data">
    <h3>No invoice records found</h3>
    <p>No customers match the applied filters for the selected period.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Customers</h3>
      <div class="value">${stats.totalCustomers}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">${stats.readyCount} ready, ${stats.duplicateCount} duplicates</div>
    </div>
    <div class="stat-card">
      <h3>Subscription Amount</h3>
      <div class="currency">${formatCurrency(stats.totalSubscriptionAmount)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">From deliveries</div>
    </div>
    <div class="stat-card">
      <h3>Credit Sales Amount</h3>
      <div class="currency">${formatCurrency(stats.totalCreditSalesAmount)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">From manual sales</div>
    </div>
    <div class="stat-card">
      <h3>Total Amount</h3>
      <div class="currency">${formatCurrency(stats.totalAmount)}</div>
      <div style="font-size: 8px; color: #666; margin-top: 2px;">Combined total</div>
    </div>
  </div>

  <!-- Invoice Preview Details -->
  <div class="section-title">Invoice Preview Details</div>
  <table class="invoices-table">
    <thead>
      <tr>
        <th style="width: 30%;">Customer Name</th>
        <th style="width: 15%;">Subscription Dues</th>
        <th style="width: 15%;">Credit Sales</th>
        <th style="width: 15%;">Total Amount</th>
        <th style="width: 15%;">Status</th>
        <th style="width: 10%;">Invoice No.</th>
      </tr>
    </thead>
    <tbody>
      ${sortedData.map(item => `
      <tr>
        <td>${item.customerName}</td>
        <td class="amount">${formatCurrency(item.subscriptionAmount)}</td>
        <td class="amount">${formatCurrency(item.creditSalesAmount)}</td>
        <td class="amount">${formatCurrency(item.totalAmount)}</td>
        <td>
          ${item.hasExistingInvoice
            ? `<span class="status-duplicate">DUPLICATE</span>`
            : item.totalAmount > 0
            ? `<span class="status-ready">READY</span>`
            : `<span class="status-no-amount">NO AMOUNT</span>`
          }
        </td>
        <td class="number">${item.existingInvoiceNumber || '-'}</td>
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
    console.error('Error generating invoice preview print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}