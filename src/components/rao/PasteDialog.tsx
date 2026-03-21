import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '../ui/alert-dialog'
import { Textarea } from '../ui/textarea'
import type { RaoRow } from './RaoTable'

type Props = {
  open: boolean
  onClose: () => void
  onPaste: (rows: RaoRow[]) => void
}

/**
 * Parse tab-separated clipboard data into RAO rows.
 * Expected column order: Period, Heave Amp, Heave Phase, Roll Amp, Roll Phase, Pitch Amp, Pitch Phase
 * Lines with fewer than 7 numeric values are skipped.
 */
function parseTsv(text: string): RaoRow[] {
  const lines = text.trim().split('\n')
  const rows: RaoRow[] = []
  for (const line of lines) {
    const cells = line.split(/\t|,/).map((c) => parseFloat(c.trim()))
    if (cells.length < 7 || cells.some(isNaN)) continue
    rows.push({
      wave_period_s: cells[0],
      heave_amplitude_m_per_m: cells[1],
      heave_phase_deg: cells[2],
      roll_amplitude_deg_per_m: cells[3],
      roll_phase_deg: cells[4],
      pitch_amplitude_deg_per_m: cells[5],
      pitch_phase_deg: cells[6],
    })
  }
  return rows
}

export function PasteDialog({ open, onClose, onPaste }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  function handlePaste() {
    const rows = parseTsv(text)
    if (rows.length === 0) {
      setError('No valid rows found. Expected 7 tab/comma-separated numeric columns per row: Period, Heave Amp, Heave Phase, Roll Amp, Roll Phase, Pitch Amp, Pitch Phase.')
      return
    }
    onPaste(rows)
    setText('')
    setError('')
    onClose()
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setError('') } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Paste RAO Data</AlertDialogTitle>
          <AlertDialogDescription>
            Paste tab-separated or comma-separated data from Excel. Expected columns:
            Period(s), Heave Amp, Heave Phase, Roll Amp, Roll Phase, Pitch Amp, Pitch Phase.
            Header rows are automatically skipped.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError('') }}
          placeholder="4.0&#9;0.02&#9;0&#9;0.5&#9;0&#9;0.10&#9;0&#10;5.0&#9;0.05&#9;10&#9;1.2&#9;15&#9;0.25&#9;12"
          className="h-40 font-mono text-xs"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePaste}>Import Rows</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
