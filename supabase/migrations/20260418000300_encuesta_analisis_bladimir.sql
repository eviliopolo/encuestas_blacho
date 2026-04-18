-- =====================================================================
-- Migración 0003: Encuesta "Análisis Nro 2 - Bladimir"
--
-- Crea una nueva encuesta con todas las preguntas de única respuesta,
-- cada una con opciones Sí/No, gráfica de barras y obligatorias.
--
-- UUID fijo -> 22222222-2222-2222-2222-222222222222 (idempotente).
-- Ejecutable varias veces sin duplicar datos.
-- =====================================================================

DO $ENC$
DECLARE
    v_encuesta_id UUID := '22222222-2222-2222-2222-222222222222';
    v_preguntas   JSONB;
BEGIN
    ------------------------------------------------------------------
    -- 1. Encuesta
    ------------------------------------------------------------------
    INSERT INTO public.encuestas (id, nombre, descripcion, estado, activa)
    VALUES (
        v_encuesta_id,
        'Encuesta de Análisis Nro 2 - Bladimir',
        'Encuesta de Análisis Nro 2 - Bladimir',
        'abierta',
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;

    ------------------------------------------------------------------
    -- 2. Catálogo de preguntas (orden + texto)
    ------------------------------------------------------------------
    v_preguntas := (
        SELECT jsonb_agg(jsonb_build_object('orden', p.orden, 'texto', p.texto))
          FROM (VALUES
            (1,  '¿Aceptarías trabajar escribiendo artículos en la sección económica de un diario?'),
            (2,  '¿Se ofrecería para organizar la despedida de soltero/a de uno/a de sus amigos/amigas?'),
            (3,  '¿Le gustaría dirigir un proyecto de urbanización en sociedad?'),
            (4,  '¿A una frustración siempre opone un pensamiento positivo?'),
            (5,  '¿Se dedicaría a socorrer personas accidentadas o atacadas por asaltantes?'),
            (6,  '¿Cuando era niño/a, le interesaba saber cómo estaban construidos los juguetes?'),
            (7,  '¿Le interesan más los métodos de la Naturaleza que los secretos de la tecnología?'),
            (8,  '¿Escucha atentamente los problemas planteados por sus amigos/as?'),
            (9,  '¿Se ofrecería para explicar algo a alguien?'),
            (10, '¿Es exigente y criterioso/a en lo que come?'),
            (11, '¿Se anima a cocinar platos o composiciones?'),
            (12, '¿Puede establecer la diferencia conceptual entre microeconomía y macroeconomía?'),
            (13, '¿Usar un uniforme lo/a haría sentirse distinto/a e importante?'),
            (14, '¿Participaría, como profesional, en un espectáculo de acrobacia aérea?'),
            (15, '¿Organiza su dinero de manera que siempre alcance hasta volver a cobrar?'),
            (16, '¿Convence fácilmente a otras personas sobre la validez de sus argumentos?'),
            (17, '¿Se encuentra informado/a sobre los nuevos descubrimientos sobre la teoría del Big-Bang?'),
            (18, '¿Ante una situación de emergencia, retira explosivos?'),
            (19, '¿Cuando tiene que resolver un problema matemático, es perseverante hasta encontrar la solución?'),
            (20, '¿Si fuera convocado/a para planificar, organizar y/o dirigir un campo de deportes, aceptaría?'),
            (21, '¿Es Ud. el/la que pone un toque de alegría en las fiestas familiares?'),
            (22, '¿Cree que los detalles son tan importantes como el todo?'),
            (23, '¿Se sentiría a gusto trabajando en un laboratorio?'),
            (24, '¿Le gustaría participar en el mantenimiento del orden ante grandes conflictos sociales y catástrofes?'),
            (25, '¿Pasaría varias horas leyendo un libro de su interés?'),
            (26, '¿Planifica cuidadosamente sus trabajos antes de iniciarlos?'),
            (27, '¿Mantiene una relación cordial permanente con sus compañeros?'),
            (28, '¿Disfruta modelando en arcilla?'),
            (29, '¿Ayuda habitualmente a los no videntes a cruzar la calle?'),
            (30, '¿Considera importante que, desde la escuela primaria, se fomente la actitud crítica y la participación?'),
            (31, '¿Acepta que las mujeres formen parte de las Fuerzas Armadas, bajo las mismas normas que los hombres?'),
            (32, '¿Le gustaría crear nuevas técnicas para descubrir las patologías de algunas enfermedades, usando un microscopio?'),
            (33, '¿Participaría en una campaña de prevención de la enfermedad de Chagas?'),
            (34, '¿Le interesan los temas relacionados con el pasado y con la evolución del hombre?'),
            (35, '¿Se incluiría en un proyecto de investigación de los movimientos sísmicos y sus consecuencias?'),
            (36, '¿Dedica algunas horas de la semana a la realización de actividad física?'),
            (37, '¿Le interesan las actividades de mucha acción y de reacción rápida en situaciones imprevistas de peligro?'),
            (38, '¿Se ofrecería para colaborar como voluntario/a en los gabinetes específicos de la NASA?'),
            (39, '¿Le gusta más el trabajo manual que el intelectual?'),
            (40, '¿Estaría dispuesto/a a renunciar a un momento placentero para prestar su servicio como profesional?'),
            (41, '¿Participaría en un trabajo de investigación sobre la violencia social?'),
            (42, '¿Le gustaría trabajar en un albergue de animales rescatados?'),
            (43, '¿Arriesgaría su vida para salvar la de un desconocido?'),
            (44, '¿Le agradaría hacer un curso de primeros auxilios?'),
            (45, '¿Toleraría empezar tantas veces como fuera necesario hasta obtener un logro deseado?'),
            (46, '¿Distribuye los horarios laborales adecuadamente para poder cumplir con lo planeado?'),
            (47, '¿Haría un curso para aprender a fabricar las piezas de máquinas o aparatos?'),
            (48, '¿Elegiría una profesión que lo/a obligara a estar alejado de la familia por algún tiempo?'),
            (49, '¿Se radicaría en una zona agrícola-ganadera?'),
            (50, '¿Acepta ser tratado/a como iguales, en muchas oportunidades aportar ideas?'),
            (51, '¿Le resulta fácil coordinar un grupo de trabajo?'),
            (52, '¿Te resultan interesantes las Ciencias Biológicas?'),
            (53, '¿Si una empresa importante solicita un profesional para Gerente de Comercialización, le gustaría desempeñar esa tarea?'),
            (54, '¿Ha leído acerca de un proyecto nacional de desarrollo de la principal fuente de recursos de su provincia?'),
            (55, '¿Siente interés por descubrir cuáles son las causas que determinaron ciertos fenómenos, aunque no le afecten?'),
            (56, '¿Descubrió algún filósofo o escritor que haya expresado las mismas ideas que Ud. con anticipación?'),
            (57, '¿Desearía que le regalen algún instrumento musical?'),
            (58, '¿Aceptaría colaborar con el mantenimiento de las normas sociales en lugares públicos?'),
            (59, '¿Cree que sus ideas son importantes y hace lo posible para ponerlas en práctica?'),
            (60, '¿Cuando, en la casa, se descompone un artefacto, Ud. se dispone prontamente a repararlo?'),
            (61, '¿Formaría parte de un equipo de trabajo orientado a la preservación de la flora y de la fauna?'),
            (62, '¿Tiene por costumbre leer noticias relacionadas con los últimos avances científicos y tecnológicos en el mundo?'),
            (63, '¿Le parece importante y necesario preservar las raíces culturales de nuestro país?'),
            (64, '¿Le gustaría realizar una investigación que contribuyera a hacer más justa la distribución de la riqueza?'),
            (65, '¿Le gustaría incorporarse al mantenimiento y conservación de un barco como, por ejemplo, pintura y composturas?'),
            (66, '¿Cree que el país debe poseer la más alta tecnología armamentista a cualquier precio?'),
            (67, '¿La libertad y la justicia son valores fundamentales en la vida?'),
            (68, '¿Aceptaría hacer prácticas rentadas en una industria de productos alimenticios en el sector de control de calidad?'),
            (69, '¿Considera que la salud pública debe ser prioritaria, gratuita y eficiente para todos?'),
            (70, '¿Le interesaría investigar sobre una nueva vacuna?'),
            (71, '¿Le gusta ocupar el rol de coordinador/a en un grupo de trabajo?'),
            (72, '¿Dirigiría un grupo de teatro?'),
            (73, '¿Enviaría su Currículum a una empresa automotriz que solicita un gerente para el área de producción?'),
            (74, '¿Está de acuerdo con la lucha inclaudicable de los grupos ambientalistas?'),
            (75, '¿Lucharía por una causa justa hasta las últimas consecuencias?'),
            (76, '¿Le gustaría investigar científicamente sobre cultivos agrícolas?'),
            (77, '¿Haría un nuevo diseño de una prenda pasada de moda, antes de una reunión imprevista?'),
            (78, '¿Le interesa la observación astronómica para conocerla en acción?'),
            (79, '¿Le gustaría dirigir el área de importación/exportación de una empresa?'),
            (80, '¿Se siente inhibido/a al entrar en un lugar desconocido con gente que no conoce?'),
            (81, '¿Le gustaría trabajar con niños?'),
            (82, '¿Aceptaría dar clases de apoyo en una campaña de prevención del SIDA?'),
            (83, '¿Organizaría un grupo de teatro?'),
            (84, '¿Sabe el significado de las siglas ADN o ARN?'),
            (85, '¿Elegiría una carrera universitaria cuyo instrumento de trabajo fuera la utilización de un idioma extranjero?'),
            (86, '¿Trabajar con objetos te resulta más gratificante que trabajar con personas?'),
            (87, '¿Le gustaría ser el asesor contable de una empresa?'),
            (88, '¿Ante un llamado solidario, se ofrecería para cuidar a un enfermo?'),
            (89, '¿Se siente atraído/a por la investigación de nuevos usos de la energía solar, por ejemplo, la capa de ozono?'),
            (90, '¿El trabajo individual le resulta más rápido y efectivo que el trabajo grupal?'),
            (91, '¿Dedicaría parte de su tiempo a ayudar a los habitantes de zonas carenciadas?'),
            (92, '¿Cuando decora un ambiente, tiene en cuenta la combinación de los colores, el estilo preferido, etc.?'),
            (93, '¿Le gustaría trabajar como profesional dirigiendo la construcción de una empresa hidroeléctrica?'),
            (94, '¿Sabe el significado de la sigla PBI?')
          ) AS p(orden, texto)
    );

    ------------------------------------------------------------------
    -- 3. Insertar preguntas (única respuesta, gráfica barras, obligatorias)
    ------------------------------------------------------------------
    INSERT INTO public.preguntas (encuesta_id, texto, tipo, orden, tipo_grafica, obligatoria)
    SELECT v_encuesta_id,
           (j->>'texto'),
           'unica_respuesta',
           (j->>'orden')::int,
           'barras',
           TRUE
      FROM jsonb_array_elements(v_preguntas) AS j
     WHERE NOT EXISTS (
         SELECT 1 FROM public.preguntas pr
          WHERE pr.encuesta_id = v_encuesta_id
            AND pr.orden       = (j->>'orden')::int
     );

    ------------------------------------------------------------------
    -- 4. Insertar opciones Sí / No para todas las preguntas
    ------------------------------------------------------------------
    INSERT INTO public.opciones_pregunta (pregunta_id, texto, orden)
    SELECT p.id, o.texto, o.orden
      FROM public.preguntas p
      CROSS JOIN (VALUES ('Sí', 1), ('No', 2)) AS o(texto, orden)
     WHERE p.encuesta_id = v_encuesta_id
       AND NOT EXISTS (
           SELECT 1 FROM public.opciones_pregunta op
            WHERE op.pregunta_id = p.id AND op.orden = o.orden
       );
END
$ENC$;
