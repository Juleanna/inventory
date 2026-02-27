export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone: string
  mobile_phone: string
  position: string
  custom_position: string
  department: string
  custom_department: string
  office_location: string
  room_number: string
  manager: number | null
  hire_date: string | null
  birth_date: string | null
  bio: string
  skills: string
  employment_type: string
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
  asset_tag: string
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
  supplier: string
  purchase_price: string | null
  depreciation_rate: string | null
  cpu: string
  ram: string
  storage: string
  gpu: string
  operating_system: string
  description: string
  notes: string
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
  id: string
  equipment: number
  equipment_details?: Equipment
  request_type: string
  title: string
  description: string
  status: string
  priority: string
  requester: number
  assigned_technician: number | null
  approved_by: number | null
  requested_date: string
  scheduled_date: string | null
  started_date: string | null
  completed_date: string | null
  estimated_cost: string | null
  actual_cost: string | null
  parts_needed: string
  downtime_required: boolean
  estimated_duration: string | null
  actual_duration: string | null
  notes: string
  created_at: string
  updated_at: string
}

export interface MaintenanceSchedule {
  id: number
  equipment: number
  equipment_details?: Equipment
  title: string
  description: string
  frequency: string
  custom_interval_days: number | null
  next_maintenance: string
  responsible_person: number | null
  responsible_person_details?: User
  estimated_duration: string
  checklist: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SparePart {
  id: string
  name: string
  part_number: string
  manufacturer_part_number: string
  description: string
  category: string | null
  category_details?: SparePartCategory
  manufacturer: string
  quantity_in_stock: number
  minimum_stock_level: number
  maximum_stock_level: number
  reorder_point: number
  unit_cost: string
  unit_price: string
  weight: string | null
  dimensions: string
  condition: string
  status: string
  primary_supplier: number | null
  primary_supplier_details?: Supplier
  alternative_suppliers: number[]
  storage_location: string
  last_received_date: string | null
  last_issued_date: string | null
  expiry_date: string | null
  warranty_period_days: number
  barcode: string
  image: string | null
  notes: string
  is_critical: boolean
  compatible_equipment: number[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SparePartCategory {
  id: number
  name: string
  description: string
  parent: number | null
}

export interface Supplier {
  id: number
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  website: string
  tax_id: string
  rating: string
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  order_number: string
  supplier: number
  supplier_details?: Supplier
  status: string
  order_date: string
  expected_delivery_date: string | null
  actual_delivery_date: string | null
  total_amount: string
  tax_amount: string
  shipping_cost: string
  items: PurchaseOrderItem[]
  notes: string
  created_by: number | null
  approved_by: number | null
  created_at: string
  updated_at: string
}

export interface PurchaseOrderItem {
  id: number
  spare_part: string
  spare_part_details?: SparePart
  quantity_ordered: number
  quantity_received: number
  unit_price: string
  total_price: string
  notes: string
}

export interface SparePartMovement {
  id: string
  spare_part: string
  movement_type: string
  quantity: number
  unit_cost: string
  reference_number: string
  equipment: number | null
  maintenance_request: string | null
  performed_by: number | null
  notes: string
  performed_at: string
  created_at: string
}

export interface PasswordSystem {
  id: number
  name: string
  category: number | null
  system_type: string
  url: string
  ip_address: string | null
  port: number | null
  description: string
  criticality: string
  owner: number | null
  is_active: boolean
  accounts_count: number
  created_at: string
  updated_at: string
}

export interface PasswordCategory {
  id: number
  name: string
  description: string
  icon: string
  color: string
  is_active: boolean
}

export interface PasswordAccount {
  id: number
  system: number
  system_details?: PasswordSystem
  username: string
  password?: string
  account_type: string
  email: string
  description: string
  status: string
  assigned_to: number | null
  assigned_to_details?: User
  password_expires: string | null
  notes: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface Software {
  id: number
  name: string
  version: string
  vendor: string
  license: number | null
  license_details?: License
  installed_on: number[]
  installed_on_details?: Equipment[]
}

export interface PeripheralDevice {
  id: number
  name: string
  type: string
  serial_number: string
  connected_to: number | null
  connected_to_details?: Equipment
}

export interface License {
  id: number
  license_type: string
  key: string
  description: string
  activations: number
  start_date: string
  end_date: string
  device: number | null
  device_details?: Equipment
  user: number | null
  user_details?: User
}

export interface EquipmentDocument {
  id: number
  equipment: number
  file: string
  description: string
  uploaded_at: string
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
