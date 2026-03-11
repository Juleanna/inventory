import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { PageHeader } from '@/components/shared/page-header'
import { ScanLine, Camera, Search, ExternalLink, MapPin, History, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { Equipment } from '@/types'

export default function QrScannerPage() {
  const navigate = useNavigate()
  const [manualCode, setManualCode] = useState('')
  const [searchCode, setSearchCode] = useState('')
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; name: string; id: number; time: string }>>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { data: foundEquipment, isLoading } = useQuery({
    queryKey: ['equipment-scan', searchCode],
    queryFn: () => apiClient.get('/equipment/', { params: { search: searchCode, page_size: 1 } }).then(r => r.data),
    enabled: searchCode.length >= 2,
  })

  const equipment: Equipment | null = foundEquipment?.results?.[0] || null

  const handleSearch = () => {
    if (manualCode.trim()) {
      setSearchCode(manualCode.trim())
      if (equipment) {
        setScanHistory(prev => [
          { code: manualCode, name: equipment.name, id: equipment.id, time: new Date().toLocaleTimeString('uk-UA') },
          ...prev.slice(0, 9),
        ])
      }
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
        setCameraError('')
      }
    } catch {
      setCameraError('Не вдалося отримати доступ до камери. Перевірте дозволи браузера.')
    }
  }

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
      setCameraActive(false)
    }
  }, [])

  const STATUS_LABELS: Record<string, string> = {
    WORKING: 'Робоче', REPAIR: 'Ремонт', MAINTENANCE: 'Обслуговування',
    STORAGE: 'На складі', DISPOSED: 'Списано', LOST: 'Втрачено',
  }

  return (
    <div>
      <PageHeader title="QR Сканер" description="Сканування QR-кодів та штрих-кодів обладнання" />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Scanner */}
        <div className="space-y-4">
          {/* Manual input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Ручний ввід
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Інвентарний номер, серійний номер або штрих-код..."
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!manualCode.trim()}>
                  <Search className="mr-2 h-4 w-4" />Знайти
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Camera */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Камера
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cameraError && (
                <div className="flex items-center gap-2 text-sm text-destructive mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  {cameraError}
                </div>
              )}
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-video mb-3">
                {cameraActive ? (
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ScanLine className="h-12 w-12 mb-2" />
                    <p className="text-sm">Натисніть для активації камери</p>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-2 border-primary/50 rounded-lg" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {!cameraActive ? (
                  <Button onClick={startCamera} variant="outline" className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />Увімкнути камеру
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="flex-1">
                    Вимкнути камеру
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Наведіть камеру на QR-код та введіть побачений код вручну
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Found equipment */}
          {equipment && (
            <Card className="border-2 border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ScanLine className="h-4 w-4 text-primary" />
                  Знайдено обладнання
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold">{equipment.name}</h3>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">{equipment.category}</Badge>
                    <Badge variant={equipment.status === 'WORKING' ? 'default' : 'destructive'}>
                      {STATUS_LABELS[equipment.status] || equipment.status}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Серійний:</span> <span className="font-mono">{equipment.serial_number}</span></div>
                  <div><span className="text-muted-foreground">Інвентарний:</span> <span className="font-mono">{equipment.inventory_number || '—'}</span></div>
                  <div><span className="text-muted-foreground">Модель:</span> {equipment.model || '—'}</div>
                  <div><span className="text-muted-foreground">Виробник:</span> {equipment.manufacturer || '—'}</div>
                  <div className="col-span-2 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{equipment.location}</span>
                    {equipment.room && <span className="text-muted-foreground">/ {equipment.room}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => navigate(`/equipment/${equipment.id}`)} className="flex-1">
                    <ExternalLink className="mr-2 h-4 w-4" />Відкрити картку
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {searchCode && !equipment && !isLoading && (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">Обладнання не знайдено</p>
                <p className="text-sm text-muted-foreground">Код: {searchCode}</p>
              </CardContent>
            </Card>
          )}

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Історія сканувань
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {scanHistory.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/equipment/${item.id}`)}
                      className="flex w-full items-center justify-between rounded-lg border p-2.5 hover:bg-muted text-sm transition-colors"
                    >
                      <div className="text-left">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
