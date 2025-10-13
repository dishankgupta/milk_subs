"use client"

import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, subMonths } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentISTDate } from "@/lib/date-utils"
import { Badge } from "@/components/ui/badge"

export default function DatePickerDemoPage() {
  // 1. Single Date Picker
  const [singleDate, setSingleDate] = useState<Date | undefined>()

  // 2. Date Range (Two Pickers)
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()

  // 3. Date + Time Picker
  const [deliveryDateTime, setDeliveryDateTime] = useState<Date | undefined>(getCurrentISTDate())

  // 4. Date Range with Presets
  const [preset, setPreset] = useState<string>("thisMonth")
  const [presetStartDate, setPresetStartDate] = useState<Date | undefined>(startOfMonth(getCurrentISTDate()))
  const [presetEndDate, setPresetEndDate] = useState<Date | undefined>(endOfMonth(getCurrentISTDate()))

  // 5. Validation Examples
  const [validatedDate, setValidatedDate] = useState<Date | undefined>()

  // 6. Disabled State
  const [disabledDate, setDisabledDate] = useState<Date | undefined>(getCurrentISTDate())

  // Handle preset change
  const handlePresetChange = (value: string) => {
    setPreset(value)
    const today = getCurrentISTDate()

    switch (value) {
      case "today":
        setPresetStartDate(today)
        setPresetEndDate(today)
        break
      case "yesterday":
        const yesterday = subDays(today, 1)
        setPresetStartDate(yesterday)
        setPresetEndDate(yesterday)
        break
      case "last7days":
        setPresetStartDate(subDays(today, 6))
        setPresetEndDate(today)
        break
      case "last30days":
        setPresetStartDate(subDays(today, 29))
        setPresetEndDate(today)
        break
      case "thisWeek":
        setPresetStartDate(startOfWeek(today, { weekStartsOn: 1 }))
        setPresetEndDate(endOfWeek(today, { weekStartsOn: 1 }))
        break
      case "thisMonth":
        setPresetStartDate(startOfMonth(today))
        setPresetEndDate(endOfMonth(today))
        break
      case "lastMonth":
        const lastMonth = subMonths(today, 1)
        setPresetStartDate(startOfMonth(lastMonth))
        setPresetEndDate(endOfMonth(lastMonth))
        break
      case "custom":
        // Let user pick custom dates
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unified Date Picker Demo</h1>
          <p className="text-muted-foreground">
            6 variations and use cases for the unified date picker component
          </p>
        </div>
      </div>

      {/* Demo Cards */}
      <div className="grid gap-6">
        {/* 1. Single Date Picker */}
        <Card>
          <CardHeader>
            <CardTitle>1. Single Date Picker (Basic)</CardTitle>
            <CardDescription>
              Basic date picker with DD-MM-YYYY format and manual input
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <UnifiedDatePicker
                value={singleDate}
                onChange={setSingleDate}
                placeholder="DD-MM-YYYY"
                className="w-[300px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Selected Value:</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {singleDate ? singleDate.toISOString() : "null"}
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Use Case:</strong> Sales forms, payment forms, subscription start dates
            </div>
          </CardContent>
        </Card>

        {/* 2. Date Range (Two Pickers) */}
        <Card>
          <CardHeader>
            <CardTitle>2. Date Range (Two Separate Pickers)</CardTitle>
            <CardDescription>
              Start and end dates using TWO independent date pickers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-center">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <UnifiedDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Start Date (DD-MM-YYYY)"
                  className="w-[250px]"
                />
              </div>
              <span className="text-muted-foreground mt-8">to</span>
              <div className="space-y-2">
                <Label>End Date</Label>
                <UnifiedDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="End Date (DD-MM-YYYY)"
                  className="w-[250px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Range:</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {startDate && endDate
                  ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                  : "No range selected"}
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Use Case:</strong> Report filtering, invoice generation date ranges, sales history filters
            </div>
          </CardContent>
        </Card>

        {/* 3. Date + Time Picker */}
        <Card>
          <CardHeader>
            <CardTitle>3. Date + Time Picker</CardTitle>
            <CardDescription>
              Combined date and time selection with DD-MM-YYYY HH:mm format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Delivery Timestamp</Label>
              <UnifiedDatePicker
                value={deliveryDateTime}
                onChange={setDeliveryDateTime}
                withTime={true}
                placeholder="DD-MM-YYYY HH:mm"
                className="w-[300px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Timestamp:</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {deliveryDateTime ? deliveryDateTime.toISOString() : "null"}
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Use Case:</strong> Delivery confirmation forms, exact timestamp recording for audit trail
            </div>
          </CardContent>
        </Card>

        {/* 4. Date Range with Presets */}
        <Card>
          <CardHeader>
            <CardTitle>4. Date Range with Preset Selector</CardTitle>
            <CardDescription>
              Quick date range selection with preset options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="space-y-2">
                <Label>Quick Select</Label>
                <Select value={preset} onValueChange={handlePresetChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Choose preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>From</Label>
                <UnifiedDatePicker
                  value={presetStartDate}
                  onChange={setPresetStartDate}
                  placeholder="Start Date"
                  className="w-[200px]"
                />
              </div>

              <span className="text-muted-foreground pb-2">to</span>

              <div className="space-y-2">
                <Label>To</Label>
                <UnifiedDatePicker
                  value={presetEndDate}
                  onChange={setPresetEndDate}
                  placeholder="End Date"
                  className="w-[200px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Selected Range:</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {presetStartDate && presetEndDate
                  ? `${presetStartDate.toLocaleDateString()} - ${presetEndDate.toLocaleDateString()}`
                  : "No range selected"}
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Use Case:</strong> Outstanding reports, invoice filtering, report interfaces with preset ranges
            </div>
          </CardContent>
        </Card>

        {/* 5. Multiple Input Formats */}
        <Card>
          <CardHeader>
            <CardTitle>5. Flexible Input Formats (Type Freely!)</CardTitle>
            <CardDescription>
              Accepts DDMMYYYY, DD/MM/YYYY, or DD-MM-YYYY - automatically formats as you type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Try Different Formats</Label>
              <UnifiedDatePicker
                value={validatedDate}
                onChange={setValidatedDate}
                placeholder="Type any format"
                className="w-[300px]"
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="font-medium">✅ All these formats work:</div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><code>08102025</code> - DDMMYYYY format (auto-formats to DD-MM-YYYY)</li>
                <li><code>08/10/2025</code> - DD/MM/YYYY format</li>
                <li><code>08-10-2025</code> - DD-MM-YYYY format</li>
                <li>✨ <strong>Just type digits:</strong> Type <code>08102025</code> and watch it auto-format!</li>
                <li>🎯 <strong>Year limited to 4 digits:</strong> Can&apos;t type 5-digit years (20251)</li>
                <li>📅 <strong>Calendar shows live:</strong> Opens automatically when you focus the field</li>
              </ul>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Parsed Date:</Badge>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {validatedDate ? validatedDate.toLocaleDateString() : "null"}
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>How it works:</strong> Type directly in the field and watch the calendar update live! Click the calendar icon to toggle the calendar view.
            </div>
          </CardContent>
        </Card>

        {/* 6. Disabled State */}
        <Card>
          <CardHeader>
            <CardTitle>6. Disabled State</CardTitle>
            <CardDescription>
              Date picker in disabled state (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Disabled Date Picker</Label>
              <UnifiedDatePicker
                value={disabledDate}
                onChange={setDisabledDate}
                disabled={true}
                placeholder="DD-MM-YYYY"
                className="w-[300px]"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Use Case:</strong> View-only modes, locked forms, historical data display
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Summary Section */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle>Component Features Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">✅ Implemented Features:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>✨ <strong>Type directly:</strong> Field is typeable, calendar shows live</li>
                <li>📅 <strong>Multi-format:</strong> DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY all work</li>
                <li>🎯 <strong>Auto-format:</strong> Automatically adds hyphens as you type</li>
                <li>🔢 <strong>Smart limiting:</strong> Year limited to 4 digits (can&apos;t type 20251)</li>
                <li>📆 <strong>Live updates:</strong> Calendar updates as you type valid dates</li>
                <li>🎨 <strong>Beautiful UI:</strong> Shadcn calendar with arrows inside header</li>
                <li>⏰ <strong>Optional time:</strong> Add HH:mm for delivery timestamps</li>
                <li>🌍 <strong>IST timezone:</strong> Built-in integration with date-utils</li>
                <li>♿ <strong>Accessible:</strong> Keyboard navigation, focus management</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎯 Use Cases Covered:</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Single date selection (forms)</li>
                <li>Date ranges (two pickers)</li>
                <li>Date+time (delivery timestamps)</li>
                <li>Preset date ranges (reports)</li>
                <li>Native browser calendar (same as sales history)</li>
                <li>Disabled state (read-only)</li>
                <li>Flexible input formats (DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-900 mb-2">🎉 UX Features Implemented:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
              <li><strong>✅ Fully Typeable:</strong> Click field and start typing immediately - no blocking!</li>
              <li><strong>✅ Multiple Formats:</strong> DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY - all work!</li>
              <li><strong>✅ Live Calendar:</strong> Calendar opens when typing and updates live as you type!</li>
              <li><strong>✅ Arrows Inside Header:</strong> Beautiful centered layout: ← October 2025 →</li>
              <li><strong>✅ Year Limited:</strong> Can&apos;t type 5-digit years (smooth UX, no errors)</li>
              <li><strong>✅ Consistent Design:</strong> Shadcn calendar - same look across all browsers</li>
            </ul>
            <div className="mt-2 text-sm text-green-900 bg-green-100 p-2 rounded">
              <strong>🎯 Perfect Combo:</strong> Type with auto-formatting + Live calendar updates + Click calendar icon to toggle!
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
