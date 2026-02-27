import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  Monitor,
  AppWindow,
  Usb,
  FileKey,
  Wrench,
  Package,
  KeyRound,
  Users,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react'

const mainNav = [
  { path: '/', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/equipment', label: 'Обладнання', icon: Monitor },
  { path: '/software', label: 'Програми', icon: AppWindow },
  { path: '/peripherals', label: 'Периферія', icon: Usb },
  { path: '/licenses', label: 'Ліцензії', icon: FileKey },
]

const operationsNav = [
  { path: '/maintenance', label: 'Обслуговування', icon: Wrench },
  { path: '/spare-parts', label: 'Запчастини', icon: Package },
]

const systemNav = [
  { path: '/users', label: 'Користувачі', icon: Users },
  { path: '/passwords', label: 'Паролі', icon: KeyRound },
  { path: '/analytics', label: 'Аналітика', icon: BarChart3 },
  { path: '/notifications', label: 'Сповіщення', icon: Bell },
  { path: '/settings', label: 'Налаштування', icon: Settings },
]

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const location = useLocation()

  const renderNavItem = (item: { path: string; label: string; icon: typeof Monitor }) => {
    const isActive =
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path)

    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={() => onOpenChange(false)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
        <span>{item.label}</span>
      </Link>
    )
  }

  const renderSection = (label: string, items: typeof mainNav) => (
    <div>
      <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <div className="space-y-0.5">{items.map(renderNavItem)}</div>
    </div>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Monitor className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">IT Inventory</span>
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="space-y-5 p-3 pt-4">
            {renderSection('Основне', mainNav)}
            {renderSection('Операції', operationsNav)}
            {renderSection('Система', systemNav)}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
