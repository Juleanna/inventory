import { useState } from 'react'
import { usePeripheralsList, useCreatePeripheral, useDeletePeripheral } from '@/hooks/use-peripherals'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Usb, Plus, Trash2, Loader2 } from 'lucide-react'
import { PERIPHERAL_TYPE_LABELS } from '@/lib/constants'

export default function PeripheralsListPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = usePeripheralsList({
    page,
    search: debouncedSearch || undefined,
  })
  const deletePeripheral = useDeletePeripheral()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Периферійні пристрої"
        description={`Всього: ${data?.count || 0} пристроїв`}
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Додати
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук пристроїв..."
          className="sm:w-72"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Usb className="h-12 w-12" />}
          title="Пристроїв не знайдено"
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-3 w-3" />
              Додати пристрій
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead className="hidden md:table-cell">Серійний номер</TableHead>
                  <TableHead className="hidden lg:table-cell">Підключено до</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {PERIPHERAL_TYPE_LABELS[device.type] || device.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-sm">{device.serial_number}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {device.connected_to_details?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => setDeleteId(device.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Сторінка {page} з {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Попередня</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Наступна</Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreatePeripheralDialog open={showCreate} onOpenChange={setShowCreate} />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити пристрій?"
        description="Пристрій буде видалено назавжди."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deletePeripheral.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />
    </div>
  )
}

function CreatePeripheralDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createPeripheral = useCreatePeripheral()
  const { data: equipmentData } = useEquipmentList({ page_size: 200 })

  const [form, setForm] = useState({
    name: '',
    type: '',
    serial_number: '',
    connected_to: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createPeripheral.mutate(
      {
        name: form.name,
        type: form.type,
        serial_number: form.serial_number,
        connected_to: form.connected_to ? Number(form.connected_to) : undefined,
      } as Record<string, unknown>,
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ name: '', type: '', serial_number: '', connected_to: '' })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Додати периферійний пристрій</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Назва *</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Logitech MX Keys" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Тип *</Label>
              <Select value={form.type} onValueChange={(v) => update('type', v)}>
                <SelectTrigger><SelectValue placeholder="Оберіть тип" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PERIPHERAL_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Серійний номер *</Label>
              <Input value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Підключено до обладнання</Label>
            <Select value={form.connected_to} onValueChange={(v) => update('connected_to', v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Не підключено" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Не підключено</SelectItem>
                {equipmentData?.results?.map((eq) => (
                  <SelectItem key={eq.id} value={String(eq.id)}>{eq.name} ({eq.serial_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createPeripheral.isPending}>
              {createPeripheral.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Додати
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
