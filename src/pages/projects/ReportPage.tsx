import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '../../stores/useProjectStore'
import { useDeckLayoutStore } from '../../stores/useDeckLayoutStore'
import { useEquipmentStore } from '../../stores/useEquipmentStore'
import { useRaoStore } from '../../stores/useRaoStore'
import { useAnalysisStore } from '../../stores/useAnalysisStore'
import { useWeatherStore } from '../../stores/useWeatherStore'
import { Button } from '../../components/ui/button'
import { CaptureLayer, type CaptureLayerApi } from '../../components/report/CaptureLayer'
import { buildPdf, type ReportData, type ReportSections } from '../../lib/report/buildPdf'
import { calculateCraneTipMotion, craneTipPosition } from '../../lib/calculations/motion/craneTipMotion'
import type { EquipmentLibrary } from '../../types/database'

type SectionKey = keyof ReportSections

const ALL_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'vesselSummary', label: 'Vessel & Crane Summary' },
  { key: 'equipmentList', label: 'Equipment List' },
  { key: 'deckLayout', label: 'Deck Layout (2D capture)' },
  { key: 'craneCapacity', label: 'Crane Capacity Verification' },
  { key: 'dnvAnalysis', label: 'DNV Analysis Results' },
  { key: 'seaStateTables', label: 'Sea State Operability Tables' },
  { key: 'weatherWindow', label: 'Weather Window Results' },
  { key: 'view3d', label: '3D View' },
]

const STEPS = [
  'Collecting data',
  'Preparing captures',
  'Capturing crane chart',
  'Capturing sea state tables',
  'Capturing scatter overlay',
  'Capturing 3D view',
  'Assembling PDF',
  'Complete',
]

function defaultSections(): ReportSections {
  return {
    vesselSummary: true, equipmentList: true, deckLayout: true,
    craneCapacity: true, dnvAnalysis: true, seaStateTables: true,
    weatherWindow: true, view3d: true,
  }
}

export default function ReportPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const activeProject = useProjectStore((s) => s.activeProject)
  const deckStore = useDeckLayoutStore()
  const equipStore = useEquipmentStore()
  const raoStore = useRaoStore()
  const analysisStore = useAnalysisStore()
  const weatherStore = useWeatherStore()

  const [sections, setSections] = useState<ReportSections>(defaultSections)
  const [generating, setGenerating] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<import('jspdf').jsPDF | null>(null)
  const [showCapture, setShowCapture] = useState(false)
  const captureRef = useRef<CaptureLayerApi>(null)
  const prevPdfUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    void deckStore.loadProjectEquipment(projectId)
    void equipStore.loadEquipment()
    void raoStore.loadRaos(projectId)
    void weatherStore.loadScatterDiagram(projectId)
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const pe of deckStore.items) {
      if (!analysisStore.results[pe.id]) void analysisStore.loadResults(pe.id)
    }
  }, [deckStore.items]) // eslint-disable-line react-hooks/exhaustive-deps

  const libById = useMemo<Record<string, EquipmentLibrary>>(() => {
    const m: Record<string, EquipmentLibrary> = {}
    equipStore.items.forEach((e) => { m[e.id] = e })
    return m
  }, [equipStore.items])

  const vessel = activeProject?.vessel_snapshot?.vessel ?? null
  const barriers = activeProject?.vessel_snapshot?.barriers ?? []
  const deckLoadZones = activeProject?.vessel_snapshot?.deck_load_zones ?? []
  const craneCurve = activeProject?.vessel_snapshot?.crane_curve_points ?? []

  const hasEquipment = deckStore.items.length > 0
  const hasAnalysis = Object.keys(analysisStore.results).length > 0
  const hasLimits = Object.values(analysisStore.seaStateLimits).some(l => l.length > 0)
  const hasScatter = weatherStore.scatterEntries.length > 0

  function isAvailable(key: SectionKey): boolean {
    if (key === 'equipmentList' || key === 'deckLayout' || key === 'craneCapacity') return hasEquipment
    if (key === 'dnvAnalysis') return hasAnalysis
    if (key === 'seaStateTables') return hasLimits
    if (key === 'weatherWindow') return hasScatter
    return true
  }

  function toggle(key: SectionKey) {
    if (!isAvailable(key)) return
    setSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleGenerate() {
    if (!vessel || !activeProject) return
    setGenerating(true)
    setStepIdx(0)
    setShowCapture(true)

    try {
      await new Promise(r => setTimeout(r, 400)) // mount capture layer
      setStepIdx(1)

      const craneTipResults: ReportData['craneTipResults'] = {}
      for (const pe of deckStore.items) {
        if (!pe.crane_radius_overboard_m || !pe.crane_boom_angle_overboard_deg) continue
        const tip = craneTipPosition(
          vessel.crane_pedestal_x, vessel.crane_pedestal_y, vessel.crane_pedestal_height_m,
          pe.crane_radius_overboard_m, pe.crane_slew_overboard_deg ?? 0,
          pe.crane_boom_angle_overboard_deg, vessel.crane_boom_length_m,
        )
        craneTipResults[pe.id] = calculateCraneTipMotion(raoStore.entries, tip)
      }

      const data: ReportData = {
        project: activeProject,
        vessel, barriers, deckLoadZones, craneCurve,
        placed: deckStore.items, libById,
        analysisResults: analysisStore.results,
        seaStateLimits: analysisStore.seaStateLimits,
        scatterEntries: weatherStore.scatterEntries,
        craneTipResults,
      }

      setStepIdx(2)
      const images = await captureRef.current!.captureAll()
      setStepIdx(6)

      await new Promise(r => setTimeout(r, 50))
      const doc = buildPdf(data, sections, images)
      setStepIdx(7)

      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current)
      const url = URL.createObjectURL(doc.output('blob'))
      prevPdfUrl.current = url
      setPdfUrl(url)
      setPdfDoc(doc)
    } finally {
      setGenerating(false)
      setShowCapture(false)
    }
  }

  function handleDownload() {
    if (!pdfDoc || !activeProject) return
    const date = new Date().toISOString().split('T')[0]
    const name = activeProject.name.replace(/[^a-z0-9]/gi, '_')
    pdfDoc.save(`SubLift_Report_${name}_${date}.pdf`)
  }

  const pct = Math.round((stepIdx / (STEPS.length - 1)) * 100)

  if (!vessel) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">No vessel snapshot.</div>
  }

  return (
    <div className="overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <h1 className="text-xl font-semibold text-gray-900">Operation Report</h1>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate Report'}
        </Button>
      </div>

      {/* Section checkboxes */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">Include in Report</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
          {ALL_SECTIONS.map(({ key, label }) => {
            const avail = isAvailable(key)
            return (
              <label
                key={key}
                className={`flex items-center gap-2 text-sm select-none ${avail ? 'cursor-pointer text-gray-800' : 'cursor-not-allowed text-gray-400'}`}
              >
                <input
                  type="checkbox"
                  checked={sections[key] && avail}
                  onChange={() => toggle(key)}
                  disabled={!avail}
                  className="w-4 h-4 accent-blue-600"
                />
                {label}
                {!avail && <span className="text-[11px] text-gray-400">(no data)</span>}
              </label>
            )
          })}
        </div>
      </section>

      {/* Progress bar (only during generation) */}
      {generating && (
        <section className="space-y-3">
          <div className="max-w-sm space-y-1.5">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{STEPS[Math.min(stepIdx, STEPS.length - 1)]}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Preview + download */}
      {pdfUrl && !generating && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-700">Preview</h2>
            <Button size="sm" variant="outline" onClick={handleDownload}>
              ↓ Download PDF
            </Button>
          </div>
          <iframe
            src={pdfUrl}
            className="w-full rounded-lg border border-gray-200"
            style={{ height: '72vh' }}
            title="PDF Preview"
          />
        </section>
      )}

      {/* Off-screen capture layer — only mounted during generation */}
      {showCapture && (
        <CaptureLayer
          ref={captureRef}
          data={{
            project: activeProject!,
            vessel, barriers, deckLoadZones, craneCurve,
            placed: deckStore.items, libById,
            analysisResults: analysisStore.results,
            seaStateLimits: analysisStore.seaStateLimits,
            scatterEntries: weatherStore.scatterEntries,
            craneTipResults: {},
          }}
          sections={sections}
        />
      )}
      </div>
    </div>
  )
}

