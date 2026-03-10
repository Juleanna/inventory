import { useParams, Link } from 'react-router-dom'
import { useSupplier, useSupplierParts, useSupplierOrders } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft, Mail, Phone, Globe, MapPin, FileText, Star,
  Package, ShoppingCart, Truck, Hash,
} from 'lucide-react'
import { ORDER_STATUS_LABELS } from '@/lib/constants'

const ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  APPROVED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ORDERED: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  PARTIALLY_RECEIVED: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  RECEIVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const supplierId = Number(id)
  const { data: supplier, isLoading } = useSupplier(supplierId)
  const { data: parts } = useSupplierParts(supplierId)
  const { data: orders } = useSupplierOrders(supplierId)

  if (isLoading) return <LoadingSpinner size="lg" />
  if (!supplier) return <div className="p-8 text-center text-muted-foreground">Постачальника не знайдено</div>

  const partsCount = parts?.results?.length ?? 0
  const ordersCount = orders?.results?.length ?? 0
  const totalOrdersAmount = orders?.results?.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0) ?? 0

  return (
    <div>
      <PageHeader
        title={supplier.short_name || supplier.name}
        description={supplier.short_name ? supplier.name : undefined}
        actions={
          <Button variant="outline" asChild>
            <Link to="/spare-parts/suppliers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
          {supplier.is_active ? 'Активний' : 'Неактивний'}
        </Badge>
        {parseFloat(supplier.rating) > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            {supplier.rating}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{partsCount}</p>
                <p className="text-xs text-muted-foreground">Запчастин</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ordersCount}</p>
                <p className="text-xs text-muted-foreground">Замовлень</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                <Truck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {orders?.results?.filter((o) => o.status === 'RECEIVED').length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Доставлено</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900">
                <Hash className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {totalOrdersAmount > 0 ? `${totalOrdersAmount.toLocaleString('uk-UA')}` : '0'}
                </p>
                <p className="text-xs text-muted-foreground">Загальна сума (грн)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Інформація</TabsTrigger>
          <TabsTrigger value="parts">
            Запчастини
            {partsCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{partsCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="orders">
            Замовлення
            {ordersCount > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{ordersCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Info tab */}
        <TabsContent value="info">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Контактна інформація</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.contact_person && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32">Контактна особа</span>
                    <span className="font-medium">{supplier.contact_person}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                    <a href={`mailto:${supplier.email}`} className="font-medium text-primary hover:underline">
                      {supplier.email}
                    </a>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Телефон
                    </span>
                    <a href={`tel:${supplier.phone}`} className="font-medium hover:underline">
                      {supplier.phone}
                    </a>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> Вебсайт
                    </span>
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                      {supplier.website}
                    </a>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> Адреса
                    </span>
                    <span className="font-medium">{supplier.address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Реквізити</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.tax_id && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32">ЄДРПОУ / ІПН</span>
                    <span className="font-mono font-medium">{supplier.tax_id}</span>
                  </div>
                )}
                {parseFloat(supplier.rating) > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground w-32">Рейтинг</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= Math.round(parseFloat(supplier.rating))
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-sm font-medium">{supplier.rating}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-32">Створено</span>
                  <span>{new Date(supplier.created_at).toLocaleDateString('uk-UA')}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-32">Оновлено</span>
                  <span>{new Date(supplier.updated_at).toLocaleDateString('uk-UA')}</span>
                </div>
              </CardContent>
            </Card>

            {supplier.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Нотатки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Parts tab */}
        <TabsContent value="parts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Запчастини від постачальника
              </CardTitle>
            </CardHeader>
            <CardContent>
              {partsCount > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Назва</th>
                        <th className="pb-2 font-medium">Артикул</th>
                        <th className="pb-2 font-medium text-right">Ціна</th>
                        <th className="pb-2 font-medium text-right">В наявності</th>
                        <th className="pb-2 font-medium">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts!.results.map((part) => (
                        <tr key={part.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2.5">
                            <Link
                              to={`/spare-parts/${part.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {part.name}
                            </Link>
                          </td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">
                            {part.part_number || '—'}
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            {part.unit_cost ? `${parseFloat(part.unit_cost).toLocaleString('uk-UA')} грн` : '—'}
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            {part.quantity_in_stock}
                          </td>
                          <td className="py-2.5">
                            <Badge
                              variant="secondary"
                              className={
                                part.status === 'IN_STOCK' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                part.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                part.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                ''
                              }
                            >
                              {part.status === 'IN_STOCK' ? 'В наявності' :
                               part.status === 'LOW_STOCK' ? 'Мало' :
                               part.status === 'OUT_OF_STOCK' ? 'Немає' :
                               part.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<Package className="h-8 w-8" />}
                  title="Немає запчастин"
                  description="Цей постачальник ще не прив'язаний до жодної запчастини"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4 w-4" />
                Замовлення на закупівлю
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordersCount > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Номер</th>
                        <th className="pb-2 font-medium">Дата</th>
                        <th className="pb-2 font-medium">Статус</th>
                        <th className="pb-2 font-medium text-right">Сума</th>
                        <th className="pb-2 font-medium">Очікувана доставка</th>
                        <th className="pb-2 font-medium">Фактична доставка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders!.results.map((order) => (
                        <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2.5 font-mono font-medium">
                            {order.order_number}
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(order.order_date).toLocaleDateString('uk-UA')}
                          </td>
                          <td className="py-2.5">
                            <Badge variant="secondary" className={ORDER_STATUS_COLORS[order.status] || ''}>
                              {ORDER_STATUS_LABELS[order.status] || order.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right font-mono">
                            {parseFloat(order.total_amount).toLocaleString('uk-UA')} грн
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {order.expected_delivery_date
                              ? new Date(order.expected_delivery_date).toLocaleDateString('uk-UA')
                              : '—'}
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {order.actual_delivery_date
                              ? new Date(order.actual_delivery_date).toLocaleDateString('uk-UA')
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<ShoppingCart className="h-8 w-8" />}
                  title="Немає замовлень"
                  description="Замовлення на закупівлю у цього постачальника відсутні"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
