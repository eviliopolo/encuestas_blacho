import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  listarEncuestas, cerrarEncuesta, abrirEncuesta, duplicarEncuesta, eliminarEncuesta,
} from '@/services/encuestasService'
import {
  BarChart3, Copy, Edit2, Plus, Lock, Unlock, Trash2, Download, Share2,
} from 'lucide-react'
import { exportarEncuestaExcel } from '@/utils/exportEncuestaNuevaExcel'

export default function AdminEncuestasPage() {
  const navigate = useNavigate()
  const [encuestas, setEncuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const cargar = async () => {
    setLoading(true)
    const filtros = {}
    if (filtroEstado !== 'todas') filtros.estado = filtroEstado
    if (desde) filtros.desde = desde
    if (hasta) filtros.hasta = hasta
    const { data, error } = await listarEncuestas(filtros)
    if (error) setMsg({ text: 'Error al cargar encuestas: ' + error.message, type: 'destructive' })
    setEncuestas(data)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [filtroEstado, desde, hasta])

  const toggleEstado = async (enc) => {
    const fn = enc.estado === 'abierta' ? cerrarEncuesta : abrirEncuesta
    const { error } = await fn(enc.id)
    if (error) setMsg({ text: error.message, type: 'destructive' })
    else { setMsg({ text: `Encuesta ${enc.estado === 'abierta' ? 'cerrada' : 'abierta'}.`, type: 'success' }); cargar() }
  }

  const duplicar = async (enc) => {
    const { data, error } = await duplicarEncuesta(enc.id)
    if (error) setMsg({ text: 'Error al duplicar: ' + error.message, type: 'destructive' })
    else { setMsg({ text: 'Encuesta duplicada.', type: 'success' }); navigate(`/admin/encuestas/${data.id}`) }
  }

  const eliminar = async (enc) => {
    if (!window.confirm(`¿Archivar la encuesta "${enc.nombre}"? Se conservarán las respuestas existentes.`)) return
    const { error } = await eliminarEncuesta(enc.id)
    if (error) setMsg({ text: error.message, type: 'destructive' })
    else { setMsg({ text: 'Encuesta archivada.', type: 'success' }); cargar() }
  }

  const exportar = async (enc) => {
    try {
      await exportarEncuestaExcel(enc.id, enc.nombre)
    } catch (e) {
      setMsg({ text: 'Error al exportar: ' + e.message, type: 'destructive' })
    }
  }

  const copiarEnlace = (enc) => {
    const url = `${window.location.origin}/responder/${enc.id}`
    navigator.clipboard.writeText(url)
    setMsg({ text: 'Enlace copiado: ' + url, type: 'success' })
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Administración de encuestas</h2>
        <Button asChild className="gap-2">
          <Link to="/admin/encuestas/nueva">
            <Plus className="h-4 w-4" /> Nueva encuesta
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <Label htmlFor="estado">Estado</Label>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger id="estado"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="abierta">Abiertas</SelectItem>
              <SelectItem value="cerrada">Cerradas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="desde">Creadas desde</Label>
          <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="hasta">Creadas hasta</Label>
          <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      {msg && (
        <Alert variant={msg.type === 'destructive' ? 'destructive' : msg.type === 'success' ? 'success' : 'default'} className="mb-4">
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Creación</th>
              <th className="px-4 py-3 font-medium">Cierre</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>
            ) : encuestas.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No hay encuestas.</td></tr>
            ) : encuestas.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{e.nombre}</div>
                  {e.descripcion && <div className="text-xs text-muted-foreground line-clamp-1">{e.descripcion}</div>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={e.estado === 'abierta' ? 'default' : 'secondary'}>
                    {e.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(e.fecha_creacion).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {e.fecha_cierre ? new Date(e.fecha_cierre).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => copiarEnlace(e)} title="Copiar enlace">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" asChild title="Editar">
                      <Link to={`/admin/encuestas/${e.id}`}><Edit2 className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="sm" variant="ghost" asChild title="Estadísticas">
                      <Link to={`/estadisticas/${e.id}`}><BarChart3 className="h-4 w-4" /></Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => exportar(e)} title="Exportar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicar(e)} title="Duplicar">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => toggleEstado(e)} title={e.estado === 'abierta' ? 'Cerrar' : 'Abrir'}>
                      {e.estado === 'abierta' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => eliminar(e)} title="Archivar">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
