import { useState } from 'react'
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

type CollapsibleSectionProps = {
  title: string
  children: React.ReactNode
}

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="space-y-4 border-t border-gray-200 p-4">
          {children}
        </div>
      )}
    </div>
  )
}

/** Form fields for the equipment editor (name, dims, weight, geometry type, and v2 sections). */
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

      {/* v2: Center of Gravity */}
      <CollapsibleSection title="Center of Gravity">
        <p className="text-xs text-gray-500">
          CoG coordinates relative to equipment local origin (0,0,0 = centroid base).
        </p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="CoG X (m)" error={errors.cog_x_m}>
            <Input
              type="number"
              value={values.cog_x_m}
              step={0.01}
              onChange={(e) => onChange('cog_x_m', e.target.value)}
              placeholder="0.0"
            />
          </FormField>
          <FormField label="CoG Y (m)" error={errors.cog_y_m}>
            <Input
              type="number"
              value={values.cog_y_m}
              step={0.01}
              onChange={(e) => onChange('cog_y_m', e.target.value)}
              placeholder="0.0"
            />
          </FormField>
          <FormField label="CoG Z (m)" error={errors.cog_z_m} hint="Optional.">
            <Input
              type="number"
              value={values.cog_z_m}
              step={0.01}
              onChange={(e) => onChange('cog_z_m', e.target.value)}
              placeholder="optional"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* v2: Rigging Estimate */}
      <CollapsibleSection title="Rigging Estimate">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Rigging Weight (t)" error={errors.rigging_weight_t} hint="Total rigging assembly weight.">
            <Input
              type="number"
              value={values.rigging_weight_t}
              min={0}
              step={0.01}
              onChange={(e) => onChange('rigging_weight_t', e.target.value)}
              placeholder="optional"
            />
          </FormField>
          <FormField label="Contingency (%)" error={errors.contingency_pct} hint="Default 5%.">
            <Input
              type="number"
              value={values.contingency_pct}
              min={0}
              max={100}
              step={0.5}
              onChange={(e) => onChange('contingency_pct', e.target.value)}
              placeholder="5"
            />
          </FormField>
        </div>
      </CollapsibleSection>

      {/* v2: Hydrodynamic Overrides */}
      <CollapsibleSection title="Hydrodynamic Overrides">
        <p className="text-xs text-gray-500">
          Leave blank to use calculated values from geometry.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Cd X" error={errors.cd_override_x}>
            <Input
              type="number"
              value={values.cd_override_x}
              min={0}
              step={0.01}
              onChange={(e) => onChange('cd_override_x', e.target.value)}
              placeholder="auto"
            />
          </FormField>
          <FormField label="Cd Y" error={errors.cd_override_y}>
            <Input
              type="number"
              value={values.cd_override_y}
              min={0}
              step={0.01}
              onChange={(e) => onChange('cd_override_y', e.target.value)}
              placeholder="auto"
            />
          </FormField>
          <FormField label="Cd Z" error={errors.cd_override_z}>
            <Input
              type="number"
              value={values.cd_override_z}
              min={0}
              step={0.01}
              onChange={(e) => onChange('cd_override_z', e.target.value)}
              placeholder="auto"
            />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Ca (Added Mass)" error={errors.ca_override}>
            <Input
              type="number"
              value={values.ca_override}
              min={0}
              step={0.01}
              onChange={(e) => onChange('ca_override', e.target.value)}
              placeholder="auto"
            />
          </FormField>
          <FormField label="Cs (Slamming)" error={errors.cs_override}>
            <Input
              type="number"
              value={values.cs_override}
              min={0}
              step={0.01}
              onChange={(e) => onChange('cs_override', e.target.value)}
              placeholder="auto"
            />
          </FormField>
        </div>
        <FormField label="Geometry Notes" error={errors.geometry_notes}>
          <Textarea
            value={values.geometry_notes}
            onChange={(e) => onChange('geometry_notes', e.target.value)}
            placeholder="Notes on geometry simplification or special considerations…"
            rows={3}
            maxLength={2000}
          />
        </FormField>
      </CollapsibleSection>
    </div>
  )
}
