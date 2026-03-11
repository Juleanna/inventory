import { useState, useMemo } from 'react'
import { useActivityLog } from '@/hooks/use-activity-log'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ClipboardList, Search, RotateCcw, Activity, Users, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { uk } from 'date-fns/locale'

const ACTION_TYPES: Record<string, { label: string; color: string }> = {
  view_equipment: { label: 'Перегляд', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  edit_equipment: { label: 'Редагування', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  add_equipment: { label: 'Додавання', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  search: { label: 'Пошук', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  export: { label: 'Експорт', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
  maintenance: { label: 'ТО', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  login: { label: 'Вхід', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
  delete: { label: 'Видалення', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
  create: { label: 'Створення', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
}

const MODEL_LABELS: Record<string, string> = {
  Equipment: 'Обладнання',
  SparePart: 'Запчастини',
  User: 'Користувачі',
  License: 'Ліцензії',
  Software: 'ПЗ',
  MaintenanceRequest: 'ТО',
  Contract: 'Договори',
}

export default function ActivityLogPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    action_type: '',
    target_model: '',
    date_from: '',
    date_to: '',
    search: '',
  })

  const queryFilters = useMemo(() => ({
    page,
    page_size: 25,
    ...(filters.action_type && { action_type: filters.action_type }),
    ...(filters.target_model && { target_model: filters.target_model }),
    ...(filters.date_from && { date_from: filters.date_from }),
    ...(filters.date_to && { date_to: filters.date_to }),
    ...(filters.search && { search: filters.search }),
  }), [page, filters])

  const { data, isLoading } = useActivityLog(queryFilters)

  const resetFilters = () => {
    setFilters({ action_type: '', target_model: '', date_from: '', date_to: '', search: '' })
    setPage(1)
  }

  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader title="Журнал дій" description="Історія всіх дій користувачів у системі" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Activity className="h-4 w-4 text-primary" /></div>
          <div><p className="text-2xl font-bold">{data?.count ?? '—'}</p><p className="text-xs text-muted-foreground">Всього дій</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2"><Calendar className="h-4 w-4 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{data?.results?.length ?? '—'}</p><p className="text-xs text-muted-foreground">На сторінці</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2"><Users className="h-4 w-4 text-green-500" /></div>
          <div><p className="text-2xl font-bold">{data?.results ? new Set(data.results.map(e => e.user)).size : '—'}</p><p className="text-xs text-muted-foreground">Користувачів</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2"><ClipboardList className="h-4 w-4 text-purple-500" /></div>
          <div><p className="text-2xl font-bold">{totalPages}</p><p className="text-xs text-muted-foreground">Сторінок</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground">Тип дії</label>
              <Select value={filters.action_type} onValueChange={v => { setFilters(f => ({ ...f, action_type: v === 'all' ? '' : v })); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="Всі" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі</SelectItem>
                  {Object.entries(ACTION_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[160px]">
              <label className="text-xs text-muted-foreground">Об'єкт</label>
              <Select value={filters.target_model} onValueChange={v => { setFilters(f => ({ ...f, target_model: v === 'all' ? '' : v })); setPage(1) }}>
                <SelectTrigger><SelectValue placeholder="Всі" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всі</SelectItem>
                  {Object.entries(MODEL_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Від</label>
              <Input type="date" value={filters.date_from} onChange={e => { setFilters(f => ({ ...f, date_from: e.target.value })); setPage(1) }} className="w-[150px]" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">До</label>
              <Input type="date" value={filters.date_to} onChange={e => { setFilters(f => ({ ...f, date_to: e.target.value })); setPage(1) }} className="w-[150px]" />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">Пошук</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }} placeholder="Пошук..." className="pl-8" />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Скинути</Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Час</TableHead>
                <TableHead>Користувач</TableHead>
                <TableHead>Дія</TableHead>
                <TableHead>Об'єкт</TableHead>
                <TableHead>IP-адреса</TableHead>
                <TableHead>Деталі</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.results && data.results.length > 0 ? (
                data.results.map(entry => {
                  const actionInfo = ACTION_TYPES[entry.action_type] || { label: entry.action_type_display || entry.action_type, color: 'bg-gray-100 text-gray-800' }
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">
                        <div>{new Date(entry.timestamp).toLocaleDateString('uk-UA')}</div>
                        <div className="text-muted-foreground">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: uk })}</div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{entry.user_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={actionInfo.color}>{actionInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.target_name && <div>{entry.target_name}</div>}
                        {entry.target_model && <div className="text-xs text-muted-foreground">{MODEL_LABELS[entry.target_model] || entry.target_model}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{entry.ip_address || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {entry.metadata && Object.keys(entry.metadata).length > 0
                          ? JSON.stringify(entry.metadata).slice(0, 60)
                          : '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Немає записів
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Сторінка {page} з {totalPages} (всього {data?.count})
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Назад</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Далі</Button>
          </div>
        </div>
      )}
    </div>
  )
}
