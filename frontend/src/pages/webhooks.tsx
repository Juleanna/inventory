import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { webhooksApi, WEBHOOK_EVENTS, type WebhookConfig, type WebhookLog } from '@/api/webhooks'
import { useAuthStore } from '@/stores/auth-store'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { ColumnVisibility } from '@/components/shared/column-visibility'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Webhook, Plus, Trash2, Pencil, Loader2, Send, CheckCircle, XCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'

const WEBHOOK_COLUMNS = [
  { key: 'name' as const, label: 'Назва' },
  { key: 'url' as const, label: 'URL' },
  { key: 'events' as const, label: 'Події' },
  { key: 'active' as const, label: 'Активний' },
]

export default function WebhooksPage() {
  const { allColumns, isColumnVisible, toggleColumn } = useColumnVisibility('webhooks-columns', WEBHOOK_COLUMNS)
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [logsWebhookId, setLogsWebhookId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhooksApi.list().then(r => r.data),
    enabled: isAuthenticated,
  })

  const { data: logsData } = useQuery({
    queryKey: ['webhook-logs', logsWebhookId],
    queryFn: () => webhooksApi.logs(logsWebhookId!).then(r => r.data),
    enabled: !!logsWebhookId,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<WebhookConfig>) => webhooksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setShowCreate(false)
      toast.success('Webhook створено')
    },
    onError: () => toast.error('Помилка створення'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<WebhookConfig> }) =>
      webhooksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setEditingWebhook(null)
      toast.success('Webhook оновлено')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => webhooksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      setDeleteId(null)
      toast.success('Webhook видалено')
    },
  })

  const testMutation = useMutation({
    mutationFn: (id: number) => webhooksApi.test(id),
    onSuccess: () => toast.success('Тестовий webhook надіслано'),
    onError: () => toast.error('Помилка тестування'),
  })

  const toggleActive = (wh: WebhookConfig) => {
    updateMutation.mutate({ id: wh.id, data: { active: !wh.active } })
  }

  const webhooks = data?.results || []

  return (
    <div>
      <PageHeader title="Вебхуки" description="Налаштування сповіщень для зовнішніх систем" />

      <div className="mb-4 flex gap-2">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Новий webhook
        </Button>
        <ColumnVisibility allColumns={allColumns} isColumnVisible={isColumnVisible} toggleColumn={toggleColumn} disabledColumns={['name']} />
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      ) : webhooks.length === 0 ? (
        <EmptyState
          icon={<Webhook className="h-12 w-12" />}
          title="Вебхуків немає"
          description="Додайте webhook для інтеграції із Slack, Teams або іншими системами"
          action={<Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Створити</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible('name') && <TableHead>Назва</TableHead>}
                  {isColumnVisible('url') && <TableHead>URL</TableHead>}
                  {isColumnVisible('events') && <TableHead>Події</TableHead>}
                  {isColumnVisible('active') && <TableHead>Активний</TableHead>}
                  <TableHead className="w-[180px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map(wh => (
                  <TableRow key={wh.id}>
                    {isColumnVisible('name') && <TableCell className="font-medium">{wh.name}</TableCell>}
                    {isColumnVisible('url') && <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{wh.url}</code>
                    </TableCell>}
                    {isColumnVisible('events') && <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {wh.events.slice(0, 2).map(e => (
                          <Badge key={e} variant="outline" className="text-xs">
                            {WEBHOOK_EVENTS.find(ev => ev.value === e)?.label || e}
                          </Badge>
                        ))}
                        {wh.events.length > 2 && (
                          <Badge variant="secondary" className="text-xs">+{wh.events.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>}
                    {isColumnVisible('active') && <TableCell>
                      <Switch checked={wh.active} onCheckedChange={() => toggleActive(wh)} />
                    </TableCell>}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => testMutation.mutate(wh.id)}
                          disabled={testMutation.isPending}
                          title="Тестувати"
                        >
                          {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setLogsWebhookId(wh.id)} title="Логи">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingWebhook(wh)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(wh.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <WebhookDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
      />
      {editingWebhook && (
        <WebhookDialog
          open={!!editingWebhook}
          onOpenChange={() => setEditingWebhook(null)}
          webhook={editingWebhook}
          onSave={(data) => updateMutation.mutate({ id: editingWebhook.id, data })}
          saving={updateMutation.isPending}
        />
      )}

      {/* Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити webhook?</AlertDialogTitle>
            <AlertDialogDescription>Цю дію неможливо скасувати.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logs Dialog */}
      <Dialog open={!!logsWebhookId} onOpenChange={() => setLogsWebhookId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Журнал доставки</DialogTitle>
          </DialogHeader>
          {logsData?.results?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Час</TableHead>
                  <TableHead>Подія</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Результат</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData.results.map((log: WebhookLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {new Date(log.sent_at).toLocaleString('uk-UA')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.event}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                        {log.response_status || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.success
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-destructive" />
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">Логів немає</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function WebhookDialog({ open, onOpenChange, webhook, onSave, saving }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  webhook?: WebhookConfig
  onSave: (data: Partial<WebhookConfig>) => void
  saving: boolean
}) {
  const [name, setName] = useState(webhook?.name || '')
  const [url, setUrl] = useState(webhook?.url || '')
  const [events, setEvents] = useState<string[]>(webhook?.events || [])
  const [secret, setSecret] = useState(webhook?.secret || '')

  const toggleEvent = (event: string) => {
    setEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event])
  }

  const handleSave = () => {
    if (!name.trim() || !url.trim() || events.length === 0) return
    onSave({ name, url, events, secret, active: true })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{webhook ? 'Редагувати webhook' : 'Новий webhook'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Назва</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Slack Notifications" />
          </div>
          <div>
            <Label>URL</Label>
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://hooks.slack.com/..." />
          </div>
          <div>
            <Label>Secret (опціонально)</Label>
            <Input value={secret} onChange={e => setSecret(e.target.value)} placeholder="Секретний ключ" type="password" />
          </div>
          <div>
            <Label className="mb-2 block">Події</Label>
            <div className="grid grid-cols-1 gap-2">
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={events.includes(ev.value)}
                    onCheckedChange={() => toggleEvent(ev.value)}
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || !url.trim() || events.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {webhook ? 'Зберегти' : 'Створити'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
