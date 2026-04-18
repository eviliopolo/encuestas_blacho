import { supabase } from '@/lib/supabase'

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
 * Reemplaza todas las preguntas y opciones de una encuesta por la lista
 * indicada (transaccional en 3 pasos: borrar, insertar preguntas,
 * insertar opciones).  Es simple y suficiente para el volumen esperado.
 * @param {string} encuestaId
 * @param {Array<{id?:string, texto:string, tipo:string, orden:number, obligatoria:boolean, tipo_grafica:string, opciones?: Array<{texto:string, orden:number, valor?:number}>}>} preguntas
 */
export async function reemplazarPreguntas(encuestaId, preguntas) {
  // 1. Borrar preguntas existentes (CASCADE elimina opciones)
  const { error: errDel } = await supabase
    .from('preguntas')
    .delete()
    .eq('encuesta_id', encuestaId)
  if (errDel) return { error: errDel }

  if (!preguntas.length) return { error: null }

  // 2. Insertar nuevas preguntas
  const payload = preguntas.map((p, idx) => ({
    encuesta_id: encuestaId,
    texto: p.texto,
    tipo: p.tipo,
    orden: p.orden ?? idx + 1,
    obligatoria: !!p.obligatoria,
    tipo_grafica: p.tipo === 'respuesta_abierta' ? 'ninguna' : (p.tipo_grafica || 'barras'),
  }))
  const { data: inserted, error: errIns } = await supabase
    .from('preguntas')
    .insert(payload)
    .select()
  if (errIns) return { error: errIns }

  // 3. Insertar opciones (asocia por orden)
  const opcionesPayload = []
  for (const p of preguntas) {
    if (p.tipo === 'respuesta_abierta') continue
    const nueva = inserted.find((x) => x.orden === (p.orden ?? 0)) || inserted.find((x) => x.texto === p.texto)
    if (!nueva) continue
    ;(p.opciones || []).forEach((o, idx) => {
      const texto = (o.texto || '').trim()
      if (!texto) return
      opcionesPayload.push({
        pregunta_id: nueva.id,
        texto,
        orden: o.orden ?? idx + 1,
        valor: o.valor ?? null,
      })
    })
  }
  if (opcionesPayload.length) {
    const { error: errOpt } = await supabase.from('opciones_pregunta').insert(opcionesPayload)
    if (errOpt) return { error: errOpt }
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
