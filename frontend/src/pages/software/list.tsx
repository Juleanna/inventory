import { useState } from 'react'
import { useSoftwareList, useCreateSoftware, useDeleteSoftware } from '@/hooks/use-software'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AppWindow, Plus, Trash2, Loader2 } from 'lucide-react'

export default function SoftwareListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useSoftwareList({
    page,
    search: debouncedSearch || undefined,
  })
  const deleteSoftware = useDeleteSoftware()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Програмне забезпечення"
        description={`Всього: ${data?.count || 0} програм`}
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
            <Button size="sm" onClick={() => setShowCreate(true)}>
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
                  <TableHead>Назва</TableHead>
                  <TableHead>Версія</TableHead>
                  <TableHead className="hidden md:table-cell">Виробник</TableHead>
                  <TableHead className="hidden lg:table-cell">Ліцензія</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((sw) => (
                  <TableRow key={sw.id}>
                    <TableCell className="font-medium">{sw.name}</TableCell>
                    <TableCell className="font-mono text-sm">{sw.version}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{sw.vendor}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {sw.license_details?.license_type || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(sw.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      <CreateSoftwareDialog open={showCreate} onOpenChange={setShowCreate} />

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

function CreateSoftwareDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createSoftware = useCreateSoftware()
  const [form, setForm] = useState({
    name: '',
    version: '',
    vendor: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createSoftware.mutate(
      {
        name: form.name,
        version: form.version,
        vendor: form.vendor || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ name: '', version: '', vendor: '' })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Додати програму</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Назва *</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Microsoft Office" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Версія *</Label>
              <Input value={form.version} onChange={(e) => update('version', e.target.value)} required placeholder="2024" />
            </div>
            <div className="space-y-2">
              <Label>Виробник</Label>
              <Input value={form.vendor} onChange={(e) => update('vendor', e.target.value)} placeholder="Microsoft" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createSoftware.isPending}>
              {createSoftware.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Додати
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
