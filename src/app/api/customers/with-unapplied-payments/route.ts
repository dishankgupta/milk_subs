import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get customers with unapplied payments using optimized query
    const { data: customers, error } = await supabase
      .from('unapplied_payments')
      .select(`
        customer_id,
        amount_unapplied,
        customer:customers (
          billing_name,
          contact_person,
          routes (
            name
          )
        )
      `)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
    }
    
    // Group by customer and calculate totals
    const customerMap = new Map()
    
    customers?.forEach(payment => {
      const customerId = payment.customer_id
      const customer = payment.customer as { 
        billing_name?: string
        contact_person?: string
        routes?: { name?: string }
      }
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          billing_name: customer?.billing_name || 'Unknown Customer',
          contact_person: customer?.contact_person || 'N/A',
          route_name: customer?.routes?.name,
          total_unapplied: 0,
          payment_count: 0
        })
      }
      
      const existing = customerMap.get(customerId)
      existing.total_unapplied += payment.amount_unapplied
      existing.payment_count += 1
    })
    
    // Convert map to array and sort by total unapplied amount (highest first)
    const customersWithUnapplied = Array.from(customerMap.values())
      .sort((a, b) => b.total_unapplied - a.total_unapplied)
    
    return NextResponse.json({
      customers: customersWithUnapplied,
      totalAmount: customersWithUnapplied.reduce((sum, customer) => sum + customer.total_unapplied, 0),
      totalCount: customers?.length || 0,
      customersCount: customersWithUnapplied.length
    })
    
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}