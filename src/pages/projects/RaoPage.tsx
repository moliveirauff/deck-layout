import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRaoStore } from '../../stores/useRaoStore'
import { RaoTable, type RaoRow } from '../../components/rao/RaoTable'
import { RaoPlots } from '../../components/rao/RaoPlots'
import { CraneTipResults } from '../../components/rao/CraneTipResults'
import { PasteDialog } from '../../components/rao/PasteDialog'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import type { RaoEntryInsert } from '../../types/database'

const DEFAULT_DIRECTION = 270 // Beam seas

/**
 * RAO page — project-level vessel motion data.
 * Allows editing/importing RAO table and viewing crane tip motion results.
 */
export default function RaoPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const raoStore = useRaoStore()

  const [rows, setRows] = useState<RaoRow[]>([])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'table' | 'plots' | 'crane-tip'>('table')

  const vessel = activeProject?.vessel_snapshot?.vessel ?? null

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    void raoStore.loadRaos(projectId)
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Populate table when store loads
  useEffect(() => {
    const dirEntries = raoStore.entries.filter(
      (e) => e.wave_direction_deg === DEFAULT_DIRECTION,
    )
    if (dirEntries.length > 0) {
      const tableRows: RaoRow[] = dirEntries.map((e) => ({
        wave_period_s: e.wave_period_s,
        heave_amplitude_m_per_m: e.heave_amplitude_m_per_m,
        heave_phase_deg: e.heave_phase_deg,
        roll_amplitude_deg_per_m: e.roll_amplitude_deg_per_m,
        roll_phase_deg: e.roll_phase_deg,
        pitch_amplitude_deg_per_m: e.pitch_amplitude_deg_per_m,
        pitch_phase_deg: e.pitch_phase_deg,
      }))
      setRows(tableRows)
    }
  }, [raoStore.entries])

  const libById = useMemo(() => {
    const m: Record<string, typeof equipStore.items[0]> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  async function handleSave() {
    if (!projectId) return
    const inserts: Omit<RaoEntryInsert, 'project_id'>[] = rows.map((r) => ({
      wave_direction_deg: DEFAULT_DIRECTION,
      wave_period_s: r.wave_period_s,
      heave_amplitude_m_per_m: r.heave_amplitude_m_per_m,
      heave_phase_deg: r.heave_phase_deg,
      roll_amplitude_deg_per_m: r.roll_amplitude_deg_per_m,
      roll_phase_deg: r.roll_phase_deg,
      pitch_amplitude_deg_per_m: r.pitch_amplitude_deg_per_m,
      pitch_phase_deg: r.pitch_phase_deg,
    }))
    await raoStore.saveRaos(projectId, inserts)
    setSaved(true)
  }

  const isLoading = raoStore.isLoading || deckStore.isLoading || equipStore.isLoading

  const tabs: Array<{ key: typeof activeTab; label: string }> = [
    { key: 'table', label: 'RAO Table' },
    { key: 'plots', label: 'Response Plots' },
    { key: 'crane-tip', label: 'Crane Tip Motion' },
  ]

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">RAO — Vessel Motion</h1>
            <p className="mt-1 text-sm text-gray-500">
              Response Amplitude Operators for beam seas ({DEFAULT_DIRECTION}°). Used by splash zone and stability analysis.
            </p>
          </div>
          {activeTab === 'table' && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
                Paste from Excel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={raoStore.isSaving || rows.length === 0}>
                {raoStore.isSaving ? 'Saving…' : 'Save RAOs'}
              </Button>
              {saved && !raoStore.isSaving && (
                <span className="text-xs text-green-600">Saved</span>
              )}
            </div>
          )}
        </div>

        {/* Errors */}
        {raoStore.error && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {raoStore.error}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                activeTab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {activeTab === 'table' && (
              <div className="space-y-3">
                {rows.length === 0 && (
                  <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    No RAO data yet. Paste from Excel or add rows manually. RAOs are required for splash zone analysis.
                  </div>
                )}
                <RaoTable rows={rows} onChange={(r) => { setRows(r); setSaved(false) }} />
              </div>
            )}

            {activeTab === 'plots' && (
              <RaoPlots entries={raoStore.entries} />
            )}

            {activeTab === 'crane-tip' && vessel && (
              <CraneTipResults
                raoEntries={raoStore.entries}
                placed={deckStore.items}
                libById={libById}
                vessel={vessel}
              />
            )}

            {activeTab === 'crane-tip' && !vessel && (
              <p className="text-sm text-gray-400">No vessel snapshot found for this project.</p>
            )}
          </>
        )}
      </div>

      {/* Paste dialog */}
      <PasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onPaste={(r) => { setRows(r); setSaved(false); setPasteOpen(false) }}
      />
    </div>
  )
}
