"use client"

import { useState } from "react"
import { CalendarIcon, Receipt, ExternalLink } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDateForAPI } from "@/lib/utils"
import { toast } from "sonner"

interface GenerateCustomerInvoiceProps {
  customerId: string
  customerName: string
  trigger?: React.ReactNode
}

interface InvoicePreviewData {
  subscriptionAmount: number
  creditSalesAmount: number
  totalAmount: number
  hasExistingInvoice: boolean
}

export function GenerateCustomerInvoice({ 
  customerId, 
  customerName, 
  trigger 
}: GenerateCustomerInvoiceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<InvoicePreviewData | null>(null)

  const [formData, setFormData] = useState({
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    period_end: new Date(),
    include_subscriptions: true,
    include_credit_sales: true
  })

  const loadPreview = async () => {
    setIsLoading(true)
    try {
      // This is a simplified version - in full implementation, this would call getCustomerInvoicePreview
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock preview data
      const mockPreview = {
        subscriptionAmount: 1500,
        creditSalesAmount: 300,
        totalAmount: 1800,
        hasExistingInvoice: false
      }
      
      setPreviewData(mockPreview)
      toast.success("Invoice preview loaded")
    } catch (error) {
      toast.error("Failed to load invoice preview")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      // Generate the preview URL for this customer
      const previewUrl = `/api/print/customer-invoice?customer_id=${customerId}&period_start=${formatDateForAPI(formData.period_start)}&period_end=${formatDateForAPI(formData.period_end)}`
      
      // Open in new window
      window.open(previewUrl, '_blank')
      
      toast.success("Invoice opened in new tab")
      setIsOpen(false)
    } catch (error) {
      toast.error("Failed to generate invoice")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Receipt className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Invoice - {customerName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.period_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.period_start, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.period_start}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, period_start: date || new Date() }))
                      setPreviewData(null)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.period_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.period_end, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.period_end}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, period_end: date || new Date() }))
                      setPreviewData(null)
                    }}
                    disabled={(date) => date < formData.period_start}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <Label>Include in Invoice</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_subscriptions"
                  checked={formData.include_subscriptions}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, include_subscriptions: !!checked }))
                    setPreviewData(null)
                  }}
                />
                <Label htmlFor="include_subscriptions">Subscription Deliveries</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_credit_sales"
                  checked={formData.include_credit_sales}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, include_credit_sales: !!checked }))
                    setPreviewData(null)
                  }}
                />
                <Label htmlFor="include_credit_sales">Credit Sales</Label>
              </div>
            </div>
          </div>

          {/* Load Preview */}
          <Button onClick={loadPreview} disabled={isLoading} className="w-full">
            {isLoading ? "Loading Preview..." : "Load Invoice Preview"}
          </Button>

          {/* Preview Data */}
          {previewData && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subscription Amount:</span>
                    <span className="font-medium">{formatCurrency(previewData.subscriptionAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Sales Amount:</span>
                    <span className="font-medium">{formatCurrency(previewData.creditSalesAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-lg font-bold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">{formatCurrency(previewData.totalAmount)}</span>
                  </div>
                  {previewData.hasExistingInvoice && (
                    <div className="bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800">
                      ⚠️ Warning: An invoice already exists for this period. Generating a new one will create a duplicate.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isLoading || !previewData || previewData.totalAmount <= 0}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Generate & Preview Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}