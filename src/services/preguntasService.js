import { supabase } from '@/lib/supabase'

/** Evita colisiones con UNIQUE(encuesta_id, orden) al reordenar en dos fases. */
const TMP_ORDEN_BASE = 900_000

function tipoGraficaPayload(p) {
  return p.tipo === 'respuesta_abierta' ? 'ninguna' : (p.tipo_grafica || 'barras')
}

/**
 * Sincroniza opciones con la BD por posición (el builder no envía ids de opción).
 * Respeta RESTRICT en respuestas_detalle al borrar opciones sobrantes.
 */
async function sincronizarOpcionesPregunta(preguntaId, clientOps, tipoPregunta) {
  if (tipoPregunta === 'respuesta_abierta') {
    const { data: dbOps } = await supabase
      .from('opciones_pregunta')
      .select('id')
      .eq('pregunta_id', preguntaId)
    for (const row of dbOps || []) {
      const { count, error: errCnt } = await supabase
        .from('respuestas_detalle')
        .select('*', { count: 'exact', head: true })
        .eq('opcion_pregunta_id', row.id)
      if (errCnt) return { error: errCnt }
      if (count > 0) {
        return {
          error: {
            message:
              'No se puede pasar la pregunta a tipo abierto: hay respuestas que usan sus opciones.',
          },
        }
      }
      const { error: errDel } = await supabase.from('opciones_pregunta').delete().eq('id', row.id)
      if (errDel) return { error: errDel }
    }
    return { error: null }
  }

  const ops = (clientOps || []).filter((o) => (o.texto || '').trim())
  const { data: dbOps, error: errDb } = await supabase
    .from('opciones_pregunta')
    .select('id, orden, texto, valor')
    .eq('pregunta_id', preguntaId)
    .order('orden', { ascending: true })
  if (errDb) return { error: errDb }

  for (let i = 0; i < ops.length; i++) {
    const c = ops[i]
    const orden = i + 1
    const texto = c.texto.trim()
    const valor = c.valor ?? null
    if (dbOps[i]) {
      const { error } = await supabase
        .from('opciones_pregunta')
        .update({ texto, orden, valor })
        .eq('id', dbOps[i].id)
      if (error) return { error }
    } else {
      const { error } = await supabase.from('opciones_pregunta').insert({
        pregunta_id: preguntaId,
        texto,
        orden,
        valor,
      })
      if (error) return { error }
    }
  }

  for (let j = ops.length; j < (dbOps || []).length; j++) {
    const row = dbOps[j]
    const { count, error: errCnt } = await supabase
      .from('respuestas_detalle')
      .select('*', { count: 'exact', head: true })
      .eq('opcion_pregunta_id', row.id)
    if (errCnt) return { error: errCnt }
    if (count > 0) {
      return {
        error: {
          message:
            `No se puede eliminar la opción "${row.texto}" porque hay respuestas que la seleccionaron.`,
        },
      }
    }
    const { error: errDel } = await supabase.from('opciones_pregunta').delete().eq('id', row.id)
    if (errDel) return { error: errDel }
  }

  return { error: null }
}

export const TIPOS_PREGUNTA = [
  { value: 'unica_respuesta',    label: 'Única respuesta' },
  { value: 'multiple_respuesta', label: 'Múltiple respuesta' },
  { value: 'respuesta_abierta',  label: 'Respuesta abierta' },
]

export const TIPOS_GRAFICA = [
  { value: 'barras',   label: 'Barras' },
  { value: 'columnas', label: 'Columnas' },
  { value: 'circular', label: 'Circular' },
  { value: 'lineas',   label: 'Líneas' },
  { value: 'ninguna',  label: 'Ninguna' },
]

/**
 * Sincroniza preguntas y opciones con la lista indicada: conserva IDs cuando
 * existen respuestas (FK RESTRICT en respuestas_detalle / opciones). Inserta
 * filas nuevas, actualiza las existentes y solo elimina preguntas quitadas del
 * formulario si no tienen respuestas asociadas.
 * @param {string} encuestaId
 * @param {Array<{id?:string, texto:string, tipo:string, orden:number, obligatoria:boolean, tipo_grafica:string, opciones?: Array<{texto:string, orden:number, valor?:number}>}>} preguntas
 */
export async function reemplazarPreguntas(encuestaId, preguntas) {
  if (!preguntas.length) return { error: null }

  const { data: existentes, error: errEx } = await supabase
    .from('preguntas')
    .select('id')
    .eq('encuesta_id', encuestaId)
  if (errEx) return { error: errEx }

  const idsEnBd = new Set((existentes || []).map((r) => r.id))
  const idsEnCliente = new Set(preguntas.map((p) => p.id).filter(Boolean))
  const aEliminar = [...idsEnBd].filter((id) => !idsEnCliente.has(id))

  if (aEliminar.length) {
    const { data: bloqueadas, error: errBl } = await supabase
      .from('respuestas_detalle')
      .select('pregunta_id')
      .in('pregunta_id', aEliminar)
    if (errBl) return { error: errBl }
    const conRespuestas = new Set((bloqueadas || []).map((r) => r.pregunta_id))
    if (conRespuestas.size > 0) {
      return {
        error: {
          message:
            'No se pueden eliminar una o más preguntas porque ya tienen respuestas registradas. Quita esas preguntas solo si no hubo respuestas o crea una encuesta nueva.',
        },
      }
    }
    const { error: errDel } = await supabase.from('preguntas').delete().in('id', aEliminar)
    if (errDel) return { error: errDel }
  }

  const resueltas = []
  for (let i = 0; i < preguntas.length; i++) {
    const p = preguntas[i]
    const ordenTmp = TMP_ORDEN_BASE + i
    const campos = {
      texto: p.texto,
      tipo: p.tipo,
      orden: ordenTmp,
      obligatoria: !!p.obligatoria,
      tipo_grafica: tipoGraficaPayload(p),
    }

    if (p.id && idsEnBd.has(p.id)) {
      const { error: errUp } = await supabase.from('preguntas').update(campos).eq('id', p.id)
      if (errUp) return { error: errUp }
      resueltas.push({ ...p, id: p.id })
    } else {
      const { data: ins, error: errIns } = await supabase
        .from('preguntas')
        .insert({
          encuesta_id: encuestaId,
          ...campos,
        })
        .select()
        .single()
      if (errIns) return { error: errIns }
      resueltas.push({ ...p, id: ins.id })
    }
  }

  for (let i = 0; i < resueltas.length; i++) {
    const { error } = await supabase
      .from('preguntas')
      .update({
        texto: resueltas[i].texto,
        tipo: resueltas[i].tipo,
        orden: i + 1,
        obligatoria: !!resueltas[i].obligatoria,
        tipo_grafica: tipoGraficaPayload(resueltas[i]),
      })
      .eq('id', resueltas[i].id)
    if (error) return { error }
  }

  for (const p of resueltas) {
    const { error: errOp } = await sincronizarOpcionesPregunta(p.id, p.opciones, p.tipo)
    if (errOp) return { error: errOp }
  }

  return { error: null }
}

/**
 * Valida estructuralmente una lista de preguntas antes de guardar.
 * Devuelve un array de mensajes de error (vacío si todo está bien).
 */
export function validarPreguntas(preguntas) {
  const errores = []
  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    errores.push('La encuesta debe tener al menos una pregunta.')
    return errores
  }
  const ordenes = new Set()
  preguntas.forEach((p, idx) => {
    const prefijo = `Pregunta #${idx + 1}`
    if (!p.texto?.trim()) errores.push(`${prefijo}: el texto es obligatorio.`)
    if (!['unica_respuesta', 'multiple_respuesta', 'respuesta_abierta'].includes(p.tipo)) {
      errores.push(`${prefijo}: tipo inválido.`)
    }
    if (typeof p.orden !== 'number' || p.orden < 1) {
      errores.push(`${prefijo}: orden inválido.`)
    } else if (ordenes.has(p.orden)) {
      errores.push(`${prefijo}: el orden ${p.orden} está duplicado.`)
    } else {
      ordenes.add(p.orden)
    }
    if (p.tipo !== 'respuesta_abierta') {
      const ops = (p.opciones || []).filter((o) => (o.texto || '').trim())
      if (ops.length < 2) {
        errores.push(`${prefijo}: debe tener al menos 2 opciones.`)
      }
    }
  })
  return errores
}
