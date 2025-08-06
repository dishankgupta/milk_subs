"use client"

interface OrderDateFilterProps {
  defaultValue?: string
}

export function OrderDateFilter({ defaultValue }: OrderDateFilterProps) {
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