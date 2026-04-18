/**
 * Agrega métricas por pregunta a partir de respuestas con detalles anidados.
 *
 * Entrada:
 *   - encuesta: { id, nombre, preguntas: [{id, texto, tipo, tipo_grafica, opciones:[{id, texto}] }] }
 *   - respuestas: [{ id, ..., detalles: [{ pregunta_id, opcion_pregunta_id, texto_respuesta, opcion:{id,texto} }] }]
 *
 * Salida por pregunta:
 *   { pregunta, total, conteos: [{opcion, count}], textos: [string] }
 */
export function agregarEstadisticas(encuesta, respuestas) {
  const resultado = []
  for (const p of encuesta.preguntas || []) {
    const item = { pregunta: p, total: 0, conteos: [], textos: [] }

    if (p.tipo === 'respuesta_abierta') {
      for (const r of respuestas) {
        for (const d of r.detalles || []) {
          if (d.pregunta_id === p.id && d.texto_respuesta) {
            item.textos.push(d.texto_respuesta)
            item.total += 1
          }
        }
      }
    } else {
      const mapa = new Map()
      for (const op of p.opciones || []) mapa.set(op.id, { opcion: op.texto, count: 0 })
      for (const r of respuestas) {
        for (const d of r.detalles || []) {
          if (d.pregunta_id === p.id && d.opcion_pregunta_id) {
            const entry = mapa.get(d.opcion_pregunta_id)
            if (entry) {
              entry.count += 1
              item.total += 1
            }
          }
        }
      }
      item.conteos = Array.from(mapa.values())
    }
    resultado.push(item)
  }
  return resultado
}

/**
 * Frecuencia de palabras para respuestas abiertas.
 * Elimina stop-words comunes en español.
 */
const STOP_WORDS = new Set([
  'a','al','algo','algunas','algunos','ante','antes','como','con','contra','cual','cuando','de','del','desde','donde',
  'durante','e','el','ella','ellas','ellos','en','entre','era','erais','eran','eras','eres','es','esa','esas','ese',
  'eso','esos','esta','estaba','estaban','estamos','estan','estar','estas','este','esto','estos','estoy','fue','fueron',
  'ha','habeis','haber','habia','habian','habra','han','has','hasta','hay','la','las','le','les','lo','los','mas','me',
  'mi','mis','mucho','muchos','muy','nada','ni','no','nos','nosotros','o','os','otra','otras','otro','otros','para',
  'pero','poco','por','porque','que','quien','quienes','se','sea','sean','ser','si','sido','sin','sobre','sois',
  'solamente','solo','son','soy','su','sus','tambien','tampoco','te','tenemos','tener','tengo','ti','tiene','tienen',
  'todo','todos','tu','tus','un','una','unas','uno','unos','y','ya','yo'
])

export function frecuenciaPalabras(textos, limite = 30) {
  const mapa = new Map()
  for (const t of textos) {
    const limpio = (t || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    for (const palabra of limpio.split(/\s+/)) {
      if (!palabra || palabra.length < 3 || STOP_WORDS.has(palabra)) continue
      mapa.set(palabra, (mapa.get(palabra) || 0) + 1)
    }
  }
  return Array.from(mapa.entries())
    .map(([palabra, count]) => ({ palabra, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limite)
}
