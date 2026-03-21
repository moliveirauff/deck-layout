import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { FormField } from '../vessels/FormField'
import type { EquipmentFormState } from '../../hooks/useEquipmentEditor'

type Props = {
  values: EquipmentFormState
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}

/** Form fields for the equipment editor (name, dims, weight, geometry type). */
export function EquipmentForm({ values, errors, onChange }: Props) {
  return (
    <div className="space-y-4 p-4">
      <FormField label="Name *" error={errors.name}>
        <Input
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g. PLET-A"
          maxLength={200}
        />
      </FormField>

      <FormField label="Description" error={errors.description}>
        <Textarea
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Optional description"
          rows={2}
          maxLength={1000}
        />
      </FormField>

      <FormField label="Geometry Type *" error={errors.geometry_type}>
        <Select
          value={values.geometry_type}
          onChange={(e) => onChange('geometry_type', e.target.value)}
        >
          <option value="box">Box</option>
          <option value="cylinder">Cylinder</option>
        </Select>
      </FormField>

      <div className="grid grid-cols-3 gap-3">
        <FormField label="Length (m) *" error={errors.length_m}>
          <Input
            type="number"
            value={values.length_m}
            min={0.01}
            step={0.1}
            onChange={(e) => onChange('length_m', e.target.value)}
            placeholder="e.g. 5.0"
          />
        </FormField>
        <FormField
          label={values.geometry_type === 'cylinder' ? 'Diameter (m) *' : 'Width (m) *'}
          error={errors.width_m}
        >
          <Input
            type="number"
            value={values.width_m}
            min={0.01}
            step={0.1}
            onChange={(e) => onChange('width_m', e.target.value)}
            placeholder="e.g. 2.0"
          />
        </FormField>
        <FormField label="Height (m) *" error={errors.height_m}>
          <Input
            type="number"
            value={values.height_m}
            min={0.01}
            step={0.1}
            onChange={(e) => onChange('height_m', e.target.value)}
            placeholder="e.g. 3.0"
          />
        </FormField>
      </div>

      <FormField label="Dry Weight (t) *" error={errors.dry_weight_t}>
        <Input
          type="number"
          value={values.dry_weight_t}
          min={0.01}
          step={0.1}
          onChange={(e) => onChange('dry_weight_t', e.target.value)}
          placeholder="e.g. 20.0"
          className="w-40"
        />
      </FormField>

      <FormField
        label="Submerged Volume (m³)"
        hint="Optional. If omitted, volume will be calculated from geometry."
        error={errors.submerged_volume_m3}
      >
        <Input
          type="number"
          value={values.submerged_volume_m3}
          min={0.01}
          step={0.1}
          onChange={(e) => onChange('submerged_volume_m3', e.target.value)}
          placeholder="optional"
          className="w-40"
        />
      </FormField>
    </div>
  )
}
