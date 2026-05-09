import * as XLSX from 'xlsx'
import { CHASIDE_APTITUDES, CHASIDE_ETIQUETAS_AREA, CHASIDE_INTERESES, CHASIDE_LETTERS } from '@/utils/chasideConstants'
import {
  calcularScoresChaside,
  porcentajeSobreMax,
  resolverTextoOpcionDesdePregunta,
  textoOpcionEsSi,
} from '@/utils/chasideScoring'

const AREA_POR_LETRA = Object.freeze(
  Object.fromEntries(CHASIDE_LETTERS.map((L, idx) => [L, CHASIDE_ETIQUETAS_AREA[idx]])),
)

function invertirMapa(grupos, permitirMultiples = false) {
  const out = {}
  for (const [letra, nums] of Object.entries(grupos)) {
    for (const n of nums) {
      if (!out[n]) out[n] = permitirMultiples ? [] : ''
      if (permitirMultiples) out[n].push(letra)
      else out[n] = letra
    }
  }
  return out
}

function maximosPorLetra(grupos) {
  return Object.fromEntries(CHASIDE_LETTERS.map((L) => [L, (grupos[L] || []).length]))
}

function areasDestacadas(mapaDestacar) {
  return CHASIDE_LETTERS.filter((L) => !!mapaDestacar[L]).map((L) => AREA_POR_LETRA[L])
}

function safeNombreArchivo(s) {
  return String(s || 'resultado_chaside')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60)
}

/**
 * Exporta un Excel para auditar cómo respondió una persona en CHASIDE.
 *
 * @param {object} p
 * @param {object} p.encuesta Encuesta completa con preguntas y opciones.
 * @param {object} p.row Fila de respuesta con campos estudiante + detalles.
 */
export function exportarResultadoChasideExcel({ encuesta, row }) {
  const preguntas = [...(encuesta?.preguntas || [])].sort((a, b) => a.orden - b.orden)
  const detalles = row?.detalles || []
  if (!preguntas.length) throw new Error('La encuesta no tiene preguntas.')
  if (!detalles.length) throw new Error('La respuesta no tiene detalles para analizar.')

  const resultado = calcularScoresChaside({
    preguntas,
    detalles,
    resolverTextoOpcion: resolverTextoOpcionDesdePregunta,
  })

  const maxIntereses = maximosPorLetra(CHASIDE_INTERESES)
  const maxAptitudes = maximosPorLetra(CHASIDE_APTITUDES)

  const interesPorPregunta = invertirMapa(CHASIDE_INTERESES, false)
  const aptitudPorPregunta = invertirMapa(CHASIDE_APTITUDES, false)
  const detallePorPregunta = new Map(detalles.map((d) => [d.pregunta_id, d]))

  const respuestasHeader = [
    'Nro Pregunta',
    'Pregunta',
    'Respuesta marcada',
    'Cuenta como "Sí"',
    'Área Intereses (letra)',
    'Área Intereses',
    'Área Aptitudes (letra)',
    'Área Aptitudes',
  ]
  const respuestasRows = preguntas.map((p, idx) => {
    const n = idx + 1
    const det = detallePorPregunta.get(p.id)
    const texto = resolverTextoOpcionDesdePregunta(det, p) || ''
    const esSi = textoOpcionEsSi(texto)
    const letraInteres = interesPorPregunta[n] || ''
    const letraApt = aptitudPorPregunta[n] || ''
    return [
      n,
      p.texto,
      texto || '(sin marcar)',
      esSi ? 1 : 0,
      letraInteres,
      letraInteres ? AREA_POR_LETRA[letraInteres] : '',
      letraApt,
      letraApt ? AREA_POR_LETRA[letraApt] : '',
    ]
  })

  const resumenHeader = ['Bloque', 'Letra', 'Área', 'Puntaje', 'Máximo', 'Porcentaje', 'Destacada']
  const resumenRows = [
    ...CHASIDE_LETTERS.map((L) => [
      'Intereses',
      L,
      AREA_POR_LETRA[L],
      resultado.intereses[L],
      maxIntereses[L],
      `${porcentajeSobreMax(resultado.intereses[L], maxIntereses[L])}%`,
      resultado.destacarIntereses[L] ? 'Sí' : '',
    ]),
    ...CHASIDE_LETTERS.map((L) => [
      'Aptitudes',
      L,
      AREA_POR_LETRA[L],
      resultado.aptitudes[L],
      maxAptitudes[L],
      `${porcentajeSobreMax(resultado.aptitudes[L], maxAptitudes[L])}%`,
      resultado.destacarAptitudes[L] ? 'Sí' : '',
    ]),
  ]

  const topIntereses = areasDestacadas(resultado.destacarIntereses)
  const topAptitudes = areasDestacadas(resultado.destacarAptitudes)
  const metaRows = [
    ['Nombre', row?.nombre_estudiante || ''],
    ['Identificación', row?.identificacion || ''],
    ['Edad', row?.edad ?? ''],
    ['Curso', row?.curso || ''],
    ['IED', row?.ied || ''],
    ['Encuesta', encuesta?.nombre || ''],
    ['Fecha de respuesta', row?.fecha_registro ? new Date(row.fecha_registro).toLocaleString() : ''],
    [],
    ['Resumen interpretativo', ''],
    ['Intereses más altos', topIntereses.join(' | ') || 'Sin áreas destacadas'],
    ['Aptitudes más altas', topAptitudes.join(' | ') || 'Sin áreas destacadas'],
  ]
  if (resultado.warnings.length) {
    metaRows.push(['Advertencia', resultado.warnings.join(' | ')])
  }

  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows)
  wsMeta['!cols'] = [{ wch: 28 }, { wch: 80 }]

  const wsResumen = XLSX.utils.aoa_to_sheet([resumenHeader, ...resumenRows])
  wsResumen['!cols'] = [
    { wch: 11 }, { wch: 7 }, { wch: 42 }, { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 11 },
  ]

  const wsRespuestas = XLSX.utils.aoa_to_sheet([respuestasHeader, ...respuestasRows])
  wsRespuestas['!cols'] = [
    { wch: 12 }, { wch: 80 }, { wch: 24 }, { wch: 13 }, { wch: 22 }, { wch: 34 }, { wch: 22 }, { wch: 38 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Ficha')
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resultados')
  XLSX.utils.book_append_sheet(wb, wsRespuestas, 'Respuestas')

  const fecha = new Date().toISOString().slice(0, 10)
  const base = safeNombreArchivo(row?.nombre_estudiante || row?.identificacion || 'participante')
  XLSX.writeFile(wb, `resultado_chaside_${base}_${fecha}.xlsx`)
}

