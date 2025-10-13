/**
 * Health Check API Endpoint
 * Used by Docker healthcheck and monitoring services
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'milk_subs',
      environment: process.env.NODE_ENV,
    },
    { status: 200 }
  )
}
