import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Monitor,
  LayoutDashboard,
  Wrench,
  Package,
  KeyRound,
  BarChart3,
  Bell,
  Settings,
  Search,
} from 'lucide-react'

const PAGES = [
  { label: 'Дашборд', path: '/', icon: LayoutDashboard },
  { label: 'Обладнання', path: '/equipment', icon: Monitor },
  { label: 'Обслуговування', path: '/maintenance', icon: Wrench },
  { label: 'Розклад ТО', path: '/maintenance/schedule', icon: Wrench },
  { label: 'Запчастини', path: '/spare-parts', icon: Package },
  { label: 'Постачальники', path: '/spare-parts/suppliers', icon: Package },
  { label: 'Замовлення', path: '/spare-parts/orders', icon: Package },
  { label: 'Сховище паролів', path: '/passwords', icon: KeyRound },
  { label: 'Аналітика', path: '/analytics', icon: BarChart3 },
  { label: 'Сповіщення', path: '/notifications', icon: Bell },
  { label: 'Налаштування', path: '/settings', icon: Settings },
]

export function CommandSearch() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSelect = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Пошук...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
          Ctrl+K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Пошук сторінок..." />
        <CommandList>
          <CommandEmpty>Нічого не знайдено</CommandEmpty>
          <CommandGroup heading="Сторінки">
            {PAGES.map((page) => (
              <CommandItem
                key={page.path}
                onSelect={() => handleSelect(page.path)}
                className="flex items-center gap-2"
              >
                <page.icon className="h-4 w-4" />
                {page.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
