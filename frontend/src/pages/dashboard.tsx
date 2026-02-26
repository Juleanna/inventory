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
        />
        <StatCard
          title="Працює"
          value={data?.working || 0}
          icon={CheckCircle}
          description={`${data?.total_equipment ? Math.round(((data?.working || 0) / data.total_equipment) * 100) : 0}% від загальної кількості`}
        />
        <StatCard
          title="Потребує ТО"
          value={data?.needs_maintenance || 0}
          icon={Wrench}
        />
        <StatCard
          title="Гарантія закінчується"
          value={data?.warranty_expiring || 0}
          icon={AlertTriangle}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CategoryChart data={categoryData} />
        <StatusChart data={statusData} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Статуси обладнання</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'В ремонті', value: data?.repair || 0, icon: Wrench, color: 'text-red-500' },
                { label: 'На обслуговуванні', value: data?.maintenance || 0, icon: Clock, color: 'text-yellow-500' },
                { label: 'На складі', value: data?.storage || 0, icon: Package, color: 'text-blue-500' },
                { label: 'Списано', value: data?.disposed || 0, icon: AlertTriangle, color: 'text-gray-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <Badge variant="secondary">{item.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Останні дії</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.recent_activities?.length ? (
                data.recent_activities.slice(0, 5).map((activity, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{activity.equipment}</span>
                      <span className="text-muted-foreground"> — {activity.action}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.date}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Немає останніх дій</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
