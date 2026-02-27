import { useState, useEffect } from 'react'
import { useCreateUser, useUpdateUser } from '@/hooks/use-users'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { DEPARTMENT_LABELS, POSITION_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/lib/constants'
import type { User } from '@/types'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
}

const emptyForm = {
  username: '',
  password: '',
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  mobile_phone: '',
  department: '',
  custom_department: '',
  position: '',
  custom_position: '',
  office_location: '',
  room_number: '',
  employment_type: '',
  hire_date: '',
  is_staff: false,
  is_active: true,
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const isEdit = !!user

  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || '',
        password: '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        mobile_phone: user.mobile_phone || '',
        department: user.department || '',
        custom_department: user.custom_department || '',
        position: user.position || '',
        custom_position: user.custom_position || '',
        office_location: user.office_location || '',
        room_number: user.room_number || '',
        employment_type: user.employment_type || '',
        hire_date: user.hire_date || '',
        is_staff: user.is_staff,
        is_active: user.is_active,
      })
    } else {
      setForm(emptyForm)
    }
  }, [user])

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, unknown> = { ...form }
    // Remove empty optional fields
    if (!data.password) delete data.password
    Object.keys(data).forEach((key) => {
      if (data[key] === '' && !['username', 'is_staff', 'is_active'].includes(key)) {
        delete data[key]
      }
    })

    if (isEdit) {
      delete data.username // can't change username
      updateUser.mutate(
        { id: user!.id, data },
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createUser.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          setForm(emptyForm)
        },
      })
    }
  }

  const isPending = createUser.isPending || updateUser.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати користувача' : 'Додати користувача'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[65vh] pr-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="basic">Основне</TabsTrigger>
                <TabsTrigger value="work">Робота</TabsTrigger>
                <TabsTrigger value="contacts">Контакти</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Ім'я користувача *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => update('username', e.target.value)}
                      required
                      disabled={isEdit}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{isEdit ? 'Новий пароль' : 'Пароль *'}</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      required={!isEdit}
                      placeholder={isEdit ? 'Залиште порожнім' : ''}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ім'я</Label>
                    <Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Прізвище</Label>
                    <Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Тип зайнятості</Label>
                    <Select value={form.employment_type} onValueChange={(v) => update('employment_type', v === '_none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не вказано</SelectItem>
                        {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="is_staff"
                      checked={form.is_staff}
                      onChange={(e) => update('is_staff', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="is_staff">Адміністратор (staff)</Label>
                  </div>
                  {isEdit && (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={form.is_active}
                        onChange={(e) => update('is_active', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="is_active">Активний</Label>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="work" className="space-y-3 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Відділ</Label>
                    <Select value={form.department} onValueChange={(v) => update('department', v === '_none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не вказано</SelectItem>
                        {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Відділ (інший)</Label>
                    <Input value={form.custom_department} onChange={(e) => update('custom_department', e.target.value)} placeholder="Якщо не зі списку" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Посада</Label>
                    <Select value={form.position} onValueChange={(v) => update('position', v === '_none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Не вказано</SelectItem>
                        {Object.entries(POSITION_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Посада (інша)</Label>
                    <Input value={form.custom_position} onChange={(e) => update('custom_position', e.target.value)} placeholder="Якщо не зі списку" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Офіс / Локація</Label>
                    <Input value={form.office_location} onChange={(e) => update('office_location', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Кімната</Label>
                    <Input value={form.room_number} onChange={(e) => update('room_number', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Дата прийняття</Label>
                    <Input type="date" value={form.hire_date} onChange={(e) => update('hire_date', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="space-y-3 p-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Телефон</Label>
                    <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+380..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Мобільний</Label>
                    <Input value={form.mobile_phone} onChange={(e) => update('mobile_phone', e.target.value)} placeholder="+380..." />
                  </div>
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
