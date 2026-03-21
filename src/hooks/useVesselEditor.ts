import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  loadVessel,
  loadVesselBarriers,
  loadDeckLoadZones,
  loadCraneCurve,
  saveVessel,
  saveVesselBarriers,
  saveDeckLoadZones,
  saveCraneCurve,
} from '../lib/supabase/vesselService'
import { refreshAllSnapshotsForVessel } from '../lib/supabase/projectService'
import { vesselSchema } from '../validation/schemas'
import type { Vessel, VesselType, CraneType } from '../types/database'

// ─── Row types (string-valued for input binding) ──────────────────────────────

export type VesselFormState = {
  name: string
  vessel_type: string
  description: string
  deck_length_m: string
  deck_width_m: string
  crane_type: string
  crane_pedestal_x: string
  crane_pedestal_y: string
  crane_pedestal_height_m: string
  crane_boom_length_m: string
  crane_jib_length_m: string
  crane_slew_min_deg: string
  crane_slew_max_deg: string
  // v2 crane fields
  crane_min_radius_m: string
  crane_max_hook_height_m: string
  // v2 vessel particulars
  lbp_m: string
  draft_operating_m: string
  beam_m: string
  displacement_t: string
  dp_class: string
  // v2 stability
  kg_lightship_m: string
  gm_min_m: string
  roll_natural_period_s: string
  pitch_natural_period_s: string
  deck_elevation_m: string
}

export type BarrierRow = {
  _key: string
  name: string
  x_m: string
  y_m: string
  length_m: string
  width_m: string
  height_m: string
}

export type ZoneRow = {
  _key: string
  name: string
  x_m: string
  y_m: string
  length_m: string
  width_m: string
  capacity_t_per_m2: string
}

export type CraneRow = {
  _key: string
  radius_m: string
  capacity_t: string
  boom_angle_deg: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_VESSEL: VesselFormState = {
  name: '', vessel_type: 'PLSV', description: '',
  deck_length_m: '', deck_width_m: '',
  crane_type: 'OMC',
  crane_pedestal_x: '0', crane_pedestal_y: '0', crane_pedestal_height_m: '',
  crane_boom_length_m: '', crane_jib_length_m: '',
  crane_slew_min_deg: '0', crane_slew_max_deg: '360',
  crane_min_radius_m: '', crane_max_hook_height_m: '',
  lbp_m: '', draft_operating_m: '', beam_m: '', displacement_t: '', dp_class: 'none',
  kg_lightship_m: '', gm_min_m: '', roll_natural_period_s: '', pitch_natural_period_s: '', deck_elevation_m: '',
}

function vesselToForm(v: Vessel): VesselFormState {
  return {
    name: v.name, vessel_type: v.vessel_type, description: v.description ?? '',
    deck_length_m: String(v.deck_length_m), deck_width_m: String(v.deck_width_m),
    crane_type: v.crane_type,
    crane_pedestal_x: String(v.crane_pedestal_x), crane_pedestal_y: String(v.crane_pedestal_y),
    crane_pedestal_height_m: String(v.crane_pedestal_height_m),
    crane_boom_length_m: String(v.crane_boom_length_m),
    crane_jib_length_m: v.crane_jib_length_m != null ? String(v.crane_jib_length_m) : '',
    crane_slew_min_deg: String(v.crane_slew_min_deg ?? 0),
    crane_slew_max_deg: String(v.crane_slew_max_deg ?? 360),
    crane_min_radius_m: v.crane_min_radius_m != null ? String(v.crane_min_radius_m) : '',
    crane_max_hook_height_m: v.crane_max_hook_height_m != null ? String(v.crane_max_hook_height_m) : '',
    lbp_m: v.lbp_m != null ? String(v.lbp_m) : '',
    draft_operating_m: v.draft_operating_m != null ? String(v.draft_operating_m) : '',
    beam_m: v.beam_m != null ? String(v.beam_m) : '',
    displacement_t: v.displacement_t != null ? String(v.displacement_t) : '',
    dp_class: v.dp_class ?? 'none',
    kg_lightship_m: v.kg_lightship_m != null ? String(v.kg_lightship_m) : '',
    gm_min_m: v.gm_min_m != null ? String(v.gm_min_m) : '',
    roll_natural_period_s: v.roll_natural_period_s != null ? String(v.roll_natural_period_s) : '',
    pitch_natural_period_s: v.pitch_natural_period_s != null ? String(v.pitch_natural_period_s) : '',
    deck_elevation_m: v.deck_elevation_m != null ? String(v.deck_elevation_m) : '',
  }
}

function validateBarrierRows(rows: BarrierRow[], deckLength: number, deckWidth: number): string[] {
  return rows.flatMap((b, i) => {
    const label = b.name.trim() || `Row ${i + 1}`
    const errs: string[] = []
    if (!b.name.trim()) errs.push(`Barrier ${i + 1}: Name is required`)
    const x = parseFloat(b.x_m)
    if (isNaN(x) || x < 0 || x > deckLength) errs.push(`Barrier "${label}": X must be 0–${deckLength} m`)
    const y = parseFloat(b.y_m)
    if (isNaN(y) || y < 0 || y > deckWidth) errs.push(`Barrier "${label}": Y must be 0–${deckWidth} m`)
    if (isNaN(parseFloat(b.length_m)) || parseFloat(b.length_m) <= 0) errs.push(`Barrier "${label}": Length must be > 0`)
    if (isNaN(parseFloat(b.width_m)) || parseFloat(b.width_m) <= 0) errs.push(`Barrier "${label}": Width must be > 0`)
    return errs
  })
}

function validateCraneRows(rows: CraneRow[]): string[] {
  const errs: string[] = []
  const valid = rows.filter((r) => parseFloat(r.radius_m) > 0 && parseFloat(r.capacity_t) > 0)
  if (valid.length < 2) errs.push('Crane curve requires at least 2 points with radius > 0 and capacity > 0')
  const radii = valid.map((r) => parseFloat(r.radius_m))
  if (new Set(radii).size !== radii.length) errs.push('Crane curve has duplicate radius values')
  return errs
}

function validateZoneRows(rows: ZoneRow[], deckLength: number, deckWidth: number): string[] {
  return rows.flatMap((z, i) => {
    const label = z.name.trim() || `Row ${i + 1}`
    const errs: string[] = []
    if (!z.name.trim()) errs.push(`Zone ${i + 1}: Name is required`)
    const x = parseFloat(z.x_m)
    if (isNaN(x) || x < 0 || x > deckLength) errs.push(`Zone "${label}": X must be 0–${deckLength} m`)
    const y = parseFloat(z.y_m)
    if (isNaN(y) || y < 0 || y > deckWidth) errs.push(`Zone "${label}": Y must be 0–${deckWidth} m`)
    if (isNaN(parseFloat(z.length_m)) || parseFloat(z.length_m) <= 0) errs.push(`Zone "${label}": Length must be > 0`)
    if (isNaN(parseFloat(z.width_m)) || parseFloat(z.width_m) <= 0) errs.push(`Zone "${label}": Width must be > 0`)
    if (isNaN(parseFloat(z.capacity_t_per_m2)) || parseFloat(z.capacity_t_per_m2) <= 0)
      errs.push(`Zone "${label}": Capacity must be > 0`)
    return errs
  })
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVesselEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === undefined

  const [values, setValues] = useState<VesselFormState>(DEFAULT_VESSEL)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [barriers, setBarriers] = useState<BarrierRow[]>([])
  const [zones, setZones] = useState<ZoneRow[]>([])
  const [cranePoints, setCranePoints] = useState<CraneRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    void Promise.all([loadVessel(id), loadVesselBarriers(id), loadDeckLoadZones(id), loadCraneCurve(id)]).then(
      ([vessel, barrs, zns, curve]) => {
        if (vessel.error) { setNotification({ msg: `Load failed: ${vessel.error}`, ok: false }); setLoading(false); return }
        if (vessel.data) setValues(vesselToForm(vessel.data))
        if (barrs.data) setBarriers(barrs.data.map((b) => ({
          _key: crypto.randomUUID(), name: b.name,
          x_m: String(b.x_m), y_m: String(b.y_m),
          length_m: String(b.length_m), width_m: String(b.width_m),
          height_m: String(b.height_m ?? 1),
        })))
        if (zns.data) setZones(zns.data.map((z) => ({
          _key: crypto.randomUUID(), name: z.name,
          x_m: String(z.x_m), y_m: String(z.y_m),
          length_m: String(z.length_m), width_m: String(z.width_m),
          capacity_t_per_m2: String(z.capacity_t_per_m2),
        })))
        if (curve.data) setCranePoints(curve.data.map((p) => ({
          _key: crypto.randomUUID(),
          radius_m: String(p.radius_m),
          capacity_t: String(p.capacity_t),
          boom_angle_deg: p.boom_angle_deg != null ? String(p.boom_angle_deg) : '',
        })))
        setLoading(false)
      },
    )
  }, [id])

  const handleChange = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }, [])

  async function handleSave() {
    setSaving(true)
    setFieldErrors({})
    setNotification(null)

    const raw = {
      name: values.name.trim(), vessel_type: values.vessel_type as VesselType,
      description: values.description.trim() || null,
      deck_length_m: parseFloat(values.deck_length_m), deck_width_m: parseFloat(values.deck_width_m),
      deck_origin_x: 0, deck_origin_y: 0,
      crane_type: values.crane_type as CraneType,
      crane_pedestal_x: parseFloat(values.crane_pedestal_x),
      crane_pedestal_y: parseFloat(values.crane_pedestal_y),
      crane_pedestal_height_m: parseFloat(values.crane_pedestal_height_m),
      crane_boom_length_m: parseFloat(values.crane_boom_length_m),
      crane_jib_length_m: values.crane_jib_length_m ? parseFloat(values.crane_jib_length_m) : null,
      crane_slew_min_deg: parseFloat(values.crane_slew_min_deg),
      crane_slew_max_deg: parseFloat(values.crane_slew_max_deg),
      // v2 crane fields
      crane_min_radius_m: values.crane_min_radius_m ? parseFloat(values.crane_min_radius_m) : null,
      crane_max_hook_height_m: values.crane_max_hook_height_m ? parseFloat(values.crane_max_hook_height_m) : null,
      // v2 vessel particulars
      lbp_m: values.lbp_m ? parseFloat(values.lbp_m) : null,
      draft_operating_m: values.draft_operating_m ? parseFloat(values.draft_operating_m) : null,
      beam_m: values.beam_m ? parseFloat(values.beam_m) : null,
      displacement_t: values.displacement_t ? parseFloat(values.displacement_t) : null,
      dp_class: values.dp_class || null,
      // v2 stability
      kg_lightship_m: values.kg_lightship_m ? parseFloat(values.kg_lightship_m) : null,
      gm_min_m: values.gm_min_m ? parseFloat(values.gm_min_m) : null,
      roll_natural_period_s: values.roll_natural_period_s ? parseFloat(values.roll_natural_period_s) : null,
      pitch_natural_period_s: values.pitch_natural_period_s ? parseFloat(values.pitch_natural_period_s) : null,
      deck_elevation_m: values.deck_elevation_m ? parseFloat(values.deck_elevation_m) : null,
    }

    const result = vesselSchema.safeParse(raw)
    if (!result.success) {
      const fe: Record<string, string> = {}
      result.error.errors.forEach((e) => { const f = e.path[0]?.toString(); if (f) fe[f] = e.message })
      setFieldErrors(fe)
      setNotification({ msg: 'Please fix the validation errors below.', ok: false })
      setSaving(false)
      return
    }

    const { deck_length_m, deck_width_m } = result.data
    const rowErrs = [
      ...validateBarrierRows(barriers, deck_length_m, deck_width_m),
      ...validateZoneRows(zones, deck_length_m, deck_width_m),
      ...validateCraneRows(cranePoints),
    ]
    if (rowErrs.length > 0) {
      setNotification({ msg: rowErrs.join(' · '), ok: false })
      setSaving(false)
      return
    }

    const validated = {
      ...result.data,
      description: result.data.description ?? null,
      crane_jib_length_m: result.data.crane_jib_length_m ?? null,
      crane_min_radius_m: raw.crane_min_radius_m,
      crane_max_hook_height_m: raw.crane_max_hook_height_m,
      lbp_m: raw.lbp_m,
      draft_operating_m: raw.draft_operating_m,
      beam_m: raw.beam_m,
      displacement_t: raw.displacement_t,
      dp_class: (raw.dp_class && raw.dp_class !== 'none') ? raw.dp_class as import('../types/database').DpClass : null,
      kg_lightship_m: raw.kg_lightship_m,
      gm_min_m: raw.gm_min_m,
      roll_natural_period_s: raw.roll_natural_period_s,
      pitch_natural_period_s: raw.pitch_natural_period_s,
      deck_elevation_m: raw.deck_elevation_m,
    }
    const { data: saved, error: vesselErr } = await saveVessel(isNew ? validated : { ...validated, id })
    if (vesselErr || !saved) { setNotification({ msg: `Save failed: ${vesselErr ?? 'unknown'}`, ok: false }); setSaving(false); return }

    const vid = saved.id
    const { error: barrErr } = await saveVesselBarriers(vid, barriers.map((b) => ({
      name: b.name.trim(), x_m: parseFloat(b.x_m), y_m: parseFloat(b.y_m),
      length_m: parseFloat(b.length_m), width_m: parseFloat(b.width_m),
      height_m: parseFloat(b.height_m) || 1.0,
    })))
    if (barrErr) { setNotification({ msg: `Barriers save failed: ${barrErr}`, ok: false }); setSaving(false); return }

    const { error: zoneErr } = await saveDeckLoadZones(vid, zones.map((z) => ({
      name: z.name.trim(), x_m: parseFloat(z.x_m), y_m: parseFloat(z.y_m),
      length_m: parseFloat(z.length_m), width_m: parseFloat(z.width_m),
      capacity_t_per_m2: parseFloat(z.capacity_t_per_m2),
    })))
    if (zoneErr) { setNotification({ msg: `Load zones save failed: ${zoneErr}`, ok: false }); setSaving(false); return }

    const sortedCranePoints = [...cranePoints]
      .filter((p) => parseFloat(p.radius_m) > 0 && parseFloat(p.capacity_t) > 0)
      .sort((a, b) => parseFloat(a.radius_m) - parseFloat(b.radius_m))
    const { error: curveErr } = await saveCraneCurve(vid, sortedCranePoints.map((p) => ({
      radius_m: parseFloat(p.radius_m),
      capacity_t: parseFloat(p.capacity_t),
      boom_angle_deg: p.boom_angle_deg ? parseFloat(p.boom_angle_deg) : null,
    })))
    if (curveErr) { setNotification({ msg: `Crane curve save failed: ${curveErr}`, ok: false }); setSaving(false); return }

    // Propagate changes to all projects that use this vessel
    if (!isNew) {
      void refreshAllSnapshotsForVessel(vid)
    }

    if (isNew) {
      navigate(`/vessels/${vid}`)
    } else {
      setNotification({ msg: 'Vessel saved — all project snapshots updated.', ok: true })
      setTimeout(() => setNotification(null), 3000)
    }
    setSaving(false)
  }

  return {
    isNew, loading, saving, notification,
    values, fieldErrors, handleChange,
    barriers, setBarriers,
    zones, setZones,
    cranePoints, setCranePoints,
    deckLength: parseFloat(values.deck_length_m) || 0,
    deckWidth: parseFloat(values.deck_width_m) || 0,
    handleSave,
  }
}
