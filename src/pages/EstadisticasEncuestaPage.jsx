import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ChartCard } from '@/components/ChartCard'
import { obtenerEncuestaCompleta } from '@/services/encuestasService'
import { listarRespuestasEncuesta } from '@/services/respuestasService'
import { agregarEstadisticas, frecuenciaPalabras } from '@/utils/estadisticasEncuesta'
import { aplicarFiltros } from '@/utils/chartDataProcessing'
import { ArrowLeft, Download, Upload, FileDown, ListChecks } from 'lucide-react'
import { exportarEncuestaExcel, descargarPlantillaImportacion } from '@/utils/exportEncuestaNuevaExcel'
import { importarEncuestaExcel } from '@/utils/importEncuestaNuevaExcel'
import { jsPDF } from 'jspdf'
import { generarRecortesDashboard } from '@/utils/dashboardChartCapture'
import { exportDashboardRecortesToPptx } from '@/utils/exportDashboardPptx'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea', '#0891b2', '#ca8a04', '#be185d', '#0ea5e9', '#65a30d', '#f97316', '#7c3aed']

const defaultFiltros = { ied: '', curso: '', identificacion: '' }

const PDF_MARGIN_MM = 10
const PDF_GAP_MM = 3

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

async function prepararScrollCapturaDashboard(el) {
  const scrollHost = el.closest('[data-radix-scroll-area-viewport]') || el.parentElement
  const prevScrollTop = scrollHost?.scrollTop ?? 0
  if (scrollHost) scrollHost.scrollTop = 0
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  return { scrollHost, prevScrollTop }
}

function GraficaPregunta({ item }) {
  const { pregunta, conteos, textos, total } = item
  if (total === 0) {
    return <p className="text-sm text-muted-foreground">Sin respuestas.</p>
  }
  if (pregunta.tipo === 'respuesta_abierta') {
    const top = frecuenciaPalabras(textos, 40)
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-3">{total} respuestas</p>
        {top.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {top.map((p) => {
              const size = 12 + Math.min(24, p.count * 2)
              return (
                <span key={p.palabra} className="inline-block" style={{ fontSize: size, lineHeight: 1.1 }}>
                  {p.palabra}
                </span>
              )
            })}
          </div>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Ver todas las respuestas ({textos.length})</summary>
          <ul className="mt-2 space-y-1 list-disc pl-5 max-h-64 overflow-auto">
            {textos.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </details>
      </div>
    )
  }

  const data = conteos.map((c) => ({ name: c.opcion, value: c.count }))
  const tg = pregunta.tipo_grafica

  if (tg === 'ninguna') {
    return (
      <ul className="text-sm space-y-1">
        {data.map((d, i) => (
          <li key={i}>{d.name}: <strong>{d.value}</strong></li>
        ))}
      </ul>
    )
  }

  if (tg === 'circular') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie dataKey="value" data={data} label nameKey="name">
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }
  if (tg === 'lineas') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  const layout = tg === 'barras' ? 'vertical' : 'horizontal'
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" />
        {layout === 'vertical' ? (
          <>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
          </>
        )}
        <Tooltip />
        <Bar dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function EstadisticasEncuestaPage() {
  const { id } = useParams()
  const [encuesta, setEncuesta] = useState(null)
  const [todasLasRespuestas, setTodasLasRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [filtros, setFiltros] = useState(defaultFiltros)
  const [exportando, setExportando] = useState(null)
  const dashboardRef = useRef(null)
  const inputFileRef = useRef(null)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    const [{ data: e, error: e1 }, { data: r, error: e2 }] = await Promise.all([
      obtenerEncuestaCompleta(id),
      listarRespuestasEncuesta(id, {}),
    ])
    if (e1 || e2) setMsg({ text: (e1 || e2).message, type: 'destructive' })
    setEncuesta(e)
    setTodasLasRespuestas(r || [])
    setLoading(false)
  }, [id])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  const respuestasFiltradas = useMemo(
    () => aplicarFiltros(todasLasRespuestas, filtros),
    [todasLasRespuestas, filtros]
  )

  const stats = useMemo(
    () => (encuesta ? agregarEstadisticas(encuesta, respuestasFiltradas) : []),
    [encuesta, respuestasFiltradas]
  )

  const totalRespuestas = respuestasFiltradas.length
  const iedUnicas = useMemo(
    () => Array.from(new Set(respuestasFiltradas.map((r) => r.ied))).length,
    [respuestasFiltradas]
  )
  const cursoUnicos = useMemo(
    () => Array.from(new Set(respuestasFiltradas.map((r) => r.curso))).length,
    [respuestasFiltradas]
  )

  const iedOpciones = useMemo(() => {
    const set = new Set()
    todasLasRespuestas.forEach((r) => {
      if (r.ied != null && r.ied !== '') set.add(String(r.ied).trim())
    })
    return Array.from(set).sort()
  }, [todasLasRespuestas])

  const cursoOpciones = useMemo(() => {
    const set = new Set()
    todasLasRespuestas.forEach((r) => {
      if (r.curso != null && r.curso !== '') set.add(String(r.curso).trim())
    })
    return Array.from(set).sort()
  }, [todasLasRespuestas])

  const limpiarFiltros = () => setFiltros(defaultFiltros)

  const exportar = async () => {
    if (!encuesta) return
    try {
      await exportarEncuestaExcel(encuesta.id, encuesta.nombre)
    } catch (e) {
      setMsg({ text: 'Error al exportar: ' + e.message, type: 'destructive' })
    }
  }

  const descargarPlantilla = async () => {
    if (!encuesta) return
    try {
      await descargarPlantillaImportacion(encuesta.id, encuesta.nombre)
    } catch (e) {
      setMsg({ text: 'Error al generar plantilla: ' + e.message, type: 'destructive' })
    }
  }

  const onImportFile = async (ev) => {
    const file = ev.target.files?.[0]
    ev.target.value = ''
    if (!file) return
    setMsg({ text: 'Importando…', type: 'default' })
    try {
      const res = await importarEncuestaExcel(file, encuesta.id)
      if (res.fallos.length) {
        setMsg({
          text: `Importación: ${res.ok}/${res.total} ok. Errores: ${res.fallos.slice(0, 5).map((f) => `fila ${f.fila}: ${f.error}`).join('; ')}${res.fallos.length > 5 ? '…' : ''}`,
          type: 'destructive',
        })
      } else {
        setMsg({ text: `Se importaron ${res.ok} respuestas correctamente.`, type: 'success' })
      }
      cargarDatos()
    } catch (e) {
      setMsg({ text: 'Error al importar: ' + e.message, type: 'destructive' })
    }
  }

  const exportarPDF = async () => {
    const el = dashboardRef.current
    if (!el) return
    setExportando('pdf')
    const { scrollHost, prevScrollTop } = await prepararScrollCapturaDashboard(el)
    try {
      const recortes = await generarRecortesDashboard(el)
      const pdf = new jsPDF('p', 'mm', 'a4')
      volcarRecortesAlPdf(pdf, recortes)
      const slug = (encuesta?.nombre || 'dashboard').replace(/[^\w\-]+/g, '_').slice(0, 40)
      pdf.save(`${slug}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error(err)
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el PDF.')
    } finally {
      if (scrollHost) scrollHost.scrollTop = prevScrollTop
      setExportando(null)
    }
  }

  const exportarPPTX = async () => {
    const el = dashboardRef.current
    if (!el) return
    setExportando('pptx')
    const { scrollHost, prevScrollTop } = await prepararScrollCapturaDashboard(el)
    try {
      const recortes = await generarRecortesDashboard(el)
      const slug = (encuesta?.nombre || 'dashboard').replace(/[^\w\-]+/g, '_').slice(0, 40)
      const fecha = new Date().toISOString().split('T')[0]
      await exportDashboardRecortesToPptx(recortes, `${slug}_${fecha}.pptx`)
    } catch (err) {
      console.error(err)
      window.alert(err instanceof Error ? err.message : 'No se pudo generar el PowerPoint.')
    } finally {
      if (scrollHost) scrollHost.scrollTop = prevScrollTop
      setExportando(null)
    }
  }

  if (loading && !encuesta) return <p className="text-muted-foreground">Cargando…</p>
  if (!encuesta) return <Alert variant="destructive"><AlertDescription>{msg?.text || 'No disponible'}</AlertDescription></Alert>

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
            </Button>
            <h2 className="text-xl font-semibold">Dashboard de estadísticas</h2>
          </div>
          <p className="text-sm text-muted-foreground pl-1">{encuesta.nombre}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarPDF}
            disabled={exportando != null}
          >
            {exportando === 'pdf' ? 'Generando PDF…' : 'Exportar PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarPPTX}
            disabled={exportando != null}
          >
            {exportando === 'pptx' ? 'Generando PowerPoint…' : 'Exportar PowerPoint (.pptx)'}
          </Button>
          {encuesta.estado === 'abierta' && (
            <Button asChild variant="outline" size="sm" className="gap-1">
              <Link to={`/admin/encuestas/${id}/respuestas`}>
                <ListChecks className="h-4 w-4" /> Respuestas
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        <Button onClick={descargarPlantilla} variant="ghost" size="sm" className="gap-1 h-8">
          <FileDown className="h-3.5 w-3.5" /> Plantilla Excel
        </Button>
        <Button onClick={() => inputFileRef.current?.click()} variant="ghost" size="sm" className="gap-1 h-8">
          <Upload className="h-3.5 w-3.5" /> Importar
        </Button>
        <input ref={inputFileRef} type="file" accept=".xlsx,.xls" hidden onChange={onImportFile} />
        <Button onClick={exportar} variant="ghost" size="sm" className="gap-1 h-8">
          <Download className="h-3.5 w-3.5" /> Exportar Excel
        </Button>
      </div>

      {msg && (
        <Alert variant={msg.type === 'destructive' ? 'destructive' : msg.type === 'success' ? 'success' : 'default'} className="mb-4">
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <div ref={dashboardRef} id="dashboard-content" className="space-y-6">
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
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
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
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-[180px] flex-1 max-w-[280px]">
                  <Label htmlFor="estadisticas-filtro-identificacion" className="text-xs">
                    Documento de identidad
                  </Label>
                  <Input
                    id="estadisticas-filtro-identificacion"
                    type="text"
                    autoComplete="off"
                    placeholder="Ej. 1234567890"
                    value={filtros.identificacion}
                    onChange={(e) => setFiltros((f) => ({ ...f, identificacion: e.target.value }))}
                  />
                </div>
                <Button type="button" variant="outline" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="dashboard-pdf-block grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total respuestas</div>
              <div className="text-3xl font-bold">{totalRespuestas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">IEDs distintas (filtrado)</div>
              <div className="text-3xl font-bold">{iedUnicas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Cursos distintos (filtrado)</div>
              <div className="text-3xl font-bold">{cursoUnicos}</div>
            </CardContent>
          </Card>
        </div>

        <div className="dashboard-pdf-block grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.map((item, idx) => (
            <ChartCard key={item.pregunta.id} title={`${idx + 1}. ${item.pregunta.texto}`}>
              <GraficaPregunta item={item} />
            </ChartCard>
          ))}
        </div>
      </div>
    </>
  )
}
