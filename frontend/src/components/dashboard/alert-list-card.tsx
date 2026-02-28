import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AlertItem {
  id: number
  name: string
  serial_number: string
  location: string
  detail: string
  detailColor?: string
}

interface AlertListCardProps {
  title: string
  icon: LucideIcon
  count: number
  items: AlertItem[]
  emptyText?: string
}

export function AlertListCard({ title, icon: Icon, count, items, emptyText = 'Немає сповіщень' }: AlertListCardProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
          {count > 0 && (
            <Badge variant="secondary">{count}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>
        ) : (
          <div className="space-y-1">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/equipment/${item.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.serial_number} · {item.location}</p>
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ml-3 ${item.detailColor || 'text-muted-foreground'}`}>
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
