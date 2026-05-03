import { jsPDF } from 'jspdf'
import {
  CHASIDE_LETTERS,
  CHASIDE_ETIQUETAS_AREA,
  CHASIDE_INTERESES,
  CHASIDE_APTITUDES,
  CHASIDE_TABLA_REFERENCIA,
} from '@/utils/chasideConstants'
import {
  calcularScoresChaside,
  porcentajeSobreMax,
  resolverTextoOpcionDesdePregunta,
} from '@/utils/chasideScoring'

const MM_ANCHO_CONTENIDO = 186
const MARGIN = 12

const COLOR_AZUL = [37, 99, 235]
const COLOR_NARANJA = [234, 88, 12]
const COLOR_FONDO_GRAF = [243, 244, 246]

function maximosPorLetra(grupos) {
  return Object.fromEntries(CHASIDE_LETTERS.map((L) => [L, (grupos[L] || []).length]))
}

function slugNombre(nombre) {
  const s = String(nombre || 'participante').trim() || 'participante'
  const b = s.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 48)
  return b || 'participante'
}

/**
 * Dibuja un bloque de barras horizontales CHASIDE.
 * @returns {number} siguiente posición Y (mm).
 */
function dibujarGrafica(doc, y0, titulo, scores, destacar, maxPorLetra) {
  const labelW = 74
  const barX = MARGIN + labelW
  const maxBar = MM_ANCHO_CONTENIDO - labelW - 4
  const rowH = 6.8
  const altoCaja = 10 + CHASIDE_LETTERS.length * rowH

  doc.setFillColor(...COLOR_FONDO_GRAF)
  doc.rect(MARGIN, y0, MM_ANCHO_CONTENIDO, altoCaja, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(MARGIN, y0, MM_ANCHO_CONTENIDO, altoCaja, 'S')

  doc.setTextColor(30, 30, 30)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, MARGIN + 3, y0 + 7)

  doc.setFont('helvetica', 'normal')
  let y = y0 + 13

  CHASIDE_LETTERS.forEach((L, idx) => {
    const label = CHASIDE_ETIQUETAS_AREA[idx]
    const score = scores[L]
    const max = maxPorLetra[L] || 1
    const pct = porcentajeSobreMax(score, max)
    const hi = destacar[L]
    const barW = Math.max(1.2, (pct / 100) * maxBar)

    doc.setFontSize(6.2)
    doc.setTextColor(40, 40, 40)
    const lines = doc.splitTextToSize(label, labelW - 5)
    doc.text(lines, MARGIN + 3, y + 3.5)

    doc.setFillColor(...(hi ? COLOR_NARANJA : COLOR_AZUL))
    doc.rect(barX, y, barW, rowH - 1.8, 'F')

    const pctStr = `${pct}% · ${score}/${max}`
    doc.setFontSize(7)
    if (barW > 28) {
      doc.setTextColor(255, 255, 255)
      doc.text(pctStr, barX + 2, y + 4)
    } else {
      doc.setTextColor(55, 55, 55)
      doc.text(pctStr, barX + barW + 2, y + 4)
    }

    y += rowH
  })

  doc.setTextColor(0, 0, 0)
  return y0 + altoCaja + 6
}

function dibujarTablaReferencia(doc, y0) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Referencia por áreas', MARGIN, y0)

  const colW = MM_ANCHO_CONTENIDO / 7
  let maxYy = y0 + 8

  for (let colIdx = 0; colIdx < 7; colIdx++) {
    const bloque = CHASIDE_TABLA_REFERENCIA[colIdx]
    const x = MARGIN + colIdx * colW + 1
    let yy = y0 + 10

    doc.setFontSize(5.2)
    doc.setTextColor(55, 55, 55)
    doc.setFont('helvetica', 'bold')
    doc.text('Intereses', x, yy)
    yy += 4
    doc.setFont('helvetica', 'normal')
    for (const line of doc.splitTextToSize(bloque.intereses, colW - 2)) {
      doc.text(line, x, yy)
      yy += 3.1
    }
    yy += 2
    doc.setFont('helvetica', 'bold')
    doc.text('Aptitudes', x, yy)
    yy += 4
    doc.setFont('helvetica', 'normal')
    for (const line of doc.splitTextToSize(bloque.aptitudes, colW - 2)) {
      doc.text(line, x, yy)
      yy += 3.1
    }
    yy += 2
    doc.setFont('helvetica', 'bold')
    doc.text('Áreas de carreras', x, yy)
    yy += 4
    doc.setFont('helvetica', 'normal')
    for (const line of doc.splitTextToSize(bloque.carreras, colW - 2)) {
      doc.text(line, x, yy)
      yy += 3.1
    }
    maxYy = Math.max(maxYy, yy)
  }

  doc.setTextColor(0, 0, 0)
  return maxYy + 6
}

/**
 * Genera y descarga el PDF de resultado CHASIDE para un respondente.
 *
 * @param {object} p
 * @param {string} p.nombreEstudiante
 * @param {string} [p.identificacion]
 * @param {string|number} [p.edad]
 * @param {string} [p.curso]
 * @param {string} [p.ied]  Colegio / IED
 * @param {Array} p.preguntas  Preguntas de la encuesta (con opciones).
 * @param {Array} p.detalles  Detalles de respuesta (pueden incluir `opcion` desde el listado).
 */
export function descargarInformePdfChaside(p) {
  const {
    nombreEstudiante,
    identificacion = '',
    edad = '',
    curso = '',
    ied = '',
    preguntas = [],
    detalles = [],
  } = p

  const resultado = calcularScoresChaside({
    preguntas,
    detalles,
    resolverTextoOpcion: resolverTextoOpcionDesdePregunta,
  })

  const maxInt = maximosPorLetra(CHASIDE_INTERESES)
  const maxApt = maximosPorLetra(CHASIDE_APTITUDES)

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageH = doc.internal.pageSize.getHeight()

  let y = MARGIN

  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(250, 250, 250)
  doc.rect(MARGIN, y, 88, 16, 'FD')
  doc.rect(MARGIN + 98, y, 88, 16, 'FD')
  doc.setFontSize(7)
  doc.setTextColor(55, 55, 55)
  doc.text('Alcaldía de Barranquilla', MARGIN + 4, y + 6)
  doc.text('Secretaría Distrital de Educación', MARGIN + 4, y + 11)
  doc.text('CORPOGESTIÓN', MARGIN + 102, y + 9)

  y += 22
  doc.setTextColor(20, 20, 20)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(
    'RESULTADO - TEST DE ORIENTACIÓN VOCACIONAL OCUPACIONAL',
    105,
    y,
    { align: 'center' },
  )
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const nm = String(nombreEstudiante || '—').trim() || '—'
  doc.setFont('helvetica', 'bold')
  doc.text('Nombre:', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.text(nm, MARGIN + 22, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Identificación:', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.text(identificacion ? String(identificacion) : '________________', MARGIN + 32, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Edad:', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.text(edad !== '' && edad != null ? String(edad) : '________________', MARGIN + 14, y)
  doc.setFont('helvetica', 'bold')
  doc.text('Curso:', MARGIN + 50, y)
  doc.setFont('helvetica', 'normal')
  doc.text(curso ? String(curso) : '________________', MARGIN + 64, y)
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.text('Colegio (IED):', MARGIN, y)
  doc.setFont('helvetica', 'normal')
  doc.text(ied ? String(ied) : '________________', MARGIN + 32, y)
  y += 10

  const intro =
    'Este instrumento indaga intereses y aptitudes para apoyar la reflexión vocacional. '
    + 'Los intereses se entienden como inclinaciones hacia ciertas actividades u objetos. '
    + 'Las aptitudes refieren habilidades favorecidas por la práctica y la repetición. '
    + 'Los porcentajes en cada barra indican cuánto del máximo posible en esa área alcanzó la persona según sus respuestas Sí/No.'

  doc.setFontSize(9)
  doc.setTextColor(55, 55, 55)
  const introLines = doc.splitTextToSize(intro, MM_ANCHO_CONTENIDO)
  doc.text(introLines, MARGIN, y)
  y += introLines.length * 4.2 + 4

  if (resultado.warnings.length) {
    doc.setFontSize(8)
    doc.setTextColor(180, 80, 0)
    doc.text(resultado.warnings[0], MARGIN, y)
    y += 6
    doc.setTextColor(55, 55, 55)
  }

  y = dibujarGrafica(
    doc,
    y,
    'INTERESES',
    resultado.intereses,
    resultado.destacarIntereses,
    maxInt,
  )

  y = dibujarGrafica(
    doc,
    y,
    'APTITUDES',
    resultado.aptitudes,
    resultado.destacarAptitudes,
    maxApt,
  )

  if (y > pageH - 95) {
    doc.addPage()
    y = MARGIN
  }

  dibujarTablaReferencia(doc, y)

  const fname = `resultado_chaside_${slugNombre(nombreEstudiante)}.pdf`
  doc.save(fname)
}
