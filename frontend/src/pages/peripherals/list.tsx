import { useState, useMemo, useEffect } from 'react'
import { usePeripheralsList, useCreatePeripheral, useUpdatePeripheral, useDeletePeripheral, useBulkDeletePeripherals, useRegeneratePeripheralCodes } from '@/hooks/use-peripherals'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { ColumnVisibility } from '@/components/shared/column-visibility'
import { Usb, Plus, Trash2, Pencil, Loader2, QrCode, ArrowUp, ArrowDown, ArrowUpDown, X, Shuffle, ChevronRight, ChevronDown, Monitor, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { PERIPHERAL_TYPE_LABELS } from '@/lib/constants'
import type { PeripheralDevice, Equipment } from '@/types'

const PERIPHERALS_COLUMNS = [
  { key: 'name' as const, label: 'Назва' },
  { key: 'type' as const, label: 'Тип' },
  { key: 'inventory' as const, label: 'Інв. номер' },
  { key: 'serial' as const, label: 'Серійний номер' },
]
import apiClient from '@/api/client'
import { toast } from 'sonner'

async function exportPeripherals(format: 'excel' | 'pdf') {
  try {
    const response = await apiClient.get('/export/', {
      params: { export_format: format, type: 'peripherals' },
      responseType: 'blob',
    })
    const ext = format === 'excel' ? 'xlsx' : 'pdf'
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `peripherals.${ext}`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success(`Експорт ${format === 'excel' ? 'Excel' : 'PDF'} завершено`)
  } catch {
    toast.error('Помилка експорту')
  }
}

export default function PeripheralsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editDevice, setEditDevice] = useState<PeripheralDevice | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [codesDevice, setCodesDevice] = useState<PeripheralDevice | null>(null)
  const [filterType, setFilterType] = useState('')
  const [ordering, setOrdering] = useState('name')
  const [expanded, setExpanded] = useState<Set<number | 'unlinked'>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const debouncedSearch = useDebounce(search)
  const pageSize = 500
  const { data, isLoading } = usePeripheralsList({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    type: filterType || undefined,
    ordering,
  })
  const deletePeripheral = useDeletePeripheral()
  const bulkDelete = useBulkDeletePeripherals()
  const regenerateCodes = useRegeneratePeripheralCodes()
  const totalPages = data ? Math.ceil(data.count / pageSize) : 0

  const { isColumnVisible, toggleColumn, allColumns } = useColumnVisibility(
    'peripherals-columns',
    PERIPHERALS_COLUMNS,
  )

  const visibleDataColCount = ['type', 'inventory', 'serial'].filter(k => isColumnVisible(k as any)).length + 1 // +1 for name

  const hasFilters = !!filterType

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

  const { equipmentMap, unlinkedDevices } = useMemo(() => {
    const eqMap = new Map<number, { equipment: Equipment; devices: PeripheralDevice[] }>()
    const unlinked: PeripheralDevice[] = []

    data?.results?.forEach((dev) => {
      if (dev.connected_to) {
        const eq = dev.connected_to
        if (!eqMap.has(eq.id)) {
          eqMap.set(eq.id, { equipment: eq, devices: [] })
        }
        eqMap.get(eq.id)!.devices.push(dev)
      } else {
        unlinked.push(dev)
      }
    })

    return { equipmentMap: eqMap, unlinkedDevices: unlinked }
  }, [data])

  const sortedEquipment = useMemo(() => {
    return Array.from(equipmentMap.values()).sort((a, b) =>
      a.equipment.name.localeCompare(b.equipment.name)
    )
  }, [equipmentMap])

  const toggleExpand = (key: number | 'unlinked') => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGroupSelect = (devices: PeripheralDevice[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const groupIds = devices.map((d) => d.id)
      const allSelected = groupIds.every((id) => next.has(id))
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id))
      } else {
        groupIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const selectGroupAndDelete = (devices: PeripheralDevice[]) => {
    const ids = new Set(selectedIds)
    devices.forEach((d) => ids.add(d.id))
    setSelectedIds(ids)
    setBulkDeleteOpen(true)
  }

  const toggleSelectAll = () => {
    if (!data?.results) return
    const allIds = data.results.map((d) => d.id)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    setSelectedIds(new Set(allSelected ? [] : allIds))
  }

  const isGroupAllSelected = (devices: PeripheralDevice[]) =>
    devices.length > 0 && devices.every((d) => selectedIds.has(d.id))

  const isGroupPartial = (devices: PeripheralDevice[]) =>
    devices.some((d) => selectedIds.has(d.id)) && !isGroupAllSelected(devices)

  const allPageIds = data?.results?.map((d) => d.id) ?? []
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id))

  const handleEdit = (dev: PeripheralDevice) => { setEditDevice(dev); setShowCreate(false) }
  const handleAdd = () => { setEditDevice(null); setShowCreate(true) }
  const handleCloseDialog = (open: boolean) => {
    if (!open) { setShowCreate(false); setEditDevice(null) }
  }

  const handleBulkDelete = () => {
    bulkDelete.mutate([...selectedIds], {
      onSuccess: () => { setSelectedIds(new Set()); setBulkDeleteOpen(false) },
    })
  }

  return (
    <div>
      <PageHeader
        title="Периферійні пристрої"
        description={`Всього: ${data?.count || 0} пристроїв`}
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Видалити ({selectedIds.size})
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
                <DropdownMenuItem onClick={() => exportPeripherals('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPeripherals('pdf')}>
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ColumnVisibility allColumns={allColumns} isColumnVisible={isColumnVisible} toggleColumn={toggleColumn} disabledColumns={['name']} />
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Додати
            </Button>
          </div>
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
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType(''); setPage(1) }}>
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
            <Button size="sm" onClick={handleAdd}>
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
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="w-8" />
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleOrdering('name')}>
                    <div className="flex items-center gap-1">Назва {getSortIcon('name')}</div>
                  </TableHead>
                  {isColumnVisible('type') && <TableHead className="cursor-pointer select-none" onClick={() => toggleOrdering('type')}>
                    <div className="flex items-center gap-1">Тип {getSortIcon('type')}</div>
                  </TableHead>}
                  {isColumnVisible('inventory') && <TableHead>Інв. номер</TableHead>}
                  {isColumnVisible('serial') && <TableHead className="cursor-pointer select-none" onClick={() => toggleOrdering('serial_number')}>
                    <div className="flex items-center gap-1">Серійний номер {getSortIcon('serial_number')}</div>
                  </TableHead>}
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEquipment.map(({ equipment: eq, devices }) => (
                  <>
                    <TableRow key={`eq-${eq.id}`} className="bg-muted/30 hover:bg-muted/50">
                      <TableCell className="py-2">
                        <Checkbox
                          checked={isGroupAllSelected(devices) ? true : isGroupPartial(devices) ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroupSelect(devices)}
                        />
                      </TableCell>
                      <TableCell className="py-2 cursor-pointer" onClick={() => toggleExpand(eq.id)}>
                        {expanded.has(eq.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell colSpan={visibleDataColCount} className="py-2 cursor-pointer" onClick={() => toggleExpand(eq.id)}>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eq.name}</span>
                          <Badge variant="secondary" className="text-xs">{devices.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive"
                          title={`Видалити всі пристрої з ${eq.name}`}
                          onClick={() => selectGroupAndDelete(devices)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded.has(eq.id) && devices.map((dev) => (
                      <TableRow key={`eq-${eq.id}-dev-${dev.id}`}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(dev.id)} onCheckedChange={() => toggleSelect(dev.id)} />
                        </TableCell>
                        <TableCell />
                        <TableCell className="pl-10"><span className="text-sm font-medium">{dev.name}</span></TableCell>
                        {isColumnVisible('type') && <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {PERIPHERAL_TYPE_LABELS[dev.type] || dev.type}
                          </Badge>
                        </TableCell>}
                        {isColumnVisible('inventory') && <TableCell className="font-mono text-sm text-muted-foreground">
                          {dev.inventory_number || '—'}
                        </TableCell>}
                        {isColumnVisible('serial') && <TableCell className="font-mono text-sm">{dev.serial_number}</TableCell>}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="QR / Штрих-код" onClick={() => setCodesDevice(dev)}>
                              <QrCode className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(dev)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(dev.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}

                {unlinkedDevices.length > 0 && (
                  <>
                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                      <TableCell className="py-2">
                        <Checkbox
                          checked={isGroupAllSelected(unlinkedDevices) ? true : isGroupPartial(unlinkedDevices) ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroupSelect(unlinkedDevices)}
                        />
                      </TableCell>
                      <TableCell className="py-2 cursor-pointer" onClick={() => toggleExpand('unlinked')}>
                        {expanded.has('unlinked')
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell colSpan={visibleDataColCount} className="py-2 cursor-pointer" onClick={() => toggleExpand('unlinked')}>
                        <div className="flex items-center gap-2">
                          <Usb className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">Не підключено до обладнання</span>
                          <Badge variant="outline" className="text-xs">{unlinkedDevices.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive"
                          title="Видалити всі непідключені пристрої"
                          onClick={() => selectGroupAndDelete(unlinkedDevices)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded.has('unlinked') && unlinkedDevices.map((dev) => (
                      <TableRow key={`unlinked-${dev.id}`}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(dev.id)} onCheckedChange={() => toggleSelect(dev.id)} />
                        </TableCell>
                        <TableCell />
                        <TableCell className="pl-10"><span className="text-sm font-medium">{dev.name}</span></TableCell>
                        {isColumnVisible('type') && <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {PERIPHERAL_TYPE_LABELS[dev.type] || dev.type}
                          </Badge>
                        </TableCell>}
                        {isColumnVisible('inventory') && <TableCell className="font-mono text-sm text-muted-foreground">
                          {dev.inventory_number || '—'}
                        </TableCell>}
                        {isColumnVisible('serial') && <TableCell className="font-mono text-sm">{dev.serial_number}</TableCell>}
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="QR / Штрих-код" onClick={() => setCodesDevice(dev)}>
                              <QrCode className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(dev)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(dev.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <ListPagination page={page} totalPages={totalPages} totalItems={data?.count} onPageChange={setPage} />
        </>
      )}

      <PeripheralFormDialog
        open={showCreate || !!editDevice}
        onOpenChange={handleCloseDialog}
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

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(v) => { if (!v) setBulkDeleteOpen(false) }}
        title={`Видалити ${selectedIds.size} пристроїв?`}
        description="Обрані пристрої буде видалено назавжди. Цю дію не можна скасувати."
        confirmLabel={`Видалити (${selectedIds.size})`}
        onConfirm={handleBulkDelete}
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

  const emptyForm = {
    name: '',
    type: '',
    serial_number: '',
    inventory_number: '',
    connected_to_id: '',
  }

  const buildForm = (d?: PeripheralDevice | null) =>
    d ? {
      name: d.name || '',
      type: d.type || '',
      serial_number: d.serial_number || '',
      inventory_number: d.inventory_number || '',
      connected_to_id: d.connected_to ? String(d.connected_to.id) : '',
    } : emptyForm

  const [form, setForm] = useState(() => buildForm(device))

  useEffect(() => {
    if (open) {
      setForm(buildForm(device))
    }
  }, [open, device])

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
