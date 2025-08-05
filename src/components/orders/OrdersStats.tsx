import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { Package, Calendar, TrendingUp, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export async function OrdersStats() {
  const supabase = await createClient()
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  
  // Get today's orders
  const { data: todayOrders } = await supabase
    .from("daily_orders")
    .select("*")
    .eq("order_date", today)
  
  // Get this week's orders (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]
  
  const { data: weekOrders } = await supabase
    .from("daily_orders")
    .select("*")
    .gte("order_date", weekAgoStr)
    .lte("order_date", today)
  
  // Get pending orders (any date, status = Generated)
  const { data: pendingOrders } = await supabase
    .from("daily_orders")
    .select("*")
    .eq("status", "Generated")
  
  // Calculate stats
  const todayCount = todayOrders?.length || 0
  const todayValue = todayOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
  
  const weekCount = weekOrders?.length || 0
  const weekValue = weekOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
  
  const pendingCount = pendingOrders?.length || 0
  const pendingValue = pendingOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0
  
  // Average daily orders this week
  const avgDailyOrders = weekCount > 0 ? Math.round(weekCount / 7) : 0

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Orders</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayCount}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(todayValue)} total value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Week</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{weekCount}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(weekValue)} total value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Delivery</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(pendingValue)} pending value
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgDailyOrders}</div>
          <p className="text-xs text-muted-foreground">
            Orders per day (7-day avg)
          </p>
        </CardContent>
      </Card>
    </>
  )
}