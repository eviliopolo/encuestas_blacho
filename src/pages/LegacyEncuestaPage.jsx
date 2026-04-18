import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { EncuestaTable } from '@/components/EncuestaTable'
import { EncuestaForm } from '@/components/EncuestaForm'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ExportButton } from '@/components/ExportButton'
import { ImportExcelButton } from '@/components/ImportExcelButton'
import { Dashboard } from '@/components/Dashboard'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { fetchAllEncuestas } from '@/utils/fetchAllEncuestas'
import { Plus, BarChart3, Info } from 'lucide-react'

/**
 * Pantalla legacy de la "Encuesta Socio-Ocupacional".
 * Se preserva intacta salvo por la deshabilitación del botón "Nueva Encuesta":
 * ahora las encuestas nuevas se gestionan desde el módulo dinámico en /admin.
 */
export default function LegacyEncuestaPage() {
  const [encuestas, setEncuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEncuesta, setEditingEncuesta] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState(null)
  const [showDashboard, setShowDashboard] = useState(false)

  const showMessage = (text, type = 'default') => {
    setMessage({ text, type })
    const ms = type === 'destructive' ? 60000 : 5000
    setTimeout(() => setMessage(null), ms)
  }

  const fetchEncuestas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchAllEncuestas()
    if (error) {
      showMessage('Error al cargar encuestas: ' + error.message, 'destructive')
      setEncuestas([])
    } else {
      setEncuestas(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEncuestas()
  }, [fetchEncuestas])

  const handleEdit = (row) => {
    setEditingEncuesta(row)
    setFormOpen(true)
  }

  const handleSave = async (formData) => {
    setSaving(true)
    const isEdit = !!editingEncuesta?.id
    const payload = { ...formData, updated_at: new Date().toISOString() }
    Object.keys(payload).forEach((key) => {
      if (key !== 'nombre' && payload[key] === '') payload[key] = null
    })
    if (payload.fecha_registro) {
      try {
        new Date(payload.fecha_registro)
      } catch {
        payload.fecha_registro = null
      }
    }

    if (isEdit) {
      const { error } = await supabase
        .from('encuestas_orientacion')
        .update(payload)
        .eq('id', editingEncuesta.id)
      if (error) {
        showMessage('Error al actualizar: ' + error.message, 'destructive')
        setSaving(false)
        return
      }
      showMessage('Encuesta actualizada correctamente.', 'success')
    } else {
      const { error } = await supabase.from('encuestas_orientacion').insert([payload]).select()
      if (error) {
        showMessage('Error al guardar: ' + error.message, 'destructive')
        setSaving(false)
        return
      }
      showMessage('Encuesta guardada correctamente.', 'success')
    }
    setFormOpen(false)
    setEditingEncuesta(null)
    setSaving(false)
    fetchEncuestas()
  }

  const handleDeleteClick = (row) => setDeleteTarget(row)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return
    setDeleting(true)
    const { error } = await supabase
      .from('encuestas_orientacion')
      .delete()
      .eq('id', deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
    if (error) {
      showMessage('Error al eliminar: ' + error.message, 'destructive')
      return
    }
    showMessage('Encuesta eliminada correctamente.', 'success')
    fetchEncuestas()
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">Encuesta Socio-Ocupacional (legacy)</h2>
        <div className="flex flex-wrap gap-2">
          <ExportButton data={encuestas} disabled={loading} />
          <ImportExcelButton
            onSuccess={fetchEncuestas}
            onMessage={showMessage}
            disabled={loading}
          />
          <Button variant="outline" onClick={() => setShowDashboard(true)} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </Button>
          <Button
            disabled
            title="La creación de nuevas encuestas se realiza desde el módulo de Administración."
            className="gap-2 opacity-60 cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
            Nueva Encuesta
          </Button>
        </div>
      </div>

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esta es la pantalla original (legacy). Para crear y gestionar nuevas encuestas
          dinámicas, usa el módulo{' '}
          <Link to="/admin" className="underline font-medium">
            Administración
          </Link>
          .
        </AlertDescription>
      </Alert>

      {message && (
        <Alert
          variant={
            message.type === 'destructive'
              ? 'destructive'
              : message.type === 'success'
              ? 'success'
              : 'default'
          }
          className="mb-4"
        >
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <EncuestaTable
        data={encuestas}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        loading={loading}
      />

      <EncuestaForm
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingEncuesta}
        onSave={handleSave}
        saving={saving}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        nombre={deleteTarget?.nombre}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />

      <Dashboard
        encuestas={encuestas}
        open={showDashboard}
        onOpenChange={setShowDashboard}
      />
    </>
  )
}
