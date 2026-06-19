import { useMemo } from 'react'

interface PaginationResult {
  page: number
  limit: number
  skip: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  from: number
  to: number
}

export function usePagination(
  page: number,
  limit: number,
  total: number
): PaginationResult {
  return useMemo(() => {
    const totalPages = Math.ceil(total / limit) || 1
    return {
      page,
      limit,
      skip: (page - 1) * limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      from: total === 0 ? 0 : (page - 1) * limit + 1,
      to: Math.min(page * limit, total),
    }
  }, [page, limit, total])
}
