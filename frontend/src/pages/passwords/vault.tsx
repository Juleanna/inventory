import { useState } from 'react'
import { usePasswordSystems, usePasswordAccounts, useCreatePasswordSystem, useCreatePasswordAccount, useDeletePasswordAccount } from '@/hooks/use-passwords'
import { useDebounce } from '@/hooks/use-debounce'
import type { PasswordSystem } from '@/types'
import { passwordsApi } from '@/api/passwords'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KeyRound, Plus, Copy, Eye, EyeOff, Trash2, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { SYSTEM_TYPE_LABELS, CRITICALITY_LABELS, ACCOUNT_TYPE_LABELS, ACCOUNT_STATUS_LABELS } from '@/lib/constants'

export default function PasswordVaultPage() {
  const [search, setSearch] = useState('')
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState<Record<number, string>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [addSystemOpen, setAddSystemOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [newAccount, setNewAccount] = useState({ system: 0, username: '', password: '', notes: '', account_type: 'user', email: '', description: '', status: 'active', password_expires: '' })
  const [newSystem, setNewSystem] = useState({ name: '', url: '', description: '', system_type: 'web', ip_address: '', port: '', criticality: 'medium' })

  const debouncedSearch = useDebounce(search)
  const { data: systems, isLoading: loadingSystems } = usePasswordSystems({
    search: debouncedSearch || undefined,
  })
  const { data: accounts, isLoading: loadingAccounts } = usePasswordAccounts(
    selectedSystem ? { system: selectedSystem } : undefined
  )
  const createSystem = useCreatePasswordSystem()
  const createAccount = useCreatePasswordAccount()
  const deleteAccount = useDeletePasswordAccount()

  const handleShowPassword = async (accountId: number) => {
    if (showPassword[accountId]) {
      setShowPassword((prev) => {
        const next = { ...prev }
        delete next[accountId]
        return next
      })
      return
    }
    try {
      const response = await passwordsApi.getDecryptedPassword(accountId)
      setShowPassword((prev) => ({ ...prev, [accountId]: response.data.password }))
      setTimeout(() => {
        setShowPassword((prev) => {
          const next = { ...prev }
          delete next[accountId]
          return next
        })
      }, 30000)
    } catch {
      toast.error('Помилка отримання пароля')
    }
  }

  const handleCopyPassword = async (accountId: number) => {
    try {
      const response = await passwordsApi.getDecryptedPassword(accountId)
      await navigator.clipboard.writeText(response.data.password)
      toast.success('Пароль скопійовано')
    } catch {
      toast.error('Помилка копіювання')
    }
  }

  const handleAddSystem = (e: React.FormEvent) => {
    e.preventDefault()
    const systemData: Record<string, unknown> = {
      name: newSystem.name,
      system_type: newSystem.system_type,
      criticality: newSystem.criticality,
    }
    if (newSystem.url) systemData.url = newSystem.url
    if (newSystem.description) systemData.description = newSystem.description
    if (newSystem.ip_address) systemData.ip_address = newSystem.ip_address
    if (newSystem.port) systemData.port = Number(newSystem.port)
    createSystem.mutate(systemData as Partial<PasswordSystem>, {
      onSuccess: () => {
        setAddSystemOpen(false)
        setNewSystem({ name: '', url: '', description: '', system_type: 'web', ip_address: '', port: '', criticality: 'medium' })
      },
    })
  }

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    const accountData: Record<string, unknown> = {
      system: newAccount.system,
      username: newAccount.username,
      password: newAccount.password,
      account_type: newAccount.account_type,
      status: newAccount.status,
    }
    if (newAccount.notes) accountData.notes = newAccount.notes
    if (newAccount.email) accountData.email = newAccount.email
    if (newAccount.description) accountData.description = newAccount.description
    if (newAccount.password_expires) accountData.password_expires = newAccount.password_expires
    createAccount.mutate(accountData as typeof newAccount, {
      onSuccess: () => {
        setAddOpen(false)
        setNewAccount({ system: 0, username: '', password: '', notes: '', account_type: 'user', email: '', description: '', status: 'active', password_expires: '' })
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Менеджер паролів"
        description="Безпечне зберігання облікових даних"
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук систем..."
          className="sm:w-72"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Системи</h3>
            <Button size="sm" variant="outline" onClick={() => setAddSystemOpen(true)}>
              <Plus className="mr-2 h-3 w-3" />
              Додати
            </Button>
          </div>
          {loadingSystems ? (
            <LoadingSpinner size="sm" />
          ) : !systems?.results?.length ? (
            <EmptyState icon={<KeyRound className="h-8 w-8" />} title="Систем не знайдено" />
          ) : (
            <div className="space-y-2">
              {systems.results.map((system) => (
                <Card
                  key={system.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${selectedSystem === system.id ? 'border-primary bg-accent' : ''}`}
                  onClick={() => setSelectedSystem(system.id)}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{system.name}</p>
                      {system.url && <p className="text-xs text-muted-foreground truncate">{system.url}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">Облікові записи</h3>
            {selectedSystem && (
              <Button size="sm" onClick={() => { setNewAccount((prev) => ({ ...prev, system: selectedSystem })); setAddOpen(true) }}>
                <Plus className="mr-2 h-3 w-3" />
                Додати
              </Button>
            )}
          </div>

          {!selectedSystem ? (
            <EmptyState
              icon={<KeyRound className="h-8 w-8" />}
              title="Оберіть систему"
              description="Оберіть систему зліва для перегляду облікових записів"
            />
          ) : loadingAccounts ? (
            <LoadingSpinner size="sm" />
          ) : !accounts?.results?.length ? (
            <EmptyState
              icon={<KeyRound className="h-8 w-8" />}
              title="Облікових записів немає"
              action={
                <Button size="sm" onClick={() => { setNewAccount((prev) => ({ ...prev, system: selectedSystem })); setAddOpen(true) }}>
                  <Plus className="mr-2 h-3 w-3" />
                  Додати
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {accounts.results.map((account) => (
                <Card key={account.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{account.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-sm">
                          {showPassword[account.id] || '••••••••••'}
                        </span>
                      </div>
                      {account.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{account.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleShowPassword(account.id)}
                        title="Показати пароль"
                      >
                        {showPassword[account.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleCopyPassword(account.id)}
                        title="Копіювати пароль"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(account.id)}
                        title="Видалити"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Додати обліковий запис</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>Ім'я користувача</Label>
              <Input
                value={newAccount.username}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input
                type="password"
                value={newAccount.password}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Тип облікового запису</Label>
              <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount((prev) => ({ ...prev, account_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newAccount.email}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Опис / Призначення</Label>
              <Textarea
                value={newAccount.description}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={newAccount.status} onValueChange={(value) => setNewAccount((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Дійсний до</Label>
              <Input
                type="date"
                value={newAccount.password_expires}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, password_expires: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Нотатки</Label>
              <Textarea
                value={newAccount.notes}
                onChange={(e) => setNewAccount((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Додати
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addSystemOpen} onOpenChange={setAddSystemOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Додати систему</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSystem} className="space-y-4">
            <div className="space-y-2">
              <Label>Назва *</Label>
              <Input
                value={newSystem.name}
                onChange={(e) => setNewSystem((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Наприклад: Gmail, AWS, GitHub"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Тип системи</Label>
              <Select value={newSystem.system_type} onValueChange={(value) => setNewSystem((prev) => ({ ...prev, system_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SYSTEM_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={newSystem.url}
                onChange={(e) => setNewSystem((prev) => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>IP адреса</Label>
              <Input
                value={newSystem.ip_address}
                onChange={(e) => setNewSystem((prev) => ({ ...prev, ip_address: e.target.value }))}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Порт</Label>
              <Input
                type="number"
                value={newSystem.port}
                onChange={(e) => setNewSystem((prev) => ({ ...prev, port: e.target.value }))}
                placeholder="8080"
              />
            </div>
            <div className="space-y-2">
              <Label>Критичність</Label>
              <Select value={newSystem.criticality} onValueChange={(value) => setNewSystem((prev) => ({ ...prev, criticality: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRITICALITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Опис</Label>
              <Textarea
                value={newSystem.description}
                onChange={(e) => setNewSystem((prev) => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddSystemOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={createSystem.isPending}>
                {createSystem.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Додати
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити обліковий запис?"
        description="Обліковий запис буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteAccount.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />
    </div>
  )
}
