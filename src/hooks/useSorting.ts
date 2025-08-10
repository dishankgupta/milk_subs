import { useState, useMemo } from 'react'
import { SortConfig, SortDirection } from '@/lib/types'

export function useSorting<T>(
  data: T[],
  defaultSortKey?: keyof T | string,
  defaultDirection: SortDirection = 'asc',
  customValueGetter?: (item: T, key: string) => unknown
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    defaultSortKey ? { key: defaultSortKey, direction: defaultDirection } : null
  )

  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    const sortableData = [...data]
    
    sortableData.sort((a, b) => {
      let aValue, bValue
      
      if (customValueGetter) {
        aValue = customValueGetter(a, sortConfig.key as string)
        bValue = customValueGetter(b, sortConfig.key as string)
      } else {
        aValue = getNestedValue(a, sortConfig.key as string)
        bValue = getNestedValue(b, sortConfig.key as string)
      }
      
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1
      
      let comparison = 0
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        // Convert to string for comparison
        comparison = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase())
      }

      return sortConfig.direction === 'desc' ? -comparison : comparison
    })

    return sortableData
  }, [data, sortConfig, customValueGetter])

  const handleSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc'
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
  }

  return {
    sortedData,
    sortConfig,
    handleSort,
    setSortConfig
  }
}

// Helper function to get nested object values using dot notation
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    return current && typeof current === 'object' && current !== null && key in current 
      ? (current as Record<string, unknown>)[key] 
      : undefined
  }, obj)
}