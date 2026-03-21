/**
 * Web worker for heavy DNV splash zone grid computation.
 * Runs the full Hs × Tp matrix (225 cells) off the main thread.
 *
 * Usage:
 *   const worker = new Worker(new URL('./analysisWorker.ts', import.meta.url), { type: 'module' })
 *   worker.postMessage({ type: 'RUN', payload: { ...SeaStateGridInput } })
 *   worker.onmessage = (e) => { ... e.data.type === 'PROGRESS' | 'COMPLETE' | 'ERROR' }
 */

import {
  generateSeaStateGrid,
  type SeaStateGridInput,
  type SeaStateGridResult,
} from '../lib/calculations/dnv/generateSeaStateGrid'

export type WorkerInMessage = {
  type: 'RUN'
  payload: SeaStateGridInput
}

export type WorkerOutMessage =
  | { type: 'PROGRESS'; fraction: number }
  | { type: 'COMPLETE'; result: SeaStateGridResult }
  | { type: 'ERROR'; message: string }

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const { type, payload } = event.data
  if (type !== 'RUN') return

  try {
    const result = generateSeaStateGrid(payload, (fraction) => {
      self.postMessage({ type: 'PROGRESS', fraction } satisfies WorkerOutMessage)
    })
    self.postMessage({ type: 'COMPLETE', result } satisfies WorkerOutMessage)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'ERROR', message } satisfies WorkerOutMessage)
  }
}
