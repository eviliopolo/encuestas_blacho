import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { validarRespuestas } = await import('./respuestasService')

const estudianteValido = {
  nombre_estudiante: 'Ana Pérez',
  ied: 'IED Example',
  curso: '11-A',
  identificacion: '1234567890',
  edad: 17,
}

const preguntas = [
  { id: 'p1', texto: '¿X?', tipo: 'unica_respuesta',    obligatoria: true },
  { id: 'p2', texto: '¿Y?', tipo: 'multiple_respuesta', obligatoria: true },
  { id: 'p3', texto: '¿Z?', tipo: 'respuesta_abierta',  obligatoria: false },
]

describe('validarRespuestas', () => {
  it('exige los campos obligatorios del estudiante', () => {
    const errs = validarRespuestas({
      preguntas: [],
      respuestas: {},
      estudiante: { nombre_estudiante: '', ied: '', curso: '', identificacion: '', edad: 0 },
    })
    expect(errs.length).toBeGreaterThan(0)
  })

  it('valida rango de edad', () => {
    const errs = validarRespuestas({
      preguntas: [],
      respuestas: {},
      estudiante: { ...estudianteValido, edad: 150 },
    })
    expect(errs.some((e) => e.toLowerCase().includes('edad'))).toBe(true)
  })

  it('exige respuesta única para preguntas obligatorias', () => {
    const errs = validarRespuestas({ preguntas, respuestas: {}, estudiante: estudianteValido })
    expect(errs.some((e) => e.includes('¿X?'))).toBe(true)
    expect(errs.some((e) => e.includes('¿Y?'))).toBe(true)
  })

  it('acepta respuestas completas válidas', () => {
    const errs = validarRespuestas({
      preguntas,
      respuestas: { p1: 'op-1', p2: ['op-a', 'op-b'], p3: '' },
      estudiante: estudianteValido,
    })
    expect(errs).toEqual([])
  })

  it('la respuesta_abierta obligatoria debe tener texto', () => {
    const pregs = [{ id: 'pa', texto: 'Opina', tipo: 'respuesta_abierta', obligatoria: true }]
    const errs = validarRespuestas({ preguntas: pregs, respuestas: { pa: '   ' }, estudiante: estudianteValido })
    expect(errs.some((e) => e.includes('Opina'))).toBe(true)
  })
})
