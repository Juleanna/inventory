import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSparePartsList } from '@/hooks/use-spare-parts'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Package, Truck, ShoppingCart } from 'lucide-react'

export default function SparePartsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useSparePartsList({
    page,
    search: debouncedSearch || undefined,
  })
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Запчастини"
        description={`Всього: ${data?.count || 0} позицій`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/spare-parts/suppliers">
                <Truck className="mr-2 h-4 w-4" />
                Постачальники
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/spare-parts/orders">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Замовлення
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук запчастин..."
          className="sm:w-72"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Package className="h-12 w-12" />}
          title="Запчастини не знайдено"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead className="hidden md:table-cell">Артикул</TableHead>
                  <TableHead>Кількість</TableHead>
                  <TableHead className="hidden sm:table-cell">Ціна</TableHead>
                  <TableHead className="hidden lg:table-cell">Місце</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      <span className="font-medium">{part.name}</span>
                      <p className="text-xs text-muted-foreground">{part.manufacturer}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">
                      {part.part_number}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={part.quantity <= part.min_quantity ? 'destructive' : 'secondary'}
                      >
                        {part.quantity}
                      </Badge>
                      {part.quantity <= part.min_quantity && (
                        <span className="ml-2 text-xs text-destructive">Мін: {part.min_quantity}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {part.unit_price} грн
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {part.location}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Сторінка {page} з {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Попередня</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Наступна</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
