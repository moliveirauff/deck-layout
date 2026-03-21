import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { RaoTable, type RaoRow } from '../rao/RaoTable'
import { PasteDialog } from '../rao/PasteDialog'
import { RaoPlots } from '../rao/RaoPlots'
import { useRaoStore } from '../../stores/useRaoStore'

const DIRECTIONS = [
  { value: 0,   label: '0° — Head seas' },
  { value: 45,  label: '45° — Bow quartering' },
  { value: 90,  label: '90° — Beam seas (starboard)' },
  { value: 135, label: '135° — Stern quartering' },
  { value: 180, label: '180° — Following seas' },
  { value: 225, label: '225° — Stern quartering (port)' },
  { value: 270, label: '270° — Beam seas (port)' },
  { value: 315, label: '315° — Bow quartering (port)' },
]

const BEAM_SEAS_PRESET: RaoRow[] = [
  { wave_period_s: 4,  heave_amplitude_m_per_m: 0.02, heave_phase_deg: 0,   roll_amplitude_deg_per_m: 0.5, roll_phase_deg: 0,   pitch_amplitude_deg_per_m: 0.10, pitch_phase_deg: 0   },
  { wave_period_s: 5,  heave_amplitude_m_per_m: 0.05, heave_phase_deg: 10,  roll_amplitude_deg_per_m: 1.2, roll_phase_deg: 15,  pitch_amplitude_deg_per_m: 0.25, pitch_phase_deg: 12  },
  { wave_period_s: 6,  heave_amplitude_m_per_m: 0.10, heave_phase_deg: 25,  roll_amplitude_deg_per_m: 2.1, roll_phase_deg: 30,  pitch_amplitude_deg_per_m: 0.50, pitch_phase_deg: 28  },
  { wave_period_s: 7,  heave_amplitude_m_per_m: 0.20, heave_phase_deg: 45,  roll_amplitude_deg_per_m: 3.5, roll_phase_deg: 50,  pitch_amplitude_deg_per_m: 0.80, pitch_phase_deg: 42  },
  { wave_period_s: 8,  heave_amplitude_m_per_m: 0.35, heave_phase_deg: 65,  roll_amplitude_deg_per_m: 4.8, roll_phase_deg: 72,  pitch_amplitude_deg_per_m: 1.10, pitch_phase_deg: 60  },
  { wave_period_s: 9,  heave_amplitude_m_per_m: 0.55, heave_phase_deg: 85,  roll_amplitude_deg_per_m: 5.5, roll_phase_deg: 88,  pitch_amplitude_deg_per_m: 1.30, pitch_phase_deg: 78  },
  { wave_period_s: 10, heave_amplitude_m_per_m: 0.70, heave_phase_deg: 100, roll_amplitude_deg_per_m: 5.2, roll_phase_deg: 98,  pitch_amplitude_deg_per_m: 1.20, pitch_phase_deg: 90  },
  { wave_period_s: 11, heave_amplitude_m_per_m: 0.80, heave_phase_deg: 115, roll_amplitude_deg_per_m: 4.5, roll_phase_deg: 108, pitch_amplitude_deg_per_m: 1.00, pitch_phase_deg: 100 },
  { wave_period_s: 12, heave_amplitude_m_per_m: 0.85, heave_phase_deg: 130, roll_amplitude_deg_per_m: 3.8, roll_phase_deg: 120, pitch_amplitude_deg_per_m: 0.80, pitch_phase_deg: 112 },
  { wave_period_s: 13, heave_amplitude_m_per_m: 0.82, heave_phase_deg: 145, roll_amplitude_deg_per_m: 3.0, roll_phase_deg: 135, pitch_amplitude_deg_per_m: 0.60, pitch_phase_deg: 125 },
  { wave_period_s: 14, heave_amplitude_m_per_m: 0.75, heave_phase_deg: 160, roll_amplitude_deg_per_m: 2.5, roll_phase_deg: 150, pitch_amplitude_deg_per_m: 0.45, pitch_phase_deg: 140 },
  { wave_period_s: 15, heave_amplitude_m_per_m: 0.65, heave_phase_deg: 172, roll_amplitude_deg_per_m: 2.0, roll_phase_deg: 162, pitch_amplitude_deg_per_m: 0.35, pitch_phase_deg: 155 },
  { wave_period_s: 16, heave_amplitude_m_per_m: 0.55, heave_phase_deg: 180, roll_amplitude_deg_per_m: 1.6, roll_phase_deg: 170, pitch_amplitude_deg_per_m: 0.28, pitch_phase_deg: 165 },
  { wave_period_s: 18, heave_amplitude_m_per_m: 0.40, heave_phase_deg: 185, roll_amplitude_deg_per_m: 1.0, roll_phase_deg: 178, pitch_amplitude_deg_per_m: 0.18, pitch_phase_deg: 175 },
  { wave_period_s: 20, heave_amplitude_m_per_m: 0.30, heave_phase_deg: 188, roll_amplitude_deg_per_m: 0.7, roll_phase_deg: 182, pitch_amplitude_deg_per_m: 0.12, pitch_phase_deg: 180 },
]

type Props = {
  /** Null when creating a new vessel (vessel not yet saved). */
  vesselId: string | null
}

/**
 * RAO tab in the Vessel Editor.
 * Saves RAO data linked to vessel_id so every project using this vessel
 * can auto-copy these entries at creation time.
 * Crane tip motion results live in project context (Analysis page).
 */
export function VesselRaoTab({ vesselId }: Props) {
  const raoStore = useRaoStore()

  const [direction, setDirection] = useState(270)
  const [rows, setRows] = useState<RaoRow[]>([])
  const [pasteOpen, setPasteOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load vessel RAO data on mount / when vesselId becomes available
  useEffect(() => {
    if (!vesselId) return
    void raoStore.loadVesselRaos(vesselId)
    return () => raoStore.clearVesselRaos()
  }, [vesselId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Populate table when stored entries or selected direction changes
  useEffect(() => {
    const filtered = raoStore.vesselEntries.filter((e) => e.wave_direction_deg === direction)
    setRows(
      filtered.length > 0
        ? filtered.map(({ wave_period_s, heave_amplitude_m_per_m, heave_phase_deg, roll_amplitude_deg_per_m, roll_phase_deg, pitch_amplitude_deg_per_m, pitch_phase_deg }) => ({
            wave_period_s, heave_amplitude_m_per_m, heave_phase_deg, roll_amplitude_deg_per_m, roll_phase_deg, pitch_amplitude_deg_per_m, pitch_phase_deg,
          }))
        : [],
    )
    setSaved(false)
  }, [raoStore.vesselEntries, direction])

  if (!vesselId) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Save the vessel first, then return here to enter RAO data.
      </div>
    )
  }

  if (raoStore.isVesselLoading) {
    return (
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-52" />
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-24" />)}
        </div>
        <div className="rounded border border-gray-200 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2 border-b border-gray-100 px-3 py-2">
              {Array.from({ length: 7 }).map((__, j) => <Skeleton key={j} className="h-4 flex-1" />)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function buildFullEntries() {
    const otherDirs = raoStore.vesselEntries
      .filter((e) => e.wave_direction_deg !== direction)
      .map(({ wave_direction_deg, wave_period_s, heave_amplitude_m_per_m, heave_phase_deg, roll_amplitude_deg_per_m, roll_phase_deg, pitch_amplitude_deg_per_m, pitch_phase_deg }) => ({
        wave_direction_deg, wave_period_s, heave_amplitude_m_per_m, heave_phase_deg, roll_amplitude_deg_per_m, roll_phase_deg, pitch_amplitude_deg_per_m, pitch_phase_deg,
      }))
    const currentDir = rows.map((r) => ({ wave_direction_deg: direction, ...r }))
    return [...otherDirs, ...currentDir]
  }

  async function handleSave() {
    if (!vesselId) return
    const fullEntries = buildFullEntries().filter((r) => r.wave_period_s > 0)
    await raoStore.saveVesselRaos(vesselId, fullEntries)
    setSaved(true)
  }

  function handlePreset() {
    setRows(BEAM_SEAS_PRESET)
    setDirection(270)
    setSaved(false)
  }

  // RaoPlots expects RaoEntry[] (has id/project_id/created_at); we satisfy the shape
  // with placeholder strings since those fields are unused by the chart logic.
  const plotEntries = raoStore.vesselEntries.map((e) => ({
    id: e.id,
    project_id: e.vessel_id,
    created_at: e.created_at,
    wave_direction_deg: e.wave_direction_deg,
    wave_period_s: e.wave_period_s,
    heave_amplitude_m_per_m: e.heave_amplitude_m_per_m,
    heave_phase_deg: e.heave_phase_deg,
    roll_amplitude_deg_per_m: e.roll_amplitude_deg_per_m,
    roll_phase_deg: e.roll_phase_deg,
    pitch_amplitude_deg_per_m: e.pitch_amplitude_deg_per_m,
    pitch_phase_deg: e.pitch_phase_deg,
  }))

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Wave Direction</label>
        <select
          value={direction}
          onChange={(e) => setDirection(parseInt(e.target.value))}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {DIRECTIONS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>

        <div className="flex gap-2 ml-auto flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}>
            Paste from Clipboard
          </Button>
          <Button variant="outline" size="sm" onClick={handlePreset}>
            Quick Preset (Beam Seas)
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setRows([]); setSaved(false) }}>
            Clear
          </Button>
          <Button size="sm" onClick={handleSave} disabled={raoStore.isVesselSaving}>
            {raoStore.isVesselSaving ? 'Saving…' : 'Save RAOs'}
          </Button>
        </div>
      </div>

      {saved && <p className="text-xs text-green-600">RAO data saved successfully.</p>}
      {raoStore.vesselError && <p className="text-xs text-red-600">{raoStore.vesselError}</p>}

      <RaoTable rows={rows} onChange={(r) => { setRows(r); setSaved(false) }} />

      <div className="space-y-2 pt-2">
        <p className="text-sm font-semibold text-gray-700">RAO Plots</p>
        <RaoPlots entries={plotEntries} />
      </div>

      <PasteDialog
        open={pasteOpen}
        onClose={() => setPasteOpen(false)}
        onPaste={(r) => { setRows(r); setSaved(false) }}
      />
    </div>
  )
}
