import * as XLSX from 'xlsx'
import { TABLE_COLUMNS } from '@/lib/tableColumns'

const formatExportDate = (value) => {
  if (!value) return ''
  try {
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toISOString().split('T')[0]
  } catch {
    return value
  }
}

export const exportToExcel = (data) => {
  if (!data || data.length === 0) return
  const headers = TABLE_COLUMNS.map((c) => c.label)
  const rows = data.map((row) =>
    TABLE_COLUMNS.map((col) => {
      const v = row[col.key]
      if (col.key === 'created_at' || col.key === 'fecha_registro') return formatExportDate(v)
      return v != null ? String(v) : ''
    })
  )
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Encuestas')
  const fecha = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `Encuestas_Orientacion_${fecha}.xlsx`)
}
