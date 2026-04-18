import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  crearEncuesta, actualizarEncuesta, obtenerEncuestaCompleta,
} from '@/services/encuestasService'
import {
  TIPOS_PREGUNTA, TIPOS_GRAFICA, reemplazarPreguntas, validarPreguntas,
} from '@/services/preguntasService'
import {
  ArrowLeft, GripVertical, Plus, Trash2, Copy, ChevronUp, ChevronDown, Save,
} from 'lucide-react'

const defaultPregunta = (orden) => ({
  texto: '',
  tipo: 'unica_respuesta',
  orden,
  obligatoria: true,
  tipo_grafica: 'barras',
  opciones: [
    { texto: '', orden: 1 },
    { texto: '', orden: 2 },
  ],
})

export default function EncuestaBuilderPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const esNueva = !id || id === 'nueva'

  const [loading, setLoading] = useState(!esNueva)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaCierre, setFechaCierre] = useState('')
  const [preguntas, setPreguntas] = useState([defaultPregunta(1)])
  const [dragIndex, setDragIndex] = useState(null)

  useEffect(() => {
    if (esNueva) return
    let cancel = false
    ;(async () => {
      const { data, error } = await obtenerEncuestaCompleta(id)
      if (cancel) return
      if (error || !data) {
        setMsg({ text: 'No se pudo cargar la encuesta: ' + (error?.message || 'no existe'), type: 'destructive' })
      } else {
        setNombre(data.nombre || '')
        setDescripcion(data.descripcion || '')
        setFechaCierre(data.fecha_cierre ? data.fecha_cierre.slice(0, 16) : '')
        setPreguntas((data.preguntas || []).map((p) => ({
          id: p.id,
          texto: p.texto,
          tipo: p.tipo,
          orden: p.orden,
          obligatoria: p.obligatoria,
          tipo_grafica: p.tipo_grafica,
          opciones: (p.opciones || []).map((o) => ({ texto: o.texto, orden: o.orden, valor: o.valor })),
        })))
      }
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [id, esNueva])

  const recomputarOrden = (arr) => arr.map((p, idx) => ({
    ...p,
    orden: idx + 1,
    opciones: (p.opciones || []).map((o, i) => ({ ...o, orden: i + 1 })),
  }))

  const setPregunta = (idx, parche) => {
    setPreguntas((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...parche }
      return next
    })
  }

  const moverPregunta = (idx, delta) => {
    setPreguntas((prev) => {
      const j = idx + delta
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return recomputarOrden(next)
    })
  }

  const agregarPregunta = () => {
    setPreguntas((prev) => recomputarOrden([...prev, defaultPregunta(prev.length + 1)]))
  }

  const duplicarPregunta = (idx) => {
    setPreguntas((prev) => {
      const copia = JSON.parse(JSON.stringify(prev[idx]))
      delete copia.id
      return recomputarOrden([...prev.slice(0, idx + 1), copia, ...prev.slice(idx + 1)])
    })
  }

  const eliminarPregunta = (idx) => {
    setPreguntas((prev) => recomputarOrden(prev.filter((_, i) => i !== idx)))
  }

  const agregarOpcion = (idx) => {
    setPreguntas((prev) => {
      const next = [...prev]
      const ops = [...(next[idx].opciones || [])]
      ops.push({ texto: '', orden: ops.length + 1 })
      next[idx] = { ...next[idx], opciones: ops }
      return next
    })
  }

  const setOpcion = (pidx, oidx, parche) => {
    setPreguntas((prev) => {
      const next = [...prev]
      const ops = [...(next[pidx].opciones || [])]
      ops[oidx] = { ...ops[oidx], ...parche }
      next[pidx] = { ...next[pidx], opciones: ops }
      return next
    })
  }

  const eliminarOpcion = (pidx, oidx) => {
    setPreguntas((prev) => {
      const next = [...prev]
      const ops = (next[pidx].opciones || []).filter((_, i) => i !== oidx).map((o, i) => ({ ...o, orden: i + 1 }))
      next[pidx] = { ...next[pidx], opciones: ops }
      return next
    })
  }

  const onDragStart = (idx) => setDragIndex(idx)
  const onDragOver = (e) => e.preventDefault()
  const onDrop = (idx) => {
    if (dragIndex == null || dragIndex === idx) { setDragIndex(null); return }
    setPreguntas((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(idx, 0, moved)
      return recomputarOrden(next)
    })
    setDragIndex(null)
  }

  const handleTipoChange = (idx, tipo) => {
    setPreguntas((prev) => {
      const next = [...prev]
      const p = { ...next[idx], tipo }
      if (tipo === 'respuesta_abierta') {
        p.tipo_grafica = 'ninguna'
        p.opciones = []
      } else if (!p.opciones || p.opciones.length === 0) {
        p.opciones = [{ texto: '', orden: 1 }, { texto: '', orden: 2 }]
        if (p.tipo_grafica === 'ninguna') p.tipo_grafica = 'barras'
      } else if (p.tipo_grafica === 'ninguna') {
        p.tipo_grafica = 'barras'
      }
      next[idx] = p
      return next
    })
  }

  const guardar = async () => {
    setMsg(null)
    if (!nombre.trim()) {
      setMsg({ text: 'El nombre de la encuesta es obligatorio.', type: 'destructive' }); return
    }
    const errs = validarPreguntas(preguntas)
    if (errs.length) {
      setMsg({ text: 'Revisa los errores: ' + errs.join(' | '), type: 'destructive' }); return
    }

    setSaving(true)
    try {
      let encuestaId = id
      if (esNueva) {
        const { data, error } = await crearEncuesta({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          fecha_cierre: fechaCierre || null,
        })
        if (error || !data) throw new Error(error?.message || 'No se pudo crear')
        encuestaId = data.id
      } else {
        const { error } = await actualizarEncuesta(id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          fecha_cierre: fechaCierre || null,
        })
        if (error) throw new Error(error.message)
      }

      const { error: errP } = await reemplazarPreguntas(encuestaId, preguntas)
      if (errP) throw new Error(errP.message)

      setMsg({ text: 'Encuesta guardada.', type: 'success' })
      if (esNueva) navigate(`/admin/encuestas/${encuestaId}`, { replace: true })
    } catch (e) {
      setMsg({ text: 'Error al guardar: ' + e.message, type: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
          </Button>
          <h2 className="text-xl font-semibold">
            {esNueva ? 'Nueva encuesta' : 'Editar encuesta'}
          </h2>
        </div>
        <Button onClick={guardar} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>

      {msg && (
        <Alert variant={msg.type === 'destructive' ? 'destructive' : msg.type === 'success' ? 'success' : 'default'} className="mb-4">
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>Datos generales</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="nombre">Nombre*</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <textarea
              id="descripcion"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fecha_cierre">Fecha de cierre (opcional)</Label>
            <Input
              id="fecha_cierre"
              type="datetime-local"
              value={fechaCierre}
              onChange={(e) => setFechaCierre(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Preguntas</h3>
        <Button onClick={agregarPregunta} variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> Agregar pregunta
        </Button>
      </div>

      <div className="space-y-4">
        {preguntas.map((p, idx) => (
          <Card
            key={idx}
            draggable
            onDragStart={() => onDragStart(idx)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(idx)}
            className={dragIndex === idx ? 'opacity-60' : ''}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <CardTitle className="text-base">Pregunta #{idx + 1}</CardTitle>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => moverPregunta(idx, -1)} disabled={idx === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moverPregunta(idx, +1)} disabled={idx === preguntas.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => duplicarPregunta(idx)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => eliminarPregunta(idx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Texto*</Label>
                <Input
                  value={p.texto}
                  onChange={(e) => setPregunta(idx, { texto: e.target.value })}
                  placeholder="Ej. ¿Qué carrera te gustaría estudiar?"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={p.tipo} onValueChange={(v) => handleTipoChange(idx, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_PREGUNTA.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo de gráfica</Label>
                  <Select
                    value={p.tipo_grafica}
                    onValueChange={(v) => setPregunta(idx, { tipo_grafica: v })}
                    disabled={p.tipo === 'respuesta_abierta'}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_GRAFICA.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Checkbox
                    id={`obl-${idx}`}
                    checked={!!p.obligatoria}
                    onChange={(e) => setPregunta(idx, { obligatoria: e.target.checked })}
                  />
                  <Label htmlFor={`obl-${idx}`}>Obligatoria</Label>
                </div>
              </div>

              {p.tipo !== 'respuesta_abierta' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Opciones</Label>
                    <Button size="sm" variant="outline" onClick={() => agregarOpcion(idx)} className="gap-1">
                      <Plus className="h-3 w-3" /> Opción
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(p.opciones || []).map((o, oidx) => (
                      <div key={oidx} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-6">{oidx + 1}.</span>
                        <Input
                          className="flex-1"
                          value={o.texto}
                          onChange={(e) => setOpcion(idx, oidx, { texto: e.target.value })}
                          placeholder={`Opción ${oidx + 1}`}
                        />
                        <Input
                          type="number"
                          className="w-24"
                          placeholder="Valor"
                          value={o.valor ?? ''}
                          onChange={(e) => setOpcion(idx, oidx, { valor: e.target.value === '' ? null : Number(e.target.value) })}
                        />
                        <Button size="icon" variant="ghost" onClick={() => eliminarOpcion(idx, oidx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={guardar} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </>
  )
}
