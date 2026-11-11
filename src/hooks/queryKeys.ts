/**
 * Ključevi React Query predmemorije na jednom mjestu.
 * Vozila i aktivnosti ovise jedni o drugima (stanje vozila izvodi se iz aktivnosti),
 * pa promjena jednih mora osvježiti i druge.
 */
export const vehicleKeys = {
  all: ['vehicles'] as const,
  detail: (id: string) => ['vehicles', id] as const,
  activityCount: (id: string) => ['vehicles', id, 'activity-count'] as const,
}

export const activityKeys = {
  all: ['activities'] as const,
  /** Sve aktivnosti ili samo aktivnosti jednog vozila. */
  list: (vehicleId?: string) => ['activities', 'list', vehicleId ?? 'all'] as const,
  detail: (id: string) => ['activities', 'detail', id] as const,
}

export const settingsKeys = {
  settings: ['settings'] as const,
  logs: ['notification-logs'] as const,
}
