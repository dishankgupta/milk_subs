"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarIcon, Download, AlertTriangle, X } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { formatCurrency, formatDateForAPI } from "@/lib/utils"
import { bulkInvoiceSchema, type BulkInvoiceFormData } from "@/lib/validations"
import { getBulkInvoicePreview, type GenerationProgress } from "@/lib/actions/invoices"
import { toast } from "sonner"

interface BulkInvoicePreviewItem {
  customerId: string
  customerName: string
  subscriptionAmount: number
  creditSalesAmount: number
  totalAmount: number
  hasExistingInvoice: boolean
  existingInvoiceNumber?: string
  _customerOutstanding?: number // Temporary field for filtering
}

interface BulkInvoiceGeneratorProps {
  onStatsRefresh: () => void
}

export function BulkInvoiceGenerator({ onStatsRefresh }: BulkInvoiceGeneratorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<BulkInvoicePreviewItem[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set())
  const [outputFolder, setOutputFolder] = useState("")
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [generationResults, setGenerationResults] = useState<{
    successful: number
    combinedPdfPath: string
    invoiceNumbers: string[]
  } | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const commonFolders = [
    "C:\\PureDairy\\Invoices",
    "C:\\Users\\%USERNAME%\\Documents\\PureDairy\\Invoices",
    "D:\\PureDairy\\Invoices"
  ]

  const handleQuickSelect = (folderPath: string) => {
    setOutputFolder(folderPath)
  }

  // Check if any selected customers have existing invoices
  const hasSelectedDuplicates = Array.from(selectedCustomers).some(customerId => {
    const item = previewData.find(p => p.customerId === customerId)
    return item?.hasExistingInvoice
  })

  const form = useForm<BulkInvoiceFormData>({
    resolver: zodResolver(bulkInvoiceSchema),
    defaultValues: {
      period_start: undefined,
      period_end: undefined,
      customer_selection: "with_unbilled_transactions",
      selected_customer_ids: [],
      output_folder: ""
    }
  })

  // Set default dates after component mounts to avoid hydration issues
  useEffect(() => {
    setMounted(true)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    form.setValue("period_start", startOfMonth)
    form.setValue("period_end", now)
  }, [form])

  // Cleanup effect for EventSource and abort controller
  useEffect(() => {
    return () => {
      const eventSource = eventSourceRef.current
      const abortController = abortControllerRef.current
      
      if (eventSource) {
        eventSource.close()
      }
      if (abortController) {
        abortController.abort()
      }
    }
  }, [])

  // Load preview data when form changes
  const loadPreview = async () => {
    const formData = form.getValues()
    if (!formData.period_start || !formData.period_end) return

    setIsLoading(true)
    try {
      const preview = await getBulkInvoicePreview({
        period_start: formatDateForAPI(formData.period_start),
        period_end: formatDateForAPI(formData.period_end),
        customer_selection: formData.customer_selection
      })
      setPreviewData(preview)
      
      // Auto-select customers based on selection type
      if (formData.customer_selection === "all") {
        setSelectedCustomers(new Set(preview.map(item => item.customerId)))
      } else if (formData.customer_selection === "with_unbilled_deliveries") {
        setSelectedCustomers(new Set(
          preview.filter(item => item.subscriptionAmount > 0).map(item => item.customerId)
        ))
      } else if (formData.customer_selection === "with_unbilled_credit_sales") {
        setSelectedCustomers(new Set(
          preview.filter(item => item.creditSalesAmount > 0).map(item => item.customerId)
        ))
      } else if (formData.customer_selection === "with_unbilled_transactions") {
        setSelectedCustomers(new Set(
          preview.filter(item => item.totalAmount > 0).map(item => item.customerId)
        ))
      }
    } catch (error) {
      console.error("Invoice preview error:", error)
      toast.error(`Failed to load invoice preview: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateInvoices = async () => {
    if (!outputFolder) {
      toast.error("Please specify an output folder")
      return
    }

    if (selectedCustomers.size === 0) {
      toast.error("Please select at least one customer")
      return
    }

    setIsGenerating(true)
    setGenerationProgress({
      completed: 0,
      total: selectedCustomers.size,
      currentCustomer: "",
      isComplete: false,
      errors: []
    })
    setGenerationResults(null)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Use EventSource for real-time progress updates
      const response = await fetch('/api/invoices/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period_start: formatDateForAPI(form.getValues("period_start")),
          period_end: formatDateForAPI(form.getValues("period_end")),
          customer_ids: Array.from(selectedCustomers),
          output_folder: outputFolder
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body reader available')
      }

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete messages
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'progress') {
                setGenerationProgress(prev => prev ? {
                  ...prev,
                  completed: data.completed,
                  total: data.total,
                  currentCustomer: data.currentCustomer || prev.currentCustomer
                } : {
                  completed: data.completed,
                  total: data.total,
                  currentCustomer: data.currentCustomer || '',
                  isComplete: false,
                  errors: []
                })
              } else if (data.type === 'error') {
                setGenerationProgress(prev => prev ? {
                  ...prev,
                  completed: data.completed,
                  errors: [...prev.errors, data.error]
                } : {
                  completed: data.completed,
                  total: data.total,
                  currentCustomer: '',
                  isComplete: false,
                  errors: [data.error]
                })
              } else if (data.type === 'complete') {
                setGenerationProgress(prev => prev ? {
                  ...prev,
                  completed: data.completed,
                  total: data.total,
                  isComplete: true
                } : {
                  completed: data.completed,
                  total: data.total,
                  currentCustomer: '',
                  isComplete: true,
                  errors: []
                })
                
                setGenerationResults({
                  successful: data.successful || 0,
                  combinedPdfPath: data.combinedPdfPath || '',
                  invoiceNumbers: data.invoiceNumbers || []
                })
                
                toast.success(`Successfully generated ${data.successful} invoices`)
                
                if (data.combinedPdfPath) {
                  toast.info(`Combined PDF saved at: ${data.combinedPdfPath}`)
                }
                
                // Refresh stats after successful generation
                onStatsRefresh()
                
                break // Exit the processing loop
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError)
            }
          }
        }
      }

    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        toast.info("Invoice generation cancelled")
        setGenerationProgress(prev => prev ? { ...prev, isComplete: true } : null)
      } else {
        toast.error("Failed to generate invoices")
        console.error("Bulk invoice generation error:", error)
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const toggleCustomerSelection = (customerId: string) => {
    const newSelection = new Set(selectedCustomers)
    if (newSelection.has(customerId)) {
      newSelection.delete(customerId)
    } else {
      newSelection.add(customerId)
    }
    setSelectedCustomers(newSelection)
  }

  const selectAllCustomers = (select: boolean) => {
    if (select) {
      setSelectedCustomers(new Set(previewData.map(item => item.customerId)))
    } else {
      setSelectedCustomers(new Set())
    }
  }

  const selectedTotal = previewData
    .filter(item => selectedCustomers.has(item.customerId))
    .reduce((sum, item) => sum + item.totalAmount, 0)

  // Prevent render until component is mounted to avoid hydration issues
  if (!mounted) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invoice Generation Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("period_start") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("period_start") ? (
                      format(form.watch("period_start"), "PPP")
                    ) : (
                      "Pick start date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("period_start")}
                    onSelect={(date) => {
                      form.setValue("period_start", date || new Date())
                      setPreviewData([])
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
                      !form.watch("period_end") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("period_end") ? (
                      format(form.watch("period_end"), "PPP")
                    ) : (
                      "Pick end date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("period_end")}
                    onSelect={(date) => {
                      form.setValue("period_end", date || new Date())
                      setPreviewData([])
                    }}
                    disabled={(date) => date < form.watch("period_start")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Customer Selection Type */}
          <div className="space-y-3">
            <Label>Customer Selection</Label>
            <RadioGroup
              value={form.watch("customer_selection")}
              onValueChange={(value) => {
                form.setValue("customer_selection", value as "all" | "with_unbilled_deliveries" | "with_unbilled_credit_sales" | "with_unbilled_transactions" | "selected")
                setPreviewData([])
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">All Customers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="with_unbilled_deliveries" id="with_unbilled_deliveries" />
                <Label htmlFor="with_unbilled_deliveries">Customers with Unbilled Deliveries</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="with_unbilled_credit_sales" id="with_unbilled_credit_sales" />
                <Label htmlFor="with_unbilled_credit_sales">Customers with Unbilled Credit Sales</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="with_unbilled_transactions" id="with_unbilled_transactions" />
                <Label htmlFor="with_unbilled_transactions">Customers with Any Unbilled Transactions</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Output Folder Selection */}
          <div className="space-y-3">
            <Label>Output Folder</Label>
            <Input
              value={outputFolder}
              onChange={(e) => setOutputFolder(e.target.value)}
              placeholder="Enter full folder path (e.g., C:\PureDairy\Invoices)"
            />
            
            {/* Quick Select Buttons */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Quick Select:</div>
              <div className="flex flex-wrap gap-2">
                {commonFolders.map((folder, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSelect(folder)}
                    className="text-xs"
                  >
                    {folder.length > 30 ? `...${folder.slice(-27)}` : folder}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
              <div className="text-sm font-medium text-blue-800">📁 Folder Path Format:</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>• Windows: <code>C:\PureDairy\Invoices</code></div>
                <div>• Make sure the folder exists or will be created</div>
                <div>• PDFs will be saved in: <code className="bg-white px-1 rounded">{outputFolder || "[folder]"}/YYYYMMDD_generated_invoices/</code></div>
              </div>
            </div>
          </div>

          <Button onClick={loadPreview} disabled={isLoading} className="w-full">
            {isLoading ? "Loading Preview..." : "Load Invoice Preview"}
          </Button>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Invoice Preview</CardTitle>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {selectedCustomers.size} of {previewData.length} customers selected
                </div>
                <div className="text-sm font-medium">
                  Total: {formatCurrency(selectedTotal)}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Select All Controls */}
            <div className="flex items-center space-x-4 mb-4">
              <Checkbox
                checked={selectedCustomers.size === previewData.length}
                onCheckedChange={selectAllCustomers}
              />
              <Label>Select All</Label>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => selectAllCustomers(false)}
              >
                Clear All
              </Button>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Subscription Dues</TableHead>
                    <TableHead>Credit Sales</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((item) => (
                    <TableRow key={item.customerId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCustomers.has(item.customerId)}
                          onCheckedChange={() => toggleCustomerSelection(item.customerId)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.customerName}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.subscriptionAmount)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(item.creditSalesAmount)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                      <TableCell>
                        {item.hasExistingInvoice ? (
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Duplicate
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {item.existingInvoiceNumber}
                            </span>
                          </div>
                        ) : item.totalAmount > 0 ? (
                          <Badge variant="default">Ready</Badge>
                        ) : (
                          <Badge variant="secondary">No Amount Due</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Duplicate Warning */}
            {hasSelectedDuplicates && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Cannot generate invoices: Some selected customers already have invoices for this period. 
                  Please deselect customers with &quot;Duplicate&quot; status or delete their existing invoices first.
                </span>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-end gap-3 mt-6">
              {isGenerating && (
                <Button 
                  onClick={() => {
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort()
                    }
                  }}
                  variant="outline"
                  size="lg"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button 
                onClick={handleGenerateInvoices}
                disabled={selectedCustomers.size === 0 || !outputFolder || isGenerating || hasSelectedDuplicates}
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGenerating ? 'Generating...' : hasSelectedDuplicates ? 'Remove Duplicates to Generate' : `Generate ${selectedCustomers.size} Invoices`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Progress */}
      {generationProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{generationProgress.completed} of {generationProgress.total}</span>
              </div>
              <Progress 
                value={(generationProgress.completed / generationProgress.total) * 100} 
                className="w-full"
              />
            </div>
            
            {generationProgress.currentCustomer && (
              <div className="text-sm text-gray-600">
                Currently processing: {generationProgress.currentCustomer}
              </div>
            )}

            {generationProgress.errors.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-red-600">Errors:</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {generationProgress.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generationProgress.isComplete && (
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-green-800 font-medium">
                  Invoice generation completed!
                </div>
                <div className="text-green-600 text-sm mt-1">
                  {generationResults ? generationResults.successful : generationProgress.completed - generationProgress.errors.length} invoices generated successfully
                </div>
                {generationResults?.combinedPdfPath && (
                  <div className="text-green-600 text-xs mt-2">
                    Combined PDF: {generationResults.combinedPdfPath}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}