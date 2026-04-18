-- =====================================================================
-- Migración 0002: Migración de la encuesta legacy `encuestas_orientacion`
-- al nuevo modelo multi-encuesta.
--
-- Crea una encuesta preexistente con UUID fijo, genera sus preguntas con
-- sus opciones, y traduce cada fila histórica a `respuestas_encuesta` +
-- `respuestas_detalle`.
--
-- Es IDEMPOTENTE: puede ejecutarse varias veces; no duplica datos.
-- Identificador estable de la encuesta:  11111111-1111-1111-1111-111111111111
--
-- Todo el trabajo está envuelto en un único bloque DO para evitar
-- problemas de parseo / separación de statements en el editor SQL de
-- Supabase.  Los mapeos se construyen dinámicamente con VALUES +
-- jsonb_agg, sin dollar-quoting anidado.
-- =====================================================================

DO $do_migrar_legacy$
DECLARE
    v_encuesta_id     UUID := '11111111-1111-1111-1111-111111111111';
    v_estado_prev     TEXT;
    v_respuesta_id    UUID;
    v_pregunta_id     UUID;
    v_opcion_id       UUID;
    v_tipo            TEXT;
    v_valor           TEXT;
    v_token           TEXT;
    v_tokens          TEXT[];
    r_resp            RECORD;
    r_col             RECORD;
    v_map_preguntas   JSONB;
    v_map_opciones    JSONB;
BEGIN
    ------------------------------------------------------------------
    -- 0. Construcción de catálogos en memoria
    ------------------------------------------------------------------
    v_map_preguntas := (
        SELECT jsonb_agg(jsonb_build_object(
                    'columna',      m.columna,
                    'orden',        m.orden,
                    'texto',        m.texto,
                    'tipo',         m.tipo,
                    'tipo_grafica', m.tipo_grafica))
          FROM (VALUES
            ('p1_continuar_formacion',            1,  '¿Te gustaría continuar tu formación académica?',                       'unica_respuesta',    'circular'),
            ('p2_info_edsuperior_colegio',        2,  '¿En tu colegio recibes información sobre educación superior?',         'unica_respuesta',    'circular'),
            ('p3_orientacion_edsuperior_casa',    3,  '¿En casa recibes orientación sobre educación superior?',               'unica_respuesta',    'circular'),
            ('p4_orientacion_postbachillerato',   4,  '¿Recibes orientación para la vida post-bachillerato?',                 'unica_respuesta',    'circular'),
            ('p5_conoce_programas_academicos',    5,  '¿Conoces programas académicos de educación superior?',                 'unica_respuesta',    'circular'),
            ('p6_tipo_carrera',                   6,  '¿Qué tipo de carrera te gustaría estudiar?',                           'multiple_respuesta', 'barras'),
            ('p7_area_mayor_destreza',            7,  '¿En qué áreas tienes mayor destreza?',                                 'multiple_respuesta', 'barras'),
            ('p8_areas_formacion',                8,  '¿En qué áreas de formación te gustaría desarrollarte?',                'multiple_respuesta', 'barras'),
            ('p9_importante_continuar_estudios',  9,  '¿Crees importante continuar tus estudios?',                            'unica_respuesta',    'circular'),
            ('p10_despues_bachillerato',          10, '¿Qué harás después del bachillerato?',                                  'multiple_respuesta', 'barras'),
            ('p11_herramientas_vocacion',         11, '¿Con qué frecuencia recibes herramientas de orientación vocacional?',  'multiple_respuesta', 'columnas'),
            ('p12_confianza_capacidades',         12, '¿Tienes confianza en tus capacidades?',                                 'unica_respuesta',    'circular'),
            ('p13_motivacion_familia',            13, '¿Recibes motivación de tu familia?',                                    'unica_respuesta',    'circular'),
            ('p14_apoyo_padres_orientacion',      14, '¿Con qué frecuencia te apoyan tus padres en tu orientación?',           'multiple_respuesta', 'columnas'),
            ('p15_apoyo_familia_carrera',         15, '¿Tu familia apoya la carrera que te gustaría elegir?',                 'unica_respuesta',    'circular'),
            ('p16_motivado_futuro',               16, '¿Te sientes motivado sobre tu futuro?',                                 'unica_respuesta',    'circular'),
            ('p17_padre_nivel_educativo',         17, 'Nivel educativo del padre',                                             'multiple_respuesta', 'barras'),
            ('p17_madre_nivel_educativo',         18, 'Nivel educativo de la madre',                                           'multiple_respuesta', 'barras'),
            ('p18_expresion_familiar',            19, '¿En tu familia se expresan afectivamente?',                            'multiple_respuesta', 'columnas'),
            ('p19a_conoce_autoconocimiento',      20, '¿Conoces el concepto de autoconocimiento?',                            'unica_respuesta',    'circular'),
            ('p19b_conoce_educacion_superior',    21, '¿Conoces el sistema de educación superior?',                           'unica_respuesta',    'circular'),
            ('p19c_conoce_mundo_laboral',         22, '¿Conoces cómo funciona el mundo laboral?',                             'unica_respuesta',    'circular'),
            ('p20_conceptos_ayuda_formacion',     23, '¿Qué conceptos ayudan a tu formación?',                                'multiple_respuesta', 'barras'),
            ('p21_estudiar_fuera_barranquilla',   24, '¿Considerarías estudiar fuera de Barranquilla?',                       'unica_respuesta',    'circular'),
            ('p22_ejemplo_inspiracion',           25, '¿Tienes un ejemplo de inspiración en tu vida?',                        'unica_respuesta',    'circular'),
            ('p23_factor_economico_importante',   26, '¿El factor económico es importante para tus decisiones académicas?',   'unica_respuesta',    'circular'),
            ('p24_redes_sociales_influyen',       27, '¿Las redes sociales influyen en tu orientación vocacional?',           'unica_respuesta',    'circular'),
            ('p25_frase1_expectativas_familia',   28, 'Mi familia tiene expectativas claras sobre mi futuro',                  'unica_respuesta',    'circular'),
            ('p25_frase2_carreras_no_adecuadas',  29, 'Hay carreras no adecuadas para personas como yo',                       'unica_respuesta',    'circular'),
            ('p25_frase3_profesiones_sin_futuro', 30, 'Existen profesiones sin futuro',                                        'unica_respuesta',    'circular'),
            ('p25_frase4_dificil_acceder_carreras',31,'Es difícil acceder a ciertas carreras',                                 'unica_respuesta',    'circular'),
            ('p25_frase5_no_creencia_influye',    32, 'Lo que creo influye en lo que logro',                                   'unica_respuesta',    'circular'),
            ('p26_obstaculo_principal',           33, '¿Cuál es el principal obstáculo para tu futuro académico?',            'multiple_respuesta', 'barras'),
            ('p27_institucion_identificada',      34, '¿Tienes una institución educativa identificada?',                      'unica_respuesta',    'circular'),
            ('p28_info_becas_programas',          35, '¿Tienes información sobre becas y programas?',                         'unica_respuesta',    'circular'),
            ('p29_abandono_colegio',              36, '¿Has pensado en abandonar el colegio?',                                 'unica_respuesta',    'circular'),
            ('p30_conoce_opciones_laborales',     37, '¿Conoces las opciones laborales disponibles?',                         'unica_respuesta',    'circular'),
            ('p31_conoce_tipos_contrato',         38, '¿Conoces los tipos de contrato laboral?',                              'unica_respuesta',    'circular'),
            ('p32_conoce_entrevista_trabajo',     39, '¿Sabes cómo afrontar una entrevista de trabajo?',                      'unica_respuesta',    'circular'),
            ('p33_sabe_hoja_vida',                40, '¿Sabes cómo elaborar una hoja de vida?',                                'unica_respuesta',    'circular')
          ) AS m(columna, orden, texto, tipo, tipo_grafica)
    );

    v_map_opciones := (
        SELECT jsonb_agg(jsonb_build_object(
                    'columna', m.columna,
                    'orden',   m.orden,
                    'texto',   m.texto))
          FROM (VALUES
            ('p6_tipo_carrera', 1, 'Universitaria'),
            ('p6_tipo_carrera', 2, 'Técnica'),
            ('p6_tipo_carrera', 3, 'Tecnológica'),
            ('p6_tipo_carrera', 4, 'Cursos'),
            ('p6_tipo_carrera', 5, 'Oficio'),
            ('p6_tipo_carrera', 6, 'No me gustaría'),

            ('p7_area_mayor_destreza', 1,  'Matemáticas'),
            ('p7_area_mayor_destreza', 2,  'Sociales'),
            ('p7_area_mayor_destreza', 3,  'Biología'),
            ('p7_area_mayor_destreza', 4,  'Química'),
            ('p7_area_mayor_destreza', 5,  'Deportes'),
            ('p7_area_mayor_destreza', 6,  'Democracia-ética'),
            ('p7_area_mayor_destreza', 7,  'Religión'),
            ('p7_area_mayor_destreza', 8,  'Filosofía'),
            ('p7_area_mayor_destreza', 9,  'Inglés'),
            ('p7_area_mayor_destreza', 10, 'Español'),
            ('p7_area_mayor_destreza', 11, 'Informática'),

            ('p8_areas_formacion', 1,  'Medicina y salud'),
            ('p8_areas_formacion', 2,  'Ingeniería'),
            ('p8_areas_formacion', 3,  'Ciencias sociales'),
            ('p8_areas_formacion', 4,  'Ciencias económicas'),
            ('p8_areas_formacion', 5,  'Licenciaturas'),
            ('p8_areas_formacion', 6,  'Ciencias de la educación'),
            ('p8_areas_formacion', 7,  'Idiomas'),
            ('p8_areas_formacion', 8,  'Biología y química'),
            ('p8_areas_formacion', 9,  'Religión y filosofía'),
            ('p8_areas_formacion', 10, 'Matemáticas'),
            ('p8_areas_formacion', 11, 'Ciencias políticas'),
            ('p8_areas_formacion', 12, 'Defensa seguridad/fuerzas'),
            ('p8_areas_formacion', 13, 'Tics'),
            ('p8_areas_formacion', 14, 'Deportes'),
            ('p8_areas_formacion', 15, 'Artes-diseño'),
            ('p8_areas_formacion', 16, 'Agricultura'),
            ('p8_areas_formacion', 17, 'Ciencias culinarias'),
            ('p8_areas_formacion', 18, 'Ciencias de la comunicación'),

            ('p10_despues_bachillerato', 1, 'Estudiar'),
            ('p10_despues_bachillerato', 2, 'Trabajar'),
            ('p10_despues_bachillerato', 3, 'Estudiar y trabajar'),
            ('p10_despues_bachillerato', 4, 'No sé aún'),

            ('p11_herramientas_vocacion', 1, 'Siempre'),
            ('p11_herramientas_vocacion', 2, 'Algunas veces'),
            ('p11_herramientas_vocacion', 3, 'Nunca'),

            ('p14_apoyo_padres_orientacion', 1, 'Siempre'),
            ('p14_apoyo_padres_orientacion', 2, 'Algunas veces'),
            ('p14_apoyo_padres_orientacion', 3, 'Nunca'),

            ('p17_padre_nivel_educativo', 1, 'Sin estudios'),
            ('p17_padre_nivel_educativo', 2, 'Primaria'),
            ('p17_padre_nivel_educativo', 3, 'Secundaria'),
            ('p17_padre_nivel_educativo', 4, 'Técnico/tecnológico'),
            ('p17_padre_nivel_educativo', 5, 'Profesional'),

            ('p17_madre_nivel_educativo', 1, 'Sin estudios'),
            ('p17_madre_nivel_educativo', 2, 'Primaria'),
            ('p17_madre_nivel_educativo', 3, 'Secundaria'),
            ('p17_madre_nivel_educativo', 4, 'Técnico/tecnológico'),
            ('p17_madre_nivel_educativo', 5, 'Profesional'),

            ('p18_expresion_familiar', 1, 'Sí'),
            ('p18_expresion_familiar', 2, 'No'),
            ('p18_expresion_familiar', 3, 'A veces'),

            ('p20_conceptos_ayuda_formacion', 1, 'Motivación y disciplina'),
            ('p20_conceptos_ayuda_formacion', 2, 'Autoconocimiento'),
            ('p20_conceptos_ayuda_formacion', 3, 'Factor económico'),
            ('p20_conceptos_ayuda_formacion', 4, 'A y B'),
            ('p20_conceptos_ayuda_formacion', 5, 'A y C'),

            ('p26_obstaculo_principal', 1, 'A - Recursos Económicos'),
            ('p26_obstaculo_principal', 2, 'B - Poco apoyo familiar'),
            ('p26_obstaculo_principal', 3, 'C - Limitaciones sociales'),
            ('p26_obstaculo_principal', 4, 'D - Dudas sobre habilidades'),
            ('p26_obstaculo_principal', 5, 'E - Falta claridad vocacional'),
            ('p26_obstaculo_principal', 6, 'F - Influencia negativa amistades')
          ) AS m(columna, orden, texto)
    );

    ------------------------------------------------------------------
    -- 1. Encuesta legacy (abierta temporalmente)
    ------------------------------------------------------------------
    INSERT INTO public.encuestas (id, nombre, descripcion, estado, activa)
    VALUES (
        v_encuesta_id,
        'Encuesta Socio-Ocupacional (legacy)',
        'Encuesta original de orientación socio-ocupacional migrada automáticamente desde la tabla encuestas_orientacion.',
        'abierta',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT e.estado INTO v_estado_prev
      FROM public.encuestas AS e WHERE e.id = v_encuesta_id;

    UPDATE public.encuestas SET estado = 'abierta' WHERE id = v_encuesta_id;

    ------------------------------------------------------------------
    -- 2. Preguntas
    ------------------------------------------------------------------
    INSERT INTO public.preguntas (encuesta_id, texto, tipo, orden, tipo_grafica, obligatoria)
    SELECT v_encuesta_id,
           (j->>'texto'),
           (j->>'tipo'),
           (j->>'orden')::int,
           (j->>'tipo_grafica'),
           FALSE
      FROM jsonb_array_elements(v_map_preguntas) AS j
     WHERE NOT EXISTS (
         SELECT 1 FROM public.preguntas p
          WHERE p.encuesta_id = v_encuesta_id
            AND p.orden       = (j->>'orden')::int
     );

    ------------------------------------------------------------------
    -- 3. Opciones Sí/No para 'unica_respuesta'
    ------------------------------------------------------------------
    INSERT INTO public.opciones_pregunta (pregunta_id, texto, orden)
    SELECT p.id, o.texto, o.orden
      FROM public.preguntas p
      CROSS JOIN LATERAL (VALUES ('Sí', 1), ('No', 2)) AS o(texto, orden)
     WHERE p.encuesta_id = v_encuesta_id
       AND p.tipo        = 'unica_respuesta'
       AND NOT EXISTS (
           SELECT 1 FROM public.opciones_pregunta op
            WHERE op.pregunta_id = p.id AND op.orden = o.orden
       );

    ------------------------------------------------------------------
    -- 4. Opciones para 'multiple_respuesta'
    ------------------------------------------------------------------
    INSERT INTO public.opciones_pregunta (pregunta_id, texto, orden)
    SELECT p.id, (jo->>'texto'), (jo->>'orden')::int
      FROM jsonb_array_elements(v_map_opciones)  AS jo
      JOIN jsonb_array_elements(v_map_preguntas) AS jp
        ON (jp->>'columna') = (jo->>'columna')
      JOIN public.preguntas p
        ON p.encuesta_id = v_encuesta_id
       AND p.orden       = (jp->>'orden')::int
     WHERE NOT EXISTS (
           SELECT 1 FROM public.opciones_pregunta op
            WHERE op.pregunta_id = p.id
              AND op.orden       = (jo->>'orden')::int
     );

    ------------------------------------------------------------------
    -- 5. Migrar respuestas
    ------------------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name   = 'encuestas_orientacion'
    ) THEN
        FOR r_resp IN
            SELECT *
              FROM public.encuestas_orientacion eo
             WHERE NOT EXISTS (
                 SELECT 1 FROM public.respuestas_encuesta r
                  WHERE r.legacy_id = eo.id
             )
        LOOP
            INSERT INTO public.respuestas_encuesta (
                encuesta_id, fecha_registro, nombre_estudiante,
                ied, curso, identificacion, edad, legacy_id
            ) VALUES (
                v_encuesta_id,
                COALESCE(r_resp.fecha_registro::timestamptz, r_resp.created_at, NOW()),
                COALESCE(NULLIF(r_resp.nombre, ''),         '(sin nombre)'),
                COALESCE(NULLIF(r_resp.ied, ''),            '(sin IED)'),
                COALESCE(NULLIF(r_resp.curso, ''),          '(sin curso)'),
                COALESCE(NULLIF(r_resp.identificacion, ''), '(sin id)'),
                -- El CHECK exige 1..119. Saneamos valores inválidos
                -- (NULL, 0 o fuera de rango) al rango válido.
                GREATEST(1, LEAST(119, COALESCE(r_resp.edad, 1))),
                r_resp.id
            )
            RETURNING id INTO v_respuesta_id;

            FOR r_col IN
                SELECT (j->>'columna')     AS columna,
                       (j->>'orden')::int  AS orden
                  FROM jsonb_array_elements(v_map_preguntas) AS j
                 ORDER BY (j->>'orden')::int
            LOOP
                -- Acceso al campo de la fila legacy por nombre vía jsonb.
                v_valor := to_jsonb(r_resp) ->> r_col.columna;

                CONTINUE WHEN v_valor IS NULL OR btrim(v_valor) = '';

                SELECT pr.id, pr.tipo INTO v_pregunta_id, v_tipo
                  FROM public.preguntas AS pr
                 WHERE pr.encuesta_id = v_encuesta_id
                   AND pr.orden       = r_col.orden;

                IF v_tipo = 'unica_respuesta' THEN
                    SELECT op.id INTO v_opcion_id
                      FROM public.opciones_pregunta AS op
                     WHERE op.pregunta_id = v_pregunta_id
                       AND op.texto       = v_valor;
                    IF v_opcion_id IS NOT NULL THEN
                        INSERT INTO public.respuestas_detalle
                            (respuesta_encuesta_id, pregunta_id, opcion_pregunta_id)
                        VALUES (v_respuesta_id, v_pregunta_id, v_opcion_id);
                    END IF;

                ELSIF v_tipo = 'multiple_respuesta' THEN
                    v_tokens := string_to_array(v_valor, ',');
                    FOREACH v_token IN ARRAY v_tokens LOOP
                        v_token := btrim(v_token);
                        CONTINUE WHEN v_token = '';
                        SELECT op.id INTO v_opcion_id
                          FROM public.opciones_pregunta AS op
                         WHERE op.pregunta_id = v_pregunta_id
                           AND op.texto       = v_token;
                        IF v_opcion_id IS NOT NULL THEN
                            INSERT INTO public.respuestas_detalle
                                (respuesta_encuesta_id, pregunta_id, opcion_pregunta_id)
                            VALUES (v_respuesta_id, v_pregunta_id, v_opcion_id);
                        END IF;
                    END LOOP;
                END IF;
            END LOOP;
        END LOOP;
    END IF;

    ------------------------------------------------------------------
    -- 6. Cerrar encuesta legacy (respeta estado original si ya existía)
    ------------------------------------------------------------------
    UPDATE public.encuestas
       SET estado       = COALESCE(v_estado_prev, 'cerrada'),
           fecha_cierre = COALESCE(fecha_cierre, NOW())
     WHERE id = v_encuesta_id;
END
$do_migrar_legacy$;
