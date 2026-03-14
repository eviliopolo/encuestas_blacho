import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'
import { exportToExcel } from '@/utils/exportToExcel'

export function ExportButton({ data, disabled }) {
  const handleExport = () => {
    if (!data?.length) return
    exportToExcel(data)
  }

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={disabled || !data?.length}
      className="gap-2"
    >
      <FileSpreadsheet className="h-4 w-4" />
      Exportar a Excel
    </Button>
  )
}
