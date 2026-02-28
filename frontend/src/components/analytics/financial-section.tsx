import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { StatCard } from '@/components/analytics/stat-card'
import { CategoryChart } from '@/components/analytics/charts/category-chart'
import { FinancialChart } from '@/components/analytics/charts/financial-chart'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, TrendingDown, Percent, BarChart3 } from 'lucide-react'
import { CATEGORY_LABELS } from '@/lib/constants'
import type { FinancialAnalyticsData } from '@/types'

export function FinancialSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'financial'],
    queryFn: () => analyticsApi.getFinancialAnalytics().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner size="lg" />

  const d = data as FinancialAnalyticsData | undefined

  const fmt = (val: number | undefined) => {
    if (!val) return '0 ₴'
    return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(val)
  }

  const categoryData = d?.category_expenses?.map((c) => ({
    name: CATEGORY_LABELS[c.category] || c.category,
    value: c.count,
  })) || []

  const yearlyData = d?.yearly_expenses?.map((y) => ({
    month: String(y.year),
    amount: y.total_spent,
  })) || []

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Загальна вартість"
          value={fmt(d?.summary?.total_purchase_value)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Поточна вартість"
          value={fmt(d?.summary?.current_value)}
          icon={DollarSign}
          color="blue"
        />
        <StatCard
          title="Амортизація"
          value={fmt(d?.summary?.depreciation_amount)}
          icon={TrendingDown}
          color="orange"
        />
        <StatCard
          title="% амортизації"
          value={`${d?.summary?.depreciation_percentage?.toFixed(1) || 0}%`}
          icon={Percent}
          color="red"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FinancialChart data={yearlyData} title="Витрати по роках" />
        <CategoryChart data={categoryData} title="Витрати за категоріями" />
      </div>

      {d?.expensive_equipment && d.expensive_equipment.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Найдорожче обладнання
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Категорія</TableHead>
                  <TableHead>Дата придбання</TableHead>
                  <TableHead className="text-right">Вартість</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.expensive_equipment.slice(0, 10).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[item.category] || item.category}</TableCell>
                    <TableCell>
                      {item.purchase_date
                        ? new Date(item.purchase_date).toLocaleDateString('uk-UA')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmt(item.purchase_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
