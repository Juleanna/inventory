import { useState } from 'react'
import { useTemplates, useCreateTemplate, useDeleteTemplate, useCreateFromTemplate } from '@/hooks/use-templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { ClipboardList, Plus, Trash2, Monitor, Cpu, HardDrive, MemoryStick } from 'lucide-react'

const CATEGORIES: Record<string, string> = {
  PC: 'Стаціонарний ПК', WORK: 'Робоча станція', SRV: 'Сервер', PRN: 'Принтер',
  LAPTOP: 'Ноутбук', TABLET: 'Планшет', PHONE: 'Телефон', MONITOR: 'Монітор',
  NETWORK: 'Мережеве обладнання', OTH: 'Інше',
}

export default function EquipmentTemplatesPage() {
  const { data: templates, isLoading } = useTemplates()
  const createMutation = useCreateTemplate()
  const deleteMutation = useDeleteTemplate()
  const createFromMutation = useCreateFromTemplate()

  const [createOpen, setCreateOpen] = useState(false)
  const [useTemplateId, setUseTemplateId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [overrides, setOverrides] = useState({ name: '', serial_number: '', inventory_number: '', location: '' })

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    fd.forEach((v, k) => { if (v) data[k] = v as string })
    createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) })
  }

  const handleUseTemplate = () => {
    if (useTemplateId) {
      createFromMutation.mutate(
        { id: useTemplateId, overrides },
        { onSuccess: () => { setUseTemplateId(null); setOverrides({ name: '', serial_number: '', inventory_number: '', location: '' }) } }
      )
    }
  }

  const selectedTemplate = templates?.find(t => t.id === useTemplateId)

  return (
    <div>
      <PageHeader title="Шаблони обладнання" description="Типові конфігурації для швидкого створення обладнання">
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Новий шаблон</Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(tmpl => (
            <Card key={tmpl.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{tmpl.name}</CardTitle>
                  <Badge variant="secondary">{CATEGORIES[tmpl.category] || tmpl.category}</Badge>
                </div>
                {tmpl.description && <p className="text-xs text-muted-foreground mt-1">{tmpl.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {tmpl.manufacturer && <span>{tmpl.manufacturer}</span>}
                  {tmpl.model_name && <span>{tmpl.model_name}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tmpl.cpu && <Badge variant="outline" className="text-[10px] gap-1"><Cpu className="h-2.5 w-2.5" />{tmpl.cpu}</Badge>}
                  {tmpl.ram && <Badge variant="outline" className="text-[10px] gap-1"><MemoryStick className="h-2.5 w-2.5" />{tmpl.ram}</Badge>}
                  {tmpl.storage && <Badge variant="outline" className="text-[10px] gap-1"><HardDrive className="h-2.5 w-2.5" />{tmpl.storage}</Badge>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" onClick={() => setUseTemplateId(tmpl.id)}>
                    <Monitor className="mr-1.5 h-3.5 w-3.5" />Створити
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(tmpl.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-1">Немає шаблонів</p>
            <p className="text-sm text-muted-foreground mb-4">Створіть шаблон для швидкого додавання обладнання</p>
            <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Створити шаблон</Button>
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>Новий шаблон</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Назва *</Label><Input name="name" required /></div>
              <div className="space-y-1">
                <Label className="text-xs">Категорія *</Label>
                <select name="category" required className="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm">
                  {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Опис</Label><Textarea name="description" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Виробник</Label><Input name="manufacturer" /></div>
              <div className="space-y-1"><Label className="text-xs">Модель</Label><Input name="model_name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Процесор</Label><Input name="cpu" /></div>
              <div className="space-y-1"><Label className="text-xs">RAM</Label><Input name="ram" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Накопичувач</Label><Input name="storage" /></div>
              <div className="space-y-1"><Label className="text-xs">Відеокарта</Label><Input name="gpu" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">ОС</Label><Input name="operating_system" /></div>
              <div className="space-y-1"><Label className="text-xs">Локація за замовч.</Label><Input name="default_location" /></div>
            </div>
            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Скасувати</Button>
              <Button type="submit" disabled={createMutation.isPending}>Створити</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Use Template Dialog */}
      <Dialog open={useTemplateId !== null} onOpenChange={() => setUseTemplateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Створити обладнання з шаблону</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-3">
                <p className="font-medium">{selectedTemplate.name}</p>
                <p className="text-xs text-muted-foreground">{CATEGORIES[selectedTemplate.category]} | {selectedTemplate.manufacturer} {selectedTemplate.model_name}</p>
              </div>
              <div className="space-y-1"><Label className="text-xs">Назва обладнання *</Label><Input value={overrides.name} onChange={e => setOverrides(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label className="text-xs">Серійний номер *</Label><Input value={overrides.serial_number} onChange={e => setOverrides(p => ({ ...p, serial_number: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Інвентарний номер</Label><Input value={overrides.inventory_number} onChange={e => setOverrides(p => ({ ...p, inventory_number: e.target.value }))} /></div>
                <div className="space-y-1"><Label className="text-xs">Локація</Label><Input value={overrides.location} onChange={e => setOverrides(p => ({ ...p, location: e.target.value }))} placeholder={selectedTemplate.default_location} /></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseTemplateId(null)}>Скасувати</Button>
            <Button onClick={handleUseTemplate} disabled={createFromMutation.isPending || !overrides.name || !overrides.serial_number}>
              Створити обладнання
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити шаблон?</AlertDialogTitle>
            <AlertDialogDescription>Це не вплине на вже створене обладнання.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteMutation.mutate(deleteId); setDeleteId(null) }} className="bg-destructive text-destructive-foreground">Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
