import { useState, useEffect } from 'react'
import { useLicensesList, useCreateLicense, useUpdateLicense, useDeleteLicense } from '@/hooks/use-licenses'
import { useSoftwareList } from '@/hooks/use-software'
import { useUsersList } from '@/hooks/use-auth'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useDebounce } from '@/hooks/use-debounce'
import { LICENSE_TYPE_LABELS, OPEN_SOURCE_TYPE_LABELS } from '@/lib/constants'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ListPagination } from '@/components/shared/list-pagination'
import { SearchableSelect } from '@/components/shared/searchable-select'
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
import { FileKey, Plus, Trash2, Pencil, Loader2, Download, X } from 'lucide-react'
import type { License } from '@/types'
import { cn } from '@/lib/utils'

function getLicenseStatus(lic: License) {
  if (lic.is_perpetual) return 'perpetual'
  if (!lic.end_date) return 'active'
  const end = new Date(lic.end_date)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  if (diff < 0) return 'expired'
  if (diff < 30 * 24 * 60 * 60 * 1000) return 'expiring'
  return 'active'
}

function getStatusBadge(lic: License) {
  const status = getLicenseStatus(lic)
  if (lic.license_type === 'FREEWARE' || lic.license_type === 'OPEN_SOURCE')
    return <Badge variant="default">Безкоштовна</Badge>
  if (status === 'perpetual')
    return <Badge variant="default">Безстрокова</Badge>
  if (status === 'expired')
    return <Badge variant="destructive">Закінчилась</Badge>
  if (status === 'expiring')
    return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Закінчується</Badge>
  return <Badge variant="default">Активна</Badge>
}

function maskKey(key: string) {
  if (!key) return '—'
  if (key.length <= 8) return key
  return key.slice(0, 4) + '••••' + key.slice(-4)
}

function formatLicenseType(lic: License) {
  const label = LICENSE_TYPE_LABELS[lic.license_type] || lic.license_type
  if (lic.license_type === 'OPEN_SOURCE' && lic.open_source_type) {
    const osLabel = OPEN_SOURCE_TYPE_LABELS[lic.open_source_type] || lic.open_source_type
    return `${label} (${osLabel})`
  }
  return label
}

function exportLicensesCsv(licenses: License[]) {
  const BOM = '\uFEFF'
  const headers = ['Тип ліцензії', 'Ключ', 'Активацій', 'Початок', 'Кінець', 'Програма', 'Вартість', 'Статус']
  const rows = licenses.map((lic) => [
    formatLicenseType(lic),
    lic.key || '',
    String(lic.activations),
    lic.start_date ? new Date(lic.start_date).toLocaleDateString('uk-UA') : '',
    lic.end_date ? new Date(lic.end_date).toLocaleDateString('uk-UA') : '',
    lic.software_list?.map((s) => `${s.name} ${s.version}`).join('; ') || '',
    lic.cost || '',
    getLicenseStatus(lic),
  ])
  const csv = BOM + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'licenses.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function LicensesListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editLicense, setEditLicense] = useState<License | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useLicensesList({
    page,
    page_size: 200,
    search: debouncedSearch || undefined,
  })
  const deleteLicense = useDeleteLicense()

  const filteredResults = data?.results?.filter((lic) => {
    if (typeFilter && lic.license_type !== typeFilter) return false
    if (!statusFilter) return true
    const status = getLicenseStatus(lic)
    if (statusFilter === 'expired') return status === 'expired'
    if (statusFilter === 'expiring') return status === 'expiring'
    if (statusFilter === 'active') return status === 'active' || status === 'perpetual'
    return true
  })
  const totalPages = filteredResults ? Math.ceil(filteredResults.length / 25) : 0
  const pagedResults = filteredResults?.slice((page - 1) * 25, page * 25)

  return (
    <div>
      <PageHeader
        title="Ліцензії"
        description={`Всього: ${data?.count || 0} ліцензій`}
        actions={
          <div className="flex gap-2">
            {data?.results && data.results.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => exportLicensesCsv(data.results)}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            )}
            <Button onClick={() => setShowCreate(true)}>
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
          placeholder="Пошук ліцензій..."
          className="sm:w-72"
        />
        <div className="w-52">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Усі типи" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі типи</SelectItem>
              {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Усі статуси" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Усі статуси</SelectItem>
              <SelectItem value="active">Активна</SelectItem>
              <SelectItem value="expiring">Закінчується (30 днів)</SelectItem>
              <SelectItem value="expired">Закінчилась</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(statusFilter || typeFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setTypeFilter(''); setPage(1) }}>
            <X className="mr-1 h-3.5 w-3.5" />
            Скинути
          </Button>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !pagedResults?.length ? (
        <EmptyState
          icon={<FileKey className="h-12 w-12" />}
          title="Ліцензій не знайдено"
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-3 w-3" />
              Додати ліцензію
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип ліцензії</TableHead>
                  <TableHead>Ключ</TableHead>
                  <TableHead className="hidden sm:table-cell">Вартість</TableHead>
                  <TableHead className="hidden md:table-cell">Термін дії</TableHead>
                  <TableHead className="hidden lg:table-cell">Програми</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedResults!.map((lic) => (
                  <TableRow key={lic.id}>
                    <TableCell className="font-medium">{formatLicenseType(lic)}</TableCell>
                    <TableCell className="font-mono text-sm">{maskKey(lic.key)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {lic.cost ? `${lic.cost} грн` : '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {lic.is_perpetual ? 'Безстрокова' :
                        lic.start_date && lic.end_date
                          ? `${new Date(lic.start_date).toLocaleDateString('uk-UA')} — ${new Date(lic.end_date).toLocaleDateString('uk-UA')}`
                          : lic.trial_days ? `${lic.trial_days} днів`
                          : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {lic.software_list?.length
                        ? lic.software_list.map((s) => s.name).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(lic)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setEditLicense(lic)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeleteId(lic.id)}
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

          <ListPagination page={page} totalPages={totalPages} totalItems={filteredResults?.length} onPageChange={setPage} />
        </>
      )}

      <LicenseFormDialog
        open={showCreate || !!editLicense}
        onOpenChange={(v) => {
          if (!v) {
            setShowCreate(false)
            setEditLicense(null)
          }
        }}
        license={editLicense}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити ліцензію?"
        description="Ліцензію буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteLicense.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />
    </div>
  )
}

interface LicenseFormState {
  license_type: string
  open_source_type: string
  key: string
  description: string
  activations: string
  start_date: string
  end_date: string
  is_perpetual: boolean
  cost: string
  trial_days: string
  oem_device: string
  software_ids: number[]
  user: string
}

const emptyForm: LicenseFormState = {
  license_type: '',
  open_source_type: '',
  key: '',
  description: '',
  activations: '1',
  start_date: '',
  end_date: '',
  is_perpetual: false,
  cost: '',
  trial_days: '',
  oem_device: '',
  software_ids: [],
  user: '',
}

function LicenseFormDialog({ open, onOpenChange, license }: { open: boolean; onOpenChange: (v: boolean) => void; license?: License | null }) {
  const createLicense = useCreateLicense()
  const updateLicense = useUpdateLicense()
  const { data: softwareData } = useSoftwareList({ page_size: 500 })
  const { data: users } = useUsersList()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })
  const [swSearch, setSwSearch] = useState('')

  const [form, setForm] = useState<LicenseFormState>(emptyForm)

  useEffect(() => {
    if (license) {
      setForm({
        license_type: license.license_type || '',
        open_source_type: license.open_source_type || '',
        key: license.key || '',
        description: license.description || '',
        activations: String(license.activations ?? 1),
        start_date: license.start_date || '',
        end_date: license.end_date || '',
        is_perpetual: license.is_perpetual ?? false,
        cost: license.cost || '',
        trial_days: license.trial_days ? String(license.trial_days) : '',
        oem_device: license.oem_device ? String(license.oem_device) : '',
        software_ids: license.software_list?.map((s) => s.id) || [],
        user: license.user ? String(license.user) : '',
      })
    } else {
      setForm(emptyForm)
    }
    setSwSearch('')
  }, [license])

  const update = (field: keyof LicenseFormState, value: string | boolean | number[]) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const toggleSoftware = (id: number) => {
    setForm((prev) => {
      const ids = prev.software_ids.includes(id)
        ? prev.software_ids.filter((i) => i !== id)
        : [...prev.software_ids, id]
      return { ...prev, software_ids: ids }
    })
  }

  const t = form.license_type

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      license_type: form.license_type,
      description: form.description || undefined,
      software_ids: form.software_ids,
    }

    // Conditional fields based on type
    if (t === 'COMMERCIAL' || t === 'VOLUME') {
      payload.key = form.key
      payload.activations = Number(form.activations) || 1
      payload.start_date = form.start_date || null
      payload.end_date = form.end_date || null
      payload.cost = form.cost || null
      payload.user = form.user ? Number(form.user) : null
    } else if (t === 'SHAREWARE') {
      payload.key = form.key
      payload.trial_days = form.trial_days ? Number(form.trial_days) : null
      payload.cost = form.cost || null
    } else if (t === 'OPEN_SOURCE') {
      payload.open_source_type = form.open_source_type
      payload.is_perpetual = true
    } else if (t === 'FREEWARE') {
      payload.is_perpetual = true
    } else if (t === 'TRIAL') {
      payload.trial_days = form.trial_days ? Number(form.trial_days) : null
      payload.user = form.user ? Number(form.user) : null
    } else if (t === 'OEM') {
      payload.key = form.key
      payload.oem_device = form.oem_device ? Number(form.oem_device) : null
      payload.is_perpetual = form.is_perpetual
    }

    const onSuccess = () => {
      onOpenChange(false)
      setForm(emptyForm)
    }

    if (license) {
      updateLicense.mutate({ id: license.id, data: payload }, { onSuccess })
    } else {
      createLicense.mutate(payload, { onSuccess })
    }
  }

  const isPending = license ? updateLicense.isPending : createLicense.isPending

  // Fields visibility by type
  const showKey = ['COMMERCIAL', 'SHAREWARE', 'OEM', 'VOLUME'].includes(t)
  const showActivations = ['COMMERCIAL', 'VOLUME'].includes(t)
  const showDates = ['COMMERCIAL', 'VOLUME'].includes(t)
  const showCost = ['COMMERCIAL', 'SHAREWARE', 'VOLUME'].includes(t)
  const showTrialDays = ['SHAREWARE', 'TRIAL'].includes(t)
  const showOpenSourceType = t === 'OPEN_SOURCE'
  const showOemDevice = t === 'OEM'
  const showPerpetual = t === 'OEM'
  const showUser = ['COMMERCIAL', 'TRIAL', 'VOLUME'].includes(t)

  const filteredSoftware = softwareData?.results?.filter((sw) =>
    !swSearch || sw.name.toLowerCase().includes(swSearch.toLowerCase()) || sw.vendor?.toLowerCase().includes(swSearch.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{license ? 'Редагувати ліцензію' : 'Додати ліцензію'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Row 1: Type + Open Source sub-type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Тип ліцензії *</Label>
              <Select value={form.license_type} onValueChange={(v) => update('license_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть тип" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENSE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showOpenSourceType ? (
              <div className="space-y-1.5">
                <Label>Тип Open Source *</Label>
                <Select value={form.open_source_type} onValueChange={(v) => update('open_source_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть тип" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OPEN_SOURCE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : showKey ? (
              <div className="space-y-1.5">
                <Label>Ліцензійний ключ</Label>
                <Input value={form.key} onChange={(e) => update('key', e.target.value)} placeholder="XXXXX-XXXXX-XXXXX" className="font-mono" />
              </div>
            ) : <div />}
          </div>

          {/* Row 2: type-specific params */}
          {t && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {showActivations && (
                  <div className="space-y-1.5">
                    <Label>Активацій</Label>
                    <Input type="number" value={form.activations} onChange={(e) => update('activations', e.target.value)} min="1" />
                  </div>
                )}
                {showCost && (
                  <div className="space-y-1.5">
                    <Label>Вартість (грн)</Label>
                    <Input type="number" step="0.01" value={form.cost} onChange={(e) => update('cost', e.target.value)} placeholder="0.00" />
                  </div>
                )}
                {showDates && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Початок дії</Label>
                      <Input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Кінець дії</Label>
                      <Input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} />
                    </div>
                  </>
                )}
                {showTrialDays && (
                  <div className="space-y-1.5">
                    <Label>Пробний період (днів)</Label>
                    <Input type="number" value={form.trial_days} onChange={(e) => update('trial_days', e.target.value)} placeholder="30" min="1" />
                  </div>
                )}
              </div>

              {/* OEM device + perpetual */}
              {showOemDevice && (
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="space-y-1.5">
                    <Label>Прив'язаний пристрій (OEM)</Label>
                    <SearchableSelect
                      options={equipmentData?.results?.map((eq) => ({
                        value: String(eq.id),
                        label: `${eq.name} (${eq.serial_number || eq.inventory_number || '—'})`,
                      })) || []}
                      value={form.oem_device}
                      onValueChange={(v) => update('oem_device', v)}
                      placeholder="Оберіть пристрій"
                      searchPlaceholder="Пошук обладнання..."
                      emptyText="Не знайдено"
                    />
                  </div>
                  {showPerpetual && (
                    <div className="flex items-center gap-2 pb-2">
                      <Checkbox id="is_perpetual" checked={form.is_perpetual} onCheckedChange={(v) => update('is_perpetual', !!v)} />
                      <Label htmlFor="is_perpetual" className="cursor-pointer">Безстрокова</Label>
                    </div>
                  )}
                </div>
              )}

              {/* User + Description row */}
              <div className="grid grid-cols-2 gap-3">
                {showUser ? (
                  <div className="space-y-1.5">
                    <Label>Користувач</Label>
                    <SearchableSelect
                      options={users?.map((u) => ({
                        value: String(u.id),
                        label: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username,
                      })) || []}
                      value={form.user}
                      onValueChange={(v) => update('user', v)}
                      placeholder="Не призначено"
                      searchPlaceholder="Пошук користувача..."
                      emptyText="Не знайдено"
                    />
                  </div>
                ) : <div />}
                <div className="space-y-1.5">
                  <Label>Опис</Label>
                  <Input value={form.description} onChange={(e) => update('description', e.target.value)} placeholder="Примітка..." />
                </div>
              </div>

              {/* Software multi-select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Програми {form.software_ids.length > 0 && <span className="text-muted-foreground font-normal">({form.software_ids.length})</span>}</Label>
                  <Input
                    placeholder="Пошук..."
                    value={swSearch}
                    onChange={(e) => setSwSearch(e.target.value)}
                    className="h-7 w-48 text-xs"
                  />
                </div>
                <div className="rounded-md border max-h-32 overflow-y-auto">
                  {filteredSoftware?.length ? (
                    filteredSoftware.map((sw) => (
                      <label
                        key={sw.id}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-muted/50 text-sm',
                          form.software_ids.includes(sw.id) && 'bg-primary/5'
                        )}
                      >
                        <input type="checkbox" checked={form.software_ids.includes(sw.id)} onChange={() => toggleSoftware(sw.id)} className="rounded" />
                        <span className="truncate">{sw.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">{sw.version}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground p-2">Немає програм</p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={isPending || !form.license_type}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {license ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
