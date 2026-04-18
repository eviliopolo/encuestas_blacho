import { supabase } from '@/lib/supabase'

/**
 * Guarda una respuesta completa a una encuesta.
 *
 * @param {object} payload
 * @param {string} payload.encuesta_id
 * @param {object} payload.estudiante   { nombre_estudiante, ied, curso, identificacion, edad }
 * @param {Record<string, any>} payload.respuestas  Mapa pregunta_id -> valor.
 *        - Para `unica_respuesta`:    opcion_id (string)
 *        - Para `multiple_respuesta`: array de opcion_id (string[])
 *        - Para `respuesta_abierta`:  string con el texto
 * @param {Array} payload.preguntas     Metadata de preguntas (para saber tipo)
 */
export async function guardarRespuestaEncuesta({ encuesta_id, estudiante, respuestas, preguntas }) {
  const cabecera = {
    encuesta_id,
    nombre_estudiante: estudiante.nombre_estudiante?.trim(),
    ied:               estudiante.ied?.trim(),
    curso:             estudiante.curso?.trim(),
    identificacion:    estudiante.identificacion?.trim(),
    edad:              Number(estudiante.edad),
  }

  const { data: resp, error } = await supabase
    .from('respuestas_encuesta')
    .insert([cabecera])
    .select()
    .single()

  if (error || !resp) return { data: null, error: error || new Error('No se creó la cabecera') }

  const detalles = []
  for (const pregunta of preguntas) {
    const valor = respuestas[pregunta.id]
    if (valor === undefined || valor === null) continue

    if (pregunta.tipo === 'unica_respuesta') {
      if (!valor) continue
      detalles.push({
        respuesta_encuesta_id: resp.id,
        pregunta_id: pregunta.id,
        opcion_pregunta_id: valor,
      })
    } else if (pregunta.tipo === 'multiple_respuesta') {
      const arr = Array.isArray(valor) ? valor : []
      arr.forEach((opt) => {
        if (!opt) return
        detalles.push({
          respuesta_encuesta_id: resp.id,
          pregunta_id: pregunta.id,
          opcion_pregunta_id: opt,
        })
      })
    } else if (pregunta.tipo === 'respuesta_abierta') {
      const texto = String(valor).trim()
      if (!texto) continue
      detalles.push({
        respuesta_encuesta_id: resp.id,
        pregunta_id: pregunta.id,
        texto_respuesta: texto,
      })
    }
  }

  if (detalles.length) {
    const { error: errDet } = await supabase.from('respuestas_detalle').insert(detalles)
    if (errDet) {
      // Rollback best-effort (la constraint garantiza integridad, pero ayuda a no dejar huérfana)
      await supabase.from('respuestas_encuesta').delete().eq('id', resp.id)
      return { data: null, error: errDet }
    }
  }

  return { data: resp, error: null }
}

/**
 * Valida las respuestas contra las reglas de las preguntas.
 * Devuelve array de errores (vacío = válido).
 */
export function validarRespuestas({ preguntas, respuestas, estudiante }) {
  const errores = []
  const camposEstudiante = ['nombre_estudiante', 'ied', 'curso', 'identificacion', 'edad']
  for (const campo of camposEstudiante) {
    if (!estudiante?.[campo] && estudiante?.[campo] !== 0) {
      errores.push(`El campo "${campo}" es obligatorio.`)
    }
  }
  if (estudiante?.edad && (Number(estudiante.edad) <= 0 || Number(estudiante.edad) >= 120)) {
    errores.push('Edad inválida (debe ser entre 1 y 119).')
  }

  for (const p of preguntas || []) {
    const v = respuestas[p.id]
    if (!p.obligatoria) continue
    if (p.tipo === 'unica_respuesta' && !v) {
      errores.push(`"${p.texto}" requiere respuesta.`)
    } else if (p.tipo === 'multiple_respuesta' && (!Array.isArray(v) || v.length === 0)) {
      errores.push(`"${p.texto}" requiere al menos una opción.`)
    } else if (p.tipo === 'respuesta_abierta' && !String(v || '').trim()) {
      errores.push(`"${p.texto}" requiere respuesta.`)
    }
  }
  return errores
}

/**
 * Descarga todas las respuestas de una encuesta con los detalles por
 * pregunta en una estructura aplanable a Excel.
 */
export async function listarRespuestasEncuesta(encuestaId, filtros = {}) {
  let query = supabase
    .from('respuestas_encuesta')
    .select(`
      *,
      detalles:respuestas_detalle (
        id,
        pregunta_id,
        opcion_pregunta_id,
        texto_respuesta,
        opcion:opciones_pregunta ( id, texto, orden, valor )
      )
    `)
    .eq('encuesta_id', encuestaId)
    .order('fecha_registro', { ascending: false })

  if (filtros.ied)   query = query.eq('ied', filtros.ied)
  if (filtros.curso) query = query.eq('curso', filtros.curso)
  if (filtros.edadMin != null) query = query.gte('edad', filtros.edadMin)
  if (filtros.edadMax != null) query = query.lte('edad', filtros.edadMax)
  if (filtros.desde) query = query.gte('fecha_registro', filtros.desde)
  if (filtros.hasta) query = query.lte('fecha_registro', filtros.hasta)

  const { data, error } = await query
  return { data: data || [], error }
}
