// Opciones Sí/No para preguntas de una sola opción
export const SI_NO_OPTIONS = [
  { value: 'Sí', label: 'Sí' },
  { value: 'No', label: 'No' },
]

// P6 - Tipo de Carrera (CHECKBOXES - múltiple)
export const P6_TIPO_CARRERA = [
  'Universitaria',
  'Técnica',
  'Tecnológica',
  'Cursos',
  'Oficio',
  'No me gustaría',
]

// P7 - Área de Mayor Destreza (CHECKBOXES - múltiple)
export const P7_AREA_MAYOR_DESTREZA = [
  'Matemáticas',
  'Sociales',
  'Biología',
  'Química',
  'Deportes',
  'Democracia-ética',
  'Religión',
  'Filosofía',
  'Inglés',
  'Español',
  'Informática',
]

// P8 - Áreas de Formación (CHECKBOXES - múltiple, sin límite)
export const P8_AREAS_FORMACION = [
  'Medicina y salud',
  'Ingeniería',
  'Ciencias sociales',
  'Ciencias económicas',
  'Licenciaturas',
  'Ciencias de la educación',
  'Idiomas',
  'Biología y química',
  'Religión y filosofía',
  'Matemáticas',
  'Ciencias políticas',
  'Defensa seguridad/fuerzas',
  'Tics',
  'Deportes',
  'Artes-diseño',
  'Agricultura',
  'Ciencias culinarias',
  'Ciencias de la comunicación',
]

// P10 - Después del Bachillerato (CHECKBOXES - múltiple)
export const P10_DESPUES_BACHILLERATO = [
  'Estudiar',
  'Trabajar',
  'Estudiar y trabajar',
  'No sé aún',
]

// P11 y P14 - Frecuencia (CHECKBOXES - múltiple)
export const P11_P14_FRECUENCIA = [
  'Siempre',
  'Algunas veces',
  'Nunca',
]

// P17 - Nivel Educativo Padre/Madre (CHECKBOXES - múltiple)
export const P17_NIVEL_EDUCATIVO = [
  'Sin estudios',
  'Primaria',
  'Secundaria',
  'Técnico/tecnológico',
  'Profesional',
]

// P18 - Expresión Familiar (CHECKBOXES - múltiple)
export const P18_EXPRESION_FAMILIAR = [
  'Sí',
  'No',
  'A veces',
]

// P20 - Conceptos de Ayuda (CHECKBOXES - múltiple)
export const P20_CONCEPTOS_AYUDA = [
  'Motivación y disciplina',
  'Autoconocimiento',
  'Factor económico',
  'A y B',
  'A y C',
]

// P26 - Obstáculo Principal (CHECKBOXES - múltiple)
export const P26_OBSTACULO_PRINCIPAL = [
  'A - Recursos Económicos',
  'B - Poco apoyo familiar',
  'C - Limitaciones sociales',
  'D - Dudas sobre habilidades',
  'E - Falta claridad vocacional',
  'F - Influencia negativa amistades',
]

// Campos que usan CHECKBOXES (selección múltiple)
export const CHECKBOX_FIELDS = [
  'p6_tipo_carrera',
  'p7_area_mayor_destreza',
  'p8_areas_formacion',
  'p10_despues_bachillerato',
  'p11_herramientas_vocacion',
  'p14_apoyo_padres_orientacion',
  'p17_padre_nivel_educativo',
  'p17_madre_nivel_educativo',
  'p18_expresion_familiar',
  'p20_conceptos_ayuda_formacion',
  'p26_obstaculo_principal',
]

// Mapeo de campo a opciones para checkboxes
export const CHECKBOX_OPTIONS = {
  p6_tipo_carrera: P6_TIPO_CARRERA,
  p7_area_mayor_destreza: P7_AREA_MAYOR_DESTREZA,
  p8_areas_formacion: P8_AREAS_FORMACION,
  p10_despues_bachillerato: P10_DESPUES_BACHILLERATO,
  p11_herramientas_vocacion: P11_P14_FRECUENCIA,
  p14_apoyo_padres_orientacion: P11_P14_FRECUENCIA,
  p17_padre_nivel_educativo: P17_NIVEL_EDUCATIVO,
  p17_madre_nivel_educativo: P17_NIVEL_EDUCATIVO,
  p18_expresion_familiar: P18_EXPRESION_FAMILIAR,
  p20_conceptos_ayuda_formacion: P20_CONCEPTOS_AYUDA,
  p26_obstaculo_principal: P26_OBSTACULO_PRINCIPAL,
}
