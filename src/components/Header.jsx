export function Header() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            AB
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Alcaldía de Barranquilla</h1>
            <p className="text-sm text-muted-foreground">Encuesta de Orientación Socio-Ocupacional</p>
          </div>
        </div>
      </div>
    </header>
  )
}
