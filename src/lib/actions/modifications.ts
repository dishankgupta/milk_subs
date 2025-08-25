'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Modification } from '@/lib/types'
import { formatTimestampForDatabase, getCurrentISTDate } from '@/lib/date-utils'

export async function createModification(data: {
  customer_id: string
  product_id: string
  modification_type: 'Skip' | 'Increase' | 'Decrease'
  start_date: string
  end_date: string
  quantity_change?: number
  reason?: string
}) {
  try {
    const supabase = await createClient()
    
    const { data: modification, error } = await supabase
      .from('modifications')
      .insert({
        customer_id: data.customer_id,
        product_id: data.product_id,
        modification_type: data.modification_type,
        start_date: data.start_date,
        end_date: data.end_date,
        quantity_change: data.quantity_change || null,
        reason: data.reason || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/dashboard/modifications')
    revalidatePath('/dashboard/customers')
    return { success: true, data: modification }
  } catch (error) {
    console.error('Error creating modification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create modification' 
    }
  }
}

export async function getModifications({
  search = '',
  status = 'all',
  type = 'all',
  customer_id = ''
}: {
  search?: string
  status?: string
  type?: string
  customer_id?: string
} = {}) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('modifications')
      .select(`
        *,
        customer:customers(id, billing_name, contact_person),
        product:products(id, name, code)
      `)
      .order('start_date', { ascending: false })

    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    if (type !== 'all') {
      query = query.eq('modification_type', type)
    }

    if (search) {
      query = query.or(`customer.billing_name.ilike.%${search}%,customer.contact_person.ilike.%${search}%,product.name.ilike.%${search}%`)
    }

    const { data: modifications, error } = await query

    if (error) {
      throw error
    }

    return { success: true, data: modifications as Modification[] }
  } catch (error) {
    console.error('Error fetching modifications:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch modifications',
      data: []
    }
  }
}

export async function getModificationById(id: string) {
  try {
    const supabase = await createClient()
    
    const { data: modification, error } = await supabase
      .from('modifications')
      .select(`
        *,
        customer:customers(id, billing_name, contact_person, address, phone_primary),
        product:products(id, name, code, current_price)
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw error
    }

    return { success: true, data: modification as Modification }
  } catch (error) {
    console.error('Error fetching modification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Modification not found' 
    }
  }
}

export async function updateModification(id: string, data: {
  modification_type?: 'Skip' | 'Increase' | 'Decrease'
  start_date?: string
  end_date?: string
  quantity_change?: number
  reason?: string
  is_active?: boolean
}) {
  try {
    const supabase = await createClient()
    
    const { data: modification, error } = await supabase
      .from('modifications')
      .update({
        ...data,
        updated_at: formatTimestampForDatabase(getCurrentISTDate())
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/dashboard/modifications')
    revalidatePath('/dashboard/customers')
    return { success: true, data: modification }
  } catch (error) {
    console.error('Error updating modification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update modification' 
    }
  }
}

export async function deleteModification(id: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('modifications')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/dashboard/modifications')
    revalidatePath('/dashboard/customers')
    return { success: true }
  } catch (error) {
    console.error('Error deleting modification:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete modification' 
    }
  }
}

export async function toggleModificationStatus(id: string) {
  try {
    const supabase = await createClient()
    
    const { data: currentModification } = await supabase
      .from('modifications')
      .select('is_active')
      .eq('id', id)
      .single()

    if (!currentModification) {
      throw new Error('Modification not found')
    }

    const { data: modification, error } = await supabase
      .from('modifications')
      .update({ 
        is_active: !currentModification.is_active,
        updated_at: formatTimestampForDatabase(getCurrentISTDate())
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/dashboard/modifications')
    revalidatePath('/dashboard/customers')
    return { success: true, data: modification }
  } catch (error) {
    console.error('Error toggling modification status:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle modification status' 
    }
  }
}

export async function getActiveModificationsForDate(date: string) {
  try {
    const supabase = await createClient()
    
    const { data: modifications, error } = await supabase
      .from('modifications')
      .select(`
        *,
        customer:customers(id, billing_name),
        product:products(id, name, code)
      `)
      .eq('is_active', true)
      .lte('start_date', date)
      .gte('end_date', date)

    if (error) {
      throw error
    }

    return { success: true, data: modifications as Modification[] }
  } catch (error) {
    console.error('Error fetching active modifications:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch active modifications',
      data: []
    }
  }
}