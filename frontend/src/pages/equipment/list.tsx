import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEquipmentList, useDeleteEquipment } from '@/hooks/use-equipment'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, MoreHorizontal, Eye, Trash2, Monitor } from 'lucide-react'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EquipmentFormDialog } from '@/components/equipment/equipment-form'

export default function EquipmentListPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useEquipmentList({
    page,
    search: debouncedSearch || undefined,
    category: category || undefined,
    status: status || undefined,
  })
  const deleteEquipment = useDeleteEquipment()

  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Обладнання"
        description={`Всього: ${data?.count || 0} одиниць`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Додати
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук за назвою, серійним номером..."
          className="sm:w-72"
        />
        <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Категорія" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі категорії</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Monitor className="h-12 w-12" />}
          title="Обладнання не знайдено"
          description="Спробуйте змінити параметри пошуку або додайте нове обладнання"
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати обладнання
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead className="hidden md:table-cell">Категорія</TableHead>
                  <TableHead className="hidden sm:table-cell">Серійний номер</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="hidden lg:table-cell">Місцезнаходження</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link to={`/equipment/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.manufacturer} {item.model}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">
                      {item.serial_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={cn('text-xs', STATUS_COLORS[item.status])}>
                        {STATUS_LABELS[item.status] || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {item.location}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/equipment/${item.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Переглянути
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Сторінка {page} з {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Попередня
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Наступна
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <EquipmentFormDialog open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити обладнання?"
        description="Ця дія є незворотною. Обладнання буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteEquipment.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />
    </div>
  )
}
