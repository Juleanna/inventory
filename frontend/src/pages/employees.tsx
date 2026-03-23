import { useState, useEffect } from 'react'
import {
  useEmployeesList,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/hooks/use-employees'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDebounce } from '@/hooks/use-debounce'
import { Users, Plus, Loader2, Pencil, Trash2, Mail, Phone, Briefcase } from 'lucide-react'
import type { Employee } from '@/types'

const DEPARTMENT_LABELS: Record<string, string> = {
  IT: 'IT відділ',
  HR: 'Кадри',
  FIN: 'Бухгалтерія',
  SALES: 'Відділ продажів',
  MGMT: 'Керівництво',
  PROD: 'Виробництво',
  LOG: 'Логістика',
  LEGAL: 'Юридичний',
  OTHER: 'Інше',
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const pageSize = 25

  const { data, isLoading } = useEmployeesList({
    page,
    page_size: pageSize,
    search: debouncedSearch || undefined,
  })
  const deleteEmployee = useDeleteEmployee()

  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<Employee | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const handleEdit = (item: Employee) => {
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
        title="Співробітники"
        description={`Довідник співробітників • ${data?.count ?? 0} записів`}
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
          placeholder="Пошук співробітників..."
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Співробітників не знайдено"
          description="Додайте першого співробітника для ведення довідника"
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.results.map((item) => (
              <Card key={item.id} className="transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 mr-2">
                      <CardTitle className="text-base">{item.full_name}</CardTitle>
                      {item.position && (
                        <p className="text-xs text-muted-foreground truncate">{item.position}</p>
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
                        {item.is_active ? 'Активний' : 'Звільнений'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(item.department || item.custom_department) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      <span>{item.department_display || DEPARTMENT_LABELS[item.department] || item.custom_department}</span>
                    </div>
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
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </>
      )}

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        employee={editItem}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити співробітника?"
        description="Ви впевнені, що хочете видалити цього співробітника? Цю дію неможливо скасувати."
        confirmLabel="Видалити"
        variant="destructive"
        onConfirm={() => {
          if (deleteId) {
            deleteEmployee.mutate(deleteId)
            setDeleteId(null)
          }
        }}
      />
    </div>
  )
}

function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee?: Employee | null
}) {
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const isEdit = !!employee

  const emptyForm = {
    last_name: '',
    first_name: '',
    middle_name: '',
    position: '',
    department: '',
    custom_department: '',
    email: '',
    phone: '',
    notes: '',
    is_active: true,
  }

  const buildForm = (e?: Employee | null) =>
    e
      ? {
          last_name: e.last_name || '',
          first_name: e.first_name || '',
          middle_name: e.middle_name || '',
          position: e.position || '',
          department: e.department || '',
          custom_department: e.custom_department || '',
          email: e.email || '',
          phone: e.phone || '',
          notes: e.notes || '',
          is_active: e.is_active,
        }
      : emptyForm

  const [form, setForm] = useState(() => buildForm(employee))

  useEffect(() => {
    if (open) {
      setForm(buildForm(employee))
    }
  }, [open, employee])

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form }
    if (data.department !== 'OTHER') {
      data.custom_department = ''
    }

    if (isEdit) {
      updateEmployee.mutate(
        { id: employee!.id, data },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      createEmployee.mutate(data, {
        onSuccess: () => {
          onOpenChange(false)
          setForm(emptyForm)
        },
      })
    }
  }

  const isPending = createEmployee.isPending || updateEmployee.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редагувати співробітника' : 'Додати співробітника'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Прізвище *</Label>
              <Input
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                required
                placeholder="Іванов"
              />
            </div>
            <div className="space-y-2">
              <Label>Ім'я *</Label>
              <Input
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                required
                placeholder="Іван"
              />
            </div>
            <div className="space-y-2">
              <Label>По батькові</Label>
              <Input
                value={form.middle_name}
                onChange={(e) => update('middle_name', e.target.value)}
                placeholder="Іванович"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Посада</Label>
            <Input
              value={form.position}
              onChange={(e) => update('position', e.target.value)}
              placeholder="Системний адміністратор"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Відділ</Label>
              <Select value={form.department || '_none'} onValueChange={(v) => update('department', v === '_none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Не вказано</SelectItem>
                  {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.department === 'OTHER' && (
              <div className="space-y-2">
                <Label>Відділ (інший)</Label>
                <Input
                  value={form.custom_department}
                  onChange={(e) => update('custom_department', e.target.value)}
                  placeholder="Назва відділу"
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
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
              <Label>Телефон</Label>
              <Input
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="+380..."
              />
            </div>
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
