/**
 * SceneCapture — lives inside <Canvas>.
 * Exposes two actions via forwardRef:
 *   capture()   → renders current frame → returns PNG data URL
 *   setCamera() → moves camera to a named preset
 */

import { forwardRef, useImperativeHandle } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

export type CameraPreset = 'perspective' | 'top' | 'side' | 'front'

export type SceneCaptureApi = {
  capture: () => string
  setCamera: (preset: CameraPreset, cx: number, cy: number) => void
}

type Props = {
  target: [number, number, number]
}

export const SceneCapture = forwardRef<SceneCaptureApi, Props>(function SceneCapture({ target }, ref) {
  const { gl, scene, camera } = useThree()

  useImperativeHandle(ref, () => ({
    capture: () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    },

    setCamera: (preset, cx, cz) => {
      const t = new THREE.Vector3(cx, 10, cz)
      switch (preset) {
        case 'perspective':
          camera.position.set(cx - 80, 80, cz - 60)
          break
        case 'top':
          camera.position.set(cx, 200, cz)
          break
        case 'side':
          camera.position.set(cx, 30, cz + 150)
          break
        case 'front':
          camera.position.set(cx - 150, 30, cz)
          break
      }
      camera.lookAt(t)
    },
  }))

  return <OrbitControls target={target} makeDefault enableDamping dampingFactor={0.08} />
})
