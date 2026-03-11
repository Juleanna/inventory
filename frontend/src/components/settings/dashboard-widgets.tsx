import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, LayoutGrid, ChevronUp, ChevronDown, RotateCcw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/api/client'

interface Widget {
  id: string
  type: string
  label: string
  description: string
  visible: boolean
  order: number
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: '1', type: 'equipment_stats', label: 'Статистика обладнання', description: 'Загальна кількість, стан, категорії', visible: true, order: 0 },
  { id: '2', type: 'financial_overview', label: 'Фінансовий огляд', description: 'Вартість, амортизація, витрати', visible: true, order: 1 },
  { id: '3', type: 'maintenance_alerts', label: 'Сповіщення ТО', description: 'Обладнання що потребує обслуговування', visible: true, order: 2 },
  { id: '4', type: 'warranty_alerts', label: 'Гарантійні попередження', description: 'Закінчення гарантійних термінів', visible: true, order: 3 },
  { id: '5', type: 'recent_activity', label: 'Остання активність', description: 'Останні дії в системі', visible: true, order: 4 },
  { id: '6', type: 'location_stats', label: 'Статистика локацій', description: 'Розподіл обладнання по локаціях', visible: true, order: 5 },
  { id: '7', type: 'department_stats', label: 'Статистика відділів', description: 'Обладнання по відділах', visible: true, order: 6 },
  { id: '8', type: 'age_distribution', label: 'Розподіл за віком', description: 'Вік обладнання', visible: false, order: 7 },
  { id: '9', type: 'spare_parts_alerts', label: 'Запчастини', description: 'Низький запас, замовлення', visible: false, order: 8 },
  { id: '10', type: 'quick_actions', label: 'Швидкі дії', description: 'Часті операції одним кліком', visible: true, order: 9 },
]

export function DashboardWidgets() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/dashboard/widgets/')
      .then(r => {
        if (r.data && Array.isArray(r.data) && r.data.length > 0) {
          setWidgets(r.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const moveUp = (index: number) => {
    if (index <= 0) return
    const updated = [...widgets]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    updated.forEach((w, i) => w.order = i)
    setWidgets(updated)
  }

  const moveDown = (index: number) => {
    if (index >= widgets.length - 1) return
    const updated = [...widgets]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    updated.forEach((w, i) => w.order = i)
    setWidgets(updated)
  }

  const toggleVisible = (index: number) => {
    const updated = [...widgets]
    updated[index] = { ...updated[index], visible: !updated[index].visible }
    setWidgets(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put('/dashboard/widgets/', widgets)
      toast.success('Віджети збережено')
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setWidgets(DEFAULT_WIDGETS)
    toast.info('Скинуто до стандартних')
  }

  if (loading) return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          Віджети дашборду
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Налаштуйте видимість та порядок віджетів на головному дашборді
        </p>

        <Separator />

        <div className="space-y-1">
          {widgets.sort((a, b) => a.order - b.order).map((widget, index) => (
            <div
              key={widget.id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                widget.visible ? 'bg-card' : 'bg-muted/50 opacity-60'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveUp(index)} disabled={index === 0}>
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => moveDown(index)} disabled={index === widgets.length - 1}>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{widget.label}</p>
                <p className="text-xs text-muted-foreground truncate">{widget.description}</p>
              </div>
              <Switch checked={widget.visible} onCheckedChange={() => toggleVisible(index)} />
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Зберегти
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Скинути
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
