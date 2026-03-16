import { useState } from 'react'
import { analyticsApi } from '@/api/analytics'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { CATEGORY_LABELS, STATUS_LABELS, DEPARTMENT_LABELS } from '@/lib/constants'

export function ReportsSection() {
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({
    type: 'inventory',
    format: 'excel',
    date_from: '',
    date_to: '',
    department: '',
    category: '',
    status: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const params: Record<string, string> = {
        type: form.type,
        format: form.format,
      }
      if (form.date_from) params.date_from = form.date_from
      if (form.date_to) params.date_to = form.date_to
      if (form.department && form.department !== '_all') params.department = form.department
      if (form.category && form.category !== '_all') params.category = form.category
      if (form.status && form.status !== '_all') params.status = form.status

      const response = await analyticsApi.generateExportReport(params as { type: string; format: string; date_from?: string; date_to?: string; department?: string; category?: string; status?: string })
      const ext = form.format === 'excel' ? 'xlsx' : 'pdf'
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `report_${form.type}.${ext}`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Звіт згенеровано')
    } catch {
      toast.error('Помилка генерації звіту')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">Генерація звітів</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Тип звіту</Label>
            <Select value={form.type} onValueChange={(v) => update('type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inventory">Інвентаризація</SelectItem>
                <SelectItem value="financial">Фінансовий</SelectItem>
                <SelectItem value="maintenance">Обслуговування</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Формат</Label>
            <Select value={form.format} onValueChange={(v) => update('format', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">
                  <span className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</span>
                </SelectItem>
                <SelectItem value="pdf">
                  <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> PDF</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Дата від</Label>
            <Input type="date" value={form.date_from} onChange={(e) => update('date_from', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Дата до</Label>
            <Input type="date" value={form.date_to} onChange={(e) => update('date_to', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Відділ</Label>
            <Select value={form.department} onValueChange={(v) => update('department', v)}>
              <SelectTrigger><SelectValue placeholder="Всі" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Всі</SelectItem>
                {Object.entries(DEPARTMENT_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Категорія</Label>
            <Select value={form.category} onValueChange={(v) => update('category', v)}>
              <SelectTrigger><SelectValue placeholder="Всі" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Всі</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={form.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger><SelectValue placeholder="Всі" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Всі</SelectItem>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={generating} className="w-full">
          {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Згенерувати звіт
        </Button>
      </CardContent>
    </Card>
  )
}
