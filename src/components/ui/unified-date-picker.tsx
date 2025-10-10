"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { format, parse, isValid } from "date-fns"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getCurrentISTDate } from "@/lib/date-utils"
import { toast } from "sonner"

export interface UnifiedDatePickerProps {
  value?: Date | undefined
  onChange?: (date: Date | undefined) => void
  withTime?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function UnifiedDatePicker({
  value,
  onChange,
  withTime = false,
  placeholder = "DD-MM-YYYY",
  disabled = false,
  className,
  minDate,
  maxDate,
}: UnifiedDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value)
  const [month, setMonth] = useState<Date | undefined>(value || getCurrentISTDate())
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync with external value changes
  useEffect(() => {
    setSelectedDate(value)
    if (value) {
      setInputValue(formatDateDisplay(value, withTime))
      setMonth(value) // Update calendar month when value changes
    } else {
      setInputValue("")
    }
  }, [value, withTime])

  // Format date for display (DD-MM-YYYY or DD-MM-YYYY HH:mm)
  const formatDateDisplay = (date: Date, includeTime: boolean): string => {
    if (!date) return ""
    try {
      if (includeTime) {
        return format(date, "dd-MM-yyyy HH:mm")
      }
      return format(date, "dd-MM-yyyy")
    } catch (error) {
      return ""
    }
  }

  // Parse multiple date formats: DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY
  const parseDateInput = (input: string): Date | null => {
    if (!input) return null

    // Remove all spaces
    input = input.trim()

    try {
      // Try DD-MM-YYYY HH:mm format (with time)
      if (withTime && input.includes(" ")) {
        const formats = ["dd-MM-yyyy HH:mm", "dd/MM/yyyy HH:mm", "ddMMyyyy HH:mm"]
        for (const fmt of formats) {
          const parsed = parse(input, fmt, new Date())
          if (isValid(parsed)) return parsed
        }
      }

      // Try date-only formats
      const formats = [
        "dd-MM-yyyy",   // DD-MM-YYYY
        "dd/MM/yyyy",   // DD/MM/YYYY
        "ddMMyyyy",     // DDMMYYYY
      ]

      for (const fmt of formats) {
        const parsed = parse(input, fmt, new Date())
        if (isValid(parsed)) return parsed
      }

      return null
    } catch (error) {
      return null
    }
  }

  // Smart input formatting while typing
  const formatInputWhileTyping = (input: string): string => {
    // Remove all non-digit characters for processing
    const digitsOnly = input.replace(/\D/g, "")

    // Limit to max length based on mode
    const maxLength = withTime ? 12 : 8 // DDMMYYYY (8) or DDMMYYYYHHMM (12)
    const limited = digitsOnly.slice(0, maxLength)

    if (withTime) {
      // Format: DDMMYYYYHHMM -> DD-MM-YYYY HH:mm
      if (limited.length <= 2) return limited
      if (limited.length <= 4) return `${limited.slice(0, 2)}-${limited.slice(2)}`
      if (limited.length <= 8) return `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4)}`
      if (limited.length <= 10) return `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4, 8)} ${limited.slice(8)}`
      return `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4, 8)} ${limited.slice(8, 10)}:${limited.slice(10)}`
    } else {
      // Format: DDMMYYYY -> DD-MM-YYYY
      if (limited.length <= 2) return limited
      if (limited.length <= 4) return `${limited.slice(0, 2)}-${limited.slice(2)}`
      return `${limited.slice(0, 2)}-${limited.slice(2, 4)}-${limited.slice(4)}`
    }
  }

  // Handle manual input change with auto-formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Allow user to type freely but auto-format with hyphens
    const formatted = formatInputWhileTyping(newValue)
    setInputValue(formatted)

    // Extract digits to check if we have a complete date
    const digitsOnly = formatted.replace(/\D/g, "")

    // Only parse and update when we have complete dates
    // Date only: 8 digits (DDMMYYYY)
    // Date + time: 12 digits (DDMMYYYYHHMM)
    const isComplete = withTime ? digitsOnly.length === 12 : digitsOnly.length === 8

    if (isComplete) {
      const parsed = parseDateInput(formatted)
      if (parsed) {
        setSelectedDate(parsed)
        setMonth(parsed) // Navigate calendar to the typed date's month
        onChange?.(parsed)
      }
    }
  }

  // Validate date against min/max constraints
  const validateDate = (date: Date): boolean => {
    if (minDate && date < minDate) {
      return false
    }
    if (maxDate && date > maxDate) {
      return false
    }
    return true
  }

  // Handle input blur (final validation and formatting)
  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      setSelectedDate(undefined)
      onChange?.(undefined)
      return
    }

    const parsed = parseDateInput(inputValue)
    if (parsed) {
      // Validate against min/max dates
      if (!validateDate(parsed)) {
        let errorMsg = "Date is outside allowed range"
        if (minDate && parsed < minDate) {
          errorMsg = `Date must be on or after ${formatDateDisplay(minDate, false)}`
        } else if (maxDate && parsed > maxDate) {
          errorMsg = `Date must be on or before ${formatDateDisplay(maxDate, false)}`
        }
        toast.error(errorMsg)
        // Restore previous value
        if (selectedDate) {
          setInputValue(formatDateDisplay(selectedDate, withTime))
        } else {
          setInputValue("")
        }
        return
      }

      // Format nicely on blur
      const formatted = formatDateDisplay(parsed, withTime)
      setInputValue(formatted)
      setSelectedDate(parsed)
      onChange?.(parsed)
    } else {
      toast.error("Invalid date format. Use DD-MM-YYYY or DDMMYYYY or DD/MM/YYYY")
      // Restore previous value
      if (selectedDate) {
        setInputValue(formatDateDisplay(selectedDate, withTime))
      } else {
        setInputValue("")
      }
    }
  }

  // Handle input focus - show calendar
  const handleInputFocus = () => {
    setOpen(true)
  }

  // Handle calendar date selection
  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined)
      onChange?.(undefined)
      setInputValue("")
      return
    }

    // If withTime, preserve existing time or set to current time
    let finalDate = date
    if (withTime) {
      if (selectedDate) {
        // Preserve existing time
        finalDate = new Date(date)
        finalDate.setHours(selectedDate.getHours())
        finalDate.setMinutes(selectedDate.getMinutes())
      } else {
        // Set to current time
        const now = getCurrentISTDate()
        finalDate = new Date(date)
        finalDate.setHours(now.getHours())
        finalDate.setMinutes(now.getMinutes())
      }
    }

    setSelectedDate(finalDate)
    onChange?.(finalDate)
    setInputValue(formatDateDisplay(finalDate, withTime))

    if (!withTime) {
      setOpen(false)
      inputRef.current?.focus()
    }
  }

  // Handle time change
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedDate) return

    const [hours, minutes] = e.target.value.split(':')
    const newDate = new Date(selectedDate)
    newDate.setHours(parseInt(hours), parseInt(minutes))

    setSelectedDate(newDate)
    onChange?.(newDate)
    setInputValue(formatDateDisplay(newDate, withTime))
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        ref={inputRef}
        type="text"
        placeholder={withTime ? "DD-MM-YYYY HH:mm" : placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        disabled={disabled}
        className={cn(
          "pr-10",
          !selectedDate && "text-muted-foreground"
        )}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent disabled:opacity-50"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={(date) => {
              if (disabled) return true
              if (minDate && date < minDate) return true
              if (maxDate && date > maxDate) return true
              return false
            }}
          />
          {withTime && selectedDate && (
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={format(selectedDate, "HH:mm")}
                  onChange={handleTimeChange}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
