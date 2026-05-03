import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { listarEncuestasAbiertas } from '@/services/encuestasService'
import { ArrowRight } from 'lucide-react'

export default function SeleccionarEncuestaPage() {
  const [encuestas, setEncuestas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await listarEncuestasAbiertas()
      setEncuestas(data)
      setLoading(false)
    })()
  }, [])

  return (
    <>
      <h2 className="text-xl font-semibold mb-6">Encuestas disponibles</h2>
      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : encuestas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay encuestas abiertas en este momento.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {encuestas.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{e.nombre}</CardTitle>
                <p className="text-xs font-medium text-primary/90 mt-1.5 leading-snug">
                  Tipo de test: {e.tipo_test || 'No aplica'}
                </p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {e.descripcion || 'Sin descripción.'}
                </p>
                {e.fecha_cierre && (
                  <p className="text-xs text-muted-foreground">
                    Cierra: {new Date(e.fecha_cierre).toLocaleString()}
                  </p>
                )}
                <Button asChild className="mt-auto gap-1">
                  <Link to={`/responder/${e.id}`}>
                    Responder <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
