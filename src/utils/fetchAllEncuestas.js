import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 1000

/**
 * Obtiene todas las filas de encuestas_orientacion evitando el límite por defecto
 * de PostgREST (típicamente 1000 filas por petición).
 */
export async function fetchAllEncuestas() {
  const all = []
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from('encuestas_orientacion')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return { data: null, error }
    if (!data?.length) break

    all.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return { data: all, error: null }
}
