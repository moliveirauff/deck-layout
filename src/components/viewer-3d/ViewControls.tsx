import type { SceneCaptureApi, CameraPreset } from './SceneCapture'
import type { ViewMode } from './EquipmentMesh'

type Toggles = {
  barriers: boolean
  loadZones: boolean
  grid: boolean
  water: boolean
  labels: boolean
}

type Props = {
  viewMode: ViewMode
  onViewMode: (v: ViewMode) => void
  toggles: Toggles
  onToggle: (key: keyof Toggles) => void
  captureRef: React.RefObject<SceneCaptureApi>
  cx: number
  cz: number
  onScreenshot: (dataUrl: string) => void
}

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'deck', label: 'Deck' },
  { value: 'overboard', label: 'Overboard' },
  { value: 'both', label: 'Both' },
]

const PRESETS: { value: CameraPreset; label: string }[] = [
  { value: 'perspective', label: 'Perspective' },
  { value: 'top', label: 'Top' },
  { value: 'side', label: 'Side' },
  { value: 'front', label: 'Front' },
]

const TOGGLE_LABELS: { key: keyof Toggles; label: string }[] = [
  { key: 'barriers', label: 'Barriers' },
  { key: 'loadZones', label: 'Load Zones' },
  { key: 'grid', label: 'Grid' },
  { key: 'water', label: 'Water' },
  { key: 'labels', label: 'Labels' },
]

export function ViewControls({ viewMode, onViewMode, toggles, onToggle, captureRef, cx, cz, onScreenshot }: Props) {
  function handlePreset(preset: CameraPreset) {
    captureRef.current?.setCamera(preset, cx, cz)
  }

  function handleScreenshot() {
    const url = captureRef.current?.capture()
    if (url) onScreenshot(url)
  }

  return (
    <div className="flex flex-col gap-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm text-xs w-44 shrink-0">

      {/* View Mode */}
      <div>
        <p className="font-semibold text-gray-600 mb-1.5">View Mode</p>
        <div className="flex flex-col gap-1">
          {VIEW_MODES.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="viewMode"
                value={value}
                checked={viewMode === value}
                onChange={() => onViewMode(value)}
                className="accent-blue-600"
              />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Show / Hide */}
      <div>
        <p className="font-semibold text-gray-600 mb-1.5">Show / Hide</p>
        <div className="flex flex-col gap-1">
          {TOGGLE_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={toggles[key]}
                onChange={() => onToggle(key)}
                className="accent-blue-600"
              />
              <span className="text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Camera Presets */}
      <div>
        <p className="font-semibold text-gray-600 mb-1.5">Camera</p>
        <div className="flex flex-col gap-1">
          {PRESETS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handlePreset(value)}
              className="text-left px-2 py-1 rounded hover:bg-gray-100 text-gray-700 transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Screenshot */}
      <button
        onClick={handleScreenshot}
        className="w-full rounded bg-blue-600 px-2 py-1.5 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Screenshot
      </button>
    </div>
  )
}
