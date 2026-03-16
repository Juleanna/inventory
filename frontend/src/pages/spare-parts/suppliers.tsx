import { useState } from 'react'
import { useSuppliersList, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck, Mail, Phone, Globe, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import type { Supplier } from '@/types'

export default function SuppliersPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useSuppliersList()
  const deleteSupplier = useDeleteSupplier()
  const [showCreate, setShowCreate] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  return (
    <div>
      <PageHeader
        title="Постачальники"
        description="Управління постачальниками запчастин"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати
            </Button>
            <Button variant="outline" asChild>
              <Link to="/spare-parts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="Постачальників не знайдено"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((supplier) => (
            <Card key={supplier.id} className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => navigate(`/spare-parts/suppliers/${supplier.id}`)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-2">
                    {supplier.short_name ? (
                      <>
                        <CardTitle className="text-base text-primary">{supplier.short_name}</CardTitle>
                        <p className="text-xs text-muted-foreground truncate">{supplier.name}</p>
                      </>
                    ) : (
                      <CardTitle className="text-base">{supplier.name}</CardTitle>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setEditSupplier(supplier) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(supplier.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                      {supplier.is_active ? 'Активний' : 'Неактивний'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {supplier.contact_person && (
                  <p className="font-medium">{supplier.contact_person}</p>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {supplier.website}
                    </a>
                  </div>
                )}
                {supplier.address && (
                  <p className="text-xs text-muted-foreground pt-1">{supplier.address}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SupplierFormDialog open={showCreate} onOpenChange={setShowCreate} />

      <SupplierFormDialog
        open={!!editSupplier}
        onOpenChange={(v) => { if (!v) setEditSupplier(null) }}
        supplier={editSupplier}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(v) => { if (!v) setDeleteId(null) }}
        title="Видалити постачальника"
        description="Ви впевнені, що хочете видалити цього постачальника? Цю дію неможливо скасувати."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={() => {
          if (deleteId !== null) {
            deleteSupplier.mutate(deleteId, {
              onSuccess: () => setDeleteId(null),
            })
          }
        }}
      />
    </div>
  )
}

function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  supplier?: Supplier | null
}) {
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const [form, setForm] = useState(() =>
    supplier ? {
      short_name: supplier.short_name || '',
      name: supplier.name || '',
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      website: supplier.website || '',
      tax_id: supplier.tax_id || '',
      rating: supplier.rating || '',
      notes: supplier.notes || '',
    } : {
      short_name: '',
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      tax_id: '',
      rating: '',
      notes: '',
    }
  )

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      short_name: form.short_name || undefined,
      name: form.name,
      contact_person: form.contact_person || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      website: form.website || undefined,
      tax_id: form.tax_id || undefined,
      rating: form.rating || undefined,
      notes: form.notes || undefined,
    }

    if (supplier) {
      updateSupplier.mutate(
        { id: supplier.id, data: payload },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    } else {
      createSupplier.mutate(payload, {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ name: '', contact_person: '', email: '', phone: '', address: '', website: '', tax_id: '', rating: '', notes: '' })
        },
      })
    }
  }

  const isPending = supplier ? updateSupplier.isPending : createSupplier.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Редагувати постачальника' : 'Додати постачальника'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Скорочена назва + ЄДРПОУ */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Скорочена назва</Label>
              <Input value={form.short_name} onChange={(e) => update('short_name', e.target.value)} placeholder="ESERVER" />
            </div>
            <div className="space-y-2">
              <Label>ЄДРПОУ / ІПН</Label>
              <Input value={form.tax_id} onChange={(e) => update('tax_id', e.target.value)} placeholder="12345678" />
            </div>
          </div>
          {/* Повна назва */}
          <div className="space-y-2">
            <Label>Повна назва компанії *</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ..." />
          </div>
          {/* Контактна особа + Телефон + Email */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Контактна особа</Label>
              <Input value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+380..." />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
          </div>
          {/* Адреса */}
          <div className="space-y-2">
            <Label>Адреса</Label>
            <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          {/* Вебсайт + Рейтинг */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Вебсайт</Label>
              <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Рейтинг (0-5)</Label>
              <Input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => update('rating', e.target.value)} />
            </div>
          </div>
          {/* Нотатки */}
          <div className="space-y-2">
            <Label>Нотатки</Label>
            <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {supplier ? 'Зберегти' : 'Додати'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
