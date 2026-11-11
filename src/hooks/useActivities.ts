import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createActivity,
  deleteActivity,
  fetchActivities,
  fetchActivity,
  updateActivity,
  type ActivityFields,
} from '@/data/activities'
import { activityKeys, vehicleKeys } from './queryKeys'

export function useActivities(vehicleId?: string) {
  return useQuery({
    queryKey: activityKeys.list(vehicleId),
    queryFn: () => fetchActivities(vehicleId),
  })
}

export function useActivity(id: string | undefined) {
  return useQuery({
    queryKey: activityKeys.detail(id ?? ''),
    queryFn: () => fetchActivity(id!),
    enabled: Boolean(id),
  })
}

/**
 * Nakon svake promjene aktivnosti osvježavaju se i vozila:
 * istek registracije, gume, servis i kilometraža izvode se iz aktivnosti.
 */
function refreshAfterChange(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
  return queryClient.invalidateQueries({ queryKey: activityKeys.all })
}

export function useCreateActivity(vehicleId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: ActivityFields) => createActivity(vehicleId, fields),
    onSuccess: () => refreshAfterChange(queryClient),
  })
}

export function useUpdateActivity(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (fields: ActivityFields) => updateActivity(id, fields),
    onSuccess: () => refreshAfterChange(queryClient),
  })
}

export function useDeleteActivity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteActivity(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: activityKeys.detail(id) })
      return refreshAfterChange(queryClient)
    },
  })
}
