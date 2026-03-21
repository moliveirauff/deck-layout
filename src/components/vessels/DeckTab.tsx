import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { FormField } from './FormField'

type DeckValues = {
  name: string
  vessel_type: string
  description: string
  deck_length_m: string
  deck_width_m: string
}

type DeckTabProps = {
  values: DeckValues
  errors: Record<string, string>
  onChange: (field: string, value: string) => void
}

/** Tab 1 — Deck: vessel identification and deck dimensions. */
export function DeckTab({ values, errors, onChange }: DeckTabProps) {
  return (
    <div className="space-y-5 p-6">
      <FormField label="Vessel Name" error={errors.name}>
        <Input
          value={values.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g. Seven Seas"
          maxLength={200}
        />
      </FormField>

      <FormField label="Vessel Type" error={errors.vessel_type}>
        <Select
          value={values.vessel_type}
          onChange={(e) => onChange('vessel_type', e.target.value)}
        >
          <option value="PLSV">PLSV — Pipe-Lay Support Vessel</option>
          <option value="LCV">LCV — Light Construction Vessel</option>
          <option value="HLV">HLV — Heavy Lift Vessel</option>
        </Select>
      </FormField>

      <FormField label="Description" error={errors.description}>
        <Textarea
          value={values.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Optional notes (fleet, owner, region…)"
          rows={3}
          maxLength={1000}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Deck Length (m)"
          error={errors.deck_length_m}
          hint="Usable deck length along X axis. Max 300 m."
        >
          <Input
            type="number"
            value={values.deck_length_m}
            onChange={(e) => onChange('deck_length_m', e.target.value)}
            placeholder="e.g. 80"
            min={0}
            max={300}
            step={0.1}
          />
        </FormField>

        <FormField
          label="Deck Width (m)"
          error={errors.deck_width_m}
          hint="Usable deck width along Y axis. Max 60 m."
        >
          <Input
            type="number"
            value={values.deck_width_m}
            onChange={(e) => onChange('deck_width_m', e.target.value)}
            placeholder="e.g. 25"
            min={0}
            max={60}
            step={0.1}
          />
        </FormField>
      </div>
    </div>
  )
}
