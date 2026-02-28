import { useSparePartsAnalytics } from '@/hooks/use-spare-parts'
import { StatCard } from '@/components/analytics/stat-card'
import { CategoryChart } from '@/components/analytics/charts/category-chart'
import { StatusChart } from '@/components/analytics/charts/status-chart'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Package, AlertTriangle, DollarSign, TrendingDown } from 'lucide-react'
import { SPARE_PART_STATUS_LABELS, MOVEMENT_TYPE_LABELS } from '@/lib/constants'

export function SparePartsAnalyticsSection() {
  const { data, isLoading } = useSparePartsAnalytics()

  if (isLoading) return <LoadingSpinner size="lg" />
  if (!data) return null

  const statusData = data.status_distribution?.map((s) => ({
    name: SPARE_PART_STATUS_LABELS[s.status] || s.status,
    value: s.count,
  })) || []

  const movementData = data.movement_stats?.map((m) => ({
    name: MOVEMENT_TYPE_LABELS[m.movement_type] || m.movement_type,
    value: m.total_quantity,
  })) || []

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Всього позицій"
          value={data.overview?.total_parts || 0}
          icon={Package}
          color="blue"
        />
        <StatCard
          title="Загальна вартість"
          value={`${Number(data.overview?.total_value || 0).toLocaleString('uk-UA')} грн`}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Мало на складі"
          value={data.overview?.low_stock_count || 0}
          icon={AlertTriangle}
          color="orange"
        />
        <StatCard
          title="Немає на складі"
          value={data.overview?.out_of_stock_count || 0}
          icon={TrendingDown}
          color="red"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <CategoryChart data={statusData} title="За статусом" />
        <StatusChart data={movementData} title="Рух запчастин" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {data.expensive_parts && data.expensive_parts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Найдорожчі запчастини</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead>Артикул</TableHead>
                    <TableHead className="text-right">Ціна</TableHead>
                    <TableHead className="text-right">Кількість</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expensive_parts.map((part, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell className="font-mono text-sm">{part.part_number}</TableCell>
                      <TableCell className="text-right">{Number(part.unit_cost).toLocaleString('uk-UA')} грн</TableCell>
                      <TableCell className="text-right">{part.quantity_in_stock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {data.top_suppliers && data.top_suppliers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Топ постачальники</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead className="text-right">Запчастин</TableHead>
                    <TableHead className="text-right">Рейтинг</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_suppliers.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">{s.parts_count}</TableCell>
                      <TableCell className="text-right">{Number(s.rating).toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
