import { useState, useEffect } from 'react'
import { useLicensesList, useCreateLicense, useUpdateLicense, useDeleteLicense } from '@/hooks/use-licenses'
import { useSoftwareList } from '@/hooks/use-software'
import { useUsersList } from '@/hooks/use-auth'
import { useDebounce } from '@/hooks/use-debounce'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { FileKey, Plus, Trash2, Pencil, Loader2 } from 'lucide-react'
import type { License } from '@/types'

function isExpired(endDate: string) {
  return new Date(endDate) < new Date()
}

function maskKey(key: string) {
  if (key.length <= 8) return key
  return key.slice(0, 4) + '••••' + key.slice(-4)
}

export default function LicensesListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editLicense, setEditLicense] = useState<License | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useLicensesList({
    page,
    search: debouncedSearch || undefined,
  })
  const deleteLicense = useDeleteLicense()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Ліцензії"
        description={`Всього: ${data?.count || 0} ліцензій`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Додати
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук ліцензій..."
          className="sm:w-72"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
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
                  <TableHead className="hidden sm:table-cell">Активацій</TableHead>
                  <TableHead className="hidden md:table-cell">Початок</TableHead>
                  <TableHead className="hidden md:table-cell">Кінець</TableHead>
                  <TableHead className="hidden lg:table-cell">Програма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((lic) => (
                  <TableRow key={lic.id}>
                    <TableCell className="font-medium">{lic.license_type}</TableCell>
                    <TableCell className="font-mono text-sm">{maskKey(lic.key)}</TableCell>
                    <TableCell className="hidden sm:table-cell">{lic.activations}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(lic.start_date).toLocaleDateString('uk-UA')}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {new Date(lic.end_date).toLocaleDateString('uk-UA')}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {lic.software_name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isExpired(lic.end_date) ? 'destructive' : 'default'}>
                        {isExpired(lic.end_date) ? 'Закінчилась' : 'Активна'}
                      </Badge>
                    </TableCell>
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

          <ListPagination page={page} totalPages={totalPages} totalItems={data?.count} onPageChange={setPage} />
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

function LicenseFormDialog({ open, onOpenChange, license }: { open: boolean; onOpenChange: (v: boolean) => void; license?: License | null }) {
  const createLicense = useCreateLicense()
  const updateLicense = useUpdateLicense()
  const { data: softwareData } = useSoftwareList({ page_size: 200 })
  const { data: users } = useUsersList()

  const emptyForm = {
    license_type: '',
    key: '',
    description: '',
    activations: '1',
    start_date: '',
    end_date: '',
    software: '',
    user: '',
  }

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (license) {
      setForm({
        license_type: license.license_type || '',
        key: license.key || '',
        description: license.description || '',
        activations: String(license.activations ?? 1),
        start_date: license.start_date || '',
        end_date: license.end_date || '',
        software: license.software ? String(license.software) : '',
        user: license.user ? String(license.user) : '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [license])

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      license_type: form.license_type,
      key: form.key,
      description: form.description || undefined,
      activations: Number(form.activations) || 1,
      start_date: form.start_date,
      end_date: form.end_date,
      software: form.software ? Number(form.software) : null,
      user: form.user ? Number(form.user) : null,
    } as Record<string, unknown>

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{license ? 'Редагувати ліцензію' : 'Додати ліцензію'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип ліцензії *</Label>
              <Input value={form.license_type} onChange={(e) => update('license_type', e.target.value)} required placeholder="Windows Pro" />
            </div>
            <div className="space-y-2">
              <Label>Активацій</Label>
              <Input type="number" value={form.activations} onChange={(e) => update('activations', e.target.value)} min="1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ліцензійний ключ *</Label>
            <Input value={form.key} onChange={(e) => update('key', e.target.value)} required placeholder="XXXXX-XXXXX-XXXXX-XXXXX" className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Початок дії *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Кінець дії *</Label>
              <Input type="date" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Програма</Label>
              <SearchableSelect
                options={softwareData?.results?.map((sw) => ({
                  value: String(sw.id),
                  label: `${sw.name} ${sw.version}`,
                })) || []}
                value={form.software}
                onValueChange={(v) => update('software', v)}
                placeholder="Не призначено"
                searchPlaceholder="Пошук програми..."
                emptyText="Не знайдено"
              />
            </div>
            <div className="space-y-2">
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
          </div>
          <div className="space-y-2">
            <Label>Опис</Label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {license ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
