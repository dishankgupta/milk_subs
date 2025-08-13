"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductForm } from "@/components/products/product-form"

export default function NewProductPage() {
  const router = useRouter()
  
  const handleSuccess = () => {
    router.push("/dashboard/products")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground">
            Create a new product with GST configuration
          </p>
        </div>
      </div>

      {/* Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Enter the product information and GST details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  )
}