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

interface MobileNavProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const location = useLocation()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            IT Inventory
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)]">
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
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
