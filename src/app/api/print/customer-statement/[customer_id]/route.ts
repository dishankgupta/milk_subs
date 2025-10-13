import { NextRequest, NextResponse } from 'next/server'
import { getCurrentISTDate } from '@/lib/date-utils'
import { formatDateForAPI } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ customer_id: string }> }
) {
  try {
    const params = await context.params
    const customerId = params.customer_id

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    // Calculate current Financial Year (April 1 to Today)
    const today = getCurrentISTDate()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-indexed (0 = January, 3 = April)

    // If current month is before April (Jan-Mar), FY started last year
    // If current month is April or later, FY started this year
    const fyStartYear = currentMonth < 3 ? currentYear - 1 : currentYear
    const fyStartDate = new Date(fyStartYear, 3, 1) // April 1 (month 3 is April in 0-indexed)

    // Redirect to outstanding-report API with financial year period
    const redirectUrl = new URL('/api/print/outstanding-report', request.url)
    redirectUrl.searchParams.set('type', 'statements')
    redirectUrl.searchParams.set('start_date', formatDateForAPI(fyStartDate))
    redirectUrl.searchParams.set('end_date', formatDateForAPI(today))
    redirectUrl.searchParams.set('customer_selection', 'selected')
    redirectUrl.searchParams.set('selected_customer_ids', customerId)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Error generating customer statement:', error)
    return NextResponse.json(
      { error: 'Failed to generate customer statement' },
      { status: 500 }
    )
  }
}
