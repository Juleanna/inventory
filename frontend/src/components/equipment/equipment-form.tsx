import { useState, useEffect } from 'react'
import { useCreateEquipment, useUpdateEquipment } from '@/hooks/use-equipment'
import { useUsersList } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Shuffle } from 'lucide-react'
import { CATEGORY_OPTIONS, STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/lib/constants'
import type { Equipment } from '@/types'

interface EquipmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  equipment?: Equipment | null
}

const emptyForm = {
  name: '',
  category: '',
  model: '',
  manufacturer: '',
  serial_number: '',
  inventory_number: '',
  asset_tag: '',
  location: '',
  building: '',
  floor: '',
  room: '',
  status: 'WORKING',
  priority: 'MEDIUM',
  current_user: '',
  responsible_person: '',
  purchase_price: '',
  purchase_date: '',
  warranty_until: '',
  expiry_date: '',
  depreciation_rate: '',
  supplier: '',
  cpu: '',
  ram: '',
  storage: '',
  gpu: '',
  ip_address: '',
  mac_address: '',
  hostname: '',
  operating_system: '',
  description: '',
  notes: '',
}

export function EquipmentFormDialog({ open, onOpenChange, equipment }: EquipmentFormDialogProps) {
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const { data: users } = useUsersList()
  const isEdit = !!equipment

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (equipment) {
      setForm({
        name: equipment.name || '',
        category: equipment.category || '',
        model: equipment.model || '',
        manufacturer: equipment.manufacturer || '',
        serial_number: equipment.serial_number || '',
        inventory_number: equipment.inventory_number || '',
        asset_tag: equipment.asset_tag || '',
        location: equipment.location || '',
        building: equipment.building || '',
        floor: equipment.floor || '',
        room: equipment.room || '',
        status: equipment.status || 'WORKING',
        priority: equipment.priority || 'MEDIUM',
        current_user: equipment.current_user ? String(equipment.current_user) : '',
        responsible_person: equipment.responsible_person ? String(equipment.responsible_person) : '',
        purchase_price: equipment.purchase_price ? String(equipment.purchase_price) : '',
        purchase_date: equipment.purchase_date || '',
        warranty_until: equipment.warranty_until || '',
        expiry_date: equipment.expiry_date || '',
        depreciation_rate: equipment.depreciation_rate ? String(equipment.depreciation_rate) : '',
        supplier: equipment.supplier || '',
        cpu: equipment.cpu || '',
        ram: equipment.ram || '',
        storage: equipment.storage || '',
        gpu: equipment.gpu || '',
        ip_address: equipment.ip_address || '',
        mac_address: equipment.mac_address || '',
        hostname: equipment.hostname || '',
        operating_system: equipment.operating_system || '',
        description: equipment.description || '',
        notes: equipment.notes || '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [equipment])

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, unknown> = { ...form }
    // Перетворити user ID у числа або null
    if (data.current_user) data.current_user = Number(data.current_user)
    else data.current_user = null
    if (data.responsible_person) data.responsible_person = Number(data.responsible_person)
    else data.responsible_person = null
    // Видаляємо пусті необов'язкові поля
    const required = ['name', 'category', 'serial_number', 'status', 'priority', 'current_user', 'responsible_person']
    Object.keys(data).forEach((key) => {
      if (data[key] === '' && !required.includes(key)) {
        delete data[key]
      }
    })

    if (isEdit) {
      updateEquipment.mutate(
        { id: equipment!.id, data },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createEquipment.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          setForm(emptyForm)
        },
      })
    }
  }

  const isPending = createEquipment.isPending || updateEquipment.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати обладнання' : 'Додати обладнання'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[65vh] pr-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="basic">Основне</TabsTrigger>
                <TabsTrigger value="location">Розташування</TabsTrigger>
                <TabsTrigger value="specs">Мережа</TabsTrigger>
                <TabsTrigger value="finance">Фінанси</TabsTrigger>
                <TabsTrigger value="extra">Додатково</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Назва *</Label>
                    <Input value={form.name} onChange={(e) => update('name', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
                    <Label>Виробник</Label>
                    <Input value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Модель</Label>
                    <Input value={form.model} onChange={(e) => update('model', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Серійний номер *</Label>
                    <Input value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Інвентарний номер</Label>
                    <div className="flex gap-1.5">
                      <Input value={form.inventory_number} onChange={(e) => update('inventory_number', e.target.value)} />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        title="Згенерувати інвентарний номер"
                        onClick={() => {
                          const hex = Array.from(crypto.getRandomValues(new Uint8Array(5)))
                            .map((b) => b.toString(16).padStart(2, '0'))
                            .join('')
                            .toUpperCase()
                          update('inventory_number', `INV-${hex}`)
                        }}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Asset Tag</Label>
                    <Input value={form.asset_tag} onChange={(e) => update('asset_tag', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
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
                  <div className="space-y-1.5">
                    <Label>Пріоритет</Label>
                    <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="location" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Місцезнаходження</Label>
                    <Input value={form.location} onChange={(e) => update('location', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Будівля</Label>
                    <Input value={form.building} onChange={(e) => update('building', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Поверх</Label>
                    <Input value={form.floor} onChange={(e) => update('floor', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Кімната</Label>
                    <Input value={form.room} onChange={(e) => update('room', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Поточний користувач</Label>
                    <Select value={form.current_user} onValueChange={(v) => update('current_user', v === '_none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Не призначено" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не призначено</SelectItem>
                        {users?.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Відповідальна особа</Label>
                    <Select value={form.responsible_person} onValueChange={(v) => update('responsible_person', v === '_none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Не призначено" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не призначено</SelectItem>
                        {users?.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="specs" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IP адреса</Label>
                    <Input value={form.ip_address} onChange={(e) => update('ip_address', e.target.value)} placeholder="192.168.1.100" />
                  </div>
                  <div className="space-y-2">
                    <Label>MAC адреса</Label>
                    <Input value={form.mac_address} onChange={(e) => update('mac_address', e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" />
                  </div>
                  <div className="space-y-2">
                    <Label>Hostname</Label>
                    <Input value={form.hostname} onChange={(e) => update('hostname', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Операційна система</Label>
                    <Input value={form.operating_system} onChange={(e) => update('operating_system', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Процесор (CPU)</Label>
                    <Input value={form.cpu} onChange={(e) => update('cpu', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Оперативна пам'ять (RAM)</Label>
                    <Input value={form.ram} onChange={(e) => update('ram', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Сховище</Label>
                    <Input value={form.storage} onChange={(e) => update('storage', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Відеокарта (GPU)</Label>
                    <Input value={form.gpu} onChange={(e) => update('gpu', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="finance" className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дата покупки</Label>
                    <Input type="date" value={form.purchase_date} onChange={(e) => update('purchase_date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Гарантія до</Label>
                    <Input type="date" value={form.warranty_until} onChange={(e) => update('warranty_until', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Строк служби до</Label>
                    <Input type="date" value={form.expiry_date} onChange={(e) => update('expiry_date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Ціна покупки (грн)</Label>
                    <Input type="number" step="0.01" value={form.purchase_price} onChange={(e) => update('purchase_price', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Амортизація (% / рік)</Label>
                    <Input type="number" step="0.01" value={form.depreciation_rate} onChange={(e) => update('depreciation_rate', e.target.value)} placeholder="20.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Постачальник</Label>
                    <Input value={form.supplier} onChange={(e) => update('supplier', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="extra" className="space-y-4 p-1">
                <div className="space-y-2">
                  <Label>Опис</Label>
                  <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Примітки</Label>
                  <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4">
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
