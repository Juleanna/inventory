import { useState } from 'react'
import { useCreateEquipment } from '@/hooks/use-equipment'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from '@/lib/constants'
import { ScrollArea } from '@/components/ui/scroll-area'

interface EquipmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EquipmentFormDialog({ open, onOpenChange }: EquipmentFormDialogProps) {
  const createEquipment = useCreateEquipment()
  const [form, setForm] = useState({
    name: '',
    category: '',
    model: '',
    manufacturer: '',
    serial_number: '',
    inventory_number: '',
    location: '',
    status: 'WORKING',
    purchase_price: '',
    purchase_date: '',
    warranty_until: '',
    cpu: '',
    ram: '',
    storage: '',
    ip_address: '',
    mac_address: '',
    operating_system: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form }
    if (!data.purchase_price) delete (data as Record<string, unknown>).purchase_price
    if (!data.purchase_date) delete (data as Record<string, unknown>).purchase_date
    if (!data.warranty_until) delete (data as Record<string, unknown>).warranty_until

    createEquipment.mutate(data, {
      onSuccess: () => {
        onOpenChange(false)
        setForm({
          name: '', category: '', model: '', manufacturer: '', serial_number: '',
          inventory_number: '', location: '', status: 'WORKING', purchase_price: '',
          purchase_date: '', warranty_until: '', cpu: '', ram: '', storage: '',
          ip_address: '', mac_address: '', operating_system: '',
        })
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Додати обладнання</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Назва *</Label>
                <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Категорія *</Label>
                <Select value={form.category} onValueChange={(v) => update('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Виробник</Label>
                <Input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Модель</Label>
                <Input value={form.model} onChange={(e) => update('model', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Серійний номер *</Label>
                <Input value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Інвентарний номер</Label>
                <Input value={form.inventory_number} onChange={(e) => update('inventory_number', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={form.status} onValueChange={(v) => update('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Місцезнаходження</Label>
                <Input value={form.location} onChange={(e) => update('location', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Дата покупки</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => update('purchase_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Гарантія до</Label>
                <Input type="date" value={form.warranty_until} onChange={(e) => update('warranty_until', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Ціна покупки</Label>
                <Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => update('purchase_price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>ОС</Label>
                <Input value={form.operating_system} onChange={(e) => update('operating_system', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CPU</Label>
                <Input value={form.cpu} onChange={(e) => update('cpu', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>RAM</Label>
                <Input value={form.ram} onChange={(e) => update('ram', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Сховище</Label>
                <Input value={form.storage} onChange={(e) => update('storage', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>IP адреса</Label>
                <Input value={form.ip_address} onChange={(e) => update('ip_address', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>MAC адреса</Label>
                <Input value={form.mac_address} onChange={(e) => update('mac_address', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={createEquipment.isPending}>
                {createEquipment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Додати
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
