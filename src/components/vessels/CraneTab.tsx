import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { FormField } from './FormField'

type CraneValues = {
  crane_type: string
  crane_pedestal_x: string
  crane_pedestal_y: string
  crane_pedestal_height_m: string
  crane_boom_length_m: string
  crane_jib_length_m: string
  crane_slew_min_deg: string
  crane_slew_max_deg: string
}

type CraneTabProps = {
  values: CraneValues
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}

/** Tab 4 — Crane: crane type, pedestal geometry, boom, and slew limits. */
export function CraneTab({ values, errors, onChange }: CraneTabProps) {
  const isKnuckleBoom = values.crane_type === 'knuckle_boom'

  return (
    <div className="space-y-5 p-6">
      <FormField label="Crane Type" error={errors.crane_type}>
        <Select
          value={values.crane_type}
          onChange={(e) => onChange('crane_type', e.target.value)}
        >
          <option value="OMC">OMC — Offshore Mast Crane</option>
          <option value="knuckle_boom">Knuckle Boom</option>
        </Select>
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Pedestal X (m)"
          error={errors.crane_pedestal_x}
          hint="Distance from deck origin along X (bow direction)."
        >
          <Input
            type="number"
            value={values.crane_pedestal_x}
            onChange={(e) => onChange('crane_pedestal_x', e.target.value)}
            placeholder="e.g. 10"
            step={0.1}
          />
        </FormField>

        <FormField
          label="Pedestal Y (m)"
          error={errors.crane_pedestal_y}
          hint="Distance from deck origin along Y (port direction)."
        >
          <Input
            type="number"
            value={values.crane_pedestal_y}
            onChange={(e) => onChange('crane_pedestal_y', e.target.value)}
            placeholder="e.g. 12.5"
            step={0.1}
          />
        </FormField>
      </div>

      <FormField label="Pedestal Height (m)" error={errors.crane_pedestal_height_m}>
        <Input
          type="number"
          value={values.crane_pedestal_height_m}
          onChange={(e) => onChange('crane_pedestal_height_m', e.target.value)}
          placeholder="e.g. 6"
          min={0}
          step={0.1}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Main Boom Length (m)" error={errors.crane_boom_length_m}>
          <Input
            type="number"
            value={values.crane_boom_length_m}
            onChange={(e) => onChange('crane_boom_length_m', e.target.value)}
            placeholder="e.g. 35"
            min={0}
            step={0.1}
          />
        </FormField>

        {isKnuckleBoom && (
          <FormField
            label="Jib Length (m)"
            error={errors.crane_jib_length_m}
            hint="Knuckle boom only."
          >
            <Input
              type="number"
              value={values.crane_jib_length_m}
              onChange={(e) => onChange('crane_jib_length_m', e.target.value)}
              placeholder="e.g. 15"
              min={0}
              step={0.1}
            />
          </FormField>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Min Slew Angle (°)" error={errors.crane_slew_min_deg}>
          <Input
            type="number"
            value={values.crane_slew_min_deg}
            onChange={(e) => onChange('crane_slew_min_deg', e.target.value)}
            placeholder="0"
            min={-360}
            max={360}
            step={1}
          />
        </FormField>

        <FormField label="Max Slew Angle (°)" error={errors.crane_slew_max_deg}>
          <Input
            type="number"
            value={values.crane_slew_max_deg}
            onChange={(e) => onChange('crane_slew_max_deg', e.target.value)}
            placeholder="360"
            min={-360}
            max={360}
            step={1}
          />
        </FormField>
      </div>
    </div>
  )
}
