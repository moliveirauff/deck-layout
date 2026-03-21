import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVesselStore } from '../../stores/useVesselStore'
import type { VesselListItem } from '../../lib/supabase/vesselService'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
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
import type { VesselType, CraneType } from '../../types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<
  VesselType,
  { variant: 'default' | 'success' | 'warning'; label: string }
> = {
  PLSV: { variant: 'default', label: 'PLSV' },
  LCV:  { variant: 'warning', label: 'LCV'  },
  HLV:  { variant: 'success', label: 'HLV'  },
}

const CRANE_LABEL: Record<CraneType, string> = {
  OMC: 'OMC',
  knuckle_boom: 'Knuckle Boom',
}

/** Max crane capacity from the embedded curve: min radius point = highest tonnage. */
function maxCapacity(vessel: VesselListItem): number | null {
  if (!vessel.crane_curve_point.length) return null
  return [...vessel.crane_curve_point].sort((a, b) => a.radius_m - b.radius_m)[0].capacity_t
}

// ─── VesselCardSkeleton ───────────────────────────────────────────────────────

function VesselCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/4" />
      </CardHeader>
      <CardContent className="grid gap-2 pt-3">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3.5 w-1/3" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-7 w-14" />
        <Skeleton className="ml-2 h-7 w-16" />
      </CardFooter>
    </Card>
  )
}

// ─── VesselCard ───────────────────────────────────────────────────────────────

interface VesselCardProps {
  vessel: VesselListItem
  onEdit: () => void
  onDelete: () => void
}

function VesselCard({ vessel, onEdit, onDelete }: VesselCardProps) {
  const cap = maxCapacity(vessel)
  const { variant, label } = TYPE_BADGE[vessel.vessel_type]

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="leading-snug">{vessel.name}</CardTitle>
          <Badge variant={variant} className="flex-shrink-0">
            {label}
          </Badge>
        </div>
        {vessel.description && (
          <p className="mt-0.5 truncate text-xs text-gray-500" title={vessel.description}>
            {vessel.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1 pt-3">
        <dl className="grid gap-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Deck</dt>
            <dd className="font-mono font-medium text-gray-800">
              {vessel.deck_length_m} × {vessel.deck_width_m} m
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Crane</dt>
            <dd className="font-medium text-gray-800">{CRANE_LABEL[vessel.crane_type]}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Max capacity</dt>
            <dd className="font-mono font-medium text-gray-800">
              {cap !== null ? `${cap} t` : '—'}
            </dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit}>Edit</Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onDelete}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VesselListPage() {
  const navigate = useNavigate()
  const { vessels, isLoading, loadVessels, deleteVessel } = useVesselStore()

  const [deleteTarget, setDeleteTarget] = useState<VesselListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    void loadVessels()
  }, [loadVessels])

  const openDeleteDialog = (vessel: VesselListItem) => {
    setDeleteTarget(vessel)
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

    const error = await deleteVessel(deleteTarget.id)
    setIsDeleting(false)

    if (error) {
      const isFkConstraint =
        error.toLowerCase().includes('foreign key') ||
        error.toLowerCase().includes('violates') ||
        error.toLowerCase().includes('restrict')
      setDeleteError(
        isFkConstraint
          ? 'This vessel is used in one or more projects and cannot be deleted.'
          : error,
      )
    } else {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
          <h1 className="text-xl font-semibold text-gray-900">Vessel Library</h1>
          <Button onClick={() => navigate('/vessels/new')}>+ New Vessel</Button>
        </div>

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <VesselCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && vessels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-base font-medium text-gray-700">No vessels registered.</p>
            <p className="mt-1 text-sm text-gray-500">Create your first vessel to get started.</p>
            <Button className="mt-6" onClick={() => navigate('/vessels/new')}>+ New Vessel</Button>
          </div>
        )}

        {/* Vessel grid */}
        {!isLoading && vessels.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {vessels.map((vessel) => (
              <VesselCard
                key={vessel.id}
                vessel={vessel}
                onEdit={() => navigate(`/vessels/${vessel.id}`)}
                onDelete={() => openDeleteDialog(vessel)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vessel?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> and all its barriers, deck load zones, and
              crane curve data will be permanently deleted. This cannot be undone.
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
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

