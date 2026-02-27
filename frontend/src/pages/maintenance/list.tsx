import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useMaintenanceRequests,
  useCreateMaintenanceRequest,
  useStartMaintenance,
  useCompleteMaintenance,
} from '@/hooks/use-maintenance'
import { useEquipmentList } from '@/hooks/use-equipment'
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Wrench, Calendar, Play, CheckCircle, Plus, Loader2 } from 'lucide-react'
import { MAINTENANCE_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

const REQUEST_TYPE_LABELS: Record<string, string> = {
  SCHEDULED: 'Планове ТО',
  REPAIR: 'Ремонт',
  INSPECTION: 'Перевірка',
  UPGRADE: 'Модернізація',
  REPLACEMENT: 'Заміна',
  CLEANING: 'Очищення',
}

export default function MaintenanceListPage() {
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const { data, isLoading } = useMaintenanceRequests({
    page,
    status: status || undefined,
  })
  const startMaintenance = useStartMaintenance()
  const completeMaintenance = useCompleteMaintenance()

  const totalPages = data ? Math.ceil(data.count / 25) : 0

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

      <div className="mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
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

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Wrench className="h-12 w-12" />}
          title="Запитів не знайдено"
          description="Немає запитів на обслуговування з обраним статусом"
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
                  <TableHead className="w-24">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <span className="font-medium">{request.equipment_details?.name || `#${request.equipment}`}</span>
                      <p className="text-xs text-muted-foreground">{request.description?.slice(0, 60)}</p>
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
                      <div className="flex gap-1">
                        {request.status === 'PENDING' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startMaintenance.mutate(request.id)}
                            title="Розпочати"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {request.status === 'IN_PROGRESS' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => completeMaintenance.mutate({ id: request.id })}
                            title="Завершити"
                          >
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

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Сторінка {page} з {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Попередня
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Наступна
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateMaintenanceDialog open={showCreate} onOpenChange={setShowCreate} />
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
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Створити запит на обслуговування</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
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
            <Textarea value={form.description} onChange={(e) => update('description', e.target.value)} required rows={2} placeholder="Детальний опис..." />
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
            <input type="checkbox" id="downtime" checked={form.downtime_required} onChange={(e) => setForm(prev => ({...prev, downtime_required: e.target.checked}))} className="rounded border-gray-300" />
            <Label htmlFor="downtime">Потрібна зупинка обладнання</Label>
          </div>
          <div className="space-y-1.5">
            <Label>Примітки</Label>
            <Input value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Додаткова інформація..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
