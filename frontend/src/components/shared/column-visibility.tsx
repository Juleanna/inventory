import { Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ColumnDef } from '@/hooks/use-column-visibility'

interface ColumnVisibilityProps<K extends string> {
  allColumns: ColumnDef<K>[]
  isColumnVisible: (key: K) => boolean
  toggleColumn: (key: K) => void
  disabledColumns?: K[]
}

export function ColumnVisibility<K extends string>({
  allColumns,
  isColumnVisible,
  toggleColumn,
  disabledColumns = [],
}: ColumnVisibilityProps<K>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Налаштування колонок">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <p className="text-sm font-medium mb-2">Колонки</p>
        {allColumns.map((col) => (
          <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer">
            <Checkbox
              checked={isColumnVisible(col.key)}
              onCheckedChange={() => toggleColumn(col.key)}
              disabled={disabledColumns.includes(col.key)}
            />
            <span className="text-sm">{col.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}
