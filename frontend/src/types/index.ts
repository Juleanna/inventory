export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  department: string
  position: string
  phone: string
  is_staff: boolean
  is_active: boolean
}

export interface Equipment {
  id: number
  name: string
  category: string
  model: string
  manufacturer: string
  serial_number: string
  inventory_number: string
  mac_address: string
  ip_address: string
  hostname: string
  purchase_date: string | null
  warranty_until: string | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  expiry_date: string | null
  location: string
  building: string
  floor: string
  room: string
  status: string
  priority: string
  current_user: number | null
  current_user_details?: User
  responsible_person: number | null
  responsible_person_details?: User
  purchase_price: string | null
  depreciation_rate: string | null
  cpu: string
  ram: string
  storage: string
  gpu: string
  operating_system: string
  barcode_image: string | null
  qrcode_image: string | null
  photo: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: number
  user: string
  title: string
  message: string
  notification_type: string
  priority: string
  equipment: number | null
  read: boolean
  created_at: string
}

export interface MaintenanceRequest {
  id: number
  equipment: number
  equipment_details?: Equipment
  request_type: string
  description: string
  status: string
  priority: string
  requested_by: number
  assigned_to: number | null
  scheduled_date: string | null
  completed_date: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface MaintenanceSchedule {
  id: number
  equipment: number
  equipment_details?: Equipment
  schedule_type: string
  interval_days: number
  last_performed: string | null
  next_due: string | null
  assigned_technician: number | null
  is_active: boolean
  notes: string
  created_at: string
}

export interface SparePart {
  id: number
  name: string
  category: number | null
  category_details?: SparePartCategory
  part_number: string
  manufacturer: string
  description: string
  quantity: number
  min_quantity: number
  unit_price: string
  location: string
  supplier: number | null
  supplier_details?: Supplier
  compatible_equipment: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SparePartCategory {
  id: number
  name: string
  description: string
}

export interface Supplier {
  id: number
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  website: string
  notes: string
  is_active: boolean
  created_at: string
}

export interface PurchaseOrder {
  id: number
  order_number: string
  supplier: number
  supplier_details?: Supplier
  status: string
  total_amount: string
  items: PurchaseOrderItem[]
  notes: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: number
  spare_part: number
  spare_part_details?: SparePart
  quantity: number
  unit_price: string
  total_price: string
}

export interface SparePartMovement {
  id: number
  spare_part: number
  movement_type: string
  quantity: number
  equipment: number | null
  performed_by: number
  notes: string
  created_at: string
}

export interface PasswordSystem {
  id: number
  name: string
  url: string
  category: number | null
  description: string
  created_at: string
}

export interface PasswordCategory {
  id: number
  name: string
  description: string
}

export interface PasswordAccount {
  id: number
  system: number
  system_details?: PasswordSystem
  username: string
  password?: string
  notes: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface DashboardStats {
  total_equipment: number
  working: number
  repair: number
  maintenance: number
  storage: number
  disposed: number
  by_category: Record<string, number>
  by_status: Record<string, number>
  recent_activities: Array<{
    action: string
    equipment: string
    date: string
    user: string
  }>
  warranty_expiring: number
  needs_maintenance: number
}

export interface AnalyticsData {
  equipment_by_category: Array<{ name: string; value: number }>
  equipment_by_status: Array<{ name: string; value: number }>
  equipment_by_location: Array<{ name: string; value: number }>
  monthly_purchases: Array<{ month: string; count: number; amount: number }>
  total_value: number
  avg_age: number
  maintenance_stats: {
    total_requests: number
    completed: number
    pending: number
    avg_resolution_days: number
  }
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
  password2: string
  first_name: string
  last_name: string
}
