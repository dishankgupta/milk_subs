import { NextRequest } from 'next/server'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const priorityFilter = searchParams.get('priority_filter') // 'high', 'medium', 'low', or null for all
    
    const supabase = await createClient()
    
    // Get customers with outstanding amounts
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .gt('outstanding_amount', 0)
      .order('outstanding_amount', { ascending: false })

    if (error) {
      throw error
    }

    if (!customers) {
      return new Response('No customers found', { status: 404 })
    }

    // Filter by priority if specified
    let filteredCustomers = customers
    if (priorityFilter) {
      switch (priorityFilter) {
        case 'high':
          filteredCustomers = customers.filter(c => c.outstanding_amount >= 5000)
          break
        case 'medium':
          filteredCustomers = customers.filter(c => c.outstanding_amount >= 1000 && c.outstanding_amount < 5000)
          break
        case 'low':
          filteredCustomers = customers.filter(c => c.outstanding_amount > 0 && c.outstanding_amount < 1000)
          break
      }
    }

    // Calculate statistics
    const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + c.outstanding_amount, 0)
    const averageOutstanding = filteredCustomers.length > 0 ? totalOutstanding / filteredCustomers.length : 0
    
    // Priority breakdown
    const ranges = {
      high: customers.filter(c => c.outstanding_amount >= 5000),
      medium: customers.filter(c => c.outstanding_amount >= 1000 && c.outstanding_amount < 5000),
      low: customers.filter(c => c.outstanding_amount > 0 && c.outstanding_amount < 1000)
    }

    const priorityName = priorityFilter ? 
      (priorityFilter === 'high' ? 'High Priority (≥₹5,000)' : 
       priorityFilter === 'medium' ? 'Medium Priority (₹1,000-₹4,999)' :
       'Low Priority (₹1-₹999)') : 
      'All Customers'
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Outstanding Amounts Report - ${priorityName}</title>
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
      color: #dc2626;
    }
    
    .stat-card.priority-high .value { color: #dc2626; }
    .stat-card.priority-medium .value { color: #ea580c; }
    .stat-card.priority-low .value { color: #22c55e; }
    
    .customers-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
    }
    
    .customers-table th,
    .customers-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #e9ecef;
      font-size: 10px;
    }
    
    .customers-table th {
      background: #22c55e;
      color: white;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9px;
    }
    
    .customers-table tr:nth-child(even) {
      background: #f8f9fa;
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
      max-width: 150px;
      word-wrap: break-word;
    }
    
    .phone {
      font-weight: bold;
    }
    
    .amount {
      font-weight: bold;
      text-align: right;
    }
    
    .amount.high { color: #dc2626; }
    .amount.medium { color: #ea580c; }
    .amount.low { color: #22c55e; }
    
    .priority-badge {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .priority-badge.high {
      background: #dc2626;
      color: white;
    }
    
    .priority-badge.medium {
      background: #ea580c;
      color: white;
    }
    
    .priority-badge.low {
      background: #22c55e;
      color: white;
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
      .customers-table { break-inside: avoid; }
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
      <h2>Outstanding Amounts Report</h2>
      <p>Filter: ${priorityName}</p>
      <p>Generated: ${format(new Date(), 'PPP p')}</p>
      <p>Page 1</p>
    </div>
  </div>

  ${filteredCustomers.length === 0 ? `
  <div class="no-data">
    <h3>Great News!</h3>
    <p>No customers have outstanding payment amounts ${priorityFilter ? `in the ${priorityName.toLowerCase()} category` : ''} at this time.</p>
  </div>
  ` : `
  <!-- Summary Statistics -->
  <div class="summary-stats">
    <div class="stat-card">
      <h3>Total Outstanding</h3>
      <div class="value">${formatCurrency(totalOutstanding)}</div>
    </div>
    <div class="stat-card">
      <h3>Customers</h3>
      <div class="value">${filteredCustomers.length}</div>
    </div>
    <div class="stat-card">
      <h3>Average Outstanding</h3>
      <div class="value">${formatCurrency(averageOutstanding)}</div>
    </div>
    <div class="stat-card">
      <h3>High Priority</h3>
      <div class="value priority-high">${ranges.high.length}</div>
    </div>
  </div>

  <!-- Priority Summary -->
  ${!priorityFilter ? `
  <div class="section">
    <div class="section-title">Priority Breakdown</div>
    <div class="summary-stats" style="grid-template-columns: repeat(3, 1fr);">
      <div class="stat-card priority-high">
        <h3>High Priority</h3>
        <div class="value">${ranges.high.length}</div>
        <p style="font-size: 9px; margin-top: 3px;">≥ ₹5,000</p>
      </div>
      <div class="stat-card priority-medium">
        <h3>Medium Priority</h3>
        <div class="value">${ranges.medium.length}</div>
        <p style="font-size: 9px; margin-top: 3px;">₹1,000-₹4,999</p>
      </div>
      <div class="stat-card priority-low">
        <h3>Low Priority</h3>
        <div class="value">${ranges.low.length}</div>
        <p style="font-size: 9px; margin-top: 3px;">₹1-₹999</p>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Customers Table -->
  <div class="section">
    <div class="section-title">${priorityName} Customers</div>
    <table class="customers-table">
      <thead>
        <tr>
          <th style="width: 25%;">Customer Details</th>
          <th style="width: 25%;">Address</th>
          <th style="width: 15%;">Phone</th>
          <th style="width: 10%;">Route</th>
          <th style="width: 10%;">Priority</th>
          <th style="width: 15%;">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        ${filteredCustomers.map(customer => {
          const priority = customer.outstanding_amount >= 5000 ? 'high' : 
                          customer.outstanding_amount >= 1000 ? 'medium' : 'low'
          const priorityLabel = priority === 'high' ? 'High' : 
                               priority === 'medium' ? 'Medium' : 'Low'
          
          return `
          <tr>
            <td>
              <div class="customer-name">${customer.billing_name}</div>
              ${customer.contact_person ? `<div class="contact-info">Contact: ${customer.contact_person}</div>` : ''}
            </td>
            <td>
              <div class="address">${customer.address || 'Address not provided'}</div>
            </td>
            <td class="phone">${customer.phone_primary || 'Not provided'}</td>
            <td>Route ${customer.route_id || 'N/A'}</td>
            <td>
              <span class="priority-badge ${priority}">${priorityLabel}</span>
            </td>
            <td class="amount ${priority}">${formatCurrency(customer.outstanding_amount)}</td>
          </tr>
          `
        }).join('')}
      </tbody>
    </table>
  </div>
  `}

  <!-- Footer -->
  <div class="footer">
    <div>PureDairy - Outstanding Amounts Report | Generated on ${format(new Date(), 'PPP')}</div>
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
    console.error('Error generating outstanding amounts print:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}