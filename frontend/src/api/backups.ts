import apiClient from './client'

export interface BackupInfo {
  filename: string
  size: number
  created_at: string
}

export interface GDriveBackupInfo {
  id: string
  filename: string
  size: number
  created_at: string
  link: string
}

export interface BackupListResponse {
  local: BackupInfo[]
  gdrive: GDriveBackupInfo[]
  gdrive_configured: boolean
  gdrive_authorized: boolean
}

export interface BackupCreateResponse {
  filename: string
  size: number
  counts: Record<string, number>
  created_at: string
  gdrive: { id: string; name: string; link: string } | { error: string } | null
}

export interface GDriveStatus {
  configured: boolean
  authorized: boolean
  auth_url?: string
  auth_error?: string
}

export interface BackupSettings {
  auto_backup: boolean
  auto_upload_gdrive: boolean
  interval_hours: number
  max_local_backups: number
  max_age_days: number
}

export interface BackupContents {
  meta: {
    created_at: string
    created_by: string
    django_version: string
    counts: Record<string, number>
  }
  files: { name: string; size: number }[]
}

export interface RestoreResult {
  results: Record<string, { status: string; count: number; errors?: number; message?: string }>
  total_restored: number
  total_errors: number
}

export const backupsApi = {
  list: () =>
    apiClient.get<BackupListResponse>('/backups/').then((r) => r.data),

  create: (uploadToGDrive = false) =>
    apiClient
      .post<BackupCreateResponse>('/backups/create/', { upload_to_gdrive: uploadToGDrive })
      .then((r) => r.data),

  download: (filename: string) =>
    apiClient
      .get(`/backups/download/${filename}/`, { responseType: 'blob' })
      .then((r) => {
        const url = window.URL.createObjectURL(new Blob([r.data]))
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      }),

  delete: (filename: string) =>
    apiClient.delete(`/backups/delete/${filename}/`).then((r) => r.data),

  uploadToGDrive: (filename: string) =>
    apiClient
      .post('/backups/upload-gdrive/', { filename })
      .then((r) => r.data),

  // Google Drive
  gdriveStatus: () =>
    apiClient.get<GDriveStatus>('/backups/gdrive/status/').then((r) => r.data),

  gdriveAuthorize: (code: string) =>
    apiClient
      .post('/backups/gdrive/authorize/', { code })
      .then((r) => r.data),

  gdriveUploadCredentials: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient
      .post('/backups/gdrive/credentials/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  gdriveDelete: (fileId: string) =>
    apiClient.delete(`/backups/gdrive/delete/${fileId}/`).then((r) => r.data),

  // Restore
  getContents: (filename: string) =>
    apiClient.get<BackupContents>(`/backups/contents/${filename}/`).then((r) => r.data),

  restore: (filename: string, mode: 'merge' | 'replace', models?: string[]) =>
    apiClient
      .post<RestoreResult>(`/backups/restore/${filename}/`, { mode, models: models || null })
      .then((r) => r.data),

  // Settings
  getSettings: () =>
    apiClient.get<BackupSettings>('/backups/settings/').then((r) => r.data),

  updateSettings: (data: Partial<BackupSettings>) =>
    apiClient.put<BackupSettings>('/backups/settings/', data).then((r) => r.data),
}
