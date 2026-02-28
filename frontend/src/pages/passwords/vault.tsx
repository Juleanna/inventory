import { useState } from 'react'
import { usePasswordSystems, usePasswordAccounts, useCreatePasswordSystem, useUpdatePasswordSystem, useDeletePasswordSystem, useCreatePasswordAccount, useUpdatePasswordAccount, useDeletePasswordAccount } from '@/hooks/use-passwords'
import { useUsersList } from '@/hooks/use-users'
import { useDebounce } from '@/hooks/use-debounce'
import type { PasswordSystem, PasswordAccount } from '@/types'
import { passwordsApi } from '@/api/passwords'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogTable } from '@/components/passwords/audit-log-table'
import { KeyRound, Plus, Copy, Eye, EyeOff, Trash2, Globe, Loader2, Pencil, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { SYSTEM_TYPE_LABELS, CRITICALITY_LABELS, ACCOUNT_TYPE_LABELS, ACCOUNT_STATUS_LABELS } from '@/lib/constants'

const emptySystem = { name: '', url: '', description: '', system_type: 'web', ip_address: '', port: '', criticality: 'medium' }
const emptyAccount = { system: 0, username: '', password: '', notes: '', account_type: 'user', email: '', description: '', status: 'active', password_expires: '', assigned_to: '' }

export default function PasswordVaultPage() {
  const [search, setSearch] = useState('')
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState<Record<number, string>>({})

  // System dialogs
  const [systemDialogOpen, setSystemDialogOpen] = useState(false)
  const [editSystemId, setEditSystemId] = useState<number | null>(null)
  const [systemForm, setSystemForm] = useState(emptySystem)
  const [deleteSystemId, setDeleteSystemId] = useState<number | null>(null)

  // Account dialogs
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [editAccountId, setEditAccountId] = useState<number | null>(null)
  const [accountForm, setAccountForm] = useState(emptyAccount)
  const [deleteAccountId, setDeleteAccountId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search)
  const { data: systems, isLoading: loadingSystems } = usePasswordSystems({
    search: debouncedSearch || undefined,
  })
  const { data: accounts, isLoading: loadingAccounts } = usePasswordAccounts(
    selectedSystem ? { system: selectedSystem } : undefined
  )
  const { data: users } = useUsersList()
  const createSystem = useCreatePasswordSystem()
  const updateSystem = useUpdatePasswordSystem()
  const deleteSystem = useDeletePasswordSystem()
  const createAccount = useCreatePasswordAccount()
  const updateAccount = useUpdatePasswordAccount()
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

  // -- System CRUD --
  const openAddSystem = () => {
    setEditSystemId(null)
    setSystemForm(emptySystem)
    setSystemDialogOpen(true)
  }

  const openEditSystem = (system: PasswordSystem) => {
    setEditSystemId(system.id)
    setSystemForm({
      name: system.name || '',
      url: system.url || '',
      description: system.description || '',
      system_type: system.system_type || 'web',
      ip_address: system.ip_address || '',
      port: system.port ? String(system.port) : '',
      criticality: system.criticality || 'medium',
    })
    setSystemDialogOpen(true)
  }

  const handleSubmitSystem = (e: React.FormEvent) => {
    e.preventDefault()
    const data: Record<string, unknown> = {
      name: systemForm.name,
      system_type: systemForm.system_type,
      criticality: systemForm.criticality,
    }
    if (systemForm.url) data.url = systemForm.url
    if (systemForm.description) data.description = systemForm.description
    if (systemForm.ip_address) data.ip_address = systemForm.ip_address
    if (systemForm.port) data.port = Number(systemForm.port)

    if (editSystemId) {
      updateSystem.mutate(
        { id: editSystemId, data: data as Partial<PasswordSystem> },
        { onSuccess: () => { setSystemDialogOpen(false) } }
      )
    } else {
      createSystem.mutate(data as Partial<PasswordSystem>, {
        onSuccess: () => {
          setSystemDialogOpen(false)
          setSystemForm(emptySystem)
        },
      })
    }
  }

  // -- Account CRUD --
  const openAddAccount = () => {
    if (!selectedSystem) return
    setEditAccountId(null)
    setAccountForm({ ...emptyAccount, system: selectedSystem })
    setAccountDialogOpen(true)
  }

  const openEditAccount = (account: PasswordAccount) => {
    setEditAccountId(account.id)
    setAccountForm({
      system: account.system,
      username: account.username || '',
      password: '',
      notes: account.notes || '',
      account_type: account.account_type || 'user',
      email: account.email || '',
      description: account.description || '',
      status: account.status || 'active',
      password_expires: account.password_expires || '',
      assigned_to: account.assigned_to ? String(account.assigned_to) : '',
    })
    setAccountDialogOpen(true)
  }

  const handleSubmitAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountForm.assigned_to) {
      toast.error('Оберіть користувача')
      return
    }
    const data: Record<string, unknown> = {
      system: accountForm.system,
      username: accountForm.username,
      account_type: accountForm.account_type,
      status: accountForm.status,
      assigned_to: Number(accountForm.assigned_to),
    }
    if (accountForm.password) data.new_password = accountForm.password
    if (accountForm.notes) data.notes = accountForm.notes
    if (accountForm.email) data.email = accountForm.email
    if (accountForm.description) data.description = accountForm.description
    if (accountForm.password_expires) data.password_expires = accountForm.password_expires

    if (editAccountId) {
      updateAccount.mutate(
        { id: editAccountId, data: data as Partial<PasswordAccount> },
        { onSuccess: () => { setAccountDialogOpen(false) } }
      )
    } else {
      if (!accountForm.password) {
        toast.error('Пароль обов\'язковий')
        return
      }
      data.new_password = accountForm.password
      createAccount.mutate(data as Partial<PasswordAccount>, {
        onSuccess: () => {
          setAccountDialogOpen(false)
          setAccountForm(emptyAccount)
        },
      })
    }
  }

  const isSystemPending = createSystem.isPending || updateSystem.isPending
  const isAccountPending = createAccount.isPending || updateAccount.isPending

  return (
    <div>
      <PageHeader
        title="Менеджер паролів"
        description="Безпечне зберігання облікових даних"
      />

      <Tabs defaultValue="vault" className="mt-2">
        <TabsList>
          <TabsTrigger value="vault">Сховище</TabsTrigger>
          <TabsTrigger value="audit">Журнал доступу</TabsTrigger>
        </TabsList>

        <TabsContent value="vault">

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
            <Button size="sm" variant="outline" onClick={openAddSystem}>
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
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{system.name}</p>
                      {system.url && <p className="text-xs text-muted-foreground truncate">{system.url}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditSystem(system) }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Редагувати
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteSystemId(system.id) }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Видалити
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              <Button size="sm" onClick={openAddAccount}>
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
                <Button size="sm" onClick={openAddAccount}>
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
                    <div className="min-w-0">
                      <p className="font-medium">{account.username}</p>
                      {account.email && <p className="text-xs text-muted-foreground">{account.email}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-sm">
                          {showPassword[account.id] || '••••••••••'}
                        </span>
                      </div>
                      {account.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{account.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
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
                        className="h-8 w-8"
                        onClick={() => openEditAccount(account)}
                        title="Редагувати"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteAccountId(account.id)}
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

        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable />
        </TabsContent>
      </Tabs>

      {/* System Dialog (Add/Edit) */}
      <Dialog open={systemDialogOpen} onOpenChange={setSystemDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editSystemId ? 'Редагувати систему' : 'Додати систему'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitSystem} className="flex flex-col overflow-hidden">
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 px-6">
                <div className="space-y-2">
                  <Label>Назва *</Label>
                  <Input
                    value={systemForm.name}
                    onChange={(e) => setSystemForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Наприклад: Gmail, AWS, GitHub"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Тип системи</Label>
                  <Select value={systemForm.system_type} onValueChange={(value) => setSystemForm((prev) => ({ ...prev, system_type: value }))}>
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={systemForm.url}
                      onChange={(e) => setSystemForm((prev) => ({ ...prev, url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>IP адреса</Label>
                    <Input
                      value={systemForm.ip_address}
                      onChange={(e) => setSystemForm((prev) => ({ ...prev, ip_address: e.target.value }))}
                      placeholder="192.168.1.1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Порт</Label>
                    <Input
                      type="number"
                      value={systemForm.port}
                      onChange={(e) => setSystemForm((prev) => ({ ...prev, port: e.target.value }))}
                      placeholder="8080"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Критичність</Label>
                    <Select value={systemForm.criticality} onValueChange={(value) => setSystemForm((prev) => ({ ...prev, criticality: value }))}>
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
                </div>
                <div className="space-y-2">
                  <Label>Опис</Label>
                  <Textarea
                    value={systemForm.description}
                    onChange={(e) => setSystemForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => setSystemDialogOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={isSystemPending}>
                {isSystemPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editSystemId ? 'Зберегти' : 'Додати'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Dialog (Add/Edit) */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle>{editAccountId ? 'Редагувати обліковий запис' : 'Додати обліковий запис'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAccount} className="flex flex-col overflow-hidden">
            <ScrollArea className="flex-1" style={{ maxHeight: 'calc(85vh - 130px)' }}>
              <div className="space-y-3 px-6 pb-1">
                <div className="space-y-1.5">
                  <Label className="text-xs">Користувач *</Label>
                  <Select
                    value={accountForm.assigned_to}
                    onValueChange={(value) => {
                      const selected = users?.results?.find((u) => String(u.id) === value)
                      setAccountForm((prev) => ({
                        ...prev,
                        assigned_to: value,
                        username: selected
                          ? (selected.last_name && selected.first_name
                              ? `${selected.last_name} ${selected.first_name}`
                              : selected.username)
                          : prev.username,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть користувача" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.results?.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.last_name && user.first_name
                            ? `${user.last_name} ${user.first_name}`
                            : user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{editAccountId ? 'Новий пароль' : 'Пароль *'}</Label>
                  <Input
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
                    required={!editAccountId}
                    placeholder={editAccountId ? 'Не змінювати' : ''}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Тип</Label>
                    <Select value={accountForm.account_type} onValueChange={(value) => setAccountForm((prev) => ({ ...prev, account_type: value }))}>
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Статус</Label>
                    <Select value={accountForm.status} onValueChange={(value) => setAccountForm((prev) => ({ ...prev, status: value }))}>
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
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Дійсний до</Label>
                    <Input
                      type="date"
                      value={accountForm.password_expires}
                      onChange={(e) => setAccountForm((prev) => ({ ...prev, password_expires: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Опис</Label>
                  <Input
                    value={accountForm.description}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Нотатки</Label>
                  <Input
                    value={accountForm.notes}
                    onChange={(e) => setAccountForm((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            </ScrollArea>
            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={isAccountPending}>
                {isAccountPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editAccountId ? 'Зберегти' : 'Додати'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete System Confirm */}
      <ConfirmDialog
        open={deleteSystemId !== null}
        onOpenChange={() => setDeleteSystemId(null)}
        title="Видалити систему?"
        description="Систему та всі її облікові записи буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteSystemId) {
            deleteSystem.mutate(deleteSystemId)
            if (selectedSystem === deleteSystemId) setSelectedSystem(null)
            setDeleteSystemId(null)
          }
        }}
        variant="destructive"
      />

      {/* Delete Account Confirm */}
      <ConfirmDialog
        open={deleteAccountId !== null}
        onOpenChange={() => setDeleteAccountId(null)}
        title="Видалити обліковий запис?"
        description="Обліковий запис буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteAccountId) {
            deleteAccount.mutate(deleteAccountId)
            setDeleteAccountId(null)
          }
        }}
        variant="destructive"
      />
    </div>
  )
}
