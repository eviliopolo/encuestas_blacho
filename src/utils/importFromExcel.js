import * as XLSX from 'xlsx'
import { TABLE_COLUMNS } from '@/lib/tableColumns'

// Columnas que se insertan (excluimos id, created_at, updated_at)
const INSERT_KEYS = TABLE_COLUMNS.filter(
  (c) => !['id', 'created_at', 'updated_at'].includes(c.key)
).map((c) => c.key)

// Mapeo etiqueta -> key por si el Excel tiene encabezados en español
const LABEL_TO_KEY = TABLE_COLUMNS.reduce((acc, c) => {
  acc[c.label.trim()] = c.key
  return acc
}, {})

function toStr(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v)
  return String(v).trim()
}

/** Convierte posible fecha de Excel (número serial) o string a YYYY-MM-DD */
function parseFecha(val) {
  if (val == null || val === '') return null
  if (typeof val === 'number') {
    // Excel serial: días desde 1899-12-30
    const utc = (val - 25569) * 86400 * 1000
    const d = new Date(utc)
    if (!Number.isNaN(d.getTime())) {
      const y = d.getUTCFullYear()
      const m = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  }
  const s = toStr(val)
  if (!s) return null
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0]
  }
  return s
}

/** Normaliza una fila del Excel al formato de la tabla. headerKeys[i] = key de la columna i */
function normalizeRow(raw, headerKeys) {
  const row = {}
  INSERT_KEYS.forEach((key) => {
    const colIndex = headerKeys.findIndex((k) => k === key)
    if (colIndex === -1) {
      row[key] = key === 'nombre' ? '' : null
      return
    }
    let val = raw[colIndex]
    if (val !== undefined && val !== null && toStr(val) !== '') {
      if (key === 'fecha_registro') {
        row[key] = parseFecha(val)
      } else if (key === 'edad') {
        const n = parseInt(val, 10)
        row[key] = Number.isNaN(n) ? null : n
      } else {
        row[key] = toStr(val)
      }
    } else {
      row[key] = key === 'nombre' ? '' : null
    }
  })
  // Cadenas vacías a null (excepto nombre, que se valida después)
  Object.keys(row).forEach((k) => {
    if (k !== 'nombre' && row[k] === '') row[k] = null
  })
  return row
}

/**
 * Lee un archivo Excel y devuelve un array de filas listas para insertar.
 * Acepta encabezados como "key" (fecha_registro) o como "label" (Fecha registro).
 * @param {File} file - Archivo .xlsx o .xls
 * @returns {{ rows: Array<Object>, errors: string[] }}
 */
export function readEncuestasFromExcel(file) {
  const errors = []
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
        if (aoa.length < 2) {
          resolve({ rows: [], errors: ['El archivo no tiene filas de datos (solo encabezado o vacío).'] })
          return
        }
        const headerRow = aoa[0].map((h) => toStr(h))
        // Mapear encabezados a keys: si coincide con key, usar key; si no, buscar por label
        const headerKeys = headerRow.map((h) => {
          if (INSERT_KEYS.includes(h)) return h
          return LABEL_TO_KEY[h] || null
        })
        const rows = []
        for (let i = 1; i < aoa.length; i++) {
          const raw = aoa[i]
          if (!raw || raw.length === 0) continue
          const row = normalizeRow(raw, headerKeys)
          if (!row.nombre || row.nombre === '') {
            errors.push(`Fila ${i + 1}: falta el nombre (obligatorio).`)
            continue
          }
          rows.push(row)
        }
        resolve({ rows, errors })
      } catch (err) {
        resolve({ rows: [], errors: ['Error al leer el archivo: ' + (err.message || err) + '.'] })
      }
    }
    reader.onerror = () => {
      resolve({ rows: [], errors: ['No se pudo leer el archivo.'] })
    }
    reader.readAsArrayBuffer(file)
  })
}
