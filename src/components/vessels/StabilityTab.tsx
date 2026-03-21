import { Input } from '../ui/input'
import { FormField } from './FormField'
import type { VesselFormState } from '../../hooks/useVesselEditor'

type StabilityValues = Pick<
  VesselFormState,
  | 'kg_lightship_m'
  | 'gm_min_m'
  | 'roll_natural_period_s'
  | 'pitch_natural_period_s'
  | 'deck_elevation_m'
>

type StabilityTabProps = {
  values: StabilityValues
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}

/** Tab 7 — Stability: vessel stability and motion parameters (v2). */
export function StabilityTab({ values, errors, onChange }: StabilityTabProps) {
  return (
    <div className="space-y-5 p-6">
      <p className="text-sm text-gray-500">
        Optional stability parameters used for sea-fastening and stability calculations.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="KG Lightship (m)" error={errors.kg_lightship_m}>
          <Input
            type="number"
            value={values.kg_lightship_m}
            onChange={(e) => onChange('kg_lightship_m', e.target.value)}
            placeholder="e.g. 8.5"
            min={0}
            step={0.01}
          />
        </FormField>

        <FormField
          label="GM Minimum (m)"
          error={errors.gm_min_m}
          hint="Minimum metacentric height."
        >
          <Input
            type="number"
            value={values.gm_min_m}
            onChange={(e) => onChange('gm_min_m', e.target.value)}
            placeholder="e.g. 1.0"
            step={0.01}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Roll Natural Period (s)"
          error={errors.roll_natural_period_s}
          hint="Natural roll period of the vessel."
        >
          <Input
            type="number"
            value={values.roll_natural_period_s}
            onChange={(e) => onChange('roll_natural_period_s', e.target.value)}
            placeholder="e.g. 14.0"
            min={0}
            step={0.1}
          />
        </FormField>

        <FormField
          label="Pitch Natural Period (s)"
          error={errors.pitch_natural_period_s}
          hint="Natural pitch period of the vessel."
        >
          <Input
            type="number"
            value={values.pitch_natural_period_s}
            onChange={(e) => onChange('pitch_natural_period_s', e.target.value)}
            placeholder="e.g. 10.0"
            min={0}
            step={0.1}
          />
        </FormField>
      </div>

      <FormField
        label="Deck Elevation (m)"
        error={errors.deck_elevation_m}
        hint="Height of main deck above waterline."
      >
        <Input
          type="number"
          value={values.deck_elevation_m}
          onChange={(e) => onChange('deck_elevation_m', e.target.value)}
          placeholder="e.g. 5.0"
          min={0}
          step={0.1}
        />
      </FormField>
    </div>
  )
}
