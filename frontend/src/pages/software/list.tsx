import { useState, useMemo } from 'react'
import { useSoftwareList, useCreateSoftware, useUpdateSoftware, useDeleteSoftware } from '@/hooks/use-software'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AppWindow, Plus, Trash2, Pencil, Loader2, ChevronRight, ChevronDown, Monitor } from 'lucide-react'
import type { Software, Equipment } from '@/types'
import { cn } from '@/lib/utils'

export default function SoftwareListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showDialog, setShowDialog] = useState(false)
  const [editSoftware, setEditSoftware] = useState<Software | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Set<number | 'unlinked'>>(new Set())

  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useSoftwareList({
    page,
    search: debouncedSearch || undefined,
  })
  const deleteSoftware = useDeleteSoftware()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  // Group software by equipment
  const { equipmentMap, unlinkedSoftware } = useMemo(() => {
    const eqMap = new Map<number, { equipment: Equipment; software: Software[] }>()
    const unlinked: Software[] = []

    data?.results?.forEach((sw) => {
      if (sw.installed_on_details && sw.installed_on_details.length > 0) {
        sw.installed_on_details.forEach((eq) => {
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

  const handleEdit = (sw: Software) => {
    setEditSoftware(sw)
    setShowDialog(true)
  }

  const handleAdd = () => {
    setEditSoftware(null)
    setShowDialog(true)
  }

  const handleCloseDialog = (open: boolean) => {
    setShowDialog(open)
    if (!open) setEditSoftware(null)
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
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Додати
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук програм..."
          className="sm:w-72"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<AppWindow className="h-12 w-12" />}
          title="Програм не знайдено"
          action={
            <Button size="sm" onClick={handleAdd}>
              <Plus className="mr-2 h-3 w-3" />
              Додати програму
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Назва</TableHead>
                  <TableHead className="hidden sm:table-cell">Версія</TableHead>
                  <TableHead className="hidden md:table-cell">Виробник</TableHead>
                  <TableHead className="hidden lg:table-cell">Ліцензія</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Equipment groups */}
                {sortedEquipment.map(({ equipment: eq, software: swList }) => (
                  <>
                    <TableRow
                      key={`eq-${eq.id}`}
                      className="bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(eq.id)}
                    >
                      <TableCell className="py-2">
                        {expanded.has(eq.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell colSpan={4} className="py-2">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{eq.name}</span>
                          <Badge variant="secondary" className="text-xs">{swList.length} програм</Badge>
                        </div>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {expanded.has(eq.id) && swList.map((sw) => (
                      <TableRow key={`eq-${eq.id}-sw-${sw.id}`}>
                        <TableCell />
                        <TableCell className="pl-10">
                          <span className="text-sm">{sw.name}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">{sw.version}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{sw.vendor}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {sw.license_details?.license_type || '—'}
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

                {/* Unlinked software */}
                {unlinkedSoftware.length > 0 && (
                  <>
                    <TableRow
                      className="bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand('unlinked')}
                    >
                      <TableCell className="py-2">
                        {expanded.has('unlinked')
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell colSpan={4} className="py-2">
                        <div className="flex items-center gap-2">
                          <AppWindow className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-muted-foreground">Не прив'язано до обладнання</span>
                          <Badge variant="outline" className="text-xs">{unlinkedSoftware.length}</Badge>
                        </div>
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    {expanded.has('unlinked') && unlinkedSoftware.map((sw) => (
                      <TableRow key={`unlinked-${sw.id}`}>
                        <TableCell />
                        <TableCell className="pl-10">
                          <span className="text-sm">{sw.name}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm">{sw.version}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{sw.vendor}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {sw.license_details?.license_type || '—'}
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">Сторінка {page} з {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Попередня</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Наступна</Button>
              </div>
            </div>
          )}
        </>
      )}

      <SoftwareFormDialog
        open={showDialog}
        onOpenChange={handleCloseDialog}
        software={editSoftware}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити програму?"
        description="Програму буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteSoftware.mutate(deleteId)
            setDeleteId(null)
          }
        }}
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
  const isEditing = !!software

  const [form, setForm] = useState({
    name: '',
    version: '',
    vendor: '',
    installed_on_ids: [] as number[],
  })

  // Reset form when dialog opens/software changes
  useState(() => {
    if (software) {
      setForm({
        name: software.name,
        version: software.version,
        vendor: software.vendor || '',
        installed_on_ids: software.installed_on || [],
      })
    } else {
      setForm({ name: '', version: '', vendor: '', installed_on_ids: [] })
    }
  })

  // Sync form when software prop changes
  const [prevSoftwareId, setPrevSoftwareId] = useState<number | null>(null)
  if ((software?.id ?? null) !== prevSoftwareId) {
    setPrevSoftwareId(software?.id ?? null)
    if (software) {
      setForm({
        name: software.name,
        version: software.version,
        vendor: software.vendor || '',
        installed_on_ids: software.installed_on || [],
      })
    } else {
      setForm({ name: '', version: '', vendor: '', installed_on_ids: [] })
    }
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
          setForm({ name: '', version: '', vendor: '', installed_on_ids: [] })
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
