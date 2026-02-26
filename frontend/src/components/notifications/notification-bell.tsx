import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUnreadCount } from '@/hooks/use-notifications'

export function NotificationBell() {
  const { data: unreadCount } = useUnreadCount()

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link to="/notifications">
        <Bell className="h-4 w-4" />
        {unreadCount && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
