import { useParams, Link } from 'react-router-dom'
import { useEquipment } from '@/hooks/use-equipment'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft } from 'lucide-react'
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: equipment, isLoading } = useEquipment(Number(id))

  if (isLoading) return <LoadingSpinner size="lg" />
  if (!equipment) return <div className="p-8 text-center text-muted-foreground">Обладнання не знайдено</div>

  const infoItems = [
    { label: 'Виробник', value: equipment.manufacturer },
    { label: 'Модель', value: equipment.model },
    { label: 'Серійний номер', value: equipment.serial_number },
    { label: 'Інвентарний номер', value: equipment.inventory_number },
    { label: 'Місцезнаходження', value: equipment.location },
    { label: 'Будівля', value: equipment.building },
    { label: 'Поверх', value: equipment.floor },
    { label: 'Кімната', value: equipment.room },
  ].filter((i) => i.value)

  const techItems = [
    { label: 'CPU', value: equipment.cpu },
    { label: 'RAM', value: equipment.ram },
    { label: 'Сховище', value: equipment.storage },
    { label: 'GPU', value: equipment.gpu },
    { label: 'ОС', value: equipment.operating_system },
    { label: 'IP адреса', value: equipment.ip_address },
    { label: 'MAC адреса', value: equipment.mac_address },
    { label: 'Hostname', value: equipment.hostname },
  ].filter((i) => i.value)

  const dateItems = [
    { label: 'Дата покупки', value: equipment.purchase_date },
    { label: 'Гарантія до', value: equipment.warranty_until },
    { label: 'Останнє ТО', value: equipment.last_maintenance_date },
    { label: 'Наступне ТО', value: equipment.next_maintenance_date },
    { label: 'Ціна покупки', value: equipment.purchase_price ? `${equipment.purchase_price} грн` : null },
  ].filter((i) => i.value)

  return (
    <div>
      <PageHeader
        title={equipment.name}
        description={`${CATEGORY_LABELS[equipment.category] || equipment.category} — ${equipment.manufacturer} ${equipment.model}`}
        actions={
          <Button variant="outline" asChild>
            <Link to="/equipment">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <Badge variant="secondary" className={cn('text-sm', STATUS_COLORS[equipment.status])}>
          {STATUS_LABELS[equipment.status] || equipment.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Загальна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {infoItems.map((item) => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {techItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Технічні характеристики</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {techItems.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {dateItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Дати та вартість</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dateItems.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {(equipment.qrcode_image || equipment.barcode_image) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Коди</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              {equipment.qrcode_image && (
                <div className="text-center">
                  <img src={equipment.qrcode_image} alt="QR" className="h-32 w-32" />
                  <p className="mt-1 text-xs text-muted-foreground">QR код</p>
                </div>
              )}
              {equipment.barcode_image && (
                <div className="text-center">
                  <img src={equipment.barcode_image} alt="Barcode" className="h-32" />
                  <p className="mt-1 text-xs text-muted-foreground">Штрих-код</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator className="my-6" />

      <div className="text-xs text-muted-foreground">
        Створено: {new Date(equipment.created_at).toLocaleString('uk-UA')} |
        Оновлено: {new Date(equipment.updated_at).toLocaleString('uk-UA')}
      </div>
    </div>
  )
}
