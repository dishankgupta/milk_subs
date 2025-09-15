import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export interface PaginationOptions {
  defaultPage?: number
  defaultItemsPerPage?: number
  itemsPerPageOptions?: number[]
  enableUrlSync?: boolean
  maxVisiblePages?: number
}

export interface PaginationResult<T> {
  // Data
  paginatedData: T[]

  // State
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number

  // Calculated properties
  startIndex: number
  endIndex: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  isFirstPage: boolean
  isLastPage: boolean

  // Navigation methods
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  setItemsPerPage: (items: number) => void

  // Page ranges for UI
  visiblePageNumbers: number[]

  // Info for display
  displayInfo: {
    start: number
    end: number
    total: number
    currentPage: number
    totalPages: number
  }
}

const DEFAULT_OPTIONS: Required<PaginationOptions> = {
  defaultPage: 1,
  defaultItemsPerPage: 10,
  itemsPerPageOptions: [10, 25, 50, 100],
  enableUrlSync: false,
  maxVisiblePages: 7
}

export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
): PaginationResult<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL if enabled, otherwise use defaults
  const [currentPage, setCurrentPage] = useState(() => {
    if (opts.enableUrlSync) {
      const pageFromUrl = searchParams?.get('page')
      return pageFromUrl ? Math.max(1, parseInt(pageFromUrl, 10)) : opts.defaultPage
    }
    return opts.defaultPage
  })

  const [itemsPerPage, setItemsPerPageState] = useState(() => {
    if (opts.enableUrlSync) {
      const itemsFromUrl = searchParams?.get('limit')
      const parsed = itemsFromUrl ? parseInt(itemsFromUrl, 10) : opts.defaultItemsPerPage
      return opts.itemsPerPageOptions.includes(parsed) ? parsed : opts.defaultItemsPerPage
    }
    return opts.defaultItemsPerPage
  })

  // Sync with URL when enabled
  const updateUrl = useCallback((page: number, limit: number) => {
    if (!opts.enableUrlSync || !router) return

    const params = new URLSearchParams(searchParams?.toString())
    params.set('page', page.toString())
    params.set('limit', limit.toString())

    router.push(`?${params.toString()}`, { scroll: false })
  }, [opts.enableUrlSync, router, searchParams])

  // Calculate derived values
  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Ensure current page is valid when data changes
  const validCurrentPage = useMemo(() => {
    if (totalPages === 0) return 1
    return Math.min(currentPage, totalPages)
  }, [currentPage, totalPages])

  // Update current page if it became invalid
  useEffect(() => {
    if (validCurrentPage !== currentPage) {
      setCurrentPage(validCurrentPage)
    }
  }, [validCurrentPage, currentPage])

  // Calculate pagination info
  const startIndex = (validCurrentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

  const hasNextPage = validCurrentPage < totalPages
  const hasPreviousPage = validCurrentPage > 1
  const isFirstPage = validCurrentPage === 1
  const isLastPage = validCurrentPage === totalPages || totalPages === 0

  // Get paginated data slice
  const paginatedData = useMemo(() => {
    return data.slice(startIndex, endIndex)
  }, [data, startIndex, endIndex])

  // Calculate visible page numbers for pagination UI
  const visiblePageNumbers = useMemo(() => {
    if (totalPages <= opts.maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const half = Math.floor(opts.maxVisiblePages / 2)
    let start = Math.max(1, validCurrentPage - half)
    const end = Math.min(totalPages, start + opts.maxVisiblePages - 1)

    // Adjust start if we're near the end
    if (end - start + 1 < opts.maxVisiblePages) {
      start = Math.max(1, end - opts.maxVisiblePages + 1)
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [totalPages, validCurrentPage, opts.maxVisiblePages])

  // Navigation methods
  const goToPage = useCallback((page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(newPage)
    if (opts.enableUrlSync) {
      updateUrl(newPage, itemsPerPage)
    }
  }, [totalPages, itemsPerPage, updateUrl, opts.enableUrlSync])

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      goToPage(validCurrentPage + 1)
    }
  }, [hasNextPage, validCurrentPage, goToPage])

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      goToPage(validCurrentPage - 1)
    }
  }, [hasPreviousPage, validCurrentPage, goToPage])

  const goToFirstPage = useCallback(() => {
    goToPage(1)
  }, [goToPage])

  const goToLastPage = useCallback(() => {
    goToPage(totalPages)
  }, [goToPage, totalPages])

  const setItemsPerPage = useCallback((items: number) => {
    if (!opts.itemsPerPageOptions.includes(items)) return

    setItemsPerPageState(items)

    // Adjust current page to maintain relative position
    const currentIndex = (validCurrentPage - 1) * itemsPerPage
    const newPage = Math.max(1, Math.ceil((currentIndex + 1) / items))

    setCurrentPage(newPage)

    if (opts.enableUrlSync) {
      updateUrl(newPage, items)
    }
  }, [validCurrentPage, itemsPerPage, updateUrl, opts.enableUrlSync, opts.itemsPerPageOptions])

  // Display info for UI components
  const displayInfo = {
    start: totalItems === 0 ? 0 : startIndex + 1,
    end: endIndex,
    total: totalItems,
    currentPage: validCurrentPage,
    totalPages
  }

  return {
    paginatedData,
    currentPage: validCurrentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    hasNextPage,
    hasPreviousPage,
    isFirstPage,
    isLastPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setItemsPerPage,
    visiblePageNumbers,
    displayInfo
  }
}