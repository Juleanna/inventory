import { useMaintenanceSchedules } from '@/hooks/use-maintenance'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'

export default function MaintenanceSchedulePage() {
  const { data, isLoading } = useMaintenanceSchedules()

  return (
    <div>
      <PageHeader
        title="Розклад обслуговування"
        description="Планові технічні обслуговування"
        actions={
          <Button variant="outline" asChild>
            <Link to="/maintenance">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title="Розклад порожній"
          description="Немає запланованих обслуговувань"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {schedule.equipment_details?.name || `Обладнання #${schedule.equipment}`}
                  </CardTitle>
                  <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                    {schedule.is_active ? 'Активний' : 'Неактивний'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Тип</span>
                  <span>{schedule.schedule_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Інтервал</span>
                  <span>{schedule.interval_days} днів</span>
                </div>
                {schedule.next_due && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Наступне</span>
                    <span className="font-medium">{schedule.next_due}</span>
                  </div>
                )}
                {schedule.last_performed && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Останнє</span>
                    <span>{schedule.last_performed}</span>
                  </div>
                )}
                {schedule.notes && (
                  <p className="text-xs text-muted-foreground pt-2">{schedule.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
