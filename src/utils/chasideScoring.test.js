import { describe, it, expect } from 'vitest'
import {
  textoOpcionEsSi,
  calcularScoresChaside,
  destacarMaximo,
  destacarDosTiers,
  resolverTextoOpcionDesdePregunta,
} from '@/utils/chasideScoring'
import { CHASIDE_APTITUDES, CHASIDE_INTERESES, CHASIDE_LETTERS } from '@/utils/chasideConstants'

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
    expect(r.resumenRespuestas.nSin).toBe(98)
    expect(r.resumenRespuestas.pctSinRespuesta).toBe(100)
  })

  it('distingue Sí, No y sin responder en mapaEstado y resumen', () => {
    const preguntas = [
      {
        id: 'p1',
        orden: 1,
        tipo: 'unica_respuesta',
        opciones: [
          { id: 's1', texto: 'Sí' },
          { id: 'n1', texto: 'No' },
        ],
      },
      {
        id: 'p2',
        orden: 2,
        tipo: 'unica_respuesta',
        opciones: [
          { id: 's2', texto: 'Sí' },
          { id: 'n2', texto: 'No' },
        ],
      },
      {
        id: 'p3',
        orden: 3,
        tipo: 'unica_respuesta',
        opciones: [
          { id: 's3', texto: 'Sí' },
          { id: 'n3', texto: 'No' },
        ],
      },
    ]
    const detalles = [
      { pregunta_id: 'p1', opcion_pregunta_id: 's1' },
      { pregunta_id: 'p2', opcion_pregunta_id: 'n2' },
    ]
    const r = calcularScoresChaside({
      preguntas,
      detalles,
      resolverTextoOpcion: resolverTextoOpcionDesdePregunta,
    })
    expect(r.mapaEstado[1]).toBe('si')
    expect(r.mapaEstado[2]).toBe('no')
    expect(r.mapaEstado[3]).toBe('sin_respuesta')
    expect(r.resumenRespuestas.nSi).toBe(1)
    expect(r.resumenRespuestas.nNo).toBe(1)
    expect(r.resumenRespuestas.nSin).toBe(1)
    expect(r.resumenRespuestas.total).toBe(3)
    expect(r.resumenRespuestas.pctSinRespuesta).toBe(33)
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

describe('CHASIDE planilla oficial (10 intereses + 4 aptitudes)', () => {
  it('cubre 1..98 sin repetir entre todas las letras', () => {
    const seen = new Set()
    for (const L of CHASIDE_LETTERS) {
      expect(CHASIDE_INTERESES[L].length).toBe(10)
      expect(CHASIDE_APTITUDES[L].length).toBe(4)
      for (const n of CHASIDE_INTERESES[L]) {
        expect(seen.has(n)).toBe(false)
        seen.add(n)
      }
      for (const n of CHASIDE_APTITUDES[L]) {
        expect(seen.has(n)).toBe(false)
        seen.add(n)
      }
    }
    expect(seen.size).toBe(98)
  })
})
