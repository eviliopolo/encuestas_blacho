import { describe, it, expect, vi } from 'vitest'

// El servicio importa `supabase` al top-level; mockeamos el módulo para
// que no intente crear el cliente real en entorno de tests.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { validarPreguntas } = await import('./preguntasService')

describe('validarPreguntas', () => {
  it('falla si no hay preguntas', () => {
    expect(validarPreguntas([]).length).toBeGreaterThan(0)
  })

  it('exige al menos 2 opciones en preguntas cerradas', () => {
    const errs = validarPreguntas([
      { texto: 'x', tipo: 'unica_respuesta', orden: 1, opciones: [{ texto: 'A' }] },
    ])
    expect(errs.some((e) => e.includes('al menos 2 opciones'))).toBe(true)
  })

  it('no exige opciones en respuesta_abierta', () => {
    const errs = validarPreguntas([
      { texto: 'x', tipo: 'respuesta_abierta', orden: 1 },
    ])
    expect(errs).toEqual([])
  })

  it('detecta órdenes duplicados', () => {
    const errs = validarPreguntas([
      { texto: 'x', tipo: 'respuesta_abierta', orden: 1 },
      { texto: 'y', tipo: 'respuesta_abierta', orden: 1 },
    ])
    expect(errs.some((e) => e.includes('duplicado'))).toBe(true)
  })

  it('exige texto no vacío', () => {
    const errs = validarPreguntas([
      { texto: '  ', tipo: 'respuesta_abierta', orden: 1 },
    ])
    expect(errs.some((e) => e.includes('texto'))).toBe(true)
  })

  it('acepta una encuesta bien formada', () => {
    const errs = validarPreguntas([
      { texto: '¿X?', tipo: 'unica_respuesta', orden: 1, opciones: [{ texto: 'Sí' }, { texto: 'No' }] },
      { texto: '¿Y?', tipo: 'multiple_respuesta', orden: 2, opciones: [{ texto: 'a' }, { texto: 'b' }] },
      { texto: '¿Z?', tipo: 'respuesta_abierta', orden: 3 },
    ])
    expect(errs).toEqual([])
  })
})
