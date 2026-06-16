/**
 * Geometria de casco em vista de planta, compartilhada entre o canvas 2D
 * (Konva, via SVG path) e o viewer 3D (THREE.Shape).
 *
 * Convenção: caixa envelope x0..x1 (popa → proa), y0..y1 (boreste → bombordo).
 * Popa levemente arredondada (transom), proa com curvas bezier convergindo
 * para um stem levemente pontudo na linha de centro.
 */

export type HullSegment =
  | { kind: 'move'; x: number; y: number }
  | { kind: 'line'; x: number; y: number }
  | { kind: 'quad'; cx: number; cy: number; x: number; y: number }
  | { kind: 'cubic'; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }
  | { kind: 'close' }

export type HullBox = { x0: number; x1: number; y0: number; y1: number }

/** Comprimento da região de proa curvada para uma dada caixa envelope. */
export function hullBowLength(box: HullBox): number {
  const L = box.x1 - box.x0
  const W = box.y1 - box.y0
  return Math.min(L * 0.22, W * 0.9)
}

/**
 * Segmentos do contorno do casco em planta dentro da caixa envelope dada.
 * Caminho fechado, sentido: boreste (y0) → stem → bombordo (y1) → popa.
 */
export function hullPlanSegments(box: HullBox): HullSegment[] {
  const { x0, x1, y0, y1 } = box
  const L = x1 - x0
  const W = y1 - y0
  if (L <= 0 || W <= 0) return []

  const r = Math.min(L * 0.05, W * 0.18) // raio do arredondamento do transom
  const bowLen = hullBowLength(box)
  const xBow = x1 - bowLen // início da curva de proa
  const yMid = (y0 + y1) / 2

  // Controles da curva de proa: ombro tangente ao costado + convergência angulada
  // no stem (levemente pontudo, não blunt)
  const shoulder = xBow + bowLen * 0.55
  const stemCx = x1 - bowLen * 0.08
  const stemDy = W * 0.18

  return [
    { kind: 'move', x: x0 + r, y: y0 },
    { kind: 'line', x: xBow, y: y0 },
    // boreste → stem
    { kind: 'cubic', c1x: shoulder, c1y: y0, c2x: stemCx, c2y: yMid - stemDy, x: x1, y: yMid },
    // stem → bombordo
    { kind: 'cubic', c1x: stemCx, c1y: yMid + stemDy, c2x: shoulder, c2y: y1, x: xBow, y: y1 },
    { kind: 'line', x: x0 + r, y: y1 },
    // transom arredondado (bombordo → boreste)
    { kind: 'quad', cx: x0, cy: y1, x: x0, y: y1 - r },
    { kind: 'line', x: x0, y: y0 + r },
    { kind: 'quad', cx: x0, cy: y0, x: x0 + r, y: y0 },
    { kind: 'close' },
  ]
}

/** Interface mínima de contexto 2D para traçar o contorno (Canvas/Konva). */
export type PathContext2D = {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void
  bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void
  closePath(): void
}

/** Traça os segmentos num contexto 2D (ex.: clipFunc do Konva). */
export function hullSegmentsToContext(
  segments: HullSegment[],
  ctx: PathContext2D,
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): void {
  for (const s of segments) {
    switch (s.kind) {
      case 'move':
        ctx.moveTo(mapX(s.x), mapY(s.y))
        break
      case 'line':
        ctx.lineTo(mapX(s.x), mapY(s.y))
        break
      case 'quad':
        ctx.quadraticCurveTo(mapX(s.cx), mapY(s.cy), mapX(s.x), mapY(s.y))
        break
      case 'cubic':
        ctx.bezierCurveTo(mapX(s.c1x), mapY(s.c1y), mapX(s.c2x), mapY(s.c2y), mapX(s.x), mapY(s.y))
        break
      case 'close':
        ctx.closePath()
        break
    }
  }
}

/**
 * Converte segmentos em SVG path data, aplicando transformações de eixo
 * (ex.: mundo → canvas com flip de Y). Transformações afins preservam beziers.
 */
export function hullSegmentsToSvgPath(
  segments: HullSegment[],
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): string {
  const parts: string[] = []
  for (const s of segments) {
    switch (s.kind) {
      case 'move':
        parts.push(`M ${mapX(s.x)} ${mapY(s.y)}`)
        break
      case 'line':
        parts.push(`L ${mapX(s.x)} ${mapY(s.y)}`)
        break
      case 'quad':
        parts.push(`Q ${mapX(s.cx)} ${mapY(s.cy)} ${mapX(s.x)} ${mapY(s.y)}`)
        break
      case 'cubic':
        parts.push(
          `C ${mapX(s.c1x)} ${mapY(s.c1y)} ${mapX(s.c2x)} ${mapY(s.c2y)} ${mapX(s.x)} ${mapY(s.y)}`,
        )
        break
      case 'close':
        parts.push('Z')
        break
    }
  }
  return parts.join(' ')
}
