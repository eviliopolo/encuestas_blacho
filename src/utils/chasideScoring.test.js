import { describe, it, expect } from 'vitest'
import {
  textoOpcionEsSi,
  calcularScoresChaside,
  destacarMaximo,
  destacarDosTiers,
  resolverTextoOpcionDesdePregunta,
} from '@/utils/chasideScoring'
import { CHASIDE_INTERESES } from '@/utils/chasideConstants'

describe('textoOpcionEsSi', () => {
  it('acepta sí / si / yes', () => {
    expect(textoOpcionEsSi('Sí')).toBe(true)
    expect(textoOpcionEsSi('si')).toBe(true)
    expect(textoOpcionEsSi('No')).toBe(false)
  })
})

describe('calcularScoresChaside', () => {
  it('cuenta un Sí en intereses C para la pregunta 1', () => {
    const preguntas = Array.from({ length: 98 }, (_, i) => ({
      id: `p${i + 1}`,
      orden: i + 1,
      tipo: 'unica_respuesta',
      opciones: [
        { id: 'si', texto: 'Sí' },
        { id: 'no', texto: 'No' },
      ],
    }))
    const detalles = [{ pregunta_id: 'p1', opcion_pregunta_id: 'si' }]
    const r = calcularScoresChaside({
      preguntas,
      detalles,
      resolverTextoOpcion: resolverTextoOpcionDesdePregunta,
    })
    expect(r.intereses.C).toBe(1)
    expect(r.destacarIntereses.C).toBe(true)
  })

  it('sin respuestas no destaca áreas', () => {
    const preguntas = Array.from({ length: 98 }, (_, i) => ({
      id: `p${i + 1}`,
      orden: i + 1,
      tipo: 'unica_respuesta',
      opciones: [
        { id: 'si', texto: 'Sí' },
        { id: 'no', texto: 'No' },
      ],
    }))
    const r = calcularScoresChaside({
      preguntas,
      detalles: [],
      resolverTextoOpcion: resolverTextoOpcionDesdePregunta,
    })
    expect(Object.values(r.destacarIntereses).every((x) => !x)).toBe(true)
    expect(Object.values(r.destacarAptitudes).every((x) => !x)).toBe(true)
  })
})

describe('destacarMaximo / destacarDosTiers', () => {
  it('destacarMaximo no marca si todo es cero', () => {
    const z = { C: 0, H: 0, A: 0, S: 0, I: 0, D: 0, E: 0 }
    expect(Object.values(destacarMaximo(z)).some(Boolean)).toBe(false)
  })

  it('destacarDosTiers marca dos niveles distintos', () => {
    const s = { C: 5, H: 3, A: 3, S: 1, I: 0, D: 0, E: 0 }
    const d = destacarDosTiers(s)
    expect(d.C).toBe(true)
    expect(d.H).toBe(true)
    expect(d.A).toBe(true)
    expect(d.S).toBe(false)
  })
})

describe('CHASIDE_INTERESES mapping', () => {
  it('no repite números entre letras', () => {
    const seen = new Set()
    for (const L of Object.keys(CHASIDE_INTERESES)) {
      for (const n of CHASIDE_INTERESES[L]) {
        expect(seen.has(n)).toBe(false)
        seen.add(n)
      }
    }
  })
})
