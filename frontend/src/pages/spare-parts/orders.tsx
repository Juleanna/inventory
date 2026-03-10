import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useSuppliersList } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ShoppingCart, Plus, Loader2, ArrowRight, Eye } from 'lucide-react'
import { ORDER_STATUS_LABELS } from '@/lib/constants'
import type { PurchaseOrder } from '@/types'

const STATUS_FLOW: Record<string, string[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['APPROVED', 'CANCELLED'],
  APPROVED: ['ORDERED', 'CANCELLED'],
  ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED'],
  RECEIVED: [],
  CANCELLED: [],
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ORDERED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function OrdersPage() {
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null)
  const { data, isLoading } = usePurchaseOrders({
    page,
    status: status || undefined,
  })
  const updateOrder = useUpdatePurchaseOrder()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateOrder.mutate({ id: Number(orderId), data: { status: newStatus } as Partial<PurchaseOrder> })
    if (detailOrder && detailOrder.id === orderId) {
      setDetailOrder({ ...detailOrder, status: newStatus })
    }
  }

  return (
    <div>
      <PageHeader
        title="Замовлення"
        description="Замовлення на закупівлю запчастин"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Створити
            </Button>
            <Button variant="outline" asChild>
              <Link to="/spare-parts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Всі статуси" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="Замовлень не знайдено"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Постачальник</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="hidden md:table-cell">Сума</TableHead>
                  <TableHead className="hidden lg:table-cell">Дата</TableHead>
                  <TableHead className="w-40">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((order) => {
                  const nextStatuses = STATUS_FLOW[order.status] || []
                  return (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => setDetailOrder(order)}>
                      <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.supplier_details?.name || `#${order.supplier}`}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[order.status]}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{order.total_amount} грн</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('uk-UA')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetailOrder(order)} title="Деталі">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {nextStatuses.length > 0 && nextStatuses[0] !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={updateOrder.isPending}
                              onClick={() => handleStatusChange(order.id, nextStatuses[0])}
                            >
                              <ArrowRight className="mr-1 h-3 w-3" />
                              {ORDER_STATUS_LABELS[nextStatuses[0]]}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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

      <CreateOrderDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* Order detail Sheet */}
      <Sheet open={!!detailOrder} onOpenChange={(v) => { if (!v) setDetailOrder(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Замовлення {detailOrder?.order_number}</SheetTitle>
          </SheetHeader>
          {detailOrder && (
            <div className="space-y-4 mt-4">
              <Badge variant="secondary" className={STATUS_COLORS[detailOrder.status]}>
                {ORDER_STATUS_LABELS[detailOrder.status] || detailOrder.status}
              </Badge>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Постачальник</p>
                  <p className="font-medium">{detailOrder.supplier_details?.name || `#${detailOrder.supplier}`}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Сума</p>
                    <p className="font-medium">{detailOrder.total_amount} грн</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Створено</p>
                    <p className="text-sm">{new Date(detailOrder.created_at).toLocaleDateString('uk-UA')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Очікувана доставка</p>
                    <p className="text-sm">{detailOrder.expected_delivery_date ? new Date(detailOrder.expected_delivery_date).toLocaleDateString('uk-UA') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Фактична доставка</p>
                    <p className="text-sm">{detailOrder.actual_delivery_date ? new Date(detailOrder.actual_delivery_date).toLocaleDateString('uk-UA') : '—'}</p>
                  </div>
                </div>
                {detailOrder.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Нотатки</p>
                    <p className="text-sm">{detailOrder.notes}</p>
                  </div>
                )}

                {detailOrder.items && detailOrder.items.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Позиції</p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Запчастина</TableHead>
                            <TableHead className="text-xs">Замовл.</TableHead>
                            <TableHead className="text-xs">Отрим.</TableHead>
                            <TableHead className="text-xs">Ціна</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailOrder.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">{item.spare_part_details?.name || item.spare_part}</TableCell>
                              <TableCell className="text-sm">{item.quantity_ordered}</TableCell>
                              <TableCell className="text-sm">{item.quantity_received}</TableCell>
                              <TableCell className="text-sm">{item.unit_price} грн</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>

              {/* Status transition buttons */}
              {(STATUS_FLOW[detailOrder.status] || []).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {(STATUS_FLOW[detailOrder.status] || []).map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      size="sm"
                      variant={nextStatus === 'CANCELLED' ? 'destructive' : 'default'}
                      disabled={updateOrder.isPending}
                      onClick={() => handleStatusChange(detailOrder.id, nextStatus)}
                    >
                      {updateOrder.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                      {ORDER_STATUS_LABELS[nextStatus]}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createOrder = useCreatePurchaseOrder()
  const { data: suppliersData } = useSuppliersList()

  const [form, setForm] = useState({
    supplier: '',
    expected_delivery_date: '',
    notes: '',
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createOrder.mutate(
      {
        supplier: Number(form.supplier),
        expected_delivery_date: form.expected_delivery_date || undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ supplier: '', expected_delivery_date: '', notes: '' })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Створити замовлення</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Постачальник *</Label>
            <Select value={form.supplier} onValueChange={(v) => update('supplier', v)}>
              <SelectTrigger><SelectValue placeholder="Оберіть постачальника" /></SelectTrigger>
              <SelectContent>
                {suppliersData?.results?.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Очікувана дата доставки</Label>
            <Input type="date" value={form.expected_delivery_date} onChange={(e) => update('expected_delivery_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Нотатки</Label>
            <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={3} placeholder="Деталі замовлення..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createOrder.isPending}>
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
