import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { automationApi, TRIGGER_TYPES, ACTION_TYPES, type AutomationRule } from '@/api/automation'
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
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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
import { Zap, Plus, Play, Trash2, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const AUTOMATION_COLUMNS = [
  { key: 'name' as const, label: 'Назва' },
  { key: 'trigger' as const, label: 'Тригер' },
  { key: 'actions' as const, label: 'Дії' },
  { key: 'runCount' as const, label: 'Запусків' },
  { key: 'active' as const, label: 'Активне' },
]

export default function AutomationRulesPage() {
  const { allColumns, isColumnVisible, toggleColumn } = useColumnVisibility('automation-rules-columns', AUTOMATION_COLUMNS)
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => automationApi.list().then(r => r.data),
    enabled: isAuthenticated,
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<AutomationRule>) => automationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      setShowCreate(false)
      toast.success('Правило створено')
    },
    onError: () => toast.error('Помилка створення'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AutomationRule> }) =>
      automationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      setEditingRule(null)
      toast.success('Правило оновлено')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => automationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      setDeleteId(null)
      toast.success('Правило видалено')
    },
  })

  const runMutation = useMutation({
    mutationFn: (id: number) => automationApi.run(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
      toast.success('Правило виконано')
    },
    onError: () => toast.error('Помилка виконання'),
  })

  const toggleActive = (rule: AutomationRule) => {
    updateMutation.mutate({ id: rule.id, data: { active: !rule.active } })
  }

  const rules = data?.results || []

  return (
    <div>
      <PageHeader
        title="Автоматизація"
        description="Правила автоматичної обробки обладнання"
      />

      <div className="mb-4 flex gap-2">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Нове правило
        </Button>
        <ColumnVisibility allColumns={allColumns} isColumnVisible={isColumnVisible} toggleColumn={toggleColumn} disabledColumns={['name']} />
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      ) : rules.length === 0 ? (
        <EmptyState
          icon={<Zap className="h-12 w-12" />}
          title="Правил немає"
          description="Створіть правило для автоматичної обробки"
          action={<Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" /> Створити</Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {isColumnVisible('name') && <TableHead>Назва</TableHead>}
                  {isColumnVisible('trigger') && <TableHead>Тригер</TableHead>}
                  {isColumnVisible('actions') && <TableHead>Дії</TableHead>}
                  {isColumnVisible('runCount') && <TableHead>Запусків</TableHead>}
                  {isColumnVisible('active') && <TableHead>Активне</TableHead>}
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map(rule => (
                  <TableRow key={rule.id}>
                    {isColumnVisible('name') && <TableCell>
                      <div>
                        <p className="font-medium">{rule.name}</p>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{rule.description}</p>
                        )}
                      </div>
                    </TableCell>}
                    {isColumnVisible('trigger') && <TableCell>
                      <Badge variant="secondary">
                        {TRIGGER_TYPES.find(t => t.value === rule.trigger_type)?.label || rule.trigger_type}
                      </Badge>
                    </TableCell>}
                    {isColumnVisible('actions') && <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {rule.actions.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {ACTION_TYPES.find(t => t.value === a.type)?.label || a.type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>}
                    {isColumnVisible('runCount') && <TableCell>{rule.run_count}</TableCell>}
                    {isColumnVisible('active') && <TableCell>
                      <Switch checked={rule.active} onCheckedChange={() => toggleActive(rule)} />
                    </TableCell>}
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => runMutation.mutate(rule.id)}
                          disabled={runMutation.isPending}
                          title="Запустити"
                        >
                          {runMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingRule(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(rule.id)}>
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

      {/* Create Dialog */}
      <RuleDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSave={(data) => createMutation.mutate(data)}
        saving={createMutation.isPending}
      />

      {/* Edit Dialog */}
      {editingRule && (
        <RuleDialog
          open={!!editingRule}
          onOpenChange={() => setEditingRule(null)}
          rule={editingRule}
          onSave={(data) => updateMutation.mutate({ id: editingRule.id, data })}
          saving={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити правило?</AlertDialogTitle>
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
    </div>
  )
}

function RuleDialog({ open, onOpenChange, rule, onSave, saving }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: AutomationRule
  onSave: (data: Partial<AutomationRule>) => void
  saving: boolean
}) {
  const [name, setName] = useState(rule?.name || '')
  const [description, setDescription] = useState(rule?.description || '')
  const [triggerType, setTriggerType] = useState(rule?.trigger_type || 'EQUIPMENT_AGE')
  const [conditionField, setConditionField] = useState('')
  const [conditionValue, setConditionValue] = useState('')
  const [actionType, setActionType] = useState('SEND_NOTIFICATION')

  const handleSave = () => {
    if (!name.trim()) return
    onSave({
      name,
      description,
      trigger_type: triggerType,
      conditions: conditionField ? { field: conditionField, value: conditionValue } : {},
      actions: [{ type: actionType, params: {} }],
      active: true,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? 'Редагувати правило' : 'Нове правило'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Назва</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Назва правила" />
          </div>
          <div>
            <Label>Опис</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Опис" rows={2} />
          </div>
          <div>
            <Label>Тип тригера</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Поле умови</Label>
              <Input value={conditionField} onChange={e => setConditionField(e.target.value)} placeholder="напр. age_years" />
            </div>
            <div>
              <Label>Значення</Label>
              <Input value={conditionValue} onChange={e => setConditionValue(e.target.value)} placeholder="напр. 5" />
            </div>
          </div>
          <div>
            <Label>Дія</Label>
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {rule ? 'Зберегти' : 'Створити'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
