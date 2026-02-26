import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMaintenanceRequests, useStartMaintenance, useCompleteMaintenance } from '@/hooks/use-maintenance'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Wrench, Calendar, Play, CheckCircle } from 'lucide-react'
import { MAINTENANCE_STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function MaintenanceListPage() {
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)
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
          <Button variant="outline" asChild>
            <Link to="/maintenance/schedule">
              <Calendar className="mr-2 h-4 w-4" />
              Розклад
            </Link>
          </Button>
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
                    <TableCell className="text-sm">{request.request_type}</TableCell>
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
    </div>
  )
}
