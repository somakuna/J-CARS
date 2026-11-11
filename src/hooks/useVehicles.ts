import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  countVehicleActivities,
  createVehicle,
  deleteVehicle,
  fetchVehicle,
  fetchVehicles,
  updateVehicle,
} from '@/data/vehicles'
import type { VehicleInsert } from '@/types/database'
import { activityKeys, vehicleKeys } from './queryKeys'

export function useVehicles() {
  return useQuery({ queryKey: vehicleKeys.all, queryFn: fetchVehicles })
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: vehicleKeys.detail(id ?? ''),
    queryFn: () => fetchVehicle(id!),
    enabled: Boolean(id),
  })
}

export function useVehicleActivityCount(id: string, enabled: boolean) {
  return useQuery({
    queryKey: vehicleKeys.activityCount(id),
    queryFn: () => countVehicleActivities(id),
    enabled,
  })
}

export function useCreateVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: VehicleInsert) => createVehicle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  })
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<VehicleInsert>) => updateVehicle(id, input),
    onSuccess: () => {
      // Popis aktivnosti prikazuje naziv i oznaku vozila.
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
      return queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
    },
  })
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: vehicleKeys.detail(id) })
      queryClient.removeQueries({ queryKey: activityKeys.list(id) })
      // Bez čekanja – stranica odmah preusmjerava na popis.
      void queryClient.invalidateQueries({ queryKey: vehicleKeys.all, exact: true })
      // Aktivnosti vozila obrisane su kaskadno.
      void queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}
