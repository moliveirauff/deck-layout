import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRiggingStore } from '../../stores/useRiggingStore'
import type { RiggingItem, RiggingType } from '../../types/database'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<RiggingType, string> = {
  sling: 'Sling',
  shackle: 'Shackle',
  spreader_bar: 'Spreader Bar',
  lifting_frame: 'Lifting Frame',
  other: 'Other',
}

const TYPE_VARIANTS: Record<
  RiggingType,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  sling: 'default',
  shackle: 'secondary',
  spreader_bar: 'success',
  lifting_frame: 'warning',
  other: 'secondary',
}

function MblCell({ item }: { item: RiggingItem }) {
  if (item.mbl_t !== null) {
    return <span className="font-mono">{item.mbl_t}</span>
  }
  const computed = item.wll_t * 5
  return (
    <span className="font-mono italic text-gray-400">
      WLL × 5 = {computed}t
    </span>
  )
}

// ─── SkeletonRows ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 8 }).map((__, j) => (
            <td key={j} className="px-4 py-2.5">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RiggingListPage() {
  const navigate = useNavigate()
  const { items, isLoading, loadItems, deleteItem } = useRiggingStore()

  const [search, setSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<RiggingItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  )

  const openDeleteDialog = (item: RiggingItem) => {
    setDeleteTarget(item)
    setDeleteError(null)
  }

  const closeDeleteDialog = () => {
    if (isDeleting) return
    setDeleteTarget(null)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)
    await deleteItem(deleteTarget.id)
    const { error } = useRiggingStore.getState()
    setIsDeleting(false)
    if (error) {
      setDeleteError(error)
    } else {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">Rigging Library</h1>
          <Button onClick={() => navigate('/rigging/new')}>+ New Item</Button>
        </div>

        {/* Search bar */}
        <div className="mb-4 max-w-sm">
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Type
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  WLL (t)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  MBL (t)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Weight (kg)
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Length (m)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Standard
                </th>
                <th className="w-28 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows />}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-sm text-gray-400"
                  >
                    {search
                      ? 'No items match your search.'
                      : 'No rigging items yet. Click "+ New Item" to add one.'}
                  </td>
                </tr>
              )}

              {!isLoading &&
                filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={TYPE_VARIANTS[item.rigging_type]}>
                        {TYPE_LABELS[item.rigging_type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                      {item.wll_t}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <MblCell item={item} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                      {item.weight_kg}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                      {item.length_m !== null ? item.length_m : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {item.standard_ref ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          onClick={() => navigate(`/rigging/${item.id}`)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          onClick={() => openDeleteDialog(item)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && closeDeleteDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rigging item?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted.
              This cannot be undone.
            </AlertDialogDescription>
            {deleteError && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {deleteError}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
