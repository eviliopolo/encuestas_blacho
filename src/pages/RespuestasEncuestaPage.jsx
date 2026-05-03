import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Pencil, Trash2, Save, Loader2, BarChart3, Download, FileDown,
} from 'lucide-react'
import { obtenerEncuestaCompleta, TIPO_TEST_CHASIDE } from '@/services/encuestasService'
import {
  listarRespuestasEncuesta,
  obtenerRespuestaEncuesta,
  actualizarRespuestaEncuesta,
  eliminarRespuestaEncuesta,
  validarRespuestas,
} from '@/services/respuestasService'
import { exportarEncuestaExcel } from '@/utils/exportEncuestaNuevaExcel'
import { descargarInformePdfChaside } from '@/utils/generarPdfResultadoChaside'

const PAGE_SIZE = 20

const CAMPOS_ESTUDIANTE = [
  { key: 'nombre_estudiante', label: 'Nombre completo',  type: 'text'   },
  { key: 'ied',               label: 'IED (Colegio)',     type: 'text'   },
  { key: 'curso',             label: 'Curso',             type: 'text'   },
  { key: 'identificacion',    label: 'Identificación',    type: 'text'   },
  { key: 'edad',              label: 'Edad',              type: 'number' },
]

const formatDate = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString() } catch { return String(iso) }
}

export default function RespuestasEncuestaPage() {
  const { id } = useParams()
  const [encuesta, setEncuesta] = useState(null)
  const [respuestas, setRespuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Estado del editor
  const [editing, setEditing] = useState(null) // { cabecera, respuestas(map) }
  const [editOpen, setEditOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // Estado de eliminación
  const [deletingId, setDeletingId] = useState(null)

  const showMsg = (text, type = 'default') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), type === 'destructive' ? 6000 : 4000)
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [{ data: enc, error: errEnc }, { data: resp, error: errResp }] =
      await Promise.all([
        obtenerEncuestaCompleta(id),
        listarRespuestasEncuesta(id),
      ])
    if (errEnc) showMsg('Error al cargar encuesta: ' + errEnc.message, 'destructive')
    if (errResp) showMsg('Error al cargar respuestas: ' + errResp.message, 'destructive')
    setEncuesta(enc || null)
    setRespuestas(resp || [])
    setLoading(false)
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return respuestas
    return respuestas.filter((r) =>
      [r.nombre_estudiante, r.ied, r.curso, r.identificacion]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    )
  }, [respuestas, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  )

  const handleOpenEditor = async (row) => {
    const { data, error } = await obtenerRespuestaEncuesta(row.id)
    if (error || !data) {
      showMsg('No se pudo cargar la respuesta: ' + (error?.message || 'desconocido'), 'destructive')
      return
    }
    // Mapear detalles -> shape que usa el formulario:
    // pregunta_id -> opcion_id | [opcion_ids] | texto
    const mapRespuestas = {}
    for (const d of data.detalles || []) {
      const pregunta = (encuesta?.preguntas || []).find((p) => p.id === d.pregunta_id)
      if (!pregunta) continue
      if (pregunta.tipo === 'unica_respuesta') {
        mapRespuestas[pregunta.id] = d.opcion_pregunta_id
      } else if (pregunta.tipo === 'multiple_respuesta') {
        const prev = Array.isArray(mapRespuestas[pregunta.id]) ? mapRespuestas[pregunta.id] : []
        mapRespuestas[pregunta.id] = [...prev, d.opcion_pregunta_id]
      } else if (pregunta.tipo === 'respuesta_abierta') {
        mapRespuestas[pregunta.id] = d.texto_respuesta || ''
      }
    }
    setEditing({
      id: data.id,
      estudiante: {
        nombre_estudiante: data.nombre_estudiante || '',
        ied:               data.ied || '',
        curso:             data.curso || '',
        identificacion:    data.identificacion || '',
        edad:              data.edad ?? '',
      },
      respuestas: mapRespuestas,
    })
    setEditOpen(true)
  }

  const handleCloseEditor = () => {
    setEditOpen(false)
    setEditing(null)
  }

  const handleGuardarEdicion = async () => {
    if (!editing || !encuesta) return
    const errores = validarRespuestas({
      preguntas: encuesta.preguntas || [],
      respuestas: editing.respuestas,
      estudiante: {
        ...editing.estudiante,
        edad: editing.estudiante.edad ? Number(editing.estudiante.edad) : null,
      },
    })
    if (errores.length) {
      showMsg(errores.join(' · '), 'destructive')
      return
    }
    setSavingEdit(true)
    const { error } = await actualizarRespuestaEncuesta({
      id: editing.id,
      estudiante: {
        ...editing.estudiante,
        edad: Number(editing.estudiante.edad),
      },
      respuestas: editing.respuestas,
      preguntas: encuesta.preguntas || [],
    })
    setSavingEdit(false)
    if (error) {
      showMsg('Error al guardar: ' + error.message, 'destructive')
      return
    }
    showMsg('Respuesta actualizada correctamente.', 'success')
    handleCloseEditor()
    cargar()
  }

  const handleEliminar = async (row) => {
    if (!window.confirm(`¿Eliminar la respuesta de "${row.nombre_estudiante}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(row.id)
    const { error } = await eliminarRespuestaEncuesta(row.id)
    setDeletingId(null)
    if (error) {
      showMsg('Error al eliminar: ' + error.message, 'destructive')
      return
    }
    showMsg('Respuesta eliminada.', 'success')
    cargar()
  }

  const handleExportar = async () => {
    try {
      await exportarEncuestaExcel(id, encuesta?.nombre || 'encuesta')
    } catch (e) {
      showMsg('Error al exportar: ' + e.message, 'destructive')
    }
  }

  const handleDescargarInformeChaside = (row) => {
    try {
      if (!row.detalles?.length) {
        showMsg('No hay respuestas registradas para generar el informe.', 'destructive')
        return
      }
      descargarInformePdfChaside({
        nombreEstudiante: row.nombre_estudiante,
        identificacion: row.identificacion,
        edad: row.edad,
        curso: row.curso,
        ied: row.ied,
        preguntas: encuesta.preguntas || [],
        detalles: row.detalles,
      })
    } catch (e) {
      showMsg(e?.message || 'No se pudo generar el PDF.', 'destructive')
    }
  }

  if (loading) return <p className="text-muted-foreground">Cargando…</p>

  if (!encuesta) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No se encontró la encuesta solicitada.</AlertDescription>
      </Alert>
    )
  }

  const esEncuestaChaside = encuesta.tipo_test === TIPO_TEST_CHASIDE

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Volver a administración</Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold">Respuestas: {encuesta.nombre}</h2>
          <p className="text-xs font-medium text-muted-foreground mt-1">
            Tipo de test: {encuesta.tipo_test || 'No aplica'}
          </p>
          {encuesta.descripcion && (
            <p className="text-sm text-muted-foreground mt-2">{encuesta.descripcion}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportar} className="gap-2">
            <Download className="h-4 w-4" /> Exportar Excel
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to={`/estadisticas/${id}`}>
              <BarChart3 className="h-4 w-4" /> Estadísticas
            </Link>
          </Button>
        </div>
      </div>

      {msg && (
        <Alert
          variant={msg.type === 'destructive' ? 'destructive' : msg.type === 'success' ? 'success' : 'default'}
          className="mb-4"
        >
          <AlertDescription>{msg.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Buscar por nombre, IED, curso o identificación…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Total: <strong>{filtered.length}</strong> respuesta(s)
        </p>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-max text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-3 py-3 font-medium">Fecha</th>
                <th className="px-3 py-3 font-medium">Nombre</th>
                <th className="px-3 py-3 font-medium">IED</th>
                <th className="px-3 py-3 font-medium">Curso</th>
                <th className="px-3 py-3 font-medium">Identificación</th>
                <th className="px-3 py-3 font-medium">Edad</th>
                <th className="px-3 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay respuestas todavía.
                  </td>
                </tr>
              ) : paginated.map((row) => (
                <tr key={row.id} className="border-b hover:bg-muted/30">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.fecha_registro)}</td>
                  <td className="px-3 py-2">{row.nombre_estudiante}</td>
                  <td className="px-3 py-2">{row.ied}</td>
                  <td className="px-3 py-2">{row.curso}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.identificacion}</td>
                  <td className="px-3 py-2">{row.edad}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {esEncuestaChaside && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1"
                          onClick={() => handleDescargarInformeChaside(row)}
                          title="Descargar informe PDF CHASIDE"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          Informe CHASIDE
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => handleOpenEditor(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                        Ver/Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleEliminar(row)}
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}>
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>

      <EditorRespuesta
        open={editOpen}
        encuesta={encuesta}
        editing={editing}
        setEditing={setEditing}
        saving={savingEdit}
        onClose={handleCloseEditor}
        onSave={handleGuardarEdicion}
      />
    </>
  )
}

function EditorRespuesta({ open, encuesta, editing, setEditing, saving, onClose, onSave }) {
  if (!editing || !encuesta) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cargando…</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const setEstudiante = (key, value) =>
    setEditing((prev) => ({ ...prev, estudiante: { ...prev.estudiante, [key]: value } }))

  const setResp = (preguntaId, valor) =>
    setEditing((prev) => ({ ...prev, respuestas: { ...prev.respuestas, [preguntaId]: valor } }))

  const toggleMultiple = (preguntaId, opcionId) =>
    setEditing((prev) => {
      const actual = Array.isArray(prev.respuestas[preguntaId]) ? prev.respuestas[preguntaId] : []
      return {
        ...prev,
        respuestas: {
          ...prev.respuestas,
          [preguntaId]: actual.includes(opcionId)
            ? actual.filter((x) => x !== opcionId)
            : [...actual, opcionId],
        },
      }
    })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editar respuesta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border rounded-md p-3 bg-muted/30">
            <p className="font-medium mb-2 text-sm">Datos del estudiante</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CAMPOS_ESTUDIANTE.map((c) => (
                <div key={c.key} className={c.key === 'nombre_estudiante' ? 'md:col-span-2' : ''}>
                  <Label htmlFor={`edit-${c.key}`}>{c.label}</Label>
                  <Input
                    id={`edit-${c.key}`}
                    type={c.type}
                    value={editing.estudiante[c.key] ?? ''}
                    onChange={(e) => setEstudiante(c.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {(encuesta.preguntas || []).map((p, idx) => (
              <div key={p.id} className="border rounded-md p-3">
                <p className="font-medium mb-2 text-sm">
                  {idx + 1}. {p.texto}
                  {p.obligatoria && <span className="text-destructive"> *</span>}
                </p>

                {p.tipo === 'unica_respuesta' && (
                  <div className="space-y-1">
                    {(p.opciones || []).map((o) => (
                      <label key={o.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="radio"
                          name={`edit-p-${p.id}`}
                          value={o.id}
                          checked={editing.respuestas[p.id] === o.id}
                          onChange={() => setResp(p.id, o.id)}
                        />
                        <span>{o.texto}</span>
                      </label>
                    ))}
                  </div>
                )}

                {p.tipo === 'multiple_respuesta' && (
                  <div className="space-y-1">
                    {(p.opciones || []).map((o) => (
                      <label key={o.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={Array.isArray(editing.respuestas[p.id]) && editing.respuestas[p.id].includes(o.id)}
                          onChange={() => toggleMultiple(p.id, o.id)}
                        />
                        <span>{o.texto}</span>
                      </label>
                    ))}
                  </div>
                )}

                {p.tipo === 'respuesta_abierta' && (
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                    value={editing.respuestas[p.id] || ''}
                    onChange={(e) => setResp(p.id, e.target.value)}
                    placeholder="Escribe la respuesta…"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={onSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
