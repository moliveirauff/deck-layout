import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ─── Environment ───────────────────────────────────────────────────────────────

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SubLift Assistant, an AI helper for the SubLift subsea lift planning tool. \
You help engineers analyze and modify equipment installation parameters. \
When asked to make changes, use the available tools. \
Always explain what you did and show the impact on results. \
When comparing scenarios, present results in a clear table format. \
You have deep knowledge of DNV-ST-N001 splash zone analysis, crane operations, and subsea installation engineering. \
Always respond in the same language the user writes in.`

// ─── Tool declarations (Gemini function-calling schema) ───────────────────────

const TOOL_DECLARATIONS = [
  // ── READ ──────────────────────────────────────────────────────────────────
  {
    name: 'get_project_summary',
    description:
      'Get project info, vessel details, and the full equipment list with current analysis status (max Hs, whether analyzed).',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'get_equipment_details',
    description:
      'Get dimensions, dry weight, geometry type, deck position, and overboard position for one equipment item.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
      },
      required: ['equipment_name'],
    },
  },
  {
    name: 'get_analysis_results',
    description:
      'Get splash-zone analysis results for one equipment item: max Hs, DAF, operability %, hydrodynamic coefficients.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
      },
      required: ['equipment_name'],
    },
  },
  {
    name: 'get_crane_capacity',
    description:
      'Get crane radius and available hook capacity for a specific equipment item in both deck and overboard positions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
      },
      required: ['equipment_name'],
    },
  },
  {
    name: 'get_sea_state_table',
    description:
      'Get the Hs × Tp operability table showing utilisation and feasibility status for each sea-state cell.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
      },
      required: ['equipment_name'],
    },
  },
  // ── MODIFY ────────────────────────────────────────────────────────────────
  {
    name: 'update_equipment_weight',
    description: 'Update the dry weight of one equipment item in the equipment library.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
        new_weight_t: { type: 'NUMBER', description: 'New dry weight in tonnes' },
      },
      required: ['equipment_name', 'new_weight_t'],
    },
  },
  {
    name: 'update_equipment_dimensions',
    description: 'Update the bounding-box dimensions of one equipment item (length, width, height).',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
        length_m: { type: 'NUMBER', description: 'New length in metres' },
        width_m: { type: 'NUMBER', description: 'New width in metres' },
        height_m: { type: 'NUMBER', description: 'New height in metres' },
      },
      required: ['equipment_name', 'length_m', 'width_m', 'height_m'],
    },
  },
  {
    name: 'move_equipment_on_deck',
    description: 'Move a piece of equipment to a new (x, y) deck position.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
        x: { type: 'NUMBER', description: 'New X coordinate on deck in metres (bow direction from stern)' },
        y: { type: 'NUMBER', description: 'New Y coordinate on deck in metres (port-to-starboard)' },
      },
      required: ['equipment_name', 'x', 'y'],
    },
  },
  {
    name: 'move_equipment_overboard',
    description: 'Set or update the overboard (splash-zone) position for a piece of equipment.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
        x: { type: 'NUMBER', description: 'Overboard X coordinate in metres' },
        y: { type: 'NUMBER', description: 'Overboard Y coordinate in metres' },
      },
      required: ['equipment_name', 'x', 'y'],
    },
  },
  // ── CALCULATION ───────────────────────────────────────────────────────────
  {
    name: 'run_splash_zone_analysis',
    description:
      'Run a full DNV-ST-N001 splash-zone analysis for one equipment item and persist the results to Supabase.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
      },
      required: ['equipment_name'],
    },
  },
  {
    name: 'run_all_analysis',
    description:
      'Run DNV splash-zone analysis for every equipment item that has an overboard position set. Returns a results summary.',
    parameters: { type: 'OBJECT', properties: {}, required: [] },
  },
  {
    name: 'compare_scenarios',
    description:
      'Simulate multiple values of one parameter (weight, length, width, or height) without saving, and compare the resulting max Hs, DAF, and operability in a table.',
    parameters: {
      type: 'OBJECT',
      properties: {
        equipment_name: { type: 'STRING', description: 'Name or label of the equipment item' },
        parameter: {
          type: 'STRING',
          description: 'Parameter to vary: "weight", "length", "width", or "height"',
        },
        values: {
          type: 'ARRAY',
          items: { type: 'NUMBER' },
          description: 'Array of numeric values to test for the chosen parameter',
        },
      },
      required: ['equipment_name', 'parameter', 'values'],
    },
  },
]

// ─── Hydrodynamic calculation helpers ─────────────────────────────────────────

function calcProjectedAreas(
  geometry: string,
  length: number,
  width: number,
  height: number,
) {
  if (geometry === 'cylinder') {
    const r = length / 2
    return {
      area_x_m2: 2 * r * height,
      area_y_m2: 2 * r * height,
      area_z_m2: Math.PI * r * r,
    }
  }
  return { area_x_m2: width * height, area_y_m2: length * height, area_z_m2: length * width }
}

function calcSubmergedVolume(geometry: string, length: number, width: number, height: number) {
  if (geometry === 'cylinder') return Math.PI * (length / 2) ** 2 * height
  return length * width * height
}

function calcDragCoeff(geometry: string) {
  return geometry === 'cylinder'
    ? { cd_x: 0.7, cd_y: 0.7, cd_z: 1.9 }
    : { cd_x: 1.3, cd_y: 1.3, cd_z: 1.9 }
}

function calcAddedMass(geometry: string) {
  return geometry === 'cylinder' ? 0.8 : 1.0
}

function calcSlammingCoeff(geometry: string) {
  return geometry === 'cylinder' ? Math.PI / 4 : 0.5 * 1.9
}

/**
 * Simplified crane-tip heave amplitude per metre of Hs.
 * Combines vessel heave RAO with pitch/roll contributions at the crane tip offset.
 */
function calcCraneTipHeavePerM(
  raoEntries: Array<Record<string, number>>,
  armX: number,
  armY: number,
): number {
  if (!raoEntries.length) return 0
  const n = raoEntries.length
  const avgHeave = raoEntries.reduce((s, r) => s + (r.heave_amplitude_m_per_m ?? 0), 0) / n
  const avgPitch = raoEntries.reduce((s, r) => s + (r.pitch_amplitude_deg_per_m ?? 0), 0) / n
  const avgRoll = raoEntries.reduce((s, r) => s + (r.roll_amplitude_deg_per_m ?? 0), 0) / n
  const pitchContrib = Math.abs(armX) * Math.sin((avgPitch * Math.PI) / 180)
  const rollContrib = Math.abs(armY) * Math.sin((avgRoll * Math.PI) / 180)
  return Math.sqrt(avgHeave ** 2 + pitchContrib ** 2 + rollContrib ** 2)
}

interface CellInput {
  hs_m: number
  tp_s: number
  cd_z: number
  ca: number
  cs: number
  area_z_m2: number
  volume_m3: number
  crane_tip_heave_per_m: number
  dry_weight_t: number
  crane_capacity_t: number
}

/** DNV-ST-N001 splash-zone cell calculation (simplified). */
function calcCell(p: CellInput) {
  const RHO = 1025
  const G = 9.81

  if (p.crane_capacity_t <= 0 || p.hs_m <= 0) {
    return { daf: 1, utilization_pct: 0, is_feasible: true }
  }

  const omega = (2 * Math.PI) / Math.max(p.tp_s, 1)
  const eta_max = (p.hs_m * 1.86) / 2 // crest height (extreme value)

  const v_water = omega * eta_max
  const v_crane = omega * p.crane_tip_heave_per_m * p.hs_m
  const v_rel = v_water + v_crane

  const Fd = 0.5 * RHO * p.cd_z * p.area_z_m2 * v_rel ** 2
  const Fa = p.ca * RHO * p.volume_m3 * omega ** 2 * eta_max
  const Fs = 0.5 * RHO * p.cs * p.area_z_m2 * v_rel ** 2

  const W_N = p.dry_weight_t * 1000 * G
  const daf = 1 + (Fd + Fa + Fs) / W_N
  const utilization_pct = (p.dry_weight_t * daf) / p.crane_capacity_t * 100

  return { daf, utilization_pct, is_feasible: utilization_pct < 100 }
}

// ─── Sea-state grid constants ──────────────────────────────────────────────────

const HS_STEPS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
const TP_STEPS = [4, 6, 8, 10, 12, 14, 16]

// ─── Database helpers ──────────────────────────────────────────────────────────

async function findEquipment(
  supabase: SupabaseClient,
  projectId: string,
  nameQuery: string,
) {
  const { data: placed } = await supabase
    .from('project_equipment')
    .select('*, equipment_library(*)')
    .eq('project_id', projectId)

  if (!placed?.length) return null
  const q = nameQuery.toLowerCase()
  const match = placed.find(
    (pe) =>
      (pe.label && pe.label.toLowerCase().includes(q)) ||
      pe.equipment_library?.name?.toLowerCase().includes(q),
  )
  if (!match) return null
  return {
    pe: match,
    eq: match.equipment_library as Record<string, number | string>,
    matchedName: (match.label ?? match.equipment_library?.name ?? nameQuery) as string,
  }
}

/** Run analysis for one found equipment item and persist results. */
async function runAnalysisForEquipment(
  supabase: SupabaseClient,
  projectId: string,
  found: { pe: Record<string, unknown>; eq: Record<string, number | string>; matchedName: string },
) {
  const { pe, eq } = found

  if (pe.overboard_pos_x == null || !pe.crane_capacity_overboard_t) {
    return { error: 'Equipment has no overboard position or crane capacity. Set these in Deck Layout first.' }
  }

  // RAOs
  const { data: raos } = await supabase
    .from('rao_entry')
    .select('*')
    .eq('project_id', projectId)

  // Vessel snapshot for crane position
  const { data: project } = await supabase
    .from('project')
    .select('vessel_snapshot')
    .eq('id', projectId)
    .single()
  const vessel = project?.vessel_snapshot?.vessel ?? {}

  const armX = (pe.overboard_pos_x as number) - (vessel.crane_pedestal_x ?? 0)
  const armY = (pe.overboard_pos_y as number) - (vessel.crane_pedestal_y ?? 0)
  const craneTipH = calcCraneTipHeavePerM(raos ?? [], armX, armY)

  const geometry = (eq.geometry_type as string) ?? 'box'
  const areas = calcProjectedAreas(
    geometry,
    eq.length_m as number,
    eq.width_m as number,
    eq.height_m as number,
  )
  const volume =
    (eq.submerged_volume_m3 as number) ??
    calcSubmergedVolume(geometry, eq.length_m as number, eq.width_m as number, eq.height_m as number)
  const cd = calcDragCoeff(geometry)
  const ca = calcAddedMass(geometry)
  const cs = calcSlammingCoeff(geometry)

  // Grid computation
  let maxHsM = 0
  let worstDaf = 1
  const cells: Array<{
    hs_m: number
    tp_s: number
    is_feasible: boolean
    utilization_pct: number
  }> = []

  for (const hs of HS_STEPS) {
    let hsAllFeasible = true
    for (const tp of TP_STEPS) {
      const cell = calcCell({
        hs_m: hs,
        tp_s: tp,
        cd_z: cd.cd_z,
        ca,
        cs,
        area_z_m2: areas.area_z_m2,
        volume_m3: volume,
        crane_tip_heave_per_m: craneTipH,
        dry_weight_t: eq.dry_weight_t as number,
        crane_capacity_t: pe.crane_capacity_overboard_t as number,
      })
      cells.push({ hs_m: hs, tp_s: tp, is_feasible: cell.is_feasible, utilization_pct: cell.utilization_pct })
      if (!cell.is_feasible) hsAllFeasible = false
      if (cell.daf > worstDaf) worstDaf = cell.daf
    }
    if (hsAllFeasible) maxHsM = hs
  }

  const now = new Date().toISOString()
  const resultPayload = {
    cd_x: cd.cd_x, cd_y: cd.cd_y, cd_z: cd.cd_z,
    ca, cs,
    projected_area_x_m2: areas.area_x_m2,
    projected_area_y_m2: areas.area_y_m2,
    projected_area_z_m2: areas.area_z_m2,
    submerged_volume_m3: volume,
    crane_tip_heave_m: craneTipH,
    crane_tip_lateral_m: 0,
    daf: worstDaf,
    max_hs_m: maxHsM,
    calculated_at: now,
  }

  // Upsert splash_zone_result
  const { data: existing } = await supabase
    .from('splash_zone_result')
    .select('id')
    .eq('project_equipment_id', pe.id)
    .maybeSingle()

  let resultId: string
  if (existing) {
    await supabase.from('splash_zone_result').update(resultPayload).eq('id', existing.id)
    resultId = existing.id as string
    await supabase.from('sea_state_limit').delete().eq('splash_zone_result_id', resultId)
  } else {
    const { data: inserted } = await supabase
      .from('splash_zone_result')
      .insert({ project_equipment_id: pe.id, ...resultPayload })
      .select('id')
      .single()
    resultId = inserted!.id as string
  }

  // Insert sea-state limits
  await supabase.from('sea_state_limit').insert(
    cells.map((c) => ({
      splash_zone_result_id: resultId,
      hs_m: c.hs_m,
      tp_s: c.tp_s,
      is_feasible: c.is_feasible,
      utilization_pct: c.utilization_pct,
    })),
  )

  const feasible = cells.filter((c) => c.is_feasible).length
  const operabilityPct = (feasible / cells.length) * 100

  return {
    success: true,
    equipment: found.matchedName,
    max_hs_m: maxHsM,
    daf: +worstDaf.toFixed(3),
    operability_pct: +operabilityPct.toFixed(1),
    crane_tip_heave_per_m: +craneTipH.toFixed(3),
    cd_z: cd.cd_z,
    ca,
    cs,
    area_z_m2: +areas.area_z_m2.toFixed(2),
    volume_m3: +volume.toFixed(2),
  }
}

// ─── Tool dispatcher ───────────────────────────────────────────────────────────

async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  supabase: SupabaseClient,
  projectId: string,
): Promise<Record<string, unknown>> {
  switch (name) {
    // ── READ ──────────────────────────────────────────────────────────────
    case 'get_project_summary': {
      const { data: project } = await supabase
        .from('project')
        .select('name, status, field_name, water_depth_m, vessel_snapshot')
        .eq('id', projectId)
        .single()

      const { data: placed } = await supabase
        .from('project_equipment')
        .select('id, label, equipment_id, deck_pos_x, deck_pos_y, overboard_pos_x, overboard_pos_y, crane_capacity_overboard_t, equipment_library(name, dry_weight_t)')
        .eq('project_id', projectId)

      const { data: results } = await supabase
        .from('splash_zone_result')
        .select('project_equipment_id, max_hs_m, daf')

      const resultMap = Object.fromEntries((results ?? []).map((r) => [r.project_equipment_id, r]))
      const vessel = project?.vessel_snapshot?.vessel

      return {
        project: { name: project?.name, status: project?.status, field_name: project?.field_name, water_depth_m: project?.water_depth_m },
        vessel: vessel
          ? { name: vessel.name, type: vessel.vessel_type, deck: `${vessel.deck_length_m} × ${vessel.deck_width_m} m`, crane: vessel.crane_type }
          : null,
        equipment: (placed ?? []).map((pe) => {
          const r = resultMap[pe.id]
          return {
            name: pe.label ?? (pe.equipment_library as Record<string, string>)?.name ?? '—',
            weight_t: (pe.equipment_library as Record<string, number>)?.dry_weight_t,
            on_deck: pe.deck_pos_x != null,
            has_overboard: pe.overboard_pos_x != null,
            crane_cap_ob_t: pe.crane_capacity_overboard_t,
            analyzed: r != null,
            max_hs_m: r?.max_hs_m ?? null,
          }
        }),
        summary: { total: placed?.length ?? 0, analyzed: (placed ?? []).filter((pe) => resultMap[pe.id]).length },
      }
    }

    case 'get_equipment_details': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      const { pe, eq } = found
      return {
        name: found.matchedName,
        geometry_type: eq.geometry_type,
        length_m: eq.length_m, width_m: eq.width_m, height_m: eq.height_m,
        dry_weight_t: eq.dry_weight_t,
        submerged_volume_m3: eq.submerged_volume_m3,
        deck_position: pe.deck_pos_x != null ? { x: pe.deck_pos_x, y: pe.deck_pos_y } : null,
        overboard_position: pe.overboard_pos_x != null ? { x: pe.overboard_pos_x, y: pe.overboard_pos_y } : null,
        crane_radius_ob_m: pe.crane_radius_overboard_m,
        crane_capacity_ob_t: pe.crane_capacity_overboard_t,
        deck_load_ok: pe.deck_load_ok,
      }
    }

    case 'get_analysis_results': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }

      const { data: result } = await supabase
        .from('splash_zone_result')
        .select('*, sea_state_limit(*)')
        .eq('project_equipment_id', found.pe.id)
        .maybeSingle()

      if (!result) return { message: 'No analysis results. Run run_splash_zone_analysis first.', equipment: found.matchedName }

      const limits = result.sea_state_limit ?? []
      const feasible = limits.filter((l: Record<string, boolean>) => l.is_feasible).length
      return {
        equipment: found.matchedName,
        max_hs_m: result.max_hs_m,
        daf: result.daf,
        operability_pct: limits.length > 0 ? +((feasible / limits.length) * 100).toFixed(1) : 0,
        cd_z: result.cd_z, ca: result.ca, cs: result.cs,
        projected_area_z_m2: result.projected_area_z_m2,
        submerged_volume_m3: result.submerged_volume_m3,
        crane_tip_heave_m: result.crane_tip_heave_m,
        calculated_at: result.calculated_at,
      }
    }

    case 'get_crane_capacity': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      const { pe } = found
      const { data: project } = await supabase.from('project').select('vessel_snapshot').eq('id', projectId).single()
      const vessel = project?.vessel_snapshot?.vessel
      return {
        equipment: found.matchedName,
        deck: { radius_m: pe.crane_radius_deck_m, capacity_t: pe.crane_capacity_deck_t, slew_deg: pe.crane_slew_deck_deg },
        overboard: { radius_m: pe.crane_radius_overboard_m, capacity_t: pe.crane_capacity_overboard_t, slew_deg: pe.crane_slew_overboard_deg, position: pe.overboard_pos_x != null ? { x: pe.overboard_pos_x, y: pe.overboard_pos_y } : null },
        crane: vessel ? { type: vessel.crane_type, pedestal: { x: vessel.crane_pedestal_x, y: vessel.crane_pedestal_y }, boom_m: vessel.crane_boom_length_m } : null,
      }
    }

    case 'get_sea_state_table': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }

      const { data: result } = await supabase
        .from('splash_zone_result')
        .select('id, max_hs_m')
        .eq('project_equipment_id', found.pe.id)
        .maybeSingle()

      if (!result) return { message: 'No analysis results. Run analysis first.', equipment: found.matchedName }

      const { data: limits } = await supabase
        .from('sea_state_limit')
        .select('hs_m, tp_s, is_feasible, utilization_pct')
        .eq('splash_zone_result_id', result.id)
        .order('hs_m').order('tp_s')

      const hsGroups = [...new Set((limits ?? []).map((l) => l.hs_m))].sort((a, b) => a - b)
      const table = hsGroups.map((hs) => {
        const row = (limits ?? []).filter((l) => l.hs_m === hs)
        const allOk = row.every((r) => r.is_feasible)
        const anyOk = row.some((r) => r.is_feasible)
        return {
          hs_m: hs,
          status: allOk ? '✓ Go' : anyOk ? '~ Partial' : '✗ No-go',
          min_util_pct: +Math.min(...row.map((r) => r.utilization_pct)).toFixed(1),
          max_util_pct: +Math.max(...row.map((r) => r.utilization_pct)).toFixed(1),
        }
      })
      return { equipment: found.matchedName, max_hs_m: result.max_hs_m, table }
    }

    // ── MODIFY ────────────────────────────────────────────────────────────
    case 'update_equipment_weight': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      const { error } = await supabase
        .from('equipment_library')
        .update({ dry_weight_t: args.new_weight_t })
        .eq('id', found.eq.id)
      if (error) return { error: error.message }
      return {
        success: true, equipment: found.matchedName,
        old_weight_t: found.eq.dry_weight_t, new_weight_t: args.new_weight_t,
        note: 'Re-run splash zone analysis to see the updated DAF and operability.',
      }
    }

    case 'update_equipment_dimensions': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      const { error } = await supabase
        .from('equipment_library')
        .update({ length_m: args.length_m, width_m: args.width_m, height_m: args.height_m })
        .eq('id', found.eq.id)
      if (error) return { error: error.message }
      return {
        success: true, equipment: found.matchedName,
        old: { length_m: found.eq.length_m, width_m: found.eq.width_m, height_m: found.eq.height_m },
        new: { length_m: args.length_m, width_m: args.width_m, height_m: args.height_m },
        note: 'Dimensions saved. Re-run analysis to recalculate hydrodynamic forces.',
      }
    }

    case 'move_equipment_on_deck': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      const { error } = await supabase
        .from('project_equipment')
        .update({ deck_pos_x: args.x, deck_pos_y: args.y })
        .eq('id', found.pe.id)
      if (error) return { error: error.message }
      return {
        success: true, equipment: found.matchedName,
        old_position: { x: found.pe.deck_pos_x, y: found.pe.deck_pos_y },
        new_position: { x: args.x, y: args.y },
      }
    }

    case 'move_equipment_overboard': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      const { error } = await supabase
        .from('project_equipment')
        .update({ overboard_pos_x: args.x, overboard_pos_y: args.y })
        .eq('id', found.pe.id)
      if (error) return { error: error.message }
      return {
        success: true, equipment: found.matchedName,
        old_position: found.pe.overboard_pos_x != null ? { x: found.pe.overboard_pos_x, y: found.pe.overboard_pos_y } : null,
        new_position: { x: args.x, y: args.y },
      }
    }

    // ── CALCULATION ───────────────────────────────────────────────────────
    case 'run_splash_zone_analysis': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }
      return await runAnalysisForEquipment(supabase, projectId, found)
    }

    case 'run_all_analysis': {
      const { data: placed } = await supabase
        .from('project_equipment')
        .select('*, equipment_library(*)')
        .eq('project_id', projectId)
        .not('overboard_pos_x', 'is', null)

      if (!placed?.length) return { message: 'No equipment with overboard positions found.' }

      const summary = []
      for (const pe of placed) {
        const found = { pe, eq: pe.equipment_library, matchedName: pe.label ?? pe.equipment_library?.name ?? pe.id }
        if (!pe.crane_capacity_overboard_t) {
          summary.push({ name: found.matchedName, error: 'No crane capacity set' })
          continue
        }
        const result = await runAnalysisForEquipment(supabase, projectId, found)
        summary.push({ name: found.matchedName, ...result })
      }
      return { results: summary, total: placed.length }
    }

    case 'compare_scenarios': {
      const found = await findEquipment(supabase, projectId, args.equipment_name as string)
      if (!found) return { error: `Equipment "${args.equipment_name}" not found.` }

      const { parameter, values } = args as { parameter: string; values: number[] }
      const allowed = ['weight', 'length', 'width', 'height']
      if (!allowed.includes(parameter)) return { error: `Parameter must be one of: ${allowed.join(', ')}` }

      const { data: raos } = await supabase.from('rao_entry').select('*').eq('project_id', projectId)
      const { data: project } = await supabase.from('project').select('vessel_snapshot').eq('id', projectId).single()
      const vessel = project?.vessel_snapshot?.vessel ?? {}
      const armX = ((found.pe.overboard_pos_x as number) ?? 0) - (vessel.crane_pedestal_x ?? 0)
      const armY = ((found.pe.overboard_pos_y as number) ?? 0) - (vessel.crane_pedestal_y ?? 0)
      const craneTipH = calcCraneTipHeavePerM(raos ?? [], armX, armY)

      const comparison = []
      for (const val of values) {
        const eq = { ...found.eq }
        if (parameter === 'weight') eq.dry_weight_t = val
        else if (parameter === 'length') eq.length_m = val
        else if (parameter === 'width') eq.width_m = val
        else if (parameter === 'height') eq.height_m = val

        const geometry = (eq.geometry_type as string) ?? 'box'
        const areas = calcProjectedAreas(geometry, eq.length_m as number, eq.width_m as number, eq.height_m as number)
        const volume = calcSubmergedVolume(geometry, eq.length_m as number, eq.width_m as number, eq.height_m as number)
        const cd = calcDragCoeff(geometry)
        const ca = calcAddedMass(geometry)
        const cs = calcSlammingCoeff(geometry)
        const craneCapT = found.pe.crane_capacity_overboard_t as number ?? 0

        let maxHs = 0
        let worstDaf = 1
        let totalCells = 0
        let feasibleCells = 0

        for (const hs of HS_STEPS) {
          let hsAllOk = true
          for (const tp of TP_STEPS) {
            const cell = calcCell({ hs_m: hs, tp_s: tp, cd_z: cd.cd_z, ca, cs, area_z_m2: areas.area_z_m2, volume_m3: volume, crane_tip_heave_per_m: craneTipH, dry_weight_t: eq.dry_weight_t as number, crane_capacity_t: craneCapT })
            totalCells++
            if (cell.is_feasible) feasibleCells++
            else hsAllOk = false
            if (cell.daf > worstDaf) worstDaf = cell.daf
          }
          if (hsAllOk) maxHs = hs
        }

        comparison.push({
          [`${parameter}_t_or_m`]: val,
          max_hs_m: maxHs,
          daf: +worstDaf.toFixed(3),
          operability_pct: +((feasibleCells / totalCells) * 100).toFixed(1),
        })
      }

      return { equipment: found.matchedName, parameter, comparison }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// ─── Tool notification builder ─────────────────────────────────────────────────

function buildToolNotification(
  name: string,
  args: Record<string, unknown>,
  result: Record<string, unknown>,
): string {
  const eq = (args.equipment_name as string) ?? ''
  if (result.error) return `[Tool: ${name}] Error: ${result.error}`

  switch (name) {
    case 'get_project_summary':
      return `[Tool: get_project_summary] Fetched project summary`
    case 'get_equipment_details':
      return `[Tool: get_equipment_details] Retrieved details for ${eq}`
    case 'get_analysis_results':
      return `[Tool: get_analysis_results] Retrieved analysis results for ${eq}`
    case 'get_crane_capacity':
      return `[Tool: get_crane_capacity] Retrieved crane capacity for ${eq}`
    case 'get_sea_state_table':
      return `[Tool: get_sea_state_table] Retrieved sea state table for ${eq}`
    case 'update_equipment_weight':
      return `[Tool: update_equipment_weight] Updated ${eq} weight to ${args.new_weight_t}t`
    case 'update_equipment_dimensions':
      return `[Tool: update_equipment_dimensions] Updated dimensions for ${eq}`
    case 'move_equipment_on_deck':
      return `[Tool: move_equipment_on_deck] Moved ${eq} to (${args.x}, ${args.y}) on deck`
    case 'move_equipment_overboard':
      return `[Tool: move_equipment_overboard] Set overboard position for ${eq}`
    case 'run_splash_zone_analysis':
      return `[Tool: run_splash_zone_analysis] Analysis complete for ${eq}: max Hs = ${result.max_hs_m ?? '?'}m, DAF = ${result.daf ?? '?'}`
    case 'run_all_analysis': {
      const total = result.total ?? 0
      return `[Tool: run_all_analysis] Ran analysis for ${total} equipment item(s)`
    }
    case 'compare_scenarios':
      return `[Tool: compare_scenarios] Compared ${(result.comparison as unknown[])?.length ?? 0} scenarios for ${eq}`
    default:
      return `[Tool: ${name}]`
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, projectId } = await req.json() as {
      messages: Array<{ role: string; content: string }>
      projectId: string
    }

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Convert to Gemini contents (system messages handled via systemInstruction)
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

    // Track tool calls made during this conversation turn
    const toolNotifications: string[] = []
    const rawToolResults: Array<{ name: string; result: Record<string, unknown> }> = []

    // ── Gemini function-calling loop ──────────────────────────────────────
    for (let iter = 0; iter < 10; iter++) {
      const geminiRes = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
        }),
      })

      if (!geminiRes.ok) {
        const errText = await geminiRes.text()
        return new Response(JSON.stringify({ error: `Gemini error: ${errText}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const geminiData = await geminiRes.json()
      const candidate = geminiData.candidates?.[0]
      if (!candidate?.content) {
        return new Response(
          JSON.stringify({ response: 'No response from AI.', toolNotifications, rawToolResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      const parts: Array<Record<string, unknown>> = candidate.content.parts ?? []
      const fnCallPart = parts.find((p) => p.functionCall)

      if (!fnCallPart) {
        // Final text response — no more function calls
        const text = parts.find((p) => p.text)
        return new Response(
          JSON.stringify({ response: (text?.text as string) ?? '', toolNotifications, rawToolResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      // Execute the requested function
      const { name, args } = fnCallPart.functionCall as { name: string; args: Record<string, unknown> }
      const result = await executeFunction(name, args ?? {}, supabase, projectId)

      // Build human-readable tool notification
      const notification = buildToolNotification(name, args ?? {}, result)
      toolNotifications.push(notification)
      rawToolResults.push({ name, result })

      // Append model turn + function response to the conversation
      contents.push(candidate.content)
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name, response: result } }],
      })
    }

    return new Response(
      JSON.stringify({ response: 'Max iterations reached.', toolNotifications, rawToolResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('chat function error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
