import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  useMaintenanceRequests,
  useCreateMaintenanceRequest,
  useStartMaintenance,
  useCompleteMaintenance,
  useAssignTechnician,
  useTechnicians,
  useMaintenanceDashboard,
  useMaintenanceSchedules,
} from '@/hooks/use-maintenance'
import { useEquipmentList } from '@/hooks/use-equipment'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ListPagination } from '@/components/shared/list-pagination'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Wrench, Calendar, Play, CheckCircle, Plus, Loader2, UserPlus, Clock, AlertTriangle, X, Eye, RefreshCw } from 'lucide-react'
import { maintenanceApi } from '@/api/maintenance'
import { toast } from 'sonner'
import { MAINTENANCE_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { MaintenanceRequest } from '@/types'

const REQUEST_TYPE_LABELS: Record<string, string> = {
  SCHEDULED: 'Планове ТО',
  REPAIR: 'Ремонт',
  INSPECTION: 'Перевірка',
  UPGRADE: 'Модернізація',
  REPLACEMENT: 'Заміна',
  CLEANING: 'Очищення',
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('rounded-lg p-2', color || 'bg-muted')}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MaintenanceListPage() {
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [detailRequest, setDetailRequest] = useState<MaintenanceRequest | null>(null)
  const { data, isLoading } = useMaintenanceRequests({
    page,
    status: status || undefined,
  })
  const startMaintenance = useStartMaintenance()
  const completeMaintenance = useCompleteMaintenance()
  const assignTechnician = useAssignTechnician()
  const { data: technicians } = useTechnicians()
  const { data: dashboard } = useMaintenanceDashboard()

  const { data: schedulesData } = useMaintenanceSchedules()
  const [generating, setGenerating] = useState(false)

  const totalPages = data ? Math.ceil(data.count / 25) : 0
  const hasFilters = !!status || !!priority

  const upcomingSchedules = useMemo(() => {
    const list = (schedulesData as Record<string, unknown>)?.schedules as Record<string, unknown>[] | undefined
    if (!list) return []
    return list
      .filter((s) => s.next_maintenance)
      .sort((a, b) =>
        String(a.next_maintenance).localeCompare(String(b.next_maintenance))
      )
  }, [schedulesData])

  const handleGenerateRequests = async () => {
    setGenerating(true)
    try {
      const res = await maintenanceApi.generateScheduledRequests()
      const created = (res.data as { created_count?: number })?.created_count ?? 0
      toast.success(created > 0 ? `Створено ${created} запитів на ТО` : 'Немає розкладів, які потребують генерації запитів (наступне ТО через більше ніж 7 днів)')
    } catch {
      toast.error('Помилка при генерації запитів')
    } finally {
      setGenerating(false)
    }
  }

  const filteredResults = useMemo(() => {
    if (!data?.results) return []
    if (!priority) return data.results
    return data.results.filter((r) => r.priority === priority)
  }, [data, priority])

  // Dashboard stats
  const stats = useMemo(() => {
    if (dashboard) return dashboard
    if (!data?.results) return null
    const results = data.results
    return {
      pending: results.filter((r: MaintenanceRequest) => r.status === 'PENDING').length,
      in_progress: results.filter((r: MaintenanceRequest) => r.status === 'IN_PROGRESS').length,
      completed: results.filter((r: MaintenanceRequest) => r.status === 'COMPLETED').length,
      urgent: results.filter((r: MaintenanceRequest) => r.priority === 'URGENT' || r.priority === 'HIGH').length,
    }
  }, [dashboard, data])

  return (
    <div>
      <PageHeader
        title="Обслуговування"
        description="Управління запитами на технічне обслуговування"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Створити запит
            </Button>
            <Button variant="outline" asChild>
              <Link to="/maintenance/schedule">
                <Calendar className="mr-2 h-4 w-4" />
                Розклад
              </Link>
            </Button>
          </div>
        }
      />

      {/* Dashboard cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Очікує" value={stats.pending || 0} icon={Clock} color="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" />
          <StatCard label="В процесі" value={stats.in_progress || 0} icon={Play} color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" />
          <StatCard label="Завершено" value={stats.completed || 0} icon={CheckCircle} color="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" />
          <StatCard label="Термінові" value={stats.urgent || 0} icon={AlertTriangle} color="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Всі статуси" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі статуси</SelectItem>
              {Object.entries(MAINTENANCE_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={priority} onValueChange={(v) => { setPriority(v === '_all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Всі пріоритети" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Всі пріоритети</SelectItem>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setPriority(''); setPage(1) }}>
            <X className="mr-1 h-3.5 w-3.5" />
            Скинути
          </Button>
        )}
      </div>

      {/* Upcoming schedules */}
      {upcomingSchedules.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Заплановане обслуговування</h3>
                <Badge variant="secondary" className="text-xs">{upcomingSchedules.length}</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={handleGenerateRequests} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                Згенерувати запити
              </Button>
            </div>
            <div className="space-y-2">
              {upcomingSchedules.slice(0, 5).map((schedule: Record<string, unknown>) => {
                const freq: Record<string, string> = { DAILY: 'Щоденно', WEEKLY: 'Щотижня', MONTHLY: 'Щомісяця', QUARTERLY: 'Щоквартально', YEARLY: 'Щорічно' }
                const nextDate = new Date(schedule.next_maintenance as string)
                const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={schedule.id as number} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('rounded-full w-2 h-2', daysUntil <= 7 ? 'bg-red-500' : daysUntil <= 14 ? 'bg-yellow-500' : 'bg-green-500')} />
                      <div>
                        <p className="font-medium text-sm">{schedule.title as string}</p>
                        <p className="text-xs text-muted-foreground">
                          {(schedule.equipment as Record<string, unknown>)?.name as string || `Обладнання #${schedule.equipment}`}
                          {' · '}
                          {freq[schedule.frequency as string] || schedule.frequency as string}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{nextDate.toLocaleDateString('uk-UA')}</p>
                      <p className={cn('text-xs', daysUntil <= 7 ? 'text-red-600' : 'text-muted-foreground')}>
                        {daysUntil <= 0 ? 'Прострочено' : daysUntil === 1 ? 'Завтра' : `Через ${daysUntil} дн.`}
                      </p>
                    </div>
                  </div>
                )
              })}
              {upcomingSchedules.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link to="/maintenance/schedule">Показати всі ({upcomingSchedules.length})</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : !filteredResults.length ? (
        <EmptyState
          icon={<Wrench className="h-12 w-12" />}
          title="Запитів не знайдено"
          description="Немає запитів на обслуговування з обраними фільтрами"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Обладнання</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="hidden md:table-cell">Пріоритет</TableHead>
                  <TableHead className="hidden lg:table-cell">Дата</TableHead>
                  <TableHead className="w-28">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((request) => (
                  <TableRow key={request.id} className="cursor-pointer" onClick={() => setDetailRequest(request)}>
                    <TableCell>
                      <span className="font-medium">{request.equipment_details?.name || `#${request.equipment}`}</span>
                      <p className="text-xs text-muted-foreground">{request.title}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {REQUEST_TYPE_LABELS[request.request_type] || request.request_type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {MAINTENANCE_STATUS_LABELS[request.status] || request.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[request.priority])}>
                        {PRIORITY_LABELS[request.priority] || request.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {request.scheduled_date || new Date(request.created_at).toLocaleDateString('uk-UA')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetailRequest(request)} title="Деталі">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(request.status === 'PENDING' || request.status === 'APPROVED') && Array.isArray(technicians) && technicians.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Призначити технічника">
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {technicians.map((tech: { id: number; username: string; first_name: string; last_name: string }) => (
                                <DropdownMenuItem
                                  key={tech.id}
                                  onClick={() => assignTechnician.mutate({ requestId: request.id, technicianId: tech.id })}
                                >
                                  {tech.first_name && tech.last_name ? `${tech.first_name} ${tech.last_name}` : tech.username}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {request.status === 'PENDING' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startMaintenance.mutate(request.id)} title="Розпочати">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {request.status === 'IN_PROGRESS' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => completeMaintenance.mutate({ id: request.id })} title="Завершити">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ListPagination page={page} totalPages={totalPages} totalItems={data?.count} onPageChange={setPage} />
        </>
      )}

      <CreateMaintenanceDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Request detail Sheet */}
      <Sheet open={!!detailRequest} onOpenChange={(v) => { if (!v) setDetailRequest(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Деталі запиту</SheetTitle>
          </SheetHeader>
          {detailRequest && (
            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Badge variant="secondary">{MAINTENANCE_STATUS_LABELS[detailRequest.status] || detailRequest.status}</Badge>
                <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[detailRequest.priority])}>
                  {PRIORITY_LABELS[detailRequest.priority] || detailRequest.priority}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Обладнання</p>
                  <p className="font-medium">{detailRequest.equipment_details?.name || `#${detailRequest.equipment}`}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Назва</p>
                  <p className="font-medium">{detailRequest.title}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Опис</p>
                  <p className="text-sm">{detailRequest.description || '—'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Тип</p>
                    <p className="text-sm">{REQUEST_TYPE_LABELS[detailRequest.request_type] || detailRequest.request_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Планова дата</p>
                    <p className="text-sm">{detailRequest.scheduled_date || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Створено</p>
                    <p className="text-sm">{new Date(detailRequest.created_at).toLocaleDateString('uk-UA')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Розпочато</p>
                    <p className="text-sm">{detailRequest.started_date ? new Date(detailRequest.started_date).toLocaleDateString('uk-UA') : '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Завершено</p>
                    <p className="text-sm">{detailRequest.completed_date ? new Date(detailRequest.completed_date).toLocaleDateString('uk-UA') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Вартість</p>
                    <p className="text-sm">{detailRequest.estimated_cost ? `${detailRequest.estimated_cost} грн` : '—'}</p>
                  </div>
                </div>
                {detailRequest.parts_needed && (
                  <div>
                    <p className="text-xs text-muted-foreground">Необхідні запчастини</p>
                    <p className="text-sm">{detailRequest.parts_needed}</p>
                  </div>
                )}
                {detailRequest.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Примітки</p>
                    <p className="text-sm">{detailRequest.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {detailRequest.status === 'PENDING' && (
                  <Button size="sm" onClick={() => { startMaintenance.mutate(detailRequest.id); setDetailRequest(null) }}>
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Розпочати
                  </Button>
                )}
                {detailRequest.status === 'IN_PROGRESS' && (
                  <Button size="sm" onClick={() => { completeMaintenance.mutate({ id: detailRequest.id }); setDetailRequest(null) }}>
                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                    Завершити
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function CreateMaintenanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createRequest = useCreateMaintenanceRequest()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })

  const [form, setForm] = useState({
    equipment_id: '',
    title: '',
    description: '',
    request_type: 'REPAIR',
    priority: 'MEDIUM',
    scheduled_date: '',
    estimated_cost: '',
    estimated_duration: '',
    parts_needed: '',
    downtime_required: false,
    notes: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRequest.mutate(
      {
        equipment_id: Number(form.equipment_id),
        title: form.title,
        description: form.description,
        request_type: form.request_type,
        priority: form.priority,
        scheduled_date: form.scheduled_date || undefined,
        estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : undefined,
        estimated_duration: form.estimated_duration ? `${form.estimated_duration} hours` : undefined,
        parts_needed: form.parts_needed || undefined,
        downtime_required: form.downtime_required,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({
            equipment_id: '', title: '', description: '', request_type: 'REPAIR',
            priority: 'MEDIUM', scheduled_date: '', estimated_cost: '',
            estimated_duration: '', parts_needed: '', downtime_required: false, notes: '',
          })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle>Створити запит на обслуговування</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="main" className="w-full">
            <TabsList className="mx-6 mt-2">
              <TabsTrigger value="main">Основне</TabsTrigger>
              <TabsTrigger value="details">Деталі</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="px-6 pb-2 mt-0 space-y-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label>Назва *</Label>
                <Input value={form.title} onChange={(e) => update('title', e.target.value)} required placeholder="Короткий опис проблеми" />
              </div>
              <div className="space-y-1.5">
                <Label>Опис *</Label>
                <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} required rows={3} placeholder="Детальний опис..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Тип</Label>
                  <Select value={form.request_type} onValueChange={(v) => update('request_type', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Пріоритет</Label>
                  <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Низький</SelectItem>
                      <SelectItem value="MEDIUM">Середній</SelectItem>
                      <SelectItem value="HIGH">Високий</SelectItem>
                      <SelectItem value="URGENT">Терміновий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Дата</Label>
                  <Input type="date" value={form.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="px-6 pb-2 mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Вартість (грн)</Label>
                  <Input type="number" step="0.01" value={form.estimated_cost} onChange={(e) => update('estimated_cost', e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <Label>Тривалість (годин)</Label>
                  <Input type="number" step="0.5" value={form.estimated_duration} onChange={(e) => update('estimated_duration', e.target.value)} placeholder="1" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Необхідні запчастини</Label>
                <Input value={form.parts_needed} onChange={(e) => update('parts_needed', e.target.value)} placeholder="Перелік запчастин..." />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="downtime"
                  checked={form.downtime_required}
                  onCheckedChange={(checked) => setForm(prev => ({...prev, downtime_required: !!checked}))}
                />
                <Label htmlFor="downtime" className="cursor-pointer">Потрібна зупинка обладнання</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Примітки</Label>
                <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} placeholder="Додаткова інформація..." />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
