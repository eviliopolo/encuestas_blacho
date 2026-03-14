// Columnas para la tabla (todas las 47+ columnas de la encuesta)
// Se usan para encabezados y para exportación
export const TABLE_COLUMNS = [
  { key: 'id', label: 'ID', fixed: true, width: 80 },
  { key: 'created_at', label: 'Fecha creación', fixed: true, width: 120 },
  { key: 'fecha_registro', label: 'Fecha registro', fixed: true, width: 110 },
  { key: 'nombre', label: 'Nombre', fixed: true, width: 180 },
  { key: 'ied', label: 'IED', width: 120 },
  { key: 'curso', label: 'Curso', width: 90 },
  { key: 'identificacion', label: 'Identificación', width: 110 },
  { key: 'edad', label: 'Edad', width: 70 },
  { key: 'p1_continuar_formacion', label: 'P1 Continuar formación', width: 140 },
  { key: 'p2_info_edsuperior_colegio', label: 'P2 Info ED superior colegio', width: 160 },
  { key: 'p3_orientacion_edsuperior_casa', label: 'P3 Orientación ED superior casa', width: 200 },
  { key: 'p4_orientacion_postbachillerato', label: 'P4 Orientación postbachillerato', width: 180 },
  { key: 'p5_conoce_programas_academicos', label: 'P5 Conoce programas académicos', width: 180 },
  { key: 'p6_tipo_carrera', label: 'P6 Tipo carrera', width: 160 },
  { key: 'p7_area_mayor_destreza', label: 'P7 Área mayor destreza', width: 160 },
  { key: 'p8_areas_formacion', label: 'P8 Áreas formación', width: 200 },
  { key: 'p9_importante_continuar_estudios', label: 'P9 Importante continuar estudios', width: 200 },
  { key: 'p10_despues_bachillerato', label: 'P10 Después bachillerato', width: 160 },
  { key: 'p11_herramientas_vocacion', label: 'P11 Herramientas vocación', width: 180 },
  { key: 'p12_confianza_capacidades', label: 'P12 Confianza capacidades', width: 160 },
  { key: 'p13_motivacion_familia', label: 'P13 Motivación familia', width: 150 },
  { key: 'p14_apoyo_padres_orientacion', label: 'P14 Apoyo padres orientación', width: 180 },
  { key: 'p15_apoyo_familia_carrera', label: 'P15 Apoyo familia carrera', width: 170 },
  { key: 'p16_motivado_futuro', label: 'P16 Motivado futuro', width: 140 },
  { key: 'p17_padre_nivel_educativo', label: 'P17 Padre nivel educativo', width: 170 },
  { key: 'p17_madre_nivel_educativo', label: 'P17 Madre nivel educativo', width: 180 },
  { key: 'p18_expresion_familiar', label: 'P18 Expresión familiar', width: 160 },
  { key: 'p19a_conoce_autoconocimiento', label: 'P19a Conoce autoconocimiento', width: 180 },
  { key: 'p19b_conoce_educacion_superior', label: 'P19b Conoce educación superior', width: 200 },
  { key: 'p19c_conoce_mundo_laboral', label: 'P19c Conoce mundo laboral', width: 180 },
  { key: 'p20_conceptos_ayuda_formacion', label: 'P20 Conceptos ayuda formación', width: 200 },
  { key: 'p21_estudiar_fuera_barranquilla', label: 'P21 Estudiar fuera Barranquilla', width: 200 },
  { key: 'p22_ejemplo_inspiracion', label: 'P22 Ejemplo inspiración', width: 160 },
  { key: 'p23_factor_economico_importante', label: 'P23 Factor económico importante', width: 200 },
  { key: 'p24_redes_sociales_influyen', label: 'P24 Redes sociales influyen', width: 170 },
  { key: 'p25_frase1_expectativas_familia', label: 'P25 Frase1 Expectativas familia', width: 200 },
  { key: 'p25_frase2_carreras_no_adecuadas', label: 'P25 Frase2 Carreras no adecuadas', width: 200 },
  { key: 'p25_frase3_profesiones_sin_futuro', label: 'P25 Frase3 Profesiones sin futuro', width: 200 },
  { key: 'p25_frase4_dificil_acceder_carreras', label: 'P25 Frase4 Difícil acceder carreras', width: 220 },
  { key: 'p25_frase5_no_creencia_influye', label: 'P25 Frase5 No creencia influye', width: 200 },
  { key: 'p26_obstaculo_principal', label: 'P26 Obstáculo principal', width: 180 },
  { key: 'p27_institucion_identificada', label: 'P27 Institución identificada', width: 180 },
  { key: 'p28_info_becas_programas', label: 'P28 Info becas programas', width: 170 },
  { key: 'p29_abandono_colegio', label: 'P29 Abandono colegio', width: 140 },
  { key: 'p30_conoce_opciones_laborales', label: 'P30 Conoce opciones laborales', width: 180 },
  { key: 'p31_conoce_tipos_contrato', label: 'P31 Conoce tipos contrato', width: 170 },
  { key: 'p32_conoce_entrevista_trabajo', label: 'P32 Conoce entrevista trabajo', width: 190 },
  { key: 'p33_sabe_hoja_vida', label: 'P33 Sabe hoja de vida', width: 150 },
]

export const formatCellValue = (value) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'string' && value.length > 50) return value.substring(0, 47) + '...'
  return String(value)
}

export const formatDate = (value) => {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('es-CO')
  } catch {
    return value
  }
}
