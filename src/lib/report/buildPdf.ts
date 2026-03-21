/**
 * buildPdf - assemble a jsPDF document from collected project data and captured images.
 * Pure function: no side effects, no state, no Supabase calls.
 */

import jsPDF from 'jspdf'
import type {
  Project, Vessel, VesselBarrier, DeckLoadZone, CraneCurvePoint, ProjectEquipment, EquipmentLibrary,
  SplashZoneResult, SeaStateLimit, ScatterDiagramEntry,
  ProjectEquipmentRigging, RiggingItem, SeaFasteningResult, StabilityResult, LoweringResult, CurrentProfileEntry,
} from '../../types/database'
import type { CraneTipMotionResult } from '../calculations/motion/craneTipMotion'
import { dragCoefficient } from '../calculations/hydro/dragCoefficient'
import { addedMassCoefficient } from '../calculations/hydro/addedMassCoefficient'
import { slammingCoefficient } from '../calculations/hydro/slammingCoefficient'
import { projectedAreas, submergedVolume } from '../calculations/hydro/projectedAreas'
import { calculateOperability } from '../calculations/weather/operabilityAnalysis'
import { splashZoneLoads, waveKinematics } from '../calculations/dnv/splashZoneLoads'

// ── Public types ───────────────────────────────────────────────────────────────

export type ReportData = {
  project: Project
  vessel: Vessel
  barriers: VesselBarrier[]
  deckLoadZones: DeckLoadZone[]
  craneCurve: CraneCurvePoint[]
  placed: ProjectEquipment[]
  libById: Record<string, EquipmentLibrary>
  analysisResults: Record<string, SplashZoneResult>   // keyed by pe.id
  seaStateLimits: Record<string, SeaStateLimit[]>     // keyed by splash_zone_result.id
  scatterEntries: ScatterDiagramEntry[]
  craneTipResults: Record<string, CraneTipMotionResult> // keyed by pe.id
  // v2 analysis results
  riggingArrangements: Record<string, (ProjectEquipmentRigging & { riggingItem: RiggingItem })[]> // keyed by pe.id
  seaFasteningResults: Record<string, SeaFasteningResult> // keyed by pe.id
  stabilityResult: StabilityResult | null
  loweringResults: Record<string, LoweringResult> // keyed by pe.id
  currentProfile: CurrentProfileEntry[]
}

export type ReportSections = {
  vesselSummary: boolean
  equipmentList: boolean
  deckLayout: boolean
  craneCapacity: boolean
  dnvAnalysis: boolean
  seaStateTables: boolean
  weatherWindow: boolean
  view3d: boolean
  // v2 sections
  riggingSummary: boolean
  seaFastening: boolean
  stability: boolean
  lowering: boolean
  dnvTrail: boolean
}

export type CapturedImages = {
  deckLayout?: string
  craneCurveChart?: string
  seaStateGrids?: Record<string, string>
  scatterOverlay?: string
  view3d?: string
  loweringPlot?: Record<string, string> // keyed by pe.id
}

// ── Layout constants ──────────────────────────────────────────────────────────

const M = 15                                          // page margin mm
const CW = 180                                        // content width mm
const BLUE: [number, number, number] = [37, 99, 235]
const GRAY: [number, number, number] = [107, 114, 128]
const DARK: [number, number, number] = [17, 24, 39]
const LIGHT: [number, number, number] = [248, 250, 252]

// ── Primitive helpers ─────────────────────────────────────────────────────────

function hdr(doc: jsPDF, pageNum: number): void {
  doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(...GRAY)
  doc.text('DeckLayout - Offshore Deck Layout Planning Report', M, 10)
  doc.text(`Page ${pageNum}`, 210 - M, 10, { align: 'right' })
  doc.setDrawColor(200, 200, 200).setLineWidth(0.2).line(M, 12, 210 - M, 12)
}

function sec(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...BLUE)
  doc.rect(M, y, CW, 6.5, 'F')
  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(255, 255, 255)
  doc.text(title, M + 3, y + 4.8)
  doc.setFont('helvetica', 'normal').setTextColor(...DARK)
  return y + 10
}

function sub(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...BLUE)
  doc.text(title, M, y)
  doc.setDrawColor(...BLUE).setLineWidth(0.25).line(M, y + 1.5, M + CW, y + 1.5)
  doc.setFont('helvetica', 'normal').setTextColor(...DARK)
  return y + 6
}

function kv(doc: jsPDF, label: string, value: string, x: number, y: number): number {
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...GRAY)
  doc.text(label + ':', x, y)
  doc.setFont('helvetica', 'normal').setTextColor(...DARK)
  doc.text(value, x + 48, y)
  return y + 5.5
}

type Col = { header: string; width: number; align?: 'left' | 'right' | 'center' }

function tbl(doc: jsPDF, cols: Col[], rows: string[][], x: number, y: number): number {
  const rowH = 6
  const totalW = cols.reduce((s, c) => s + c.width, 0)
  doc.setFillColor(...LIGHT)
  doc.rect(x, y, totalW, rowH, 'F')
  doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(...GRAY)
  let cx = x
  for (const col of cols) {
    const tx = col.align === 'right' ? cx + col.width - 1 : cx + 2
    doc.text(col.header, tx, y + 4.2, { align: col.align === 'right' ? 'right' : 'left' })
    cx += col.width
  }
  y += rowH
  doc.setFont('helvetica', 'normal').setTextColor(...DARK)
  for (let i = 0; i < rows.length; i++) {
    if (i % 2 === 0) { doc.setFillColor(255, 255, 255); doc.rect(x, y, totalW, rowH, 'F') }
    cx = x
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j]
      const tx = col.align === 'right' ? cx + col.width - 1 : cx + 2
      doc.text(rows[i]?.[j] ?? '', tx, y + 4.2, { align: col.align === 'right' ? 'right' : 'left' })
      cx += col.width
    }
    y += rowH
  }
  doc.setDrawColor(200, 200, 200).setLineWidth(0.2).line(x, y, x + totalW, y)
  return y + 3
}

function img(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number): void {
  try { doc.addImage(dataUrl, 'PNG', x, y, w, h) } catch { /* skip if image fails */ }
}

// ── Page renderers ────────────────────────────────────────────────────────────

function cover(doc: jsPDF, data: ReportData): void {
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, 210, 90, 'F')
  doc.setFontSize(36).setFont('helvetica', 'bold').setTextColor(255, 255, 255)
  doc.text('SUBLIFT', 105, 38, { align: 'center' })
  doc.setFontSize(13).setFont('helvetica', 'normal')
  doc.text('Subsea Lift Planning Report', 105, 52, { align: 'center' })
  doc.setDrawColor(255, 255, 255).setLineWidth(0.5).line(45, 60, 165, 60)

  let y = 110
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...BLUE)
  doc.text('PROJECT DETAILS', 105, y, { align: 'center' })
  y += 10

  const { project, vessel } = data
  const rows: [string, string][] = [
    ['Project', project.name],
    ['Field', project.field_name ?? '-'],
    ['Water Depth', project.water_depth_m ? `${project.water_depth_m} m` : '-'],
    ['Vessel', vessel.name],
    ['Vessel Type', vessel.vessel_type],
    ['Date', new Date().toISOString().split('T')[0]],
    ['Generated by', 'DeckLayout v1.0'],
  ]
  for (const [label, value] of rows) {
    doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...GRAY)
    doc.text(`${label}:`, 60, y)
    doc.setFont('helvetica', 'normal').setTextColor(...DARK)
    doc.text(value, 105, y)
    y += 9
  }

  doc.setFontSize(8).setTextColor(...GRAY)
  doc.text('CONFIDENTIAL - For project use only', 105, 285, { align: 'center' })
}

function tocPage(doc: jsPDF, pageNum: number, sections: ReportSections, data: ReportData, pageMap: Record<string, number>): void {
  hdr(doc, pageNum)
  let y = sec(doc, 'TABLE OF CONTENTS', 20)
  const analyzed = data.placed.filter(pe => data.analysisResults[pe.id])
  const tocEntries: [string, string][] = []

  if (sections.vesselSummary && pageMap['vessel']) tocEntries.push(['1.  Vessel & Crane Summary', `${pageMap['vessel']}`])
  if (sections.equipmentList && pageMap['equipment']) tocEntries.push(['2.  Equipment List', `${pageMap['equipment']}`])
  if (sections.deckLayout && pageMap['deck']) tocEntries.push(['3.  Deck Layout', `${pageMap['deck']}`])
  if ((sections.craneCapacity || sections.dnvAnalysis || sections.seaStateTables) && analyzed.length > 0) {
    tocEntries.push(['4.  Equipment Analysis', ''])
    analyzed.forEach((pe, i) => {
      const eq = data.libById[pe.equipment_id]
      const p = pageMap[`analysis_${pe.id}`]
      if (p) tocEntries.push([`    4.${i + 1}  ${pe.label ?? eq?.name ?? pe.id}`, `${p}`])
    })
  }
  if (sections.weatherWindow && pageMap['weather']) tocEntries.push(['5.  Weather Window Analysis', `${pageMap['weather']}`])
  if (sections.riggingSummary && pageMap['rigging']) tocEntries.push(['6.  Rigging Summary', `${pageMap['rigging']}`])
  if (sections.seaFastening && pageMap['seafastening']) tocEntries.push(['7.  Sea-Fastening Summary', `${pageMap['seafastening']}`])
  if (sections.stability && pageMap['stability']) tocEntries.push(['8.  Stability Summary', `${pageMap['stability']}`])
  if (sections.lowering && pageMap['lowering']) tocEntries.push(['9.  Lowering Summary', `${pageMap['lowering']}`])
  if (sections.view3d && pageMap['3d']) tocEntries.push(['10. 3D View', `${pageMap['3d']}`])

  for (const [title, page] of tocEntries) {
    doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(...DARK)
    doc.text(title, M, y)
    if (page) doc.text(page, 210 - M, y, { align: 'right' })
    y += 8
  }
}

// ── Public function ───────────────────────────────────────────────────────────

/** Build and return a jsPDF document. Caller can call doc.save() or doc.output('blob'). */
export function buildPdf(data: ReportData, sections: ReportSections, images: CapturedImages): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const analyzed = data.placed.filter(pe => data.analysisResults[pe.id])

  // Pre-compute page numbers
  let page = 1
  const pm: Record<string, number> = {}
  page++ // toc = page 2
  if (sections.vesselSummary) pm['vessel'] = ++page
  if (sections.equipmentList) pm['equipment'] = ++page
  if (sections.deckLayout) pm['deck'] = ++page
  for (const pe of analyzed) {
    if (sections.craneCapacity || sections.dnvAnalysis || sections.seaStateTables || sections.dnvTrail)
      pm[`analysis_${pe.id}`] = ++page
    if (sections.dnvTrail) page++ // DNV Trail adds another page per equipment
  }
  if (sections.weatherWindow && data.scatterEntries.length > 0) pm['weather'] = ++page
  if (sections.riggingSummary) pm['rigging'] = ++page
  if (sections.seaFastening) pm['seafastening'] = ++page
  if (sections.stability) pm['stability'] = ++page
  if (sections.lowering) pm['lowering'] = ++page
  if (sections.view3d) pm['3d'] = ++page

  // Page 1: Cover
  cover(doc, data)

  // Page 2: TOC
  doc.addPage()
  tocPage(doc, 2, sections, data, pm)

  // Vessel & Crane Summary
  if (sections.vesselSummary) {
    doc.addPage()
    hdr(doc, pm['vessel'])
    let y = 20
    y = sec(doc, '1. VESSEL & CRANE SUMMARY', y)
    y = sub(doc, 'Vessel Information', y)
    const { vessel } = data
    y = kv(doc, 'Name', vessel.name, M, y)
    y = kv(doc, 'Type', vessel.vessel_type, M, y)
    y = kv(doc, 'Deck Length', `${vessel.deck_length_m.toFixed(1)} m`, M, y)
    y = kv(doc, 'Deck Width', `${vessel.deck_width_m.toFixed(1)} m`, M, y)
    y += 3
    y = sub(doc, 'Crane Information', y)
    y = kv(doc, 'Type', vessel.crane_type, M, y)
    y = kv(doc, 'Pedestal (X, Y)', `(${vessel.crane_pedestal_x.toFixed(1)}, ${vessel.crane_pedestal_y.toFixed(1)}) m`, M, y)
    y = kv(doc, 'Pedestal Height', `${vessel.crane_pedestal_height_m.toFixed(1)} m`, M, y)
    y = kv(doc, 'Boom Length', `${vessel.crane_boom_length_m.toFixed(1)} m`, M, y)
    y = kv(doc, 'Slew Range', `${vessel.crane_slew_min_deg ?? 0}° - ${vessel.crane_slew_max_deg ?? 360}°`, M, y)
    y += 3
    if (images.craneCurveChart) {
      y = sub(doc, 'Crane Capacity Curve', y)
      img(doc, images.craneCurveChart, M, y, CW, 62)
      y += 66
    }
    if (data.craneCurve.length > 0) {
      y = sub(doc, 'Crane Curve Data', y)
      const sorted = [...data.craneCurve].sort((a, b) => a.radius_m - b.radius_m)
      tbl(doc,
        [{ header: 'Radius (m)', width: 45 }, { header: 'Capacity (t)', width: 45, align: 'right' }],
        sorted.map(p => [p.radius_m.toFixed(1), p.capacity_t.toFixed(0)]),
        M, y)
    }
  }

  // Equipment List
  if (sections.equipmentList) {
    doc.addPage(); let y = 20
    hdr(doc, pm['equipment'])
    y = sec(doc, '2. EQUIPMENT LIST', y)
    tbl(doc,
      [
        { header: 'Name', width: 50 },
        { header: 'Type', width: 25 },
        { header: 'L (m)', width: 20, align: 'right' },
        { header: 'W (m)', width: 20, align: 'right' },
        { header: 'H (m)', width: 20, align: 'right' },
        { header: 'Wt (t)', width: 25, align: 'right' },
        { header: 'Label', width: 20 },
      ],
      data.placed.map(pe => {
        const eq = data.libById[pe.equipment_id]
        return [
          eq?.name ?? pe.equipment_id,
          eq?.geometry_type ?? '-',
          (eq?.length_m ?? 0).toFixed(1),
          (eq?.width_m ?? 0).toFixed(1),
          (eq?.height_m ?? 0).toFixed(1),
          (eq?.dry_weight_t ?? 0).toFixed(1),
          pe.label ?? '-',
        ]
      }),
      M, y)
  }

  // Deck Layout
  if (sections.deckLayout) {
    doc.addPage(); let y = 20
    hdr(doc, pm['deck'])
    y = sec(doc, '3. DECK LAYOUT - TOP VIEW', y)
    if (images.deckLayout) {
      img(doc, images.deckLayout, M, y, CW, 100)
      y += 104
    }
    y = sub(doc, 'Equipment Positions', y)
    tbl(doc,
      [
        { header: 'Equipment', width: 55 },
        { header: 'Deck X (m)', width: 35, align: 'right' },
        { header: 'Deck Y (m)', width: 35, align: 'right' },
        { header: 'Rot (°)', width: 25, align: 'right' },
        { header: 'Deck Load', width: 30 },
      ],
      data.placed.map(pe => {
        const eq = data.libById[pe.equipment_id]
        return [
          pe.label ?? eq?.name ?? pe.id,
          pe.deck_pos_x.toFixed(1),
          pe.deck_pos_y.toFixed(1),
          pe.deck_rotation_deg.toFixed(0),
          pe.deck_load_ok === false ? 'OVER' : 'OK',
        ]
      }),
      M, y)
  }

  // Equipment Analysis - one page per item
  if (sections.craneCapacity || sections.dnvAnalysis || sections.seaStateTables) {
    analyzed.forEach((pe, idx) => {
      const eq = data.libById[pe.equipment_id]
      const result = data.analysisResults[pe.id]
      if (!eq || !result) return
      const craneTip = data.craneTipResults[pe.id] ?? null
      const eqName = (pe.label ?? eq.name).toUpperCase()

      doc.addPage(); let y = 20
      hdr(doc, pm[`analysis_${pe.id}`])
      y = sec(doc, `4.${idx + 1} EQUIPMENT ANALYSIS - ${eqName}`, y)

      if (sections.craneCapacity) {
        y = sub(doc, 'Crane Capacity Check', y)
        const deckCap = pe.crane_capacity_deck_t ?? 0
        const obCap = pe.crane_capacity_overboard_t ?? 0
        const wt = eq.dry_weight_t
        y = tbl(doc,
          [{ header: '', width: 55 }, { header: 'Deck Pick-up', width: 62, align: 'right' }, { header: 'Overboard Lower', width: 63, align: 'right' }],
          [
            ['Crane Radius', `${(pe.crane_radius_deck_m ?? 0).toFixed(1)} m`, `${(pe.crane_radius_overboard_m ?? 0).toFixed(1)} m`],
            ['Boom Angle', `${(pe.crane_boom_angle_deck_deg ?? 0).toFixed(1)}°`, `${(pe.crane_boom_angle_overboard_deg ?? 0).toFixed(1)}°`],
            ['Crane Capacity', `${deckCap.toFixed(0)} t`, `${obCap.toFixed(0)} t`],
            ['Equipment Weight', `${wt.toFixed(1)} t`, `${wt.toFixed(1)} t`],
            ['Utilization', deckCap > 0 ? `${(wt / deckCap * 100).toFixed(1)} %` : '-', obCap > 0 ? `${(wt / obCap * 100).toFixed(1)} %` : '-'],
            ['Status', (pe.capacity_check_deck_ok ?? true) ? 'OK' : 'OVER', (pe.capacity_check_overboard_ok ?? true) ? 'OK' : 'OVER'],
          ],
          M, y)
        y += 3
      }

      if (sections.dnvAnalysis) {
        y = sub(doc, 'Hydrodynamic Coefficients (DNV-RP-N103)', y)
        const dims = { length_m: eq.length_m, width_m: eq.width_m, height_m: eq.height_m }
        const cd = dragCoefficient(eq.geometry_type, dims)
        const ca = addedMassCoefficient(eq.geometry_type, dims)
        const cs = slammingCoefficient(eq.geometry_type)
        const areas = projectedAreas(eq.geometry_type, eq.length_m, eq.width_m, eq.height_m)
        const vol = eq.submerged_volume_m3 ?? submergedVolume(eq.geometry_type, eq.length_m, eq.width_m, eq.height_m)
        y = tbl(doc,
          [{ header: 'Parameter', width: 75 }, { header: 'Value', width: 105 }],
          [
            ['Cd_x / Cd_y / Cd_z', `${cd.cd_x.toFixed(2)} / ${cd.cd_y.toFixed(2)} / ${cd.cd_z.toFixed(2)}`],
            ['Added Mass Coefficient Ca', ca.toFixed(2)],
            ['Slamming Coefficient Cs', cs.toFixed(2)],
            ['Area_x / A_y / A_z (m²)', `${areas.area_x_m2.toFixed(2)} / ${areas.area_y_m2.toFixed(2)} / ${areas.area_z_m2.toFixed(2)}`],
            ['Submerged Volume (m³)', vol.toFixed(2)],
          ], M, y)
        y += 3

        if (craneTip) {
          y = sub(doc, 'Crane Tip Motion', y)
          y = tbl(doc, [{ header: 'Parameter', width: 75 }, { header: 'Value', width: 105 }], [
            ['Significant Heave', `${craneTip.craneTipHeaveM.toFixed(2)} m`],
            ['Significant Lateral', `${craneTip.craneTipLateralM.toFixed(2)} m`],
            ['Worst-Case Direction', `${craneTip.worstDirection}°`],
          ], M, y)
          y += 3
        }

        y = sub(doc, 'Splash Zone Analysis Results (DNV-ST-N001)', y)
        y = kv(doc, 'Maximum Hs', `${result.max_hs_m.toFixed(2)} m`, M, y)
        y += 3
      }

      if (sections.seaStateTables && images.seaStateGrids?.[pe.id]) {
        y = sub(doc, 'Sea State Operability Grid', y)
        const h = Math.min(80, 285 - y)
        img(doc, images.seaStateGrids[pe.id], M, y, CW, h)
      }

      if (sections.dnvTrail) {
        doc.addPage()
        dnvCalculationTrail(doc, pm[`analysis_${pe.id}`] + 1, pe, data)
      }
    })
  }

  // Weather Window
  if (sections.weatherWindow && data.scatterEntries.length > 0) {
    doc.addPage(); let y = 20
    hdr(doc, pm['weather'])
    y = sec(doc, '5. WEATHER WINDOW ANALYSIS', y)
    y = sub(doc, 'Scatter Diagram Info', y)
    const total = data.scatterEntries.reduce((s, e) => s + e.occurrence_pct, 0)
    y = kv(doc, 'Scatter Entries', `${data.scatterEntries.length}`, M, y)
    y = kv(doc, 'Total Occurrence', `${total.toFixed(1)} %`, M, y)
    y += 3
    y = sub(doc, 'Operability Summary', y)
    const opRows = analyzed.map(pe => {
      const eq = data.libById[pe.equipment_id]
      const result = data.analysisResults[pe.id]
      const limits = data.seaStateLimits[result?.id ?? ''] ?? []
      const op = calculateOperability(data.scatterEntries, limits)
      const status = op >= 80 ? 'Good' : op >= 50 ? 'Moderate' : 'Poor'
      return [pe.label ?? eq?.name ?? pe.id, `${result?.max_hs_m.toFixed(2) ?? '-'} m`, `${op.toFixed(1)} %`, status]
    })
    y = tbl(doc, [
      { header: 'Equipment', width: 65 },
      { header: 'Max Hs', width: 35, align: 'right' },
      { header: 'Operability', width: 40, align: 'right' },
      { header: 'Status', width: 40 },
    ], opRows, M, y)
    y += 5
    if (images.scatterOverlay) {
      y = sub(doc, 'Scatter Diagram Overlay', y)
      const h = Math.min(100, 285 - y)
      img(doc, images.scatterOverlay, M, y, CW, h)
    }
  }

  // Rigging Summary
  if (sections.riggingSummary) {
    doc.addPage()
    riggingSummary(doc, pm['rigging'], data)
  }

  // Sea-Fastening Summary
  if (sections.seaFastening) {
    doc.addPage()
    seaFastening(doc, pm['seafastening'], data)
  }

  // Stability Summary
  if (sections.stability) {
    doc.addPage()
    stability(doc, pm['stability'], data)
  }

  // Lowering Summary
  if (sections.lowering) {
    doc.addPage()
    loweringSummary(doc, pm['lowering'], data, images)
  }

  // 3D View
  if (sections.view3d) {
    doc.addPage(); let y = 20
    hdr(doc, pm['3d'])
    y = sec(doc, '10. 3D VISUALIZATION', y)
    if (images.view3d) {
      img(doc, images.view3d, M, y, CW, 120)
      y += 124
    }
    doc.setFontSize(8).setTextColor(...GRAY)
    doc.text('Perspective view - DeckLayout 3D Viewer', M, y)
  }

  return doc
}

// ── V2 Page renderers ─────────────────────────────────────────────────────────

function riggingSummary(doc: jsPDF, pageNum: number, data: ReportData): void {
  hdr(doc, pageNum)
  let y = sec(doc, '6. RIGGING SUMMARY', 20)

  data.placed.forEach((pe) => {
    const arrangement = data.riggingArrangements[pe.id]
    if (!arrangement || arrangement.length === 0) return
    const eq = data.libById[pe.equipment_id]
    y = sub(doc, `Rigging: ${pe.label ?? eq?.name ?? pe.id}`, y)
    y = kv(doc, 'Calculated Hook Load', `${pe.hook_load_t?.toFixed(1) ?? '-'} t`, M, y)

    y = tbl(doc, [
      { header: 'Item', width: 60 },
      { header: 'Qty', width: 20, align: 'right' },
      { header: 'Angle (°)', width: 25, align: 'right' },
      { header: 'Sling Force (t)', width: 30, align: 'right' },
      { header: 'Design Force (t)', width: 30, align: 'right' },
      { header: 'WLL (t)', width: 25, align: 'right' },
      { header: 'Status', width: 20 },
    ], arrangement.map(a => [
      a.riggingItem.name,
      a.quantity.toString(),
      a.angle_from_vertical_deg.toFixed(0),
      a.sling_force_t?.toFixed(1) ?? '-',
      a.sling_force_design_t?.toFixed(1) ?? '-',
      a.riggingItem.wll_t.toFixed(1),
      a.wll_ok ? 'OK' : 'FAIL',
    ]), M, y)

    if (y > 260) { doc.addPage(); hdr(doc, pageNum); y = 20 }
    y += 5
  })
}

function seaFastening(doc: jsPDF, pageNum: number, data: ReportData): void {
  hdr(doc, pageNum)
  let y = sec(doc, '7. SEA-FASTENING SUMMARY', 20)

  data.placed.forEach((pe) => {
    const res = data.seaFasteningResults[pe.id]
    if (!res) return
    const eq = data.libById[pe.equipment_id]
    y = sub(doc, `Sea-Fastening: ${pe.label ?? eq?.name ?? pe.id}`, y)

    y = tbl(doc, [
      { header: 'Parameter', width: 85 },
      { header: 'Value', width: 95 },
    ], [
      ['Design Acc (Trans / Long / Vert)', `${res.acc_transversal_ms2.toFixed(2)} / ${res.acc_longitudinal_ms2.toFixed(2)} / ${res.acc_vertical_ms2.toFixed(2)} m/s²`],
      ['Force Resultant (Horizontal)', `${res.force_horizontal_resultant_kn.toFixed(1)} kN`],
      ['Uplift Force', `${res.force_vertical_kn.toFixed(1)} kN`],
      ['Tie-downs Required', `${res.n_tiedowns} units`],
      ['MBL Required per Tie-down', `${res.mbl_required_per_tiedown_kn.toFixed(1)} kN`],
      ['Tie-down Type', res.tiedown_type ?? '-'],
      ['Status', res.tiedown_ok ? 'OK' : 'FAIL'],
    ], M, y)

    if (y > 260) { doc.addPage(); hdr(doc, pageNum); y = 20 }
    y += 5
  })
}

function stability(doc: jsPDF, pageNum: number, data: ReportData): void {
  const res = data.stabilityResult
  if (!res) return
  hdr(doc, pageNum)
  let y = sec(doc, '8. STABILITY SUMMARY', 20)

  y = sub(doc, 'Loading Condition', y)
  y = tbl(doc, [
    { header: 'Parameter', width: 85 },
    { header: 'Value', width: 95 },
  ], [
    ['Total Deck Load', `${res.total_deck_load_t.toFixed(1)} t`],
    ['Loaded Displacement', `${res.displacement_loaded_t.toFixed(1)} t`],
    ['Loaded KG', `${res.kg_loaded_m.toFixed(2)} m`],
    ['Loaded GM', `${res.gm_loaded_m.toFixed(2)} m`],
    ['GM Status', res.gm_ok ? 'OK' : 'FAIL'],
  ], M, y)
  y += 5

  y = sub(doc, 'Trim & List', y)
  y = tbl(doc, [
    { header: 'Parameter', width: 85 },
    { header: 'Value', width: 95 },
  ], [
    ['Trim Moment', `${res.trim_moment_tm.toFixed(0)} t·m`],
    ['Trim Angle', `${res.trim_angle_deg.toFixed(2)}°`],
    ['Trim Status', res.trim_ok ? 'OK' : 'FAIL'],
    ['List Moment', `${res.list_moment_tm.toFixed(0)} t·m`],
    ['List Angle', `${res.list_angle_deg.toFixed(2)}°`],
    ['List Status', res.list_ok ? 'OK' : 'FAIL'],
  ], M, y)
}

function loweringSummary(doc: jsPDF, pageNum: number, data: ReportData, images: CapturedImages): void {
  hdr(doc, pageNum)
  let y = sec(doc, '9. LOWERING SUMMARY', 20)

  data.placed.forEach((pe) => {
    const res = data.loweringResults[pe.id]
    if (!res) return
    const eq = data.libById[pe.equipment_id]
    y = sub(doc, `Lowering Analysis: ${pe.label ?? eq?.name ?? pe.id}`, y)

    y = tbl(doc, [
      { header: 'Parameter', width: 85 },
      { header: 'Value', width: 95 },
    ], [
      ['Submerged Hook Load', `${res.hook_load_submerged_t.toFixed(1)} t`],
      ['Buoyancy Force', `${res.buoyancy_force_kn.toFixed(1)} kN`],
      ['Max Current Drag', `${res.max_current_drag_kn.toFixed(1)} kN`],
      ['Residual Hook Tension', `${res.residual_hook_tension_t.toFixed(1)} t`],
      ['Status', res.residual_ok ? 'OK' : 'FAIL'],
    ], M, y)

    if (images.loweringPlot?.[pe.id]) {
      y += 2
      img(doc, images.loweringPlot[pe.id], M, y, 120, 60)
      y += 65
    }

    if (y > 230) { doc.addPage(); hdr(doc, pageNum); y = 20 }
    y += 5
  })
}

function dnvCalculationTrail(doc: jsPDF, pageNum: number, pe: ProjectEquipment, data: ReportData): void {
  const result = data.analysisResults[pe.id]
  const limits = data.seaStateLimits[result?.id ?? ''] ?? []
  if (!result || limits.length === 0) return

  // Find worst-case from limits (highest utilization)
  const worst = [...limits].sort((a, b) => b.utilization_pct - a.utilization_pct)[0]
  if (!worst) return

  const eq = data.libById[pe.equipment_id]
  
  // Recalculate intermediate values
  const kinematics = waveKinematics(worst.hs_m, worst.tp_s)
  const loads = splashZoneLoads({
    hs_m: worst.hs_m,
    tp_s: worst.tp_s,
    cd_z: result.cd_z,
    ca: result.ca,
    cs: result.cs,
    area_z_m2: result.projected_area_z_m2,
    volume_m3: result.submerged_volume_m3,
    crane_tip_heave_m: result.crane_tip_heave_m,
  })

  hdr(doc, pageNum)
  let y = sec(doc, `DNV CALCULATION TRAIL - ${pe.label ?? eq.name}`, 20)

  y = sub(doc, 'Design Sea State (Worst Case)', y)
  y = kv(doc, 'Significant Wave Height (Hs)', `${worst.hs_m.toFixed(2)} m`, M, y)
  y = kv(doc, 'Peak Period (Tp)', `${worst.tp_s.toFixed(1)} s`, M, y)
  y = kv(doc, 'Total Utilization', `${worst.utilization_pct.toFixed(1)} %`, M, y)
  y += 3

  y = sub(doc, '1. Wave Kinematics (z=0, Deep Water)', y)
  y = tbl(doc, [{ header: 'Parameter', width: 90 }, { header: 'Formula', width: 45 }, { header: 'Value', width: 45 }], [
    ['Angular Frequency (ω)', '2π / Tp', `${kinematics.omega.toFixed(3)} rad/s`],
    ['Wave Number (k)', 'ω² / g', `${kinematics.k.toFixed(4)} rad/m`],
    ['Wave Amplitude (A)', 'Hs / 2', `${kinematics.amplitude.toFixed(2)} m`],
    ['Vertical Water Velocity (v_w)', 'A · ω', `${kinematics.v_water.toFixed(2)} m/s`],
    ['Vertical Water Acc (a_w)', 'A · ω²', `${kinematics.a_water.toFixed(2)} m/s²`],
  ], M, y)
  y += 3

  y = sub(doc, '2. Crane Tip Motion', y)
  y = tbl(doc, [{ header: 'Parameter', width: 90 }, { header: 'Formula', width: 45 }, { header: 'Value', width: 45 }], [
    ['Crane Tip Velocity (v_ct)', 'v_z · ω', `${loads.v_ct.toFixed(2)} m/s`],
    ['Crane Tip Acceleration (a_ct)', 'v_z · ω²', `${loads.a_ct.toFixed(2)} m/s²`],
  ], M, y)
  y += 3

  y = sub(doc, '3. Hydrodynamic Forces', y)
  const v_rel = loads.v_ct + kinematics.v_water
  const a_rel = loads.a_ct + kinematics.a_water
  y = tbl(doc, [{ header: 'Parameter', width: 90 }, { header: 'Formula', width: 45 }, { header: 'Value', width: 45 }], [
    ['Relative Velocity (v_rel)', 'v_ct + v_w', `${v_rel.toFixed(2)} m/s`],
    ['Relative Acceleration (a_rel)', 'a_ct + a_w', `${a_rel.toFixed(2)} m/s²`],
    ['Drag Force (F_drag)', '0.5·ρ·Cd·A·v_rel²', `${(loads.f_drag_N / 1000).toFixed(1)} kN`],
    ['Inertia Force (F_inertia)', 'ρ·Ca·V·a_rel', `${(loads.f_inertia_N / 1000).toFixed(1)} kN`],
    ['Slamming Force (F_slam)', '0.5·ρ·Cs·A·v_rel²', `${(loads.f_slam_N / 1000).toFixed(1)} kN`],
  ], M, y)
}
