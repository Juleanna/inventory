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
  CRITICAL: 'Критичний',
}

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CRITICAL: 'bg-red-200 text-red-900 dark:bg-red-950 dark:text-red-200',
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  INFO: 'Інформація',
  WARNING: 'Попередження',
  ERROR: 'Помилка',
  SUCCESS: 'Успіх',
}

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Очікує',
  APPROVED: 'Затверджено',
  IN_PROGRESS: 'В процесі',
  COMPLETED: 'Завершено',
  CANCELLED: 'Скасовано',
}

export const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  SCHEDULED: 'Планове',
  REPAIR: 'Ремонт',
  INSPECTION: 'Інспекція',
  UPGRADE: 'Оновлення',
  REPLACEMENT: 'Заміна',
  CLEANING: 'Чистка',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Щоденно',
  WEEKLY: 'Щотижня',
  MONTHLY: 'Щомісяця',
  QUARTERLY: 'Щокварталу',
  SEMI_ANNUALLY: 'Раз на пів року',
  ANNUALLY: 'Щорічно',
  CUSTOM: 'Власний інтервал',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Чернетка',
  PENDING: 'Очікує',
  APPROVED: 'Затверджено',
  ORDERED: 'Замовлено',
  PARTIALLY_RECEIVED: 'Часткове отримання',
  RECEIVED: 'Отримано',
  CANCELLED: 'Скасовано',
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  IT: 'IT відділ',
  HR: 'Відділ кадрів',
  FINANCE: 'Фінансовий відділ',
  MARKETING: 'Маркетинг',
  SALES: 'Продажі',
  MANAGEMENT: 'Управління',
  OPERATIONS: 'Операційний відділ',
  SUPPORT: 'Служба підтримки',
  OTHER: 'Інший',
}

export const POSITION_LABELS: Record<string, string> = {
  MANAGER: 'Менеджер',
  DEVELOPER: 'Розробник',
  ANALYST: 'Аналітик',
  ADMIN: 'Адміністратор',
  SPECIALIST: 'Спеціаліст',
  DIRECTOR: 'Директор',
  COORDINATOR: 'Координатор',
  ASSISTANT: 'Асистент',
  OTHER: 'Інша',
}

export const SYSTEM_TYPE_LABELS: Record<string, string> = {
  web: 'Веб-система',
  database: 'База даних',
  server: 'Сервер',
  network: 'Мережеве обладнання',
  cloud: 'Хмарний сервіс',
  software: 'Програмне забезпечення',
  service: 'Сервіс',
  other: 'Інше',
}

export const CRITICALITY_LABELS: Record<string, string> = {
  low: 'Низька',
  medium: 'Середня',
  high: 'Висока',
  critical: 'Критична',
}

export const CRITICALITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  admin: 'Адміністратор',
  user: 'Користувач',
  service: 'Сервісний',
  readonly: 'Тільки читання',
  api: 'API ключ',
  other: 'Інше',
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Активний',
  disabled: 'Відключений',
  expired: 'Прострочений',
  locked: 'Заблокований',
}

export const SPARE_PART_CONDITION_LABELS: Record<string, string> = {
  NEW: 'Нова',
  REFURBISHED: 'Відновлена',
  USED: 'Вживана',
  DAMAGED: 'Пошкоджена',
}

export const SPARE_PART_STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'В наявності',
  LOW_STOCK: 'Мало',
  OUT_OF_STOCK: 'Немає',
  DISCONTINUED: 'Знято з виробництва',
  RESERVED: 'Зарезервовано',
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Повна зайнятість',
  PART_TIME: 'Часткова зайнятість',
  CONTRACT: 'Контракт',
  INTERN: 'Стажер',
}

export const PERIPHERAL_TYPE_LABELS: Record<string, string> = {
  keyboard: 'Клавіатура',
  mouse: 'Миша',
  monitor: 'Монітор',
  printer: 'Принтер',
  scanner: 'Сканер',
  headset: 'Гарнітура',
  webcam: 'Вебкамера',
  ups: 'ДБЖ',
  other: 'Інше',
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
