import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { getOutstandingDashboard } from '@/lib/actions/outstanding'
import Link from 'next/link'
import { CalendarPlus, FileText, Truck, ShoppingCart } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get basic stats and outstanding summary
  const [
    { count: totalCustomers },
    { count: activeCustomers },
    { data: products },
    { data: routes },
    outstandingData
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('products').select('*'),
    supabase.from('routes').select('*'),
    getOutstandingDashboard()
  ])

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to Dairy Subscription Manager</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">C</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                <dd className="text-lg font-medium text-gray-900">{totalCustomers || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Active Customers</dt>
                <dd className="text-lg font-medium text-gray-900">{activeCustomers || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">P</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Products</dt>
                <dd className="text-lg font-medium text-gray-900">{products?.length || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">R</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Routes</dt>
                <dd className="text-lg font-medium text-gray-900">{routes?.length || 0}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">₹</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Outstanding</dt>
                <dd className="text-lg font-medium text-gray-900">{formatCurrency(outstandingData.totalOutstanding)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">!</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Overdue Invoices</dt>
                <dd className="text-lg font-medium text-gray-900">{outstandingData.overdueInvoices}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/dashboard/orders/generate"
            className="bg-blue-500 hover:bg-blue-600 text-white p-6 rounded-lg shadow transition-colors duration-200"
          >
            <div className="flex items-center">
              <CalendarPlus className="h-8 w-8 mr-4" />
              <div>
                <h3 className="font-semibold text-lg">Generate Daily Orders</h3>
                <p className="text-blue-100 text-sm">Create orders for today</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/reports/delivery"
            className="bg-green-500 hover:bg-green-600 text-white p-6 rounded-lg shadow transition-colors duration-200"
          >
            <div className="flex items-center">
              <FileText className="h-8 w-8 mr-4" />
              <div>
                <h3 className="font-semibold text-lg">Daily Route Report</h3>
                <p className="text-green-100 text-sm">View delivery routes</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/deliveries/new"
            className="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-lg shadow transition-colors duration-200"
          >
            <div className="flex items-center">
              <Truck className="h-8 w-8 mr-4" />
              <div>
                <h3 className="font-semibold text-lg">Mark Deliveries</h3>
                <p className="text-orange-100 text-sm">Confirm deliveries</p>
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/sales/new"
            className="bg-purple-500 hover:bg-purple-600 text-white p-6 rounded-lg shadow transition-colors duration-200"
          >
            <div className="flex items-center">
              <ShoppingCart className="h-8 w-8 mr-4" />
              <div>
                <h3 className="font-semibold text-lg">Record New Sale</h3>
                <p className="text-purple-100 text-sm">Add manual sale</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Products & Routes Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Products</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {products?.map((product) => (
                <div key={product.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">Code: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(product.current_price)}</p>
                    <p className="text-sm text-gray-500">per {product.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Routes</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {routes?.map((route) => (
                <div key={route.id} className="border-l-4 border-blue-400 pl-4">
                  <p className="font-medium text-gray-900">{route.name}</p>
                  <p className="text-sm text-gray-500">{route.description}</p>
                  {route.personnel_name && (
                    <p className="text-sm text-gray-600">Personnel: {route.personnel_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}