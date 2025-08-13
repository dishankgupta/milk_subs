import Link from 'next/link'
import { ArrowLeft, Plus, Package } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getProducts } from '@/lib/actions/products'
import { formatCurrency } from '@/lib/utils'

export default async function ProductsPage() {
  const products = await getProducts()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog and pricing
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <CardTitle>No Products Found</CardTitle>
            <CardDescription>
              Get started by adding your first product to the catalog
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="mt-4">
              <Link href="/dashboard/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {products.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {product.name}
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {product.code}
                      </span>
                      {product.is_subscription_product && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Subscription
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatCurrency(product.current_price)} {product.unit} • GST: {product.gst_rate}%
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/products/${product.id}/edit`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Unit of Measure:</span>
                    <div className="font-medium">{product.unit_of_measure}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">GST Rate:</span>
                    <div className="font-medium">{product.gst_rate}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base Amount:</span>
                    <div className="font-medium">
                      {formatCurrency(product.current_price / (1 + (product.gst_rate / 100)))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">GST Amount:</span>
                    <div className="font-medium">
                      {formatCurrency(product.current_price - (product.current_price / (1 + (product.gst_rate / 100))))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}