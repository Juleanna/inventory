import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Server, CheckCircle, RefreshCw, Plug, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/api/client'

interface LdapSettings {
  enabled: boolean
  server_url: string
  base_dn: string
  bind_dn: string
  bind_password: string
  user_search_base: string
  user_filter: string
  group_search_base: string
  sync_interval_hours: number
  field_mapping: Record<string, string>
}

const DEFAULT: LdapSettings = {
  enabled: false,
  server_url: '',
  base_dn: '',
  bind_dn: '',
  bind_password: '',
  user_search_base: '',
  user_filter: '(objectClass=person)',
  group_search_base: '',
  sync_interval_hours: 24,
  field_mapping: {
    sAMAccountName: 'username',
    givenName: 'first_name',
    sn: 'last_name',
    mail: 'email',
    department: 'department',
    title: 'position',
    telephoneNumber: 'phone',
  },
}

export function LdapSettings() {
  const [form, setForm] = useState<LdapSettings>(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/settings/ldap/')
      .then(r => setForm({ ...DEFAULT, ...r.data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put('/settings/ldap/', form)
      toast.success('Налаштування LDAP збережено')
    } catch {
      toast.error('Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const { data } = await apiClient.post('/settings/ldap/test/')
      if (data.success) {
        toast.success(data.message || "З'єднання успішне!")
      } else {
        toast.error(data.message || "Помилка з'єднання")
      }
    } catch {
      toast.error("Не вдалося з'єднатися з LDAP сервером")
    } finally {
      setTesting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const { data } = await apiClient.post('/settings/ldap/sync/')
      setSyncResult(data)
      toast.success(`Синхронізовано: створено ${data.created}, оновлено ${data.updated}`)
    } catch {
      toast.error('Помилка синхронізації')
    } finally {
      setSyncing(false)
    }
  }

  const updateMapping = (ldapField: string, userField: string) => {
    setForm(prev => ({
      ...prev,
      field_mapping: { ...prev.field_mapping, [ldapField]: userField },
    }))
  }

  const removeMapping = (ldapField: string) => {
    setForm(prev => {
      const mapping = { ...prev.field_mapping }
      delete mapping[ldapField]
      return { ...prev, field_mapping: mapping }
    })
  }

  const [newLdapField, setNewLdapField] = useState('')
  const [newUserField, setNewUserField] = useState('')

  const addMapping = () => {
    if (newLdapField && newUserField) {
      updateMapping(newLdapField, newUserField)
      setNewLdapField('')
      setNewUserField('')
    }
  }

  if (loading) return <Card><CardContent className="p-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          LDAP / Active Directory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Увімкнено</Label>
            <p className="text-xs text-muted-foreground">Синхронізація користувачів з LDAP/AD</p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={v => setForm(prev => ({ ...prev, enabled: v }))} />
        </div>

        <Separator />

        <div className="space-y-1">
          <Label className="text-xs">URL сервера</Label>
          <Input value={form.server_url} onChange={e => setForm(prev => ({ ...prev, server_url: e.target.value }))} placeholder="ldap://dc.example.com:389" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Base DN</Label>
            <Input value={form.base_dn} onChange={e => setForm(prev => ({ ...prev, base_dn: e.target.value }))} placeholder="DC=example,DC=com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">User Search Base</Label>
            <Input value={form.user_search_base} onChange={e => setForm(prev => ({ ...prev, user_search_base: e.target.value }))} placeholder="OU=Users,DC=example,DC=com" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Bind DN</Label>
            <Input value={form.bind_dn} onChange={e => setForm(prev => ({ ...prev, bind_dn: e.target.value }))} placeholder="CN=admin,DC=example,DC=com" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bind Password</Label>
            <Input type="password" value={form.bind_password} onChange={e => setForm(prev => ({ ...prev, bind_password: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">User Filter</Label>
            <Input value={form.user_filter} onChange={e => setForm(prev => ({ ...prev, user_filter: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Інтервал синхронізації (годин)</Label>
            <Input type="number" value={form.sync_interval_hours} onChange={e => setForm(prev => ({ ...prev, sync_interval_hours: Number(e.target.value) }))} />
          </div>
        </div>

        <Separator />

        <div>
          <Label className="text-sm font-medium mb-2 block">Маппінг полів</Label>
          <div className="space-y-2">
            {Object.entries(form.field_mapping).map(([ldapField, userField]) => (
              <div key={ldapField} className="flex items-center gap-2">
                <Input value={ldapField} disabled className="flex-1 text-xs" />
                <span className="text-muted-foreground text-xs">→</span>
                <Input value={userField} onChange={e => updateMapping(ldapField, e.target.value)} className="flex-1 text-xs" />
                <Button variant="ghost" size="sm" onClick={() => removeMapping(ldapField)} className="h-8 w-8 p-0 text-destructive">×</Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input value={newLdapField} onChange={e => setNewLdapField(e.target.value)} placeholder="LDAP поле" className="flex-1 text-xs" />
              <span className="text-muted-foreground text-xs">→</span>
              <Input value={newUserField} onChange={e => setNewUserField(e.target.value)} placeholder="Поле користувача" className="flex-1 text-xs" />
              <Button variant="outline" size="sm" onClick={addMapping} className="h-8">+</Button>
            </div>
          </div>
        </div>

        <Separator />

        {syncResult && (
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-medium">Результати синхронізації</p>
            <div className="flex gap-3 text-sm">
              <Badge variant="secondary" className="bg-green-100 text-green-800">Створено: {syncResult.created}</Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">Оновлено: {syncResult.updated}</Badge>
              {syncResult.errors.length > 0 && (
                <Badge variant="destructive">Помилок: {syncResult.errors.length}</Badge>
              )}
            </div>
            {syncResult.errors.length > 0 && (
              <div className="mt-2 text-xs text-destructive space-y-0.5">
                {syncResult.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Зберегти
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !form.server_url}>
            {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
            Тестувати
          </Button>
          <Button variant="outline" onClick={handleSync} disabled={syncing || !form.server_url}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Синхронізувати
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
