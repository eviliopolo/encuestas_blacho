/**
 * Test CHASIDE — Tabla de puntuación según planilla oficial (“Test de Vocación Profesional”):
 * - Bloque **Intereses**: 10 preguntas por letra (C…E).
 * - Bloque **Aptitudes**: 4 preguntas por letra.
 * Total 98 ítems (70 + 28), sin repetir entre bloques.
 */

export const CHASIDE_LETTERS = ['C', 'H', 'A', 'S', 'I', 'D', 'E']

/** Etiquetas para gráficas e informe (misma orden que CHASIDE_LETTERS). */
export const CHASIDE_ETIQUETAS_AREA = [
  'Administrativas y Contables',
  'Humanísticas, Ciencias Jurídicas y Sociales',
  'Artísticas',
  'Ciencias de la Salud',
  'Ingenierías, Carreras técnicas y Computación',
  'Defensa y Seguridad',
  'Ciencias Agrarias y de la Naturaleza',
]

/** Intereses (planilla): 10 números de pregunta por columna. */
export const CHASIDE_INTERESES = Object.freeze({
  C: [98, 12, 64, 53, 85, 1, 78, 20, 71, 91],
  H: [9, 34, 80, 25, 95, 67, 41, 74, 56, 89],
  A: [21, 45, 96, 57, 28, 11, 50, 3, 81, 36],
  S: [33, 92, 70, 8, 87, 62, 23, 44, 16, 52],
  I: [75, 6, 19, 38, 60, 27, 83, 54, 47, 97],
  D: [84, 31, 48, 73, 5, 65, 14, 37, 58, 24],
  E: [77, 42, 88, 17, 93, 32, 68, 49, 35, 61],
})

/** Aptitudes (planilla): 4 números de pregunta por columna. */
export const CHASIDE_APTITUDES = Object.freeze({
  C: [15, 51, 2, 46],
  H: [63, 30, 72, 86],
  A: [22, 39, 76, 82],
  S: [69, 40, 29, 4],
  I: [26, 59, 90, 10],
  D: [13, 66, 18, 43],
  E: [94, 7, 79, 55],
})

/** Texto de referencia por columna (leyenda del PDF). */
export const CHASIDE_TABLA_REFERENCIA = Object.freeze([
  {
    intereses: 'Organización, supervisión, orden, análisis/síntesis, cálculo, práctico, responsable.',
    aptitudes: 'Coordinación de equipos, planificación, gestión comercial y financiera.',
    carreras: 'Administración de empresas, contaduría, gestión pública, auditoría.',
  },
  {
    intereses: 'Precisión verbal, orden, justicia, persuasión, imaginación, mediación.',
    aptitudes: 'Comunicación, argumentación, trabajo social y jurídico.',
    carreras: 'Derecho, trabajo social, psicología, comunicación, pedagogía.',
  },
  {
    intereses: 'Estética, creatividad, detalle manual y visual, innovación, intuición.',
    aptitudes: 'Diseño, expresión artística, producción cultural.',
    carreras: 'Artes, diseño gráfico, música, arquitectura, moda.',
  },
  {
    intereses: 'Ayuda a personas, precisión, análisis clínico, paciencia, solidaridad.',
    aptitudes: 'Atención en salud, laboratorio, prevención y educación sanitaria.',
    carreras: 'Medicina, enfermería, odontología, biología de la salud, bacteriología.',
  },
  {
    intereses: 'Cálculo, rigor técnico, precisión, planificación, pensamiento analítico.',
    aptitudes: 'Resolución técnica, sistemas, ingeniería y mantenimiento.',
    carreras: 'Ingenierías, técnologías, sistemas y computación, electrónica.',
  },
  {
    intereses: 'Justicia, liderazgo, trabajo en equipo, acción bajo presión, persuasión.',
    aptitudes: 'Orden público, cumplimiento de normas, seguridad y gestión de riesgos.',
    carreras: 'Fuerzas armadas, policía, seguridad y salud ocupacional.',
  },
  {
    intereses: 'Investigación, método, observación, análisis de fenómenos naturales.',
    aptitudes: 'Laboratorio, campo, conservación e investigación aplicada.',
    carreras: 'Ciencias naturales, agronomía, veterinaria, biología marina, medio ambiente.',
  },
])
