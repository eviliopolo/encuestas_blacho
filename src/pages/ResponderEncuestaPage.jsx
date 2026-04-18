import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { obtenerEncuestaCompleta } from '@/services/encuestasService'
import { guardarRespuestaEncuesta, validarRespuestas } from '@/services/respuestasService'
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react'

const camposEstudiante = [
  { key: 'nombre_estudiante', label: 'Nombre completo',   type: 'text' },
  { key: 'ied',               label: 'IED (Colegio)',      type: 'text' },
  { key: 'curso',             label: 'Curso',              type: 'text' },
  { key: 'identificacion',    label: 'Identificación',     type: 'text' },
  { key: 'edad',              label: 'Edad',               type: 'number' },
]

export default function ResponderEncuestaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [encuesta, setEncuesta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [exito, setExito] = useState(false)
  const [estudiante, setEstudiante] = useState({
    nombre_estudiante: '', ied: '', curso: '', identificacion: '', edad: '',
  })
  const [respuestas, setRespuestas] = useState({})

  useEffect(() => {
    (async () => {
      const { data, error } = await obtenerEncuestaCompleta(id)
      if (error || !data) {
        setMsg({ text: 'No se pudo cargar la encuesta: ' + (error?.message || 'no existe'), type: 'destructive' })
      } else if (data.estado !== 'abierta' || !data.activa) {
        setMsg({ text: 'Esta encuesta no está abierta a respuestas.', type: 'destructive' })
        setEncuesta(data)
      } else {
        setEncuesta(data)
      }
      setLoading(false)
    })()
  }, [id])

  const setResp = (preguntaId, valor) => setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }))

  const toggleMultiple = (preguntaId, opcionId) => {
    setRespuestas((prev) => {
      const actual = Array.isArray(prev[preguntaId]) ? prev[preguntaId] : []
      return {
        ...prev,
        [preguntaId]: actual.includes(opcionId)
          ? actual.filter((x) => x !== opcionId)
          : [...actual, opcionId],
      }
    })
  }

  const enviar = async () => {
    setMsg(null)
    const errores = validarRespuestas({
      preguntas: encuesta.preguntas,
      respuestas,
      estudiante: { ...estudiante, edad: estudiante.edad ? Number(estudiante.edad) : null },
    })
    if (errores.length) {
      setMsg({ text: errores.join(' · '), type: 'destructive' })
      return
    }
    setSaving(true)
    const { error } = await guardarRespuestaEncuesta({
      encuesta_id: encuesta.id,
      estudiante: { ...estudiante, edad: Number(estudiante.edad) },
      respuestas,
      preguntas: encuesta.preguntas,
    })
    setSaving(false)
    if (error) {
      setMsg({ text: 'Error al enviar: ' + error.message, type: 'destructive' })
    } else {
      setExito(true)
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>

  if (exito) {
    return (
      <Card className="max-w-xl mx-auto">
        <CardContent className="py-10 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">¡Gracias por tu respuesta!</h2>
          <p className="text-muted-foreground mb-6">Tu información quedó registrada correctamente.</p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline"><Link to="/responder">Otra encuesta</Link></Button>
            <Button onClick={() => { setExito(false); setRespuestas({}); setEstudiante({ nombre_estudiante:'', ied:'', curso:'', identificacion:'', edad:'' }) }}>
              Enviar otra respuesta
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!encuesta) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{msg?.text || 'Encuesta no disponible.'}</AlertDescription>
      </Alert>
    )
  }

  const bloqueada = encuesta.estado !== 'abierta' || !encuesta.activa

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/responder"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Link>
        </Button>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>{encuesta.nombre}</CardTitle>
          {encuesta.descripcion && <p className="text-sm text-muted-foreground">{encuesta.descripcion}</p>}
        </CardHeader>
      </Card>

      {bloqueada && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>Esta encuesta está cerrada, no admite nuevas respuestas.</AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardHeader><CardTitle className="text-base">Datos del estudiante</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {camposEstudiante.map((c) => (
            <div key={c.key} className={c.key === 'nombre_estudiante' ? 'md:col-span-2' : ''}>
              <Label htmlFor={c.key}>{c.label}*</Label>
              <Input
                id={c.key}
                type={c.type}
                value={estudiante[c.key]}
                onChange={(e) => setEstudiante({ ...estudiante, [c.key]: e.target.value })}
                disabled={bloqueada}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(encuesta.preguntas || []).map((p, idx) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {idx + 1}. {p.texto}
                {p.obligatoria && <span className="text-destructive"> *</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {p.tipo === 'unica_respuesta' && (
                <div className="space-y-2">
                  {(p.opciones || []).map((o) => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name={`p-${p.id}`}
                        value={o.id}
                        checked={respuestas[p.id] === o.id}
                        onChange={() => setResp(p.id, o.id)}
                        disabled={bloqueada}
                      />
                      <span>{o.texto}</span>
                    </label>
                  ))}
                </div>
              )}
              {p.tipo === 'multiple_respuesta' && (
                <div className="space-y-2">
                  {(p.opciones || []).map((o) => (
                    <label key={o.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={Array.isArray(respuestas[p.id]) && respuestas[p.id].includes(o.id)}
                        onChange={() => toggleMultiple(p.id, o.id)}
                        disabled={bloqueada}
                      />
                      <span>{o.texto}</span>
                    </label>
                  ))}
                </div>
              )}
              {p.tipo === 'respuesta_abierta' && (
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                  value={respuestas[p.id] || ''}
                  onChange={(e) => setResp(p.id, e.target.value)}
                  disabled={bloqueada}
                  placeholder="Escribe tu respuesta…"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {msg && (
        <Alert variant={msg.type === 'destructive' ? 'destructive' : 'default'} className="mt-4">
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={enviar} disabled={saving || bloqueada} className="gap-2">
          <Send className="h-4 w-4" /> {saving ? 'Enviando…' : 'Enviar respuesta'}
        </Button>
      </div>
    </>
  )
}
