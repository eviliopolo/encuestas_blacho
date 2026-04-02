import { useState, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartCard } from '@/components/ChartCard'
import {
  aplicarFiltros,
  calcularKPIs,
  contarPorCampo,
  distribucionPregunta,
  nivelEducativoPadres,
  serieSiNoPorItems,
} from '@/utils/chartDataProcessing'
import { CHECKBOX_OPTIONS } from '@/lib/constants'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { X } from 'lucide-react'

const COLORS = [
  '#366092',
  '#0066CC',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
]

const PIE_COLORS_BY_NAME = {
  'Sí': '#10B981',
  'No': '#EF4444',
  'Sin respuesta': '#94A3B8',
}

const defaultFiltros = { ied: '', curso: '' }

/** Orden de presentación: igual al cuestionario (P1 → P33), luego IED. */
const ORDEN_GRAFICOS = [
  { kind: 'sino', key: 'p1_continuar_formacion', title: 'P1 - Continuar formación después del bachillerato' },
  { kind: 'sino', key: 'p2_info_edsuperior_colegio', title: 'P2 - Información sobre educación superior en el colegio' },
  { kind: 'sino', key: 'p3_orientacion_edsuperior_casa', title: 'P3 - Orientación sobre educación superior en casa' },
  { kind: 'sino', key: 'p4_orientacion_postbachillerato', title: 'P4 - Orientación post-bachillerato' },
  { kind: 'sino', key: 'p5_conoce_programas_academicos', title: 'P5 - Conocimiento de programas académicos' },
  { kind: 'multiple', key: 'p6_tipo_carrera', title: 'P6 - Tipo de carrera preferida' },
  { kind: 'multiple', key: 'p7_area_mayor_destreza', title: 'P7 - Área de mayor destreza' },
  { kind: 'multiple', key: 'p8_areas_formacion', title: 'P8 - Áreas de formación de interés' },
  { kind: 'sino', key: 'p9_importante_continuar_estudios', title: 'P9 - Importancia de continuar estudios' },
  { kind: 'multiple', key: 'p10_despues_bachillerato', title: 'P10 - Planes después del bachillerato' },
  { kind: 'multiple', key: 'p11_herramientas_vocacion', title: 'P11 - Herramientas vocacionales brindadas' },
  { kind: 'sino', key: 'p12_confianza_capacidades', title: 'P12 - Confianza en capacidades' },
  { kind: 'sino', key: 'p13_motivacion_familia', title: 'P13 - Motivación familiar' },
  { kind: 'multiple', key: 'p14_apoyo_padres_orientacion', title: 'P14 - Apoyo familiar en orientación' },
  { kind: 'sino', key: 'p15_apoyo_familia_carrera', title: 'P15 - Apoyo familiar a la carrera' },
  { kind: 'sino', key: 'p16_motivado_futuro', title: 'P16 - Motivación por el futuro' },
  { kind: 'p17', key: 'p17', title: 'P17 - Nivel educativo de padres' },
  { kind: 'multiple', key: 'p18_expresion_familiar', title: 'P18 - Expresión familiar' },
  { kind: 'sino', key: 'p19a_conoce_autoconocimiento', title: 'P19a - Conoce autoconocimiento' },
  { kind: 'sino', key: 'p19b_conoce_educacion_superior', title: 'P19b - Conoce educación superior' },
  { kind: 'sino', key: 'p19c_conoce_mundo_laboral', title: 'P19c - Conoce mundo laboral' },
  { kind: 'multiple', key: 'p20_conceptos_ayuda_formacion', title: 'P20 - Conceptos de ayuda para formación' },
  { kind: 'sino', key: 'p21_estudiar_fuera_barranquilla', title: 'P21 - Estudiar fuera de Barranquilla' },
  { kind: 'sino', key: 'p22_ejemplo_inspiracion', title: 'P22 - Tiene ejemplo o inspiración' },
  { kind: 'sino', key: 'p23_factor_economico_importante', title: 'P23 - Factor económico importante' },
  { kind: 'sino', key: 'p24_redes_sociales_influyen', title: 'P24 - Redes sociales influyen' },
  { kind: 'p25', key: 'p25', title: 'P25 - Frases (Sí / No / Sin respuesta)' },
  { kind: 'multiple', key: 'p26_obstaculo_principal', title: 'P26 - Obstáculo principal' },
  { kind: 'sino', key: 'p27_institucion_identificada', title: 'P27 - Institución identificada' },
  { kind: 'sino', key: 'p28_info_becas_programas', title: 'P28 - Información sobre becas y programas' },
  { kind: 'sino', key: 'p29_abandono_colegio', title: 'P29 - Ha pensado abandonar el colegio' },
  { kind: 'sino', key: 'p30_conoce_opciones_laborales', title: 'P30 - Conoce opciones laborales' },
  { kind: 'sino', key: 'p31_conoce_tipos_contrato', title: 'P31 - Conoce tipos de contrato' },
  { kind: 'sino', key: 'p32_conoce_entrevista_trabajo', title: 'P32 - Conoce entrevista de trabajo' },
  { kind: 'sino', key: 'p33_sabe_hoja_vida', title: 'P33 - Sabe elaborar hoja de vida' },
  { kind: 'ied', key: 'ied', title: 'Distribución por IED' },
]

const CANVAS_MAX_EDGE = 16000
const PDF_MARGIN_MM = 10
const PDF_GAP_MM = 3
/** Una sola captura puede tardar; varias decenas de html2canvas seguidas cuelgan o parecen infinitas. */
const HTML2CANVAS_TIMEOUT_MS = 120000

/** Quita recortes del modal en el documento clonado para que html2canvas pinte todo el scroll. */
function expandirAncestrosParaCaptura(node) {
  let el = node?.parentElement
  while (el) {
    el.style.overflow = 'visible'
    el.style.maxHeight = 'none'
    el.style.height = 'auto'
    el = el.parentElement
  }
}

function rectLayoutEnContenedor(contenedor, bloque) {
  const cr = contenedor.getBoundingClientRect()
  const br = bloque.getBoundingClientRect()
  return {
    top: br.top - cr.top + contenedor.scrollTop,
    left: br.left - cr.left + contenedor.scrollLeft,
    width: br.width,
    height: br.height,
  }
}

function recortarDeCanvas(fuente, sx, sy, sw, sh) {
  const w = Math.max(1, Math.round(sw))
  const h = Math.max(1, Math.round(sh))
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  ctx.drawImage(fuente, Math.round(sx), Math.round(sy), w, h, 0, 0, w, h)
  return out
}

function conTimeout(promise, ms, mensaje) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(mensaje)), ms)
    }),
  ])
}

/**
 * Vuelca recortes al PDF: apila en la misma página si caben; salto de página solo entre bloques.
 */
function volcarRecortesAlPdf(pdf, canvases) {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const innerW = pageW - 2 * PDF_MARGIN_MM
  const innerH = pageH - 2 * PDF_MARGIN_MM

  let yCursor = PDF_MARGIN_MM
  let primeraEnPagina = true

  for (const c of canvases) {
    if (c.width < 1 || c.height < 1) continue
    const imgData = c.toDataURL('image/png')

    let drawW = innerW
    let drawH = (c.height * drawW) / c.width
    if (drawH > innerH) {
      const s = innerH / drawH
      drawH = innerH
      drawW = drawW * s
    }

    const necesitaNuevaPagina =
      !primeraEnPagina && yCursor + drawH > PDF_MARGIN_MM + innerH

    if (necesitaNuevaPagina) {
      pdf.addPage()
      yCursor = PDF_MARGIN_MM
      primeraEnPagina = true
    }

    const x = PDF_MARGIN_MM + (innerW - drawW) / 2
    pdf.addImage(imgData, 'PNG', x, yCursor, drawW, drawH)
    yCursor += drawH + PDF_GAP_MM
    primeraEnPagina = false
  }
}

export function Dashboard({ encuestas = [], open, onOpenChange }) {
  const [filtros, setFiltros] = useState(defaultFiltros)
  const [exportandoPdf, setExportandoPdf] = useState(false)
  const dashboardRef = useRef(null)

  const encuestasFiltradas = useMemo(
    () => aplicarFiltros(encuestas, filtros),
    [encuestas, filtros]
  )

  const iedOpciones = useMemo(() => {
    const set = new Set()
    encuestas.forEach((r) => {
      if (r.ied != null && r.ied !== '') set.add(String(r.ied).trim())
    })
    return Array.from(set).sort()
  }, [encuestas])

  const cursoOpciones = useMemo(() => {
    const set = new Set()
    encuestas.forEach((r) => {
      if (r.curso != null && r.curso !== '') set.add(String(r.curso).trim())
    })
    return Array.from(set).sort()
  }, [encuestas])

  const kpis = useMemo(() => calcularKPIs(encuestasFiltradas), [encuestasFiltradas])

  const dataPorIED = useMemo(
    () => contarPorCampo(encuestasFiltradas, 'ied'),
    [encuestasFiltradas]
  )
  const dataP17 = useMemo(
    () => nivelEducativoPadres(encuestasFiltradas),
    [encuestasFiltradas]
  )
  const dataP25 = useMemo(
    () => serieSiNoPorItems(encuestasFiltradas, [
      { key: 'p25_frase1_expectativas_familia', label: 'Frase 1' },
      { key: 'p25_frase2_carreras_no_adecuadas', label: 'Frase 2' },
      { key: 'p25_frase3_profesiones_sin_futuro', label: 'Frase 3' },
      { key: 'p25_frase4_dificil_acceder_carreras', label: 'Frase 4' },
      { key: 'p25_frase5_no_creencia_influye', label: 'Frase 5' },
    ]),
    [encuestasFiltradas]
  )

  const limpiarFiltros = () => setFiltros(defaultFiltros)

  const exportarPDF = async () => {
    const el = dashboardRef.current
    if (!el) return
    setExportandoPdf(true)
    try {
      const scrollHost = el.closest('[data-radix-scroll-area-viewport]') || el.parentElement
      const prevScrollTop = scrollHost?.scrollTop ?? 0
      if (scrollHost) scrollHost.scrollTop = 0

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const bloques = [...el.querySelectorAll('.dashboard-pdf-block')]
      const rectsDom = bloques.map((b) => rectLayoutEnContenedor(el, b))

      const sh = el.scrollHeight
      const sw = el.scrollWidth
      let scale = 2
      while (scale > 0.5 && (sh * scale > CANVAS_MAX_EDGE || sw * scale > CANVAS_MAX_EDGE)) {
        scale -= 0.25
      }

      const canvasCompleto = await conTimeout(
        html2canvas(el, {
          scale,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc) => {
            const cloned = clonedDoc.getElementById('dashboard-content')
            if (cloned) expandirAncestrosParaCaptura(cloned)
          },
        }),
        HTML2CANVAS_TIMEOUT_MS,
        'La captura del dashboard tardó demasiado. Prueba cerrar otros programas o reducir filtros.'
      )

      const sxScale = canvasCompleto.width / Math.max(1, sw)
      const syScale = canvasCompleto.height / Math.max(1, sh)

      const recortes = rectsDom.map((r) => {
        let sx = r.left * sxScale
        let sy = r.top * syScale
        let swPx = r.width * sxScale
        let shPx = r.height * syScale
        sx = Math.max(0, Math.min(sx, canvasCompleto.width - 1))
        sy = Math.max(0, Math.min(sy, canvasCompleto.height - 1))
        swPx = Math.min(swPx, canvasCompleto.width - sx)
        shPx = Math.min(shPx, canvasCompleto.height - sy)
        return recortarDeCanvas(canvasCompleto, sx, sy, swPx, shPx)
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      volcarRecortesAlPdf(pdf, recortes)
      pdf.save(`dashboard_${new Date().toISOString().split('T')[0]}.pdf`)

      if (scrollHost) scrollHost.scrollTop = prevScrollTop
    } catch (err) {
      console.error('Error al exportar PDF:', err)
      window.alert(
        err instanceof Error ? err.message : 'No se pudo generar el PDF. Inténtalo de nuevo.'
      )
    } finally {
      setExportandoPdf(false)
    }
  }

  const chartHeight = 300

  const dataSiNo = useMemo(() => {
    const result = {}
    ORDEN_GRAFICOS.filter((g) => g.kind === 'sino').forEach(({ key }) => {
      result[key] = distribucionPregunta(encuestasFiltradas, key, {
        opciones: ['Sí', 'No', 'Sin respuesta'],
      })
    })
    return result
  }, [encuestasFiltradas])

  const dataMultiples = useMemo(() => {
    const result = {}
    ORDEN_GRAFICOS.filter((g) => g.kind === 'multiple').forEach(({ key }) => {
      result[key] = distribucionPregunta(encuestasFiltradas, key, {
        multiple: true,
        opciones: CHECKBOX_OPTIONS[key] || null,
      })
    })
    return result
  }, [encuestasFiltradas])

  const renderPieSiNo = (data) => {
    const dataConValor = data.filter((item) => item.value > 0)
    const total = data.reduce((acc, item) => acc + item.value, 0)
    const topCategoria = [...dataConValor].sort((a, b) => b.value - a.value)[0]
    const topTexto = topCategoria ? `${topCategoria.name}: ${topCategoria.percentage}%` : 'Sin datos'

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Pie
            data={dataConValor}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
            labelLine={false}
            label={({ percentage }) => (percentage >= 8 ? `${percentage}%` : '')}
          >
            {dataConValor.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PIE_COLORS_BY_NAME[entry.name] || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, _, item) => [
              `${value} respuestas (${item.payload.percentage}%)`,
              item.payload.name,
            ]}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            formatter={(value, _, index) => {
              const p = dataConValor[index]?.percentage ?? 0
              return `${value} (${p}%)`
            }}
          />
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground text-sm font-semibold"
          >
            {total}
          </text>
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted-foreground text-[11px]"
          >
            respuestas
          </text>
          <text
            x="50%"
            y="63%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted-foreground text-[11px]"
          >
            {topTexto}
          </text>
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const renderBarrasHorizontales = (data, unit = 'Respuestas') => (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} reversed />
        <Tooltip formatter={(value, _, item) => [`${value} (${item.payload.percentage}%)`, unit]} />
        <Bar dataKey="value" name={unit} fill="#366092" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] max-h-[95vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <DialogTitle>Dashboard de Estadísticas</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportarPDF}
                disabled={exportandoPdf}
              >
                {exportandoPdf ? 'Generando PDF…' : 'Exportar Dashboard como PDF'}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar dashboard de gráficos"
                >
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div ref={dashboardRef} id="dashboard-content" className="space-y-6">
          {/* Filtros */}
          <div className="dashboard-pdf-block">
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2 min-w-[160px]">
                  <Label className="text-xs">IED</Label>
                  <Select
                    value={filtros.ied || 'todos'}
                    onValueChange={(v) => setFiltros((f) => ({ ...f, ied: v === 'todos' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {iedOpciones.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-[120px]">
                  <Label className="text-xs">Curso</Label>
                  <Select
                    value={filtros.curso || 'todos'}
                    onValueChange={(v) => setFiltros((f) => ({ ...f, curso: v === 'todos' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {cursoOpciones.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
          </div>

          {/* KPIs */}
          <div className="dashboard-pdf-block grid grid-cols-2 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total encuestas</p>
                <p className="text-2xl font-semibold text-primary">{kpis.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Promedio edad</p>
                <p className="text-2xl font-semibold">{kpis.promedioEdad}</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficas por pregunta (orden P1 → P33, luego IED) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ORDEN_GRAFICOS.map((item) => {
              if (item.kind === 'sino') {
                return (
                  <ChartCard key={item.key} title={item.title}>
                    {renderPieSiNo(dataSiNo[item.key] || [])}
                  </ChartCard>
                )
              }
              if (item.kind === 'multiple') {
                return (
                  <ChartCard key={item.key} title={item.title}>
                    {renderBarrasHorizontales(dataMultiples[item.key] || [], 'Selecciones')}
                  </ChartCard>
                )
              }
              if (item.kind === 'p17') {
                return (
                  <ChartCard key={item.key} title={item.title}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={dataP17} margin={{ bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Padre" name="Padre" fill="#366092" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Madre" name="Madre" fill="#EC4899" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )
              }
              if (item.kind === 'p25') {
                return (
                  <ChartCard key={item.key} title={item.title}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={dataP25} margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="si" stackId="a" name="Sí" fill="#10B981" />
                        <Bar dataKey="no" stackId="a" name="No" fill="#EF4444" />
                        <Bar dataKey="sinRespuesta" stackId="a" name="Sin respuesta" fill="#94A3B8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )
              }
              if (item.kind === 'ied') {
                return (
                  <ChartCard key={item.key} title={item.title}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={dataPorIED} margin={{ bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" name="Encuestas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )
              }
              return null
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
