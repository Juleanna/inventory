import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEquipmentList } from '@/hooks/use-equipment'
import { useSoftwareList } from '@/hooks/use-software'
import { usePeripheralsList } from '@/hooks/use-peripherals'
import { useSparePartsList } from '@/hooks/use-spare-parts'
import { useDebounce } from '@/hooks/use-debounce'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Monitor, AppWindow, Usb, FileKey, Wrench, Package, KeyRound, Users, Search,
  LayoutDashboard, BarChart3, Bell, Settings, HardDriveDownload, FileText,
  ClipboardList, MapPin, ScanLine, Calculator, Copy, TrendingUp, Zap, Webhook,
} from 'lucide-react'

const SECTIONS = [
  { path: '/', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/equipment', label: 'Обладнання', icon: Monitor },
  { path: '/software', label: 'Програми', icon: AppWindow },
  { path: '/peripherals', label: 'Периферія', icon: Usb },
  { path: '/licenses', label: 'Ліцензії', icon: FileKey },
  { path: '/maintenance', label: 'Обслуговування', icon: Wrench },
  { path: '/spare-parts', label: 'Запчастини', icon: Package },
  { path: '/contracts', label: 'Договори', icon: FileText },
  { path: '/passwords', label: 'Паролі', icon: KeyRound },
  { path: '/users', label: 'Користувачі', icon: Users },
  { path: '/analytics', label: 'Аналітика', icon: BarChart3 },
  { path: '/qr-scanner', label: 'QR Сканер', icon: ScanLine },
  { path: '/equipment/compare', label: 'Порівняння обладнання', icon: Copy },
  { path: '/equipment/templates', label: 'Шаблони обладнання', icon: ClipboardList },
  { path: '/location-map', label: 'Карта обладнання', icon: MapPin },
  { path: '/depreciation', label: 'Амортизаційний звіт', icon: Calculator },
  { path: '/activity-log', label: 'Журнал дій', icon: ClipboardList },
  { path: '/analytics/advanced', label: 'Розширена аналітика', icon: TrendingUp },
  { path: '/automation-rules', label: 'Автоматизація', icon: Zap },
  { path: '/webhooks', label: 'Вебхуки', icon: Webhook },
  { path: '/notifications', label: 'Сповіщення', icon: Bell },
  { path: '/backups', label: 'Бекапи', icon: HardDriveDownload },
  { path: '/settings', label: 'Налаштування', icon: Settings },
]

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 200)

  const searchParams = debouncedQuery ? { search: debouncedQuery, page_size: 5 } : undefined

  const { data: equipmentData } = useEquipmentList(searchParams)
  const { data: softwareData } = useSoftwareList(
    debouncedQuery ? { search: debouncedQuery, page_size: 5 } : undefined
  )
  const { data: peripheralsData } = usePeripheralsList(
    debouncedQuery ? { search: debouncedQuery, page_size: 5 } : undefined
  )
  const { data: sparePartsData } = useSparePartsList(
    debouncedQuery ? { search: debouncedQuery } : undefined
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = useCallback((path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }, [navigate])

  const filteredSections = query
    ? SECTIONS.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()))
    : SECTIONS

  const hasEquipment = debouncedQuery && equipmentData?.results && equipmentData.results.length > 0
  const hasSoftware = debouncedQuery && softwareData?.results && softwareData.results.length > 0
  const hasPeripherals = debouncedQuery && peripheralsData?.results && peripheralsData.results.length > 0
  const hasSpareParts = debouncedQuery && sparePartsData?.results && sparePartsData.results.length > 0
  const hasAnyResults = hasEquipment || hasSoftware || hasPeripherals || hasSpareParts

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Пошук...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-medium">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Пошук по всій системі..."
              className="border-0 shadow-none focus-visible:ring-0 h-11"
              autoFocus
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredSections.length > 0 && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Сторінки</p>
                {filteredSections.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {hasEquipment && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Обладнання</p>
                {equipmentData!.results.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => handleSelect(`/equipment/${eq.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <p>{eq.name}</p>
                      <p className="text-xs text-muted-foreground">{eq.serial_number}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasSoftware && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Програми</p>
                {softwareData!.results.map((sw) => (
                  <button
                    key={sw.id}
                    onClick={() => handleSelect('/software')}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <AppWindow className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <p>{sw.name}</p>
                      <p className="text-xs text-muted-foreground">{sw.version} {sw.vendor && `— ${sw.vendor}`}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasPeripherals && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Периферія</p>
                {peripheralsData!.results.map((dev) => (
                  <button
                    key={dev.id}
                    onClick={() => handleSelect('/peripherals')}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Usb className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <p>{dev.name}</p>
                      <p className="text-xs text-muted-foreground">{dev.serial_number}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {hasSpareParts && (
              <div className="mb-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Запчастини</p>
                {sparePartsData!.results.slice(0, 5).map((part) => (
                  <button
                    key={part.id}
                    onClick={() => handleSelect('/spare-parts')}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <p>{part.name}</p>
                      <p className="text-xs text-muted-foreground">{part.part_number} — {part.manufacturer}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query && filteredSections.length === 0 && !hasAnyResults && (
              <p className="py-6 text-center text-sm text-muted-foreground">Нiчого не знайдено</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
