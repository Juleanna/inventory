import { useState } from 'react'
import { useSparePartMovements, useCreateMovement, useSparePartsList } from '@/hooks/use-spare-parts'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowRightLeft, Plus, Loader2 } from 'lucide-react'
import { MOVEMENT_TYPE_LABELS } from '@/lib/constants'

const MOVEMENT_COLORS: Record<string, string> = {
  RECEIPT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ISSUE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  RETURN: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  ADJUSTMENT: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  TRANSFER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  WRITE_OFF: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export function MovementsTable() {
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading } = useSparePartMovements({ page, page_size: 20 })

  if (isLoading) return <LoadingSpinner size="lg" />

  const movements = data?.movements || []
  const pagination = data?.pagination

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Додати рух
        </Button>
      </div>

      {!movements.length ? (
        <EmptyState
          icon={<ArrowRightLeft className="h-12 w-12" />}
          title="Немає записів руху"
          description="Додайте рух запчастин для відстеження"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Запчастина</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="text-right">Кількість</TableHead>
                  <TableHead className="hidden md:table-cell">Обладнання</TableHead>
                  <TableHead className="hidden lg:table-cell">Виконав</TableHead>
                  <TableHead className="hidden xl:table-cell">Примітки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(m.performed_at).toLocaleString('uk-UA')}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{m.spare_part.name}</span>
                      <p className="text-xs text-muted-foreground font-mono">{m.spare_part.part_number}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={MOVEMENT_COLORS[m.movement_type] || ''}>
                        {m.movement_type_display || MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {m.quantity}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {m.equipment?.name || '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {m.performed_by || '—'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                      {m.notes || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pagination && pagination.total > pagination.page_size && (
            <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Всього: {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Попередня
                </Button>
                <Button variant="outline" size="sm" disabled={!pagination.has_next} onClick={() => setPage(page + 1)}>
                  Наступна
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddMovementDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  )
}

function AddMovementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createMovement = useCreateMovement()
  const { data: parts } = useSparePartsList()

  const [form, setForm] = useState({
    spare_part_id: '',
    movement_type: 'RECEIPT',
    quantity: '',
    notes: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMovement.mutate(
      {
        spare_part_id: form.spare_part_id,
        movement_type: form.movement_type,
        quantity: Number(form.quantity),
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ spare_part_id: '', movement_type: 'RECEIPT', quantity: '', notes: '' })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Додати рух запчастини</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Запчастина *</Label>
            <Select value={form.spare_part_id} onValueChange={(v) => setForm((p) => ({ ...p, spare_part_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть запчастину" />
              </SelectTrigger>
              <SelectContent>
                {parts?.results?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.part_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип руху *</Label>
              <Select value={form.movement_type} onValueChange={(v) => setForm((p) => ({ ...p, movement_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Кількість *</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Примітки</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createMovement.isPending}>
              {createMovement.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Додати
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
