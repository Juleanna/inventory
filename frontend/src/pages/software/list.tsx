import { useState, useMemo } from 'react'
import { useSoftwareList, useCreateSoftware, useUpdateSoftware, useDeleteSoftware, useBulkDeleteSoftware } from '@/hooks/use-software'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useLicensesList } from '@/hooks/use-licenses'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ListPagination } from '@/components/shared/list-pagination'
import { SearchableSelect } from '@/components/shared/searchable-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AppWindow, Plus, Trash2, Pencil, Loader2, ChevronRight, ChevronDown, Monitor, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import type { Software, Equipment } from '@/types'
import { cn } from '@/lib/utils'

export default function SoftwareListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editSoftware, setEditSoftware] = useState<Software | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number | 'unlinked'>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [ordering, setOrdering] = useState('name')

  const debouncedSearch = useDebounce(search)
  const pageSize = 500
  const { data, isLoading } = useSoftwareList({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
    ordering,
  })

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
  const deleteSoftware = useDeleteSoftware()
  const bulkDelete = useBulkDeleteSoftware()
  const totalPages = data ? Math.ceil(data.count / pageSize) : 0

  const { equipmentMap, unlinkedSoftware } = useMemo(() => {
    const eqMap = new Map<number, { equipment: Equipment; software: Software[] }>()
    const unlinked: Software[] = []

    data?.results?.forEach((sw) => {
      if (sw.installed_on && sw.installed_on.length > 0) {
        sw.installed_on.forEach((eq) => {
          if (!eqMap.has(eq.id)) {
            eqMap.set(eq.id, { equipment: eq, software: [] })
          }
          eqMap.get(eq.id)!.software.push(sw)
        })
      } else {
        unlinked.push(sw)
      }
    })

    return { equipmentMap: eqMap, unlinkedSoftware: unlinked }
  }, [data])

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

  const toggleGroupSelect = (swList: Software[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const groupIds = swList.map((s) => s.id)
      const allSelected = groupIds.every((id) => next.has(id))
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id))
      } else {
        groupIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const selectGroupAndDelete = (swList: Software[]) => {
    const ids = new Set(selectedIds)
    swList.forEach((s) => ids.add(s.id))
    setSelectedIds(ids)
    setBulkDeleteOpen(true)
  }

  const toggleSelectAll = () => {
    if (!data?.results) return
    const allIds = data.results.map((s) => s.id)
    const allSelected = allIds.every((id) => selectedIds.has(id))
    setSelectedIds(new Set(allSelected ? [] : allIds))
  }

  const isGroupAllSelected = (swList: Software[]) =>
    swList.length > 0 && swList.every((s) => selectedIds.has(s.id))

  const isGroupPartial = (swList: Software[]) =>
    swList.some((s) => selectedIds.has(s.id)) && !isGroupAllSelected(swList)

  const allPageIds = data?.results?.map((s) => s.id) ?? []
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id))

  const handleEdit = (sw: Software) => { setEditSoftware(sw); setShowDialog(true) }
  const handleAdd = () => { setEditSoftware(null); setShowDialog(true) }
  const handleCloseDialog = (open: boolean) => { setShowDialog(open); if (!open) setEditSoftware(null) }

  const handleBulkDelete = () => {
    bulkDelete.mutate([...selectedIds], {
      onSuccess: () => { setSelectedIds(new Set()); setBulkDeleteOpen(false) },
    })
  }

  const sortedEquipment = useMemo(() => {
    return Array.from(equipmentMap.values()).sort((a, b) =>
      a.equipment.name.localeCompare(b.equipment.name)
    )
  }, [equipmentMap])

  return (
    <div>
      <PageHeader
        title="Програмне забезпечення"
        description={`Всього: ${data?.count || 0} програм`}
        actions={
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Видалити ({selectedIds.size})
              </Button>
            )}
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Додати
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Пошук програм..." className="sm:w-72" />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<AppWindow className="h-12 w-12" />}
          title="Програм не знайдено"
          action={<Button size="sm" onClick={handleAdd}><Plus className="mr-2 h-3 w-3" />Додати програму</Button>}
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
                  <TableHead className="hidden sm:table-cell cursor-pointer select-none" onClick={() => toggleOrdering('version')}>
                    <div className="flex items-center gap-1">Версія {getSortIcon('version')}</div>
                  </TableHead>
                  <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleOrdering('vendor')}>
                    <div className="flex items-center gap-1">Виробник {getSortIcon('vendor')}</div>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Ліцензія</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEquipment.map(({ equipment: eq, software: swList }) => (
                  <>
                    <TableRow key={`eq-${eq.id}`} className="bg-muted/30 hover:bg-muted/50">
                      <TableCell className="py-2">
                        <Checkbox
                          checked={isGroupAllSelected(swList) ? true : isGroupPartial(swList) ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroupSelect(swList)}
                        />
                      </TableCell>
                      <TableCell className="py-2 cursor-pointer" onClick={() => toggleExpand(eq.id)}>
                        {expanded.has(eq.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell colSpan={4} className="py-2 cursor-pointer" onClick={() => toggleExpand(eq.id)}>
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eq.name}</span>
                          <Badge variant="secondary" className="text-xs">{swList.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive"
                          title={`Видалити всі програми з ${eq.name}`}
                          onClick={() => selectGroupAndDelete(swList)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded.has(eq.id) && swList.map((sw) => (
                      <TableRow key={`eq-${eq.id}-sw-${sw.id}`}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(sw.id)} onCheckedChange={() => toggleSelect(sw.id)} />
                        </TableCell>
                        <TableCell />
                        <TableCell className="pl-10"><span className="text-sm">{sw.name}</span></TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">{sw.version}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{sw.vendor}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {sw.license?.license_type || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(sw)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(sw.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}

                {unlinkedSoftware.length > 0 && (
                  <>
                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                      <TableCell className="py-2">
                        <Checkbox
                          checked={isGroupAllSelected(unlinkedSoftware) ? true : isGroupPartial(unlinkedSoftware) ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroupSelect(unlinkedSoftware)}
                        />
                      </TableCell>
                      <TableCell className="py-2 cursor-pointer" onClick={() => toggleExpand('unlinked')}>
                        {expanded.has('unlinked')
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell colSpan={4} className="py-2 cursor-pointer" onClick={() => toggleExpand('unlinked')}>
                        <div className="flex items-center gap-2">
                          <AppWindow className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">Не прив'язано до обладнання</span>
                          <Badge variant="outline" className="text-xs">{unlinkedSoftware.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button
                          size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive"
                          title="Видалити всі непривʼязані програми"
                          onClick={() => selectGroupAndDelete(unlinkedSoftware)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded.has('unlinked') && unlinkedSoftware.map((sw) => (
                      <TableRow key={`unlinked-${sw.id}`}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(sw.id)} onCheckedChange={() => toggleSelect(sw.id)} />
                        </TableCell>
                        <TableCell />
                        <TableCell className="pl-10"><span className="text-sm">{sw.name}</span></TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">{sw.version}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{sw.vendor}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {sw.license?.license_type || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(sw)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(sw.id)}>
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

      <SoftwareFormDialog open={showDialog} onOpenChange={handleCloseDialog} software={editSoftware} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити програму?"
        description="Програму буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => { if (deleteId) { deleteSoftware.mutate(deleteId); setDeleteId(null) } }}
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(v) => { if (!v) setBulkDeleteOpen(false) }}
        title={`Видалити ${selectedIds.size} програм?`}
        description="Обрані програми буде видалено назавжди. Цю дію не можна скасувати."
        confirmLabel={`Видалити (${selectedIds.size})`}
        onConfirm={handleBulkDelete}
        variant="destructive"
      />
    </div>
  )
}

function SoftwareFormDialog({
  open,
  onOpenChange,
  software,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  software: Software | null
}) {
  const createSoftware = useCreateSoftware()
  const updateSoftware = useUpdateSoftware()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })
  const { data: licensesData } = useLicensesList({ page_size: 200 })
  const isEditing = !!software

  const emptyForm = {
    name: '',
    version: '',
    vendor: '',
    license_id: '',
    installed_on_ids: [] as number[],
  }

  const [form, setForm] = useState(emptyForm)

  const buildForm = (sw: Software) => ({
    name: sw.name,
    version: sw.version,
    vendor: sw.vendor || '',
    license_id: sw.license ? String(sw.license.id) : '',
    installed_on_ids: sw.installed_on?.map((eq) => eq.id) || [],
  })

  const [prevSoftwareId, setPrevSoftwareId] = useState<number | null>(null)
  if ((software?.id ?? null) !== prevSoftwareId) {
    setPrevSoftwareId(software?.id ?? null)
    setForm(software ? buildForm(software) : emptyForm)
  }

  const update = (field: string, value: string | number[]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const isPending = createSoftware.isPending || updateSoftware.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      name: form.name,
      version: form.version,
      vendor: form.vendor || undefined,
      license_id: form.license_id ? Number(form.license_id) : null,
      installed_on_ids: form.installed_on_ids,
    }

    if (isEditing) {
      updateSoftware.mutate(
        { id: software.id, data: payload as Partial<Software> },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createSoftware.mutate(payload as Partial<Software>, {
        onSuccess: () => {
          onOpenChange(false)
          setForm(emptyForm)
        },
      })
    }
  }

  const toggleEquipment = (eqId: number) => {
    setForm((prev) => {
      const ids = prev.installed_on_ids.includes(eqId)
        ? prev.installed_on_ids.filter((id) => id !== eqId)
        : [...prev.installed_on_ids, eqId]
      return { ...prev, installed_on_ids: ids }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>{isEditing ? 'Редагувати програму' : 'Додати програму'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-3" style={{ maxHeight: 'calc(85vh - 140px)' }}>
            <div className="space-y-1.5">
              <Label className="text-xs">Назва *</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Microsoft Office" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Версія *</Label>
                <Input value={form.version} onChange={(e) => update('version', e.target.value)} required placeholder="2024" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Виробник</Label>
                <Input value={form.vendor} onChange={(e) => update('vendor', e.target.value)} placeholder="Microsoft" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Ліцензія</Label>
              <SearchableSelect
                options={licensesData?.results?.map((lic) => ({
                  value: String(lic.id),
                  label: `${lic.license_type} — ${lic.key.length > 16 ? lic.key.slice(0, 8) + '...' + lic.key.slice(-4) : lic.key}`,
                })) || []}
                value={form.license_id}
                onValueChange={(v) => update('license_id', v)}
                placeholder="Не призначено"
                searchPlaceholder="Пошук ліцензії..."
                emptyText="Ліцензій не знайдено"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Встановлено на обладнання</Label>
              <div className="rounded-md border max-h-48 overflow-y-auto">
                {equipmentData?.results?.length ? (
                  equipmentData.results.map((eq) => (
                    <label
                      key={eq.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm',
                        form.installed_on_ids.includes(eq.id) && 'bg-primary/5'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.installed_on_ids.includes(eq.id)}
                        onChange={() => toggleEquipment(eq.id)}
                        className="rounded"
                      />
                      <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{eq.name}</span>
                      {eq.serial_number && (
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">{eq.serial_number}</span>
                      )}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-3">Немає обладнання</p>
                )}
              </div>
              {form.installed_on_ids.length > 0 && (
                <p className="text-xs text-muted-foreground">Обрано: {form.installed_on_ids.length}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
