import { useQuery } from '@tanstack/react-query'
import { activityLogApi, type ActivityLogFilters } from '@/api/activity-log'

export function useActivityLog(filters?: ActivityLogFilters) {
  return useQuery({
    queryKey: ['activity-log', filters],
    queryFn: () => activityLogApi.list(filters),
  })
}
