import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import { DeckTab } from '../../components/vessels/DeckTab'
import { CraneTab } from '../../components/vessels/CraneTab'
import { BarriersTab } from '../../components/vessels/BarriersTab'
import { DeckLoadZonesTab } from '../../components/vessels/DeckLoadZonesTab'
import { CraneCurveTab } from '../../components/vessels/CraneCurveTab'
import { VesselRaoTab } from '../../components/vessels/VesselRaoTab'
import { DeckPreviewCanvas } from '../../components/vessels/DeckPreviewCanvas'
import { useVesselEditor } from '../../hooks/useVesselEditor'

export default function VesselEditorPage() {
  const navigate = useNavigate()
  const { id: vesselId } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState('deck')

  const {
    isNew, loading, saving, notification,
    values, fieldErrors, handleChange,
    barriers, setBarriers,
    zones, setZones,
    cranePoints, setCranePoints,
    deckLength, deckWidth,
    handleSave,
  } = useVesselEditor()

  if (loading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-px" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="flex flex-1 overflow-hidden p-6 gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-24" />)}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-48" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="w-72 h-64 shrink-0" />
        </div>
      </div>
    )
  }

  const title = isNew ? 'New Vessel' : (values.name || 'Vessel Editor')

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/vessels')}>
            ← Back to Vessels
          </Button>
          <span className="text-gray-300">|</span>
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`shrink-0 px-6 py-2 text-sm font-medium ${
            notification.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — 40% — 2D deck preview */}
        <div className="w-2/5 shrink-0 border-r border-gray-200 p-4">
          <div className="h-full rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <DeckPreviewCanvas
              values={values}
              barriers={barriers}
              zones={zones}
              cranePoints={cranePoints}
            />
          </div>
        </div>

        {/* Right panel — 60% — tabbed form */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 flex-col overflow-hidden">
            <TabsList>
              <TabsTrigger value="deck">Deck</TabsTrigger>
              <TabsTrigger value="barriers">Barriers</TabsTrigger>
              <TabsTrigger value="load-zones">Deck Load Zones</TabsTrigger>
              <TabsTrigger value="crane">Crane</TabsTrigger>
              <TabsTrigger value="crane-curve">Crane Curve</TabsTrigger>
              <TabsTrigger value="rao">RAO</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto">
              <TabsContent value="deck">
                <DeckTab values={values} errors={fieldErrors} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="barriers">
                <BarriersTab
                  rows={barriers}
                  deckLength={deckLength}
                  deckWidth={deckWidth}
                  onChange={setBarriers}
                />
              </TabsContent>
              <TabsContent value="load-zones">
                <DeckLoadZonesTab
                  rows={zones}
                  deckLength={deckLength}
                  deckWidth={deckWidth}
                  onChange={setZones}
                />
              </TabsContent>
              <TabsContent value="crane">
                <CraneTab values={values} errors={fieldErrors} onChange={handleChange} />
              </TabsContent>
              <TabsContent value="crane-curve">
                <CraneCurveTab rows={cranePoints} onChange={setCranePoints} />
              </TabsContent>
              <TabsContent value="rao">
                <VesselRaoTab vesselId={vesselId ?? null} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
