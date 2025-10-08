"use client"

import { useRouter } from "next/navigation"
import { UnifiedDatePicker } from "@/components/ui/unified-date-picker"
import { formatDateForDatabase, parseLocalDateIST } from "@/lib/date-utils"

interface DateFilterProps {
  defaultValue?: string
}

export function DateFilter({ defaultValue }: DateFilterProps) {
  const router = useRouter()

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const formattedDate = formatDateForDatabase(date)
      router.push(`/dashboard/deliveries?date=${formattedDate}`)
    }
  }

  const initialDate = defaultValue ? parseLocalDateIST(defaultValue) : undefined

  return (
    <div className="w-auto">
      <UnifiedDatePicker
        value={initialDate}
        onChange={handleDateChange}
        placeholder="DD-MM-YYYY"
        className="w-[180px]"
      />
    </div>
  )
}
