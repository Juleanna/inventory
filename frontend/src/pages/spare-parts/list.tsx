import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSparePartsList, useCreateSparePart } from '@/hooks/use-spare-parts'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
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
import { Package, Truck, ShoppingCart, Plus, Loader2 } from 'lucide-react'
import { SPARE_PART_CONDITION_LABELS } from '@/lib/constants'

export default function SparePartsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
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
                        variant={part.quantity_in_stock <= part.minimum_stock_level ? 'destructive' : 'secondary'}
                      >
                        {part.quantity_in_stock}
                      </Badge>
                      {part.quantity_in_stock <= part.minimum_stock_level && (
                        <span className="ml-2 text-xs text-destructive">Мін: {part.minimum_stock_level}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {part.unit_price} грн
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {part.storage_location}
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
    storage_location: '',
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
    if (form.storage_location) payload.storage_location = form.storage_location
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Додати запчастину</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Ідентифікація</p>
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

          <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Склад та запаси</p>
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
              <Input value={form.storage_location} onChange={(e) => update('storage_location', e.target.value)} placeholder="Склад A, Полиця 3" />
            </div>
          </div>

          <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Фінанси</p>
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

          <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Характеристики</p>
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
          </div>

          <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Додатково</p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Опис</Label>
              <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
