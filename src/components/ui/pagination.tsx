import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { PaginationResult } from '@/hooks/usePagination'

// Base pagination controls component
interface PaginationControlsProps<T> {
  pagination: PaginationResult<T>
  showFirstLast?: boolean
  showJumpToPage?: boolean
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

export function PaginationControls<T>({
  pagination,
  showFirstLast = true,
  showJumpToPage = false,
  className,
  size = 'default'
}: PaginationControlsProps<T>) {
  const {
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    visiblePageNumbers
  } = pagination

  const [jumpToValue, setJumpToValue] = React.useState('')

  const handleJumpTo = (e: React.FormEvent) => {
    e.preventDefault()
    const page = parseInt(jumpToValue, 10)
    if (page >= 1 && page <= totalPages) {
      goToPage(page)
      setJumpToValue('')
    }
  }

  const buttonSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'

  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      {/* First Page */}
      {showFirstLast && (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={goToFirstPage}
          disabled={isFirstPage}
          className="px-2"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Previous Page */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={goToPreviousPage}
        disabled={!hasPreviousPage}
        className="px-2"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {visiblePageNumbers.map((pageNum, index) => {
          const isCurrentPage = pageNum === currentPage
          const showEllipsisBefore = index === 0 && pageNum > 1
          const showEllipsisAfter = index === visiblePageNumbers.length - 1 && pageNum < totalPages

          return (
            <React.Fragment key={pageNum}>
              {showEllipsisBefore && (
                <div className="flex items-center justify-center w-8 h-8">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
              )}

              <Button
                variant={isCurrentPage ? "default" : "outline"}
                size={buttonSize}
                onClick={() => goToPage(pageNum)}
                className={cn(
                  "min-w-8 px-2",
                  isCurrentPage && "pointer-events-none"
                )}
                aria-label={`Go to page ${pageNum}`}
                aria-current={isCurrentPage ? "page" : undefined}
              >
                {pageNum}
              </Button>

              {showEllipsisAfter && (
                <div className="flex items-center justify-center w-8 h-8">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Next Page */}
      <Button
        variant="outline"
        size={buttonSize}
        onClick={goToNextPage}
        disabled={!hasNextPage}
        className="px-2"
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Last Page */}
      {showFirstLast && (
        <Button
          variant="outline"
          size={buttonSize}
          onClick={goToLastPage}
          disabled={isLastPage}
          className="px-2"
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      )}

      {/* Jump to Page */}
      {showJumpToPage && totalPages > 10 && (
        <form onSubmit={handleJumpTo} className="flex items-center gap-2 ml-4">
          <span className="text-sm text-muted-foreground">Go to:</span>
          <Input
            type="number"
            min="1"
            max={totalPages}
            value={jumpToValue}
            onChange={(e) => setJumpToValue(e.target.value)}
            className="w-16 h-8"
            placeholder="Page"
          />
          <Button type="submit" size="sm" variant="outline">
            Go
          </Button>
        </form>
      )}
    </div>
  )
}

// Items per page selector component
interface ItemsPerPageSelectorProps<T> {
  pagination: PaginationResult<T>
  options?: number[]
  className?: string
  label?: string
}

export function ItemsPerPageSelector<T>({
  pagination,
  options = [10, 25, 50, 100],
  className,
  label = "Items per page"
}: ItemsPerPageSelectorProps<T>) {
  const { itemsPerPage, setItemsPerPage } = pagination

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground whitespace-nowrap">{label}:</span>
      <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value, 10))}>
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// Pagination info component
interface PaginationInfoProps<T> {
  pagination: PaginationResult<T>
  className?: string
  itemName?: string
  showTotal?: boolean
}

export function PaginationInfo<T>({
  pagination,
  className,
  itemName = "items",
  showTotal = true
}: PaginationInfoProps<T>) {
  const { displayInfo } = pagination
  const { start, end, total, currentPage, totalPages } = displayInfo

  if (total === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        No {itemName} found
      </p>
    )
  }

  return (
    <div className={cn('text-sm text-muted-foreground', className)}>
      <p>
        Showing {start}-{end} of {total} {itemName}
        {showTotal && totalPages > 1 && (
          <span className="ml-2">
            (Page {currentPage} of {totalPages})
          </span>
        )}
      </p>
    </div>
  )
}

// Complete pagination container component
interface PaginationContainerProps<T> {
  pagination: PaginationResult<T>
  itemName?: string
  showItemsPerPage?: boolean
  showFirstLast?: boolean
  showJumpToPage?: boolean
  showInfo?: boolean
  itemsPerPageOptions?: number[]
  className?: string
  controlsClassName?: string
  infoClassName?: string
  selectorClassName?: string
  layout?: 'horizontal' | 'vertical' | 'split'
  size?: 'sm' | 'default' | 'lg'
}

export function PaginationContainer<T>({
  pagination,
  itemName = "items",
  showItemsPerPage = true,
  showFirstLast = true,
  showJumpToPage = false,
  showInfo = true,
  itemsPerPageOptions = [10, 25, 50, 100],
  className,
  controlsClassName,
  infoClassName,
  selectorClassName,
  layout = 'horizontal',
  size = 'default'
}: PaginationContainerProps<T>) {
  const { totalPages } = pagination

  if (totalPages <= 1 && !showInfo && !showItemsPerPage) return null

  const InfoComponent = showInfo ? (
    <PaginationInfo
      pagination={pagination}
      itemName={itemName}
      className={infoClassName}
    />
  ) : null

  const SelectorComponent = showItemsPerPage ? (
    <ItemsPerPageSelector
      pagination={pagination}
      options={itemsPerPageOptions}
      className={selectorClassName}
    />
  ) : null

  const ControlsComponent = totalPages > 1 ? (
    <PaginationControls
      pagination={pagination}
      showFirstLast={showFirstLast}
      showJumpToPage={showJumpToPage}
      className={controlsClassName}
      size={size}
    />
  ) : null

  if (layout === 'split') {
    return (
      <div className={cn('flex items-center justify-between gap-4', className)}>
        <div className="flex items-center gap-4">
          {InfoComponent}
          {SelectorComponent}
        </div>
        {ControlsComponent}
      </div>
    )
  }

  if (layout === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between gap-4">
          {InfoComponent}
          {SelectorComponent}
        </div>
        {ControlsComponent && (
          <div className="flex justify-center">
            {ControlsComponent}
          </div>
        )}
      </div>
    )
  }

  // Horizontal layout (default)
  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-4">
        {InfoComponent}
        {SelectorComponent}
      </div>
      {ControlsComponent}
    </div>
  )
}

// Export a simple wrapper for common use cases
export function SimplePagination<T>(props: {
  pagination: PaginationResult<T>
  itemName?: string
  className?: string
  itemsPerPageOptions?: number[]
}) {
  return (
    <PaginationContainer
      {...props}
      layout="split"
      showFirstLast={true}
      showJumpToPage={false}
      size="default"
      itemsPerPageOptions={props.itemsPerPageOptions}
    />
  )
}