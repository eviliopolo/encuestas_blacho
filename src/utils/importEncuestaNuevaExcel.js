import * as XLSX from 'xlsx'
import { obtenerEncuestaCompleta } from '@/services/encuestasService'
import { guardarRespuestaEncuesta } from '@/services/respuestasService'

const COLS_ESTUDIANTE = [
  { key: 'fecha_registro',    label: 'Fecha registro',  opcional: true  },
  { key: 'nombre_estudiante', label: 'Nombre',          opcional: false },
  { key: 'ied',               label: 'IED',             opcional: false },
  { key: 'curso',             label: 'Curso',           opcional: false },
  { key: 'identificacion',    label: 'Identificación',  opcional: false },
  { key: 'edad',              label: 'Edad',            opcional: false },
]

/**
 * Importa respuestas desde un archivo Excel al formato nuevo.
 *
 * @param {File} file
 * @param {string} encuestaId
 * @returns {Promise<{ ok: number, fallos: Array<{fila:number, error:string}>, total: number }>}
 */
export async function importarEncuestaExcel(file, encuestaId) {
  const { data: encuesta, error } = await obtenerEncuestaCompleta(encuestaId)
  if (error || !encuesta) throw new Error('No se pudo cargar la encuesta destino')
  if (encuesta.estado !== 'abierta' || !encuesta.activa) {
    throw new Error('La encuesta destino no está abierta, no se pueden importar respuestas.')
  }

  const preguntas = (encuesta.preguntas || []).slice().sort((a, b) => a.orden - b.orden)

  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (!rows.length) throw new Error('El archivo está vacío.')

  const header = rows[0].map((h) => String(h).trim())

  // Validar columnas esperadas
  const requeridas = [
    ...COLS_ESTUDIANTE.filter((c) => !c.opcional).map((c) => c.label),
    ...preguntas.map((p) => `P${p.orden}. ${p.texto}`),
  ]
  for (const r of requeridas) {
    if (!header.includes(r)) {
      throw new Error(`Falta la columna obligatoria: "${r}"`)
    }
  }

  const idx = (label) => header.indexOf(label)

  // Mapa opcion.texto (normalizado) -> opcion.id por pregunta
  const mapaOpciones = new Map()
  for (const p of preguntas) {
    const m = new Map()
    for (const o of p.opciones || []) m.set(o.texto.trim().toLowerCase(), o.id)
    mapaOpciones.set(p.id, m)
  }

  const resultados = { ok: 0, fallos: [], total: 0 }

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const filaNum = r + 1
    // Si la fila está completamente vacía, ignorar
    if (row.every((c) => c === '' || c === undefined || c === null)) continue
    resultados.total += 1

    try {
      const estudiante = {
        nombre_estudiante: String(row[idx('Nombre')] ?? '').trim(),
        ied:               String(row[idx('IED')] ?? '').trim(),
        curso:             String(row[idx('Curso')] ?? '').trim(),
        identificacion:    String(row[idx('Identificación')] ?? '').trim(),
        edad:              Number(row[idx('Edad')] ?? 0),
      }
      for (const campo of ['nombre_estudiante','ied','curso','identificacion']) {
        if (!estudiante[campo]) throw new Error(`Falta ${campo}`)
      }
      if (!estudiante.edad || estudiante.edad <= 0 || estudiante.edad >= 120) {
        throw new Error('Edad inválida')
      }

      const respuestas = {}
      for (const p of preguntas) {
        const col = idx(`P${p.orden}. ${p.texto}`)
        const raw = col >= 0 ? String(row[col] ?? '').trim() : ''

        if (p.tipo === 'respuesta_abierta') {
          respuestas[p.id] = raw
        } else if (p.tipo === 'unica_respuesta') {
          if (!raw) continue
          const opId = mapaOpciones.get(p.id).get(raw.toLowerCase())
          if (!opId) throw new Error(`P${p.orden}: opción no válida "${raw}"`)
          respuestas[p.id] = opId
        } else if (p.tipo === 'multiple_respuesta') {
          if (!raw) continue
          const tokens = raw.split(',').map((t) => t.trim()).filter(Boolean)
          const ids = []
          for (const t of tokens) {
            const opId = mapaOpciones.get(p.id).get(t.toLowerCase())
            if (!opId) throw new Error(`P${p.orden}: opción no válida "${t}"`)
            ids.push(opId)
          }
          respuestas[p.id] = ids
        }
      }

      const { error } = await guardarRespuestaEncuesta({
        encuesta_id: encuestaId,
        estudiante,
        respuestas,
        preguntas,
      })
      if (error) throw new Error(error.message)
      resultados.ok += 1
    } catch (e) {
      resultados.fallos.push({ fila: filaNum, error: e.message })
    }
  }

  return resultados
}
