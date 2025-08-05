import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Edit, ArrowLeft, Calendar, User, Package, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { getModificationById } from '@/lib/actions/modifications'

interface ModificationDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ModificationDetailPage({ params }: ModificationDetailPageProps) {
  const { id } = await params
  const result = await getModificationById(id)

  if (!result.success) {
    notFound()
  }

  const modification = result.data!

  const getModificationTypeColor = (type: string) => {
    switch (type) {
      case 'Skip':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Increase':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Decrease':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/modifications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Modifications
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modification Details</h1>
            <p className="text-gray-600">
              View modification information and history
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/modifications/${modification.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Modification
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modification Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={getModificationTypeColor(modification.modification_type)}>
                {modification.modification_type}
              </Badge>
              <Badge className={getStatusColor(modification.is_active)}>
                {modification.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Modification Type</p>
                <p className="text-gray-600">{modification.modification_type}</p>
              </div>

              {modification.quantity_change && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Quantity Change</p>
                  <p className="text-gray-600">
                    {modification.modification_type === 'Increase' ? '+' : '-'}
                    {modification.quantity_change} liters
                  </p>
                </div>
              )}

              {modification.reason && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Reason</p>
                  <p className="text-gray-600">{modification.reason}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-900">Status</p>
                <p className="text-gray-600">
                  {modification.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Start Date</p>
              <p className="text-gray-600">
                {format(new Date(modification.start_date), 'PPPP')}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">End Date</p>
              <p className="text-gray-600">
                {format(new Date(modification.end_date), 'PPPP')}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Duration</p>
              <p className="text-gray-600">
                {Math.ceil(
                  (new Date(modification.end_date).getTime() - 
                   new Date(modification.start_date).getTime()) / 
                  (1000 * 60 * 60 * 24)
                ) + 1} days
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Created</p>
              <p className="text-gray-600">
                {format(new Date(modification.created_at), 'PPP')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Billing Name</p>
              <p className="text-gray-600">{modification.customer?.billing_name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Contact Person</p>
              <p className="text-gray-600">{modification.customer?.contact_person}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-gray-600">{modification.customer?.phone_primary}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Address</p>
              <p className="text-gray-600">{modification.customer?.address}</p>
            </div>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/customers/${modification.customer_id}`}>
                View Customer Details
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Product Name</p>
              <p className="text-gray-600">{modification.product?.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Product Code</p>
              <p className="text-gray-600">{modification.product?.code}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900">Current Price</p>
              <p className="text-gray-600">
                ₹{modification.product?.current_price.toFixed(2)}/{modification.product?.unit}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}