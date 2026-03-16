import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/shared/page-header'
import { Copy, X, Search, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { Equipment } from '@/types'

const COMPARE_FIELDS = [
  { group: 'Основне', fields: [
    { key: 'name', label: 'Назва' },
    { key: 'category', label: 'Категорія' },
    { key: 'model', label: 'Модель' },
    { key: 'manufacturer', label: 'Виробник' },
    { key: 'serial_number', label: 'Серійний номер' },
  ]},
  { group: 'Технічні характеристики', fields: [
    { key: 'cpu', label: 'Процесор' },
    { key: 'ram', label: "Оперативна пам'ять" },
    { key: 'storage', label: 'Накопичувач' },
    { key: 'gpu', label: 'Відеокарта' },
    { key: 'operating_system', label: 'ОС' },
    { key: 'motherboard', label: 'Материнська плата' },
  ]},
  { group: 'Мережа', fields: [
    { key: 'mac_address', label: 'MAC' },
    { key: 'ip_address', label: 'IP' },
    { key: 'hostname', label: 'Hostname' },
  ]},
  { group: 'Фінансове', fields: [
    { key: 'purchase_price', label: 'Ціна покупки' },
    { key: 'depreciation_rate', label: 'Норма амортизації (%)' },
    { key: 'purchase_date', label: 'Дата покупки' },
  ]},
  { group: 'Стан', fields: [
    { key: 'status', label: 'Статус' },
    { key: 'priority', label: 'Пріоритет' },
    { key: 'warranty_until', label: 'Гарантія до' },
  ]},
  { group: 'Розташування', fields: [
    { key: 'location', label: 'Локація' },
    { key: 'building', label: 'Будівля' },
    { key: 'floor', label: 'Поверх' },
    { key: 'room', label: 'Кімната' },
  ]},
]

export default function EquipmentComparePage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const { data: searchResults } = useQuery({
    queryKey: ['equipment-search', searchQuery],
    queryFn: () => apiClient.get('/equipment/', { params: { search: searchQuery, page_size: 8 } }).then(r => r.data),
    enabled: searchQuery.length >= 2,
  })

  const { data: compareData } = useQuery({
    queryKey: ['equipment-compare', selectedIds],
    queryFn: () => Promise.all(selectedIds.map(id => apiClient.get<Equipment>(`/equipment/${id}/`).then(r => r.data))),
    enabled: selectedIds.length > 0,
  })

  const addEquipment = (id: number) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id])
      setSearchQuery('')
    }
  }

  const removeEquipment = (id: number) => {
    setSelectedIds(selectedIds.filter(i => i !== id))
  }

  const items = compareData || []
  const allValues = (key: string) => items.map(item => (item as unknown as Record<string, unknown>)[key])
  const hasDifference = (key: string) => {
    const vals = allValues(key).map(v => v ?? '')
    return new Set(vals.map(String)).size > 1
  }

  return (
    <div>
      <PageHeader title="Порівняння обладнання" description="Оберіть до 4 одиниць для порівняння" />

      {/* Search & Selected */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {items.map(eq => (
              <Badge key={eq.id} variant="secondary" className="text-sm py-1 px-3 gap-1.5">
                {eq.name}
                <button onClick={() => removeEquipment(eq.id)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            ))}
            {selectedIds.length < 4 && (
              <div className="relative flex-1 min-w-[250px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Пошук обладнання для додавання..."
                  className="pl-8"
                />
                {searchQuery.length >= 2 && searchResults?.results && (
                  <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                    {searchResults.results
                      .filter((eq: Equipment) => !selectedIds.includes(eq.id))
                      .slice(0, 6)
                      .map((eq: Equipment) => (
                        <button
                          key={eq.id}
                          onClick={() => addEquipment(eq.id)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{eq.name}</span>
                          <span className="text-xs text-muted-foreground">{eq.serial_number}</span>
                        </button>
                      ))}
                    {searchResults.results.length === 0 && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">Не знайдено</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Обрано {selectedIds.length} з 4</p>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {items.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] sticky left-0 bg-card z-10">Параметр</TableHead>
                  {items.map(eq => (
                    <TableHead key={eq.id} className="min-w-[200px]">{eq.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARE_FIELDS.map(group => (
                  <>
                    <TableRow key={group.group}>
                      <TableCell colSpan={items.length + 1} className="bg-muted/50 font-semibold text-xs uppercase tracking-wider">
                        {group.group}
                      </TableCell>
                    </TableRow>
                    {group.fields.map(field => {
                      const isDiff = hasDifference(field.key)
                      return (
                        <TableRow key={field.key}>
                          <TableCell className="font-medium text-sm sticky left-0 bg-card z-10">{field.label}</TableCell>
                          {items.map(eq => {
                            const val = (eq as unknown as Record<string, unknown>)[field.key]
                            const display = val === null || val === undefined || val === '' ? '—' : String(val)
                            return (
                              <TableCell key={eq.id} className={`text-sm ${isDiff ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}`}>
                                {display}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Copy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-1">Оберіть обладнання для порівняння</p>
            <p className="text-sm text-muted-foreground">Скористайтесь пошуком вище, щоб додати до 4 одиниць</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
