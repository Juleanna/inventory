import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, Mail, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/api/client'

interface EmailSettings {
  enabled: boolean
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  smtp_use_tls: boolean
  from_email: string
  from_name: string
}

const PRESETS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, tls: true },
  { name: 'Outlook', host: 'smtp.office365.com', port: 587, tls: true },
  { name: 'Ukr.net', host: 'smtp.ukr.net', port: 465, tls: true },
]

const DEFAULT: EmailSettings = {
  enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  smtp_use_tls: true,
  from_email: '',
  from_name: 'IT Inventory',
}

export function EmailSettings() {
  const [form, setForm] = useState<EmailSettings>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/settings/email/')
      .then(r => setForm({ ...DEFAULT, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put('/settings/email/', form)
      toast.success('Налаштування email збережено')
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const { data } = await apiClient.post('/settings/email/test/')
      if (data.success) {
        toast.success('Тестовий лист відправлено!')
      } else {
        toast.error(data.message || 'Помилка відправки')
      }
    } catch {
      toast.error('Помилка відправки тестового листа')
    } finally {
      setTesting(false)
    }
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setForm(prev => ({
      ...prev,
      smtp_host: preset.host,
      smtp_port: preset.port,
      smtp_use_tls: preset.tls,
    }))
  }

  if (loading) return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Налаштування Email
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Увімкнено</Label>
            <p className="text-xs text-muted-foreground">Відправка email сповіщень</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={v => setForm(prev => ({ ...prev, enabled: v }))} />
        </div>

        <Separator />

        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Швидке налаштування</Label>
          <div className="flex gap-2">
            {PRESETS.map(p => (
              <Button key={p.name} variant="outline" size="sm" onClick={() => applyPreset(p)}>
                {p.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">SMTP Сервер</Label>
            <Input value={form.smtp_host} onChange={e => setForm(prev => ({ ...prev, smtp_host: e.target.value }))} placeholder="smtp.gmail.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Порт</Label>
            <Input type="number" value={form.smtp_port} onChange={e => setForm(prev => ({ ...prev, smtp_port: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Користувач SMTP</Label>
            <Input value={form.smtp_user} onChange={e => setForm(prev => ({ ...prev, smtp_user: e.target.value }))} placeholder="user@gmail.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Пароль SMTP</Label>
            <Input type="password" value={form.smtp_password} onChange={e => setForm(prev => ({ ...prev, smtp_password: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={form.smtp_use_tls} onCheckedChange={v => setForm(prev => ({ ...prev, smtp_use_tls: v }))} />
          <Label className="text-sm">Використовувати TLS</Label>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Email відправника</Label>
            <Input value={form.from_email} onChange={e => setForm(prev => ({ ...prev, from_email: e.target.value }))} placeholder="noreply@company.com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ім'я відправника</Label>
            <Input value={form.from_name} onChange={e => setForm(prev => ({ ...prev, from_name: e.target.value }))} />
          </div>
        </div>

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Зберегти
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !form.smtp_host}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Тестовий лист
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
