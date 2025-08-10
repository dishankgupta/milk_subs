"use client"

import { useEffect, useState } from "react"

interface OrderDateFilterProps {
  defaultValue?: string
}

export function OrderDateFilter({ defaultValue }: OrderDateFilterProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder during SSR to prevent hydration mismatch
    return (
      <form action="/dashboard/deliveries/new" method="GET" className="flex gap-2">
        <input
          type="date"
          name="date"
          className="px-3 py-1 border rounded"
          disabled
        />
      </form>
    )
  }

  return (
    <form action="/dashboard/deliveries/new" method="GET" className="flex gap-2">
      <input
        type="date"
        name="date"
        defaultValue={defaultValue || ""}
        className="px-3 py-1 border rounded"
        onChange={(e) => e.target.form?.submit()}
      />
    </form>
  )
}