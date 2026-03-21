import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Skeleton } from '../../components/ui/skeleton'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { FormField } from '../../components/vessels/FormField'
import { loadVessels } from '../../lib/supabase/vesselService'
import { copyVesselRaosToProject } from '../../lib/supabase/raoService'
import { useProjectStore } from '../../stores/useProjectStore'
import { projectSchema } from '../../validation/schemas'
import type { Vessel } from '../../types/database'

type FormState = {
  name: string
  description: string
  field_name: string
  water_depth_m: string
  vessel_id: string
}

const INITIAL: FormState = {
  name: '',
  description: '',
  field_name: '',
  water_depth_m: '',
  vessel_id: '',
}

export default function NewProjectPage() {
  const navigate = useNavigate()
  const { createProject, isSaving, error: storeError } = useProjectStore()

  const [vessels, setVessels] = useState<Vessel[]>([])
  const [loadingVessels, setLoadingVessels] = useState(true)
  const [values, setValues] = useState<FormState>(INITIAL)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    void loadVessels().then(({ data }) => {
      setVessels(data ?? [])
      setLoadingVessels(false)
    })
  }, [])

  function handleChange(field: keyof FormState, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }

  async function handleCreate() {
    setFieldErrors({})
    setSubmitError(null)

    const raw = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      field_name: values.field_name.trim() || null,
      water_depth_m: values.water_depth_m ? parseFloat(values.water_depth_m) : null,
      vessel_id: values.vessel_id,
      status: 'draft' as const,
    }

    const result = projectSchema.safeParse(raw)
    if (!result.success) {
      const fe: Record<string, string> = {}
      result.error.errors.forEach((e) => { const f = e.path[0]?.toString(); if (f) fe[f] = e.message })
      setFieldErrors(fe)
      return
    }

    const created = await createProject({
      ...result.data,
      description: result.data.description ?? null,
      field_name: result.data.field_name ?? null,
      water_depth_m: result.data.water_depth_m ?? null,
      vessel_snapshot: null,
    })

    if (!created) {
      setSubmitError(storeError ?? 'Failed to create project.')
      return
    }

    // Auto-copy vessel RAOs into the new project so Analysis page has RAO data immediately
    await copyVesselRaosToProject(result.data.vessel_id, created.id)

    navigate(`/projects/${created.id}`)
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-2xl px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>← Projects</Button>
            <h1 className="text-xl font-semibold text-gray-900">New Project</h1>
          </div>
        </div>

        {submitError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{submitError}</div>
        )}

        <div className="space-y-6">
          <FormField label="Project Name *" error={fieldErrors.name}>
            <Input value={values.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="e.g. Búzios PLET Campaign" maxLength={200} />
          </FormField>

          <FormField label="Description" error={fieldErrors.description}>
            <Textarea value={values.description} onChange={(e) => handleChange('description', e.target.value)} rows={2} maxLength={1000} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Field Name" error={fieldErrors.field_name}>
              <Input value={values.field_name} onChange={(e) => handleChange('field_name', e.target.value)} placeholder="e.g. Búzios" maxLength={200} />
            </FormField>
            <FormField label="Water Depth (m)" error={fieldErrors.water_depth_m}>
              <Input type="number" value={values.water_depth_m} min={0.1} max={5000} step={1} onChange={(e) => handleChange('water_depth_m', e.target.value)} placeholder="e.g. 2100" />
            </FormField>
          </div>

          <FormField label="Select Vessel *" error={fieldErrors.vessel_id}>
            {loadingVessels ? (
              <div className="space-y-2 rounded-lg border border-gray-200 p-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : vessels.length === 0 ? (
              <p className="text-sm text-amber-600">
                No vessels in library.{' '}
                <button className="underline" onClick={() => navigate('/vessels/new')}>Add one first.</button>
              </p>
            ) : (
              <div className="space-y-1 rounded-lg border border-gray-200 p-2">
                {vessels.map((v) => (
                  <label key={v.id} className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 transition-colors ${values.vessel_id === v.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name="vessel_id" value={v.id} checked={values.vessel_id === v.id} onChange={(e) => handleChange('vessel_id', e.target.value)} className="mt-0.5 accent-blue-600" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {v.name} <span className="font-normal text-gray-500">({v.vessel_type})</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        {v.deck_length_m}×{v.deck_width_m} m deck ·{' '}
                        {v.crane_type === 'knuckle_boom' ? 'Knuckle boom' : 'OMC'} ·{' '}
                        {v.crane_boom_length_m} m boom
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/projects')}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? 'Creating…' : 'Create Project'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

