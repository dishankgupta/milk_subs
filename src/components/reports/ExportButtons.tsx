'use client'

import { Button } from '@/components/ui/button'

export function ExportButtons() {
  return (
    <div className="flex gap-2">
      <Button onClick={() => alert("Export functionality would be implemented here")}>
        Export to PDF
      </Button>
      <Button variant="outline" onClick={() => alert("Export functionality would be implemented here")}>
        Export to Excel
      </Button>
    </div>
  )
}