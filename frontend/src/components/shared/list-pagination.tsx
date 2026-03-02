import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ListPaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) {
    pages.push('ellipsis')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 2) {
    pages.push('ellipsis')
  }

  pages.push(total)
  return pages
}

export function ListPagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 25,
}: ListPaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPageNumbers(page, totalPages)
  const from = (page - 1) * pageSize + 1
  const to = totalItems ? Math.min(page * pageSize, totalItems) : page * pageSize

  return (
    <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-2.5">
      <p className="text-sm text-muted-foreground tabular-nums">
        {totalItems != null ? (
          <>
            <span className="font-medium text-foreground">{from}–{to}</span>
            {' '}з{' '}
            <span className="font-medium text-foreground">{totalItems}</span>
          </>
        ) : (
          <>
            Сторінка{' '}
            <span className="font-medium text-foreground">{page}</span>
            {' '}з{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, i) =>
            p === 'ellipsis' ? (
              <span key={`e${i}`} className="w-8 text-center text-muted-foreground text-sm">
                ...
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-sm"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <span className="sm:hidden text-sm text-muted-foreground tabular-nums px-2">
          {page} / {totalPages}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hidden sm:flex"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
