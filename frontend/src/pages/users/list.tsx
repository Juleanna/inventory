import { useState, useCallback, useRef, useEffect } from 'react'
import {
  useUsersList, useDeactivateUser, useDeleteUser, useBulkUserAction,
  useUsersStats, useUserEquipment, useUserHistory, useUpdateUser, useImportUsers,
} from '@/hooks/use-users'
import { useDebounce } from '@/hooks/use-debounce'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ListPagination } from '@/components/shared/list-pagination'
import { UserFormDialog } from '@/components/users/user-form'
import { StatCard } from '@/components/analytics/stat-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Users, Mail, Phone, Plus, MoreHorizontal, Pencil, UserX, Trash2,
  ArrowUp, ArrowDown, ArrowUpDown, X, Download, Monitor, MapPin,
  Calendar, Briefcase, CheckCircle2, XCircle, UserCheck, Upload,
  UserPlus, UserMinus, Settings2, History, Clock,
} from 'lucide-react'
import {
  DEPARTMENT_LABELS, POSITION_LABELS, EMPLOYMENT_TYPE_LABELS,
  STATUS_LABELS, CATEGORY_LABELS,
} from '@/lib/constants'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import type { User } from '@/types'

type SortField = 'first_name' | 'department' | 'position' | 'is_active'

type ColumnKey = 'user' | 'department' | 'position' | 'contacts' | 'location' | 'equipment' | 'lastLogin' | 'status'

const ALL_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'user', label: "Користувач" },
  { key: 'department', label: 'Відділ' },
  { key: 'position', label: 'Посада' },
  { key: 'contacts', label: 'Контакти' },
  { key: 'location', label: 'Локація' },
  { key: 'equipment', label: 'Обладнання' },
  { key: 'lastLogin', label: 'Останній вхід' },
  { key: 'status', label: 'Статус' },
]

const STORAGE_KEY_FILTERS = 'users-filters'
const STORAGE_KEY_COLUMNS = 'users-columns'

const DEFAULT_COLUMNS: ColumnKey[] = ['user', 'department', 'position', 'contacts', 'location', 'equipment', 'status']

function loadSavedFilters() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FILTERS)
    return saved ? JSON.parse(saved) : {}
  } catch { return {} }
}

function loadSavedColumns(): ColumnKey[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_COLUMNS)
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS
  } catch { return DEFAULT_COLUMNS }
}

const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1']

export default function UsersListPage() {
  const savedFilters = loadSavedFilters()
  const [search, setSearch] = useState(savedFilters.search || '')
  const [department, setDepartment] = useState(savedFilters.department || '')
  const [position, setPosition] = useState(savedFilters.position || '')
  const [statusFilter, setStatusFilter] = useState(savedFilters.statusFilter || '')
  const [employmentType, setEmploymentType] = useState(savedFilters.employmentType || '')
  const [ordering, setOrdering] = useState(savedFilters.ordering || '')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkAction, setBulkAction] = useState<string | null>(null)
  const [previewUser, setPreviewUser] = useState<User | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(loadSavedColumns())
  const [showImport, setShowImport] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [inlineEdit, setInlineEdit] = useState<{ userId: number; field: 'department' | 'position' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify({
      search, department, position, statusFilter, employmentType, ordering,
    }))
  }, [search, department, position, statusFilter, employmentType, ordering])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useUsersList({
    page,
    search: debouncedSearch || undefined,
    department: department || undefined,
    position: position || undefined,
    is_active: statusFilter || undefined,
    employment_type: employmentType || undefined,
    ordering: ordering || undefined,
  })
  const { data: stats } = useUsersStats()
  const deactivateUser = useDeactivateUser()
  const deleteUser = useDeleteUser()
  const bulkUserAction = useBulkUserAction()
  const updateUser = useUpdateUser()
  const importUsers = useImportUsers()
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  const hasFilters = department || position || statusFilter || employmentType

  const clearFilters = () => {
    setDepartment('')
    setPosition('')
    setStatusFilter('')
    setEmploymentType('')
    setPage(1)
  }

  const toggleOrdering = (field: SortField) => {
    if (ordering === field) setOrdering(`-${field}`)
    else if (ordering === `-${field}`) setOrdering('')
    else setOrdering(field)
    setPage(1)
  }

  const getSortIcon = (field: SortField) => {
    if (ordering === field) return <ArrowUp className="ml-1 h-3 w-3 inline" />
    if (ordering === `-${field}`) return <ArrowDown className="ml-1 h-3 w-3 inline" />
    return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-40" />
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (!data?.results) return
    if (selectedIds.size === data.results.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.results.map((u) => u.id)))
    }
  }

  const isAllSelected = data?.results?.length ? selectedIds.size === data.results.length : false
  const isPartialSelected = selectedIds.size > 0 && !isAllSelected

  const handleBulkConfirm = () => {
    if (bulkAction && selectedIds.size > 0) {
      bulkUserAction.mutate(
        { action: bulkAction, ids: Array.from(selectedIds) },
        { onSuccess: () => { setSelectedIds(new Set()); setBulkAction(null) } },
      )
    }
  }

  const getInitials = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user.username.slice(0, 2).toUpperCase()
  }

  const exportCSV = () => {
    if (!data?.results?.length) return
    const headers = ["Ім'я", 'Прізвище', 'Username', 'Email', 'Телефон', 'Відділ', 'Посада', 'Тип зайнятості', 'Локація', 'Статус', 'Обладнання']
    const rows = data.results.map((u) => [
      u.first_name, u.last_name, u.username, u.email, u.phone,
      u.department ? (DEPARTMENT_LABELS[u.department] || u.custom_department || u.department) : '',
      u.position ? (POSITION_LABELS[u.position] || u.custom_position || u.position) : '',
      u.employment_type ? (EMPLOYMENT_TYPE_LABELS[u.employment_type] || u.employment_type) : '',
      [u.office_location, u.room_number].filter(Boolean).join(', '),
      u.is_active ? 'Активний' : 'Неактивний',
      String(u.equipment_count ?? 0),
    ])
    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCSVImport = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())
      if (lines.length < 2) return
      const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase())
      const fieldMap: Record<string, string> = {
        "ім'я": 'first_name', 'first_name': 'first_name', "прізвище": 'last_name', 'last_name': 'last_name',
        'username': 'username', 'email': 'email', 'телефон': 'phone', 'phone': 'phone',
        'відділ': 'department', 'department': 'department', 'посада': 'position', 'position': 'position',
        'пароль': 'password', 'password': 'password',
      }
      const users = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.replace(/"/g, '').trim())
        const row: Record<string, string> = {}
        headers.forEach((h, i) => {
          const key = fieldMap[h]
          if (key && values[i]) row[key] = values[i]
        })
        return row
      }).filter((r) => r.username)
      if (users.length > 0) {
        importUsers.mutate(users)
      }
    }
    reader.readAsText(file)
    setShowImport(false)
  }, [importUsers])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleCSVImport(file)
    }
  }, [handleCSVImport])

  const handleInlineChange = (userId: number, field: 'department' | 'position', value: string) => {
    updateUser.mutate({ id: userId, data: { [field]: value } })
    setInlineEdit(null)
  }

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    )
  }

  const isColumnVisible = (key: ColumnKey) => visibleColumns.includes(key)

  const handleEdit = (user: User) => {
    setEditUser(user)
    setFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setFormOpen(open)
    if (!open) setEditUser(null)
  }

  const bulkActionLabels: Record<string, { title: string; desc: string }> = {
    deactivate: { title: 'Деактивувати вибраних?', desc: `${selectedIds.size} користувачів буде деактивовано.` },
    activate: { title: 'Активувати вибраних?', desc: `${selectedIds.size} користувачів буде активовано.` },
    delete: { title: 'Видалити вибраних назавжди?', desc: `${selectedIds.size} користувачів буде видалено. Ця дія незворотна.` },
  }

  // Chart data
  const deptChartData = (stats?.by_department || [])
    .filter((d) => d.department)
    .map((d) => ({
      name: DEPARTMENT_LABELS[d.department] || d.department,
      value: d.count,
    }))

  const posChartData = (stats?.by_position || [])
    .filter((p) => p.position)
    .map((p) => ({
      name: POSITION_LABELS[p.position] || p.position,
      value: p.count,
    }))

  return (
    <div>
      <PageHeader
        title="Користувачі"
        description={`Всього: ${data?.count || 0} користувачів`}
        actions={
          <div className="flex gap-2">
            {/* Column settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <p className="text-sm font-medium mb-2">Колонки</p>
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer">
                    <Checkbox
                      checked={isColumnVisible(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                      disabled={col.key === 'user'}
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Імпорт
            </Button>
            <Button variant="outline" onClick={exportCSV} disabled={!data?.results?.length}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати
            </Button>
          </div>
        }
      />

      {/* Stats cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 mb-6">
          <StatCard title="Всього" value={stats.total} icon={Users} color="blue" />
          <StatCard title="Активних" value={stats.active} icon={UserCheck} color="green" description={`${stats.inactive} неактивних`} />
          <StatCard title="Нових за місяць" value={stats.new_this_month} icon={UserPlus} color="purple" />
          <StatCard title="Без обладнання" value={stats.without_equipment} icon={Monitor} color="orange" />
          <StatCard title="Неактивних" value={stats.inactive} icon={UserMinus} color="red" />
        </div>
      )}

      {/* Charts */}
      {stats && (deptChartData.length > 0 || posChartData.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {deptChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">По відділах</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <RechartsTooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {deptChartData.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {posChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">По посадах</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={posChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {posChartData.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <Select value={position} onValueChange={(v) => { setPosition(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Всі посади" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі посади</SelectItem>
            {Object.entries(POSITION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Всі статуси" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            <SelectItem value="true">Активний</SelectItem>
            <SelectItem value="false">Неактивний</SelectItem>
          </SelectContent>
        </Select>
        <Select value={employmentType} onValueChange={(v) => { setEmploymentType(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Тип зайнятості" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі типи</SelectItem>
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Скинути
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-md border bg-muted/50 p-3">
          <span className="text-sm font-medium">Вибрано: {selectedIds.size}</span>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('deactivate')}>
            <UserX className="mr-1 h-4 w-4" />
            Деактивувати
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBulkAction('activate')}>
            <UserCheck className="mr-1 h-4 w-4" />
            Активувати
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setBulkAction('delete')}>
            <Trash2 className="mr-1 h-4 w-4" />
            Видалити
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Зняти виділення
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Користувачів не знайдено"
          description="Немає користувачів з обраними фільтрами"
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Додати користувача
            </Button>
          }
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected ? true : isPartialSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  {isColumnVisible('user') && (
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleOrdering('first_name')}>
                      Користувач{getSortIcon('first_name')}
                    </TableHead>
                  )}
                  {isColumnVisible('department') && (
                    <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleOrdering('department')}>
                      Відділ{getSortIcon('department')}
                    </TableHead>
                  )}
                  {isColumnVisible('position') && (
                    <TableHead className="hidden md:table-cell cursor-pointer select-none" onClick={() => toggleOrdering('position')}>
                      Посада{getSortIcon('position')}
                    </TableHead>
                  )}
                  {isColumnVisible('contacts') && (
                    <TableHead className="hidden lg:table-cell">Контакти</TableHead>
                  )}
                  {isColumnVisible('location') && (
                    <TableHead className="hidden lg:table-cell">Локація</TableHead>
                  )}
                  {isColumnVisible('equipment') && (
                    <TableHead className="hidden lg:table-cell text-center w-20">
                      <Monitor className="h-4 w-4 mx-auto" />
                    </TableHead>
                  )}
                  {isColumnVisible('lastLogin') && (
                    <TableHead className="hidden xl:table-cell">Останній вхід</TableHead>
                  )}
                  {isColumnVisible('status') && (
                    <TableHead className="w-24 cursor-pointer select-none" onClick={() => toggleOrdering('is_active')}>
                      Статус{getSortIcon('is_active')}
                    </TableHead>
                  )}
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((user) => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ')
                  const dept = user.department ? (DEPARTMENT_LABELS[user.department] || user.custom_department || user.department) : '—'
                  const pos = user.position ? (POSITION_LABELS[user.position] || user.custom_position || user.position) : '—'
                  const location = [user.office_location, user.room_number].filter(Boolean).join(', ')

                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => setPreviewUser(user)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(user.id)}
                          onCheckedChange={() => toggleSelect(user.id)}
                        />
                      </TableCell>
                      {isColumnVisible('user') && (
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(user)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-medium">{fullName || user.username}</span>
                              {fullName && (
                                <p className="text-xs text-muted-foreground">@{user.username}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {isColumnVisible('department') && (
                        <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          {inlineEdit?.userId === user.id && inlineEdit.field === 'department' ? (
                            <Select
                              defaultValue={user.department}
                              onValueChange={(v) => handleInlineChange(user.id, 'department', v)}
                            >
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(DEPARTMENT_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className="cursor-pointer"
                              onDoubleClick={() => setInlineEdit({ userId: user.id, field: 'department' })}
                            >
                              {dept}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible('position') && (
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                          {inlineEdit?.userId === user.id && inlineEdit.field === 'position' ? (
                            <Select
                              defaultValue={user.position}
                              onValueChange={(v) => handleInlineChange(user.id, 'position', v)}
                            >
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(POSITION_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span
                              className="cursor-pointer"
                              onDoubleClick={() => setInlineEdit({ userId: user.id, field: 'position' })}
                            >
                              {pos}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible('contacts') && (
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
                      )}
                      {isColumnVisible('location') && (
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {location || '—'}
                        </TableCell>
                      )}
                      {isColumnVisible('equipment') && (
                        <TableCell className="hidden lg:table-cell text-center">
                          {user.equipment_count ? (
                            <Badge variant="secondary">{user.equipment_count}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      )}
                      {isColumnVisible('lastLogin') && (
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {user.last_login ? (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(user.last_login).toLocaleDateString('uk-UA')}{' '}
                              {new Date(user.last_login).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          ) : '—'}
                        </TableCell>
                      )}
                      {isColumnVisible('status') && (
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Активний' : 'Неактивний'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPreviewUser(user)}>
                              <Users className="mr-2 h-4 w-4" />
                              Перегляд
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.is_active && (
                              <DropdownMenuItem onClick={() => setDeactivateId(user.id)}>
                                <UserX className="mr-2 h-4 w-4" />
                                Деактивувати
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteId(user.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <ListPagination page={page} totalPages={totalPages} totalItems={data?.count} onPageChange={setPage} />
        </>
      )}

      {/* Quick preview Sheet */}
      <UserPreviewSheet
        user={previewUser}
        onClose={() => setPreviewUser(null)}
        onEdit={(u) => { handleEdit(u); setPreviewUser(null) }}
        onDeactivate={(id) => { setDeactivateId(id); setPreviewUser(null) }}
        getInitials={getInitials}
      />

      {/* Import dialog */}
      <Sheet open={showImport} onOpenChange={setShowImport}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Імпорт користувачів</SheetTitle>
            <SheetDescription>Завантажте CSV файл з даними користувачів</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Перетягніть CSV файл сюди</p>
              <p className="text-xs text-muted-foreground mb-3">або</p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                Обрати файл
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleCSVImport(file)
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Формат CSV:</p>
              <p>username, password, email, first_name, last_name, phone, department, position</p>
              <p>Перший рядок — заголовки. Підтримує українські назви колонок.</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <UserFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        user={editUser}
      />

      <ConfirmDialog
        open={deactivateId !== null}
        onOpenChange={() => setDeactivateId(null)}
        title="Деактивувати користувача?"
        description="Користувач не зможе увійти в систему. Це можна скасувати через редагування."
        confirmLabel="Деактивувати"
        onConfirm={() => {
          if (deactivateId) {
            deactivateUser.mutate(deactivateId)
            setDeactivateId(null)
          }
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Видалити користувача назавжди?"
        description="Ця дія є незворотною. Користувач та всі його дані будуть видалені."
        confirmLabel="Видалити"
        onConfirm={() => {
          if (deleteId) {
            deleteUser.mutate(deleteId)
            setDeleteId(null)
          }
        }}
        variant="destructive"
      />

      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={() => setBulkAction(null)}
        title={bulkAction ? bulkActionLabels[bulkAction]?.title || '' : ''}
        description={bulkAction ? bulkActionLabels[bulkAction]?.desc || '' : ''}
        confirmLabel="Підтвердити"
        onConfirm={handleBulkConfirm}
        variant="destructive"
      />
    </div>
  )
}

/* ========== User Preview Sheet ========== */

function UserPreviewSheet({
  user,
  onClose,
  onEdit,
  onDeactivate,
  getInitials,
}: {
  user: User | null
  onClose: () => void
  onEdit: (u: User) => void
  onDeactivate: (id: number) => void
  getInitials: (u: User) => string
}) {
  const { data: equipment, isLoading: eqLoading } = useUserEquipment(user?.id ?? null)
  const { data: history, isLoading: histLoading } = useUserHistory(user?.id ?? null)

  if (!user) return null

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username

  return (
    <Sheet open={user !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl bg-primary/10 text-primary">
                {getInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{fullName}</SheetTitle>
              <SheetDescription>@{user.username}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4">
          {/* Status badges */}
          <div className="flex items-center gap-2 mb-4">
            {user.is_active ? (
              <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Активний</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><XCircle className="h-3 w-3" /> Неактивний</Badge>
            )}
            {user.is_staff && <Badge variant="outline">Staff</Badge>}
            {user.equipment_count ? (
              <Badge variant="secondary" className="gap-1"><Monitor className="h-3 w-3" /> {user.equipment_count} обл.</Badge>
            ) : null}
          </div>

          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Інфо</TabsTrigger>
              <TabsTrigger value="equipment" className="flex-1">
                Обладнання {equipment?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5">{equipment.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Історія</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-4">
              {/* Work Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Робоча інформація</h4>
                <div className="grid gap-2">
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {user.department ? (DEPARTMENT_LABELS[user.department] || user.custom_department || user.department) : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.position ? (POSITION_LABELS[user.position] || user.custom_position || user.position) : '—'}
                      </p>
                    </div>
                  </div>
                  {user.employment_type && (
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{EMPLOYMENT_TYPE_LABELS[user.employment_type] || user.employment_type}</p>
                    </div>
                  )}
                  {(user.office_location || user.room_number) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{[user.office_location, user.room_number].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  {user.hire_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">Прийнятий: {new Date(user.hire_date).toLocaleDateString('uk-UA')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground">Контакти</h4>
                <div className="grid gap-2">
                  {user.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${user.email}`} className="text-sm text-primary hover:underline">{user.email}</a>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${user.phone}`} className="text-sm text-primary hover:underline">{user.phone}</a>
                    </div>
                  )}
                  {user.mobile_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${user.mobile_phone}`} className="text-sm text-primary hover:underline">{user.mobile_phone}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* System info */}
              {(user.date_joined || user.last_login) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Системна інформація</h4>
                  <div className="grid gap-2 text-sm text-muted-foreground">
                    {user.date_joined && <p>Зареєстрований: {new Date(user.date_joined).toLocaleDateString('uk-UA')}</p>}
                    {user.last_login && <p>Останній вхід: {new Date(user.last_login).toLocaleString('uk-UA')}</p>}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="equipment" className="mt-4">
              {eqLoading ? (
                <LoadingSpinner />
              ) : !equipment?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">Немає закріпленого обладнання</p>
              ) : (
                <div className="space-y-2">
                  {equipment.map((eq) => (
                    <div key={eq.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{eq.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[eq.category] || eq.category} &middot; {eq.serial_number}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {eq.location && (
                          <span className="text-xs text-muted-foreground">{eq.location}</span>
                        )}
                        <Badge variant={eq.status === 'WORKING' ? 'default' : 'secondary'} className="text-xs">
                          {STATUS_LABELS[eq.status] || eq.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {histLoading ? (
                <LoadingSpinner />
              ) : !history?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">Немає записів в історії</p>
              ) : (
                <div className="space-y-3">
                  {history.map((record, i) => (
                    <div key={i} className="border-l-2 border-muted pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <History className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.date).toLocaleString('uk-UA')}
                        </span>
                        {record.user && (
                          <span className="text-xs text-muted-foreground">&middot; {record.user}</span>
                        )}
                        <Badge variant="outline" className="text-xs h-5">{record.type}</Badge>
                      </div>
                      {record.changes.length > 0 && (
                        <div className="space-y-0.5">
                          {record.changes.map((change, j) => (
                            <p key={j} className="text-xs">
                              <span className="font-medium">{change.field}</span>:{' '}
                              <span className="text-muted-foreground line-through">{change.old || '—'}</span>
                              {' → '}
                              <span className="text-foreground">{change.new || '—'}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-2 pt-4 mt-4 border-t">
            <Button className="flex-1" onClick={() => onEdit(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              Редагувати
            </Button>
            {user.is_active && (
              <Button variant="outline" onClick={() => onDeactivate(user.id)}>
                <UserX className="mr-2 h-4 w-4" />
                Деактивувати
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
