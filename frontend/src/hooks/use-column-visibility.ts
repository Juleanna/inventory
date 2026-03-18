import { useState, useCallback, useEffect } from 'react'

export interface ColumnDef<K extends string = string> {
  key: K
  label: string
}

export function useColumnVisibility<K extends string>(
  storageKey: string,
  allColumns: ColumnDef<K>[],
  defaultColumns?: K[],
) {
  const defaults = defaultColumns ?? allColumns.map((c) => c.key)

  const [visibleColumns, setVisibleColumns] = useState<K[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : defaults
    } catch {
      return defaults
    }
  })

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleColumns))
  }, [storageKey, visibleColumns])

  const isColumnVisible = useCallback(
    (key: K) => visibleColumns.includes(key),
    [visibleColumns],
  )

  const toggleColumn = useCallback((key: K) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    )
  }, [])

  return { visibleColumns, isColumnVisible, toggleColumn, allColumns }
}
