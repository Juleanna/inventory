import { useState } from 'react'
import { usePasswordSystems, usePasswordAccounts, useCreatePasswordAccount, useDeletePasswordAccount } from '@/hooks/use-passwords'
import { useDebounce } from '@/hooks/use-debounce'
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
import { KeyRound, Plus, Copy, Eye, EyeOff, Trash2, Globe, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PasswordVaultPage() {
  const [search, setSearch] = useState('')
  const [selectedSystem, setSelectedSystem] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState<Record<number, string>>({})
  const [addOpen, setAddOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [newAccount, setNewAccount] = useState({ system: 0, username: '', password: '', notes: '' })

  const debouncedSearch = useDebounce(search)
  const { data: systems, isLoading: loadingSystems } = usePasswordSystems({
    search: debouncedSearch || undefined,
  })
  const { data: accounts, isLoading: loadingAccounts } = usePasswordAccounts(
    selectedSystem ? { system: selectedSystem } : undefined
  )
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

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    createAccount.mutate(newAccount, {
      onSuccess: () => {
        setAddOpen(false)
        setNewAccount({ system: 0, username: '', password: '', notes: '' })
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
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">Системи</h3>
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
