-- Ejecutar este SQL en el editor SQL de tu proyecto Supabase
-- para crear la tabla y políticas RLS de la encuesta socio-ocupacional.

CREATE TABLE encuestas_orientacion (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Datos Básicos
    fecha_registro DATE,
    nombre TEXT NOT NULL,
    ied TEXT,
    curso TEXT,
    identificacion TEXT,
    edad INTEGER,

    -- Preguntas Sí/No (P1-P5, P9, P12-P13, P15-P16, P19abc, P21-P24, P25 todas, P27-P33)
    p1_continuar_formacion TEXT,
    p2_info_edsuperior_colegio TEXT,
    p3_orientacion_edsuperior_casa TEXT,
    p4_orientacion_postbachillerato TEXT,
    p5_conoce_programas_academicos TEXT,
    p9_importante_continuar_estudios TEXT,
    p12_confianza_capacidades TEXT,
    p13_motivacion_familia TEXT,
    p15_apoyo_familia_carrera TEXT,
    p16_motivado_futuro TEXT,
    p19a_conoce_autoconocimiento TEXT,
    p19b_conoce_educacion_superior TEXT,
    p19c_conoce_mundo_laboral TEXT,
    p21_estudiar_fuera_barranquilla TEXT,
    p22_ejemplo_inspiracion TEXT,
    p23_factor_economico_importante TEXT,
    p24_redes_sociales_influyen TEXT,
    p25_frase1_expectativas_familia TEXT,
    p25_frase2_carreras_no_adecuadas TEXT,
    p25_frase3_profesiones_sin_futuro TEXT,
    p25_frase4_dificil_acceder_carreras TEXT,
    p25_frase5_no_creencia_influye TEXT,
    p27_institucion_identificada TEXT,
    p28_info_becas_programas TEXT,
    p29_abandono_colegio TEXT,
    p30_conoce_opciones_laborales TEXT,
    p31_conoce_tipos_contrato TEXT,
    p32_conoce_entrevista_trabajo TEXT,
    p33_sabe_hoja_vida TEXT,

    -- Preguntas de Opción Múltiple (almacenadas como "Opcion1,Opcion2")
    p6_tipo_carrera TEXT,
    p7_area_mayor_destreza TEXT,
    p8_areas_formacion TEXT,
    p10_despues_bachillerato TEXT,
    p11_herramientas_vocacion TEXT,
    p14_apoyo_padres_orientacion TEXT,
    p17_padre_nivel_educativo TEXT,
    p17_madre_nivel_educativo TEXT,
    p18_expresion_familiar TEXT,
    p20_conceptos_ayuda_formacion TEXT,
    p26_obstaculo_principal TEXT
);

-- Habilitar Row Level Security (RLS) con políticas de acceso público
ALTER TABLE encuestas_orientacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON encuestas_orientacion
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON encuestas_orientacion
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON encuestas_orientacion
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON encuestas_orientacion
    FOR DELETE USING (true);
