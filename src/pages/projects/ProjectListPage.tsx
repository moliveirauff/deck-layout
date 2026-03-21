import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { useProjectStore } from '../../stores/useProjectStore'
import { loadEquipmentCountsByProject } from '../../lib/supabase/projectEquipmentService'
import { isDatabaseEmpty, seedDemoData } from '../../lib/supabase/seedService'
import { resetAllData } from '../../lib/supabase/resetService'
import type { Project, ProjectStatus } from '../../types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

const STATUS_BADGE: Record<ProjectStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  analyzed: 'bg-amber-100 text-amber-700',
  complete: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft: '● Draft',
  analyzed: '● Analyzed',
  complete: '● Complete',
}

// ─── ProjectCard ──────────────────────────────────────────────────────────────

type CardProps = {
  project: Project
  equipmentCount: number
  onOpen: () => void
  onDelete: () => void
}

function ProjectCard({ project, equipmentCount, onOpen, onDelete }: CardProps) {
  const vesselName = project.vessel_snapshot?.vessel.name ?? '—'
  const craneType = project.vessel_snapshot?.vessel.crane_type ?? '—'
  const deckL = project.vessel_snapshot?.vessel.deck_length_m
  const deckW = project.vessel_snapshot?.vessel.deck_width_m

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">{project.name}</h2>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[project.status]}`}>
          {STATUS_LABEL[project.status]}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-600">
        Vessel: <span className="font-medium">{vesselName}</span>
        {craneType !== '—' && ` (${craneType.toUpperCase()})`}
        {deckL != null && deckW != null && ` — ${deckL}×${deckW} m`}
      </p>

      <p className="text-sm text-gray-500">
        {project.field_name ? `Field: ${project.field_name}` : 'No field'}
        {project.water_depth_m != null ? ` | ${project.water_depth_m} m` : ''}
      </p>

      <p className="mt-1 text-xs text-gray-400">
        {equipmentCount} item{equipmentCount !== 1 ? 's' : ''} ·{' '}
        Last modified {formatRelativeTime(project.updated_at)}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <Button size="sm" onClick={onOpen}>Open</Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectListPage() {
  const navigate = useNavigate()
  const { projects, isLoading, error, loadProjects, deleteProject } = useProjectStore()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [dbEmpty, setDbEmpty] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [showResetInput, setShowResetInput] = useState(false)

  useEffect(() => {
    void loadProjects()
    void isDatabaseEmpty().then(setDbEmpty)
  }, [loadProjects])

  useEffect(() => {
    if (projects.length === 0) return
    void loadEquipmentCountsByProject(projects.map((p) => p.id)).then(({ data }) => {
      if (data) setCounts(data)
    })
  }, [projects])

  async function handleDelete(project: Project) {
    if (!window.confirm(
      `Delete "${project.name}"?\n\nThis will permanently delete all equipment placements, RAOs, analysis results, and weather data for this project.`
    )) return
    await deleteProject(project.id)
  }

  async function handleSeed() {
    setSeeding(true)
    setSeedError(null)
    const result = await seedDemoData()
    if (!result.ok) {
      setSeedError(result.error ?? 'Unknown error — check browser console for details.')
      setSeeding(false)
      return
    }
    window.location.reload()
  }

  function handleResetClick() {
    if (!window.confirm(
      'Are you sure you want to delete ALL data?\n\nThis will permanently remove every vessel, equipment item, project, and all associated records.'
    )) return
    setShowResetInput(true)
    setResetConfirmText('')
  }

  async function handleResetConfirmed() {
    if (resetConfirmText !== 'DELETE') return
    setResetting(true)
    const result = await resetAllData()
    if (!result.ok) {
      window.alert(`Reset failed: ${result.error}`)
      setResetting(false)
      return
    }
    window.location.reload()
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
          <Button onClick={() => navigate('/projects/new')}>+ New Project</Button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-1 h-4 w-2/5" />
                <Skeleton className="mt-1 h-3 w-1/3" />
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-7 w-14" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-center">
            <p className="text-sm text-gray-500">No projects yet.</p>
            <p className="mt-1 text-xs text-gray-400">Click &quot;+ New Project&quot; to create your first operation.</p>
            {dbEmpty && (
              <>
                <Button
                  className="mt-4"
                  onClick={handleSeed}
                  disabled={seeding}
                >
                  {seeding ? 'Loading Demo Data…' : 'Load Demo Data'}
                </Button>
                {seedError && (
                  <p className="mt-3 max-w-sm rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    Seed failed: {seedError}
                  </p>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                equipmentCount={counts[project.id] ?? 0}
                onOpen={() => navigate(`/projects/${project.id}`)}
                onDelete={() => handleDelete(project)}
              />
            ))}
          </div>
        )}

        {/* ── Danger Zone ──────────────────────────────────────────────────── */}
        <div className="mt-16 rounded-lg border border-red-200 bg-red-50/40 p-5">
          <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
          <p className="mt-1 text-xs text-red-600">
            Permanently delete all vessels, equipment, projects, and analysis data.
          </p>

          {!showResetInput ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-red-300 text-red-600 hover:bg-red-100 hover:text-red-700"
              onClick={handleResetClick}
              disabled={resetting}
            >
              Reset All Data
            </Button>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                className="rounded border border-red-300 px-2 py-1 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                placeholder='Type "DELETE" to confirm'
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                autoFocus
              />
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={handleResetConfirmed}
                disabled={resetConfirmText !== 'DELETE' || resetting}
              >
                {resetting ? 'Deleting…' : 'Confirm Delete'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowResetInput(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

