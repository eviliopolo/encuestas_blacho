import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { readEncuestasFromExcel } from '@/utils/importFromExcel'
import { supabase } from '@/lib/supabase'
import { FileUp } from 'lucide-react'

const BATCH_SIZE = 50

export function ImportExcelButton({ onSuccess, onMessage, disabled }) {
  const inputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      onMessage?.('Seleccione un archivo Excel (.xlsx o .xls).', 'destructive')
      return
    }

    const { rows, errors } = await readEncuestasFromExcel(file)
    if (errors.length > 0 && rows.length === 0) {
      onMessage?.(errors[0], 'destructive')
      return
    }

    if (rows.length === 0) {
      onMessage?.('No se encontraron filas válidas para importar.', 'destructive')
      return
    }

    const now = new Date().toISOString()
    const toInsert = rows.map((row) => ({
      ...row,
      updated_at: now,
    }))

    let imported = 0
    let lastError = null
    let failingExcelRow = null

    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('encuestas_orientacion').insert(batch)
      if (error) {
        lastError = error.message
        // Encontrar la fila exacta que falla (fila en Excel = índice + 2, porque fila 1 es encabezado)
        for (let j = 0; j < batch.length; j++) {
          const { error: rowError } = await supabase.from('encuestas_orientacion').insert([batch[j]])
          if (rowError) {
            failingExcelRow = i + j + 2
            lastError = rowError.message
            const nombre = batch[j].nombre ? ` (nombre: "${batch[j].nombre}")` : ''
            onMessage?.(
              `Error en fila ${failingExcelRow}${nombre}: ${rowError.message}`,
              'destructive'
            )
            return
          }
        }
        break
      }
      imported += batch.length
    }

    if (lastError && failingExcelRow == null) {
      onMessage?.(
        imported > 0
          ? `Se importaron ${imported} encuestas. Error después: ${lastError}`
          : `Error al importar: ${lastError}`,
        'destructive'
      )
    } else if (!lastError) {
      const msg =
        errors.length > 0
          ? `Se importaron ${imported} encuestas. Advertencias: ${errors.join(' ')}`
          : `Se importaron ${imported} encuestas correctamente.`
      onMessage?.(msg, 'success')
      onSuccess?.()
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="gap-2"
      >
        <FileUp className="h-4 w-4" />
        Importar desde Excel
      </Button>
    </>
  )
}
