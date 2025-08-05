import { OrderGenerationForm } from "@/components/orders/OrderGenerationForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Zap } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GenerateOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/orders">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Daily Orders</h1>
          <p className="text-muted-foreground">
            Generate orders from active subscriptions for a specific date
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5" />
            Order Generation
          </CardTitle>
          <CardDescription>
            Select a date to generate orders from all active subscriptions. 
            You can preview orders before generating them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderGenerationForm />
        </CardContent>
      </Card>
    </div>
  )
}