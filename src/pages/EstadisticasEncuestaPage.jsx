import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChartCard } from '@/components/ChartCard'
import { obtenerEncuestaCompleta } from '@/services/encuestasService'
import { listarRespuestasEncuesta } from '@/services/respuestasService'
import { agregarEstadisticas, frecuenciaPalabras } from '@/utils/estadisticasEncuesta'
import { ArrowLeft, Download, Upload, FileDown } from 'lucide-react'
import { exportarEncuestaExcel, descargarPlantillaImportacion } from '@/utils/exportEncuestaNuevaExcel'
import { importarEncuestaExcel } from '@/utils/importEncuestaNuevaExcel'
import { useRef } from 'react'

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#9333ea', '#0891b2', '#ca8a04', '#be185d', '#0ea5e9', '#65a30d', '#f97316', '#7c3aed']

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
  // barras (horizontal) / columnas (vertical)
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
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [filtros, setFiltros] = useState({ ied: '', curso: '', edadMin: '', edadMax: '', desde: '', hasta: '' })

  const cargar = async () => {
    setLoading(true)
    const [{ data: e, error: e1 }, { data: r, error: e2 }] = await Promise.all([
      obtenerEncuestaCompleta(id),
      listarRespuestasEncuesta(id, {
        ied: filtros.ied || undefined,
        curso: filtros.curso || undefined,
        edadMin: filtros.edadMin ? Number(filtros.edadMin) : null,
        edadMax: filtros.edadMax ? Number(filtros.edadMax) : null,
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
      }),
    ])
    if (e1 || e2) setMsg({ text: (e1 || e2).message, type: 'destructive' })
    setEncuesta(e); setRespuestas(r)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [id])

  const stats = useMemo(() => (encuesta ? agregarEstadisticas(encuesta, respuestas) : []), [encuesta, respuestas])

  const totalRespuestas = respuestas.length
  const iedUnicas   = useMemo(() => Array.from(new Set(respuestas.map((r) => r.ied))).length, [respuestas])
  const cursoUnicos = useMemo(() => Array.from(new Set(respuestas.map((r) => r.curso))).length, [respuestas])

  const inputFileRef = useRef(null)

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
          text: `Importación: ${res.ok}/${res.total} ok. Errores: ${res.fallos.slice(0, 5).map(f => `fila ${f.fila}: ${f.error}`).join('; ')}${res.fallos.length > 5 ? '…' : ''}`,
          type: 'destructive',
        })
      } else {
        setMsg({ text: `Se importaron ${res.ok} respuestas correctamente.`, type: 'success' })
      }
      cargar()
    } catch (e) {
      setMsg({ text: 'Error al importar: ' + e.message, type: 'destructive' })
    }
  }

  if (loading && !encuesta) return <p className="text-muted-foreground">Cargando…</p>
  if (!encuesta) return <Alert variant="destructive"><AlertDescription>{msg?.text || 'No disponible'}</AlertDescription></Alert>

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
          </Button>
          <h2 className="text-xl font-semibold">{encuesta.nombre}</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={descargarPlantilla} variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" /> Plantilla
          </Button>
          <Button onClick={() => inputFileRef.current?.click()} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" /> Importar
          </Button>
          <input ref={inputFileRef} type="file" accept=".xlsx,.xls" hidden onChange={onImportFile} />
          <Button onClick={exportar} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div><Label>IED</Label><Input value={filtros.ied} onChange={(e)=>setFiltros({...filtros,ied:e.target.value})} /></div>
          <div><Label>Curso</Label><Input value={filtros.curso} onChange={(e)=>setFiltros({...filtros,curso:e.target.value})} /></div>
          <div><Label>Edad mín</Label><Input type="number" value={filtros.edadMin} onChange={(e)=>setFiltros({...filtros,edadMin:e.target.value})} /></div>
          <div><Label>Edad máx</Label><Input type="number" value={filtros.edadMax} onChange={(e)=>setFiltros({...filtros,edadMax:e.target.value})} /></div>
          <div><Label>Desde</Label><Input type="date" value={filtros.desde} onChange={(e)=>setFiltros({...filtros,desde:e.target.value})} /></div>
          <div><Label>Hasta</Label><Input type="date" value={filtros.hasta} onChange={(e)=>setFiltros({...filtros,hasta:e.target.value})} /></div>
          <div className="col-span-2 md:col-span-6">
            <Button onClick={cargar} disabled={loading}>{loading ? 'Cargando…' : 'Aplicar filtros'}</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Total respuestas</div><div className="text-3xl font-bold">{totalRespuestas}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">IEDs distintas</div><div className="text-3xl font-bold">{iedUnicas}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-sm text-muted-foreground">Cursos distintos</div><div className="text-3xl font-bold">{cursoUnicos}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats.map((item, idx) => (
          <ChartCard key={item.pregunta.id} title={`${idx + 1}. ${item.pregunta.texto}`}>
            <GraficaPregunta item={item} />
          </ChartCard>
        ))}
      </div>
    </>
  )
}
