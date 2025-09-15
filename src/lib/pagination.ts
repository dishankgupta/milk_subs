// Re-export pagination utilities for easier importing
export { usePagination } from '@/hooks/usePagination'
export type { PaginationOptions, PaginationResult } from '@/hooks/usePagination'

export {
  PaginationControls,
  ItemsPerPageSelector,
  PaginationInfo,
  PaginationContainer,
  SimplePagination
} from '@/components/ui/pagination'

// Common pagination configurations
export const PAGINATION_CONFIGS = {
  // Small datasets (up to 100 items)
  small: {
    defaultItemsPerPage: 10,
    itemsPerPageOptions: [5, 10, 25],
    maxVisiblePages: 5
  },

  // Medium datasets (up to 1000 items)
  medium: {
    defaultItemsPerPage: 25,
    itemsPerPageOptions: [10, 25, 50],
    maxVisiblePages: 7
  },

  // Large datasets (1000+ items)
  large: {
    defaultItemsPerPage: 50,
    itemsPerPageOptions: [25, 50, 100, 200],
    maxVisiblePages: 7
  },

  // Mobile-friendly configuration
  mobile: {
    defaultItemsPerPage: 10,
    itemsPerPageOptions: [5, 10, 20],
    maxVisiblePages: 3
  }
} as const

// Utility function to create pagination config based on data size
export function createPaginationConfig(dataSize: number, isMobile = false) {
  if (isMobile) {
    return {
      ...PAGINATION_CONFIGS.mobile,
      itemsPerPageOptions: [...PAGINATION_CONFIGS.mobile.itemsPerPageOptions]
    }
  }

  if (dataSize <= 100) {
    return {
      ...PAGINATION_CONFIGS.small,
      itemsPerPageOptions: [...PAGINATION_CONFIGS.small.itemsPerPageOptions]
    }
  } else if (dataSize <= 1000) {
    return {
      ...PAGINATION_CONFIGS.medium,
      itemsPerPageOptions: [...PAGINATION_CONFIGS.medium.itemsPerPageOptions]
    }
  } else {
    return {
      ...PAGINATION_CONFIGS.large,
      itemsPerPageOptions: [...PAGINATION_CONFIGS.large.itemsPerPageOptions]
    }
  }
}