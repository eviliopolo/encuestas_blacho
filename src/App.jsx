import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import LegacyEncuestaPage from '@/pages/LegacyEncuestaPage'
import AdminEncuestasPage from '@/pages/AdminEncuestasPage'
import EncuestaBuilderPage from '@/pages/EncuestaBuilderPage'
import SeleccionarEncuestaPage from '@/pages/SeleccionarEncuestaPage'
import ResponderEncuestaPage from '@/pages/ResponderEncuestaPage'
import EstadisticasEncuestaPage from '@/pages/EstadisticasEncuestaPage'
import RespuestasEncuestaPage from '@/pages/RespuestasEncuestaPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-6 flex-1 w-full">
          <Routes>
            <Route path="/" element={<LegacyEncuestaPage />} />
            <Route path="/admin" element={<AdminEncuestasPage />} />
            <Route path="/admin/encuestas/nueva" element={<EncuestaBuilderPage />} />
            <Route path="/admin/encuestas/:id" element={<EncuestaBuilderPage />} />
            <Route path="/admin/encuestas/:id/respuestas" element={<RespuestasEncuestaPage />} />
            <Route path="/estadisticas/:id" element={<EstadisticasEncuestaPage />} />
            <Route path="/responder" element={<SeleccionarEncuestaPage />} />
            <Route path="/responder/:id" element={<ResponderEncuestaPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t py-4 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            © 2026 Alcaldía de Barranquilla - IQNET ISO 9001
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}
