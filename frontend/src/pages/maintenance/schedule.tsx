import { useState, useMemo } from 'react'
import { useMaintenanceSchedules, useCreateMaintenanceSchedule, useUpdateMaintenanceSchedule, useDeleteMaintenanceSchedule, useMaintenanceRequests } from '@/hooks/use-maintenance'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Link } from 'react-router-dom'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ArrowLeft, Calendar, Plus, Loader2, ChevronLeft, ChevronRight, LayoutGrid, Pencil, Trash2, Eye, Clock, Wrench, User } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest } from '@/types'

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Щодня',
  WEEKLY: 'Щотижня',
  MONTHLY: 'Щомісяця',
  QUARTERLY: 'Щоквартально',
  SEMI_ANNUALLY: 'Раз на півроку',
  ANNUALLY: 'Щорічно',
  CUSTOM: 'Користувацький',
}

const MONTH_NAMES = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
]

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-400',
  HIGH: 'bg-orange-400',
  CRITICAL: 'bg-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  APPROVED: 'Затверджено',
  IN_PROGRESS: 'В процесі',
  COMPLETED: 'Завершено',
  CANCELLED: 'Скасовано',
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'schedule' | 'request'
  priority?: string
  status?: string
  equipment?: string
  frequency?: string
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Monday = 0
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const days: { date: Date; currentMonth: boolean }[] = []

  // Previous month days
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, currentMonth: false })
  }

  // Current month days
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), currentMonth: true })
  }

  // Next month days to fill grid (6 rows)
  while (days.length < 42) {
    const d = new Date(year, month + 1, days.length - startDow - lastDay.getDate() + 1)
    days.push({ date: d, currentMonth: false })
  }

  return days
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateScheduleOccurrences(
  schedule: Record<string, unknown>,
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  const nextStr = String(schedule.next_maintenance || schedule.next_due || '')
  if (!nextStr) return []

  const next = new Date(nextStr)
  if (isNaN(next.getTime())) return []

  const freq = String(schedule.frequency || schedule.schedule_type || '')
  const intervalDays: Record<string, number> = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 30,
    QUARTERLY: 91,
    SEMI_ANNUALLY: 182,
    ANNUALLY: 365,
    CUSTOM: Number(schedule.custom_interval_days) || 30,
  }

  const interval = intervalDays[freq] || 30
  const events: CalendarEvent[] = []

  const equipName = typeof schedule.equipment === 'object' && schedule.equipment
    ? String((schedule.equipment as Record<string, unknown>).name)
    : (schedule.equipment_details as Record<string, unknown> | undefined)?.name as string | undefined
    || `Обладнання #${schedule.equipment}`

  const title = String(schedule.title || equipName)

  // Generate backward from next date
  let d = new Date(next)
  while (d > startDate) {
    d = new Date(d.getTime() - interval * 86400000)
  }

  // Generate forward
  while (d <= endDate) {
    if (d >= startDate) {
      events.push({
        id: `sched-${schedule.id}-${dateKey(d)}`,
        title,
        date: dateKey(d),
        type: 'schedule',
        equipment: equipName,
        frequency: FREQUENCY_LABELS[freq] || freq,
      })
    }
    d = new Date(d.getTime() + interval * 86400000)
  }

  return events
}

export default function MaintenanceSchedulePage() {
  const { data, isLoading } = useMaintenanceSchedules({ show_inactive: true })
  const { data: requestsData } = useMaintenanceRequests({ page: 1, status: '' })
  const deleteSchedule = useDeleteMaintenanceSchedule()
  const [showCreate, setShowCreate] = useState(false)
  const [editSchedule, setEditSchedule] = useState<Record<string, unknown> | null>(null)
  const [viewSchedule, setViewSchedule] = useState<Record<string, unknown> | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [viewTab, setViewTab] = useState('calendar')
  const [calendarView, setCalendarView] = useState<'month' | 'year'>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const schedules: Record<string, unknown>[] =
    (data as { schedules?: Record<string, unknown>[]; results?: Record<string, unknown>[] })?.schedules
    || (data as { results?: Record<string, unknown>[] })?.results
    || []

  const requests: MaintenanceRequest[] = requestsData?.results || []

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Build events map
  const eventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    const addEvent = (ev: CalendarEvent) => {
      if (!map.has(ev.date)) map.set(ev.date, [])
      map.get(ev.date)!.push(ev)
    }

    // Date range for occurrence generation
    let rangeStart: Date
    let rangeEnd: Date
    if (calendarView === 'year') {
      rangeStart = new Date(year, 0, 1)
      rangeEnd = new Date(year, 11, 31)
    } else {
      rangeStart = new Date(year, month, 1)
      rangeEnd = new Date(year, month + 1, 0)
    }

    // Schedule occurrences
    schedules.forEach((s) => {
      const occurrences = generateScheduleOccurrences(s, rangeStart, rangeEnd)
      occurrences.forEach(addEvent)
    })

    // Maintenance requests
    requests.forEach((r) => {
      const d = r.scheduled_date || r.requested_date
      if (d) {
        addEvent({
          id: `req-${r.id}`,
          title: r.title,
          date: d.slice(0, 10),
          type: 'request',
          priority: r.priority,
          status: r.status,
          equipment: r.equipment_details?.name || `#${r.equipment}`,
        })
      }
    })

    return map
  }, [schedules, requests, year, month, calendarView])

  const navigateMonth = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    setSelectedDay(null)
  }

  const navigateYear = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear() + delta, prev.getMonth(), 1))
    setSelectedDay(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDay(dateKey(new Date()))
  }

  const selectedEvents = selectedDay ? eventsMap.get(selectedDay) || [] : []
  const monthDays = getMonthDays(year, month)
  const todayStr = dateKey(new Date())

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
      ) : (
        <Tabs value={viewTab} onValueChange={setViewTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="calendar">
              <Calendar className="mr-2 h-4 w-4" />
              Календар
            </TabsTrigger>
            <TabsTrigger value="cards">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Картки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            {/* Calendar controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>Сьогодні</Button>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => calendarView === 'month' ? navigateMonth(-1) : navigateYear(-1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium min-w-[160px] text-center">
                    {calendarView === 'month'
                      ? `${MONTH_NAMES[month]} ${year}`
                      : String(year)}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => calendarView === 'month' ? navigateMonth(1) : navigateYear(1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-1 border rounded-md p-0.5">
                <Button
                  variant={calendarView === 'month' ? 'default' : 'ghost'}
                  size="sm" className="h-7 text-xs"
                  onClick={() => setCalendarView('month')}
                >
                  Місяць
                </Button>
                <Button
                  variant={calendarView === 'year' ? 'default' : 'ghost'}
                  size="sm" className="h-7 text-xs"
                  onClick={() => setCalendarView('year')}
                >
                  Рік
                </Button>
              </div>
            </div>

            {calendarView === 'month' ? (
              <div className="flex gap-4">
                {/* Month grid */}
                <div className="flex-1">
                  <div className="grid grid-cols-7 border rounded-md overflow-hidden">
                    {/* Day names header */}
                    {DAY_NAMES.map((d) => (
                      <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground border-b">
                        {d}
                      </div>
                    ))}
                    {/* Days */}
                    {monthDays.map(({ date, currentMonth }, i) => {
                      const key = dateKey(date)
                      const dayEvents = eventsMap.get(key) || []
                      const isToday = key === todayStr
                      const isSelected = key === selectedDay
                      const scheduleCount = dayEvents.filter((e) => e.type === 'schedule').length
                      const requestCount = dayEvents.filter((e) => e.type === 'request').length
                      const hasCritical = dayEvents.some((e) => e.priority === 'CRITICAL' || e.priority === 'HIGH')

                      return (
                        <div
                          key={i}
                          className={cn(
                            'min-h-[80px] border-b border-r p-1 cursor-pointer transition-colors hover:bg-muted/50',
                            !currentMonth && 'bg-muted/20 text-muted-foreground',
                            isSelected && 'bg-primary/5 ring-2 ring-primary ring-inset',
                            isToday && !isSelected && 'bg-blue-50 dark:bg-blue-950/20'
                          )}
                          onClick={() => setSelectedDay(key)}
                        >
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                              isToday && 'bg-primary text-primary-foreground'
                            )}>
                              {date.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                            )}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, 3).map((ev) => (
                              <div
                                key={ev.id}
                                className={cn(
                                  'text-[10px] leading-tight px-1 py-0.5 rounded truncate',
                                  ev.type === 'schedule'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                    : ev.priority === 'CRITICAL' || ev.priority === 'HIGH'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                )}
                              >
                                {ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-muted-foreground px-1">+{dayEvents.length - 3}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-blue-100 dark:bg-blue-900/30" />
                      Планове ТО
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-green-100 dark:bg-green-900/30" />
                      Запити
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-red-100 dark:bg-red-900/30" />
                      Терміново
                    </div>
                  </div>
                </div>

                {/* Day detail sidebar */}
                <div className="w-72 shrink-0">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">
                        {selectedDay
                          ? new Date(selectedDay + 'T00:00:00').toLocaleDateString('uk-UA', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Оберіть день'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedDay ? (
                        selectedEvents.length > 0 ? (
                          <div className="space-y-3">
                            {selectedEvents.map((ev) => (
                              <div key={ev.id} className="border rounded-md p-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium leading-tight">{ev.title}</p>
                                  {ev.type === 'schedule' ? (
                                    <Badge variant="outline" className="text-[10px] shrink-0">ТО</Badge>
                                  ) : (
                                    <Badge
                                      variant={ev.status === 'COMPLETED' ? 'secondary' : 'default'}
                                      className="text-[10px] shrink-0"
                                    >
                                      {STATUS_LABELS[ev.status || ''] || ev.status}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{ev.equipment}</p>
                                {ev.frequency && (
                                  <p className="text-xs text-muted-foreground">{ev.frequency}</p>
                                )}
                                {ev.priority && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div className={cn('w-2 h-2 rounded-full', PRIORITY_COLORS[ev.priority] || 'bg-gray-400')} />
                                    <span className="text-xs text-muted-foreground capitalize">
                                      {ev.priority === 'LOW' ? 'Низький' : ev.priority === 'MEDIUM' ? 'Середній' : ev.priority === 'HIGH' ? 'Високий' : 'Критичний'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-4 text-center">Немає подій</p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">Натисніть на день для перегляду</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* Year view */
              <div className="grid grid-cols-3 gap-4 lg:grid-cols-4">
                {MONTH_NAMES.map((monthName, mi) => {
                  const mDays = getMonthDays(year, mi)
                  return (
                    <Card
                      key={mi}
                      className={cn(
                        'cursor-pointer hover:shadow-md transition-shadow',
                        mi === month && 'ring-2 ring-primary'
                      )}
                      onClick={() => {
                        setCurrentDate(new Date(year, mi, 1))
                        setCalendarView('month')
                      }}
                    >
                      <CardHeader className="pb-1 pt-3 px-3">
                        <CardTitle className="text-sm">{monthName}</CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="grid grid-cols-7 gap-0">
                          {DAY_NAMES.map((d) => (
                            <div key={d} className="text-[9px] text-center text-muted-foreground py-0.5">{d[0]}</div>
                          ))}
                          {mDays.slice(0, 42).map(({ date, currentMonth }, i) => {
                            const key = dateKey(date)
                            const dayEvents = eventsMap.get(key) || []
                            const hasEvents = dayEvents.length > 0
                            const isToday = key === todayStr
                            const hasCritical = dayEvents.some((e) => e.priority === 'CRITICAL' || e.priority === 'HIGH')

                            return (
                              <div
                                key={i}
                                className={cn(
                                  'text-[10px] text-center py-0.5 relative',
                                  !currentMonth && 'text-muted-foreground/30',
                                  isToday && 'font-bold text-primary',
                                )}
                              >
                                {date.getDate()}
                                {hasEvents && currentMonth && (
                                  <div className={cn(
                                    'absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                                    hasCritical ? 'bg-red-500' : 'bg-blue-500'
                                  )} />
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {/* Month event count */}
                        {(() => {
                          let count = 0
                          mDays.forEach(({ date, currentMonth }) => {
                            if (currentMonth) {
                              const evs = eventsMap.get(dateKey(date))
                              if (evs) count += evs.length
                            }
                          })
                          return count > 0 ? (
                            <p className="text-[10px] text-muted-foreground mt-1 text-center">{count} подій</p>
                          ) : null
                        })()}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cards">
            {!schedules.length ? (
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
                    <Card
                      key={String(schedule.id)}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setViewSchedule(schedule)}
                    >
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
                        <div className="flex gap-2 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline" size="sm" className="flex-1"
                            onClick={() => setEditSchedule(schedule)}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Редагувати
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => setViewSchedule(schedule)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline" size="sm" className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(Number(schedule.id))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Деталі розкладу */}
      <Sheet open={!!viewSchedule} onOpenChange={(v) => { if (!v) setViewSchedule(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {viewSchedule && (
            <ScheduleDetailSheet
              schedule={viewSchedule}
              onEdit={() => { setViewSchedule(null); setEditSchedule(viewSchedule) }}
              onDelete={() => { setViewSchedule(null); setDeleteId(Number(viewSchedule.id)) }}
            />
          )}
        </SheetContent>
      </Sheet>

      <CreateScheduleDialog open={showCreate} onOpenChange={setShowCreate} />

      <EditScheduleDialog
        open={!!editSchedule}
        onOpenChange={(v) => { if (!v) setEditSchedule(null) }}
        schedule={editSchedule}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити розклад?"
        description="Розклад обслуговування буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteSchedule.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />
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

function EditScheduleDialog({
  open,
  onOpenChange,
  schedule,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  schedule: Record<string, unknown> | null
}) {
  const updateSchedule = useUpdateMaintenanceSchedule()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })
  const { data: users } = useUsersList()

  const [form, setForm] = useState({
    title: '',
    description: '',
    frequency: 'MONTHLY',
    next_maintenance: '',
    custom_interval_days: '',
    estimated_duration_hours: '',
    is_active: true,
  })

  const [prevId, setPrevId] = useState<unknown>(null)
  if (schedule && schedule.id !== prevId) {
    setPrevId(schedule.id)
    setForm({
      title: String(schedule.title || ''),
      description: String(schedule.description || ''),
      frequency: String(schedule.frequency || schedule.schedule_type || 'MONTHLY'),
      next_maintenance: String(schedule.next_maintenance || schedule.next_due || '').slice(0, 10),
      custom_interval_days: schedule.custom_interval_days ? String(schedule.custom_interval_days) : '',
      estimated_duration_hours: schedule.estimated_duration_hours ? String(schedule.estimated_duration_hours) : '',
      is_active: schedule.is_active !== false,
    })
  }
  if (!schedule && prevId !== null) {
    setPrevId(null)
  }

  const update = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedule) return
    updateSchedule.mutate(
      {
        id: Number(schedule.id),
        data: {
          title: form.title,
          description: form.description,
          frequency: form.frequency,
          next_maintenance: form.next_maintenance,
          custom_interval_days: form.custom_interval_days ? Number(form.custom_interval_days) : undefined,
          estimated_duration_hours: form.estimated_duration_hours ? Number(form.estimated_duration_hours) : undefined,
          is_active: form.is_active,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Редагувати розклад</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Назва ТО *</Label>
            <Input value={form.title} onChange={(e) => update('title', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Опис робіт</Label>
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} />
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
              <Input type="number" value={form.custom_interval_days} onChange={(e) => update('custom_interval_days', e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Тривалість (годин)</Label>
            <Input type="number" step="0.5" value={form.estimated_duration_hours} onChange={(e) => update('estimated_duration_hours', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => update('is_active', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="is_active" className="cursor-pointer">Активний</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={updateSchedule.isPending}>
              {updateSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Зберегти
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleDetailSheet({
  schedule,
  onEdit,
  onDelete,
}: {
  schedule: Record<string, unknown>
  onEdit: () => void
  onDelete: () => void
}) {
  const equipObj = typeof schedule.equipment === 'object' && schedule.equipment
    ? (schedule.equipment as Record<string, unknown>)
    : null
  const equipName = equipObj?.name as string || (schedule.equipment_details as Record<string, unknown> | undefined)?.name as string || `#${schedule.equipment}`
  const responsibleObj = schedule.responsible_person as Record<string, unknown> | null
  const freq = String(schedule.frequency || schedule.schedule_type || '')
  const nextDate = String(schedule.next_maintenance || schedule.next_due || '')
  const daysUntil = schedule.days_until as number | undefined
  const estimatedDuration = schedule.estimated_duration as string | undefined
  const checklist = schedule.checklist as string[] | undefined

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-lg">{String(schedule.title || equipName)}</SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-6">
        {/* Статус + дні */}
        <div className="flex items-center gap-3">
          <Badge variant={schedule.is_active !== false ? 'default' : 'secondary'} className="text-sm">
            {schedule.is_active !== false ? 'Активний' : 'Неактивний'}
          </Badge>
          {daysUntil !== undefined && (
            <Badge variant={daysUntil <= 7 ? 'destructive' : daysUntil <= 30 ? 'outline' : 'secondary'}>
              {daysUntil <= 0 ? 'Прострочено' : `Через ${daysUntil} дн.`}
            </Badge>
          )}
        </div>

        {/* Обладнання */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wrench className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{equipName}</p>
                <p className="text-xs text-muted-foreground">Обладнання</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Деталі розкладу */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Розклад</h3>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <dt className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Періодичність
            </dt>
            <dd className="text-right font-medium">{FREQUENCY_LABELS[freq] || freq}</dd>

            {!!schedule.custom_interval_days && (
              <>
                <dt className="text-muted-foreground">Інтервал</dt>
                <dd className="text-right">{String(schedule.custom_interval_days)} днів</dd>
              </>
            )}

            {nextDate && (
              <>
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Наступне ТО
                </dt>
                <dd className="text-right font-medium">
                  {new Date(nextDate).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
                </dd>
              </>
            )}

            {estimatedDuration && (
              <>
                <dt className="text-muted-foreground">Тривалість</dt>
                <dd className="text-right">{estimatedDuration}</dd>
              </>
            )}
          </dl>
        </div>

        {/* Відповідальна особа */}
        {responsibleObj && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Відповідальний</h3>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{String(responsibleObj.name || '')}</p>
            </div>
          </div>
        )}

        {/* Опис */}
        {!!schedule.description && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Опис робіт</h3>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{String(schedule.description)}</p>
          </div>
        )}

        {/* Чеклист */}
        {checklist && checklist.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Чеклист</h3>
            <ul className="space-y-2">
              {checklist.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <div className="mt-1 h-4 w-4 rounded border border-muted-foreground/30 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Кнопки дій */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Редагувати
          </Button>
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Видалити
          </Button>
        </div>
      </div>
    </>
  )
}
