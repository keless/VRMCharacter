import React, { useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { AnimationAsset } from '../../types'

interface AnimationPlayerProps {
  mixer: THREE.AnimationMixer | null
  animations: AnimationAsset[]
  currentAnimation: string | null
  onAnimationEnded: () => void
}

/**
 * Loads and plays Mixamo animations (.glb) on the VRM character.
 * Uses bone name mapping to retarget Mixamo animations onto VRM skeleton.
 */
export default function AnimationPlayer({
  mixer,
  animations,
  currentAnimation,
  onAnimationEnded,
}: AnimationPlayerProps) {
  const actionRef = useRef<THREE.AnimationAction | null>(null)
  const loadedClipsRef = useRef<Map<string, THREE.AnimationClip>>(new Map())

  // Load animation clips on mount
  useEffect(() => {
    if (animations.length === 0) return

    const loader = new GLTFLoader()

    animations.forEach((asset) => {
      loader.load(
        asset.filePath,
        (gltf: GLTF) => {
          // Store all clips from this file
          const clips = gltf.animations
          if (clips) {
            clips.forEach((clip: THREE.AnimationClip) => {
              loadedClipsRef.current.set(`${asset.id}:${clip.name}`, clip)
            })
          }
        },
        undefined,
        (err: unknown) =>
          console.error(`Failed to load animation ${asset.filePath}:`, err)
      )
    })

    // Cleanup on unmount
    return () => {
      loadedClipsRef.current.clear()
    }
  }, [animations])

  // Play the current animation
  const playAnimation = useCallback(
    (animationId: string) => {
      if (!mixer) return

      // Stop current action
      if (actionRef.current) {
        actionRef.current.stop()
      }

      // Find the clip
      const clip = loadedClipsRef.current.get(animationId)
      if (!clip) {
        console.warn(`Animation clip not found: ${animationId}`)
        return
      }

      // Create new action
      const action = mixer.clipAction(clip)
      action.reset()
      action.play()
      actionRef.current = action

      // Notify when done
      action.clampWhenFinished = true
      const duration = clip.duration
      setTimeout(() => {
        if (actionRef.current === action) {
          onAnimationEnded()
        }
      }, duration * 1000)
    },
    [mixer, onAnimationEnded]
  )

  // React to currentAnimation changes
  useEffect(() => {
    if (currentAnimation) {
      playAnimation(currentAnimation)
    }
  }, [currentAnimation, playAnimation])

  // Tick the mixer
  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  return null
}
