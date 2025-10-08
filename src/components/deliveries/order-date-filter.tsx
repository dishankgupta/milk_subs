"use client"

import { useRouter } from "next/navigation"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"
import { formatDateForDatabase, parseLocalDateIST } from "@/lib/date-utils"

interface OrderDateFilterProps {
  defaultValue?: string
}

export function OrderDateFilter({ defaultValue }: OrderDateFilterProps) {
  const router = useRouter()

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatDateForDatabase(date)
      router.push(`/dashboard/deliveries/new?date=${formattedDate}`)
    }
  }

  const initialDate = defaultValue ? parseLocalDateIST(defaultValue) : undefined

  return (
    <div className="flex gap-2">
      <UnifiedDatePicker
        value={initialDate}
        onChange={handleDateChange}
        placeholder="DD-MM-YYYY"
        className="w-[180px]"
      />
    </div>
  )
}
