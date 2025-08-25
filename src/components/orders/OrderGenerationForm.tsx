"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateDailyOrders, previewDailyOrders, deleteDailyOrders } from "@/lib/actions/orders"
import { formatCurrency } from "@/lib/utils"
import { formatDateForDatabase, getCurrentISTDate } from "@/lib/date-utils"
import { Eye, Zap, Trash2, AlertCircle, CheckCircle } from "lucide-react"
import { toast } from "sonner"

const generateOrdersSchema = z.object({
  orderDate: z.string().min(1, "Order date is required")
})

type GenerateOrdersFormData = z.infer<typeof generateOrdersSchema>

interface OrderPreview {
  customer_name: string
  product_name: string
  quantity: number
  unit_price: number
  total_amount: number
  route_name: string
  delivery_time: string
}

interface PreviewSummary {
  totalOrders: number
  totalAmount: number
  byRoute: Record<string, { quantity: number, amount: number }>
  byProduct: Record<string, { quantity: number, amount: number }>
}

export function OrderGenerationForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<OrderPreview[]>([])
  const [summary, setSummary] = useState<PreviewSummary | null>(null)
  const [hasPreview, setHasPreview] = useState(false)
  const [generationResult, setGenerationResult] = useState<{ success: boolean, message: string } | null>(null)

  const form = useForm<GenerateOrdersFormData>({
    resolver: zodResolver(generateOrdersSchema),
    defaultValues: {
      orderDate: formatDateForDatabase(getCurrentISTDate()) // Today's date in IST
    }
  })

  const handlePreview = async (data: GenerateOrdersFormData) => {
    setIsLoading(true)
    setGenerationResult(null)
    
    try {
      const result = await previewDailyOrders(data.orderDate)
      
      if (result.success) {
        setPreview(result.data || [])
        setSummary(result.summary || null)
        setHasPreview(true)
        toast.success(`Preview loaded: ${result.data?.length || 0} orders`)
      } else {
        toast.error(result.error || "Failed to load preview")
        setPreview([])
        setSummary(null)
        setHasPreview(false)
      }
    } catch {
      toast.error("Failed to load preview")
      setPreview([])
      setSummary(null)
      setHasPreview(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (data: GenerateOrdersFormData) => {
    setIsLoading(true)
    
    try {
      const result = await generateDailyOrders(data.orderDate)
      
      if (result.success) {
        setGenerationResult({ success: true, message: result.message || "Orders generated successfully" })
        toast.success(result.message)
        // Clear preview after successful generation
        setPreview([])
        setSummary(null)
        setHasPreview(false)
      } else {
        setGenerationResult({ success: false, message: result.error || "Failed to generate orders" })
        toast.error(result.error)
      }
    } catch {
      const message = "Failed to generate orders"
      setGenerationResult({ success: false, message })
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (data: GenerateOrdersFormData) => {
    if (!confirm(`Are you sure you want to delete all orders for ${data.orderDate}? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    
    try {
      const result = await deleteDailyOrders(data.orderDate)
      
      if (result.success) {
        toast.success(result.message)
        setGenerationResult(null)
        // Refresh preview if it exists
        if (hasPreview) {
          handlePreview(data)
        }
      } else {
        toast.error(result.error || "Failed to delete orders")
      }
    } catch {
      toast.error("Failed to delete orders")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="orderDate">Order Date</Label>
          <Input
            id="orderDate"
            type="date"
            {...form.register("orderDate")}
            className="w-full"
          />
          {form.formState.errors.orderDate && (
            <p className="text-sm text-red-500">{form.formState.errors.orderDate.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={form.handleSubmit(handlePreview)}
            disabled={isLoading}
          >
            <Eye className="mr-2 h-4 w-4" />
            {isLoading ? "Loading..." : "Preview Orders"}
          </Button>
          
          {hasPreview && (
            <Button
              type="button"
              onClick={form.handleSubmit(handleGenerate)}
              disabled={isLoading}
            >
              <Zap className="mr-2 h-4 w-4" />
              Generate Orders
            </Button>
          )}
          
          <Button
            type="button"
            variant="destructive"
            onClick={form.handleSubmit(handleDelete)}
            disabled={isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Existing
          </Button>
        </div>
      </form>

      {generationResult && (
        <Alert className={generationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          {generationResult.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={generationResult.success ? "text-green-800" : "text-red-800"}>
            {generationResult.message}
          </AlertDescription>
        </Alert>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Order Preview Summary</CardTitle>
            <CardDescription>
              Summary for {form.watch("orderDate")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.totalOrders}</div>
                <div className="text-sm text-muted-foreground">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</div>
                <div className="text-sm text-muted-foreground">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Object.keys(summary.byRoute).length}</div>
                <div className="text-sm text-muted-foreground">Routes</div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">By Product</h4>
                <div className="space-y-2">
                  {Object.entries(summary.byProduct).map(([product, data]) => (
                    <div key={product} className="flex justify-between">
                      <span>{product}</span>
                      <div className="text-right">
                        <div className="font-medium">{data.quantity}L</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(data.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">By Route</h4>
                <div className="space-y-2">
                  {Object.entries(summary.byRoute).map(([route, data]) => (
                    <div key={route} className="flex justify-between">
                      <span>{route}</span>
                      <div className="text-right">
                        <div className="font-medium">{data.quantity}L</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(data.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Details Preview</CardTitle>
            <CardDescription>
              {preview.length} orders will be generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {preview.map((order, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{order.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.product_name} • {order.route_name} • {order.delivery_time}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{order.quantity}L × {formatCurrency(order.unit_price)}</div>
                    <div className="text-sm font-semibold">{formatCurrency(order.total_amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}