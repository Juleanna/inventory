export const CATEGORY_LABELS: Record<string, string> = {
  PC: 'Персональний комп\'ютер',
  WORK: 'Робоча станція',
  SRV: 'Сервер',
  PRN: 'Принтер',
  LAPTOP: 'Ноутбук',
  TABLET: 'Планшет',
  PHONE: 'Телефон',
  MONITOR: 'Монітор',
  NETWORK: 'Мережеве обладнання',
  OTH: 'Інше',
}

export const STATUS_LABELS: Record<string, string> = {
  WORKING: 'Працює',
  REPAIR: 'В ремонті',
  MAINTENANCE: 'На обслуговуванні',
  STORAGE: 'На складі',
  DISPOSED: 'Списано',
  LOST: 'Втрачено',
}

export const STATUS_COLORS: Record<string, string> = {
  WORKING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REPAIR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  MAINTENANCE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  STORAGE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DISPOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  LOST: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
}

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низький',
  MEDIUM: 'Середній',
  HIGH: 'Високий',
  URGENT: 'Терміновий',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  INFO: 'Інформація',
  WARNING: 'Попередження',
  ERROR: 'Помилка',
  SUCCESS: 'Успіх',
}

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  IN_PROGRESS: 'В процесі',
  COMPLETED: 'Завершено',
  CANCELLED: 'Скасовано',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Чернетка',
  SUBMITTED: 'Подано',
  APPROVED: 'Затверджено',
  ORDERED: 'Замовлено',
  RECEIVED: 'Отримано',
  CANCELLED: 'Скасовано',
}

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}))
