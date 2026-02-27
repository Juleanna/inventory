import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const ROUTE_LABELS: Record<string, string> = {
  '': 'Дашборд',
  equipment: 'Обладнання',
  maintenance: 'Обслуговування',
  schedule: 'Розклад',
  'spare-parts': 'Запчастини',
  suppliers: 'Постачальники',
  orders: 'Замовлення',
  passwords: 'Паролі',
  analytics: 'Аналітика',
  notifications: 'Сповіщення',
  settings: 'Налаштування',
}

export function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')
    const label = ROUTE_LABELS[segment] || (segment.match(/^\d+$/) ? `#${segment}` : segment)
    const isLast = index === segments.length - 1

    return { path, label, isLast }
  })

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link to="/" className="hover:text-foreground transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
