import { useState } from 'react'
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-notifications'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bell, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NOTIFICATION_TYPE_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/constants'

const typeIcons: Record<string, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
  SUCCESS: CheckCheck,
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<string>('all')
  const [page, setPage] = useState(1)
  const readFilter = tab === 'unread' ? false : tab === 'read' ? true : undefined
  const { data, isLoading } = useNotifications({ page, read: readFilter })
  const markRead = useMarkNotificationsRead()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  const handleMarkAllRead = () => {
    if (data?.results) {
      const unreadIds = data.results.filter((n) => !n.read).map((n) => n.id)
      if (unreadIds.length) markRead.mutate(unreadIds)
    }
  }

  return (
    <div>
      <PageHeader
        title="Сповіщення"
        description={`Всього: ${data?.count || 0}`}
        actions={
          <Button variant="outline" onClick={handleMarkAllRead} disabled={markRead.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Прочитати всі
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => { setTab(v); setPage(1) }} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">Всі</TabsTrigger>
          <TabsTrigger value="unread">Непрочитані</TabsTrigger>
          <TabsTrigger value="read">Прочитані</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="Сповіщень немає"
          description="Тут будуть відображатися ваші сповіщення"
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.results.map((notification) => {
              const Icon = typeIcons[notification.notification_type] || Info

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    'transition-colors',
                    !notification.read && 'border-l-4 border-l-primary bg-primary/5'
                  )}
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{notification.title}</span>
                        <Badge variant="secondary" className={cn('text-xs', PRIORITY_COLORS[notification.priority])}>
                          {PRIORITY_LABELS[notification.priority] || notification.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('uk-UA')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {NOTIFICATION_TYPE_LABELS[notification.notification_type] || notification.notification_type}
                        </Badge>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => markRead.mutate([notification.id])}
                          >
                            Прочитано
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Сторінка {page} з {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Попередня</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Наступна</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
