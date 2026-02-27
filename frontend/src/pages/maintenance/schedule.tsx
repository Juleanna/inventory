import { useState } from 'react'
import { useMaintenanceSchedules, useCreateMaintenanceSchedule } from '@/hooks/use-maintenance'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useUsersList } from '@/hooks/use-auth'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar, Plus, Loader2 } from 'lucide-react'

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Щодня',
  WEEKLY: 'Щотижня',
  MONTHLY: 'Щомісяця',
  QUARTERLY: 'Щоквартально',
  SEMI_ANNUALLY: 'Раз на півроку',
  ANNUALLY: 'Щорічно',
  CUSTOM: 'Користувацький',
}

export default function MaintenanceSchedulePage() {
  const { data, isLoading } = useMaintenanceSchedules()
  const [showCreate, setShowCreate] = useState(false)

  // API може повернути { schedules: [...] } або { results: [...] }
  const schedules: Record<string, unknown>[] = (data as { schedules?: Record<string, unknown>[]; results?: Record<string, unknown>[] })?.schedules
    || (data as { results?: Record<string, unknown>[] })?.results
    || []

  return (
    <div>
      <PageHeader
        title="Розклад обслуговування"
        description="Планові технічні обслуговування"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати розклад
            </Button>
            <Button variant="outline" asChild>
              <Link to="/maintenance">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : !schedules.length ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="Розклад порожній"
          description="Немає запланованих обслуговувань"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const equipName = typeof schedule.equipment === 'object' && schedule.equipment
              ? (schedule.equipment as Record<string, unknown>).name as string
              : (schedule.equipment_details as Record<string, unknown> | undefined)?.name as string | undefined
              || `Обладнання #${schedule.equipment}`

            return (
              <Card key={String(schedule.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{equipName}</CardTitle>
                    <Badge variant={schedule.is_active !== false ? 'default' : 'secondary'}>
                      {schedule.is_active !== false ? 'Активний' : 'Неактивний'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!!schedule.title && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Назва</span>
                      <span className="font-medium text-right">{String(schedule.title)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Періодичність</span>
                    <span>
                      {FREQUENCY_LABELS[String(schedule.frequency || '')] || String(schedule.frequency || schedule.schedule_type || '')}
                    </span>
                  </div>
                  {!!schedule.custom_interval_days && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Інтервал</span>
                      <span>{String(schedule.custom_interval_days)} днів</span>
                    </div>
                  )}
                  {!!(schedule.next_maintenance || schedule.next_due) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Наступне</span>
                      <span className="font-medium">
                        {new Date(String(schedule.next_maintenance || schedule.next_due)).toLocaleDateString('uk-UA')}
                      </span>
                    </div>
                  )}
                  {schedule.days_until !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Через</span>
                      <Badge variant={Number(schedule.days_until) <= 7 ? 'destructive' : 'secondary'}>
                        {String(schedule.days_until)} дн.
                      </Badge>
                    </div>
                  )}
                  {!!schedule.description && (
                    <p className="text-xs text-muted-foreground pt-2">{String(schedule.description).slice(0, 100)}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <CreateScheduleDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}

function CreateScheduleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createSchedule = useCreateMaintenanceSchedule()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })
  const { data: users } = useUsersList()

  const [form, setForm] = useState({
    equipment_id: '',
    title: '',
    description: '',
    frequency: 'MONTHLY',
    next_maintenance: '',
    custom_interval_days: '',
    estimated_duration_hours: '1',
    responsible_person: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createSchedule.mutate(
      {
        equipment_id: Number(form.equipment_id),
        title: form.title,
        description: form.description,
        frequency: form.frequency,
        next_maintenance: form.next_maintenance,
        custom_interval_days: form.custom_interval_days ? Number(form.custom_interval_days) : undefined,
        estimated_duration_hours: form.estimated_duration_hours ? Number(form.estimated_duration_hours) : undefined,
        responsible_person: form.responsible_person ? Number(form.responsible_person) : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({
            equipment_id: '',
            title: '',
            description: '',
            frequency: 'MONTHLY',
            next_maintenance: '',
            custom_interval_days: '',
            estimated_duration_hours: '1',
            responsible_person: '',
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Додати розклад обслуговування</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Обладнання *</Label>
            <Select value={form.equipment_id} onValueChange={(v) => update('equipment_id', v)}>
              <SelectTrigger><SelectValue placeholder="Оберіть обладнання" /></SelectTrigger>
              <SelectContent>
                {equipmentData?.results?.map((eq) => (
                  <SelectItem key={eq.id} value={String(eq.id)}>
                    {eq.name} ({eq.serial_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Назва ТО *</Label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} required placeholder="Напр.: Щомісячна перевірка" />
          </div>
          <div className="space-y-2">
            <Label>Опис робіт *</Label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} required rows={3} placeholder="Детальний опис робіт..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Періодичність *</Label>
              <Select value={form.frequency} onValueChange={(v) => update('frequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Наступне ТО *</Label>
              <Input type="date" value={form.next_maintenance} onChange={(e) => update('next_maintenance', e.target.value)} required />
            </div>
          </div>
          {form.frequency === 'CUSTOM' && (
            <div className="space-y-2">
              <Label>Інтервал (днів)</Label>
              <Input type="number" value={form.custom_interval_days} onChange={(e) => update('custom_interval_days', e.target.value)} placeholder="30" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Тривалість (годин)</Label>
            <Input type="number" step="0.5" value={form.estimated_duration_hours} onChange={(e) => update('estimated_duration_hours', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Відповідальна особа</Label>
            <Select value={form.responsible_person} onValueChange={v => update('responsible_person', v)}>
              <SelectTrigger><SelectValue placeholder="Не призначено" /></SelectTrigger>
              <SelectContent>
                {users?.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createSchedule.isPending}>
              {createSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
