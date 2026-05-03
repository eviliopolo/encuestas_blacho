import {
  CHASIDE_LETTERS,
  CHASIDE_INTERESES,
  CHASIDE_APTITUDES,
} from '@/utils/chasideConstants'

export const CHASIDE_NUM_PREGUNTAS = 98

/** Detecta si la opción elegida cuenta como “Sí”. */
export function textoOpcionEsSi(texto) {
  if (texto == null) return false
  const t = String(texto).trim().toLowerCase()
  if (!t) return false
  if (t === 'sí' || t === 'si' || t === 's' || t === 'yes' || t === 'y') return true
  if (t.startsWith('sí') || t.startsWith('si ')) return true
  return false
}

function vacias() {
  return Object.fromEntries(CHASIDE_LETTERS.map((L) => [L, 0]))
}

/**
 * Construye mapa número de pregunta CHASIDE (1..n) -> ¿Sí?
 * Usa el orden de `preguntas` ordenadas por `orden` (posición = número CHASIDE).
 */
export function mapaSiPorNumeroPregunta(preguntasOrdenadas, detalles, resolverTextoOpcion) {
  /** @type {Record<number, boolean>} */
  const si = {}
  const sorted = [...preguntasOrdenadas].sort((a, b) => a.orden - b.orden)
  const detByPregunta = new Map()
  for (const d of detalles || []) {
    if (d.pregunta_id) detByPregunta.set(d.pregunta_id, d)
  }

  for (let i = 0; i < sorted.length; i++) {
    const num = i + 1
    const p = sorted[i]
    const det = detByPregunta.get(p.id)
    const texto = resolverTextoOpcion(det, p)
    si[num] = textoOpcionEsSi(texto)
  }
  return si
}

function sumarGrupo(mapaSi, gruposPorLetra) {
  const out = vacias()
  for (const L of CHASIDE_LETTERS) {
    const nums = gruposPorLetra[L] || []
    let s = 0
    for (const n of nums) {
      if (mapaSi[n]) s += 1
    }
    out[L] = s
  }
  return out
}

/**
 * Resalta categorías cuyo puntaje está en los dos valores más altos **distintos**
 * (equivalente a las dos áreas más fuertes cuando hay desempates).
 */
export function destacarDosTiers(scores) {
  const vals = [...new Set(CHASIDE_LETTERS.map((L) => scores[L]))].sort((a, b) => b - a)
  const tier1 = vals[0] ?? 0
  const tier2 = vals.length >= 2 ? vals[1] : tier1
  if (tier1 === 0) {
    return Object.fromEntries(CHASIDE_LETTERS.map((L) => [L, false]))
  }
  const destacar = new Set([tier1, tier2])
  return Object.fromEntries(
    CHASIDE_LETTERS.map((L) => [L, destacar.has(scores[L])]),
  )
}

/** Solo el máximo (intereses: área más alta; empates → varias). */
export function destacarMaximo(scores) {
  const maximo = Math.max(...CHASIDE_LETTERS.map((L) => scores[L]), 0)
  if (maximo === 0) {
    return Object.fromEntries(CHASIDE_LETTERS.map((L) => [L, false]))
  }
  return Object.fromEntries(CHASIDE_LETTERS.map((L) => [L, scores[L] === maximo]))
}

/**
 * Porcentaje respecto al máximo posible en esa celda (preguntas asignadas).
 */
export function porcentajeSobreMax(score, maxPosible) {
  if (!maxPosible || maxPosible <= 0) return 0
  return Math.round((100 * score) / maxPosible)
}

/**
 * @param {object} params
 * @param {Array<{ id: string, orden: number, tipo: string }>} params.preguntas
 * @param {Array<{ pregunta_id: string, opcion_pregunta_id?: string }>} params.detalles
 * @param {(det: object|undefined, pregunta: object) => string|undefined} params.resolverTextoOpcion
 */
/** Usa `det.opcion` si viene del API o busca en `pregunta.opciones`. */
export function resolverTextoOpcionDesdePregunta(det, pregunta) {
  if (!pregunta || !det?.opcion_pregunta_id) return ''
  const op = det.opcion || (pregunta.opciones || []).find((o) => o.id === det.opcion_pregunta_id)
  return op?.texto ?? ''
}

export function calcularScoresChaside({ preguntas, detalles, resolverTextoOpcion }) {
  const sorted = [...(preguntas || [])].sort((a, b) => a.orden - b.orden)
  const mapaSi = mapaSiPorNumeroPregunta(sorted, detalles, resolverTextoOpcion)

  const intereses = sumarGrupo(mapaSi, CHASIDE_INTERESES)
  const aptitudes = sumarGrupo(mapaSi, CHASIDE_APTITUDES)

  const warnings = []
  if (sorted.length !== CHASIDE_NUM_PREGUNTAS) {
    warnings.push(
      `Esta encuesta tiene ${sorted.length} preguntas; el CHASIDE completo usa ${CHASIDE_NUM_PREGUNTAS} ítems numerados en orden. Los porcentajes se calculan sobre las preguntas existentes.`,
    )
  }

  return {
    mapaSi,
    intereses,
    aptitudes,
    destacarIntereses: destacarMaximo(intereses),
    destacarAptitudes: destacarDosTiers(aptitudes),
    warnings,
    preguntasOrdenadas: sorted,
  }
}
