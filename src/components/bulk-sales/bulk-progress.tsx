"use client"

import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BulkProgressProps {
  isSubmitting: boolean
  processed: number
  total: number
  errors: Array<{ index: number; error: string }>
  isComplete: boolean
}

export function BulkProgress({
  isSubmitting,
  processed,
  total,
  errors,
  isComplete
}: BulkProgressProps) {
  if (!isSubmitting && !isComplete) {
    return null
  }

  const progress = total > 0 ? (processed / total) * 100 : 0
  const hasErrors = errors.length > 0

  return (
    <Card className={isComplete ? (hasErrors ? "border-yellow-200 bg-yellow-50" : "border-green-200 bg-green-50") : "border-blue-200 bg-blue-50"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isSubmitting && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
          {isComplete && !hasErrors && <CheckCircle className="h-5 w-5 text-green-600" />}
          {isComplete && hasErrors && <AlertCircle className="h-5 w-5 text-yellow-600" />}

          {isSubmitting && "Processing Sales..."}
          {isComplete && !hasErrors && "All Sales Processed Successfully"}
          {isComplete && hasErrors && "Sales Processing Complete with Issues"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>
              {processed} / {total} processed
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default">
            Successful: {processed - errors.length}
          </Badge>
          {errors.length > 0 && (
            <Badge variant="destructive">
              Failed: {errors.length}
            </Badge>
          )}
        </div>

        {/* Error Details */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600">Failed Entries:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {errors.map((error) => (
                <Alert key={error.index} variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">
                    <strong>Row {error.index + 1}:</strong> {error.error}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Success Message */}
        {isComplete && !hasErrors && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              All {processed} sales have been successfully recorded. You can now view them in the sales history.
            </AlertDescription>
          </Alert>
        )}

        {/* Partial Success Message */}
        {isComplete && hasErrors && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              {processed - errors.length} of {total} sales were successfully recorded.
              Please review the failed entries above and try again if needed.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}