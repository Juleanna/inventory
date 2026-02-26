import { useSuppliersList } from '@/hooks/use-spare-parts'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { ArrowLeft, Truck, Mail, Phone, Globe } from 'lucide-react'

export default function SuppliersPage() {
  const { data, isLoading } = useSuppliersList()

  return (
    <div>
      <PageHeader
        title="Постачальники"
        description="Управління постачальниками запчастин"
        actions={
          <Button variant="outline" asChild>
            <Link to="/spare-parts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.results?.length ? (
        <EmptyState
          icon={<Truck className="h-12 w-12" />}
          title="Постачальників не знайдено"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{supplier.name}</CardTitle>
                  <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                    {supplier.is_active ? 'Активний' : 'Неактивний'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {supplier.contact_person && (
                  <p className="font-medium">{supplier.contact_person}</p>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {supplier.website}
                    </a>
                  </div>
                )}
                {supplier.address && (
                  <p className="text-xs text-muted-foreground pt-1">{supplier.address}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
