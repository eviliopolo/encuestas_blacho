import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TABLE_COLUMNS, formatCellValue, formatDate } from '@/lib/tableColumns'
import { Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

export function EncuestaTable({ data, onEdit, onDelete, loading }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!data) return []
    const s = (search || '').toLowerCase().trim()
    if (!s) return data
    return data.filter(
      (row) =>
        (row.nombre && String(row.nombre).toLowerCase().includes(s)) ||
        (row.ied && String(row.ied).toLowerCase().includes(s)) ||
        (row.identificacion && String(row.identificacion).toLowerCase().includes(s))
    )
  }, [data, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const fixedColumns = TABLE_COLUMNS.filter((c) => c.fixed)
  const scrollColumns = TABLE_COLUMNS.filter((c) => !c.fixed)

  const getCellValue = (row, col) => {
    const v = row[col.key]
    if (col.key === 'created_at' || col.key === 'fecha_registro') return formatDate(v)
    return formatCellValue(v)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Buscar por nombre, IED o identificación..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pl-3 pr-4"
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Total: <strong>{filtered.length}</strong> encuesta(s)
        </p>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="border-b bg-muted/50">
                {fixedColumns.map((col) => (
                  <th
                    key={col.key}
                    className="sticky left-0 z-10 bg-muted/50 border-r px-3 py-3 text-left text-sm font-medium text-foreground whitespace-nowrap"
                    style={{ minWidth: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                {scrollColumns.map((col) => (
                  <th
                    key={col.key}
                    className="border-r px-3 py-3 text-left text-sm font-medium text-foreground whitespace-nowrap last:border-r-0"
                    style={{ minWidth: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="sticky right-0 z-10 bg-muted/50 border-l px-3 py-3 text-left text-sm font-medium text-foreground whitespace-nowrap min-w-[140px]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                    No hay encuestas. Cree una con &quot;Nueva Encuesta&quot;.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-muted/30 transition-colors">
                    {fixedColumns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'sticky left-0 z-10 border-r px-3 py-2 text-sm bg-card',
                          col.key === 'id' && 'font-mono'
                        )}
                        style={{ minWidth: col.width }}
                      >
                        {getCellValue(row, col)}
                      </td>
                    ))}
                    {scrollColumns.map((col) => (
                      <td
                        key={col.key}
                        className="border-r px-3 py-2 text-sm last:border-r-0"
                        style={{ minWidth: col.width }}
                        title={row[col.key] != null ? String(row[col.key]) : ''}
                      >
                        {getCellValue(row, col)}
                      </td>
                    ))}
                    <td className="sticky right-0 z-10 bg-card border-l px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => onEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Ver/Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-error hover:text-error hover:bg-error/10 gap-1"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
