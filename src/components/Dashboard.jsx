import { useState, useMemo, useRef } from 'react'
import {
  Dialog,
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

export function Dashboard({ encuestas = [], open, onOpenChange }) {
  const [filtros, setFiltros] = useState(defaultFiltros)
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
    if (!dashboardRef.current) return
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const width = pdf.internal.pageSize.getWidth()
      const height = (canvas.height * width) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, width, height)
      pdf.save(`dashboard_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Error al exportar PDF:', err)
    }
  }

  const chartHeight = 300

  const preguntasSiNo = [
    ['p1_continuar_formacion', 'P1 - Continuar formación después del bachillerato'],
    ['p2_info_edsuperior_colegio', 'P2 - Información sobre educación superior en el colegio'],
    ['p3_orientacion_edsuperior_casa', 'P3 - Orientación sobre educación superior en casa'],
    ['p4_orientacion_postbachillerato', 'P4 - Orientación post-bachillerato'],
    ['p5_conoce_programas_academicos', 'P5 - Conocimiento de programas académicos'],
    ['p9_importante_continuar_estudios', 'P9 - Importancia de continuar estudios'],
    ['p12_confianza_capacidades', 'P12 - Confianza en capacidades'],
    ['p13_motivacion_familia', 'P13 - Motivación familiar'],
    ['p15_apoyo_familia_carrera', 'P15 - Apoyo familiar a la carrera'],
    ['p16_motivado_futuro', 'P16 - Motivación por el futuro'],
    ['p19a_conoce_autoconocimiento', 'P19a - Conoce autoconocimiento'],
    ['p19b_conoce_educacion_superior', 'P19b - Conoce educación superior'],
    ['p19c_conoce_mundo_laboral', 'P19c - Conoce mundo laboral'],
    ['p21_estudiar_fuera_barranquilla', 'P21 - Estudiar fuera de Barranquilla'],
    ['p22_ejemplo_inspiracion', 'P22 - Tiene ejemplo o inspiración'],
    ['p23_factor_economico_importante', 'P23 - Factor económico importante'],
    ['p24_redes_sociales_influyen', 'P24 - Redes sociales influyen'],
    ['p27_institucion_identificada', 'P27 - Institución identificada'],
    ['p28_info_becas_programas', 'P28 - Información sobre becas y programas'],
    ['p29_abandono_colegio', 'P29 - Ha pensado abandonar el colegio'],
    ['p30_conoce_opciones_laborales', 'P30 - Conoce opciones laborales'],
    ['p31_conoce_tipos_contrato', 'P31 - Conoce tipos de contrato'],
    ['p32_conoce_entrevista_trabajo', 'P32 - Conoce entrevista de trabajo'],
    ['p33_sabe_hoja_vida', 'P33 - Sabe elaborar hoja de vida'],
  ]

  const preguntasMultiples = [
    ['p6_tipo_carrera', 'P6 - Tipo de carrera preferida'],
    ['p7_area_mayor_destreza', 'P7 - Área de mayor destreza'],
    ['p8_areas_formacion', 'P8 - Áreas de formación de interés'],
    ['p10_despues_bachillerato', 'P10 - Planes después del bachillerato'],
    ['p11_herramientas_vocacion', 'P11 - Herramientas vocacionales brindadas'],
    ['p14_apoyo_padres_orientacion', 'P14 - Apoyo familiar en orientación'],
    ['p18_expresion_familiar', 'P18 - Expresión familiar'],
    ['p20_conceptos_ayuda_formacion', 'P20 - Conceptos de ayuda para formación'],
    ['p26_obstaculo_principal', 'P26 - Obstáculo principal'],
  ]

  const dataSiNo = useMemo(() => {
    const result = {}
    preguntasSiNo.forEach(([key]) => {
      result[key] = distribucionPregunta(encuestasFiltradas, key, {
        opciones: ['Sí', 'No', 'Sin respuesta'],
      })
    })
    return result
  }, [encuestasFiltradas])

  const dataMultiples = useMemo(() => {
    const result = {}
    preguntasMultiples.forEach(([key]) => {
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
        <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
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
            <Button variant="outline" size="sm" onClick={exportarPDF}>
              Exportar Dashboard como PDF
            </Button>
          </div>
        </DialogHeader>

        <div ref={dashboardRef} id="dashboard-content" className="space-y-6">
          {/* Filtros */}
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

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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

          {/* Gráficas por pregunta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {preguntasSiNo.map(([key, label]) => (
              <ChartCard key={key} title={label}>
                {renderPieSiNo(dataSiNo[key] || [])}
              </ChartCard>
            ))}

            {preguntasMultiples.map(([key, label]) => (
              <ChartCard key={key} title={label}>
                {renderBarrasHorizontales(dataMultiples[key] || [], 'Selecciones')}
              </ChartCard>
            ))}

            <ChartCard title="P17 - Nivel educativo de padres">
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

            <ChartCard title="P25 - Frases (Sí / No / Sin respuesta)">
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

            <ChartCard title="Distribución por IED">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
