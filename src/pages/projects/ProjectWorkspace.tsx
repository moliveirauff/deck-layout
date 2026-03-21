import { useEffect, useState } from 'react'
import { NavLink, Outlet, useParams } from 'react-router-dom'
import { LayoutDashboard, Map, Calculator, Box, FileText } from 'lucide-react'
import { useProjectStore } from '../../stores/useProjectStore'
import { Skeleton } from '../../components/ui/skeleton'
import { loadEquipmentCountsByProject } from '../../lib/supabase/projectEquipmentService'
import { ChatPanel } from '../../components/chat/ChatPanel'

type SidebarLink = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const SIDEBAR_LINKS: SidebarLink[] = [
  { to: '.', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: 'deck', label: 'Deck', icon: Map },
  { to: 'analysis', label: 'Analysis', icon: Calculator },
  { to: '3d', label: '3D', icon: Box },
  { to: 'report', label: 'Report', icon: FileText },
]

/**
 * Project workspace shell.
 * Loads the active project from Supabase on mount and renders a 180px sidebar
 * (nav with icons + project meta below) alongside the active sub-page via Outlet.
 */
export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>()
  const { activeProject, loadProject, clearActiveProject } = useProjectStore()
  const [equipmentCount, setEquipmentCount] = useState<number | null>(null)

  useEffect(() => {
    if (id) void loadProject(id)
    return () => clearActiveProject()
  }, [id, loadProject, clearActiveProject])

  useEffect(() => {
    if (id) {
      void loadEquipmentCountsByProject([id]).then(({ data }) => {
        if (data) setEquipmentCount(data[id] ?? 0)
      })
    }
  }, [id])

  const isLoaded = activeProject !== null && activeProject.id === id
  const vesselName = isLoaded ? (activeProject.vessel_snapshot?.vessel.name ?? '—') : null

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="flex w-[180px] flex-shrink-0 flex-col overflow-y-auto border-r border-slate-700 bg-slate-800">
        {/* Project name */}
        <div className="border-b border-slate-700 px-4 py-3">
          <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-400">Project</p>
          {isLoaded ? (
            <p className="mt-0.5 truncate text-sm font-semibold text-white" title={activeProject.name}>
              {activeProject.name}
            </p>
          ) : (
            <Skeleton className="mt-1 h-4 w-28 bg-slate-600" />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 px-2 py-3">
          {SIDEBAR_LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              relative="path"
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 rounded px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom meta — vessel, status, equipment count */}
        <div className="mt-auto border-t border-slate-700 px-4 py-3 space-y-1.5">
          {isLoaded ? (
            <>
              {vesselName && (
                <p className="truncate text-xs text-slate-400" title={vesselName}>{vesselName}</p>
              )}
              <span
                className={[
                  'inline-block rounded px-1.5 py-0.5 text-xs font-medium',
                  activeProject.status === 'complete'
                    ? 'bg-green-700 text-green-100'
                    : activeProject.status === 'analyzed'
                      ? 'bg-amber-700 text-amber-100'
                      : 'bg-slate-600 text-slate-200',
                ].join(' ')}
              >
                {activeProject.status}
              </span>
              {equipmentCount !== null && (
                <p className="text-xs text-slate-400">
                  {equipmentCount} item{equipmentCount !== 1 ? 's' : ''}
                </p>
              )}
            </>
          ) : (
            <>
              <Skeleton className="h-3 w-24 bg-slate-600" />
              <Skeleton className="mt-1.5 h-4 w-16 bg-slate-600" />
            </>
          )}
        </div>
      </aside>

      {/* ── Content area ── */}
      <div className="flex flex-1 flex-col overflow-auto">
        <Outlet />
      </div>

      {/* ── AI Chat ── */}
      {id && <ChatPanel projectId={id} />}
    </div>
  )
}
