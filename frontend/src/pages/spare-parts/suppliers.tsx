import { useState } from 'react'
import { useSuppliersList, useCreateSupplier } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { ArrowLeft, Truck, Mail, Phone, Globe, Plus, Loader2 } from 'lucide-react'

export default function SuppliersPage() {
  const { data, isLoading } = useSuppliersList()
  const [showCreate, setShowCreate] = useState(false)

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
            <Card key={supplier.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{supplier.name}</CardTitle>
                  <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                    {supplier.is_active ? 'Активний' : 'Неактивний'}
                  </Badge>
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

      <CreateSupplierDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

function CreateSupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createSupplier = useCreateSupplier()

  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    tax_id: '',
    rating: '',
    notes: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createSupplier.mutate(
      {
        name: form.name,
        contact_person: form.contact_person || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        website: form.website || undefined,
        tax_id: form.tax_id || undefined,
        rating: form.rating || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ name: '', contact_person: '', email: '', phone: '', address: '', website: '', tax_id: '', rating: '', notes: '' })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Додати постачальника</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Назва компанії *</Label>
              <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Контактна особа</Label>
              <Input value={form.contact_person} onChange={(e) => update('contact_person', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+380..." />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Адреса</Label>
            <Input value={form.address} onChange={(e) => update('address', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Вебсайт</Label>
            <Input value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>ЄДРПОУ / ІПН</Label>
              <Input value={form.tax_id} onChange={(e) => update('tax_id', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Рейтинг (0-5)</Label>
              <Input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => update('rating', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Нотатки</Label>
            <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createSupplier.isPending}>
              {createSupplier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Додати
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
