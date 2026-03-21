import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRiggingStore } from '../../stores/useRiggingStore'
import { loadRiggingItem } from '../../lib/supabase/riggingService'
import type { RiggingType } from '../../types/database'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Skeleton } from '../../components/ui/skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormValues {
  name: string
  rigging_type: RiggingType
  wll_t: string
  mbl_t: string
  weight_kg: string
  length_m: string
  standard_ref: string
}

const RIGGING_TYPES: { value: RiggingType; label: string }[] = [
  { value: 'sling', label: 'Sling' },
  { value: 'shackle', label: 'Shackle' },
  { value: 'spreader_bar', label: 'Spreader Bar' },
  { value: 'lifting_frame', label: 'Lifting Frame' },
  { value: 'other', label: 'Other' },
]

const EMPTY_FORM: FormValues = {
  name: '',
  rigging_type: 'sling',
  wll_t: '',
  mbl_t: '',
  weight_kg: '',
  length_m: '',
  standard_ref: '',
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string
  required?: boolean
  helper?: string
  error?: string
  children: React.ReactNode
}

function FieldRow({ label, required, helper, error, children }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[200px_1fr] items-start gap-4">
      <label className="pt-2 text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="space-y-1">
        {children}
        {helper && <p className="text-xs text-gray-400">{helper}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiggingEditorPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id

  const { saveItem } = useRiggingStore()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormValues, string>>
  >({})

  // Load existing item when editing
  useEffect(() => {
    if (isNew || !id) return
    setLoading(true)
    loadRiggingItem(id).then(({ data, error }) => {
      if (error || !data) {
        setSaveError(error ?? 'Failed to load item')
        setLoading(false)
        return
      }
      setValues({
        name: data.name,
        rigging_type: data.rigging_type,
        wll_t: String(data.wll_t),
        mbl_t: data.mbl_t !== null ? String(data.mbl_t) : '',
        weight_kg: String(data.weight_kg),
        length_m: data.length_m !== null ? String(data.length_m) : '',
        standard_ref: data.standard_ref ?? '',
      })
      setLoading(false)
    })
  }, [id, isNew])

  const handleChange = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormValues, string>> = {}
    if (!values.name.trim()) {
      errors.name = 'Name is required.'
    }
    if (!values.wll_t.trim()) {
      errors.wll_t = 'WLL is required.'
    } else if (isNaN(Number(values.wll_t)) || Number(values.wll_t) <= 0) {
      errors.wll_t = 'WLL must be a positive number.'
    }
    if (!values.weight_kg.trim()) {
      errors.weight_kg = 'Weight is required.'
    } else if (isNaN(Number(values.weight_kg)) || Number(values.weight_kg) <= 0) {
      errors.weight_kg = 'Weight must be a positive number.'
    }
    if (
      values.mbl_t.trim() &&
      (isNaN(Number(values.mbl_t)) || Number(values.mbl_t) <= 0)
    ) {
      errors.mbl_t = 'MBL must be a positive number.'
    }
    if (
      values.length_m.trim() &&
      (isNaN(Number(values.length_m)) || Number(values.length_m) <= 0)
    ) {
      errors.length_m = 'Length must be a positive number.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    setSaveError(null)

    const wll = Number(values.wll_t)
    const mbl = values.mbl_t.trim() ? Number(values.mbl_t) : wll * 5

    await saveItem({
      ...(isNew ? {} : { id }),
      name: values.name.trim(),
      rigging_type: values.rigging_type,
      wll_t: wll,
      mbl_t: mbl,
      weight_kg: Number(values.weight_kg),
      length_m: values.length_m.trim() ? Number(values.length_m) : null,
      standard_ref: values.standard_ref.trim() || null,
    })

    const { error } = useRiggingStore.getState()
    setSaving(false)

    if (error) {
      setSaveError(error)
    } else {
      navigate('/rigging')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-6 py-6">
          <Skeleton className="h-7 w-48" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[200px_1fr] gap-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">
            {isNew ? 'New Rigging Item' : 'Edit Rigging Item'}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FieldRow label="Name" required error={fieldErrors.name}>
              <Input
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. 4-leg sling set"
              />
            </FieldRow>

            <FieldRow label="Type" required>
              <Select
                value={values.rigging_type}
                onChange={(e) =>
                  handleChange('rigging_type', e.target.value)
                }
              >
                {RIGGING_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldRow>

            <FieldRow label="WLL (t)" required error={fieldErrors.wll_t}>
              <Input
                type="number"
                min={0}
                step="any"
                value={values.wll_t}
                onChange={(e) => handleChange('wll_t', e.target.value)}
                placeholder="e.g. 10"
              />
            </FieldRow>

            <FieldRow
              label="MBL (t)"
              error={fieldErrors.mbl_t}
              helper="If empty, MBL = WLL × 5 at save time"
            >
              <Input
                type="number"
                min={0}
                step="any"
                value={values.mbl_t}
                onChange={(e) => handleChange('mbl_t', e.target.value)}
                placeholder="Leave blank to auto-compute"
              />
            </FieldRow>

            <FieldRow
              label="Weight (kg)"
              required
              error={fieldErrors.weight_kg}
            >
              <Input
                type="number"
                min={0}
                step="any"
                value={values.weight_kg}
                onChange={(e) => handleChange('weight_kg', e.target.value)}
                placeholder="e.g. 125"
              />
            </FieldRow>

            <FieldRow label="Length (m)" error={fieldErrors.length_m}>
              <Input
                type="number"
                min={0}
                step="any"
                value={values.length_m}
                onChange={(e) => handleChange('length_m', e.target.value)}
                placeholder="Optional"
              />
            </FieldRow>

            <FieldRow label="Standard Reference">
              <Input
                value={values.standard_ref}
                onChange={(e) => handleChange('standard_ref', e.target.value)}
                placeholder="e.g. DNV-ST-0378"
              />
            </FieldRow>

            {saveError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {saveError}
              </p>
            )}

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate('/rigging')}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
