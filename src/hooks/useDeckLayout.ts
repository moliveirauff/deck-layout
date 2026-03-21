import { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../stores/useProjectStore'
import { useDeckLayoutStore } from '../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../stores/useEquipmentStore'
import { useCraneStore, type CraneToggle } from '../stores/useCraneStore'
import { validatePlacement, type ValidationResult, type EquipPlacement } from '../lib/calculations/deckValidation'
import { calculateCraneRadius } from '../lib/calculations/crane/calculateCraneRadius'
import { calculateBoomAngle } from '../lib/calculations/crane/calculateBoomAngle'
import { interpolateCraneCurve } from '../lib/calculations/crane/interpolateCraneCurve'
import { calculateSlewAngle, isSlewInRange } from '../lib/calculations/crane/calculateSlewAngle'
import type { EquipmentLibrary, CraneCurvePoint } from '../types/database'

const SNAP_SIZE = 0.5

type UndoEntry = { id: string; x: number; y: number }

export type CraneInfo = {
  radiusM: number
  boomAngleDeg: number | null
  capacityT: number
  weightT: number
  utilizationPct: number
  slewDeg: number
  slewOk: boolean
  reachOk: boolean
  capacityOk: boolean
  ok: boolean
}

export type DeckLayoutState = ReturnType<typeof useDeckLayout>

export function useDeckLayout() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const craneStore = useCraneStore()

  const [showGrid, setShowGrid] = useState(true)
  const [snap, setSnap] = useState(false)
  const [craneToggle, setCraneToggle] = useState<CraneToggle | 'both'>('deck')
  const undoStack = useRef<UndoEntry[]>([])

  // Load deck placements and equipment library on mount
  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Delete-key and Ctrl+Z keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === 'Delete' && deckStore.selectedEquipmentId) {
        void handleRemove(deckStore.selectedEquipmentId)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        void handleUndo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deckStore.selectedEquipmentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const vessel = activeProject?.vessel_snapshot?.vessel ?? null
  const barriers = useMemo(() => activeProject?.vessel_snapshot?.barriers ?? [], [activeProject])
  const zones = useMemo(() => activeProject?.vessel_snapshot?.deck_load_zones ?? [], [activeProject])
  const craneCurve = useMemo<CraneCurvePoint[]>(() => activeProject?.vessel_snapshot?.crane_curve_points ?? [], [activeProject])

  const libById = useMemo<Record<string, EquipmentLibrary>>(() => {
    const m: Record<string, EquipmentLibrary> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  // Build placement structs (for validation)
  const placements = useMemo<Array<EquipPlacement & { id: string }>>(() =>
    deckStore.items.flatMap((pe) => {
      const eq = libById[pe.equipment_id]
      if (!eq) return []
      return [{ id: pe.id, cx: pe.deck_pos_x, cy: pe.deck_pos_y, halfL: eq.length_m / 2, halfW: eq.width_m / 2, rotDeg: pe.deck_rotation_deg, weightT: eq.dry_weight_t }]
    }),
  [deckStore.items, libById])

  // Recompute validation for all placed items
  const validationMap = useMemo<Record<string, ValidationResult>>(() => {
    if (!vessel) return {}
    const map: Record<string, ValidationResult> = {}
    for (const p of placements) {
      const others = placements.filter((o) => o.id !== p.id)
      map[p.id] = validatePlacement(p, vessel.deck_length_m, vessel.deck_width_m, barriers, zones, others)
    }
    return map
  }, [placements, vessel, barriers, zones])

  // Compute crane info for the selected item
  const computeCraneInfo = useCallback((targetX: number, targetY: number, weightT: number): CraneInfo | null => {
    if (!vessel) return null
    const radiusM = calculateCraneRadius(vessel.crane_pedestal_x, vessel.crane_pedestal_y, targetX, targetY)
    const boomAngleDeg = calculateBoomAngle(radiusM, vessel.crane_boom_length_m)
    const capacityT = interpolateCraneCurve(craneCurve, radiusM)
    const slewDeg = calculateSlewAngle(vessel.crane_pedestal_x, vessel.crane_pedestal_y, targetX, targetY)
    const slewOk = isSlewInRange(slewDeg, vessel.crane_slew_min_deg, vessel.crane_slew_max_deg)
    const maxR = craneCurve.length > 0 ? craneCurve[craneCurve.length - 1].radius_m : vessel.crane_boom_length_m
    const reachOk = radiusM <= maxR
    const capacityOk = capacityT >= weightT
    const utilizationPct = capacityT > 0 ? (weightT / capacityT) * 100 : 100
    return { radiusM, boomAngleDeg, capacityT, weightT, utilizationPct, slewDeg, slewOk, reachOk, capacityOk, ok: slewOk && reachOk && capacityOk }
  }, [vessel, craneCurve])

  const selectedItem = deckStore.items.find((i) => i.id === deckStore.selectedEquipmentId)
  const selectedEq = selectedItem ? libById[selectedItem.equipment_id] : null

  const craneDeckInfo = useMemo<CraneInfo | null>(() => {
    if (!selectedItem || !selectedEq) return null
    return computeCraneInfo(selectedItem.deck_pos_x, selectedItem.deck_pos_y, selectedEq.dry_weight_t)
  }, [selectedItem, selectedEq, computeCraneInfo])

  const craneOverboardInfo = useMemo<CraneInfo | null>(() => {
    if (!selectedItem || !selectedEq) return null
    if (selectedItem.overboard_pos_x == null || selectedItem.overboard_pos_y == null) return null
    return computeCraneInfo(selectedItem.overboard_pos_x, selectedItem.overboard_pos_y, selectedEq.dry_weight_t)
  }, [selectedItem, selectedEq, computeCraneInfo])

  function snapCoord(v: number) {
    return snap ? Math.round(v / SNAP_SIZE) * SNAP_SIZE : v
  }

  const handleDrop = useCallback(async (equipId: string, rawX: number, rawY: number) => {
    if (!projectId) return
    await deckStore.addToProject({
      project_id: projectId,
      equipment_id: equipId,
      label: null,
      deck_pos_x: snapCoord(rawX),
      deck_pos_y: snapCoord(rawY),
      deck_rotation_deg: 0,
      overboard_pos_x: null,
      overboard_pos_y: null,
      crane_slew_deck_deg: null,
      crane_boom_angle_deck_deg: null,
      crane_radius_deck_m: null,
      crane_capacity_deck_t: null,
      crane_slew_overboard_deg: null,
      crane_boom_angle_overboard_deg: null,
      crane_radius_overboard_m: null,
      crane_capacity_overboard_t: null,
      deck_load_ok: null,
      capacity_check_deck_ok: null,
      capacity_check_overboard_ok: null,
    })
  }, [projectId, deckStore, snap]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMove = useCallback(async (id: string, rawX: number, rawY: number) => {
    const item = deckStore.items.find((i) => i.id === id)
    if (item) undoStack.current = [...undoStack.current.slice(-19), { id, x: item.deck_pos_x, y: item.deck_pos_y }]
    const x = snapCoord(rawX)
    const y = snapCoord(rawY)
    // Compute deck_load_ok inline using current validation (optimistic)
    const eq = libById[deckStore.items.find((i) => i.id === id)?.equipment_id ?? '']
    const others = placements.filter((p) => p.id !== id)
    const vr = eq && vessel ? validatePlacement({ cx: x, cy: y, halfL: eq.length_m / 2, halfW: eq.width_m / 2, rotDeg: deckStore.items.find((i) => i.id === id)?.deck_rotation_deg ?? 0, weightT: eq.dry_weight_t }, vessel.deck_length_m, vessel.deck_width_m, barriers, zones, others) : null

    // Compute crane data for deck position
    const craneInfo = eq && vessel ? computeCraneInfo(x, y, eq.dry_weight_t) : null

    await deckStore.updatePosition(id, {
      deck_pos_x: x,
      deck_pos_y: y,
      deck_load_ok: vr?.deckLoadOk ?? null,
      crane_radius_deck_m: craneInfo?.radiusM ?? null,
      crane_slew_deck_deg: craneInfo?.slewDeg ?? null,
      crane_boom_angle_deck_deg: craneInfo?.boomAngleDeg ?? null,
      crane_capacity_deck_t: craneInfo?.capacityT ?? null,
      capacity_check_deck_ok: craneInfo?.capacityOk ?? null,
    })
  }, [deckStore, libById, placements, vessel, barriers, zones, snap, computeCraneInfo]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleOverboardMove = useCallback(async (id: string, rawX: number, rawY: number) => {
    const x = snapCoord(rawX)
    const y = snapCoord(rawY)
    const eq = libById[deckStore.items.find((i) => i.id === id)?.equipment_id ?? '']
    const craneInfo = eq && vessel ? computeCraneInfo(x, y, eq.dry_weight_t) : null

    await craneStore.updateOverboardPosition(id, {
      overboard_pos_x: x,
      overboard_pos_y: y,
      crane_radius_overboard_m: craneInfo?.radiusM ?? null,
      crane_slew_overboard_deg: craneInfo?.slewDeg ?? null,
      crane_boom_angle_overboard_deg: craneInfo?.boomAngleDeg ?? null,
      crane_capacity_overboard_t: craneInfo?.capacityT ?? null,
      capacity_check_overboard_ok: craneInfo?.capacityOk ?? null,
    })

    // Reload items so UI reflects the persisted overboard position
    const pid = deckStore.items[0]?.project_id
    if (pid) void deckStore.loadProjectEquipment(pid)
  }, [deckStore, libById, vessel, snap, computeCraneInfo, craneStore]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRotate = useCallback(async (id: string, deg: number) => {
    await deckStore.updateRotation(id, deg)
  }, [deckStore])

  const handleRemove = useCallback(async (id: string) => {
    const eq = libById[deckStore.items.find((i) => i.id === id)?.equipment_id ?? '']
    const name = eq?.name ?? 'this equipment'
    if (!window.confirm(`Remove "${name}" from deck?\nThis will also delete any analysis results for this item.`)) return
    await deckStore.removeFromProject(id)
  }, [deckStore, libById])

  const handleUndo = useCallback(async () => {
    const entry = undoStack.current.pop()
    if (!entry) return
    await deckStore.updatePosition(entry.id, { deck_pos_x: entry.x, deck_pos_y: entry.y })
  }, [deckStore])

  return {
    vessel, barriers, zones, craneCurve,
    placed: deckStore.items,
    library: equipStore.items,
    libById,
    validationMap,
    selectedId: deckStore.selectedEquipmentId,
    setSelectedId: deckStore.setSelectedEquipment,
    showGrid, setShowGrid,
    snap, setSnap,
    craneToggle, setCraneToggle,
    craneDeckInfo, craneOverboardInfo,
    selectedItem, selectedEq,
    handleDrop, handleMove, handleOverboardMove, handleRotate, handleRemove, handleUndo,
    isLoading: deckStore.isLoading || equipStore.isLoading,
  }
}
