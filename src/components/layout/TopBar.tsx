import { NavLink } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/vessels', label: 'Vessels' },
  { to: '/equipment', label: 'Equipment' },
  { to: '/projects', label: 'Projects' },
] as const

/** Persistent top bar rendered across all pages. */
export function TopBar() {
  return (
    <header className="flex h-12 flex-shrink-0 items-center bg-slate-900 px-6">
      {/* Logo */}
      <span className="mr-8 text-lg font-bold tracking-tight text-white">
        SubLift
      </span>

      {/* Primary navigation */}
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white',
              ].join(' ')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
