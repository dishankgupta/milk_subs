import { NextRequest, NextResponse } from 'next/server'
import { quickPaySale } from '@/lib/actions/sales'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const saleId = formData.get('saleId') as string
    const paymentDateStr = formData.get('paymentDate') as string
    const paymentMethod = formData.get('paymentMethod') as string

    if (!saleId || !paymentDateStr || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const paymentDate = new Date(paymentDateStr)

    const result = await quickPaySale(saleId, paymentDate, paymentMethod)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, payment: result.payment })
  } catch (error) {
    console.error('Quick pay API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}