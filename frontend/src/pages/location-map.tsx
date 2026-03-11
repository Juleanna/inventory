import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { MapPin, Building, Layers, DoorOpen, Monitor } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'

interface RoomInfo {
  room: string
  equipment_count: number
  working: number
  repair: number
  storage: number
}

interface FloorInfo {
  floor: string
  rooms: RoomInfo[]
}

interface BuildingInfo {
  building: string
  floors: FloorInfo[]
}

interface LocationMapData {
  locations: BuildingInfo[]
  summary: { total_locations: number; total_equipment: number; buildings_count: number }
}

export default function LocationMapPage() {
  const [buildingFilter, setBuildingFilter] = useState('')

  const { data, isLoading } = useQuery<LocationMapData>({
    queryKey: ['location-map'],
    queryFn: () => apiClient.get('/equipment/location-map/').then(r => r.data),
  })

  const locations = data?.locations || []
  const filtered = buildingFilter
    ? locations.filter(b => b.building === buildingFilter)
    : locations

  const totalRooms = locations.reduce((sum, b) => sum + b.floors.reduce((s, f) => s + f.rooms.length, 0), 0)

  return (
    <div>
      <PageHeader title="Карта обладнання" description="Розташування обладнання по будівлях, поверхах та кімнатах" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2"><Building className="h-4 w-4 text-primary" /></div>
          <div><p className="text-2xl font-bold">{data?.summary?.buildings_count ?? '—'}</p><p className="text-xs text-muted-foreground">Будівлі</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2"><Layers className="h-4 w-4 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{locations.reduce((s, b) => s + b.floors.length, 0)}</p><p className="text-xs text-muted-foreground">Поверхи</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2"><DoorOpen className="h-4 w-4 text-green-500" /></div>
          <div><p className="text-2xl font-bold">{totalRooms}</p><p className="text-xs text-muted-foreground">Кімнати</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2"><Monitor className="h-4 w-4 text-purple-500" /></div>
          <div><p className="text-2xl font-bold">{data?.summary?.total_equipment ?? '—'}</p><p className="text-xs text-muted-foreground">Обладнання</p></div>
        </CardContent></Card>
      </div>

      {/* Filter */}
      {locations.length > 1 && (
        <div className="mb-4">
          <Select value={buildingFilter || 'all'} onValueChange={v => setBuildingFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[250px]"><SelectValue placeholder="Всі будівлі" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі будівлі</SelectItem>
              {locations.map(b => <SelectItem key={b.building} value={b.building}>{b.building || 'Без будівлі'}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Buildings */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-6">
          {filtered.map(building => (
            <Card key={building.building}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5" />
                  {building.building || 'Без будівлі'}
                  <Badge variant="secondary" className="ml-2">
                    {building.floors.reduce((s, f) => s + f.rooms.reduce((rs, r) => rs + r.equipment_count, 0), 0)} од.
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {building.floors.map(floor => (
                  <div key={floor.floor} className="mb-4 last:mb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{floor.floor || 'Без поверху'} поверх</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pl-6">
                      {floor.rooms.map(room => {
                        const total = room.equipment_count
                        const workingPct = total > 0 ? (room.working / total) * 100 : 0
                        const repairPct = total > 0 ? (room.repair / total) * 100 : 0
                        return (
                          <Card key={room.room} className="border-2 hover:border-primary/50 transition-colors cursor-default">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm flex items-center gap-1.5">
                                  <DoorOpen className="h-3.5 w-3.5" />
                                  {room.room || '—'}
                                </span>
                                <Badge variant="outline" className="text-xs">{total}</Badge>
                              </div>
                              <div className="space-y-1">
                                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                                  <div className="bg-green-500" style={{ width: `${workingPct}%` }} />
                                  <div className="bg-orange-500" style={{ width: `${repairPct}%` }} />
                                  <div className="bg-blue-500" style={{ width: `${100 - workingPct - repairPct}%` }} />
                                </div>
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                  <span className="text-green-600">{room.working} роб.</span>
                                  {room.repair > 0 && <span className="text-orange-600">{room.repair} рем.</span>}
                                  {room.storage > 0 && <span className="text-blue-600">{room.storage} скл.</span>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-1">Немає даних про розташування</p>
            <p className="text-sm text-muted-foreground">Заповніть поля будівля/поверх/кімната в обладнанні</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
