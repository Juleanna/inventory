import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useState } from 'react'

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

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const renderNavItem = (item: { path: string; label: string; icon: typeof Monitor }) => {
    const isActive =
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path)

    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm dark:bg-primary/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    )
  }

  const renderSection = (label: string, items: typeof mainNav) => (
    <div>
      {!collapsed && (
        <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          {label}
        </p>
      )}
      {collapsed && <div className="mx-auto my-2 h-px w-6 bg-border" />}
      <div className="space-y-0.5">{items.map(renderNavItem)}</div>
    </div>
  )

  return (
    <aside
      className={cn(
        'relative hidden h-screen border-r bg-card transition-all duration-300 lg:block',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2.5 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Monitor className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight">IT Inventory</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Monitor className="h-4 w-4 text-primary-foreground" />
            </div>
          </Link>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full bg-card shadow-md"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="space-y-5 p-3 pt-4">
          {renderSection('Основне', mainNav)}
          {renderSection('Операції', operationsNav)}
          {renderSection('Система', systemNav)}
        </div>
      </ScrollArea>
    </aside>
  )
}
