import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePurchaseOrders } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

export default function OrdersPage() {
  const [status, setStatus] = useState<string>('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = usePurchaseOrders({
    page,
    status: status || undefined,
  })
  const totalPages = data ? Math.ceil(data.count / 25) : 0

  return (
    <div>
      <PageHeader
        title="Замовлення"
        description="Замовлення на закупівлю запчастин"
        actions={
          <Button variant="outline" asChild>
            <Link to="/spare-parts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <Select value={status} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Всі статуси" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всі статуси</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<ShoppingCart className="h-12 w-12" />}
          title="Замовлень не знайдено"
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Номер</TableHead>
                  <TableHead>Постачальник</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="hidden md:table-cell">Сума</TableHead>
                  <TableHead className="hidden lg:table-cell">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.results.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.supplier_details?.name || `#${order.supplier}`}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{order.total_amount} грн</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('uk-UA')}
                    </TableCell>
                  </TableRow>
                ))}
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
