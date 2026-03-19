import { useState, useEffect } from 'react'
import {
  useCounterpartiesList,
  useCreateCounterparty,
  useUpdateCounterparty,
  useDeleteCounterparty,
} from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ListPagination } from '@/components/shared/list-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDebounce } from '@/hooks/use-debounce'
import { Building2, Plus, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { Counterparty } from '@/types'

export default function CounterpartiesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const { data, isLoading } = useCounterpartiesList({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
  })
  const deleteCounterparty = useDeleteCounterparty()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<Counterparty | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const handleEdit = (item: Counterparty) => {
    setEditItem(item)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setFormOpen(false)
      setEditItem(null)
    }
  }

  const totalPages = data ? Math.ceil(data.count / pageSize) : 0

  return (
    <div>
      <PageHeader
        title="Контрагенти"
        description={`Довідник організацій • ${data?.count ?? 0} записів`}
        actions={
          <Button onClick={() => { setEditItem(null); setFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Додати
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук контрагентів..."
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Building2 className="h-8 w-8" />}
          title="Контрагентів не знайдено"
          description="Додайте першого контрагента для ведення довідника організацій"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>ЄДРПОУ</TableHead>
                  <TableHead>Контактна особа</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>{item.name}</div>
                      {item.short_name && (
                        <div className="text-xs text-muted-foreground">{item.short_name}</div>
                      )}
                    </TableCell>
                    <TableCell>{item.edrpou || '—'}</TableCell>
                    <TableCell>{item.contact_person || '—'}</TableCell>
                    <TableCell>{item.phone || '—'}</TableCell>
                    <TableCell>{item.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Активний' : 'Неактивний'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Редагувати
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(item.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Видалити
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <CounterpartyFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        counterparty={editItem}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити контрагента?"
        description="Цю дію не можна скасувати. Контрагент буде видалений з системи."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteCounterparty.mutate(deleteId)
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

function CounterpartyFormDialog({
  open,
  onOpenChange,
  counterparty,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  counterparty?: Counterparty | null
}) {
  const createCounterparty = useCreateCounterparty()
  const updateCounterparty = useUpdateCounterparty()
  const isEdit = !!counterparty

  const emptyForm = {
    name: '',
    short_name: '',
    edrpou: '',
    address: '',
    contact_person: '',
    phone: '',
    email: '',
    notes: '',
    is_active: true,
  }

  const buildForm = (c?: Counterparty | null) =>
    c
      ? {
          name: c.name || '',
          short_name: c.short_name || '',
          edrpou: c.edrpou || '',
          address: c.address || '',
          contact_person: c.contact_person || '',
          phone: c.phone || '',
          email: c.email || '',
          notes: c.notes || '',
          is_active: c.is_active,
        }
      : emptyForm

  const [form, setForm] = useState(() => buildForm(counterparty))

  useEffect(() => {
    if (open) {
      setForm(buildForm(counterparty))
    }
  }, [open, counterparty])

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEdit) {
      updateCounterparty.mutate(
        { id: counterparty!.id, data: form },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createCounterparty.mutate(form, {
        onSuccess: () => {
          onOpenChange(false)
          setForm(emptyForm)
        },
      })
    }
  }

  const isPending = createCounterparty.isPending || updateCounterparty.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати контрагента' : 'Додати контрагента'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Назва організації *</Label>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              placeholder="ТОВ «Назва»"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Скорочена назва</Label>
              <Input
                value={form.short_name}
                onChange={(e) => update('short_name', e.target.value)}
                placeholder="Коротка назва"
              />
            </div>
            <div className="space-y-2">
              <Label>Код ЄДРПОУ</Label>
              <Input
                value={form.edrpou}
                onChange={(e) => update('edrpou', e.target.value)}
                placeholder="12345678"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адреса</Label>
            <Input
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              placeholder="Місто, вулиця, будинок"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Контактна особа</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => update('contact_person', e.target.value)}
                placeholder="Ім'я Прізвище"
              />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+380..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Примітки</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.is_active}
                onCheckedChange={(v) => update('is_active', !!v)}
              />
              <span className="text-sm">Активний</span>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
