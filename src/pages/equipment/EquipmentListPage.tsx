import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { loadEquipment, deleteEquipment } from '../../lib/supabase/equipmentService'
import type { EquipmentLibrary, GeometryType } from '../../types/database'

type SortKey = 'name' | 'geometry_type' | 'length_m' | 'width_m' | 'height_m' | 'dry_weight_t'
type SortDir = 'asc' | 'desc'

function SortHeader({
  label, col, sortKey, sortDir, onSort,
}: { label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (c: SortKey) => void }) {
  const active = sortKey === col
  return (
    <th
      className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 first:pl-4"
      onClick={() => onSort(col)}
    >
      {label}
      {active && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

export default function EquipmentListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<EquipmentLibrary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [geomFilter, setGeomFilter] = useState<'' | GeometryType>('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    void loadEquipment().then(({ data, error: err }) => {
      if (err) setError(err)
      else setItems(data ?? [])
      setLoading(false)
    })
  }, [])

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('asc') }
  }

  const displayed = useMemo(() => {
    let rows = items
    if (search.trim()) {
      const q = search.toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (geomFilter) rows = rows.filter((r) => r.geometry_type === geomFilter)
    return [...rows].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [items, search, geomFilter, sortKey, sortDir])

  async function handleDelete(item: EquipmentLibrary) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    setDeleteError(null)
    const { error: err } = await deleteEquipment(item.id)
    if (err) {
      if (err.toLowerCase().includes('foreign key') || err.toLowerCase().includes('violates')) {
        setDeleteError(`Cannot delete "${item.name}" — it is used in one or more projects.`)
      } else {
        setDeleteError(`Delete failed: ${err}`)
      }
      return
    }
    setItems((prev) => prev.filter((r) => r.id !== item.id))
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">Equipment Library</h1>
          <Button onClick={() => navigate('/equipment/new')}>+ New Equipment</Button>
        </div>

        {/* Error banners */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}
        {deleteError && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
            <span>{deleteError}</span>
            <button className="ml-3 text-xs underline" onClick={() => setDeleteError(null)}>Dismiss</button>
          </div>
        )}

        {/* Filters row */}
        <div className="mb-4 flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-56"
          />
          <Select
            value={geomFilter}
            onChange={(e) => setGeomFilter(e.target.value as '' | GeometryType)}
            className="w-40"
          >
            <option value="">All Types</option>
            <option value="box">Box</option>
            <option value="cylinder">Cylinder</option>
          </Select>
          {(search || geomFilter) && (
            <button
              className="text-xs text-gray-400 underline hover:text-gray-600"
              onClick={() => { setSearch(''); setGeomFilter('') }}
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">
            {displayed.length} item{displayed.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-2.5"><Skeleton className="h-4 w-40" /></td>
                  <td className="py-2.5 pr-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-2.5 pr-4"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-2.5 pr-4"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-2.5 pr-4"><Skeleton className="h-4 w-10" /></td>
                  <td className="py-2.5 pr-4"><Skeleton className="h-4 w-12" /></td>
                  <td className="py-2.5 pr-4"><Skeleton className="h-6 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : displayed.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {items.length === 0
              ? 'No equipment defined yet. Click "+ New Equipment" to add your first item.'
              : 'No items match the current filters.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <SortHeader label="Name" col="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Type" col="geometry_type" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="L (m)" col="length_m" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="W (m)" col="width_m" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="H (m)" col="height_m" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortHeader label="Weight (t)" col="dry_weight_t" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="pb-2 w-28" />
              </tr>
            </thead>
            <tbody>
              {displayed.map((item) => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                  <td className="py-2.5 pr-4 capitalize text-gray-600">{item.geometry_type}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{item.length_m}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{item.width_m}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{item.height_m}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{item.dry_weight_t}</td>
                  <td className="py-2.5 pr-4">
                    <div className="flex gap-2">
                      <button
                        className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => navigate(`/equipment/${item.id}`)}
                      >
                        Edit
                      </button>
                      <button
                        className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        </div>
      </div>
    </div>
  )
}
