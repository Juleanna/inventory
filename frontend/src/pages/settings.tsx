import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { useProfile } from '@/hooks/use-auth'
import { authApi } from '@/api/auth'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Loader2, Sun, Moon, Monitor, ShieldCheck, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { DEPARTMENT_LABELS, POSITION_LABELS } from '@/lib/constants'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const { data: profile } = useProfile()
  const [saving, setSaving] = useState(false)
  const [twoFASetup, setTwoFASetup] = useState<{ qr_code: string; secret: string } | null>(null)
  const [twoFAToken, setTwoFAToken] = useState('')

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    mobile_phone: '',
    bio: '',
    department: '',
    position: '',
    office_location: '',
    room_number: '',
  })

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        mobile_phone: profile.mobile_phone || '',
        bio: profile.bio || '',
        department: profile.department || '',
        position: profile.position || '',
        office_location: profile.office_location || '',
        room_number: profile.room_number || '',
      })
    }
  }, [profile])

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [changingPassword, setChangingPassword] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await authApi.updateProfile(form)
      setUser(response.data)
      toast.success('Профіль оновлено')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Помилка оновлення профілю'))
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Паролі не співпадають')
      return
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Мінімальна довжина пароля — 8 символів')
      return
    }

    setChangingPassword(true)
    try {
      await authApi.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Пароль успішно змінено')
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Помилка зміни пароля'))
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSetup2FA = async () => {
    try {
      const response = await authApi.setup2FA()
      setTwoFASetup(response.data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Помилка налаштування 2FA'))
    }
  }

  const handleVerify2FA = async () => {
    try {
      await authApi.verify2FA(twoFAToken)
      toast.success('2FA успішно налаштовано')
      setTwoFASetup(null)
      setTwoFAToken('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Невірний код'))
    }
  }

  return (
    <div>
      <PageHeader title="Налаштування" description="Управління профілем та налаштуваннями" />

      <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
        {/* Left column: Profile + Work info combined */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Профіль та робоча інформація</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ім'я</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Прізвище</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ім'я користувача</Label>
                  <Input value={user?.username || ''} disabled />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Телефон</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+380..."
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Мобільний</Label>
                  <Input
                    value={form.mobile_phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, mobile_phone: e.target.value }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Відділ</Label>
                  <Select value={form.department} onValueChange={(v) => setForm((prev) => ({ ...prev, department: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Посада</Label>
                  <Select value={form.position} onValueChange={(v) => setForm((prev) => ({ ...prev, position: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Офіс / Локація</Label>
                  <Input
                    value={form.office_location}
                    onChange={(e) => setForm((prev) => ({ ...prev, office_location: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Кімната</Label>
                  <Input
                    value={form.room_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, room_number: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Про себе</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={2}
                />
              </div>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Зберегти профіль
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right column: Password, Theme, 2FA */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Зміна пароля
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Поточний пароль</Label>
                  <Input
                    type="password"
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Новий пароль</Label>
                  <Input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Підтвердження</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" size="sm" disabled={changingPassword}>
                  {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Змінити пароль
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Тема оформлення</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { value: 'light' as const, label: 'Світла', icon: Sun },
                  { value: 'dark' as const, label: 'Темна', icon: Moon },
                  { value: 'system' as const, label: 'Системна', icon: Monitor },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={theme === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme(option.value)}
                    className="flex-1"
                  >
                    <option.icon className="mr-1.5 h-3.5 w-3.5" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                2FA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!twoFASetup ? (
                <Button onClick={handleSetup2FA} variant="outline" size="sm">
                  Налаштувати 2FA
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Скануйте QR-код додатком аутентифікації:
                  </p>
                  <div className="flex justify-center">
                    <img src={twoFASetup.qr_code} alt="2FA QR Code" className="h-36 w-36" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Ключ: <code className="font-mono bg-muted px-1 rounded text-[10px]">{twoFASetup.secret}</code>
                  </p>
                  <Separator />
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Код підтвердження</Label>
                      <Input
                        value={twoFAToken}
                        onChange={(e) => setTwoFAToken(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                      />
                    </div>
                    <Button onClick={handleVerify2FA} size="sm">Підтвердити</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
