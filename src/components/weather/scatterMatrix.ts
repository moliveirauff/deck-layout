/**
 * In-memory representation of a scatter diagram matrix.
 * Rows = Hs bins, columns = Tp bins, cells = occurrence %.
 */

export type ScatterMatrix = {
  hsValues: number[]  // Row headers: Hs bins (m), ascending
  tpValues: number[]  // Column headers: Tp bins (s), ascending
  cells: number[][]   // [hsIdx][tpIdx] = occurrence_pct
}

/** Default scatter diagram bins matching the UI spec. */
export const DEFAULT_HS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0]
export const DEFAULT_TP = [4, 6, 8, 10, 12, 14, 16]

export function emptyMatrix(): ScatterMatrix {
  return {
    hsValues: DEFAULT_HS,
    tpValues: DEFAULT_TP,
    cells: DEFAULT_HS.map(() => DEFAULT_TP.map(() => 0)),
  }
}

export function totalOccurrence(matrix: ScatterMatrix): number {
  return matrix.cells.flat().reduce((s, v) => s + v, 0)
}

/** Convert flat Supabase entries → ScatterMatrix. Returns default empty if no entries. */
export function entriesToMatrix(
  entries: ReadonlyArray<{ hs_m: number; tp_s: number; occurrence_pct: number }>,
): ScatterMatrix {
  if (entries.length === 0) return emptyMatrix()

  const hsSet = [...new Set(entries.map((e) => e.hs_m))].sort((a, b) => a - b)
  const tpSet = [...new Set(entries.map((e) => e.tp_s))].sort((a, b) => a - b)
  const lookup = new Map(entries.map((e) => [`${e.hs_m}|${e.tp_s}`, e.occurrence_pct]))

  const cells = hsSet.map((hs) => tpSet.map((tp) => lookup.get(`${hs}|${tp}`) ?? 0))
  return { hsValues: hsSet, tpValues: tpSet, cells }
}

/** Convert ScatterMatrix → flat entries, excluding zero cells. */
export function matrixToEntries(
  matrix: ScatterMatrix,
): Array<{ hs_m: number; tp_s: number; occurrence_pct: number }> {
  const entries: Array<{ hs_m: number; tp_s: number; occurrence_pct: number }> = []
  matrix.hsValues.forEach((hs, i) =>
    matrix.tpValues.forEach((tp, j) => {
      if (matrix.cells[i]?.[j] > 0) entries.push({ hs_m: hs, tp_s: tp, occurrence_pct: matrix.cells[i][j] })
    }),
  )
  return entries
}

/**
 * Parse tab-separated clipboard data pasted from Excel.
 * Expected format:
 *   [label]\t[Tp1]\t[Tp2]\t...
 *   [Hs1]\t[occ11]\t[occ12]\t...
 *   [Hs2]\t[occ21]\t[occ22]\t...
 */
export function parseTsvScatter(text: string): ScatterMatrix | null {
  const lines = text.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return null

  const headerCells = lines[0].split('\t').map((c) => c.trim())
  // Tp values start at column index 1
  const tpValues = headerCells
    .slice(1)
    .map((c) => parseFloat(c))
    .filter((v) => !isNaN(v) && v > 0)
  if (tpValues.length === 0) return null

  const hsValues: number[] = []
  const cells: number[][] = []

  for (let r = 1; r < lines.length; r++) {
    const row = lines[r].split('\t').map((c) => c.trim())
    const hs = parseFloat(row[0])
    if (isNaN(hs) || hs <= 0) continue
    hsValues.push(hs)
    cells.push(
      tpValues.map((_, j) => {
        const v = parseFloat(row[j + 1] ?? '')
        return isNaN(v) || v < 0 ? 0 : v
      }),
    )
  }

  if (hsValues.length === 0) return null
  return { hsValues, tpValues, cells }
}
