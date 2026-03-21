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
import { parseTsvScatter, totalOccurrence, type ScatterMatrix } from './scatterMatrix'

type Props = {
  open: boolean
  onClose: () => void
  onPaste: (matrix: ScatterMatrix) => void
}

export function ScatterPasteDialog({ open, onClose, onPaste }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ScatterMatrix | null>(null)

  function handleTextChange(value: string) {
    setText(value)
    setError('')
    if (value.trim()) {
      const parsed = parseTsvScatter(value)
      setPreview(parsed)
    } else {
      setPreview(null)
    }
  }

  function handleImport() {
    if (!preview) {
      setError('Could not parse data. Ensure the first row contains Tp values and the first column contains Hs values.')
      return
    }
    onPaste(preview)
    setText('')
    setPreview(null)
    setError('')
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) { setText(''); setPreview(null); setError(''); onClose() }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Paste Scatter Diagram from Excel</AlertDialogTitle>
          <AlertDialogDescription>
            Select the scatter matrix in Excel (including Tp headers in the first row and Hs
            labels in the first column), copy (Ctrl+C), then paste below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Hs\Tp&#9;4&#9;6&#9;8&#9;10&#9;...&#10;0.5&#9;0.5&#9;1.2&#9;2.0&#9;1.5&#9;...&#10;1.0&#9;0.8&#9;3.5&#9;5.2&#9;4.0&#9;..."
          className="h-44 font-mono text-xs"
        />

        {preview && (
          <p className="text-xs text-green-700">
            Parsed: {preview.hsValues.length} Hs rows × {preview.tpValues.length} Tp columns —
            total {totalOccurrence(preview).toFixed(1)} %
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleImport} disabled={!preview}>
            Import
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
