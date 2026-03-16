import { useQuery } from '@tanstack/react-query'
import { advancedAnalyticsApi } from '@/api/advanced-analytics'
import { useAuthStore } from '@/stores/auth-store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { TrendingUp, Calendar, DollarSign, AlertTriangle, Cpu, Clock } from 'lucide-react'

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

const CATEGORY_LABELS: Record<string, string> = {
  PC: 'ПК', WORK: 'Робоча станція', SRV: 'Сервер', PRN: 'Принтер',
  LAPTOP: 'Ноутбук', TABLET: 'Планшет', PHONE: 'Телефон',
  MONITOR: 'Монітор', NETWORK: 'Мережеве', OTH: 'Інше',
}

function StatCard({ icon: Icon, title, value, subtitle, color }: {
  icon: typeof TrendingUp; title: string; value: string | number; subtitle?: string; color: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-${color}-500/10`}>
            <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        ))}
      </div>
    </div>
  )
}

export default function AdvancedAnalyticsPage() {
  const { isAuthenticated } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['advanced-analytics'],
    queryFn: () => advancedAnalyticsApi.get().then(r => r.data),
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  })

  if (isLoading || !data) return (
    <div>
      <PageHeader title="Розширена аналітика" description="Прогнозування та тренди обладнання" />
      <LoadingSkeleton />
    </div>
  )

  const pieData = data.cost_by_category.map(c => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.total_cost,
    count: c.count,
  }))

  return (
    <div>
      <PageHeader title="Розширена аналітика" description="Прогнозування та тренди обладнання" />

      {/* Summary stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Cpu}
          title="Активне обладнання"
          value={data.summary.total_active_equipment}
          color="blue"
        />
        <StatCard
          icon={DollarSign}
          title="Середні витрати/міс"
          value={`${data.summary.avg_monthly_cost.toLocaleString('uk-UA')} ₴`}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          title="Старше 5 років"
          value={data.summary.equipment_over_5_years}
          subtitle="потребує оновлення"
          color="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" /> Розподіл за віком
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.age_distribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}
                  formatter={(value: number | undefined) => { const v = value ?? 0; return [`${v} од.`, 'Кількість'] }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Acquisitions Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Тренд закупівель (24 міс.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthly_acquisitions}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={10} interval={3} />
                <YAxis yAxisId="count" fontSize={12} orientation="left" />
                <YAxis yAxisId="cost" fontSize={12} orientation="right" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}
                />
                <Line yAxisId="count" type="monotone" dataKey="count" stroke="#3b82f6" name="Кількість" strokeWidth={2} dot={false} />
                <Line yAxisId="cost" type="monotone" dataKey="total_cost" stroke="#10b981" name="Вартість ₴" strokeWidth={2} dot={false} />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost by Category Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" /> Витрати за категоріями
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => { const v = value ?? 0; return [`${v.toLocaleString('uk-UA')} ₴`, 'Вартість'] }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lifecycle Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Прогноз життєвого циклу (12 міс.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.lifecycle_forecast}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={10} />
                <YAxis fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}
                />
                <Area type="monotone" dataKey="expiring" stackId="1" stroke="#ef4444" fill="#ef444433" name="Закінчується термін" />
                <Area type="monotone" dataKey="warranty_ending" stackId="1" stroke="#f59e0b" fill="#f59e0b33" name="Закінчується гарантія" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" /> Прогноз витрат (6 міс.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.cost_forecast}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number | undefined) => { const v = value ?? 0; return [`${v.toLocaleString('uk-UA')} ₴`, 'Прогноз'] }} />
                <Bar dataKey="predicted_cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Прогноз ₴" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Maintenance Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Частота обслуговування
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-muted-foreground">Категорія</th>
                    {data.maintenance_heatmap[0]?.months.map(m => (
                      <th key={m.month} className="px-2 py-1 text-center font-medium text-muted-foreground text-xs">
                        {m.month.slice(5)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.maintenance_heatmap.map(row => (
                    <tr key={row.category}>
                      <td className="px-2 py-1 font-medium">{CATEGORY_LABELS[row.category] || row.category}</td>
                      {row.months.map(m => {
                        const intensity = Math.min(m.count / 5, 1)
                        return (
                          <td key={m.month} className="px-2 py-1 text-center">
                            <Badge
                              variant="secondary"
                              className="w-8"
                              style={{
                                backgroundColor: m.count === 0
                                  ? 'hsl(var(--muted))'
                                  : `rgba(59, 130, 246, ${0.2 + intensity * 0.6})`,
                                color: intensity > 0.5 ? 'white' : undefined,
                              }}
                            >
                              {m.count}
                            </Badge>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
