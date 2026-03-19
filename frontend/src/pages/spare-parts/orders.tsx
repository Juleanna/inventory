import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { ColumnVisibility } from '@/components/shared/column-visibility'
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseOrder, useSuppliersList, useSparePartsList, useCounterpartiesList } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ShoppingCart, Plus, Loader2, ArrowRight, Eye, Trash2, Package, Truck } from 'lucide-react'
import { ORDER_STATUS_LABELS, DELIVERY_METHOD_LABELS } from '@/lib/constants'
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

const ORDER_COLUMNS = [
  { key: 'number' as const, label: 'Номер' },
  { key: 'supplier' as const, label: 'Постачальник' },
  { key: 'status' as const, label: 'Статус' },
  { key: 'amount' as const, label: 'Сума' },
  { key: 'date' as const, label: 'Дата' },
]

export default function OrdersPage() {
  const { allColumns, isColumnVisible, toggleColumn } = useColumnVisibility('orders-columns', ORDER_COLUMNS)
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
            <ColumnVisibility allColumns={allColumns} isColumnVisible={isColumnVisible} toggleColumn={toggleColumn} disabledColumns={['number']} />
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
                  {isColumnVisible('number') && <TableHead>Номер</TableHead>}
                  {isColumnVisible('supplier') && <TableHead>Постачальник</TableHead>}
                  {isColumnVisible('status') && <TableHead>Статус</TableHead>}
                  {isColumnVisible('amount') && <TableHead>Сума</TableHead>}
                  {isColumnVisible('date') && <TableHead>Дата</TableHead>}
                  <TableHead className="w-40">Дії</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((order) => {
                  const nextStatuses = STATUS_FLOW[order.status] || []
                  return (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => setDetailOrder(order)}>
                      {isColumnVisible('number') && <TableCell className="font-mono font-medium">{order.order_number}</TableCell>}
                      {isColumnVisible('supplier') && <TableCell>{order.supplier_details?.name || `#${order.supplier}`}</TableCell>}
                      {isColumnVisible('status') && <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[order.status]}>
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>}
                      {isColumnVisible('amount') && <TableCell>{order.total_amount} грн</TableCell>}
                      {isColumnVisible('date') && <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('uk-UA')}
                      </TableCell>}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Постачальник</p>
                    <p className="font-medium">{detailOrder.supplier_details?.name || `#${detailOrder.supplier}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Контрагент</p>
                    <p className="font-medium">{detailOrder.counterparty_details?.name || '—'}</p>
                  </div>
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

                {/* Delivery info */}
                {(detailOrder.delivery_method || detailOrder.tracking_number) && (
                  <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      <Truck className="h-3.5 w-3.5" />
                      Доставка
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {detailOrder.delivery_method && (
                        <div>
                          <p className="text-xs text-muted-foreground">Спосіб</p>
                          <p className="text-sm">{DELIVERY_METHOD_LABELS[detailOrder.delivery_method] || detailOrder.delivery_method}</p>
                        </div>
                      )}
                      {detailOrder.tracking_number && (
                        <div>
                          <p className="text-xs text-muted-foreground">ТТН</p>
                          <p className="text-sm font-mono">{detailOrder.tracking_number}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailOrder.notes && (
                  <div>
                    <p className="text-xs text-muted-foreground">Нотатки</p>
                    <p className="text-sm">{detailOrder.notes}</p>
                  </div>
                )}

                {detailOrder.items && detailOrder.items.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Позиції ({detailOrder.items.length})</p>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Запчастина</TableHead>
                            <TableHead className="text-xs">Замовл.</TableHead>
                            <TableHead className="text-xs">Отрим.</TableHead>
                            <TableHead className="text-xs">Ціна</TableHead>
                            <TableHead className="text-xs w-8">
                              <Package className="h-3 w-3" />
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailOrder.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="text-sm">
                                {item.display_name || item.spare_part_details?.name || item.item_name || item.spare_part}
                                {item.item_type && item.item_type !== 'SPARE_PART' && (
                                  <Badge variant="outline" className="ml-1.5 text-[10px]">{ITEM_TYPE_LABELS[item.item_type] || item.item_type}</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">{item.quantity_ordered}</TableCell>
                              <TableCell className="text-sm">{item.quantity_received}</TableCell>
                              <TableCell className="text-sm">{item.unit_price} грн</TableCell>
                              <TableCell className="text-sm">
                                {item.add_to_inventory ? (
                                  <Badge variant="secondary" className="text-[10px] px-1">так</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">ні</span>
                                )}
                              </TableCell>
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

interface OrderItem {
  item_type: 'SPARE_PART' | 'EQUIPMENT' | 'OTHER'
  spare_part_id: string
  item_name: string
  quantity: number
  unit_price: string
  add_to_inventory: boolean
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  SPARE_PART: 'Запчастина',
  EQUIPMENT: 'Обладнання',
  OTHER: 'Інше',
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createOrder = useCreatePurchaseOrder()
  const { data: suppliersData } = useSuppliersList({ page_size: 500 })
  const { data: partsData } = useSparePartsList({ page_size: 500 })
  const { data: counterpartiesData } = useCounterpartiesList({ page_size: 500, is_active: true })

  const [form, setForm] = useState({
    supplier: '',
    counterparty_id: '',
    expected_delivery_date: '',
    delivery_method: '',
    tracking_number: '',
    notes: '',
  })
  const [items, setItems] = useState<OrderItem[]>([])

  // New item form
  const [newItem, setNewItem] = useState({
    item_type: 'SPARE_PART' as 'SPARE_PART' | 'EQUIPMENT' | 'OTHER',
    spare_part_id: '',
    item_name: '',
    quantity: 1,
    unit_price: '',
    add_to_inventory: true,
  })

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const addItem = () => {
    if (newItem.quantity < 1) return

    if (newItem.item_type === 'SPARE_PART') {
      if (!newItem.spare_part_id) return
      const part = partsData?.results?.find((p) => String(p.id) === newItem.spare_part_id)
      if (!part) return
      if (items.some((i) => i.item_type === 'SPARE_PART' && i.spare_part_id === newItem.spare_part_id)) return

      setItems((prev) => [
        ...prev,
        {
          item_type: 'SPARE_PART',
          spare_part_id: newItem.spare_part_id,
          item_name: part.name,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price || part.unit_cost || '0',
          add_to_inventory: newItem.add_to_inventory,
        },
      ])
    } else {
      if (!newItem.item_name.trim()) return

      setItems((prev) => [
        ...prev,
        {
          item_type: newItem.item_type,
          spare_part_id: '',
          item_name: newItem.item_name,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price || '0',
          add_to_inventory: false,
        },
      ])
    }

    setNewItem({ item_type: newItem.item_type, spare_part_id: '', item_name: '', quantity: 1, unit_price: '', add_to_inventory: newItem.item_type === 'SPARE_PART' })
  }

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * parseFloat(item.unit_price || '0'), 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.supplier || items.length === 0) return

    createOrder.mutate(
      {
        supplier: Number(form.supplier),
        counterparty_id: form.counterparty_id ? Number(form.counterparty_id) : undefined,
        expected_delivery_date: form.expected_delivery_date || undefined,
        delivery_method: form.delivery_method || undefined,
        tracking_number: form.tracking_number || undefined,
        notes: form.notes || undefined,
        items: items.map((i) => ({
          item_type: i.item_type,
          spare_part_id: i.item_type === 'SPARE_PART' ? i.spare_part_id : undefined,
          item_name: i.item_type !== 'SPARE_PART' ? i.item_name : undefined,
          quantity: i.quantity,
          unit_price: i.unit_price,
          add_to_inventory: i.add_to_inventory,
        })),
      } as unknown as Partial<PurchaseOrder>,
      {
        onSuccess: () => {
          onOpenChange(false)
          setForm({ supplier: '', counterparty_id: '', expected_delivery_date: '', delivery_method: '', tracking_number: '', notes: '' })
          setItems([])
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Створити замовлення</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Supplier + Counterparty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Постачальник *</Label>
              <Select value={form.supplier} onValueChange={(v) => update('supplier', v)}>
                <SelectTrigger><SelectValue placeholder="Оберіть постачальника" /></SelectTrigger>
                <SelectContent>
                  {suppliersData?.results?.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.short_name || s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Контрагент (покупець)</Label>
              <Select value={form.counterparty_id} onValueChange={(v) => update('counterparty_id', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Оберіть організацію" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Не вказано —</SelectItem>
                  {counterpartiesData?.results?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.short_name || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expected date + Delivery */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Очікувана дата доставки</Label>
              <Input type="date" value={form.expected_delivery_date} onChange={(e) => update('expected_delivery_date', e.target.value)} />
            </div>

          {/* Delivery method + Tracking */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Спосіб доставки</Label>
              <Select value={form.delivery_method} onValueChange={(v) => update('delivery_method', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Оберіть" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Не вказано —</SelectItem>
                  {Object.entries(DELIVERY_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ТТН / Трекінг номер</Label>
              <Input value={form.tracking_number} onChange={(e) => update('tracking_number', e.target.value)} placeholder="20450..." />
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Позиції замовлення *</Label>
              {items.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  Разом: {totalAmount.toFixed(2)} грн
                </span>
              )}
            </div>

            {/* Existing items */}
            {items.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Тип</TableHead>
                      <TableHead className="text-xs">Назва</TableHead>
                      <TableHead className="text-xs w-16">К-сть</TableHead>
                      <TableHead className="text-xs w-24">Ціна</TableHead>
                      <TableHead className="text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-[10px]">{ITEM_TYPE_LABELS[item.item_type]}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{item.item_name}</TableCell>
                        <TableCell className="text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-sm">{item.unit_price} грн</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Add new item row */}
            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">Додати позицію</p>
              <div className="flex gap-2 mb-2">
                <Select value={newItem.item_type} onValueChange={(v) => setNewItem((prev) => ({
                  ...prev,
                  item_type: v as 'SPARE_PART' | 'EQUIPMENT' | 'OTHER',
                  spare_part_id: '',
                  item_name: '',
                  add_to_inventory: v === 'SPARE_PART',
                }))}>
                  <SelectTrigger className="w-[160px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-[1fr,80px,100px] gap-2">
                {newItem.item_type === 'SPARE_PART' ? (
                  <Select value={newItem.spare_part_id} onValueChange={(v) => {
                    const part = partsData?.results?.find((p) => String(p.id) === v)
                    setNewItem((prev) => ({
                      ...prev,
                      spare_part_id: v,
                      unit_price: part?.unit_cost || prev.unit_price,
                    }))
                  }}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Оберіть запчастину" /></SelectTrigger>
                    <SelectContent>
                      {partsData?.results
                        ?.filter((p) => !items.some((i) => i.item_type === 'SPARE_PART' && i.spare_part_id === String(p.id)))
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={newItem.item_name}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, item_name: e.target.value }))}
                    placeholder={newItem.item_type === 'EQUIPMENT' ? 'Ноутбук HP ProBook 450...' : 'Назва позиції...'}
                    className="text-sm"
                  />
                )}
                <Input
                  type="number"
                  min={1}
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  placeholder="К-сть"
                  className="text-sm"
                />
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, unit_price: e.target.value }))}
                  placeholder="Ціна"
                  className="text-sm"
                />
              </div>
              <div className="flex items-center justify-between">
                {newItem.item_type === 'SPARE_PART' && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="add-to-inv"
                      checked={newItem.add_to_inventory}
                      onCheckedChange={(v) => setNewItem((prev) => ({ ...prev, add_to_inventory: !!v }))}
                    />
                    <label htmlFor="add-to-inv" className="text-xs text-muted-foreground cursor-pointer">
                      Додати до запасів при отриманні
                    </label>
                  </div>
                )}
                <div className="ml-auto">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addItem}
                    disabled={newItem.item_type === 'SPARE_PART' ? !newItem.spare_part_id : !newItem.item_name.trim()}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Додати
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Нотатки</Label>
            <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Деталі замовлення..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
            <Button type="submit" disabled={createOrder.isPending || items.length === 0}>
              {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Створити
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
