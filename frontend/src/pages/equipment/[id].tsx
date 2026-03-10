import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEquipment, useEquipmentPeripherals, useEquipmentSoftware, useEquipmentHistory, useEquipmentDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/use-equipment'
import { usePeripheralsList, useUpdatePeripheral, useCreatePeripheral } from '@/hooks/use-peripherals'
import { PageHeader } from '@/components/shared/page-header'
import { SearchableSelect } from '@/components/shared/searchable-select'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, Pencil, Monitor as MonitorIcon, Cpu, History, FileUp, Trash2, Download, FileText, Printer, Plus, Unplug, Loader2, Shuffle } from 'lucide-react'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, PERIPHERAL_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { EquipmentFormDialog } from '@/components/equipment/equipment-form'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const equipmentId = Number(id)
  const { data: equipment, isLoading } = useEquipment(equipmentId)
  const { data: peripherals } = useEquipmentPeripherals(equipmentId)
  const { data: software } = useEquipmentSoftware(equipmentId)
  const { data: history } = useEquipmentHistory(equipmentId)
  const { data: documents } = useEquipmentDocuments(equipmentId)
  const uploadDocument = useUploadDocument()
  const deleteDocument = useDeleteDocument()
  const updatePeripheral = useUpdatePeripheral()
  const createPeripheral = useCreatePeripheral()
  // Fetch unconnected peripherals for the "attach" dropdown
  const { data: allPeripherals } = usePeripheralsList({ page_size: 500 })
  const unconnectedPeripherals = allPeripherals?.results?.filter(
    (p) => !p.connected_to
  ) || []
  const [editOpen, setEditOpen] = useState(false)
  const [attachPeripheralId, setAttachPeripheralId] = useState('')
  const [showCreatePeripheral, setShowCreatePeripheral] = useState(false)
  const [newPeripheral, setNewPeripheral] = useState({ name: '', type: '', serial_number: '' })

  if (isLoading) return <LoadingSpinner size="lg" />
  if (!equipment) return <div className="p-8 text-center text-muted-foreground">Обладнання не знайдено</div>

  const infoItems = [
    { label: 'Виробник', value: equipment.manufacturer },
    { label: 'Модель', value: equipment.model },
    { label: 'Серійний номер', value: equipment.serial_number },
    { label: 'Інвентарний номер', value: equipment.inventory_number },
    { label: 'Місцезнаходження', value: equipment.location },
    { label: 'Будівля', value: equipment.building },
    { label: 'Поверх', value: equipment.floor },
    { label: 'Кімната', value: equipment.room },
  ].filter((i) => i.value)

  const techItems = [
    { label: 'CPU', value: equipment.cpu },
    { label: 'RAM', value: equipment.ram },
    { label: 'Сховище', value: equipment.storage },
    { label: 'Накопичувачі', value: equipment.disk_model },
    { label: 'GPU', value: equipment.gpu },
    { label: 'Материнська плата', value: equipment.motherboard },
    { label: 'S/N мат. плати', value: equipment.motherboard_serial },
    { label: 'Екран', value: equipment.display },
    { label: 'Мережевий адаптер', value: equipment.network_adapter },
    { label: 'Блок живлення', value: equipment.power_supply },
    { label: 'BIOS/UEFI', value: equipment.bios_version },
    { label: 'ОС', value: equipment.operating_system },
    { label: 'IP адреса', value: equipment.ip_address },
    { label: 'MAC адреса', value: equipment.mac_address },
    { label: 'Hostname', value: equipment.hostname },
  ].filter((i) => i.value)

  const dateItems = [
    { label: 'Дата покупки', value: equipment.purchase_date },
    { label: 'Гарантія до', value: equipment.warranty_until },
    { label: 'Останнє ТО', value: equipment.last_maintenance_date },
    { label: 'Наступне ТО', value: equipment.next_maintenance_date },
    { label: 'Ціна покупки', value: equipment.purchase_price ? `${equipment.purchase_price} грн` : null },
  ].filter((i) => i.value)

  const peripheralCount = peripherals?.results?.length ?? 0
  const softwareCount = software?.results?.length ?? 0
  const documentCount = Array.isArray(documents) ? documents.length : 0

  return (
    <div>
      <PageHeader
        title={equipment.name}
        description={`${CATEGORY_LABELS[equipment.category] || equipment.category} — ${equipment.manufacturer} ${equipment.model}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Редагувати
            </Button>
            <Button variant="outline" asChild>
              <Link to="/equipment">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4">
        <Badge variant="secondary" className={cn('text-sm', STATUS_COLORS[equipment.status])}>
          {STATUS_LABELS[equipment.status] || equipment.status}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Огляд</TabsTrigger>
          <TabsTrigger value="peripherals">
            Периферія{peripheralCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{peripheralCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="software">
            ПЗ{softwareCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{softwareCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Документи{documentCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{documentCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history">Історія</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Загальна інформація</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {infoItems.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {techItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Технічні характеристики</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {techItems.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono font-medium">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {dateItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Дати та вартість</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dateItems.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {(equipment.qrcode_image || equipment.barcode_image) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    Коди
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const w = window.open('', '_blank', 'width=600,height=500')
                        if (!w) return
                        w.document.write(`<!DOCTYPE html><html><head><title>Коди — ${equipment.name}</title>
                          <style>
                            body { font-family: sans-serif; text-align: center; padding: 24px; }
                            h2 { margin-bottom: 4px; }
                            p { color: #666; margin-top: 0; margin-bottom: 24px; font-size: 14px; }
                            .codes { display: flex; gap: 32px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
                            .code-block { text-align: center; }
                            .code-block img { max-height: 160px; }
                            .code-block span { display: block; margin-top: 6px; font-size: 12px; color: #888; }
                            @media print { button { display: none !important; } }
                          </style></head><body>
                          <h2>${equipment.name}</h2>
                          <p>${equipment.inventory_number || equipment.serial_number || ''}</p>
                          <div class="codes">
                            ${equipment.qrcode_image ? `<div class="code-block"><img src="${equipment.qrcode_image}" /><span>QR код</span></div>` : ''}
                            ${equipment.barcode_image ? `<div class="code-block"><img src="${equipment.barcode_image}" /><span>Штрих-код</span></div>` : ''}
                          </div>
                          <br/><button onclick="window.print()" style="padding:8px 24px;font-size:14px;cursor:pointer">Друкувати</button>
                        </body></html>`)
                        w.document.close()
                      }}
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Друкувати
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  {equipment.qrcode_image && (
                    <div className="text-center">
                      <img src={equipment.qrcode_image} alt="QR" className="h-32 w-32" />
                      <p className="mt-1 text-xs text-muted-foreground">QR код</p>
                    </div>
                  )}
                  {equipment.barcode_image && (
                    <div className="text-center">
                      <img src={equipment.barcode_image} alt="Barcode" className="h-32" />
                      <p className="mt-1 text-xs text-muted-foreground">Штрих-код</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Створено: {new Date(equipment.created_at).toLocaleString('uk-UA')} |
            Оновлено: {new Date(equipment.updated_at).toLocaleString('uk-UA')}
          </div>
        </TabsContent>

        {/* Peripherals tab */}
        <TabsContent value="peripherals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <MonitorIcon className="h-4 w-4" />
                  Підключена периферія
                </span>
                <Button size="sm" variant="outline" onClick={() => setShowCreatePeripheral(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Створити і підключити
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Attach existing peripheral */}
              {unconnectedPeripherals.length > 0 && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <SearchableSelect
                      options={unconnectedPeripherals.map((p) => ({
                        value: String(p.id),
                        label: `${p.name} (${PERIPHERAL_TYPE_LABELS[p.type] || p.type} · ${p.serial_number})`,
                      }))}
                      value={attachPeripheralId}
                      onValueChange={setAttachPeripheralId}
                      placeholder="Обрати периферію для підключення..."
                      searchPlaceholder="Пошук периферії..."
                      emptyText="Немає вільної периферії"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!attachPeripheralId || updatePeripheral.isPending}
                    onClick={() => {
                      if (attachPeripheralId) {
                        updatePeripheral.mutate(
                          { id: Number(attachPeripheralId), data: { connected_to_id: equipmentId } as Record<string, unknown> },
                          { onSuccess: () => setAttachPeripheralId('') },
                        )
                      }
                    }}
                  >
                    {updatePeripheral.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                    Підключити
                  </Button>
                </div>
              )}

              {/* Connected peripherals list */}
              {peripheralCount > 0 ? (
                <div className="space-y-2">
                  {peripherals!.results.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {PERIPHERAL_TYPE_LABELS[p.type] || p.type}
                          {p.serial_number && ` · ${p.serial_number}`}
                          {p.inventory_number && ` · Інв. ${p.inventory_number}`}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          updatePeripheral.mutate({
                            id: p.id,
                            data: { connected_to_id: null } as Record<string, unknown>,
                          })
                        }}
                      >
                        <Unplug className="mr-1 h-3.5 w-3.5" />
                        Відключити
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Периферію не підключено</p>
              )}
            </CardContent>
          </Card>

          {/* Create & attach new peripheral dialog */}
          <Dialog open={showCreatePeripheral} onOpenChange={setShowCreatePeripheral}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Створити та підключити периферію</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  createPeripheral.mutate(
                    {
                      name: newPeripheral.name,
                      type: newPeripheral.type,
                      serial_number: newPeripheral.serial_number,
                      connected_to_id: equipmentId,
                    } as Record<string, unknown>,
                    {
                      onSuccess: () => {
                        setShowCreatePeripheral(false)
                        setNewPeripheral({ name: '', type: '', serial_number: '' })
                      },
                    },
                  )
                }}
              >
                <div className="space-y-2">
                  <Label>Назва *</Label>
                  <Input
                    value={newPeripheral.name}
                    onChange={(e) => setNewPeripheral((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Logitech MX Keys"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Тип *</Label>
                    <Select value={newPeripheral.type} onValueChange={(v) => setNewPeripheral((p) => ({ ...p, type: v }))}>
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
                    <div className="flex gap-1">
                      <Input
                        value={newPeripheral.serial_number}
                        onChange={(e) => setNewPeripheral((p) => ({ ...p, serial_number: e.target.value }))}
                        required
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                        onClick={() => {
                          const prefix = newPeripheral.type || 'DEV'
                          const hex = Array.from(crypto.getRandomValues(new Uint8Array(5)))
                            .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
                            .join('')
                          setNewPeripheral((p) => ({ ...p, serial_number: `${prefix}-${hex}` }))
                        }}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreatePeripheral(false)}>Скасувати</Button>
                  <Button type="submit" disabled={createPeripheral.isPending}>
                    {createPeripheral.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Створити та підключити
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Software tab */}
        <TabsContent value="software">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cpu className="h-4 w-4" />
                Встановлене ПЗ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {softwareCount > 0 ? (
                <div className="space-y-2">
                  {software!.results.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.vendor && `${s.vendor} · `}{s.version}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">ПЗ не встановлено</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Документи
                </span>
                <label className="cursor-pointer">
                  <Input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const formData = new FormData()
                        formData.append('file', file)
                        formData.append('description', file.name)
                        uploadDocument.mutate({ equipmentId, formData })
                      }
                      e.target.value = ''
                    }}
                  />
                  <span className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                    <FileUp className="h-3.5 w-3.5" />
                    Завантажити
                  </span>
                </label>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentCount > 0 ? (
                <div className="space-y-2">
                  {(documents as Array<{ id: number; file: string; description: string; uploaded_at: string }>).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{doc.description || 'Документ'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(doc.uploaded_at).toLocaleDateString('uk-UA')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <a href={doc.file} target="_blank" rel="noopener noreferrer">
                          <Button size="icon" variant="ghost" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteDocument.mutate({ equipmentId, docId: doc.id })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Документів немає</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Історія змін
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Array.isArray(history) && history.length > 0 ? (
                <div className="space-y-3">
                  {history.slice(0, 50).map((entry: { history_id: number; history_date: string; history_user: string; history_type: string; changes?: Array<{ field: string; old: string; new: string }> }, idx: number) => (
                    <div key={entry.history_id || idx} className="flex gap-3 text-sm">
                      <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                        {new Date(entry.history_date).toLocaleString('uk-UA')}
                      </div>
                      <div>
                        <span className="font-medium">{entry.history_user || 'Система'}</span>
                        <span className="text-muted-foreground ml-1">
                          {entry.history_type === '+' ? 'створив' : entry.history_type === '~' ? 'змінив' : 'видалив'}
                        </span>
                        {entry.changes && entry.changes.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {entry.changes.map((c, ci) => (
                              <p key={ci} className="text-xs text-muted-foreground">
                                {c.field}: <span className="line-through">{c.old || '—'}</span> → <span className="font-medium text-foreground">{c.new || '—'}</span>
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Історії змін немає</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EquipmentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        equipment={equipment}
      />
    </div>
  )
}
