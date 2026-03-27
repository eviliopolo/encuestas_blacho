/**
 * Procesamiento de datos para el dashboard de estadísticas.
 * Maneja respuestas múltiples (separadas por comas) correctamente.
 */

import { P17_NIVEL_EDUCATIVO } from '@/lib/constants'

/**
 * Cuenta opciones en un campo que puede tener múltiples valores separados por comas.
 * @param {Array} data - Array de filas de encuestas
 * @param {string} campo - Nombre del campo (ej: 'p6_tipo_carrera')
 * @param {string[] | null} ordenOpciones - Si se pasa, mantiene ese orden (p. ej. opciones del formulario).
 * @returns {Array<{name: string, value: number}>} Formato para Recharts
 */
export const contarOpcionesMultiples = (data, campo, ordenOpciones = null) => {
  const conteo = {}
  data.forEach((row) => {
    const valor = row[campo]
    if (valor != null && valor !== '') {
      const opciones = String(valor).split(',')
      opciones.forEach((opcion) => {
        const limpia = opcion.trim()
        if (limpia) {
          conteo[limpia] = (conteo[limpia] || 0) + 1
        }
      })
    }
  })
  if (Array.isArray(ordenOpciones) && ordenOpciones.length > 0) {
    return ordenOpciones.map((name) => ({
      name,
      value: conteo[name] || 0,
    }))
  }
  return Object.entries(conteo)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Cuenta respuestas de una pregunta de selección única.
 * Si se pasan opciones, las respeta y mantiene el orden.
 */
export const contarRespuestasUnicas = (data, campo, opciones = null) => {
  const conteo = {}
  data.forEach((row) => {
    const valor = row[campo]
    const key = valor != null && valor !== '' ? String(valor).trim() : 'Sin respuesta'
    conteo[key] = (conteo[key] || 0) + 1
  })

  if (Array.isArray(opciones) && opciones.length > 0) {
    return opciones.map((opt) => ({
      name: opt,
      value: conteo[opt] || 0,
    }))
  }

  return Object.entries(conteo)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Calcula el porcentaje de respuestas "Sí" en un campo.
 */
export const calcularPorcentajeSi = (data, campo) => {
  const total = data.length
  if (total === 0) return 0
  const siCount = data.filter((row) => row[campo] === 'Sí').length
  return Math.round((siCount / total) * 100)
}

/**
 * Aplica filtros a los datos de encuestas.
 */
export const aplicarFiltros = (data, filtros) => {
  let filtrada = [...data]
  if (filtros.ied) {
    filtrada = filtrada.filter((row) => row.ied === filtros.ied)
  }
  if (filtros.curso) {
    filtrada = filtrada.filter((row) => row.curso === filtros.curso)
  }
  if (filtros.fechaDesde) {
    const desde = new Date(filtros.fechaDesde)
    desde.setHours(0, 0, 0, 0)
    filtrada = filtrada.filter((row) => {
      if (!row.fecha_registro) return false
      const fecha = new Date(row.fecha_registro)
      fecha.setHours(0, 0, 0, 0)
      return fecha >= desde
    })
  }
  if (filtros.fechaHasta) {
    const hasta = new Date(filtros.fechaHasta)
    hasta.setHours(23, 59, 59, 999)
    filtrada = filtrada.filter((row) => {
      if (!row.fecha_registro) return false
      const fecha = new Date(row.fecha_registro)
      return fecha <= hasta
    })
  }
  return filtrada
}

/**
 * Calcula KPIs: total, hoy, esta semana, promedio de edad.
 */
export const calcularKPIs = (data) => {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const inicioDeSemana = new Date(hoy)
  inicioDeSemana.setDate(hoy.getDate() - hoy.getDay())
  inicioDeSemana.setHours(0, 0, 0, 0)

  const conEdad = data.filter((row) => row.edad != null && !isNaN(Number(row.edad)))
  const sumaEdad = conEdad.reduce((sum, row) => sum + Number(row.edad), 0)

  return {
    total: data.length,
    hoy: data.filter((row) => {
      if (!row.fecha_registro) return false
      const fecha = new Date(row.fecha_registro)
      fecha.setHours(0, 0, 0, 0)
      return fecha.getTime() === hoy.getTime()
    }).length,
    estaSemana: data.filter((row) => {
      if (!row.fecha_registro) return false
      return new Date(row.fecha_registro) >= inicioDeSemana
    }).length,
    promedioEdad: conEdad.length > 0 ? Math.round(sumaEdad / conEdad.length) : 0,
  }
}

/**
 * Cuenta encuestas por valor único de un campo (ej: por IED).
 */
export const contarPorCampo = (data, campo) => {
  const conteo = {}
  data.forEach((row) => {
    const val = row[campo]
    const key = val != null && val !== '' ? String(val).trim() : 'Sin especificar'
    conteo[key] = (conteo[key] || 0) + 1
  })
  return Object.entries(conteo)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Top N opciones de un campo de respuestas múltiples.
 */
export const topNOpcionesMultiples = (data, campo, n = 10) => {
  return contarOpcionesMultiples(data, campo).slice(0, n)
}

/**
 * Datos para gráfica de nivel educativo padre vs madre (series agrupadas).
 * Orden de categorías: el mismo que en el formulario (P17).
 */
export const nivelEducativoPadres = (data) => {
  const orden = P17_NIVEL_EDUCATIVO
  const padre = contarOpcionesMultiples(data, 'p17_padre_nivel_educativo', orden)
  const madre = contarOpcionesMultiples(data, 'p17_madre_nivel_educativo', orden)
  return orden.map((cat, i) => ({
    name: cat,
    Padre: padre[i]?.value ?? 0,
    Madre: madre[i]?.value ?? 0,
  }))
}

/**
 * Indicadores de motivación (% Sí) para P1, P12, P13, P15, P23.
 */
export const indicadoresMotivacion = (data) => {
  const campos = [
    { key: 'p1_continuar_formacion', label: 'P1 Continuar formación' },
    { key: 'p12_confianza_capacidades', label: 'P12 Confianza capacidades' },
    { key: 'p13_motivacion_familia', label: 'P13 Motivación familia' },
    { key: 'p15_apoyo_familia_carrera', label: 'P15 Apoyo familiar' },
    { key: 'p23_factor_economico_importante', label: 'P23 Factor económico' },
  ]
  return campos.map(({ key, label }) => ({
    name: label,
    value: calcularPorcentajeSi(data, key),
  })).sort((a, b) => b.value - a.value)
}

/**
 * Calcula distribución para una pregunta y añade porcentaje.
 */
export const distribucionPregunta = (data, campo, { multiple = false, opciones = null } = {}) => {
  const base = multiple
    ? contarOpcionesMultiples(data, campo, opciones)
    : contarRespuestasUnicas(data, campo, opciones)

  const total = multiple
    ? base.reduce((acc, item) => acc + item.value, 0)
    : data.length

  return base.map((item) => ({
    ...item,
    percentage: total > 0 ? Number(((item.value / total) * 100).toFixed(1)) : 0,
  }))
}

/**
 * Serie por enunciado para preguntas con varias frases Sí/No.
 */
export const serieSiNoPorItems = (data, items = []) => {
  return items.map(({ key, label }) => {
    const si = data.filter((row) => row[key] === 'Sí').length
    const no = data.filter((row) => row[key] === 'No').length
    const sinRespuesta = data.length - si - no
    return { name: label, si, no, sinRespuesta }
  })
}
