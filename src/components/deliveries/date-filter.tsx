"use client"

import { Input } from "@/components/ui/input"

interface DateFilterProps {
  defaultValue?: string
  searchValue?: string
  routeValue?: string
}

export function DateFilter({ defaultValue, searchValue, routeValue }: DateFilterProps) {
  return (
    <form action="/dashboard/deliveries" method="GET">
      <Input
        type="date"
        name="date"
        defaultValue={defaultValue || ""}
        className="w-auto"
        onChange={(e) => e.target.form?.submit()}
      />
      {searchValue && (
        <input type="hidden" name="search" value={searchValue} />
      )}
      {routeValue && (
        <input type="hidden" name="route" value={routeValue} />
      )}
    </form>
  )
}