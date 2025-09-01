import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { SortConfig, SortDirection } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SortableTableHeadProps<T = unknown> {
  children: React.ReactNode
  sortKey: string
  sortConfig: SortConfig<T> | null
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHead<T = unknown>({
  children,
  sortKey,
  sortConfig,
  onSort,
  className
}: SortableTableHeadProps<T>) {
  const isSorted = sortConfig?.key === sortKey
  const sortDirection: SortDirection | null = isSorted ? sortConfig.direction : null

  const getSortIcon = () => {
    if (!isSorted) return <ArrowUpDown className="h-4 w-4 opacity-50" />
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4" />
    return <ArrowDown className="h-4 w-4" />
  }

  const isRightAligned = className?.includes('text-right')

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none transition-colors hover:bg-muted/50",
        isSorted && "bg-muted/30",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn(
        "flex items-center space-x-2",
        isRightAligned && "justify-end"
      )}>
        <span>{children}</span>
        {getSortIcon()}
      </div>
    </TableHead>
  )
}