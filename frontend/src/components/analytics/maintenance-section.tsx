import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { StatCard } from './stat-card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Wrench, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function MaintenanceSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'maintenance'],
    queryFn: () => analyticsApi.getMaintenanceAnalytics().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner size="lg" />
  if (!data) return null

  const statusData = data.by_status ? Object.entries(data.by_status).map(([name, value]) => ({ name, value })) : []
  const typeData = data.by_type ? Object.entries(data.by_type).map(([name, value]) => ({ name, value })) : []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всього запитів" value={data.total_requests || 0} icon={Wrench} />
        <StatCard title="Завершено" value={data.completed || 0} icon={CheckCircle} />
        <StatCard title="В процесі" value={data.in_progress || 0} icon={Clock} />
        <StatCard title="Сер. час (днів)" value={data.avg_resolution_days?.toFixed(1) || 'N/A'} icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {statusData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">За статусом</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {typeData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">За типом</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
