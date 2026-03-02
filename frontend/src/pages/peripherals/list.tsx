import { useState, useEffect } from 'react'
import { usePeripheralsList, useCreatePeripheral, useUpdatePeripheral, useDeletePeripheral, useRegeneratePeripheralCodes } from '@/hooks/use-peripherals'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { SearchableSelect } from '@/components/shared/searchable-select'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ListPagination } from '@/components/shared/list-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Usb, Plus, Trash2, Pencil, Loader2, QrCode, ArrowUp, ArrowDown, ArrowUpDown, X, Shuffle } from 'lucide-react'
import { PERIPHERAL_TYPE_LABELS } from '@/lib/constants'
import type { PeripheralDevice } from '@/types'

export default function PeripheralsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editDevice, setEditDevice] = useState<PeripheralDevice | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [codesDevice, setCodesDevice] = useState<PeripheralDevice | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterEquipment, setFilterEquipment] = useState('')
  const [ordering, setOrdering] = useState('name')

  const debouncedSearch = useDebounce(search)
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })
  const { data, isLoading } = usePeripheralsList({
    page,
    search: debouncedSearch || undefined,
    type: filterType || undefined,
    connected_to: filterEquipment ? Number(filterEquipment) : undefined,
    ordering,
  })
  const deletePeripheral = useDeletePeripheral()
  const regenerateCodes = useRegeneratePeripheralCodes()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  const hasFilters = !!filterType || !!filterEquipment

  const toggleOrdering = (field: string) => {
    setOrdering((prev) => {
      if (prev === field) return `-${field}`
      if (prev === `-${field}`) return field
      return field
    })
  }

  const getSortIcon = (field: string) => {
    if (ordering === field) return <ArrowUp className="h-3.5 w-3.5" />
    if (ordering === `-${field}`) return <ArrowDown className="h-3.5 w-3.5" />
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
  }

  return (
    <div>
      <PageHeader
        title="Периферійні пристрої"
        description={`Всього: ${data?.count || 0} пристроїв`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Додати
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук пристроїв..."
          className="sm:w-72"
        />
        <div className="w-40">
          <Select value={filterType} onValueChange={(v) => { setFilterType(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Усі типи" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі типи</SelectItem>
              {Object.entries(PERIPHERAL_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-52">
          <SearchableSelect
            options={equipmentData?.results?.map((eq) => ({
              value: String(eq.id),
              label: eq.name,
            })) || []}
            value={filterEquipment}
            onValueChange={(v) => { setFilterEquipment(v); setPage(1) }}
            placeholder="Усе обладнання"
            searchPlaceholder="Пошук обладнання..."
            emptyText="Не знайдено"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType(''); setFilterEquipment(''); setPage(1) }}>
            <X className="mr-1 h-3.5 w-3.5" />
            Скинути
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Usb className="h-12 w-12" />}
          title="Пристроїв не знайдено"
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-3 w-3" />
              Додати пристрій
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleOrdering('name')}>
                    <div className="flex items-center gap-1">Назва {getSortIcon('name')}</div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleOrdering('type')}>
                    <div className="flex items-center gap-1">Тип {getSortIcon('type')}</div>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Інв. номер</TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleOrdering('serial_number')}>
                    <div className="flex items-center gap-1">Серійний номер {getSortIcon('serial_number')}</div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Підключено до</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PERIPHERAL_TYPE_LABELS[device.type] || device.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell font-mono text-sm text-muted-foreground">
                      {device.inventory_number || '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{device.serial_number}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {device.connected_to?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="QR / Штрих-код"
                          onClick={() => setCodesDevice(device)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditDevice(device)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination page={page} totalPages={totalPages} totalItems={data?.count} onPageChange={setPage} />
        </>
      )}

      <PeripheralFormDialog
        open={showCreate || !!editDevice}
        onOpenChange={(v) => {
          if (!v) {
            setShowCreate(false)
            setEditDevice(null)
          }
        }}
        device={editDevice}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити пристрій?"
        description="Пристрій буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deletePeripheral.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />

      {/* Діалог QR / штрих-код */}
      <Dialog open={!!codesDevice} onOpenChange={() => setCodesDevice(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{codesDevice?.name}</DialogTitle>
          </DialogHeader>
          {codesDevice && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Інв. номер: <span className="font-mono font-medium text-foreground">{codesDevice.inventory_number || codesDevice.serial_number}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-center">
                  <p className="text-xs font-medium text-muted-foreground">QR-код</p>
                  {codesDevice.qrcode_image ? (
                    <img src={codesDevice.qrcode_image} alt="QR Code" className="mx-auto h-32 w-32 rounded border" />
                  ) : (
                    <div className="mx-auto flex h-32 w-32 items-center justify-center rounded border text-xs text-muted-foreground">Не згенеровано</div>
                  )}
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-xs font-medium text-muted-foreground">Штрих-код</p>
                  {codesDevice.barcode_image ? (
                    <img src={codesDevice.barcode_image} alt="Barcode" className="mx-auto h-32 w-auto rounded border" />
                  ) : (
                    <div className="mx-auto flex h-32 w-32 items-center justify-center rounded border text-xs text-muted-foreground">Не згенеровано</div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={regenerateCodes.isPending}
                onClick={() => {
                  regenerateCodes.mutate(codesDevice.id, {
                    onSuccess: (data) => setCodesDevice(data),
                  })
                }}
              >
                {regenerateCodes.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Перегенерувати коди
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PeripheralFormDialog({ open, onOpenChange, device }: { open: boolean; onOpenChange: (v: boolean) => void; device?: PeripheralDevice | null }) {
  const createPeripheral = useCreatePeripheral()
  const updatePeripheral = useUpdatePeripheral()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })

  const [form, setForm] = useState({
    name: '',
    type: '',
    serial_number: '',
    inventory_number: '',
    connected_to_id: '',
  })

  useEffect(() => {
    if (device) {
      setForm({
        name: device.name || '',
        type: device.type || '',
        serial_number: device.serial_number || '',
        inventory_number: device.inventory_number || '',
        connected_to_id: device.connected_to ? String(device.connected_to.id) : '',
      })
    } else {
      setForm({ name: '', type: '', serial_number: '', inventory_number: '', connected_to_id: '' })
    }
  }, [device])

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const isEditing = !!device
  const mutation = isEditing ? updatePeripheral : createPeripheral

  const generateSerial = () => {
    const prefix = form.type || 'DEV'
    const hex = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join('')
    update('serial_number', `${prefix}-${hex}`)
  }

  const generateInventory = () => {
    const num = String(Date.now()).slice(-6)
    update('inventory_number', `ПР-${num}`)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      type: form.type,
      serial_number: form.serial_number,
      inventory_number: form.inventory_number || null,
      connected_to_id: form.connected_to_id ? Number(form.connected_to_id) : null,
    } as Record<string, unknown>

    if (isEditing) {
      updatePeripheral.mutate(
        { id: device.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    } else {
      createPeripheral.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ name: '', type: '', serial_number: '', inventory_number: '', connected_to_id: '' })
        },
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редагувати пристрій' : 'Додати периферійний пристрій'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Назва *</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Logitech MX Keys" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип *</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger><SelectValue placeholder="Оберіть тип" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIPHERAL_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Серійний номер *</Label>
              <div className="flex gap-1">
                <Input value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} required className="flex-1" />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={generateSerial} title="Згенерувати">
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Інвентарний номер</Label>
            <div className="flex gap-1">
              <Input value={form.inventory_number} onChange={(e) => update('inventory_number', e.target.value)} placeholder="ПР-000001" className="flex-1" />
              <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={generateInventory} title="Згенерувати">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Підключено до обладнання</Label>
            <SearchableSelect
              options={equipmentData?.results?.map((eq) => ({
                value: String(eq.id),
                label: `${eq.name} (${eq.serial_number})`,
              })) || []}
              value={form.connected_to_id}
              onValueChange={(v) => update('connected_to_id', v)}
              placeholder="Не підключено"
              searchPlaceholder="Пошук обладнання..."
              emptyText="Не знайдено"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
