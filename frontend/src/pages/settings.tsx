import { useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useThemeStore } from '@/stores/theme-store'
import { useProfile } from '@/hooks/use-auth'
import { authApi } from '@/api/auth'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, Sun, Moon, Monitor, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  useProfile()
  const [saving, setSaving] = useState(false)
  const [twoFASetup, setTwoFASetup] = useState<{ qr_code: string; secret: string } | null>(null)
  const [twoFAToken, setTwoFAToken] = useState('')

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  })

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authApi.updateProfile(form)
      toast.success('Профіль оновлено')
    } catch {
      toast.error('Помилка оновлення профілю')
    } finally {
      setSaving(false)
    }
  }

  const handleSetup2FA = async () => {
    try {
      const response = await authApi.setup2FA()
      setTwoFASetup(response.data)
    } catch {
      toast.error('Помилка налаштування 2FA')
    }
  }

  const handleVerify2FA = async () => {
    try {
      await authApi.verify2FA(twoFAToken)
      toast.success('2FA успішно налаштовано')
      setTwoFASetup(null)
      setTwoFAToken('')
    } catch {
      toast.error('Невірний код')
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
