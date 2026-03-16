import { useParams, useNavigate } from 'react-router-dom'
import { useSparePart, useSparePartMovements, useIssueSparePart, useUpdateSparePart, useStorageLocations, useCreateStorageLocation } from '@/hooks/use-spare-parts'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Package, TrendingDown, TrendingUp, Pencil, Loader2, Plus } from 'lucide-react'
import { SPARE_PART_CONDITION_LABELS, SPARE_PART_STATUS_LABELS } from '@/lib/constants'
import { useState } from 'react'
import type { SparePart } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: 'bg-green-100 text-green-800',
  LOW_STOCK: 'bg-yellow-100 text-yellow-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-800',
  DISCONTINUED: 'bg-gray-100 text-gray-800',
  RESERVED: 'bg-blue-100 text-blue-800',
}

export default function SparePartDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: part, isLoading } = useSparePart(id!)
  const { data: movementsData } = useSparePartMovements({ spare_part_id: id, page_size: 20 })
  const issuePart = useIssueSparePart()

  const [issueOpen, setIssueOpen] = useState(false)
  const [issueQty, setIssueQty] = useState(1)
  const [issueNotes, setIssueNotes] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  if (isLoading) return <LoadingSpinner />
  if (!part) return <div className="py-12 text-center text-muted-foreground">Запчастину не знайдено</div>

  const handleIssue = () => {
    issuePart.mutate(
      { partId: Number(part.id), data: { quantity: issueQty, notes: issueNotes } },
      { onSuccess: () => { setIssueOpen(false); setIssueQty(1); setIssueNotes('') } }
    )
  }

  const stockPercent = part.maximum_stock_level > 0
    ? Math.round((part.quantity_in_stock / part.maximum_stock_level) * 100)
    : 0

  return (
    <div>
      <PageHeader
        title={part.name}
        description={`${part.part_number} — ${part.manufacturer}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/spare-parts')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Редагувати
            </Button>
            <Button onClick={() => setIssueOpen(true)} disabled={part.quantity_in_stock === 0}>
              <TrendingDown className="mr-2 h-4 w-4" />
              Видати
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Залишок</p>
                <p className="text-2xl font-bold">{part.quantity_in_stock}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>0</span>
                <span>Макс: {part.maximum_stock_level}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stockPercent > 50 ? 'bg-green-500' : stockPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(stockPercent, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Вартість одиниці</p>
            <p className="text-2xl font-bold">₴{Number(part.unit_cost).toLocaleString('uk-UA')}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Загальна: ₴{(Number(part.unit_cost) * part.quantity_in_stock).toLocaleString('uk-UA')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Статус</span>
                <Badge className={STATUS_COLORS[part.status] || ''}>{SPARE_PART_STATUS_LABELS[part.status] || part.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Стан</span>
                <span className="text-sm">{SPARE_PART_CONDITION_LABELS[part.condition] || part.condition}</span>
              </div>
              {part.is_critical && (
                <Badge variant="destructive" className="w-full justify-center">Критична запчастина</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Деталі</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <dt className="text-muted-foreground">Артикул</dt>
              <dd className="font-mono">{part.part_number}</dd>
              <dt className="text-muted-foreground">Артикул виробника</dt>
              <dd className="font-mono">{part.manufacturer_part_number || '—'}</dd>
              <dt className="text-muted-foreground">Виробник</dt>
              <dd>{part.manufacturer}</dd>
              <dt className="text-muted-foreground">Категорія</dt>
              <dd>{part.category_details?.name || '—'}</dd>
              <dt className="text-muted-foreground">Постачальник</dt>
              <dd>{part.primary_supplier_details?.name || '—'}</dd>
              <dt className="text-muted-foreground">Місце зберігання</dt>
              <dd>{part.storage_name || part.storage_location || '—'}</dd>
              <dt className="text-muted-foreground">Вага</dt>
              <dd>{part.weight ? `${part.weight} кг` : '—'}</dd>
              <dt className="text-muted-foreground">Розміри</dt>
              <dd>{part.dimensions || '—'}</dd>
              <dt className="text-muted-foreground">Штрих-код</dt>
              <dd className="font-mono">{part.barcode || '—'}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Склад та дати</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <dt className="text-muted-foreground">Мін. запас</dt>
              <dd>{part.minimum_stock_level}</dd>
              <dt className="text-muted-foreground">Макс. запас</dt>
              <dd>{part.maximum_stock_level}</dd>
              <dt className="text-muted-foreground">Точка замовлення</dt>
              <dd>{part.reorder_point}</dd>
              <dt className="text-muted-foreground">Гарантія (днів)</dt>
              <dd>{part.warranty_period_days || '—'}</dd>
              <dt className="text-muted-foreground">Останнє надходження</dt>
              <dd>{part.last_received_date ? new Date(part.last_received_date).toLocaleDateString('uk-UA') : '—'}</dd>
              <dt className="text-muted-foreground">Остання видача</dt>
              <dd>{part.last_issued_date ? new Date(part.last_issued_date).toLocaleDateString('uk-UA') : '—'}</dd>
              <dt className="text-muted-foreground">Термін придатності</dt>
              <dd>{part.expiry_date ? new Date(part.expiry_date).toLocaleDateString('uk-UA') : '—'}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>

      {part.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Примітки</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{part.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Історія руху</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsData?.movements && movementsData.movements.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Кількість</TableHead>
                    <TableHead className="hidden sm:table-cell">Вартість</TableHead>
                    <TableHead className="hidden md:table-cell">Обладнання</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movementsData.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {m.movement_type === 'IN' || m.movement_type === 'RETURN' ? (
                            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <span className="text-sm">{m.movement_type_display}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{m.quantity}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-muted-foreground">
                        {m.unit_cost ? `₴${Number(m.unit_cost).toLocaleString('uk-UA')}` : '—'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {m.equipment?.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.performed_at).toLocaleDateString('uk-UA')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Руху ще не було</p>
          )}
        </CardContent>
      </Card>

      {/* Діалог видачі */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Видати запчастину</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Кількість (макс: {part.quantity_in_stock})</Label>
              <Input
                type="number"
                min={1}
                max={part.quantity_in_stock}
                value={issueQty}
                onChange={(e) => setIssueQty(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Примітки</Label>
              <Input value={issueNotes} onChange={(e) => setIssueNotes(e.target.value)} placeholder="Причина видачі..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIssueOpen(false)}>Скасувати</Button>
              <Button onClick={handleIssue} disabled={issuePart.isPending || issueQty < 1}>
                {issuePart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Видати
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Діалог редагування */}
      <SparePartEditDialog open={editOpen} onOpenChange={setEditOpen} part={part} />
    </div>
  )
}

function SparePartEditDialog({ open, onOpenChange, part }: { open: boolean; onOpenChange: (v: boolean) => void; part: SparePart }) {
  const updatePart = useUpdateSparePart()
  const [form, setForm] = useState({
    name: part.name,
    part_number: part.part_number,
    manufacturer: part.manufacturer,
    minimum_stock_level: part.minimum_stock_level,
    maximum_stock_level: part.maximum_stock_level,
    reorder_point: part.reorder_point,
    storage: part.storage ? String(part.storage) : '',
    notes: part.notes,
  })

  const update = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      ...form,
      storage: form.storage ? Number(form.storage) : null,
    }
    updatePart.mutate(
      { id: Number(part.id), data: payload },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Редагувати запчастину</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Назва</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Артикул</Label>
              <Input value={form.part_number} onChange={(e) => update('part_number', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Виробник</Label>
              <Input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Мін. запас</Label>
              <Input type="number" value={form.minimum_stock_level} onChange={(e) => update('minimum_stock_level', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Макс. запас</Label>
              <Input type="number" value={form.maximum_stock_level} onChange={(e) => update('maximum_stock_level', Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Точка замовл.</Label>
              <Input type="number" value={form.reorder_point} onChange={(e) => update('reorder_point', Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Місце зберігання</Label>
            <StorageLocationSelect value={form.storage} onChange={(v) => update('storage', v)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Примітки</Label>
            <Input value={form.notes} onChange={(e) => update('notes', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={updatePart.isPending}>
              {updatePart.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зберегти
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
  const [newName, setNewName] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    createLocation.mutate({ name: newName.trim() }, {
      onSuccess: (res) => {
        onChange(String(res.data.id))
        setAdding(false)
        setNewName('')
      },
    })
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Назва нового складу..." autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }} />
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
