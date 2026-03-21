import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { loadEquipmentItem, saveEquipment } from '../lib/supabase/equipmentService'
import { equipmentSchema } from '../validation/schemas'
import type { GeometryType } from '../types/database'

export type EquipmentFormState = {
  name: string
  description: string
  geometry_type: string
  length_m: string
  width_m: string
  height_m: string
  dry_weight_t: string
  submerged_volume_m3: string
  // v2 CoG fields
  cog_x_m: string
  cog_y_m: string
  cog_z_m: string
  // v2 rigging fields
  rigging_weight_t: string
  contingency_pct: string
  // v2 hydro overrides
  cd_override_x: string
  cd_override_y: string
  cd_override_z: string
  ca_override: string
  cs_override: string
  geometry_notes: string
}

const DEFAULT_EQUIPMENT: EquipmentFormState = {
  name: '',
  description: '',
  geometry_type: 'box',
  length_m: '',
  width_m: '',
  height_m: '',
  dry_weight_t: '',
  submerged_volume_m3: '',
  cog_x_m: '0',
  cog_y_m: '0',
  cog_z_m: '',
  rigging_weight_t: '',
  contingency_pct: '5',
  cd_override_x: '',
  cd_override_y: '',
  cd_override_z: '',
  ca_override: '',
  cs_override: '',
  geometry_notes: '',
}

export function useEquipmentEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === undefined

  const [values, setValues] = useState<EquipmentFormState>(DEFAULT_EQUIPMENT)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    void loadEquipmentItem(id).then(({ data, error }) => {
      if (error || !data) {
        setNotification({ msg: `Load failed: ${error ?? 'not found'}`, ok: false })
      } else {
        setValues({
          name: data.name,
          description: data.description ?? '',
          geometry_type: data.geometry_type,
          length_m: String(data.length_m),
          width_m: String(data.width_m),
          height_m: String(data.height_m),
          dry_weight_t: String(data.dry_weight_t),
          submerged_volume_m3: data.submerged_volume_m3 != null ? String(data.submerged_volume_m3) : '',
          cog_x_m: String(data.cog_x_m ?? 0),
          cog_y_m: String(data.cog_y_m ?? 0),
          cog_z_m: data.cog_z_m != null ? String(data.cog_z_m) : '',
          rigging_weight_t: data.rigging_weight_t != null ? String(data.rigging_weight_t) : '',
          contingency_pct: String(data.contingency_pct ?? 5),
          cd_override_x: data.cd_override_x != null ? String(data.cd_override_x) : '',
          cd_override_y: data.cd_override_y != null ? String(data.cd_override_y) : '',
          cd_override_z: data.cd_override_z != null ? String(data.cd_override_z) : '',
          ca_override: data.ca_override != null ? String(data.ca_override) : '',
          cs_override: data.cs_override != null ? String(data.cs_override) : '',
          geometry_notes: data.geometry_notes ?? '',
        })
      }
      setLoading(false)
    })
  }, [id])

  const handleChange = useCallback((field: string, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }, [])

  async function handleSave() {
    setSaving(true)
    setFieldErrors({})
    setNotification(null)

    const raw = {
      name: values.name.trim(),
      description: values.description.trim() || null,
      geometry_type: values.geometry_type as GeometryType,
      length_m: parseFloat(values.length_m),
      width_m: parseFloat(values.width_m),
      height_m: parseFloat(values.height_m),
      dry_weight_t: parseFloat(values.dry_weight_t),
      submerged_volume_m3: values.submerged_volume_m3 ? parseFloat(values.submerged_volume_m3) : null,
      // v2 fields
      cog_x_m: parseFloat(values.cog_x_m) || 0,
      cog_y_m: parseFloat(values.cog_y_m) || 0,
      cog_z_m: values.cog_z_m ? parseFloat(values.cog_z_m) : null,
      rigging_weight_t: values.rigging_weight_t ? parseFloat(values.rigging_weight_t) : null,
      contingency_pct: parseFloat(values.contingency_pct) || 5,
      cd_override_x: values.cd_override_x ? parseFloat(values.cd_override_x) : null,
      cd_override_y: values.cd_override_y ? parseFloat(values.cd_override_y) : null,
      cd_override_z: values.cd_override_z ? parseFloat(values.cd_override_z) : null,
      ca_override: values.ca_override ? parseFloat(values.ca_override) : null,
      cs_override: values.cs_override ? parseFloat(values.cs_override) : null,
      geometry_notes: values.geometry_notes.trim() || null,
    }

    const result = equipmentSchema.safeParse(raw)
    if (!result.success) {
      const fe: Record<string, string> = {}
      result.error.errors.forEach((e) => { const f = e.path[0]?.toString(); if (f) fe[f] = e.message })
      setFieldErrors(fe)
      setNotification({ msg: 'Please fix the validation errors below.', ok: false })
      setSaving(false)
      return
    }

    const payload = {
      ...result.data,
      description: result.data.description ?? null,
      submerged_volume_m3: result.data.submerged_volume_m3 ?? null,
      cog_x_m: raw.cog_x_m,
      cog_y_m: raw.cog_y_m,
      cog_z_m: raw.cog_z_m,
      rigging_weight_t: raw.rigging_weight_t,
      contingency_pct: raw.contingency_pct,
      cd_override_x: raw.cd_override_x,
      cd_override_y: raw.cd_override_y,
      cd_override_z: raw.cd_override_z,
      ca_override: raw.ca_override,
      cs_override: raw.cs_override,
      geometry_notes: raw.geometry_notes,
    }

    const { data: saved, error } = await saveEquipment(isNew ? payload : { ...payload, id })
    if (error || !saved) {
      setNotification({ msg: `Save failed: ${error ?? 'unknown'}`, ok: false })
      setSaving(false)
      return
    }

    if (isNew) {
      navigate(`/equipment/${saved.id}`)
    } else {
      setNotification({ msg: 'Equipment saved successfully.', ok: true })
      setTimeout(() => setNotification(null), 3000)
    }
    setSaving(false)
  }

  return {
    isNew, loading, saving, notification,
    values, fieldErrors, handleChange, handleSave,
  }
}
