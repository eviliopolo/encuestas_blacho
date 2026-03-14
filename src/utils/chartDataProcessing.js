/**
 * Procesamiento de datos para el dashboard de estadísticas.
 * Maneja respuestas múltiples (separadas por comas) correctamente.
 */

/**
 * Cuenta opciones en un campo que puede tener múltiples valores separados por comas.
 * @param {Array} data - Array de filas de encuestas
 * @param {string} campo - Nombre del campo (ej: 'p6_tipo_carrera')
 * @returns {Array<{name: string, value: number}>} Formato para Recharts, ordenado de mayor a menor
 */
export const contarOpcionesMultiples = (data, campo) => {
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
 */
export const nivelEducativoPadres = (data) => {
  const padre = contarOpcionesMultiples(data, 'p17_padre_nivel_educativo')
  const madre = contarOpcionesMultiples(data, 'p17_madre_nivel_educativo')
  const categorias = [...new Set([...padre.map((p) => p.name), ...madre.map((m) => m.name)])]
  return categorias.map((cat) => ({
    name: cat,
    Padre: padre.find((p) => p.name === cat)?.value ?? 0,
    Madre: madre.find((m) => m.name === cat)?.value ?? 0,
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
