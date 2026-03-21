import { useState, useEffect, useRef, useCallback } from 'react'
import type Konva from 'konva'

const PAD = 40

type ContainerSize = { w: number; h: number }

type Transform = {
  /** Meters → pixels scale factor at stage scale=1 */
  bs: number
  /** Canvas X offset so deck is centred horizontally */
  ox: number
  /** Canvas Y offset so deck is centred vertically */
  oy: number
}

/**
 * Compute the auto-fit scale + offsets that centre the deck rectangle in the
 * available canvas area with PAD pixels of padding on every side.
 */
function fitTransform(size: ContainerSize, deckL: number, deckW: number): Transform {
  if (deckL <= 0 || deckW <= 0) return { bs: 10, ox: PAD, oy: PAD }
  const bs = Math.min((size.w - 2 * PAD) / deckL, (size.h - 2 * PAD) / deckW)
  return {
    bs,
    ox: (size.w - deckL * bs) / 2,
    oy: (size.h - deckW * bs) / 2,
  }
}

/**
 * Manages container measurement, auto-fit transform, and imperative Stage
 * zoom/pan (mouse-wheel + drag).  Returns the container ref to attach to the
 * wrapper div, the Stage ref to attach to <Stage>, the current Transform, and
 * a wheel-event handler.
 */
export function useDeckTransform(deckL: number, deckW: number) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const [size, setSize] = useState<ContainerSize>({ w: 400, h: 400 })
  const [tf, setTf] = useState<Transform>(() => fitTransform({ w: 400, h: 400 }, deckL, deckW))

  // Measure container and keep size in sync
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Recompute auto-fit whenever deck dims or container size change, and reset zoom/pan
  useEffect(() => {
    const next = fitTransform(size, deckL, deckW)
    setTf(next)
    const stage = stageRef.current
    if (stage) {
      stage.scale({ x: 1, y: 1 })
      stage.position({ x: 0, y: 0 })
    }
  }, [size, deckL, deckW])

  // Mouse-wheel zoom toward pointer
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const ptr = stage.getPointerPosition()
    if (!ptr) return
    const origin = { x: (ptr.x - stage.x()) / oldScale, y: (ptr.y - stage.y()) / oldScale }
    const factor = e.evt.deltaY < 0 ? 1.12 : 1 / 1.12
    const newScale = Math.max(0.1, Math.min(20, oldScale * factor))
    stage.scale({ x: newScale, y: newScale })
    stage.position({ x: ptr.x - origin.x * newScale, y: ptr.y - origin.y * newScale })
  }, [])

  return { containerRef, stageRef, size, tf, handleWheel }
}
