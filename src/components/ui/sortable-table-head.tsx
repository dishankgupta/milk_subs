import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { SortConfig, SortDirection } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SortableTableHeadProps {
  children: React.ReactNode
  sortKey: string
  sortConfig: SortConfig<any> | null
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHead({
  children,
  sortKey,
  sortConfig,
  onSort,
  className
}: SortableTableHeadProps) {
  const isSorted = sortConfig?.key === sortKey
  const sortDirection: SortDirection | null = isSorted ? sortConfig.direction : null

  const getSortIcon = () => {
    if (!isSorted) return <ArrowUpDown className="h-4 w-4 opacity-50" />
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />
    return <ArrowDown className="h-4 w-4" />
  }

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none transition-colors hover:bg-muted/50",
        isSorted && "bg-muted/30",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        {getSortIcon()}
      </div>
    </TableHead>
  )
}