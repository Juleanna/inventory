import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/analytics/stat-card'
import { AlertListCard } from '@/components/dashboard/alert-list-card'
import { CategoryChart } from '@/components/analytics/charts/category-chart'
import { StatusChart } from '@/components/analytics/charts/status-chart'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import {
  Monitor, CheckCircle, Wrench, DollarSign, TrendingDown,
  Bell, Shield
} from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/constants'
import type { DashboardData } from '@/types'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner size="lg" />

  const d = data as DashboardData | undefined

  const ageData = d?.equipment_age_distribution
    ? Object.entries(d.equipment_age_distribution).map(([name, value]) => ({ name, value }))
    : []

  const locationData = d?.location_statistics?.map((s) => ({
    name: s.location || 'Не вказано',
    value: s.equipment_count,
  })) || []

  const departmentData = d?.department_statistics?.map((s) => ({
    name: s.department_name,
    value: s.equipment_count,
  })) || []

  const categoryBreakdown = d?.financial_overview?.category_breakdown?.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.count,
  })) || []

  const maintenanceAlerts = d?.maintenance_alerts?.needs_maintenance?.map((item) => ({
    id: item.id,
    name: item.name,
    serial_number: item.serial_number,
    location: item.location || 'Не вказано',
    detail: `${item.days_overdue} дн. прострочено`,
    detailColor: 'text-red-600 dark:text-red-400',
  })) || []

  const warrantyAlerts = d?.maintenance_alerts?.warranty_expiring?.map((item) => ({
    id: item.id,
    name: item.name,
    serial_number: item.serial_number,
    location: item.location || 'Не вказано',
    detail: item.warranty_until ? new Date(item.warranty_until).toLocaleDateString('uk-UA') : '',
    detailColor: 'text-orange-600 dark:text-orange-400',
  })) || []

  const formatCurrency = (val: number | undefined) => {
    if (!val) return '0 ₴'
    return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(val)
  }

  return (
    <div>
      <PageHeader title="Дашборд" description="Огляд IT-інфраструктури" />

      {/* Row 1: Equipment overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Всього обладнання"
          value={d?.equipment_overview?.total_equipment || 0}
          icon={Monitor}
          color="blue"
        />
        <StatCard
          title="Працює"
          value={`${d?.equipment_overview?.working_percentage?.toFixed(0) || 0}%`}
          icon={CheckCircle}
          color="green"
          description={`${d?.equipment_overview?.working_equipment || 0} од.`}
        />
        <StatCard
          title="В ремонті"
          value={d?.equipment_overview?.in_repair || 0}
          icon={Wrench}
          color="red"
        />
        <StatCard
          title="На обслуговуванні"
          value={d?.equipment_overview?.in_maintenance || 0}
          icon={Wrench}
          color="orange"
        />
      </div>

      {/* Row 2: Financial + notifications overview */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Загальна вартість"
          value={formatCurrency(d?.financial_overview?.total_purchase_value)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Поточна вартість"
          value={formatCurrency(d?.financial_overview?.current_depreciated_value)}
          icon={TrendingDown}
          color="blue"
        />
        <StatCard
          title="Амортизація"
          value={formatCurrency(d?.financial_overview?.depreciation_amount)}
          icon={TrendingDown}
          color="orange"
        />
        <StatCard
          title="Сповіщення"
          value={d?.notification_summary?.unread_count || 0}
          icon={Bell}
          color="red"
          description={d?.notification_summary?.urgent_count ? `${d.notification_summary.urgent_count} термінових` : undefined}
        />
      </div>

      {/* Row 3: Alert cards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AlertListCard
          title="Потребує обслуговування"
          icon={Wrench}
          count={d?.maintenance_alerts?.needs_maintenance_count || 0}
          items={maintenanceAlerts}
          emptyText="Все обладнання обслуговано"
        />
        <AlertListCard
          title="Гарантія закінчується"
          icon={Shield}
          count={d?.maintenance_alerts?.warranty_expiring_count || 0}
          items={warrantyAlerts}
          emptyText="Немає обладнання з гарантією, що закінчується"
        />
      </div>

      {/* Row 4: Age distribution + Location stats */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusChart data={ageData} title="Вік обладнання" />
        <CategoryChart data={locationData} title="За розташуванням" />
      </div>

      {/* Row 5: Department + Category breakdown */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StatusChart data={departmentData} title="За відділами" />
        <CategoryChart data={categoryBreakdown} title="За категоріями" />
      </div>
    </div>
  )
}
