-- Tipo de test asociado a la encuesta (orientación vocacional, etc.)
ALTER TABLE public.encuestas
  ADD COLUMN IF NOT EXISTS tipo_test TEXT;

UPDATE public.encuestas
SET tipo_test = 'No aplica'
WHERE tipo_test IS NULL;

ALTER TABLE public.encuestas
  ALTER COLUMN tipo_test SET NOT NULL,
  ALTER COLUMN tipo_test SET DEFAULT 'No aplica';

ALTER TABLE public.encuestas DROP CONSTRAINT IF EXISTS encuestas_tipo_test_check;

ALTER TABLE public.encuestas
  ADD CONSTRAINT encuestas_tipo_test_check CHECK (
    tipo_test IN (
      'No aplica',
      'Test de orientación vocacional chaside'
    )
  );
