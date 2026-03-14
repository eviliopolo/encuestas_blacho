import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/Header'
import { EncuestaTable } from '@/components/EncuestaTable'
import { EncuestaForm } from '@/components/EncuestaForm'
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog'
import { ExportButton } from '@/components/ExportButton'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'

export default function App() {
  const [encuestas, setEncuestas] = useState([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingEncuesta, setEditingEncuesta] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState(null)

  const showMessage = (text, type = 'default') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const fetchEncuestas = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('encuestas_orientacion')
      .select('*')
      .order('created_at', { ascending: false })
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

  const handleNewEncuesta = () => {
    setEditingEncuesta(null)
    setFormOpen(true)
  }

  const handleEdit = (row) => {
    setEditingEncuesta(row)
    setFormOpen(true)
  }

  const handleSave = async (formData) => {
    setSaving(true)
    const isEdit = !!editingEncuesta?.id
    const payload = { ...formData, updated_at: new Date().toISOString() }
    // Convertir cadenas vacías a null para no violar CHECK constraints (Sí/No solo aceptan 'Sí' o 'No')
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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold">Listado de encuestas</h2>
          <div className="flex flex-wrap gap-2">
            <ExportButton data={encuestas} disabled={loading} />
            <Button onClick={handleNewEncuesta} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Encuesta
            </Button>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'destructive' ? 'destructive' : message.type === 'success' ? 'success' : 'default'} className="mb-4">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <EncuestaTable
          data={encuestas}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          loading={loading}
        />
      </main>

      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Alcaldía de Barranquilla - IQNET ISO 9001
        </div>
      </footer>

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
    </div>
  )
}
