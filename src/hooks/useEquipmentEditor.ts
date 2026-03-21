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
