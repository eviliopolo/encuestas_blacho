-- =====================================================================
-- Migración 0001: Encuestas dinámicas multi-encuesta
-- Fecha: 2026-04-18
--
-- Añade el modelo relacional para N encuestas con preguntas heterogéneas,
-- captura de respuestas asociadas a estudiante, triggers de integridad y
-- políticas RLS.  Es idempotente: puede ejecutarse varias veces sin error.
--
-- NOTA: La tabla legacy `encuestas_orientacion` NO se toca. La migración de
-- sus datos se hace en un script separado (0002_migracion_legacy.sql).
-- =====================================================================

-- Extensión necesaria para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- TABLA: encuestas
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.encuestas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT NOT NULL,
    descripcion     TEXT,
    estado          TEXT NOT NULL DEFAULT 'abierta'
                    CHECK (estado IN ('abierta', 'cerrada')),
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre    TIMESTAMPTZ,
    -- creador_id es NULLABLE porque el proyecto aún no tiene auth
    -- habilitada.  Cuando se active auth, se podrá migrar a NOT NULL.
    creador_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fecha_cierre CHECK (fecha_cierre IS NULL OR fecha_cierre >= fecha_creacion)
);

CREATE INDEX IF NOT EXISTS idx_encuestas_estado  ON public.encuestas(estado) WHERE activa = TRUE;
CREATE INDEX IF NOT EXISTS idx_encuestas_creador ON public.encuestas(creador_id);

-- =====================================================================
-- TABLA: preguntas
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.preguntas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuesta_id     UUID NOT NULL REFERENCES public.encuestas(id) ON DELETE CASCADE,
    texto           TEXT NOT NULL,
    tipo            TEXT NOT NULL
                    CHECK (tipo IN ('unica_respuesta', 'multiple_respuesta', 'respuesta_abierta')),
    orden           INT NOT NULL,
    obligatoria     BOOLEAN NOT NULL DEFAULT TRUE,
    tipo_grafica    TEXT NOT NULL DEFAULT 'barras'
                    CHECK (tipo_grafica IN ('barras', 'circular', 'columnas', 'lineas', 'ninguna')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (encuesta_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_preguntas_encuesta ON public.preguntas(encuesta_id);

-- =====================================================================
-- TABLA: opciones_pregunta
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.opciones_pregunta (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta_id     UUID NOT NULL REFERENCES public.preguntas(id) ON DELETE CASCADE,
    texto           TEXT NOT NULL,
    orden           INT NOT NULL,
    valor           INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (pregunta_id, orden)
);

CREATE INDEX IF NOT EXISTS idx_opciones_pregunta ON public.opciones_pregunta(pregunta_id);

-- =====================================================================
-- TABLA: respuestas_encuesta (cabecera por estudiante)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.respuestas_encuesta (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encuesta_id         UUID NOT NULL REFERENCES public.encuestas(id) ON DELETE RESTRICT,
    fecha_registro      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    nombre_estudiante   TEXT NOT NULL,
    ied                 TEXT NOT NULL,
    curso               TEXT NOT NULL,
    identificacion      TEXT NOT NULL,
    edad                INT NOT NULL CHECK (edad > 0 AND edad < 120),
    -- Referencia opcional al registro legacy para trazabilidad durante la migración
    legacy_id           BIGINT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resp_enc_encuesta       ON public.respuestas_encuesta(encuesta_id);
CREATE INDEX IF NOT EXISTS idx_resp_enc_identificacion ON public.respuestas_encuesta(identificacion);
CREATE INDEX IF NOT EXISTS idx_resp_enc_ied_curso      ON public.respuestas_encuesta(ied, curso);
CREATE INDEX IF NOT EXISTS idx_resp_enc_fecha          ON public.respuestas_encuesta(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_resp_enc_legacy         ON public.respuestas_encuesta(legacy_id) WHERE legacy_id IS NOT NULL;

-- =====================================================================
-- TABLA: respuestas_detalle
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.respuestas_detalle (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    respuesta_encuesta_id   UUID NOT NULL REFERENCES public.respuestas_encuesta(id) ON DELETE CASCADE,
    pregunta_id             UUID NOT NULL REFERENCES public.preguntas(id) ON DELETE RESTRICT,
    opcion_pregunta_id      UUID REFERENCES public.opciones_pregunta(id) ON DELETE RESTRICT,
    texto_respuesta         TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_respuesta_exclusiva CHECK (
        (opcion_pregunta_id IS NOT NULL AND texto_respuesta IS NULL)
        OR
        (opcion_pregunta_id IS NULL AND texto_respuesta IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_resp_det_resp_enc ON public.respuestas_detalle(respuesta_encuesta_id);
CREATE INDEX IF NOT EXISTS idx_resp_det_pregunta ON public.respuestas_detalle(pregunta_id);
CREATE INDEX IF NOT EXISTS idx_resp_det_opcion   ON public.respuestas_detalle(opcion_pregunta_id);

-- =====================================================================
-- TRIGGERS: updated_at
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $FA$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$FA$;

DROP TRIGGER IF EXISTS trg_encuestas_updated_at ON public.encuestas;
CREATE TRIGGER trg_encuestas_updated_at
    BEFORE UPDATE ON public.encuestas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_preguntas_updated_at ON public.preguntas;
CREATE TRIGGER trg_preguntas_updated_at
    BEFORE UPDATE ON public.preguntas
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- FUNCIÓN: cerrar encuestas vencidas
-- Invocar desde pg_cron:  SELECT cron.schedule('cerrar-encuestas', '0 * * * *', 'SELECT public.cerrar_encuestas_vencidas();');
-- O desde una Edge Function programada.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.cerrar_encuestas_vencidas()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $FB$
DECLARE
    n INT;
BEGIN
    UPDATE public.encuestas
    SET estado = 'cerrada'
    WHERE estado = 'abierta'
      AND fecha_cierre IS NOT NULL
      AND fecha_cierre <= NOW();
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$FB$;

-- =====================================================================
-- VALIDACIÓN: no permitir respuestas a encuestas cerradas
-- Cierra también en caliente si la fecha_cierre ya pasó.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.validar_encuesta_abierta()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $FC$
DECLARE
    v_estado        TEXT;
    v_fecha_cierre  TIMESTAMPTZ;
    v_activa        BOOLEAN;
BEGIN
    SELECT e.estado, e.fecha_cierre, e.activa
      INTO v_estado, v_fecha_cierre, v_activa
      FROM public.encuestas AS e
     WHERE e.id = NEW.encuesta_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La encuesta % no existe', NEW.encuesta_id;
    END IF;

    IF v_activa IS NOT TRUE THEN
        RAISE EXCEPTION 'La encuesta % está inactiva', NEW.encuesta_id;
    END IF;

    IF v_estado <> 'abierta' THEN
        RAISE EXCEPTION 'La encuesta % está cerrada, no admite nuevas respuestas', NEW.encuesta_id;
    END IF;

    IF v_fecha_cierre IS NOT NULL AND v_fecha_cierre <= NOW() THEN
        UPDATE public.encuestas SET estado = 'cerrada' WHERE id = NEW.encuesta_id;
        RAISE EXCEPTION 'La encuesta % cerró automáticamente el %', NEW.encuesta_id, v_fecha_cierre;
    END IF;

    RETURN NEW;
END;
$FC$;

DROP TRIGGER IF EXISTS trg_validar_encuesta_abierta ON public.respuestas_encuesta;
CREATE TRIGGER trg_validar_encuesta_abierta
    BEFORE INSERT ON public.respuestas_encuesta
    FOR EACH ROW EXECUTE FUNCTION public.validar_encuesta_abierta();

-- =====================================================================
-- VALIDACIÓN: la opcion_pregunta_id (si se envía) debe pertenecer a la
-- misma pregunta del detalle, y el tipo de respuesta debe ser compatible
-- con el tipo de la pregunta.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.validar_respuesta_detalle()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $FD$
DECLARE
    v_tipo_pregunta     TEXT;
    v_pregunta_opcion   UUID;
BEGIN
    SELECT p.tipo INTO v_tipo_pregunta
      FROM public.preguntas AS p WHERE p.id = NEW.pregunta_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La pregunta % no existe', NEW.pregunta_id;
    END IF;

    IF NEW.opcion_pregunta_id IS NOT NULL THEN
        SELECT op.pregunta_id INTO v_pregunta_opcion
          FROM public.opciones_pregunta AS op WHERE op.id = NEW.opcion_pregunta_id;
        IF v_pregunta_opcion IS DISTINCT FROM NEW.pregunta_id THEN
            RAISE EXCEPTION 'La opción % no pertenece a la pregunta %',
                NEW.opcion_pregunta_id, NEW.pregunta_id;
        END IF;
        IF v_tipo_pregunta NOT IN ('unica_respuesta', 'multiple_respuesta') THEN
            RAISE EXCEPTION 'La pregunta % (tipo %) no admite selección de opciones',
                NEW.pregunta_id, v_tipo_pregunta;
        END IF;
    ELSE
        IF v_tipo_pregunta <> 'respuesta_abierta' THEN
            RAISE EXCEPTION 'La pregunta % (tipo %) requiere seleccionar una opción',
                NEW.pregunta_id, v_tipo_pregunta;
        END IF;
    END IF;

    RETURN NEW;
END;
$FD$;

DROP TRIGGER IF EXISTS trg_validar_respuesta_detalle ON public.respuestas_detalle;
CREATE TRIGGER trg_validar_respuesta_detalle
    BEFORE INSERT ON public.respuestas_detalle
    FOR EACH ROW EXECUTE FUNCTION public.validar_respuesta_detalle();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
ALTER TABLE public.encuestas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preguntas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opciones_pregunta   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_encuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_detalle  ENABLE ROW LEVEL SECURITY;

-- Política temporal: acceso abierto (el proyecto aún no tiene auth).
-- Cuando se habilite auth, reemplazar por las políticas comentadas más abajo.
DO $POL$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY['encuestas','preguntas','opciones_pregunta','respuestas_encuesta','respuestas_detalle'];
    op TEXT;
    ops TEXT[] := ARRAY['select','insert','update','delete'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        FOREACH op IN ARRAY ops LOOP
            EXECUTE format(
                'DROP POLICY IF EXISTS %I ON public.%I',
                t || '_' || op || '_open',
                t
            );
        END LOOP;
    END LOOP;
END
$POL$;

CREATE POLICY "encuestas_select_open"
    ON public.encuestas FOR SELECT USING (TRUE);
CREATE POLICY "encuestas_insert_open"
    ON public.encuestas FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "encuestas_update_open"
    ON public.encuestas FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "encuestas_delete_open"
    ON public.encuestas FOR DELETE USING (TRUE);

CREATE POLICY "preguntas_select_open"
    ON public.preguntas FOR SELECT USING (TRUE);
CREATE POLICY "preguntas_insert_open"
    ON public.preguntas FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "preguntas_update_open"
    ON public.preguntas FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "preguntas_delete_open"
    ON public.preguntas FOR DELETE USING (TRUE);

CREATE POLICY "opciones_pregunta_select_open"
    ON public.opciones_pregunta FOR SELECT USING (TRUE);
CREATE POLICY "opciones_pregunta_insert_open"
    ON public.opciones_pregunta FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "opciones_pregunta_update_open"
    ON public.opciones_pregunta FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "opciones_pregunta_delete_open"
    ON public.opciones_pregunta FOR DELETE USING (TRUE);

CREATE POLICY "respuestas_encuesta_select_open"
    ON public.respuestas_encuesta FOR SELECT USING (TRUE);
CREATE POLICY "respuestas_encuesta_insert_open"
    ON public.respuestas_encuesta FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "respuestas_encuesta_update_open"
    ON public.respuestas_encuesta FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "respuestas_encuesta_delete_open"
    ON public.respuestas_encuesta FOR DELETE USING (TRUE);

CREATE POLICY "respuestas_detalle_select_open"
    ON public.respuestas_detalle FOR SELECT USING (TRUE);
CREATE POLICY "respuestas_detalle_insert_open"
    ON public.respuestas_detalle FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "respuestas_detalle_update_open"
    ON public.respuestas_detalle FOR UPDATE USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "respuestas_detalle_delete_open"
    ON public.respuestas_detalle FOR DELETE USING (TRUE);

-- =====================================================================
-- POLÍTICAS SEGURAS (comentadas): aplicar cuando el proyecto habilite
-- Supabase Auth.  Se ofrecen como plantilla.
--
-- Lectura pública sólo de encuestas abiertas:
--   CREATE POLICY "encuestas_lectura_publica"
--       ON public.encuestas FOR SELECT
--       USING (estado = 'abierta' AND activa = TRUE);
--
-- Admin (creador) gestiona sus encuestas:
--   CREATE POLICY "encuestas_admin_all"
--       ON public.encuestas FOR ALL
--       USING (auth.uid() = creador_id)
--       WITH CHECK (auth.uid() = creador_id);
--
-- Inserción pública de respuestas en encuestas abiertas (delegada al
-- trigger `validar_encuesta_abierta`):
--   CREATE POLICY "respuestas_encuesta_publica_insert"
--       ON public.respuestas_encuesta FOR INSERT
--       WITH CHECK (TRUE);
--
-- Lectura de respuestas sólo para admins:
--   CREATE POLICY "respuestas_encuesta_admin_select"
--       ON public.respuestas_encuesta FOR SELECT
--       USING (EXISTS (
--           SELECT 1 FROM public.encuestas e
--            WHERE e.id = encuesta_id AND e.creador_id = auth.uid()
--       ));
-- =====================================================================

-- =====================================================================
-- VISTAS de apoyo para estadísticas
-- =====================================================================
CREATE OR REPLACE VIEW public.v_resumen_respuestas_encuesta AS
SELECT
    e.id                AS encuesta_id,
    e.nombre            AS encuesta_nombre,
    e.estado            AS estado,
    COUNT(r.id)         AS total_respuestas,
    MIN(r.fecha_registro) AS primera_respuesta,
    MAX(r.fecha_registro) AS ultima_respuesta
FROM public.encuestas e
LEFT JOIN public.respuestas_encuesta r ON r.encuesta_id = e.id
GROUP BY e.id, e.nombre, e.estado;

COMMENT ON VIEW public.v_resumen_respuestas_encuesta IS
    'Resumen de métricas básicas por encuesta para listados y dashboard';
