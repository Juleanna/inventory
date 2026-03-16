import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { Calculator, Download, TrendingDown, DollarSign, Package, MapPin } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, type DepreciationReport } from '@/api/reports'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const fmt = (n: number) => n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function DepreciationPage() {
  const { data, isLoading } = useQuery<DepreciationReport>({
    queryKey: ['depreciation-report'],
    queryFn: () => reportsApi.depreciation(),
  })

  const [sortField, setSortField] = useState<string>('book_value')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedItems = data?.items ? [...data.items].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortField] as number
    const bv = (b as unknown as Record<string, unknown>)[sortField] as number
    return sortDir === 'asc' ? av - bv : bv - av
  }) : []

  const handleExport = (format: string) => {
    reportsApi.exportReport('depreciation', format)
  }

  return (
    <div>
      <PageHeader title="Амортизаційний звіт" description="Розрахунок амортизації обладнання для бухгалтерії">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="mr-2 h-4 w-4" />Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2"><DollarSign className="h-4 w-4 text-blue-500" /></div>
          <div><p className="text-xl font-bold">{data ? `${fmt(data.summary.total_purchase_value)} ₴` : '—'}</p><p className="text-xs text-muted-foreground">Первісна вартість</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2"><Calculator className="h-4 w-4 text-green-500" /></div>
          <div><p className="text-xl font-bold">{data ? `${fmt(data.summary.total_book_value)} ₴` : '—'}</p><p className="text-xs text-muted-foreground">Залишкова вартість</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-red-500/10 p-2"><TrendingDown className="h-4 w-4 text-red-500" /></div>
          <div><p className="text-xl font-bold">{data ? `${fmt(data.summary.total_depreciation)} ₴` : '—'}</p><p className="text-xs text-muted-foreground">Нарахована амортизація</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2"><Calculator className="h-4 w-4 text-purple-500" /></div>
          <div><p className="text-xl font-bold">{data ? `${data.summary.avg_depreciation_rate.toFixed(1)}%` : '—'}</p><p className="text-xs text-muted-foreground">Сер. норма амортизації</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">По обладнанню</TabsTrigger>
          <TabsTrigger value="categories">По категоріях</TabsTrigger>
          <TabsTrigger value="locations">По локаціях</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Назва</TableHead>
                    <TableHead>Категорія</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('purchase_date')}>Дата покупки</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('purchase_price')}>Вартість покупки</TableHead>
                    <TableHead className="text-right">Норма (%)</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('age_years')}>Вік (р.)</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('accumulated_depreciation')}>Амортизація</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => handleSort('book_value')}>Залишкова</TableHead>
                    <TableHead className="text-right">Аморт./міс</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>{Array.from({ length: 9 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                    ))
                  ) : sortedItems.length > 0 ? (
                    sortedItems.map(item => (
                      <TableRow key={item.id} className={item.book_value <= 0 ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{item.category}</Badge></TableCell>
                        <TableCell className="text-sm">{item.purchase_date ? new Date(item.purchase_date).toLocaleDateString('uk-UA') : '—'}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(item.purchase_price)} ₴</TableCell>
                        <TableCell className="text-right">{item.depreciation_rate}%</TableCell>
                        <TableCell className="text-right">{item.age_years.toFixed(1)}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{fmt(item.accumulated_depreciation)} ₴</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{fmt(item.book_value)} ₴</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(item.monthly_depreciation)} ₴</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Немає даних</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />Вартість по категоріях</CardTitle></CardHeader>
              <CardContent>
                {data?.by_category && (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.by_category}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number | undefined) => `${fmt(v ?? 0)} ₴`} />
                      <Legend />
                      <Bar dataKey="purchase_value" name="Первісна" fill="#3b82f6" />
                      <Bar dataKey="book_value" name="Залишкова" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Категорія</TableHead>
                      <TableHead className="text-right">Первісна</TableHead>
                      <TableHead className="text-right">Залишкова</TableHead>
                      <TableHead className="text-right">Амортизація</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.by_category?.map(cat => (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(cat.purchase_value)} ₴</TableCell>
                        <TableCell className="text-right font-mono">{fmt(cat.book_value)} ₴</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{fmt(cat.depreciation)} ₴</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><MapPin className="h-3.5 w-3.5 inline mr-1" />Локація</TableHead>
                    <TableHead className="text-right">Кількість</TableHead>
                    <TableHead className="text-right">Первісна вартість</TableHead>
                    <TableHead className="text-right">Залишкова вартість</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.by_location?.map(loc => (
                    <TableRow key={loc.location}>
                      <TableCell className="font-medium">{loc.location || '—'}</TableCell>
                      <TableCell className="text-right">{loc.count}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(loc.purchase_value)} ₴</TableCell>
                      <TableCell className="text-right font-mono">{fmt(loc.book_value)} ₴</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
