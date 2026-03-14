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
  contarOpcionesMultiples,
  contarPorCampo,
  topNOpcionesMultiples,
  nivelEducativoPadres,
  indicadoresMotivacion,
} from '@/utils/chartDataProcessing'
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

const defaultFiltros = { ied: '', curso: '', fechaDesde: '', fechaHasta: '' }

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

  const dataP6 = useMemo(
    () => contarOpcionesMultiples(encuestasFiltradas, 'p6_tipo_carrera'),
    [encuestasFiltradas]
  )
  const dataP7 = useMemo(
    () => contarOpcionesMultiples(encuestasFiltradas, 'p7_area_mayor_destreza'),
    [encuestasFiltradas]
  )
  const dataP10 = useMemo(
    () => contarOpcionesMultiples(encuestasFiltradas, 'p10_despues_bachillerato'),
    [encuestasFiltradas]
  )
  const dataP26 = useMemo(
    () => contarOpcionesMultiples(encuestasFiltradas, 'p26_obstaculo_principal'),
    [encuestasFiltradas]
  )
  const dataP8Top10 = useMemo(
    () => topNOpcionesMultiples(encuestasFiltradas, 'p8_areas_formacion', 10),
    [encuestasFiltradas]
  )
  const dataPorIED = useMemo(
    () => contarPorCampo(encuestasFiltradas, 'ied'),
    [encuestasFiltradas]
  )
  const dataP17 = useMemo(
    () => nivelEducativoPadres(encuestasFiltradas),
    [encuestasFiltradas]
  )
  const dataMotivacion = useMemo(
    () => indicadoresMotivacion(encuestasFiltradas),
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
                <div className="space-y-2">
                  <Label className="text-xs">Fecha desde</Label>
                  <Input
                    type="date"
                    value={filtros.fechaDesde || ''}
                    onChange={(e) => setFiltros((f) => ({ ...f, fechaDesde: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Fecha hasta</Label>
                  <Input
                    type="date"
                    value={filtros.fechaHasta || ''}
                    onChange={(e) => setFiltros((f) => ({ ...f, fechaHasta: e.target.value }))}
                  />
                </div>
                <Button variant="outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Total encuestas</p>
                <p className="text-2xl font-semibold text-primary">{kpis.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Encuestas hoy</p>
                <p className="text-2xl font-semibold">{kpis.hoy}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Esta semana</p>
                <p className="text-2xl font-semibold">{kpis.estaSemana}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">Promedio edad</p>
                <p className="text-2xl font-semibold">{kpis.promedioEdad}</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Tipo de Carrera (P6) - Barra horizontal */}
            <ChartCard title="Tipo de Carrera Preferida (P6)">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={dataP6} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Respuestas" fill="#366092" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 2. Áreas de Mayor Destreza (P7) - Barra vertical */}
            <ChartCard title="Áreas de Mayor Destreza (P7)">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={dataP7} margin={{ bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" name="Respuestas" fill="#0066CC" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 3. Planes Después del Bachillerato (P10) - Pastel */}
            <ChartCard title="Planes Después del Bachillerato (P10)">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={dataP10}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dataP10.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [encuestasFiltradas.length > 0 ? `${value} (${((value / encuestasFiltradas.length) * 100).toFixed(1)}%)` : value, 'Respuestas']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 4. Obstáculos Principales (P26) - Barra horizontal */}
            <ChartCard title="Obstáculos Principales Identificados (P26)">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={dataP26} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Respuestas" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 5. Top 10 Áreas de Formación (P8) - ancho completo */}
            <ChartCard title="Top 10 Áreas de Formación de Interés (P8)" className="md:col-span-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={dataP8Top10} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Selecciones" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 6. Distribución por IED */}
            <ChartCard title="Participación por Institución Educativa">
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

            {/* 7. Nivel Educativo Padres (P17) - Barras agrupadas */}
            <ChartCard title="Nivel Educativo de Padres (P17)">
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

            {/* 8. Indicadores de Motivación - % Sí */}
            <ChartCard title="Indicadores de Motivación (% Respuestas Positivas)" className="md:col-span-2">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={dataMotivacion} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [`${value}%`, '% Sí']} />
                  <Bar dataKey="value" name="% Sí" fill="#14B8A6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
