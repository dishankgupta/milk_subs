/**
 * Opening Balance Migration Script
 * 
 * This script imports opening balance data from a CSV file to update customer records
 * Usage: node -r ts-node/register scripts/migration/import-opening-balances.ts opening-balances.csv
 */

import fs from 'fs'
import csv from 'csv-parser'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

interface OpeningBalanceRow {
  customer_name: string
  billing_name: string
  opening_balance: number
  notes?: string
}

interface MigrationResult {
  total_records: number
  successful_updates: number
  failed_updates: number
  not_found_customers: number
  errors: string[]
}

export async function importOpeningBalances(csvFilePath: string): Promise<MigrationResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  const results: OpeningBalanceRow[] = []
  const migrationResult: MigrationResult = {
    total_records: 0,
    successful_updates: 0,
    failed_updates: 0,
    not_found_customers: 0,
    errors: []
  }

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(csvFilePath)) {
      reject(new Error(`CSV file not found: ${csvFilePath}`))
      return
    }

    console.log(`📁 Reading CSV file: ${csvFilePath}`)
    
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data: any) => {
        // Clean and validate data
        const row: OpeningBalanceRow = {
          customer_name: String(data.customer_name || '').trim(),
          billing_name: String(data.billing_name || '').trim(),
          opening_balance: parseFloat(String(data.opening_balance || '0')),
          notes: String(data.notes || '').trim() || undefined
        }
        
        // Skip invalid rows
        if (!row.billing_name || isNaN(row.opening_balance)) {
          migrationResult.errors.push(`Invalid row: ${JSON.stringify(data)}`)
          return
        }
        
        results.push(row)
      })
      .on('end', async () => {
        migrationResult.total_records = results.length
        console.log(`📊 Processing ${results.length} opening balance records...`)
        
        for (const [index, row] of results.entries()) {
          try {
            console.log(`[${index + 1}/${results.length}] Processing: ${row.billing_name}`)
            
            // Find customer by billing name (case-insensitive)
            const { data: customer, error: findError } = await supabase
              .from('customers')
              .select('id, billing_name, opening_balance')
              .ilike('billing_name', row.billing_name)
              .single()
            
            if (findError || !customer) {
              console.warn(`❌ Customer not found: ${row.billing_name}`)
              migrationResult.not_found_customers++
              migrationResult.errors.push(`Customer not found: ${row.billing_name}`)
              continue
            }
            
            // Update opening balance
            const { error: updateError } = await supabase
              .from('customers')
              .update({ 
                opening_balance: row.opening_balance,
                updated_at: new Date().toISOString()
              })
              .eq('id', customer.id)
            
            if (updateError) {
              console.error(`❌ Error updating ${row.billing_name}:`, updateError.message)
              migrationResult.failed_updates++
              migrationResult.errors.push(`Update failed for ${row.billing_name}: ${updateError.message}`)
            } else {
              console.log(`✅ Updated ${row.billing_name}: ₹${row.opening_balance} (was: ₹${customer.opening_balance})`)
              migrationResult.successful_updates++
            }
            
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))
            
          } catch (error) {
            console.error(`❌ Unexpected error for ${row.billing_name}:`, error)
            migrationResult.failed_updates++
            migrationResult.errors.push(`Unexpected error for ${row.billing_name}: ${error.message}`)
          }
        }
        
        // Print summary
        console.log('\n📋 Migration Summary:')
        console.log(`Total Records: ${migrationResult.total_records}`)
        console.log(`Successful Updates: ${migrationResult.successful_updates}`)
        console.log(`Failed Updates: ${migrationResult.failed_updates}`)
        console.log(`Customers Not Found: ${migrationResult.not_found_customers}`)
        console.log(`Total Errors: ${migrationResult.errors.length}`)
        
        if (migrationResult.errors.length > 0) {
          console.log('\n❌ Errors:')
          migrationResult.errors.forEach(error => console.log(`  - ${error}`))
        }
        
        resolve(migrationResult)
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`))
      })
  })
}

// CLI execution
if (require.main === module) {
  const csvFilePath = process.argv[2]
  
  if (!csvFilePath) {
    console.error('Usage: node -r ts-node/register scripts/migration/import-opening-balances.ts <csv-file-path>')
    process.exit(1)
  }
  
  const absolutePath = path.resolve(csvFilePath)
  
  importOpeningBalances(absolutePath)
    .then((result) => {
      console.log('\n✅ Migration completed successfully!')
      process.exit(result.failed_updates > 0 ? 1 : 0)
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error.message)
      process.exit(1)
    })
}