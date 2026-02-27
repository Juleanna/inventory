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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

  // Оновити форму коли профіль завантажено з API
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

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Профіль</CardTitle>
            <CardDescription>Ваші персональні дані</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ім'я</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Прізвище</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+380..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Мобільний телефон</Label>
                  <Input
                    value={form.mobile_phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, mobile_phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Про себе</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Ім'я користувача</Label>
                <Input value={user?.username || ''} disabled />
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Зберегти
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Робоча інформація</CardTitle>
            <CardDescription>Відділ, посада та розташування</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Відділ</Label>
                  <Select value={form.department} onValueChange={(v) => setForm((prev) => ({ ...prev, department: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть відділ" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Посада</Label>
                  <Select value={form.position} onValueChange={(v) => setForm((prev) => ({ ...prev, position: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть посаду" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Офіс / Локація</Label>
                  <Input
                    value={form.office_location}
                    onChange={(e) => setForm((prev) => ({ ...prev, office_location: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Номер кімнати</Label>
                  <Input
                    value={form.room_number}
                    onChange={(e) => setForm((prev) => ({ ...prev, room_number: e.target.value }))}
                  />
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Зберегти
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Зміна пароля
            </CardTitle>
            <CardDescription>Оновіть пароль для захисту облікового запису</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>Поточний пароль</Label>
                <Input
                  type="password"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, old_password: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Новий пароль</Label>
                  <Input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Підтвердження</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Змінити пароль
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Тема оформлення</CardTitle>
            <CardDescription>Оберіть тему для інтерфейсу</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {[
                { value: 'light' as const, label: 'Світла', icon: Sun },
                { value: 'dark' as const, label: 'Темна', icon: Moon },
                { value: 'system' as const, label: 'Системна', icon: Monitor },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={theme === option.value ? 'default' : 'outline'}
                  onClick={() => setTheme(option.value)}
                  className="flex-1"
                >
                  <option.icon className="mr-2 h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Двофакторна аутентифікація
            </CardTitle>
            <CardDescription>Додатковий рівень захисту вашого облікового запису</CardDescription>
          </CardHeader>
          <CardContent>
            {!twoFASetup ? (
              <Button onClick={handleSetup2FA} variant="outline">
                Налаштувати 2FA
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Скануйте QR-код за допомогою додатку аутентифікації (Google Authenticator, Authy тощо):
                </p>
                <div className="flex justify-center">
                  <img src={twoFASetup.qr_code} alt="2FA QR Code" className="h-48 w-48" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Або введіть ключ вручну: <code className="font-mono bg-muted px-1 rounded">{twoFASetup.secret}</code>
                </p>
                <Separator />
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-2">
                    <Label>Код підтвердження</Label>
                    <Input
                      value={twoFAToken}
                      onChange={(e) => setTwoFAToken(e.target.value)}
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>
                  <Button onClick={handleVerify2FA}>Підтвердити</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
