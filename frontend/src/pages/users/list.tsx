import { useState } from 'react'
import { useUsersList } from '@/hooks/use-users'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users, Mail, Phone } from 'lucide-react'
import { DEPARTMENT_LABELS, POSITION_LABELS } from '@/lib/constants'

export default function UsersListPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useUsersList({
    page,
    search: debouncedSearch || undefined,
    department: department || undefined,
    is_active: 'true',
  })
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Користувачі"
        description={`Всього: ${data?.count || 0} користувачів`}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Пошук за ім'ям, email, телефоном..."
          className="sm:w-80"
        />
        <Select value={department} onValueChange={(v) => { setDepartment(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Всі відділи" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі відділи</SelectItem>
            {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Користувачів не знайдено"
          description="Немає користувачів з обраними фільтрами"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Користувач</TableHead>
                  <TableHead className="hidden md:table-cell">Відділ</TableHead>
                  <TableHead className="hidden md:table-cell">Посада</TableHead>
                  <TableHead className="hidden lg:table-cell">Контакти</TableHead>
                  <TableHead className="hidden lg:table-cell">Локація</TableHead>
                  <TableHead className="w-24">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((user) => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
                  const dept = user.department ? (DEPARTMENT_LABELS[user.department] || user.custom_department || user.department) : '—'
                  const pos = user.position ? (POSITION_LABELS[user.position] || user.custom_position || user.position) : '—'
                  const location = [user.office_location, user.room_number].filter(Boolean).join(', ')

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{fullName || user.username}</span>
                          {fullName && (
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{dept}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {pos}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {user.email && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {user.email}
                            </div>
                          )}
                          {user.phone && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {location || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Активний' : 'Неактивний'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Сторінка {page} з {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Попередня</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Наступна</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
