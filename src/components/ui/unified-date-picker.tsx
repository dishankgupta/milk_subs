"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { CalendarIcon, Clock } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { IMaskInput } from "react-imask"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getCurrentISTDate, parseLocalDateIST } from "@/lib/date-utils"
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
  // Converts to YYYY-MM-DD format and uses IST date utilities
  const parseDateInput = (input: string): Date | null => {
    if (!input) return null

    // Remove all spaces for date part extraction
    input = input.trim()

    try {
      let dateStr = input
      let timeStr = ""

      // Extract date and time parts if withTime is enabled
      if (withTime && input.includes(" ")) {
        const parts = input.split(" ")
        dateStr = parts[0]
        timeStr = parts[1] || ""
      }

      // Extract digits from date string
      const dateDigits = dateStr.replace(/\D/g, "")

      // Parse date based on digit count
      let day: string, month: string, year: string

      if (dateDigits.length === 8) {
        // DDMMYYYY format
        day = dateDigits.substring(0, 2)
        month = dateDigits.substring(2, 4)
        year = dateDigits.substring(4, 8)
      } else {
        return null
      }

      // Validate year range
      const yearNum = parseInt(year, 10)
      if (yearNum < 2000 || yearNum > 2099) {
        return null
      }

      // Convert DD-MM-YYYY to YYYY-MM-DD and use IST utility
      const dbFormat = `${year}-${month}-${day}`
      const parsed = parseLocalDateIST(dbFormat)

      // Parse and add time if present
      if (withTime && timeStr) {
        const timeDigits = timeStr.replace(/\D/g, "")
        if (timeDigits.length === 4) {
          const hours = parseInt(timeDigits.substring(0, 2), 10)
          const minutes = parseInt(timeDigits.substring(2, 4), 10)

          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            parsed.setHours(hours, minutes, 0, 0)
          }
        }
      }

      return isValid(parsed) ? parsed : null
    } catch (error) {
      // parseLocalDateIST throws errors for invalid dates
      return null
    }
  }

  // Handle masked input change (called by IMask on every change)
  const handleMaskedInputAccept = (value: string) => {
    setInputValue(value)

    // Extract digits to check if we have a complete date
    const digitsOnly = value.replace(/\D/g, "")

    // Only parse and update when we have complete dates
    // Date only: 8 digits (DDMMYYYY)
    // Date + time: 12 digits (DDMMYYYYHHMM)
    const isComplete = withTime ? digitsOnly.length === 12 : digitsOnly.length === 8

    if (isComplete) {
      const parsed = parseDateInput(value)
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

    const timeValue = e.target.value
    if (!timeValue || !timeValue.includes(':')) return

    const [hours, minutes] = timeValue.split(':')
    const hoursNum = parseInt(hours, 10)
    const minutesNum = parseInt(minutes, 10)

    // Validate the parsed values
    if (isNaN(hoursNum) || isNaN(minutesNum)) return
    if (hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59) return

    const newDate = new Date(selectedDate)
    newDate.setHours(hoursNum, minutesNum)

    // Ensure the new date is valid
    if (!isValid(newDate)) return

    setSelectedDate(newDate)
    onChange?.(newDate)
    setInputValue(formatDateDisplay(newDate, withTime))
  }

  return (
    <div className={cn("relative", className)}>
      <IMaskInput
        inputRef={inputRef}
        mask={withTime ? "00-00-0000 00:00" : "00-00-0000"}
        placeholder={withTime ? "DD-MM-YYYY HH:mm" : placeholder}
        value={inputValue}
        onAccept={handleMaskedInputAccept}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
            month={month && isValid(month) ? month : getCurrentISTDate()}
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
                  value={selectedDate && isValid(selectedDate) ? format(selectedDate, "HH:mm") : "00:00"}
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
