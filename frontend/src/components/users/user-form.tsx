import { useState, useEffect } from 'react'
import { useCreateUser, useUpdateUser } from '@/hooks/use-users'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Shuffle, Copy, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
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

function generatePassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const symbols = '!@#$%&*'
  const all = upper + lower + digits + symbols
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ]
  for (let i = required.length; i < length; i++) {
    required.push(all[Math.floor(Math.random() * all.length)])
  }
  return required.sort(() => Math.random() - 0.5).join('')
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const isEdit = !!user
  const [showPassword, setShowPassword] = useState(false)

  const buildForm = (u?: User | null) =>
    u ? {
      username: u.username || '',
      password: '',
      email: u.email || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      phone: u.phone || '',
      mobile_phone: u.mobile_phone || '',
      department: u.department || '',
      custom_department: u.custom_department || '',
      position: u.position || '',
      custom_position: u.custom_position || '',
      office_location: u.office_location || '',
      room_number: u.room_number || '',
      employment_type: u.employment_type || '',
      hire_date: u.hire_date || '',
      is_staff: u.is_staff,
      is_active: u.is_active,
    } : emptyForm

  const [form, setForm] = useState(() => buildForm(user))

  useEffect(() => {
    if (open) {
      setForm(buildForm(user))
      setShowPassword(false)
    }
  }, [open, user])

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
                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          required={!isEdit}
                          placeholder={isEdit ? 'Залиште порожнім' : ''}
                          className="pr-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-8 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Eye className="h-3.5 w-3.5 text-muted-foreground" />}
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        title="Згенерувати пароль"
                        onClick={() => {
                          const pwd = generatePassword()
                          update('password', pwd)
                          setShowPassword(true)
                        }}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                      {form.password && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          title="Копіювати пароль"
                          onClick={() => {
                            navigator.clipboard.writeText(form.password)
                            toast.success('Пароль скопійовано')
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
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
