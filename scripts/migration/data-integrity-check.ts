/**
 * Data Integrity Check Script
 * 
 * This script validates the integrity of the sales management system data
 * Usage: node -r ts-node/register scripts/migration/data-integrity-check.ts
 */

import { createClient } from '@supabase/supabase-js'

interface IntegrityCheckResult {
  check: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  details: any[]
  message?: string
}

interface IntegrityReport {
  timestamp: string
  overall_status: 'HEALTHY' | 'ISSUES_DETECTED' | 'CRITICAL_ISSUES'
  checks: IntegrityCheckResult[]
  summary: {
    total_checks: number
    passed: number
    failed: number
    warnings: number
  }
}

export async function runDataIntegrityChecks(): Promise<IntegrityReport> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Starting Data Integrity Checks...\n')

  const checks: (() => Promise<IntegrityCheckResult>)[] = [
    // Check 1: Outstanding Amount Accuracy
    async () => {
      console.log('Checking outstanding amount accuracy...')
      try {
        const { data, error } = await supabase.rpc('check_outstanding_accuracy')
        
        if (error) {
          // Fallback to manual check if RPC doesn't exist
          const { data: customers, error: fetchError } = await supabase
            .from('customers')
            .select(`
              id, billing_name, outstanding_amount, opening_balance,
              sales:sales!sales_customer_id_fkey(total_amount, sale_type, payment_status),
              payments:payments!payments_customer_id_fkey(amount)
            `)

          if (fetchError) throw fetchError

          const inconsistencies = []
          
          for (const customer of customers || []) {
            const creditSales = customer.sales
              ?.filter(sale => sale.sale_type === 'Credit' && sale.payment_status === 'Pending')
              ?.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0) || 0
            
            const expectedOutstanding = creditSales
            const actualOutstanding = parseFloat(customer.outstanding_amount)
            
            if (Math.abs(expectedOutstanding - actualOutstanding) > 0.01) {
              inconsistencies.push({
                customer: customer.billing_name,
                expected: expectedOutstanding,
                actual: actualOutstanding,
                difference: Math.abs(expectedOutstanding - actualOutstanding)
              })
            }
          }

          return {
            check: 'outstanding_amounts',
            status: inconsistencies.length === 0 ? 'PASS' : 'FAIL',
            details: inconsistencies,
            message: inconsistencies.length === 0 
              ? 'All outstanding amounts are accurate' 
              : `Found ${inconsistencies.length} inconsistencies`
          }
        }

        return {
          check: 'outstanding_amounts',
          status: data?.length === 0 ? 'PASS' : 'FAIL',
          details: data || [],
          message: data?.length === 0 ? 'All outstanding amounts are accurate' : `Found ${data?.length} inconsistencies`
        }
      } catch (error) {
        return {
          check: 'outstanding_amounts',
          status: 'FAIL',
          details: [(error as Error).message],
          message: 'Error checking outstanding amounts'
        }
      }
    },

    // Check 2: GST Calculation Accuracy
    async () => {
      console.log('Checking GST calculation accuracy...')
      try {
        const { data: sales, error } = await supabase
          .from('sales')
          .select(`
            id, quantity, unit_price, total_amount, gst_amount,
            product:products!sales_product_id_fkey(name, gst_rate)
          `)

        if (error) throw error

        const errors = []

        for (const sale of sales || []) {
          const product = Array.isArray(sale.product) ? null : sale.product as { name: string; gst_rate: string }
          if (!product) continue

          const totalAmount = parseFloat(sale.total_amount)
          const gstAmount = parseFloat(sale.gst_amount)
          const gstRate = parseFloat(product.gst_rate) / 100

          // Calculate expected GST (inclusive pricing)
          const baseAmount = totalAmount / (1 + gstRate)
          const expectedGstAmount = totalAmount - baseAmount

          if (Math.abs(expectedGstAmount - gstAmount) > 0.01) {
            errors.push({
              sale_id: sale.id,
              product: product.name,
              total_amount: totalAmount,
              expected_gst: expectedGstAmount,
              actual_gst: gstAmount,
              difference: Math.abs(expectedGstAmount - gstAmount)
            })
          }
        }

        return {
          check: 'gst_calculations',
          status: errors.length === 0 ? 'PASS' : 'FAIL',
          details: errors,
          message: errors.length === 0 
            ? 'All GST calculations are accurate' 
            : `Found ${errors.length} GST calculation errors`
        }
      } catch (error) {
        return {
          check: 'gst_calculations',
          status: 'FAIL',
          details: [(error as Error).message],
          message: 'Error checking GST calculations'
        }
      }
    },

    // Check 3: Foreign Key Consistency
    async () => {
      console.log('Checking foreign key consistency...')
      try {
        const orphanChecks = []

        // Check orphaned sales records
        const { data: orphanedSales, error: salesError } = await supabase
          .from('sales')
          .select('id, customer_id, product_id')
          .or('customer_id.not.is.null,product_id.is.null')

        if (salesError) throw salesError

        const orphanedSalesFiltered = []
        for (const sale of orphanedSales || []) {
          if (sale.customer_id) {
            const { data: customer } = await supabase
              .from('customers')
              .select('id')
              .eq('id', sale.customer_id)
              .single()
            if (!customer) orphanedSalesFiltered.push({ ...sale, issue: 'missing_customer' })
          }

          const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('id', sale.product_id)
            .single()
          if (!product) orphanedSalesFiltered.push({ ...sale, issue: 'missing_product' })
        }

        // Check orphaned invoice metadata
        const { data: orphanedInvoices, error: invoiceError } = await supabase.rpc('check_orphaned_invoices')
        
        if (invoiceError) {
          // Fallback manual check
          const { data: invoices } = await supabase.from('invoice_metadata').select('id, customer_id')
          const orphanedInvoicesFiltered = []
          
          for (const invoice of invoices || []) {
            const { data: customer } = await supabase
              .from('customers')
              .select('id')
              .eq('id', invoice.customer_id)
              .single()
            if (!customer) orphanedInvoicesFiltered.push(invoice)
          }
          orphanChecks.push(...orphanedInvoicesFiltered.map(i => ({ ...i, type: 'invoice' })))
        } else {
          orphanChecks.push(...(orphanedInvoices || []))
        }

        orphanChecks.push(...orphanedSalesFiltered.map(s => ({ ...s, type: 'sale' })))

        return {
          check: 'foreign_keys',
          status: orphanChecks.length === 0 ? 'PASS' : 'FAIL',
          details: orphanChecks,
          message: orphanChecks.length === 0 
            ? 'All foreign key relationships are consistent' 
            : `Found ${orphanChecks.length} orphaned records`
        }
      } catch (error) {
        return {
          check: 'foreign_keys',
          status: 'FAIL',
          details: [(error as Error).message],
          message: 'Error checking foreign key consistency'
        }
      }
    },

    // Check 4: Business Rule Compliance
    async () => {
      console.log('Checking business rule compliance...')
      try {
        const violations = []

        // Check Cash sales without customers and Credit sales with customers
        const { data: sales, error } = await supabase
          .from('sales')
          .select('id, sale_type, customer_id')

        if (error) throw error

        for (const sale of sales || []) {
          if (sale.sale_type === 'Cash' && sale.customer_id) {
            violations.push({
              sale_id: sale.id,
              violation: 'Cash sale has customer assigned',
              rule: 'Cash sales should not have customer_id'
            })
          }
          
          if (sale.sale_type === 'Credit' && !sale.customer_id) {
            violations.push({
              sale_id: sale.id,
              violation: 'Credit sale without customer',
              rule: 'Credit sales must have customer_id'
            })
          }
        }

        return {
          check: 'business_rules',
          status: violations.length === 0 ? 'PASS' : 'FAIL',
          details: violations,
          message: violations.length === 0 
            ? 'All business rules are complied with' 
            : `Found ${violations.length} business rule violations`
        }
      } catch (error) {
        return {
          check: 'business_rules',
          status: 'FAIL',
          details: [(error as Error).message],
          message: 'Error checking business rule compliance'
        }
      }
    },

    // Check 5: Data Completeness
    async () => {
      console.log('Checking data completeness...')
      try {
        const issues = []

        // Check for required fields
        const { data: customers, error: customerError } = await supabase
          .from('customers')
          .select('id, billing_name, contact_person, phone_primary')
          .or('billing_name.is.null,contact_person.is.null,phone_primary.is.null')

        if (customerError) throw customerError

        for (const customer of customers || []) {
          const missingFields = []
          if (!customer.billing_name) missingFields.push('billing_name')
          if (!customer.contact_person) missingFields.push('contact_person')
          if (!customer.phone_primary) missingFields.push('phone_primary')
          
          if (missingFields.length > 0) {
            issues.push({
              type: 'customer',
              id: customer.id,
              missing_fields: missingFields
            })
          }
        }

        // Check products
        const { data: products, error: productError } = await supabase
          .from('products')
          .select('id, name, current_price, gst_rate')
          .or('name.is.null,current_price.is.null,gst_rate.is.null')

        if (productError) throw productError

        for (const product of products || []) {
          const missingFields = []
          if (!product.name) missingFields.push('name')
          if (!product.current_price) missingFields.push('current_price')
          if (product.gst_rate === null) missingFields.push('gst_rate')
          
          if (missingFields.length > 0) {
            issues.push({
              type: 'product',
              id: product.id,
              missing_fields: missingFields
            })
          }
        }

        return {
          check: 'data_completeness',
          status: issues.length === 0 ? 'PASS' : 'WARNING',
          details: issues,
          message: issues.length === 0 
            ? 'All required fields are complete' 
            : `Found ${issues.length} records with missing required fields`
        }
      } catch (error) {
        return {
          check: 'data_completeness',
          status: 'FAIL',
          details: [(error as Error).message],
          message: 'Error checking data completeness'
        }
      }
    }
  ]

  const results = await Promise.all(checks.map(check => check()))

  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    overall_status: 'HEALTHY',
    checks: results,
    summary: {
      total_checks: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      warnings: results.filter(r => r.status === 'WARNING').length
    }
  }

  // Determine overall status
  if (report.summary.failed > 0) {
    report.overall_status = 'CRITICAL_ISSUES'
  } else if (report.summary.warnings > 0) {
    report.overall_status = 'ISSUES_DETECTED'
  }

  return report
}

// CLI execution
if (require.main === module) {
  runDataIntegrityChecks()
    .then((report) => {
      console.log('\n📊 Data Integrity Report')
      console.log('========================')
      console.log(`Timestamp: ${report.timestamp}`)
      console.log(`Overall Status: ${report.overall_status}`)
      console.log(`Total Checks: ${report.summary.total_checks}`)
      console.log(`Passed: ${report.summary.passed}`)
      console.log(`Failed: ${report.summary.failed}`)
      console.log(`Warnings: ${report.summary.warnings}`)
      
      console.log('\n📋 Detailed Results:')
      for (const check of report.checks) {
        const statusEmoji = check.status === 'PASS' ? '✅' : check.status === 'WARNING' ? '⚠️' : '❌'
        console.log(`${statusEmoji} ${check.check}: ${check.message}`)
        
        if (check.details.length > 0 && check.status !== 'PASS') {
          console.log(`   Details: ${JSON.stringify(check.details.slice(0, 3), null, 2)}`)
          if (check.details.length > 3) {
            console.log(`   ... and ${check.details.length - 3} more`)
          }
        }
      }
      
      process.exit(report.overall_status === 'CRITICAL_ISSUES' ? 1 : 0)
    })
    .catch((error) => {
      console.error('\n❌ Integrity check failed:', error.message)
      process.exit(1)
    })
}