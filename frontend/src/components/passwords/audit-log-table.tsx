import { useState } from 'react'
import { usePasswordAuditLogs } from '@/hooks/use-passwords'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ClipboardList } from 'lucide-react'
import { PASSWORD_ACTION_LABELS } from '@/lib/constants'

const ACTION_COLORS: Record<string, string> = {
  view: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  edit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  generate: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export function AuditLogTable() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<string>('')

  const { data, isLoading } = usePasswordAuditLogs({
    page,
    action: actionFilter || undefined,
  })

  const totalPages = data ? Math.ceil(data.count / 25) : 0

  if (isLoading) return <LoadingSpinner size="lg" />

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Фільтр за дією" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі дії</SelectItem>
            {Object.entries(PASSWORD_ACTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!data?.results?.length ? (
        <EmptyState
          icon={<ClipboardList className="h-12 w-12" />}
          title="Журнал порожній"
          description="Поки що немає записів про доступ до паролів"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Користувач</TableHead>
                  <TableHead>Система</TableHead>
                  <TableHead>Обліковий запис</TableHead>
                  <TableHead>Дія</TableHead>
                  <TableHead className="hidden lg:table-cell">IP-адреса</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(log.timestamp).toLocaleString('uk-UA')}
                    </TableCell>
                    <TableCell className="font-medium">{log.user_name}</TableCell>
                    <TableCell>{log.system_name}</TableCell>
                    <TableCell>{log.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ACTION_COLORS[log.action] || ''}>
                        {log.action_display || PASSWORD_ACTION_LABELS[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground">
                      {log.ip_address || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Сторінка <span className="font-medium text-foreground">{page}</span> з <span className="font-medium text-foreground">{totalPages}</span>
              </p>
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
