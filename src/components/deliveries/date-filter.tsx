"use client"

import { Input } from "@/components/ui/input"

interface DateFilterProps {
  defaultValue?: string
}

export function DateFilter({ defaultValue }: DateFilterProps) {
  return (
    <form action="/dashboard/deliveries" method="GET">
      <Input
        type="date"
        name="date"
        defaultValue={defaultValue || ""}
        className="w-auto"
        onChange={(e) => e.target.form?.submit()}
      />
    </form>
  )
}