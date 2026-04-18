import { supabase } from '@/lib/supabase'

export const ENCUESTA_LEGACY_ID = '11111111-1111-1111-1111-111111111111'

/**
 * Lista encuestas con filtros.
 * @param {{ estado?: 'abierta'|'cerrada', desde?: string, hasta?: string, soloActivas?: boolean }} filtros
 */
export async function listarEncuestas(filtros = {}) {
  let query = supabase
    .from('encuestas')
    .select('*')
    .order('created_at', { ascending: false })

  if (filtros.estado) query = query.eq('estado', filtros.estado)
  if (filtros.soloActivas !== false) query = query.eq('activa', true)
  if (filtros.desde) query = query.gte('fecha_creacion', filtros.desde)
  if (filtros.hasta) query = query.lte('fecha_creacion', filtros.hasta)

  const { data, error } = await query
  return { data: data || [], error }
}

export async function listarEncuestasAbiertas() {
  const { data, error } = await supabase
    .from('encuestas')
    .select('*')
    .eq('estado', 'abierta')
    .eq('activa', true)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function obtenerEncuesta(id) {
  const { data, error } = await supabase
    .from('encuestas')
    .select('*')
    .eq('id', id)
    .single()
  return { data, error }
}

/**
 * Obtiene una encuesta completa con sus preguntas y opciones anidadas.
 */
export async function obtenerEncuestaCompleta(id) {
  const { data, error } = await supabase
    .from('encuestas')
    .select(`
      *,
      preguntas:preguntas (
        *,
        opciones:opciones_pregunta ( * )
      )
    `)
    .eq('id', id)
    .order('orden', { referencedTable: 'preguntas' })
    .order('orden', { referencedTable: 'preguntas.opciones_pregunta' })
    .single()

  if (data?.preguntas) {
    data.preguntas.sort((a, b) => a.orden - b.orden)
    data.preguntas.forEach((p) => p.opciones?.sort((a, b) => a.orden - b.orden))
  }

  return { data, error }
}

export async function crearEncuesta({ nombre, descripcion, fecha_cierre }) {
  const { data, error } = await supabase
    .from('encuestas')
    .insert([{ nombre, descripcion, fecha_cierre: fecha_cierre || null }])
    .select()
    .single()
  return { data, error }
}

export async function actualizarEncuesta(id, cambios) {
  const { data, error } = await supabase
    .from('encuestas')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
  return { data, error }
}

export async function cerrarEncuesta(id) {
  return actualizarEncuesta(id, { estado: 'cerrada' })
}

export async function abrirEncuesta(id) {
  return actualizarEncuesta(id, { estado: 'abierta' })
}

export async function archivarEncuesta(id) {
  return actualizarEncuesta(id, { activa: false })
}

/**
 * Duplica una encuesta (clona preguntas y opciones).  La copia queda en
 * estado 'abierta' y sin respuestas.
 */
export async function duplicarEncuesta(id) {
  const { data: original, error } = await obtenerEncuestaCompleta(id)
  if (error || !original) return { data: null, error: error || new Error('Encuesta no encontrada') }

  const { data: nueva, error: errCreate } = await crearEncuesta({
    nombre: `${original.nombre} (copia)`,
    descripcion: original.descripcion,
    fecha_cierre: null,
  })
  if (errCreate) return { data: null, error: errCreate }

  for (const p of original.preguntas || []) {
    const { data: preg, error: errP } = await supabase
      .from('preguntas')
      .insert([{
        encuesta_id: nueva.id,
        texto: p.texto,
        tipo: p.tipo,
        orden: p.orden,
        obligatoria: p.obligatoria,
        tipo_grafica: p.tipo_grafica,
      }])
      .select()
      .single()
    if (errP) return { data: null, error: errP }

    if (p.opciones?.length) {
      const filas = p.opciones.map((o) => ({
        pregunta_id: preg.id,
        texto: o.texto,
        orden: o.orden,
        valor: o.valor,
      }))
      const { error: errO } = await supabase.from('opciones_pregunta').insert(filas)
      if (errO) return { data: null, error: errO }
    }
  }
  return { data: nueva, error: null }
}

export async function eliminarEncuesta(id) {
  // Soft delete: marca activa=false (evita perder respuestas históricas).
  return actualizarEncuesta(id, { activa: false, estado: 'cerrada' })
}
