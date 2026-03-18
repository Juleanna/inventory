import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSparePartsList, useCreateSparePart, useStorageLocations, useCreateStorageLocation } from '@/hooks/use-spare-parts'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ListPagination } from '@/components/shared/list-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MovementsTable } from '@/components/spare-parts/movements-table'
import { SparePartsAnalyticsSection } from '@/components/spare-parts/analytics-section'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Truck, ShoppingCart, Plus, Loader2, Download, AlertTriangle } from 'lucide-react'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { ColumnVisibility } from '@/components/shared/column-visibility'
import { SPARE_PART_CONDITION_LABELS } from '@/lib/constants'
import type { SparePart } from '@/types'

const SPARE_PARTS_COLUMNS = [
  { key: 'name' as const, label: 'Назва' },
  { key: 'partNumber' as const, label: 'Артикул' },
  { key: 'quantity' as const, label: 'Кількість' },
  { key: 'price' as const, label: 'Ціна' },
  { key: 'location' as const, label: 'Місце' },
]

function exportSparePartsCsv(parts: SparePart[]) {
  const BOM = '\uFEFF'
  const headers = ['Назва', 'Артикул', 'Виробник', 'Кількість', 'Мін. запас', 'Ціна', 'Місце']
  const rows = parts.map((p) => [
    p.name, p.part_number, p.manufacturer, String(p.quantity_in_stock),
    String(p.minimum_stock_level), p.unit_price, p.storage_name || p.storage_location || '',
  ])
  const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'spare-parts.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function SparePartsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [stockFilter, setStockFilter] = useState('')
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useSparePartsList({
    page,
    search: debouncedSearch || undefined,
  })
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  const { isColumnVisible, toggleColumn, allColumns } = useColumnVisibility(
    'spare-parts-columns',
    SPARE_PARTS_COLUMNS,
  )

  // Low stock count
  const lowStockCount = data?.results?.filter((p) => p.quantity_in_stock <= p.minimum_stock_level).length || 0
  const outOfStockCount = data?.results?.filter((p) => p.quantity_in_stock === 0).length || 0

  const filteredResults = data?.results?.filter((p) => {
    if (!stockFilter) return true
    if (stockFilter === 'low') return p.quantity_in_stock <= p.minimum_stock_level && p.quantity_in_stock > 0
    if (stockFilter === 'out') return p.quantity_in_stock === 0
    return true
  })

  return (
    <div>
      <PageHeader
        title="Запчастини"
        description={`Всього: ${data?.count || 0} позицій`}
        actions={
          <div className="flex gap-2">
            {data?.results && data.results.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportSparePartsCsv(data.results)}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            )}
            <ColumnVisibility allColumns={allColumns} isColumnVisible={isColumnVisible} toggleColumn={toggleColumn} disabledColumns={['name']} />
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати
            </Button>
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

      <Tabs defaultValue="list" className="mt-2">
        <TabsList>
          <TabsTrigger value="list">Список</TabsTrigger>
          <TabsTrigger value="movements">Рух</TabsTrigger>
          <TabsTrigger value="analytics">Аналітика</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
      {/* Low stock alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {outOfStockCount > 0 && (
            <Card className="border-red-200 dark:border-red-900 cursor-pointer" onClick={() => setStockFilter(stockFilter === 'out' ? '' : 'out')}>
              <CardContent className="flex items-center gap-3 p-3">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-lg font-bold text-red-600">{outOfStockCount}</p>
                  <p className="text-xs text-muted-foreground">Немає в наявності</p>
                </div>
              </CardContent>
            </Card>
          )}
          {lowStockCount > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-900 cursor-pointer" onClick={() => setStockFilter(stockFilter === 'low' ? '' : 'low')}>
              <CardContent className="flex items-center gap-3 p-3">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-lg font-bold text-yellow-600">{lowStockCount}</p>
                  <p className="text-xs text-muted-foreground">Низький запас</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук запчастин..."
          className="sm:w-72"
        />
        {stockFilter && (
          <Badge variant="secondary" className="h-9 px-3 cursor-pointer" onClick={() => setStockFilter('')}>
            {stockFilter === 'low' ? 'Низький запас' : 'Немає в наявності'} &times;
          </Badge>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !filteredResults?.length ? (
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
                  {isColumnVisible('partNumber') && <TableHead>Артикул</TableHead>}
                  {isColumnVisible('quantity') && <TableHead>Кількість</TableHead>}
                  {isColumnVisible('price') && <TableHead>Ціна</TableHead>}
                  {isColumnVisible('location') && <TableHead>Місце</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults!.map((part) => (
                  <TableRow key={part.id}>
                    <TableCell>
                      <Link to={`/spare-parts/${part.id}`} className="font-medium hover:underline text-primary">{part.name}</Link>
                      <p className="text-xs text-muted-foreground">{part.manufacturer}</p>
                    </TableCell>
                    {isColumnVisible('partNumber') && <TableCell className="font-mono text-sm">
                      {part.part_number}
                    </TableCell>}
                    {isColumnVisible('quantity') && <TableCell>
                      <Badge
                        variant={part.quantity_in_stock <= part.minimum_stock_level ? 'destructive' : 'secondary'}
                      >
                        {part.quantity_in_stock}
                      </Badge>
                      {part.quantity_in_stock <= part.minimum_stock_level && (
                        <span className="ml-2 text-xs text-destructive">Мін: {part.minimum_stock_level}</span>
                      )}
                    </TableCell>}
                    {isColumnVisible('price') && <TableCell>
                      {part.unit_price} грн
                    </TableCell>}
                    {isColumnVisible('location') && <TableCell className="text-sm text-muted-foreground">
                      {part.storage_name || part.storage_location}
                    </TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination page={page} totalPages={totalPages} totalItems={data?.count} onPageChange={setPage} />
        </>
      )}

        </TabsContent>

        <TabsContent value="movements">
          <MovementsTable />
        </TabsContent>

        <TabsContent value="analytics">
          <SparePartsAnalyticsSection />
        </TabsContent>
      </Tabs>

      <CreateSparePartDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

function CreateSparePartDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createPart = useCreateSparePart()

  const initialForm = {
    name: '',
    part_number: '',
    manufacturer_part_number: '',
    manufacturer: '',
    description: '',
    quantity_in_stock: '',
    minimum_stock_level: '',
    maximum_stock_level: '',
    reorder_point: '',
    unit_price: '',
    unit_cost: '',
    storage: '',
    condition: 'NEW',
    is_critical: false,
    weight: '',
    dimensions: '',
    expiry_date: '',
    warranty_period_days: '',
    notes: '',
  }

  const [form, setForm] = useState(initialForm)

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      name: form.name,
      part_number: form.part_number,
      condition: form.condition,
      is_critical: form.is_critical,
    }
    if (form.manufacturer_part_number) payload.manufacturer_part_number = form.manufacturer_part_number
    if (form.manufacturer) payload.manufacturer = form.manufacturer
    if (form.description) payload.description = form.description
    if (form.quantity_in_stock) payload.quantity_in_stock = Number(form.quantity_in_stock)
    if (form.minimum_stock_level) payload.minimum_stock_level = Number(form.minimum_stock_level)
    if (form.maximum_stock_level) payload.maximum_stock_level = Number(form.maximum_stock_level)
    if (form.reorder_point) payload.reorder_point = Number(form.reorder_point)
    if (form.unit_price) payload.unit_price = form.unit_price
    if (form.unit_cost) payload.unit_cost = form.unit_cost
    if (form.storage) payload.storage = Number(form.storage)
    if (form.weight) payload.weight = form.weight
    if (form.dimensions) payload.dimensions = form.dimensions
    if (form.expiry_date) payload.expiry_date = form.expiry_date
    if (form.warranty_period_days) payload.warranty_period_days = Number(form.warranty_period_days)
    if (form.notes) payload.notes = form.notes

    createPart.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false)
        setForm(initialForm)
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Додати запчастину</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="mx-6 mt-2">
              <TabsTrigger value="main">Основне</TabsTrigger>
              <TabsTrigger value="stock">Склад і фінанси</TabsTrigger>
              <TabsTrigger value="details">Характеристики</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="px-6 pb-2 mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Назва *</Label>
                  <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Артикул *</Label>
                  <Input value={form.part_number} onChange={(e) => update('part_number', e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Номер виробника</Label>
                  <Input value={form.manufacturer_part_number} onChange={(e) => update('manufacturer_part_number', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Виробник</Label>
                  <Input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Опис</Label>
                <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="stock" className="px-6 pb-2 mt-0 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Кількість</Label>
                  <Input type="number" value={form.quantity_in_stock} onChange={(e) => update('quantity_in_stock', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Мін. запас</Label>
                  <Input type="number" value={form.minimum_stock_level} onChange={(e) => update('minimum_stock_level', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Макс. запас</Label>
                  <Input type="number" value={form.maximum_stock_level} onChange={(e) => update('maximum_stock_level', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Точка замовлення</Label>
                  <Input type="number" value={form.reorder_point} onChange={(e) => update('reorder_point', e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Місце зберігання</Label>
                  <StorageLocationSelect value={form.storage} onChange={(v) => update('storage', v)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ціна продажу (грн)</Label>
                  <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => update('unit_price', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Вартість (грн)</Label>
                  <Input type="number" step="0.01" value={form.unit_cost} onChange={(e) => update('unit_cost', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="px-6 pb-2 mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Стан</Label>
                  <Select value={form.condition} onValueChange={(v) => update('condition', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SPARE_PART_CONDITION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Вага (кг)</Label>
                  <Input type="number" step="0.001" value={form.weight} onChange={(e) => update('weight', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Розміри</Label>
                  <Input value={form.dimensions} onChange={(e) => update('dimensions', e.target.value)} placeholder="Д x Ш x В" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="is_critical"
                    checked={form.is_critical}
                    onCheckedChange={(checked) => update('is_critical', !!checked)}
                  />
                  <Label htmlFor="is_critical" className="cursor-pointer">Критична запчастина</Label>
                </div>
                <div className="space-y-2">
                  <Label>Термін придатності</Label>
                  <Input type="date" value={form.expiry_date} onChange={(e) => update('expiry_date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Гарантія (днів)</Label>
                  <Input type="number" value={form.warranty_period_days} onChange={(e) => update('warranty_period_days', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Примітки</Label>
                <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createPart.isPending}>
              {createPart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Додати
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function StorageLocationSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: locations } = useStorageLocations()
  const createLocation = useCreateStorageLocation()
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const name = inputRef.current?.value?.trim()
    if (!name) return
    createLocation.mutate({ name }, {
      onSuccess: (res) => {
        onChange(String(res.data.id))
        setAdding(false)
      },
    })
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input ref={inputRef} placeholder="Назва нового складу..." autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }} />
        <Button type="button" size="sm" onClick={handleAdd} disabled={createLocation.isPending}>
          {createLocation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'OK'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>✕</Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Оберіть склад" />
        </SelectTrigger>
        <SelectContent>
          {locations?.map((loc) => (
            <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={() => setAdding(true)} title="Додати нове місце">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
