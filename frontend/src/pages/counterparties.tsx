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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDebounce } from '@/hooks/use-debounce'
import { Building2, Plus, Loader2, Pencil, Trash2, Mail, Phone, MapPin, FileText } from 'lucide-react'
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
          icon={<Building2 className="h-12 w-12" />}
          title="Контрагентів не знайдено"
          description="Додайте першого контрагента для ведення довідника організацій"
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.results.map((item) => (
              <Card key={item.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-2">
                      {item.short_name ? (
                        <>
                          <CardTitle className="text-base text-primary">{item.short_name}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                        </>
                      ) : (
                        <CardTitle className="text-base">{item.name}</CardTitle>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'Активний' : 'Неактивний'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {item.edrpou && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      <span>ЄДРПОУ: {item.edrpou}</span>
                    </div>
                  )}
                  {item.contact_person && (
                    <p className="font-medium">{item.contact_person}</p>
                  )}
                  {item.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>{item.email}</span>
                    </div>
                  )}
                  {item.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {item.address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{item.address}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
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
        description="Ви впевнені, що хочете видалити цього контрагента? Цю дію неможливо скасувати."
        confirmLabel="Видалити"
        variant="destructive"
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
