"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductForm } from "@/components/products/product-form"
import { getProduct } from "@/lib/actions/products"
import type { Product } from "@/lib/types"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const productData = await getProduct(productId)
        setProduct(productData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProduct()
  }, [productId])
  
  const handleSuccess = () => {
    router.push("/dashboard/products")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">Loading product details...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
            <p className="text-muted-foreground">Error loading product</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/products">
                Back to Products
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground">
            Update {product?.name} details and GST configuration
          </p>
        </div>
      </div>

      {/* Product Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Details</CardTitle>
          <CardDescription>
            Update the product information and GST details below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm 
            initialData={{
              name: product?.name || "",
              code: product?.code || "",
              current_price: product?.current_price || 0,
              unit: product?.unit || "",
              gst_rate: product?.gst_rate || 0,
              unit_of_measure: product?.unit_of_measure || "liter",
              is_subscription_product: product?.is_subscription_product || false,
            }}
            productId={productId}
            onSuccess={handleSuccess} 
          />
        </CardContent>
      </Card>
    </div>
  )
}