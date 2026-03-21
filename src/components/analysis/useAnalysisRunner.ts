/**
 * Hook that manages the web worker lifecycle for DNV splash zone analysis.
 *
 * Sends a RUN message to the worker, tracks progress, and returns the
 * completed SeaStateGridResult to the caller.
 */

import { useCallback, useRef, useState } from 'react'
import type { SeaStateGridInput, SeaStateGridResult } from '../../lib/calculations/dnv/generateSeaStateGrid'
import type { WorkerInMessage, WorkerOutMessage } from '../../workers/analysisWorker'

type RunnerState = {
  isRunning: boolean
  progress: number          // 0–1
  error: string | null
}

type RunnerApi = {
  state: RunnerState
  run: (input: SeaStateGridInput) => Promise<SeaStateGridResult>
}

export function useAnalysisRunner(): RunnerApi {
  const [state, setState] = useState<RunnerState>({
    isRunning: false,
    progress: 0,
    error: null,
  })
  const workerRef = useRef<Worker | null>(null)

  const run = useCallback((input: SeaStateGridInput): Promise<SeaStateGridResult> => {
    // Terminate any previous worker
    workerRef.current?.terminate()

    return new Promise((resolve, reject) => {
      setState({ isRunning: true, progress: 0, error: null })

      const worker = new Worker(
        new URL('../../workers/analysisWorker.ts', import.meta.url),
        { type: 'module' },
      )
      workerRef.current = worker

      worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
        const msg = event.data
        if (msg.type === 'PROGRESS') {
          setState((s) => ({ ...s, progress: msg.fraction }))
        } else if (msg.type === 'COMPLETE') {
          setState({ isRunning: false, progress: 1, error: null })
          worker.terminate()
          resolve(msg.result)
        } else if (msg.type === 'ERROR') {
          setState({ isRunning: false, progress: 0, error: msg.message })
          worker.terminate()
          reject(new Error(msg.message))
        }
      }

      worker.onerror = (err) => {
        const message = err.message ?? 'Worker error'
        setState({ isRunning: false, progress: 0, error: message })
        worker.terminate()
        reject(new Error(message))
      }

      const msg: WorkerInMessage = { type: 'RUN', payload: input }
      worker.postMessage(msg)
    })
  }, [])

  return { state, run }
}
