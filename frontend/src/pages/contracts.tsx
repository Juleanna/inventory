import { useState } from 'react'
import { useContracts, useCreateContract, useDeleteContract } from '@/hooks/use-contracts'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { ColumnVisibility } from '@/components/shared/column-visibility'
import type { Contract } from '@/api/contracts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { FileText, Plus, Trash2, Download, Search, FileCheck, AlertTriangle, DollarSign } from 'lucide-react'

const TYPE_OPTIONS = [
  { value: 'WARRANTY', label: 'Гарантійний' },
  { value: 'SERVICE', label: 'Сервісний' },
  { value: 'PURCHASE', label: 'Закупівля' },
  { value: 'LEASE', label: 'Оренда' },
  { value: 'LICENSE', label: 'Ліцензійний' },
  { value: 'OTHER', label: 'Інший' },
]

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Активний' },
  { value: 'EXPIRED', label: 'Закінчився' },
  { value: 'CANCELLED', label: 'Скасований' },
  { value: 'DRAFT', label: 'Чернетка' },
]

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EXPIRED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  DRAFT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
}

const TYPE_COLORS: Record<string, string> = {
  WARRANTY: 'bg-blue-100 text-blue-800',
  SERVICE: 'bg-purple-100 text-purple-800',
  PURCHASE: 'bg-emerald-100 text-emerald-800',
  LEASE: 'bg-orange-100 text-orange-800',
  LICENSE: 'bg-cyan-100 text-cyan-800',
  OTHER: 'bg-gray-100 text-gray-800',
}

const CONTRACT_COLUMNS = [
  { key: 'number' as const, label: 'Номер' },
  { key: 'title' as const, label: 'Назва' },
  { key: 'type' as const, label: 'Тип' },
  { key: 'counterparty' as const, label: 'Контрагент' },
  { key: 'startDate' as const, label: 'Початок' },
  { key: 'endDate' as const, label: 'Завершення' },
  { key: 'amount' as const, label: 'Сума' },
  { key: 'status' as const, label: 'Статус' },
]

export default function ContractsPage() {
  const { allColumns, isColumnVisible, toggleColumn } = useColumnVisibility('contracts-columns', CONTRACT_COLUMNS)
  const [page] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useContracts({
    page,
    page_size: 20,
    ...(search && { search }),
    ...(typeFilter && { contract_type: typeFilter }),
    ...(statusFilter && { status: statusFilter }),
  })
  const createMutation = useCreateContract()
  const deleteMutation = useDeleteContract()

  const contracts = data?.results || []
  const totalCount = data?.count || 0

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate(formData, { onSuccess: () => setCreateOpen(false) })
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, { onSuccess: () => setDeleteId(null) })
    }
  }

  const activeCount = contracts.filter((c: Contract) => c.status === 'ACTIVE').length
  const expiringCount = contracts.filter((c: Contract) => {
    if (!c.end_date) return false
    const daysLeft = (new Date(c.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    return daysLeft > 0 && daysLeft <= 30
  }).length
  const totalAmount = contracts.reduce((sum: number, c: Contract) => sum + (c.amount ? parseFloat(c.amount) : 0), 0)

  return (
    <div>
      <PageHeader title="Договори та документи" description="Управління договорами, гарантіями та контрактами">
        <div className="flex gap-2">
          <ColumnVisibility allColumns={allColumns} isColumnVisible={isColumnVisible} toggleColumn={toggleColumn} disabledColumns={['number']} />
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Новий договір</Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-4 w-4 text-primary" /></div>
          <div><p className="text-2xl font-bold">{totalCount}</p><p className="text-xs text-muted-foreground">Всього</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2"><FileCheck className="h-4 w-4 text-green-500" /></div>
          <div><p className="text-2xl font-bold">{activeCount}</p><p className="text-xs text-muted-foreground">Активних</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/10 p-2"><AlertTriangle className="h-4 w-4 text-orange-500" /></div>
          <div><p className="text-2xl font-bold">{expiringCount}</p><p className="text-xs text-muted-foreground">Закінчуються</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2"><DollarSign className="h-4 w-4 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{totalAmount > 0 ? `${(totalAmount / 1000).toFixed(0)}k` : '—'}</p><p className="text-xs text-muted-foreground">Сума (грн)</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук..." className="pl-8" />
        </div>
        <Select value={typeFilter || 'all'} onValueChange={v => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі типи</SelectItem>
            {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Статус" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {isColumnVisible('number') && <TableHead>Номер</TableHead>}
                {isColumnVisible('title') && <TableHead>Назва</TableHead>}
                {isColumnVisible('type') && <TableHead>Тип</TableHead>}
                {isColumnVisible('counterparty') && <TableHead>Контрагент</TableHead>}
                {isColumnVisible('startDate') && <TableHead>Початок</TableHead>}
                {isColumnVisible('endDate') && <TableHead>Завершення</TableHead>}
                {isColumnVisible('amount') && <TableHead className="text-right">Сума</TableHead>}
                {isColumnVisible('status') && <TableHead>Статус</TableHead>}
                <TableHead className="w-[100px]">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>{Array.from({ length: CONTRACT_COLUMNS.filter(c => isColumnVisible(c.key)).length + 1 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                ))
              ) : contracts.length > 0 ? (
                contracts.map((c: Contract) => (
                  <TableRow key={c.id}>
                    {isColumnVisible('number') && <TableCell className="font-mono text-xs">{c.contract_number}</TableCell>}
                    {isColumnVisible('title') && <TableCell className="font-medium">{c.title}</TableCell>}
                    {isColumnVisible('type') && <TableCell><Badge variant="secondary" className={TYPE_COLORS[c.contract_type] || ''}>{c.contract_type_display || c.contract_type}</Badge></TableCell>}
                    {isColumnVisible('counterparty') && <TableCell>{c.counterparty}</TableCell>}
                    {isColumnVisible('startDate') && <TableCell className="text-sm">{new Date(c.start_date).toLocaleDateString('uk-UA')}</TableCell>}
                    {isColumnVisible('endDate') && <TableCell className="text-sm">{c.end_date ? new Date(c.end_date).toLocaleDateString('uk-UA') : '—'}</TableCell>}
                    {isColumnVisible('amount') && <TableCell className="text-right font-mono">{c.amount ? `${parseFloat(c.amount).toLocaleString()} грн` : '—'}</TableCell>}
                    {isColumnVisible('status') && <TableCell><Badge variant="secondary" className={STATUS_COLORS[c.status] || ''}>{c.status_display || c.status}</Badge></TableCell>}
                    <TableCell>
                      <div className="flex gap-1">
                        {c.file && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                            <a href={c.file} download><Download className="h-3.5 w-3.5" /></a>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={CONTRACT_COLUMNS.filter(c => isColumnVisible(c.key)).length + 1} className="text-center py-8 text-muted-foreground">Немає договорів</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Новий договір</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Назва *</Label><Input name="title" required /></div>
              <div className="space-y-1"><Label className="text-xs">Номер *</Label><Input name="contract_number" required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Тип</Label>
                <select name="contract_type" className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm">
                  {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Статус</Label>
                <select name="status" className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Контрагент</Label><Input name="counterparty" /></div>
            <div className="space-y-1"><Label className="text-xs">Опис</Label><Textarea name="description" rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs">Початок</Label><Input type="date" name="start_date" required /></div>
              <div className="space-y-1"><Label className="text-xs">Завершення</Label><Input type="date" name="end_date" /></div>
              <div className="space-y-1"><Label className="text-xs">Сума (грн)</Label><Input type="number" name="amount" step="0.01" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Файл</Label><Input type="file" name="file" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2"><Switch name="auto_renew" /><Label className="text-xs">Автоподовження</Label></div>
              <div className="space-y-1"><Label className="text-xs">Нагадати за (днів)</Label><Input type="number" name="reminder_days" defaultValue={30} /></div>
            </div>
            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={createMutation.isPending}>Створити</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити договір?</AlertDialogTitle>
            <AlertDialogDescription>Цю дію неможливо скасувати.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
