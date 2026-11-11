import { useQuery } from '@tanstack/react-query'
import { fetchExportData } from '@/data/export'
import { exportKeys } from './queryKeys'

/** Svi podaci za izvoz – uvijek svježe pri otvaranju stranice, ne čuvaju se nakon izlaska. */
export function useExportData() {
  return useQuery({ queryKey: exportKeys.all, queryFn: fetchExportData, staleTime: 0, gcTime: 0 })
}
