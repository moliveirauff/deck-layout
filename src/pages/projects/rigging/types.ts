import type { RiggingItem } from '../../../types/database'

/** A single row in the rigging arrangement table (local, unsaved state). */
export interface ArrangementRow {
  riggingItem: RiggingItem
  qty: number
  angle: number
  /** Force per sling in tonnes (calculated, not saved). */
  slingForce: number
  /** Design force per sling in tonnes (calculated, not saved). */
  designForce: number
  /** True if designForce ≤ WLL. */
  wllOk: boolean
}
