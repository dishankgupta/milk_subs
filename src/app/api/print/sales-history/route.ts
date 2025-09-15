import { NextRequest, NextResponse } from 'next/server'
import { getSales } from '@/lib/actions/sales'
import { formatDateIST, getCurrentISTDate } from '@/lib/date-utils'
import { formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Extract filter parameters
    const saleType = searchParams.get('sale_type')
    const paymentStatus = searchParams.get('payment_status')

    const filters = {
      search: searchParams.get('search') || '',
      customer_id: searchParams.get('customer_id') || '',
      product_id: searchParams.get('product_id') || '',
      sale_type: (saleType && ['Cash', 'Credit', 'QR'].includes(saleType)) ? saleType as 'Cash' | 'Credit' | 'QR' : undefined,
      payment_status: (paymentStatus && ['Completed', 'Pending', 'Billed'].includes(paymentStatus)) ? paymentStatus as 'Completed' | 'Pending' | 'Billed' : undefined,
      date_from: searchParams.get('date_from') || '',
      date_to: searchParams.get('date_to') || ''
    }
    
    // Sort parameters (for client-side sorting since getSales doesn't support server-side sorting)
    const sortBy = searchParams.get('sort_by') || 'sale_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // Fetch sales data with filters (get all records for printing)
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== '' && value !== undefined)
    )

    const salesData = await getSales({
      ...cleanFilters,
      limit: 10000 // Get all sales for printing
    })
    let { sales } = salesData

    // Apply client-side sorting
    sales = sales.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'sale_date':
          aValue = new Date(a.sale_date).getTime()
          bValue = new Date(b.sale_date).getTime()
          break
        case 'total_amount':
          aValue = a.total_amount
          bValue = b.total_amount
          break
        case 'customer':
          aValue = a.customer?.billing_name || ''
          bValue = b.customer?.billing_name || ''
          break
        case 'product':
          aValue = a.product?.name || ''
          bValue = b.product?.name || ''
          break
        default:
          aValue = a.sale_date
          bValue = b.sale_date
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    // Calculate summary statistics
    const totalSales = sales.length
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const totalGST = sales.reduce((sum, sale) => sum + (sale.gst_amount || 0), 0)
    
    // Revenue by sale type
    const revenueByType = sales.reduce((acc, sale) => {
      acc[sale.sale_type] = (acc[sale.sale_type] || 0) + sale.total_amount
      return acc
    }, {} as Record<string, number>)

    // Payment status distribution
    const statusDistribution = sales.reduce((acc, sale) => {
      acc[sale.payment_status] = (acc[sale.payment_status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Generate active filters summary
    const activeFilters: string[] = []
    if (filters.search) activeFilters.push(`Search: "${filters.search}"`)
    if (filters.sale_type) activeFilters.push(`Type: ${filters.sale_type}`)
    if (filters.payment_status) activeFilters.push(`Status: ${filters.payment_status}`)
    if (filters.date_from) activeFilters.push(`From: ${formatDateIST(new Date(filters.date_from))}`)
    if (filters.date_to) activeFilters.push(`To: ${formatDateIST(new Date(filters.date_to))}`)

    // Generate HTML
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sales History Report - PureDairy</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.4;
          color: #1f2937;
          background: white;
        }
        
        .print-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
        }
        
        .header h1 {
          font-size: 28px;
          color: #059669;
          margin-bottom: 8px;
        }
        
        .header h2 {
          font-size: 20px;
          color: #4b5563;
          margin-bottom: 12px;
        }
        
        .header .meta {
          color: #6b7280;
          font-size: 14px;
        }
        
        .filters-summary {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }
        
        .filters-title {
          font-weight: 600;
          margin-bottom: 8px;
          color: #374151;
        }
        
        .filters-list {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .filter-tag {
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
        }
        
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #059669;
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .revenue-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 30px;
        }
        
        .breakdown-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
        }
        
        .breakdown-title {
          font-weight: 600;
          margin-bottom: 12px;
          color: #374151;
        }
        
        .breakdown-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          font-size: 14px;
        }
        
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }
        
        .table th,
        .table td {
          padding: 8px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .table th {
          background-color: #f9fafb;
          font-weight: 600;
          color: #374151;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .table tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }
        
        .badge-completed {
          background: #d1fae5;
          color: #065f46;
        }
        
        .badge-pending {
          background: #fef3c7;
          color: #92400e;
        }
        
        .badge-billed {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .badge-cash {
          background: #dcfce7;
          color: #166534;
        }
        
        .badge-credit {
          background: #fed7aa;
          color: #9a3412;
        }
        
        .badge-qr {
          background: #e0e7ff;
          color: #3730a3;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        
        @media print {
          .print-container {
            padding: 15px;
          }
          
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .revenue-breakdown {
            grid-template-columns: 1fr;
          }
          
          .table {
            font-size: 10px;
          }
          
          .table th,
          .table td {
            padding: 6px 4px;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <!-- Header -->
        <div class="header">
          <h1>PureDairy</h1>
          <h2>Sales History Report</h2>
          <div class="meta">
            Generated on ${formatDateIST(getCurrentISTDate())} • Total Records: ${totalSales}
          </div>
        </div>

        <!-- Active Filters -->
        ${activeFilters.length > 0 ? `
        <div class="filters-summary">
          <div class="filters-title">Active Filters:</div>
          <div class="filters-list">
            ${activeFilters.map(filter => `<span class="filter-tag">${filter}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Summary Statistics -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${totalSales}</div>
            <div class="stat-label">Total Sales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(totalRevenue)}</div>
            <div class="stat-label">Total Revenue</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(totalGST)}</div>
            <div class="stat-label">Total GST</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${formatCurrency(totalRevenue - totalGST)}</div>
            <div class="stat-label">Base Amount</div>
          </div>
        </div>

        <!-- Revenue Breakdown -->
        <div class="revenue-breakdown">
          <div class="breakdown-card">
            <div class="breakdown-title">Revenue by Sale Type</div>
            ${Object.entries(revenueByType).map(([type, amount]) => `
              <div class="breakdown-item">
                <span>${type} Sales</span>
                <span>${formatCurrency(amount)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="breakdown-card">
            <div class="breakdown-title">Payment Status Distribution</div>
            ${Object.entries(statusDistribution).map(([status, count]) => `
              <div class="breakdown-item">
                <span>${status}</span>
                <span>${count} sale${count !== 1 ? 's' : ''}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Sales Table -->
        <table class="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Total Amount</th>
              <th>GST</th>
              <th>Type</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sales.map(sale => `
              <tr>
                <td>${formatDateIST(new Date(sale.sale_date))}</td>
                <td>${sale.customer ? sale.customer.billing_name : '-'}</td>
                <td>
                  <div style="font-weight: 500;">${sale.product?.name || 'Unknown'}</div>
                  ${sale.product?.code ? `<div style="color: #6b7280; font-size: 10px;">${sale.product.code}</div>` : ''}
                </td>
                <td>${sale.quantity} ${sale.product?.unit_of_measure || ''}</td>
                <td>${formatCurrency(sale.unit_price)}</td>
                <td style="font-weight: 600;">${formatCurrency(sale.total_amount)}</td>
                <td>${formatCurrency(sale.gst_amount || 0)}</td>
                <td><span class="badge badge-${sale.sale_type.toLowerCase()}">${sale.sale_type}</span></td>
                <td><span class="badge badge-${sale.payment_status.toLowerCase()}">${sale.payment_status}</span></td>
                <td style="font-size: 11px; max-width: 120px; word-wrap: break-word;">${sale.notes || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Footer -->
        <div class="footer">
          <p>PureDairy - Comprehensive Dairy Business Management System</p>
          <p>Report generated using filters and sorted by ${sortBy} (${sortOrder}ending)</p>
        </div>
      </div>

      <script>
        // Auto-print when page loads
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating sales history print report:', error)
    return new NextResponse('Error generating report', { status: 500 })
  }
}