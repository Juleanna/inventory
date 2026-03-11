import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templatesApi } from '@/api/templates'
import { toast } from 'sonner'

export function useTemplates() {
  return useQuery({
    queryKey: ['equipment-templates'],
    queryFn: () => templatesApi.list(),
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment-templates'] }); toast.success('Шаблон створено') },
    onError: () => toast.error('Помилка створення шаблону'),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment-templates'] }); toast.success('Шаблон видалено') },
    onError: () => toast.error('Помилка видалення'),
  })
}

export function useCreateFromTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, overrides }: { id: number; overrides?: Record<string, unknown> }) =>
      templatesApi.createEquipment(id, overrides),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['equipment'] }); toast.success('Обладнання створено з шаблону') },
    onError: () => toast.error('Помилка створення з шаблону'),
  })
}
