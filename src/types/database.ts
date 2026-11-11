/**
 * Tipovi baze – ručno usklađeni s supabase/migrations.
 * Oblik je isti kao kod `supabase gen types typescript`, pa se datoteka
 * kasnije može zamijeniti generiranom bez promjena u ostatku koda.
 */

export type ActivityType = 'registration' | 'tires' | 'service' | 'other'
export type TireType = 'summer' | 'winter' | 'all_season'
export type ServiceType = 'minor' | 'major' | 'repair' | 'other'
export type ThemeSetting = 'system' | 'light' | 'dark'
export type DeadlineType = 'registration' | 'service' | 'activity' | 'test'
/** Obavijesti se šalju samo kao push poruke (e-mail je uklonjen). */
export type NotificationChannel = 'push'
export type NotificationStatus = 'sent' | 'failed' | 'skipped'
export type ReminderInterval = 30 | 14 | 7 | 1 | 0

type VehicleRow = {
  id: string
  user_id: string
  make: string
  model: string
  registration_number: string
  year: number | null
  current_mileage: number | null
  registration_expiry: string
  responsible_person: string | null
  note: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type ActivityRow = {
  id: string
  user_id: string
  vehicle_id: string
  activity_type: ActivityType
  title: string | null
  description: string | null
  activity_date: string
  mileage: number | null
  registration_expiry: string | null
  tire_type: TireType | null
  tire_size: string | null
  service_type: ServiceType | null
  next_service_date: string | null
  next_service_mileage: number | null
  reminder_enabled: boolean
  created_at: string
  updated_at: string
}

type VehicleOverviewRow = VehicleRow & {
  effective_registration_expiry: string
  current_tire_type: TireType | null
  current_tire_size: string | null
  last_tire_change_date: string | null
  effective_mileage: number | null
  last_service_date: string | null
  last_service_mileage: number | null
  last_service_type: ServiceType | null
  next_service_date: string | null
  next_service_mileage: number | null
}

type SettingsRow = {
  id: string
  user_id: string
  push_notifications_enabled: boolean
  reminder_30_days: boolean
  reminder_14_days: boolean
  reminder_7_days: boolean
  reminder_1_day: boolean
  reminder_on_expiry: boolean
  theme: ThemeSetting
  created_at: string
  updated_at: string
}

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  device_info: string | null
  last_success_at: string | null
  created_at: string
  updated_at: string
}

type NotificationLogRow = {
  id: string
  user_id: string
  vehicle_id: string | null
  activity_id: string | null
  deadline_type: DeadlineType
  deadline_date: string | null
  reminder_interval: ReminderInterval | null
  notification_type: NotificationChannel
  recipient: string | null
  sent_at: string
  status: NotificationStatus
  error_message: string | null
}

/** Stupci koje baza popunjava sama (id, vlasnik, vremenske oznake). */
type ServerManaged = 'id' | 'user_id' | 'created_at' | 'updated_at'

/** Insert: obavezna polja ostaju obavezna, polja s početnom vrijednošću postaju neobavezna. */
type InsertOf<Row, Optional extends keyof Row> = Omit<Row, ServerManaged | Optional> &
  Partial<Pick<Row, Optional | Extract<ServerManaged, keyof Row>>>

type VehicleInsert = InsertOf<
  VehicleRow,
  'year' | 'current_mileage' | 'responsible_person' | 'note' | 'is_active'
>

type ActivityInsert = InsertOf<
  ActivityRow,
  | 'title'
  | 'description'
  | 'mileage'
  | 'registration_expiry'
  | 'tire_type'
  | 'tire_size'
  | 'service_type'
  | 'next_service_date'
  | 'next_service_mileage'
  | 'reminder_enabled'
>

type PushSubscriptionInsert = InsertOf<PushSubscriptionRow, 'device_info' | 'last_success_at'>

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '13'
  }
  public: {
    Tables: {
      vehicles: {
        Row: VehicleRow
        Insert: VehicleInsert
        Update: Partial<VehicleInsert>
        Relationships: []
      }
      activities: {
        Row: ActivityRow
        Insert: ActivityInsert
        Update: Partial<ActivityInsert>
        Relationships: [
          {
            foreignKeyName: 'activities_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
        ]
      }
      settings: {
        Row: SettingsRow
        Insert: Partial<SettingsRow>
        Update: Partial<Omit<SettingsRow, ServerManaged>>
        Relationships: []
      }
      push_subscriptions: {
        Row: PushSubscriptionRow
        Insert: PushSubscriptionInsert
        Update: Partial<PushSubscriptionInsert>
        Relationships: []
      }
      notification_logs: {
        Row: NotificationLogRow
        Insert: Partial<NotificationLogRow>
        Update: Partial<NotificationLogRow>
        Relationships: [
          {
            foreignKeyName: 'notification_logs_vehicle_id_fkey'
            columns: ['vehicle_id']
            isOneToOne: false
            referencedRelation: 'vehicles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_logs_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      vehicle_overview: {
        Row: VehicleOverviewRow
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Vehicle = VehicleRow
export type VehicleOverview = VehicleOverviewRow
export type Activity = ActivityRow
export type Settings = SettingsRow
export type PushSubscriptionRecord = PushSubscriptionRow
export type NotificationLog = NotificationLogRow
export type { ActivityInsert, VehicleInsert }
