import * as XLSX from 'xlsx'
import { obtenerEncuestaCompleta } from '@/services/encuestasService'
import { listarRespuestasEncuesta } from '@/services/respuestasService'

const COLS_ESTUDIANTE = [
  { key: 'fecha_registro',    label: 'Fecha registro' },
  { key: 'nombre_estudiante', label: 'Nombre' },
  { key: 'ied',               label: 'IED' },
  { key: 'curso',             label: 'Curso' },
  { key: 'identificacion',    label: 'Identificación' },
  { key: 'edad',              label: 'Edad' },
]

/**
 * Exporta a Excel todas las respuestas de una encuesta en formato ANCHO:
 * una fila por respuesta, una columna por pregunta.
 */
export async function exportarEncuestaExcel(encuestaId, nombreEncuesta) {
  const { data: encuesta, error: e1 } = await obtenerEncuestaCompleta(encuestaId)
  if (e1) throw new Error(e1.message)
  const { data: respuestas, error: e2 } = await listarRespuestasEncuesta(encuestaId)
  if (e2) throw new Error(e2.message)

  const preguntas = (encuesta.preguntas || []).slice().sort((a, b) => a.orden - b.orden)

  // Encabezados
  const header = [
    ...COLS_ESTUDIANTE.map((c) => c.label),
    ...preguntas.map((p) => `P${p.orden}. ${p.texto}`),
  ]

  const rows = respuestas.map((r) => {
    const fila = COLS_ESTUDIANTE.map((c) => {
      if (c.key === 'fecha_registro') return r.fecha_registro ? new Date(r.fecha_registro).toISOString() : ''
      return r[c.key] ?? ''
    })
    for (const p of preguntas) {
      const detalles = (r.detalles || []).filter((d) => d.pregunta_id === p.id)
      let valor = ''
      if (p.tipo === 'respuesta_abierta') {
        valor = detalles.map((d) => d.texto_respuesta).filter(Boolean).join(' | ')
      } else {
        valor = detalles.map((d) => d.opcion?.texto).filter(Boolean).join(', ')
      }
      fila.push(valor)
    }
    return fila
  })

  const data = [header, ...rows]

  // Hoja 1: respuestas
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = header.map((h) => ({ wch: Math.min(40, Math.max(12, (h?.length || 12) + 2)) }))

  // Hoja 2: metadata de preguntas (útil para importar luego)
  const metaHeader = ['orden', 'pregunta_id', 'texto', 'tipo', 'tipo_grafica', 'obligatoria', 'opciones']
  const metaRows = preguntas.map((p) => [
    p.orden,
    p.id,
    p.texto,
    p.tipo,
    p.tipo_grafica,
    p.obligatoria,
    (p.opciones || []).map((o) => o.texto).join(' | '),
  ])
  const wsMeta = XLSX.utils.aoa_to_sheet([metaHeader, ...metaRows])

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Respuestas')
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Preguntas')

  const safeName = (nombreEncuesta || 'encuesta').replace(/[^\w\-]+/g, '_').slice(0, 60)
  const fecha = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${safeName}_${fecha}.xlsx`)
}

/**
 * Genera una plantilla Excel para importar respuestas a una encuesta.
 */
export async function descargarPlantillaImportacion(encuestaId, nombreEncuesta) {
  const { data: encuesta, error } = await obtenerEncuestaCompleta(encuestaId)
  if (error) throw new Error(error.message)
  const preguntas = (encuesta.preguntas || []).slice().sort((a, b) => a.orden - b.orden)

  const header = [
    ...COLS_ESTUDIANTE.map((c) => c.label),
    ...preguntas.map((p) => `P${p.orden}. ${p.texto}`),
  ]
  // Fila de ayuda con tipos / opciones
  const ayuda = [
    ...COLS_ESTUDIANTE.map((c) => c.key === 'fecha_registro' ? 'YYYY-MM-DDTHH:mm:ssZ (opcional)' : ''),
    ...preguntas.map((p) => {
      if (p.tipo === 'respuesta_abierta') return 'Texto libre'
      const ops = (p.opciones || []).map((o) => o.texto).join(' | ')
      return p.tipo === 'multiple_respuesta'
        ? `Opciones separadas por coma. Válidas: ${ops}`
        : `Una opción de: ${ops}`
    }),
  ]
  const ws = XLSX.utils.aoa_to_sheet([header, ayuda])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')

  const safeName = (nombreEncuesta || 'encuesta').replace(/[^\w\-]+/g, '_').slice(0, 60)
  XLSX.writeFile(wb, `plantilla_${safeName}.xlsx`)
}
