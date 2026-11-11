import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotificationLogs,
  fetchSettings,
  sendTestNotification,
  updateSettings,
  type SettingsPatch,
} from '@/data/settings'
import type { Settings } from '@/types/database'
import { settingsKeys } from './queryKeys'

export function useSettings() {
  return useQuery({ queryKey: settingsKeys.settings, queryFn: fetchSettings })
}

export function useNotificationLogs() {
  return useQuery({ queryKey: settingsKeys.logs, queryFn: () => fetchNotificationLogs() })
}

/** Promjena postavki odmah se vidi (optimistično); ako spremanje ne uspije, vraća se staro stanje. */
export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SettingsPatch }) => updateSettings(id, patch),
    onMutate: async ({ patch }) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.settings })
      const previous = queryClient.getQueryData<Settings>(settingsKeys.settings)
      if (previous) queryClient.setQueryData<Settings>(settingsKeys.settings, { ...previous, ...patch })
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(settingsKeys.settings, context.previous)
    },
    onSuccess: (data) => queryClient.setQueryData(settingsKeys.settings, data),
  })
}

export function useSendTestNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => sendTestNotification(),
    // I neuspjeli pokušaj zapisuje se u evidenciju.
    onSettled: () => queryClient.invalidateQueries({ queryKey: settingsKeys.logs }),
  })
}
