"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronDown, X } from "lucide-react"
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, isToday, isYesterday } from "date-fns"
import { cn } from "@/lib/utils"
import { getCurrentISTDate, parseLocalDateIST, formatDateIST } from "@/lib/date-utils"

import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export interface DateFilterState {
  preset: string
  fromDate?: Date
  toDate?: Date
  label: string
  mostRecentDate?: string // For storing the actual most recent date from data
}

interface EnhancedDateFilterProps {
  value: DateFilterState
  onChange: (filter: DateFilterState) => void
  className?: string
  mostRecentDate?: string // Pass the most recent date from parent
}

// Function to get date presets with dynamic most recent date
const getDatePresets = (mostRecentDate?: string) => [
  {
    id: "mostRecent",
    label: "Most Recent",
    getValue: () => {
      if (mostRecentDate) {
        const recentDate = parseLocalDateIST(mostRecentDate)
        return {
          preset: "mostRecent",
          fromDate: startOfDay(recentDate),
          toDate: endOfDay(recentDate),
          label: `Most Recent (${formatDateIST(recentDate)})`,
          mostRecentDate
        }
      }
      // Fallback to today if no most recent date available
      const today = getCurrentISTDate()
      return {
        preset: "mostRecent",
        fromDate: startOfDay(today),
        toDate: endOfDay(today),
        label: `Most Recent (${formatDateIST(today)})`,
        mostRecentDate: formatDateIST(today)
      }
    }
  },
  {
    id: "today",
    label: "Today",
    getValue: () => {
      const today = getCurrentISTDate()
      return {
        preset: "today",
        fromDate: startOfDay(today),
        toDate: endOfDay(today),
        label: `Today (${formatDateIST(today)})`
      }
    }
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getValue: () => {
      const yesterday = subDays(getCurrentISTDate(), 1)
      return {
        preset: "yesterday",
        fromDate: startOfDay(yesterday),
        toDate: endOfDay(yesterday),
        label: `Yesterday (${formatDateIST(yesterday)})`
      }
    }
  },
  {
    id: "last7days",
    label: "Last 7 days",
    getValue: () => {
      const today = getCurrentISTDate()
      const sevenDaysAgo = subDays(today, 6) // Include today
      return {
        preset: "last7days",
        fromDate: startOfDay(sevenDaysAgo),
        toDate: endOfDay(today),
        label: `Last 7 days (${formatDateIST(sevenDaysAgo)} - ${formatDateIST(today)})`
      }
    }
  },
  {
    id: "last30days",
    label: "Last 30 days",
    getValue: () => {
      const today = getCurrentISTDate()
      const thirtyDaysAgo = subDays(today, 29) // Include today
      return {
        preset: "last30days",
        fromDate: startOfDay(thirtyDaysAgo),
        toDate: endOfDay(today),
        label: `Last 30 days (${formatDateIST(thirtyDaysAgo)} - ${formatDateIST(today)})`
      }
    }
  },
  {
    id: "thisWeek",
    label: "This week",
    getValue: () => {
      const today = getCurrentISTDate()
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday start
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      return {
        preset: "thisWeek",
        fromDate: weekStart,
        toDate: weekEnd,
        label: `This week (${formatDateIST(weekStart)} - ${formatDateIST(weekEnd)})`
      }
    }
  },
  {
    id: "thisMonth",
    label: "This month",
    getValue: () => {
      const today = getCurrentISTDate()
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      return {
        preset: "thisMonth",
        fromDate: monthStart,
        toDate: monthEnd,
        label: `This month (${formatDateIST(monthStart)} - ${formatDateIST(monthEnd)})`
      }
    }
  },
  {
    id: "lastMonth",
    label: "Last month",
    getValue: () => {
      const today = getCurrentISTDate()
      const lastMonth = subDays(startOfMonth(today), 1)
      const monthStart = startOfMonth(lastMonth)
      const monthEnd = endOfMonth(lastMonth)
      return {
        preset: "lastMonth",
        fromDate: monthStart,
        toDate: monthEnd,
        label: `Last month (${formatDateIST(monthStart)} - ${formatDateIST(monthEnd)})`
      }
    }
  },
  {
    id: "custom",
    label: "Custom range",
    getValue: () => ({ preset: "custom", label: "Custom range" })
  }
]

export function EnhancedDateFilter({ value, onChange, className, mostRecentDate }: EnhancedDateFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>(value.fromDate)
  const [customToDate, setCustomToDate] = useState<Date | undefined>(value.toDate)
  const [selectedPreset, setSelectedPreset] = useState(value.preset)

  // Update local state when value prop changes
  useEffect(() => {
    setSelectedPreset(value.preset)
    if (value.preset === "custom") {
      setCustomFromDate(value.fromDate)
      setCustomToDate(value.toDate)
    }
  }, [value])

  const handlePresetChange = (presetId: string) => {
    const datePresets = getDatePresets(mostRecentDate)
    const preset = datePresets.find(p => p.id === presetId)
    if (!preset) return

    setSelectedPreset(presetId)

    if (presetId === "custom") {
      // Don't change anything yet for custom - wait for date selection
      setIsOpen(true) // Keep popover open for custom range
      return
    }

    const filterValue = preset.getValue()
    onChange(filterValue)
    setIsOpen(false)
  }

  const handleCustomDateChange = () => {
    if (!customFromDate || !customToDate) return

    const label = `${formatDateIST(customFromDate)} - ${formatDateIST(customToDate)}`
    onChange({
      preset: "custom",
      fromDate: customFromDate,
      toDate: customToDate,
      label
    })
    setIsOpen(false)
  }

  const handleClear = () => {
    const datePresets = getDatePresets(mostRecentDate)
    const mostRecentFilter = datePresets[0].getValue()
    onChange(mostRecentFilter)
    setSelectedPreset("mostRecent")
    setCustomFromDate(undefined)
    setCustomToDate(undefined)
  }

  const formatDisplayLabel = () => {
    if (value.preset === "custom" && value.fromDate && value.toDate) {
      return `${formatDateIST(value.fromDate)} - ${formatDateIST(value.toDate)}`
    }
    return value.label || "Most Recent"
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[400px] justify-between text-left font-normal",
            className
          )}
        >
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="truncate">{formatDisplayLabel()}</span>
          </div>
          <div className="flex items-center ml-2">
            <ChevronDown className="h-4 w-4 opacity-50 ml-1" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[600px] p-0" align="start">
        <div className="flex">
          {/* Preset List */}
          <div className="border-r">
            <div className="p-3 space-y-1">
              <div className="text-sm font-medium text-muted-foreground mb-2">Quick Filters</div>
              {getDatePresets(mostRecentDate).map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "ghost"}
                  className="w-full justify-start text-sm h-8"
                  onClick={() => handlePresetChange(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Calendar for Custom Range */}
          {selectedPreset === "custom" && (
            <div className="p-3">
              <div className="text-sm font-medium mb-3">Select Date Range</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={customFromDate}
                    onSelect={setCustomFromDate}
                    className="rounded-md border"
                    numberOfMonths={1}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
                  <CalendarComponent
                    mode="single"
                    selected={customToDate}
                    onSelect={setCustomToDate}
                    className="rounded-md border"
                    numberOfMonths={1}
                    disabled={(date) => customFromDate ? date < customFromDate : false}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleCustomDateChange}
                    disabled={!customFromDate || !customToDate}
                    className="flex-1"
                  >
                    Apply Range
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Helper function to check if a date matches the filter
export function doesDateMatchFilter(dateString: string, filter: DateFilterState): boolean {
  try {
    const date = parseLocalDateIST(dateString)

    if (filter.preset === "mostRecent") {
      // For most recent, check if it matches the specific date
      if (filter.mostRecentDate) {
        return dateString === filter.mostRecentDate
      }
      // Fallback to checking if it's within the date range
      if (filter.fromDate && filter.toDate) {
        return isWithinInterval(date, {
          start: startOfDay(filter.fromDate),
          end: endOfDay(filter.toDate)
        })
      }
      return false
    }

    if (filter.preset === "today") {
      return isToday(date)
    }

    if (filter.preset === "yesterday") {
      return isYesterday(date)
    }

    // For range-based filters, check if date is within the range
    if (filter.fromDate && filter.toDate) {
      return isWithinInterval(date, {
        start: startOfDay(filter.fromDate),
        end: endOfDay(filter.toDate)
      })
    }

    return false
  } catch (error) {
    console.error("Error parsing date:", dateString, error)
    return false
  }
}