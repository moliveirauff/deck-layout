import { useState } from 'react'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { FormField } from './FormField'
import type { VesselFormState } from '../../hooks/useVesselEditor'

type ParticularsValues = Pick<
  VesselFormState,
  | 'lbp_m'
  | 'draft_operating_m'
  | 'beam_m'
  | 'displacement_t'
  | 'dp_class'
>

type Props = {
  values: ParticularsValues
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}

/**
 * Collapsible "Vessel Particulars" section for the Deck tab.
 * Closed by default.
 */
export function VesselParticularsSection({ values, errors, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span>Vessel Particulars</span>
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
          <div className="grid grid-cols-2 gap-4">
            <FormField label="LBP (m)" error={errors.lbp_m} hint="Length between perpendiculars.">
              <Input
                type="number"
                value={values.lbp_m}
                onChange={(e) => onChange('lbp_m', e.target.value)}
                placeholder="e.g. 130.0"
                min={0}
                step={0.1}
              />
            </FormField>

            <FormField label="Draft Operating (m)" error={errors.draft_operating_m}>
              <Input
                type="number"
                value={values.draft_operating_m}
                onChange={(e) => onChange('draft_operating_m', e.target.value)}
                placeholder="e.g. 7.5"
                min={0}
                step={0.01}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Beam (m)" error={errors.beam_m}>
              <Input
                type="number"
                value={values.beam_m}
                onChange={(e) => onChange('beam_m', e.target.value)}
                placeholder="e.g. 30.0"
                min={0}
                step={0.1}
              />
            </FormField>

            <FormField label="Displacement (t)" error={errors.displacement_t}>
              <Input
                type="number"
                value={values.displacement_t}
                onChange={(e) => onChange('displacement_t', e.target.value)}
                placeholder="e.g. 12000"
                min={0}
                step={1}
              />
            </FormField>
          </div>

          <FormField label="DP Class" error={errors.dp_class}>
            <Select
              value={values.dp_class}
              onChange={(e) => onChange('dp_class', e.target.value)}
            >
              <option value="none">None</option>
              <option value="DP1">DP1</option>
              <option value="DP2">DP2</option>
              <option value="DP3">DP3</option>
            </Select>
          </FormField>
        </div>
      )}
    </div>
  )
}
