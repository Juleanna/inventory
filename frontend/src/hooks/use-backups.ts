import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { backupsApi, type BackupSettings } from '@/api/backups'

export function useBackupList() {
  return useQuery({
    queryKey: ['backups'],
    queryFn: backupsApi.list,
  })
}

export function useBackupSettings() {
  return useQuery({
    queryKey: ['backup-settings'],
    queryFn: backupsApi.getSettings,
  })
}

export function useGDriveStatus() {
  return useQuery({
    queryKey: ['gdrive-status'],
    queryFn: backupsApi.gdriveStatus,
  })
}

export function useCreateBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (uploadToGDrive?: boolean) => backupsApi.create(uploadToGDrive),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })
}

export function useDeleteBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backupsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })
}

export function useUploadToGDrive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backupsApi.uploadToGDrive,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })
}

export function useGDriveAuthorize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backupsApi.gdriveAuthorize,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gdrive-status', 'backups'] }),
  })
}

export function useGDriveUploadCredentials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backupsApi.gdriveUploadCredentials,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gdrive-status'] }),
  })
}

export function useGDriveDeleteBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: backupsApi.gdriveDelete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backups'] }),
  })
}

export function useUpdateBackupSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<BackupSettings>) => backupsApi.updateSettings(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['backup-settings'] }),
  })
}

export function useBackupContents(filename: string | null) {
  return useQuery({
    queryKey: ['backup-contents', filename],
    queryFn: () => backupsApi.getContents(filename!),
    enabled: !!filename,
  })
}

export function useRestoreBackup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { filename: string; mode: 'merge' | 'replace'; models?: string[] }) =>
      backupsApi.restore(params.filename, params.mode, params.models),
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}
