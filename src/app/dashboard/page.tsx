import { getDashboardData } from '@/lib/actions/dashboard'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'
import {
  CalendarPlus,
  FileText,
  Truck,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'

export default async function DashboardPage() {
  const dashboardData = await getDashboardData()
  const {
    todayOperations,
    yesterdayOperations,
    weekComparison,
    topOutstandingCustomers,
    topValueCustomers,
    invoiceBreakdown,
    routePerformance,
    basicStats
  } = dashboardData

  // Calculate delivery completion percentage
  const deliveryCompletionRate = todayOperations.ordersGenerated > 0
    ? Math.round((todayOperations.deliveriesCompleted / todayOperations.ordersGenerated) * 100)
    : 0

  const yesterdayDeliveryCompletionRate = yesterdayOperations.ordersGenerated > 0
    ? Math.round((yesterdayOperations.deliveriesCompleted / yesterdayOperations.ordersGenerated) * 100)
    : 0

  // Estimated today revenue (based on 7-day average)
  const estimatedTodayRevenue = weekComparison.thisWeekRevenue / 7

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Image
            src="/PureDairy_Logo-removebg-preview.png"
            alt="PureDairy Logo"
            width={80}
            height={80}
            className="object-contain"
            priority
          />
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">PureDairy Dashboard</h1>
            <p className="text-gray-600 mt-1">Your daily operations at a glance</p>
          </div>
        </div>

        {/* Today's Operations Alert Box */}
        <div className="bg-white border-2 border-orange-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Today&apos;s Operations
            </h2>
            <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Orders Generated */}
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{todayOperations.ordersGenerated}</div>
              <div className="text-xs text-gray-600 mt-1">Orders Generated</div>
            </div>

            {/* Deliveries Completed */}
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {todayOperations.deliveriesCompleted}
                <span className="text-sm text-gray-500">/{todayOperations.ordersGenerated}</span>
              </div>
              <div className="text-xs text-gray-600 mt-1">Deliveries Done</div>
              {todayOperations.ordersGenerated > 0 && (
                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${deliveryCompletionRate}%` }}
                  />
                </div>
              )}
            </div>

            {/* Today Revenue */}
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(todayOperations.todayRevenue)}</div>
              <div className="text-xs text-gray-600 mt-1">Revenue Today</div>
              <div className="text-xs text-gray-400">Est: {formatCurrency(estimatedTodayRevenue)}</div>
            </div>

            {/* Pending Deliveries */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${todayOperations.pendingDeliveries > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                {todayOperations.pendingDeliveries}
              </div>
              <div className="text-xs text-gray-600 mt-1">Pending</div>
            </div>

            {/* Payments Received */}
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(todayOperations.paymentsReceived)}</div>
              <div className="text-xs text-gray-600 mt-1">Payments Received</div>
            </div>

            {/* Active Modifications */}
            <div className="text-center">
              <div className={`text-2xl font-bold ${todayOperations.activeModifications > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {todayOperations.activeModifications}
              </div>
              <div className="text-xs text-gray-600 mt-1">Modifications</div>
            </div>
          </div>
        </div>

        {/* Yesterday's Operations */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              Yesterday&apos;s Operations
            </h2>
            <span className="text-xs text-gray-400">{new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Orders Generated */}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">{yesterdayOperations.ordersGenerated}</div>
              <div className="text-xs text-gray-500 mt-1">Orders Generated</div>
            </div>

            {/* Deliveries Completed */}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">
                {yesterdayOperations.deliveriesCompleted}
                <span className="text-sm text-gray-400">/{yesterdayOperations.ordersGenerated}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Deliveries Done</div>
              {yesterdayOperations.ordersGenerated > 0 && (
                <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-gray-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${yesterdayDeliveryCompletionRate}%` }}
                  />
                </div>
              )}
            </div>

            {/* Yesterday Revenue */}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">{formatCurrency(yesterdayOperations.yesterdayRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">Revenue</div>
            </div>

            {/* Payments Received */}
            <div className="text-center">
              <div className="text-xl font-bold text-gray-600">{formatCurrency(yesterdayOperations.paymentsReceived)}</div>
              <div className="text-xs text-gray-500 mt-1">Payments Received</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <Link
              href="/dashboard/orders/generate"
              className="bg-blue-500 hover:bg-blue-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <CalendarPlus className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Generate Orders</h3>
                  <p className="text-blue-100 text-xs">Create today&apos;s orders</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/reports/delivery"
              className="bg-green-500 hover:bg-green-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <FileText className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Route Report</h3>
                  <p className="text-green-100 text-xs">View delivery routes</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/deliveries/new"
              className="bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <Truck className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Mark Deliveries</h3>
                  <p className="text-orange-100 text-xs">Confirm deliveries</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/sales/new"
              className="bg-purple-500 hover:bg-purple-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <ShoppingCart className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Record Sale</h3>
                  <p className="text-purple-100 text-xs">Add manual sale</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/modifications/bulk"
              className="bg-yellow-500 hover:bg-yellow-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <CalendarPlus className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Bulk Modifications</h3>
                  <p className="text-yellow-100 text-xs">Add multiple changes</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/sales/bulk"
              className="bg-indigo-500 hover:bg-indigo-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <ShoppingCart className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Bulk Sales</h3>
                  <p className="text-indigo-100 text-xs">Add multiple sales</p>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/payments/bulk"
              className="bg-pink-500 hover:bg-pink-600 text-white p-5 rounded-lg shadow transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <div className="flex items-center">
                <FileText className="h-7 w-7 mr-3" />
                <div>
                  <h3 className="font-bold text-base">Bulk Payments</h3>
                  <p className="text-pink-100 text-xs">Add multiple payments</p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              {weekComparison.revenueChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              Week-over-Week Performance
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-gray-600">This Week</span>
                  <span className="text-lg font-bold text-gray-900">{formatCurrency(weekComparison.thisWeekRevenue)}</span>
                </div>
                <div className="text-xs text-gray-500">{weekComparison.thisWeekDeliveries} deliveries</div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-gray-600">Last Week</span>
                  <span className="text-sm text-gray-600">{formatCurrency(weekComparison.lastWeekRevenue)}</span>
                </div>
                <div className="text-xs text-gray-500">{weekComparison.lastWeekDeliveries} deliveries</div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">Revenue Change</span>
                  <span className={`text-sm font-bold ${weekComparison.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {weekComparison.revenueChange >= 0 ? '+' : ''}{weekComparison.revenueChange.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-medium text-gray-700">Delivery Change</span>
                  <span className={`text-sm font-bold ${weekComparison.deliveriesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {weekComparison.deliveriesChange >= 0 ? '+' : ''}{weekComparison.deliveriesChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Outstanding Customers */}
          <div className="bg-white border border-red-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Top Outstanding Customers
              </h3>
              <Link href="/dashboard/outstanding" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {topOutstandingCustomers.slice(0, 5).map((customer, idx) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{customer.customerName}</div>
                    <div className="text-xs text-gray-500">#{idx + 1} by outstanding</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className={`text-sm font-bold ${customer.outstandingAmount > 100000 ? 'text-red-600' : 'text-orange-600'}`}>
                      {formatCurrency(customer.outstandingAmount)}
                    </div>
                  </div>
                </div>
              ))}

              {topOutstandingCustomers.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  No outstanding amounts
                </div>
              )}
            </div>
          </div>

          {/* Top Valuable Customers */}
          <div className="bg-white border border-green-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Top Value Customers (30d)
              </h3>
            </div>

            <div className="space-y-3">
              {topValueCustomers.slice(0, 5).map((customer) => (
                <div key={customer.customerId} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{customer.customerName}</div>
                    <div className="text-xs text-gray-500">{customer.deliveryCount} deliveries</div>
                  </div>
                  <div className="text-right ml-3">
                    <div className="text-sm font-bold text-green-600">
                      {formatCurrency(customer.totalRevenue)}
                    </div>
                  </div>
                </div>
              ))}

              {topValueCustomers.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  No revenue data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Breakdown & Route Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Invoice Status</h3>
              <Link href="/dashboard/invoices" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {invoiceBreakdown.map((status) => {
                const statusColors: Record<string, { bg: string, text: string, border: string }> = {
                  sent: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                  partially_paid: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                  overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                  paid: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                  draft: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
                }

                const colors = statusColors[status.status] || statusColors.draft

                return (
                  <div key={status.status} className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
                    <div className="text-xs text-gray-600 capitalize mb-1">{status.status.replace('_', ' ')}</div>
                    <div className={`text-2xl font-bold ${colors.text}`}>{status.count}</div>
                    <div className="text-xs text-gray-600 mt-1">{formatCurrency(status.totalValue)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Route Performance */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Route Performance (7 days)</h3>

            <div className="space-y-4">
              {routePerformance.map((route) => (
                <div key={route.routeName} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-gray-900">{route.routeName}</div>
                    <div className="text-sm font-bold text-blue-600">{formatCurrency(route.revenue)}</div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{route.activeCustomers} customers</span>
                    <span>{route.totalDeliveries} deliveries</span>
                    <span>Avg: {route.activeCustomers > 0 ? formatCurrency(route.revenue / route.activeCustomers) : '₹0'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-center">
            <div className="text-sm text-gray-600">Total Customers</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{basicStats.totalCustomers}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-center">
            <div className="text-sm text-gray-600">Active Customers</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{basicStats.activeCustomers}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-center">
            <div className="text-sm text-gray-600">Total Outstanding</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(basicStats.totalOutstanding)}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 text-center">
            <div className="text-sm text-gray-600">Overdue Invoices</div>
            <div className={`text-2xl font-bold mt-1 ${basicStats.overdueInvoices > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              {basicStats.overdueInvoices}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
