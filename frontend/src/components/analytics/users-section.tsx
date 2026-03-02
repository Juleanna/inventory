import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '@/api/analytics'
import { StatCard } from './stat-card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, UserCheck, Activity, Shield } from 'lucide-react'

export function UsersSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'users'],
    queryFn: () => analyticsApi.getUserAnalytics().then((r) => r.data),
  })

  if (isLoading) return <LoadingSpinner size="lg" />
  if (!data) return null

  const departmentData = data.by_department ? Object.entries(data.by_department).map(([name, value]) => ({ name, value })) : []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Всього користувачів" value={data.total_users || 0} icon={Users} />
        <StatCard title="Активних" value={data.active_users || 0} icon={UserCheck} />
        <StatCard title="З обладнанням" value={data.users_with_equipment || 0} icon={Activity} />
        <StatCard title="Адміністраторів" value={data.admin_users || 0} icon={Shield} />
      </div>

      {departmentData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Користувачі за відділами</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
