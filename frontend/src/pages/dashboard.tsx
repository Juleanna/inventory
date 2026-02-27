import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/analytics/stat-card'
import { CategoryChart } from '@/components/analytics/charts/category-chart'
import { StatusChart } from '@/components/analytics/charts/status-chart'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Monitor, CheckCircle, AlertTriangle, Wrench, Package, Clock } from 'lucide-react'
import { CATEGORY_LABELS, STATUS_LABELS } from '@/lib/constants'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner size="lg" />

  const categoryData = data?.by_category
    ? Object.entries(data.by_category).map(([key, value]) => ({
        name: CATEGORY_LABELS[key] || key,
        value: value as number,
      }))
    : []

  const statusData = data?.by_status
    ? Object.entries(data.by_status).map(([key, value]) => ({
        name: STATUS_LABELS[key] || key,
        value: value as number,
      }))
    : []

  return (
    <div>
      <PageHeader title="Дашборд" description="Огляд IT-інфраструктури" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Всього обладнання"
          value={data?.total_equipment || 0}
          icon={Monitor}
          color="blue"
        />
        <StatCard
          title="Працює"
          value={data?.working || 0}
          icon={CheckCircle}
          color="green"
          description={`${data?.total_equipment ? Math.round(((data?.working || 0) / data.total_equipment) * 100) : 0}% від загальної кількості`}
        />
        <StatCard
          title="Потребує ТО"
          value={data?.needs_maintenance || 0}
          icon={Wrench}
          color="orange"
        />
        <StatCard
          title="Гарантія закінчується"
          value={data?.warranty_expiring || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryData} />
        <StatusChart data={statusData} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Статуси обладнання</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: 'В ремонті', value: data?.repair || 0, icon: Wrench, bg: 'bg-red-500/10', color: 'text-red-600 dark:text-red-400' },
                { label: 'На обслуговуванні', value: data?.maintenance || 0, icon: Clock, bg: 'bg-amber-500/10', color: 'text-amber-600 dark:text-amber-400' },
                { label: 'На складі', value: data?.storage || 0, icon: Package, bg: 'bg-blue-500/10', color: 'text-blue-600 dark:text-blue-400' },
                { label: 'Списано', value: data?.disposed || 0, icon: AlertTriangle, bg: 'bg-gray-500/10', color: 'text-gray-600 dark:text-gray-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.bg}`}>
                      <item.icon className={`h-4 w-4 ${item.color}`} />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Останні дії</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data?.recent_activities?.length ? (
                data.recent_activities.slice(0, 5).map((activity, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
                    <div>
                      <span className="text-sm font-medium">{activity.equipment}</span>
                      <span className="text-sm text-muted-foreground"> — {activity.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{activity.date}</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Clock className="mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Немає останніх дій</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
