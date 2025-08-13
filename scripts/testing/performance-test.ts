/**
 * Performance Testing Script
 * 
 * This script tests the performance of key operations in the sales management system
 * Usage: node -r ts-node/register scripts/testing/performance-test.ts
 */

import { createClient } from '@supabase/supabase-js'
import { performance } from 'perf_hooks'

interface PerformanceTest {
  name: string
  description: string
  target_time_ms: number
  run: () => Promise<number>
}

interface PerformanceResult {
  test_name: string
  execution_time_ms: number
  target_time_ms: number
  status: 'PASS' | 'FAIL'
  performance_ratio: number // actual/target (lower is better)
}

interface PerformanceReport {
  timestamp: string
  total_tests: number
  passed_tests: number
  failed_tests: number
  results: PerformanceResult[]
  summary: {
    fastest_test: string
    slowest_test: string
    average_performance_ratio: number
  }
}

export async function runPerformanceTests(): Promise<PerformanceReport> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('⚡ Starting Performance Tests...\n')

  const tests: PerformanceTest[] = [
    {
      name: 'customer_list_load',
      description: 'Load customers list with pagination',
      target_time_ms: 500, // 500ms target
      run: async () => {
        const start = performance.now()
        
        await supabase
          .from('customers')
          .select(`
            id, billing_name, contact_person, phone_primary,
            route:routes(name),
            outstanding_amount, status
          `)
          .order('billing_name')
          .range(0, 49) // First 50 records
        
        return performance.now() - start
      }
    },

    {
      name: 'sales_history_query',
      description: 'Query sales history with filters and joins',
      target_time_ms: 800, // 800ms target
      run: async () => {
        const start = performance.now()
        
        await supabase
          .from('sales')
          .select(`
            id, quantity, unit_price, total_amount, gst_amount, 
            sale_type, sale_date, payment_status, notes,
            customer:customers(billing_name),
            product:products(name, gst_rate)
          `)
          .order('sale_date', { ascending: false })
          .range(0, 99) // First 100 records
        
        return performance.now() - start
      }
    },

    {
      name: 'outstanding_report_generation',
      description: 'Generate outstanding amounts report',
      target_time_ms: 2000, // 2 second target
      run: async () => {
        const start = performance.now()
        
        // Simulate outstanding report query
        const { data: customers } = await supabase
          .from('customers')
          .select(`
            id, billing_name, opening_balance, outstanding_amount,
            sales:sales!sales_customer_id_fkey(total_amount, sale_type, sale_date),
            payments:payments!payments_customer_id_fkey(amount, payment_date)
          `)
          .or('outstanding_amount.gt.0,opening_balance.gt.0')
        
        // Process data (simulate report calculation)
        for (const customer of customers || []) {
          const creditSales = customer.sales?.filter(s => s.sale_type === 'Credit') || []
          const totalPayments = customer.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0
          const totalOutstanding = parseFloat(customer.opening_balance) + parseFloat(customer.outstanding_amount)
          
          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 1))
        }
        
        return performance.now() - start
      }
    },

    {
      name: 'invoice_data_collection',
      description: 'Collect invoice data for a customer',
      target_time_ms: 1000, // 1 second target
      run: async () => {
        const start = performance.now()
        
        // Get a test customer
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .limit(1)
          .single()
        
        if (!customer) return performance.now() - start
        
        // Simulate invoice data collection
        const startDate = new Date('2025-08-01')
        const endDate = new Date('2025-08-31')
        
        // Get subscription data (simulated)
        await supabase
          .from('daily_orders')
          .select(`
            id, order_date, planned_quantity, unit_price, total_amount,
            product:products(name, gst_rate)
          `)
          .eq('customer_id', customer.id)
          .gte('order_date', startDate.toISOString().split('T')[0])
          .lte('order_date', endDate.toISOString().split('T')[0])
        
        // Get manual sales data
        await supabase
          .from('sales')
          .select(`
            id, quantity, unit_price, total_amount, gst_amount, sale_date,
            product:products(name, gst_rate)
          `)
          .eq('customer_id', customer.id)
          .gte('sale_date', startDate.toISOString().split('T')[0])
          .lte('sale_date', endDate.toISOString().split('T')[0])
        
        return performance.now() - start
      }
    },

    {
      name: 'bulk_outstanding_calculation',
      description: 'Calculate outstanding amounts for all customers',
      target_time_ms: 3000, // 3 second target
      run: async () => {
        const start = performance.now()
        
        // Get all customers with sales and payments
        const { data: customers } = await supabase
          .from('customers')
          .select(`
            id, billing_name, opening_balance, outstanding_amount,
            sales:sales!sales_customer_id_fkey(total_amount, sale_type, payment_status),
            payments:payments!payments_customer_id_fkey(amount)
          `)
          .limit(50) // Test with 50 customers
        
        // Calculate outstanding for each customer
        const calculations = []
        for (const customer of customers || []) {
          const creditSales = customer.sales
            ?.filter(sale => sale.sale_type === 'Credit' && sale.payment_status === 'Pending')
            ?.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) || 0
          
          const totalPayments = customer.payments
            ?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0
          
          const calculatedOutstanding = parseFloat(customer.opening_balance) + creditSales - totalPayments
          
          calculations.push({
            customer_id: customer.id,
            calculated_outstanding: calculatedOutstanding,
            stored_outstanding: parseFloat(customer.outstanding_amount)
          })
        }
        
        return performance.now() - start
      }
    },

    {
      name: 'product_search_and_gst',
      description: 'Search products and calculate GST',
      target_time_ms: 200, // 200ms target
      run: async () => {
        const start = performance.now()
        
        // Search products
        await supabase
          .from('products')
          .select('id, name, current_price, gst_rate, unit_of_measure')
          .eq('is_subscription_product', false)
        
        // Simulate GST calculations for different quantities
        const gstCalculations = []
        for (let i = 1; i <= 10; i++) {
          const quantity = i * 10
          const price = 15.00
          const gstRate = 0.05
          
          const totalAmount = quantity * price
          const baseAmount = totalAmount / (1 + gstRate)
          const gstAmount = totalAmount - baseAmount
          
          gstCalculations.push({ quantity, totalAmount, baseAmount, gstAmount })
        }
        
        return performance.now() - start
      }
    }
  ]

  const results: PerformanceResult[] = []

  for (const test of tests) {
    console.log(`Running: ${test.name} (target: ${test.target_time_ms}ms)`)
    
    try {
      // Run test 3 times and take average
      const runs = []
      for (let i = 0; i < 3; i++) {
        const executionTime = await test.run()
        runs.push(executionTime)
      }
      
      const avgExecutionTime = runs.reduce((sum, time) => sum + time, 0) / runs.length
      const performanceRatio = avgExecutionTime / test.target_time_ms
      
      const result: PerformanceResult = {
        test_name: test.name,
        execution_time_ms: Math.round(avgExecutionTime),
        target_time_ms: test.target_time_ms,
        status: avgExecutionTime <= test.target_time_ms ? 'PASS' : 'FAIL',
        performance_ratio: Math.round(performanceRatio * 100) / 100
      }
      
      results.push(result)
      
      const statusEmoji = result.status === 'PASS' ? '✅' : '❌'
      console.log(`${statusEmoji} ${test.name}: ${result.execution_time_ms}ms (ratio: ${result.performance_ratio}x)`)
      
    } catch (error) {
      console.error(`❌ ${test.name}: Error - ${error.message}`)
      results.push({
        test_name: test.name,
        execution_time_ms: 0,
        target_time_ms: test.target_time_ms,
        status: 'FAIL',
        performance_ratio: Infinity
      })
    }
  }

  const report: PerformanceReport = {
    timestamp: new Date().toISOString(),
    total_tests: results.length,
    passed_tests: results.filter(r => r.status === 'PASS').length,
    failed_tests: results.filter(r => r.status === 'FAIL').length,
    results,
    summary: {
      fastest_test: results.reduce((fastest, current) => 
        current.execution_time_ms < fastest.execution_time_ms ? current : fastest
      ).test_name,
      slowest_test: results.reduce((slowest, current) => 
        current.execution_time_ms > slowest.execution_time_ms ? current : slowest
      ).test_name,
      average_performance_ratio: results.reduce((sum, r) => sum + r.performance_ratio, 0) / results.length
    }
  }

  return report
}

// CLI execution
if (require.main === module) {
  runPerformanceTests()
    .then((report) => {
      console.log('\n⚡ Performance Test Report')
      console.log('==========================')
      console.log(`Timestamp: ${report.timestamp}`)
      console.log(`Total Tests: ${report.total_tests}`)
      console.log(`Passed: ${report.passed_tests}`)
      console.log(`Failed: ${report.failed_tests}`)
      console.log(`Fastest Test: ${report.summary.fastest_test}`)
      console.log(`Slowest Test: ${report.summary.slowest_test}`)
      console.log(`Average Performance Ratio: ${Math.round(report.summary.average_performance_ratio * 100) / 100}x`)
      
      console.log('\n📊 Individual Results:')
      for (const result of report.results) {
        const statusEmoji = result.status === 'PASS' ? '✅' : '❌'
        console.log(`${statusEmoji} ${result.test_name}: ${result.execution_time_ms}ms / ${result.target_time_ms}ms (${result.performance_ratio}x)`)
      }
      
      console.log('\n💡 Performance Recommendations:')
      const slowTests = report.results.filter(r => r.performance_ratio > 1.5)
      if (slowTests.length > 0) {
        console.log('Consider optimizing these tests:')
        slowTests.forEach(test => {
          console.log(`  - ${test.test_name}: ${test.performance_ratio}x slower than target`)
        })
      } else {
        console.log('All tests are performing well!')
      }
      
      process.exit(report.failed_tests > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('\n❌ Performance testing failed:', error.message)
      process.exit(1)
    })
}