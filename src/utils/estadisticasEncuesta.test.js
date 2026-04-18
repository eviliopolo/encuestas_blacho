import { describe, it, expect } from 'vitest'
import { agregarEstadisticas, frecuenciaPalabras } from './estadisticasEncuesta'

describe('agregarEstadisticas', () => {
  it('cuenta ocurrencias por opción para unica_respuesta', () => {
    const encuesta = {
      preguntas: [
        { id: 'p1', texto: '¿X?', tipo: 'unica_respuesta', tipo_grafica: 'barras',
          opciones: [{ id: 'a', texto: 'Sí' }, { id: 'b', texto: 'No' }] },
      ],
    }
    const respuestas = [
      { detalles: [{ pregunta_id: 'p1', opcion_pregunta_id: 'a' }] },
      { detalles: [{ pregunta_id: 'p1', opcion_pregunta_id: 'a' }] },
      { detalles: [{ pregunta_id: 'p1', opcion_pregunta_id: 'b' }] },
    ]
    const [stat] = agregarEstadisticas(encuesta, respuestas)
    expect(stat.total).toBe(3)
    expect(stat.conteos).toEqual([
      { opcion: 'Sí', count: 2 },
      { opcion: 'No', count: 1 },
    ])
  })

  it('maneja multiple_respuesta sumando cada selección', () => {
    const encuesta = {
      preguntas: [
        { id: 'p1', texto: '¿Y?', tipo: 'multiple_respuesta', tipo_grafica: 'columnas',
          opciones: [{ id: 'x', texto: 'X' }, { id: 'y', texto: 'Y' }, { id: 'z', texto: 'Z' }] },
      ],
    }
    const respuestas = [
      { detalles: [
        { pregunta_id: 'p1', opcion_pregunta_id: 'x' },
        { pregunta_id: 'p1', opcion_pregunta_id: 'y' },
      ] },
      { detalles: [
        { pregunta_id: 'p1', opcion_pregunta_id: 'x' },
      ] },
    ]
    const [stat] = agregarEstadisticas(encuesta, respuestas)
    expect(stat.total).toBe(3)
    expect(stat.conteos.find((c) => c.opcion === 'X').count).toBe(2)
    expect(stat.conteos.find((c) => c.opcion === 'Y').count).toBe(1)
    expect(stat.conteos.find((c) => c.opcion === 'Z').count).toBe(0)
  })

  it('agrupa textos para respuesta_abierta', () => {
    const encuesta = {
      preguntas: [{ id: 'p1', texto: 'Opina', tipo: 'respuesta_abierta', opciones: [] }],
    }
    const respuestas = [
      { detalles: [{ pregunta_id: 'p1', texto_respuesta: 'hola mundo' }] },
      { detalles: [{ pregunta_id: 'p1', texto_respuesta: 'otra opinión' }] },
    ]
    const [stat] = agregarEstadisticas(encuesta, respuestas)
    expect(stat.total).toBe(2)
    expect(stat.textos).toHaveLength(2)
  })
})

describe('frecuenciaPalabras', () => {
  it('ignora stop-words y normaliza tildes', () => {
    const top = frecuenciaPalabras(['La educación es importante, la educación cambia', 'la educacion'])
    expect(top[0].palabra).toBe('educacion')
    expect(top[0].count).toBe(3)
  })

  it('descarta palabras cortas (<3)', () => {
    const top = frecuenciaPalabras(['a b c de lo no sí'])
    expect(top.length).toBe(0)
  })
})
