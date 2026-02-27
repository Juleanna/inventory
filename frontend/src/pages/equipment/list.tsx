import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEquipmentList, useDeleteEquipment, useRegenerateCodes } from '@/hooks/use-equipment'
import { useDebounce } from '@/hooks/use-debounce'
import { equipmentApi, type EquipmentFilters } from '@/api/equipment'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Monitor, Download, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown, QrCode, Printer, RefreshCw } from 'lucide-react'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EquipmentFormDialog } from '@/components/equipment/equipment-form'
import { toast } from 'sonner'
import type { Equipment } from '@/types'

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"><Skeleton className="h-4 w-4" /></TableHead>
            <TableHead>Назва</TableHead>
            <TableHead className="hidden md:table-cell">Категорія</TableHead>
            <TableHead className="hidden sm:table-cell">Серійний номер</TableHead>
            <TableHead className="hidden xl:table-cell">Інв. номер</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead className="hidden lg:table-cell">Місцезнаходження</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-4" /></TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </TableCell>
              <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
              <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
              <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
              <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8 rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

type SortField = 'name' | 'category' | 'status' | 'purchase_date' | 'created_at'
type SortDir = 'asc' | 'desc'

function SortIcon({ field, current, direction }: { field: SortField; current: SortField | null; direction: SortDir }) {
  if (current !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  return direction === 'asc'
    ? <ArrowUp className="ml-1 h-3 w-3" />
    : <ArrowDown className="ml-1 h-3 w-3" />
}

export default function EquipmentListPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [location, setLocation] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editEquipment, setEditEquipment] = useState<Equipment | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [codesItem, setCodesItem] = useState<Equipment | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const debouncedSearch = useDebounce(search)
  const debouncedLocation = useDebounce(location)

  const ordering = sortField ? (sortDir === 'desc' ? `-${sortField}` : sortField) : undefined

  const filters: EquipmentFilters = {
    page,
    search: debouncedSearch || undefined,
    category: category || undefined,
    status: statusFilter || undefined,
    location: debouncedLocation || undefined,
    purchase_date_after: dateFrom || undefined,
    purchase_date_before: dateTo || undefined,
    ordering,
  }
  const { data, isLoading } = useEquipmentList(filters)
  const deleteEquipment = useDeleteEquipment()
  const regenerateCodes = useRegenerateCodes()

  const totalPages = data ? Math.ceil(data.count / 25) : 0

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(1)
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const exportFn = format === 'csv' ? equipmentApi.exportCSV : equipmentApi.exportExcel
      const response = await exportFn(filters)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `equipment.${format}`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Експорт ${format.toUpperCase()} завершено`)
    } catch {
      toast.error('Помилка експорту')
    }
  }

  const handleEdit = (item: Equipment) => {
    setEditEquipment(item)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditEquipment(null)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (!data?.results) return
    const allIds = data.results.map((i) => i.id)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const handleMassPrint = () => {
    if (!data?.results) return
    const items = data.results.filter((i) => selectedIds.has(i.id))
    if (!items.length) return
    const w = window.open('', '_blank')
    if (!w) return
    const cards = items.map((item) => `
      <div class="card">
        <h3>${item.name}</h3>
        <p>${item.inventory_number || item.serial_number}</p>
        ${item.qrcode_image ? `<img src="${item.qrcode_image}" class="qr"/>` : '<p class="empty">QR не згенеровано</p>'}
        ${item.barcode_image ? `<img src="${item.barcode_image}" class="barcode"/>` : '<p class="empty">Штрих-код не згенеровано</p>'}
      </div>
    `).join('')
    w.document.write(`
      <html><head><title>Масовий друк кодів</title>
      <style>
        body{font-family:sans-serif;margin:0;padding:20px}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
        .card{border:1px solid #ccc;border-radius:8px;padding:16px;text-align:center;break-inside:avoid}
        .card h3{margin:0 0 4px;font-size:14px}
        .card p{margin:0 0 8px;font-size:12px;color:#666}
        .qr{width:160px;height:160px}
        .barcode{height:60px}
        .empty{font-size:11px;color:#999}
        .toolbar{margin-bottom:16px;display:flex;gap:8px}
        .toolbar button{padding:8px 16px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer;font-size:14px}
        .toolbar button:hover{background:#f0f0f0}
        .toolbar button.primary{background:#0f172a;color:#fff;border-color:#0f172a}
        .toolbar button.primary:hover{background:#1e293b}
        @media print{.toolbar{display:none}.card{border:1px solid #000}}
      </style></head>
      <body>
        <div class="toolbar">
          <button class="primary" onclick="window.print()">Друкувати</button>
          <span style="line-height:36px;color:#666">${items.length} обладнання</span>
        </div>
        <div class="grid">${cards}</div>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div>
      <PageHeader
        title="Обладнання"
        description={`Всього: ${data?.count || 0} одиниць`}
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleMassPrint}>
                <Printer className="mr-2 h-4 w-4" />
                Друк кодів ({selectedIds.size})
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Експорт
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати
            </Button>
          </div>
        }
      />

      {/* Фільтри */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук за назвою, серійним номером..."
          className="sm:w-72"
        />
        <Select value={category} onValueChange={(v) => { setCategory(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Категорія" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі категорії</SelectItem>
            {CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={location}
          onChange={(e) => { setLocation(e.target.value); setPage(1) }}
          placeholder="Місцезнаходження"
          className="w-full sm:w-44"
        />
      </div>

      {/* Фільтри по даті */}
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Покупка від</Label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="w-full sm:w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Покупка до</Label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="w-full sm:w-40" />
        </div>
        {(category || statusFilter || location || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCategory(''); setStatusFilter(''); setLocation(''); setDateFrom(''); setDateTo(''); setPage(1)
            }}
          >
            Скинути фільтри
          </Button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton />
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={!!data?.results?.length && data.results.every((i) => selectedIds.has(i.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center">
                      Назва
                      <SortIcon field="name" current={sortField} direction={sortDir} />
                    </span>
                  </TableHead>
                  <TableHead
                    className="hidden md:table-cell cursor-pointer select-none"
                    onClick={() => handleSort('category')}
                  >
                    <span className="flex items-center">
                      Категорія
                      <SortIcon field="category" current={sortField} direction={sortDir} />
                    </span>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Серійний номер</TableHead>
                  <TableHead className="hidden xl:table-cell">Інв. номер</TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <span className="flex items-center">
                      Статус
                      <SortIcon field="status" current={sortField} direction={sortDir} />
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Місцезнаходження</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((item) => (
                  <TableRow key={item.id} className={selectedIds.has(item.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link to={`/equipment/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                      {(() => {
                        const sub = [item.manufacturer, item.model].filter(Boolean).join(' ')
                        return sub && sub !== item.name ? (
                          <p className="text-xs text-muted-foreground">{sub}</p>
                        ) : null
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm">
                      {item.serial_number}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell font-mono text-sm">
                      {item.inventory_number || '—'}
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
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редагувати
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setCodesItem(item)}>
                            <QrCode className="mr-2 h-4 w-4" />
                            QR / Штрих-код
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
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Сторінка <span className="font-medium text-foreground">{page}</span> з <span className="font-medium text-foreground">{totalPages}</span>
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

      <EquipmentFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        equipment={editEquipment}
      />

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

      {/* Діалог QR / Штрих-код */}
      <Dialog open={codesItem !== null} onOpenChange={() => setCodesItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR-код та Штрих-код</DialogTitle>
          </DialogHeader>
          {codesItem && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {codesItem.name} — {codesItem.inventory_number || codesItem.serial_number}
              </p>

              <div className="flex flex-col items-center gap-6">
                {codesItem.qrcode_image ? (
                  <div className="text-center">
                    <img src={codesItem.qrcode_image} alt="QR код" className="mx-auto h-48 w-48" />
                    <p className="mt-2 text-sm font-medium">QR код</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">QR-код не згенеровано</p>
                )}

                {codesItem.barcode_image ? (
                  <div className="text-center">
                    <img src={codesItem.barcode_image} alt="Штрих-код" className="mx-auto h-24" />
                    <p className="mt-2 text-sm font-medium">Штрих-код</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Штрих-код не згенеровано</p>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={regenerateCodes.isPending}
                  onClick={() => {
                    regenerateCodes.mutate(codesItem.id, {
                      onSuccess: (updated) => {
                        setCodesItem(updated)
                      },
                    })
                  }}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', regenerateCodes.isPending && 'animate-spin')} />
                  {codesItem.qrcode_image ? 'Перегенерувати' : 'Згенерувати'}
                </Button>
                {(codesItem.qrcode_image || codesItem.barcode_image) && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const w = window.open('', '_blank')
                      if (!w) return
                      w.document.write(`
                        <html><head><title>Коди — ${codesItem.name}</title>
                        <style>body{font-family:sans-serif;text-align:center;padding:20px}
                        img{max-width:100%;margin:10px 0}h2{margin:4px 0}
                        @media print{button{display:none}}</style></head>
                        <body>
                        <h2>${codesItem.name}</h2>
                        <p>${codesItem.inventory_number || codesItem.serial_number}</p>
                        ${codesItem.qrcode_image ? `<img src="${codesItem.qrcode_image}" style="width:200px"/>` : ''}
                        ${codesItem.barcode_image ? `<img src="${codesItem.barcode_image}" style="height:80px"/>` : ''}
                        <br/><button onclick="window.print()">Друк</button>
                        </body></html>
                      `)
                      w.document.close()
                    }}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Друк
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
