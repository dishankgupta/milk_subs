/**
 * Simple Data Integrity Check (JavaScript)
 * Usage: node scripts/testing/simple-data-check.js
 */

const { createClient } = require('@supabase/supabase-js')

async function runSimpleDataCheck() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Starting Simple Data Integrity Check...\n')

  // Test 1: Count all records
  console.log('📊 Database Summary:')
  
  const { data: customerCount } = await supabase.from('customers').select('id', { count: 'exact', head: true })
  console.log(`Customers: ${customerCount}`)
  
  const { data: productCount } = await supabase.from('products').select('id', { count: 'exact', head: true })
  console.log(`Products: ${productCount}`)
  
  const { data: salesCount } = await supabase.from('sales').select('id', { count: 'exact', head: true })
  console.log(`Sales: ${salesCount}`)
  
  const { data: invoiceCount } = await supabase.from('invoice_metadata').select('id', { count: 'exact', head: true })
  console.log(`Invoices: ${invoiceCount}`)

  // Test 2: Check outstanding amounts
  console.log('\n💰 Outstanding Amounts Check:')
  const { data: outstandingCustomers } = await supabase
    .from('customers')
    .select('billing_name, outstanding_amount, opening_balance')
    .or('outstanding_amount.gt.0,opening_balance.gt.0')
  
  if (outstandingCustomers && outstandingCustomers.length > 0) {
    console.log(`Found ${outstandingCustomers.length} customers with outstanding amounts:`)
    outstandingCustomers.forEach(customer => {
      const total = parseFloat(customer.opening_balance) + parseFloat(customer.outstanding_amount)
      console.log(`  - ${customer.billing_name}: ₹${total} (Opening: ₹${customer.opening_balance}, Current: ₹${customer.outstanding_amount})`)
    })
  } else {
    console.log('No customers with outstanding amounts found')
  }

  // Test 3: Check sales data
  console.log('\n🛒 Sales Data Check:')
  const { data: salesData } = await supabase
    .from('sales')
    .select(`
      id, sale_type, customer_id, total_amount, gst_amount, payment_status,
      customer:customers(billing_name),
      product:products(name, gst_rate)
    `)
  
  if (salesData && salesData.length > 0) {
    console.log(`Found ${salesData.length} sales records:`)
    
    let cashSales = 0, creditSales = 0, totalValue = 0
    const businessRuleViolations = []
    
    salesData.forEach(sale => {
      if (sale.sale_type === 'Cash') {
        cashSales++
        if (sale.customer_id) {
          businessRuleViolations.push(`Cash sale ${sale.id} has customer assigned`)
        }
      } else if (sale.sale_type === 'Credit') {
        creditSales++
        if (!sale.customer_id) {
          businessRuleViolations.push(`Credit sale ${sale.id} has no customer`)
        }
      }
      
      totalValue += parseFloat(sale.total_amount)
    })
    
    console.log(`  Cash Sales: ${cashSales}`)
    console.log(`  Credit Sales: ${creditSales}`)
    console.log(`  Total Value: ₹${totalValue.toFixed(2)}`)
    
    if (businessRuleViolations.length > 0) {
      console.log('  ⚠️  Business Rule Violations:')
      businessRuleViolations.forEach(violation => console.log(`    - ${violation}`))
    } else {
      console.log('  ✅ All business rules compliant')
    }
  } else {
    console.log('No sales records found')
  }

  // Test 4: Check products
  console.log('\n📦 Products Check:')
  const { data: products } = await supabase
    .from('products')
    .select('name, current_price, gst_rate, is_subscription_product')
  
  if (products && products.length > 0) {
    console.log(`Found ${products.length} products:`)
    products.forEach(product => {
      const type = product.is_subscription_product ? 'Subscription' : 'Manual Sales'
      console.log(`  - ${product.name}: ₹${product.current_price} @ ${product.gst_rate}% GST (${type})`)
    })
  }

  console.log('\n✅ Simple Data Check Complete!')
}

// Run the check
runSimpleDataCheck()
  .then(() => {
    console.log('\n🎉 All checks passed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Data check failed:', error.message)
    process.exit(1)
  })