import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Pon en `true` para volver a mostrar el acceso a la pantalla legacy en el menú. */
const MOSTRAR_NAV_LEGACY = false

const navLinksAll = [
  { to: '/legacy', label: 'Legacy', end: true, soloSiLegacyVisible: true },
  { to: '/admin', label: 'Administración' },
  { to: '/responder', label: 'Responder' },
]

const navLinks = navLinksAll.filter(
  (link) => !link.soloSiLegacyVisible || MOSTRAR_NAV_LEGACY
)

export function Header() {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            AB
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Alcaldía de Barranquilla</h1>
            <p className="text-sm text-muted-foreground">Plataforma de encuestas</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
