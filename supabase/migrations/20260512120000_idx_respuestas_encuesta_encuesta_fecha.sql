-- Acelera listados por encuesta ordenados por fecha (PostgREST / listarRespuestasEncuesta).
-- Reduce riesgo de "Cancelling statement due to statement timeout" en tablas grandes.
CREATE INDEX IF NOT EXISTS idx_resp_enc_encuesta_fecha
  ON public.respuestas_encuesta (encuesta_id, fecha_registro DESC NULLS FIRST);
