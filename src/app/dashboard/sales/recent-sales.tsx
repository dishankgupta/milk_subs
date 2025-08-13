import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { getSales } from '@/lib/actions/sales'

export async function RecentSales() {
  try {
    const { sales } = await getSales({ limit: 5 })

    if (!sales || sales.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No recent sales found. Record your first sale to get started.
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {sales.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{sale.product?.name}</span>
                <Badge variant={sale.sale_type === 'Cash' ? 'secondary' : 'outline'} className="text-xs">
                  {sale.sale_type}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                {sale.customer?.billing_name || 'No Customer'} • {format(new Date(sale.sale_date), 'MMM dd')}
              </div>
              <div className="text-xs text-gray-400">
                {sale.quantity} {sale.product?.unit_of_measure}
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatCurrency(sale.total_amount)}</div>
              <Badge 
                variant={
                  sale.payment_status === 'Completed' 
                    ? 'default' 
                    : sale.payment_status === 'Pending' 
                    ? 'destructive' 
                    : 'secondary'
                }
                className="text-xs"
              >
                {sale.payment_status}
              </Badge>
            </div>
          </div>
        ))}
        
        <div className="text-center">
          <a 
            href="/dashboard/sales/history" 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all sales →
          </a>
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load recent sales
      </div>
    )
  }
}