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

const navItems = [
  { path: '/', label: 'Дашборд', icon: LayoutDashboard },
  { path: '/equipment', label: 'Обладнання', icon: Monitor },
  { path: '/software', label: 'Програми', icon: AppWindow },
  { path: '/peripherals', label: 'Периферія', icon: Usb },
  { path: '/licenses', label: 'Ліцензії', icon: FileKey },
  { path: '/maintenance', label: 'Обслуговування', icon: Wrench },
  { path: '/spare-parts', label: 'Запчастини', icon: Package },
  { path: '/users', label: 'Користувачі', icon: Users },
  { path: '/passwords', label: 'Паролі', icon: KeyRound },
  { path: '/analytics', label: 'Аналітика', icon: BarChart3 },
  { path: '/notifications', label: 'Сповіщення', icon: Bell },
  { path: '/settings', label: 'Налаштування', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'relative hidden h-screen border-r bg-card transition-all duration-300 lg:block',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Monitor className="h-6 w-6 text-primary" />
            <span className="text-lg">IT Inventory</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto">
            <Monitor className="h-6 w-6 text-primary" />
          </Link>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <nav className="space-y-1 p-2">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>
    </aside>
  )
}
