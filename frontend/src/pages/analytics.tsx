import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { StatCard } from '@/components/analytics/stat-card'
import { CategoryChart } from '@/components/analytics/charts/category-chart'
import { StatusChart } from '@/components/analytics/charts/status-chart'
import { TrendChart } from '@/components/analytics/charts/trend-chart'
import { FinancialChart } from '@/components/analytics/charts/financial-chart'
import { DollarSign, Monitor, Clock, Wrench } from 'lucide-react'

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'equipment'],
    queryFn: () => analyticsApi.getEquipmentAnalytics().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner size="lg" />

  return (
    <div>
      <PageHeader title="Аналітика" description="Детальний аналіз IT-інфраструктури" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Загальна вартість"
          value={data?.total_value ? `${Math.round(data.total_value).toLocaleString('uk-UA')} грн` : '0 грн'}
          icon={DollarSign}
        />
        <StatCard
          title="Середній вік"
          value={data?.avg_age ? `${data.avg_age.toFixed(1)} років` : 'N/A'}
          icon={Clock}
        />
        <StatCard
          title="Запитів на ТО"
          value={data?.maintenance_stats?.total_requests || 0}
          icon={Wrench}
          description={`Завершено: ${data?.maintenance_stats?.completed || 0}`}
        />
        <StatCard
          title="Очікує ТО"
          value={data?.maintenance_stats?.pending || 0}
          icon={Monitor}
          description={data?.maintenance_stats?.avg_resolution_days
            ? `Сер. час: ${data.maintenance_stats.avg_resolution_days.toFixed(1)} днів`
            : undefined
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data?.equipment_by_category && (
          <CategoryChart data={data.equipment_by_category} title="Обладнання за категоріями" />
        )}
        {data?.equipment_by_status && (
          <StatusChart data={data.equipment_by_status} title="Обладнання за статусами" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data?.monthly_purchases && (
          <TrendChart data={data.monthly_purchases} title="Динаміка закупівель" />
        )}
        {data?.monthly_purchases && (
          <FinancialChart
            data={data.monthly_purchases.map((m) => ({ month: m.month, amount: m.amount || 0 }))}
            title="Фінансова динаміка"
          />
        )}
      </div>

      {data?.equipment_by_location && data.equipment_by_location.length > 0 && (
        <div className="mt-6">
          <StatusChart data={data.equipment_by_location} title="Обладнання за локаціями" />
        </div>
      )}
    </div>
  )
}
