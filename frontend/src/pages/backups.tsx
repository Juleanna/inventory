import { useState } from 'react'
import { toast } from 'sonner'
import {
  HardDrive,
  Cloud,
  CloudUpload,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  Settings2,
  Upload,
  Link,
  CheckCircle,
  XCircle,
  Loader2,
  FileArchive,
  ExternalLink,
  KeyRound,
  Shield,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useBackupList,
  useBackupSettings,
  useGDriveStatus,
  useCreateBackup,
  useDeleteBackup,
  useUploadToGDrive,
  useGDriveAuthorize,
  useGDriveUploadCredentials,
  useGDriveDeleteBackup,
  useUpdateBackupSettings,
  useBackupContents,
  useRestoreBackup,
} from '@/hooks/use-backups'
import { backupsApi } from '@/api/backups'

const MODEL_LABELS: Record<string, string> = {
  users: 'Користувачі',
  equipment: 'Обладнання',
  software: 'Програмне забезпечення',
  peripherals: 'Периферійні пристрої',
  licenses: 'Ліцензії',
  notifications: 'Сповіщення',
  spare_parts: 'Запчастини',
  spare_part_categories: 'Категорії запчастин',
  suppliers: 'Постачальники',
  purchase_orders: 'Замовлення',
  storage_locations: 'Місця зберігання',
  password_categories: 'Категорії паролів',
  password_systems: 'Системи паролів',
  password_accounts: 'Облікові записи паролів',
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function BackupsPage() {
  const { data: backupData, isLoading, refetch } = useBackupList()
  const { data: settings } = useBackupSettings()
  const { data: gdriveStatus } = useGDriveStatus()
  const createBackup = useCreateBackup()
  const deleteBackup = useDeleteBackup()
  const uploadToGDrive = useUploadToGDrive()
  const gdriveAuthorize = useGDriveAuthorize()
  const gdriveUploadCreds = useGDriveUploadCredentials()
  const gdriveDeleteBackup = useGDriveDeleteBackup()
  const updateSettings = useUpdateBackupSettings()
  const restoreBackup = useRestoreBackup()

  const [showGDriveSetup, setShowGDriveSetup] = useState(false)
  const [authCode, setAuthCode] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [restoreFilename, setRestoreFilename] = useState<string | null>(null)
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge')
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(true)
  const [restoreResults, setRestoreResults] = useState<Record<string, { status: string; count: number; errors?: number; message?: string }> | null>(null)

  const { data: backupContents } = useBackupContents(restoreFilename)

  const handleCreate = async (uploadGDrive = false) => {
    try {
      const result = await createBackup.mutateAsync(uploadGDrive)
      toast.success(`Бекап створено: ${result.filename}`)
      if (result.gdrive && 'error' in result.gdrive) {
        toast.error(`Помилка Google Drive: ${result.gdrive.error}`)
      }
    } catch {
      toast.error('Помилка створення бекапу')
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      await backupsApi.download(filename)
      toast.success('Завантаження розпочато')
    } catch {
      toast.error('Помилка завантаження')
    }
  }

  const handleDelete = async (filename: string) => {
    try {
      await deleteBackup.mutateAsync(filename)
      toast.success('Бекап видалено')
    } catch {
      toast.error('Помилка видалення')
    }
  }

  const handleUploadGDrive = async (filename: string) => {
    try {
      await uploadToGDrive.mutateAsync(filename)
      toast.success('Завантажено на Google Drive')
    } catch {
      toast.error('Помилка завантаження на Google Drive')
    }
  }

  const handleGDriveDelete = async (fileId: string) => {
    try {
      await gdriveDeleteBackup.mutateAsync(fileId)
      toast.success('Видалено з Google Drive')
    } catch {
      toast.error('Помилка видалення з Google Drive')
    }
  }

  const handleCredentialsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await gdriveUploadCreds.mutateAsync(file)
      toast.success('Credentials збережено')
    } catch {
      toast.error('Помилка збереження credentials')
    }
  }

  const handleAuthorize = async () => {
    if (!authCode.trim()) return
    try {
      await gdriveAuthorize.mutateAsync(authCode.trim())
      toast.success('Google Drive авторизований')
      setAuthCode('')
      setShowGDriveSetup(false)
    } catch {
      toast.error('Помилка авторизації')
    }
  }

  const handleOpenRestore = (filename: string) => {
    setRestoreFilename(filename)
    setRestoreMode('merge')
    setSelectedModels([])
    setSelectAll(true)
    setRestoreResults(null)
  }

  const handleRestore = async () => {
    if (!restoreFilename) return
    try {
      const models = selectAll ? undefined : selectedModels
      const result = await restoreBackup.mutateAsync({
        filename: restoreFilename,
        mode: restoreMode,
        models,
      })
      setRestoreResults(result.results)
      toast.success(
        `Відновлено ${result.total_restored} записів${result.total_errors > 0 ? `, помилок: ${result.total_errors}` : ''}`
      )
    } catch {
      toast.error('Помилка відновлення з бекапу')
    }
  }

  const toggleModel = (model: string) => {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    )
  }

  const handleSaveSettings = async (key: string, value: boolean | number) => {
    try {
      await updateSettings.mutateAsync({ [key]: value })
      toast.success('Налаштування збережено')
    } catch {
      toast.error('Помилка збереження')
    }
  }

  const localBackups = backupData?.local ?? []
  const gdriveBackups = backupData?.gdrive ?? []
  const isGDriveReady = backupData?.gdrive_authorized ?? false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Резервне копіювання</h1>
          <p className="text-muted-foreground">
            Управління бекапами бази даних та інтеграція з Google Drive
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Оновити
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Налаштування
          </Button>
          <Button
            onClick={() => handleCreate(isGDriveReady && settings?.auto_upload_gdrive)}
            disabled={createBackup.isPending}
          >
            {createBackup.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Створити бекап
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Локальні бекапи</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localBackups.length}</div>
            <p className="text-xs text-muted-foreground">
              {localBackups.length > 0
                ? `Загальний розмір: ${formatSize(localBackups.reduce((s, b) => s + b.size, 0))}`
                : 'Бекапів немає'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Drive</CardTitle>
            <Cloud className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gdriveBackups.length}</div>
            <p className="text-xs text-muted-foreground">
              {isGDriveReady ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" /> Підключено
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <XCircle className="h-3 w-3" /> Не підключено
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Автобекап</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settings?.auto_backup ? 'Увімкнено' : 'Вимкнено'}
            </div>
            <p className="text-xs text-muted-foreground">
              {settings?.auto_backup
                ? `Кожні ${settings.interval_hours} год.`
                : 'Тільки вручну'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <Tabs defaultValue="local" className="space-y-4">
        <TabsList>
          <TabsTrigger value="local" className="gap-2">
            <HardDrive className="h-4 w-4" />
            Локальні ({localBackups.length})
          </TabsTrigger>
          <TabsTrigger value="gdrive" className="gap-2">
            <Cloud className="h-4 w-4" />
            Google Drive ({gdriveBackups.length})
          </TabsTrigger>
        </TabsList>

        {/* Local backups tab */}
        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle>Локальні резервні копії</CardTitle>
              <CardDescription>
                Бекапи зберігаються на сервері в папці backups/
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : localBackups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileArchive className="mb-2 h-10 w-10" />
                  <p>Бекапів поки немає</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => handleCreate(false)}
                  >
                    Створити перший бекап
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Файл</TableHead>
                      <TableHead>Розмір</TableHead>
                      <TableHead>Дата створення</TableHead>
                      <TableHead className="text-right">Дії</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localBackups.map((b) => (
                      <TableRow key={b.filename}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileArchive className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">{b.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatSize(b.size)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(b.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDownload(b.filename)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Завантажити</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleOpenRestore(b.filename)}
                                  >
                                    <RotateCcw className="h-4 w-4 text-amber-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Відновити з бекапу</TooltipContent>
                              </Tooltip>

                              {isGDriveReady && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleUploadGDrive(b.filename)}
                                      disabled={uploadToGDrive.isPending}
                                    >
                                      {uploadToGDrive.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CloudUpload className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Завантажити на Google Drive</TooltipContent>
                                </Tooltip>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Видалити бекап?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Файл {b.filename} буде видалений назавжди.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Скасувати</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(b.filename)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Видалити
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Drive tab */}
        <TabsContent value="gdrive">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Google Drive</CardTitle>
                  <CardDescription>
                    Хмарне зберігання бекапів у папці IT-Inventory-Backups
                  </CardDescription>
                </div>
                {!isGDriveReady && (
                  <Button variant="outline" size="sm" onClick={() => setShowGDriveSetup(true)}>
                    <Link className="mr-2 h-4 w-4" />
                    Підключити
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!backupData?.gdrive_configured ? (
                <GDriveNotConfigured onSetup={() => setShowGDriveSetup(true)} />
              ) : !isGDriveReady ? (
                <GDriveNotAuthorized
                  authUrl={gdriveStatus?.auth_url}
                  onSetup={() => setShowGDriveSetup(true)}
                />
              ) : gdriveBackups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Cloud className="mb-2 h-10 w-10" />
                  <p>На Google Drive немає бекапів</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Файл</TableHead>
                      <TableHead>Розмір</TableHead>
                      <TableHead>Дата створення</TableHead>
                      <TableHead className="text-right">Дії</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gdriveBackups.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Cloud className="h-4 w-4 text-blue-500" />
                            <span className="text-sm">{b.filename}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatSize(b.size)}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(b.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider>
                            <div className="flex items-center justify-end gap-1">
                              {b.link && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(b.link, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Відкрити в Google Drive</TooltipContent>
                                </Tooltip>
                              )}

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Видалити з Google Drive?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Файл {b.filename} буде видалений з Google Drive.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Скасувати</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleGDriveDelete(b.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Видалити
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Google Drive Setup Dialog */}
      <Dialog open={showGDriveSetup} onOpenChange={setShowGDriveSetup}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Підключення Google Drive</DialogTitle>
            <DialogDescription>
              Для підключення потрібен файл credentials з Google Cloud Console
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Upload credentials */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={gdriveStatus?.configured ? 'default' : 'secondary'}>1</Badge>
                <Label className="font-medium">Завантажити credentials.json</Label>
                {gdriveStatus?.configured && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Створіть OAuth 2.0 Client ID в{' '}
                <span className="font-medium">Google Cloud Console &gt; APIs &gt; Credentials</span>
                , завантажте JSON і завантажте сюди.
              </p>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleCredentialsUpload}
                  disabled={gdriveUploadCreds.isPending}
                />
              </div>
            </div>

            <Separator />

            {/* Step 2: Authorize */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={gdriveStatus?.authorized ? 'default' : 'secondary'}>2</Badge>
                <Label className="font-medium">Авторизувати доступ</Label>
                {gdriveStatus?.authorized && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>

              {gdriveStatus?.configured && !gdriveStatus?.authorized && (
                <>
                  {gdriveStatus.auth_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Відкрийте посилання, авторизуйтесь у Google та вставте код:
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(gdriveStatus.auth_url, '_blank')}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Відкрити Google авторизацію
                      </Button>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Вставте код авторизації..."
                          value={authCode}
                          onChange={(e) => setAuthCode(e.target.value)}
                        />
                        <Button
                          onClick={handleAuthorize}
                          disabled={!authCode.trim() || gdriveAuthorize.isPending}
                        >
                          {gdriveAuthorize.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Підтвердити'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  {gdriveStatus.auth_error && (
                    <p className="text-sm text-destructive">{gdriveStatus.auth_error}</p>
                  )}
                </>
              )}

              {!gdriveStatus?.configured && (
                <p className="text-sm text-muted-foreground">
                  Спершу завантажте credentials.json
                </p>
              )}

              {gdriveStatus?.authorized && (
                <p className="text-sm text-green-600">Google Drive підключено успішно!</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGDriveSetup(false)}>
              Закрити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={!!restoreFilename}
        onOpenChange={(open) => {
          if (!open) {
            setRestoreFilename(null)
            setRestoreResults(null)
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Відновлення з бекапу
            </DialogTitle>
            <DialogDescription>
              {restoreFilename}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
          {restoreResults ? (
            /* Results view */
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Відновлення завершено
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Модель</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Записів</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(restoreResults).map(([key, r]) => (
                    <TableRow key={key}>
                      <TableCell className="py-1.5 font-medium text-sm">
                        {MODEL_LABELS[key] || key}
                      </TableCell>
                      <TableCell className="py-1.5">
                        {r.status === 'ok' ? (
                          <Badge variant="default" className="bg-green-600">OK</Badge>
                        ) : r.status === 'skip' ? (
                          <Badge variant="secondary">Пропущено</Badge>
                        ) : (
                          <Badge variant="destructive">Помилка</Badge>
                        )}
                        {(r.errors ?? 0) > 0 && (
                          <Badge variant="outline" className="ml-1 text-amber-600">
                            {r.errors} помилок
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Config view */
            <div className="space-y-4">
              {/* Backup info */}
              {backupContents?.meta && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Створено:</span>
                    {formatDate(backupContents.meta.created_at)}
                    <span className="text-muted-foreground">
                      ({backupContents.meta.created_by})
                    </span>
                  </div>
                </div>
              )}

              {/* Mode selection */}
              <div className="space-y-2">
                <Label className="font-medium">Режим відновлення</Label>
                <RadioGroup
                  value={restoreMode}
                  onValueChange={(v) => setRestoreMode(v as 'merge' | 'replace')}
                >
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="merge" id="merge" className="mt-0.5" />
                    <div>
                      <Label htmlFor="merge" className="font-medium">
                        Злиття (merge)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Додати/оновити записи. Існуючі дані залишаться.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                    <div>
                      <Label htmlFor="replace" className="font-medium">
                        Заміна (replace)
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Видалити поточні дані та завантажити з бекапу.
                      </p>
                      {restoreMode === 'replace' && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                          <AlertTriangle className="h-3 w-3" />
                          Увага: поточні дані будуть видалені!
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              {/* Model selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">Що відновлювати</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectAll}
                      onCheckedChange={(v) => {
                        setSelectAll(!!v)
                        if (v) setSelectedModels([])
                      }}
                    />
                    <Label htmlFor="select-all" className="text-sm">
                      Все
                    </Label>
                  </div>
                </div>

                {!selectAll && backupContents?.meta?.counts && (
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(backupContents.meta.counts).map(([key, count]) => (
                      <div key={key} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                        <Checkbox
                          id={`model-${key}`}
                          checked={selectedModels.includes(key)}
                          onCheckedChange={() => toggleModel(key)}
                        />
                        <Label htmlFor={`model-${key}`} className="flex-1 cursor-pointer text-sm">
                          {MODEL_LABELS[key] || key}
                        </Label>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreFilename(null)
                setRestoreResults(null)
              }}
            >
              {restoreResults ? 'Закрити' : 'Скасувати'}
            </Button>
            {!restoreResults && (
              <Button
                onClick={handleRestore}
                disabled={restoreBackup.isPending || (!selectAll && selectedModels.length === 0)}
                variant={restoreMode === 'replace' ? 'destructive' : 'default'}
              >
                {restoreBackup.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                {restoreMode === 'replace' ? 'Замінити дані' : 'Відновити'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Налаштування бекапів</DialogTitle>
            <DialogDescription>
              Параметри автоматичного резервного копіювання
            </DialogDescription>
          </DialogHeader>

          {settings && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Автоматичний бекап</Label>
                  <p className="text-sm text-muted-foreground">
                    Celery створює бекап за розкладом
                  </p>
                </div>
                <Switch
                  checked={settings.auto_backup}
                  onCheckedChange={(v) => handleSaveSettings('auto_backup', v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Автозавантаження на Google Drive</Label>
                  <p className="text-sm text-muted-foreground">
                    Автоматично завантажувати бекап в хмару
                  </p>
                </div>
                <Switch
                  checked={settings.auto_upload_gdrive}
                  onCheckedChange={(v) => handleSaveSettings('auto_upload_gdrive', v)}
                  disabled={!isGDriveReady}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Інтервал (годин)</Label>
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={settings.interval_hours}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (v >= 1 && v <= 168) handleSaveSettings('interval_hours', v)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Максимум локальних бекапів</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.max_local_backups}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (v >= 1 && v <= 100) handleSaveSettings('max_local_backups', v)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Зберігати бекапи (днів)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.max_age_days}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    if (v >= 1 && v <= 365) handleSaveSettings('max_age_days', v)
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Закрити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function GDriveNotConfigured({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Cloud className="mb-3 h-12 w-12 text-muted-foreground/50" />
      <h3 className="mb-1 text-lg font-semibold">Google Drive не налаштовано</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        Для хмарного зберігання бекапів підключіть Google Drive. Вам знадобиться файл
        credentials.json з Google Cloud Console.
      </p>
      <Button onClick={onSetup}>
        <Upload className="mr-2 h-4 w-4" />
        Налаштувати Google Drive
      </Button>
    </div>
  )
}

function GDriveNotAuthorized({
  onSetup,
}: {
  authUrl?: string
  onSetup: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <KeyRound className="mb-3 h-12 w-12 text-amber-500/70" />
      <h3 className="mb-1 text-lg font-semibold">Потрібна авторизація</h3>
      <p className="mb-4 max-w-md text-sm text-muted-foreground">
        Credentials завантажено, але потрібно авторизувати доступ до Google Drive.
      </p>
      <Button onClick={onSetup}>
        <KeyRound className="mr-2 h-4 w-4" />
        Авторизувати
      </Button>
    </div>
  )
}
