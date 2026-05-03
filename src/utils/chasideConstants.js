/**
 * Test CHASIDE: asignación de cada número de pregunta (1–98) a áreas C–H–A–S–I–D–E.
 * Fuente: cuadros de puntuación estándar del test (intereses vs aptitudes).
 *
 * Nota: En algunas tablas la pregunta 72 aparece duplicada entre H y S en aptitudes;
 * aquí se cuenta solo en **H** (mediación / humanidades).
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

/** Intereses: cada “Sí” en esa pregunta suma 1 en la columna indicada. */
export const CHASIDE_INTERESES = Object.freeze({
  C: [1, 12, 20, 53, 64],
  H: [9, 25, 34, 41, 56],
  A: [3, 11, 21, 28, 36],
  S: [8, 16, 23, 33, 44],
  I: [6, 19, 27, 38, 47],
  D: [5, 14, 24, 31, 37],
  E: [17, 32, 35, 42, 49],
})

/**
 * Aptitudes: cada “Sí” suma en la columna (lista extensa por área).
 * La pregunta 72 solo en H (no en S).
 */
export const CHASIDE_APTITUDES = Object.freeze({
  C: [71, 78, 85, 91, 98, 2, 15, 46, 51],
  H: [67, 74, 80, 89, 95, 30, 63, 72, 86],
  A: [45, 50, 57, 70, 81, 96, 22, 39, 76, 82],
  S: [52, 62, 87, 92, 4, 29, 40, 69],
  I: [54, 60, 75, 83, 97, 10, 26, 59, 90],
  D: [48, 58, 65, 73, 84, 13, 18, 43, 66],
  E: [61, 68, 77, 88, 93, 7, 55, 79, 94],
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
