import React, { useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { VRMAnimationLoaderPlugin, createVRMAnimationClip, VRMAnimation } from '@pixiv/three-vrm-animation'
import type { VRMCore } from '@pixiv/three-vrm-core'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { AnimationAsset } from '../../types'
import { animationController } from './AnimationController'
import { retargetMixamoClip } from './AnimationRemapper'
import { logger } from '../../lib/logger'

const animLog = logger('AnimationPlayer')

// Enable diagnostic logging for animation transitions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(animLog as any).log = (...args: unknown[]) => console.log('[AnimationPlayer]', ...args)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(animLog as any).warn = (...args: unknown[]) => console.warn('[AnimationPlayer]', ...args)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(animLog as any).error = (...args: unknown[]) => console.error('[AnimationPlayer]', ...args)

interface LoadedClipEntry {
  clip: THREE.AnimationClip
  asset: AnimationAsset
}

interface AnimationPlayerProps {
  mixer: THREE.AnimationMixer | null
  model: THREE.Group | null
  animations: AnimationAsset[]
  currentAnimation: string | null
  onAnimationEnded: () => void
  vrmCore: VRMCore | null
}

/**
 * Cache-bust version — increment to force re-load of all animation files.
 */
const ANIMATION_CACHE_BUST = Date.now()

/**
 * Loads and plays animations (.glb, .fbx, .vrma) on the VRM character.
 *
 * FBX (Mixamo) animations are retargeted using the same logic as the
 * three-vrm reference `loadMixamoAnimation.js`:
 *  - Bone name mapping (mixamorig* → VRM humanoid names)
 *  - Rotation rebaking (parent rest-world × quat × rest-inverse)
 *  - Position scaling (by hips height ratio)
 *  - Coordinate flip for VRM 0.x
 *
 * VRMA animations are converted via createVRMAnimationClip.
 * GLB animations are used as-is.
 */
export default function AnimationPlayer({
  mixer,
  model,
  animations,
  currentAnimation,
  onAnimationEnded,
  vrmCore,
}: AnimationPlayerProps) {
  const initialPosRef = useRef<THREE.Vector3 | null>(null)
  const actionRef = useRef<THREE.AnimationAction | null>(null)

  // Raw loaded clips (pre-retargeting for FBX)
  // key="animationId:clipName" → { clip, asset }
  const loadedClipsRef = useRef<Map<string, LoadedClipEntry>>(new Map())
  // Separate storage for VRMAnimation instances (not yet THREE.AnimationClip)
  // key="animationId:animationIndex" → VRMAnimation
  const vrmAnimationsRef = useRef<Map<string, VRMAnimation>>(new Map())
  // Cache for retargeted FBX clips: key="animationId:clipName" → retargeted THREE.AnimationClip
  const retargetedClipCacheRef = useRef<Map<string, THREE.AnimationClip>>(new Map())
  // Cache for the Mixamo asset group (needed for retargeting): key="assetId" → THREE.Group
  const mixamoAssetCacheRef = useRef<Map<string, THREE.Group>>(new Map())
  // Track which animation IDs we've registered with the controller
  const registeredRef = useRef<Set<string>>(new Set())

  // ---- Load animation clips ----
  useEffect(() => {
    if (animations.length === 0) return

    const gltfLoader = new GLTFLoader()
    const fbxLoader = new FBXLoader()

    animations.forEach((asset) => {
      if (asset.type === 'fbx') {
        // FBX: load with FBXLoader, store raw clip + asset for retargeting later
        const fbxUrl = `${asset.filePath}?v=${ANIMATION_CACHE_BUST}`
        fbxLoader.load(
          fbxUrl,
          (group: THREE.Group) => {
            // Cache the Mixamo asset group for later retargeting
            mixamoAssetCacheRef.current.set(asset.id, group)

            const clips = group.animations
            if (clips) {
              clips.forEach((clip: THREE.AnimationClip) => {
                // Skip empty clips (e.g. Mixamo's "Take 001" with 0 tracks)
                if (clip.tracks.length === 0) {
                  animLog.log(`Skipping empty clip "${clip.name}" in ${asset.name}`)
                  return
                }
                const key = `${asset.id}:${clip.name}`
                loadedClipsRef.current.set(key, { clip, asset })

                // Diagnostic: log bone names found in the FBX
                const bones = new Set<string>()
                clip.tracks.forEach((t) => bones.add(t.name.split('.')[0]))
                animLog.log(
                  `${asset.name} "${clip.name}": ${clip.tracks.length} tracks, bones:`,
                  [...bones].slice(0, 20).join(', '),
                )
              })

              const validClips = clips.filter((c: THREE.AnimationClip) => c.tracks.length > 0)
              if (!registeredRef.current.has(asset.id) && validClips.length > 0) {
                animationController.registerClip(asset.id, validClips[0].name)
                registeredRef.current.add(asset.id)
              }
            }
          },
          undefined,
          (err: unknown) =>
            animLog.error(`Failed to load FBX ${asset.filePath}:`, err),
        )
      } else if (asset.type === 'vrma') {
        // VRMA: load with GLTFLoader + VRMAnimationLoaderPlugin
        gltfLoader.register((parser: any) => {
          return new VRMAnimationLoaderPlugin(parser)
        })
        gltfLoader.load(
          asset.filePath,
          (gltf: GLTF) => {
            const vrmAnims = gltf.userData.vrmAnimations as VRMAnimation[] | undefined
            if (vrmAnims) {
              vrmAnims.forEach((vrmAnim, index) => {
                const key = vrmAnims.length > 1 ? `${asset.id}:animation${index}` : `${asset.id}:default`
                // Store the VRMAnimation separately — it gets converted to
                // THREE.AnimationClip at play time via createVRMAnimationClip
                vrmAnimationsRef.current.set(key, vrmAnim)
                // Also store a placeholder in loadedClipsRef for lookup
                const placeholder = new THREE.AnimationClip(key, vrmAnim.duration, [])
                loadedClipsRef.current.set(key, { clip: placeholder, asset })
              })
              animLog.log(
                `Loaded VRMA ${asset.name}: duration=${vrmAnims[0]?.duration.toFixed(2)}s, count=${vrmAnims.length}`,
              )

              if (!registeredRef.current.has(asset.id)) {
                animationController.registerClip(
                  asset.id,
                  vrmAnims.length > 1 ? 'animation0' : 'default',
                )
                registeredRef.current.add(asset.id)
              }
            }
            // Also store any standard glTF clips
            if (gltf.animations) {
              gltf.animations.forEach((clip: THREE.AnimationClip) => {
                loadedClipsRef.current.set(`${asset.id}:${clip.name}`, { clip, asset })
              })
            }
          },
          undefined,
          (err: unknown) =>
            animLog.error(`Failed to load VRMA ${asset.filePath}:`, err),
        )
      } else {
        // GLB: standard GLTFLoader
        gltfLoader.load(
          asset.filePath,
          (gltf: GLTF) => {
            const clips = gltf.animations
            if (clips) {
              clips.forEach((clip: THREE.AnimationClip) => {
                loadedClipsRef.current.set(`${asset.id}:${clip.name}`, { clip, asset })
              })
              animLog.log(`Loaded GLB ${asset.name}: ${clips.length} clips`)

              if (!registeredRef.current.has(asset.id) && clips.length > 0) {
                animationController.registerClip(asset.id, clips[0].name)
                registeredRef.current.add(asset.id)
              }
            }
          },
          undefined,
          (err: unknown) =>
            animLog.error(`Failed to load GLB ${asset.filePath}:`, err),
        )
      }
    })

    // Cleanup on unmount
    return () => {
      loadedClipsRef.current.clear()
      retargetedClipCacheRef.current.clear()
      mixamoAssetCacheRef.current.clear()
      vrmAnimationsRef.current.clear()
      registeredRef.current.clear()
    }
  }, [animations, ANIMATION_CACHE_BUST])

  // ---- Play animation ----
  const playAnimation = useCallback(
    (animationId: string) => {
      if (!mixer) return

      // Keep the current action running (don't stop it) so its bone
      // transforms stay valid during the crossfade. We'll ramp its
      // weight down while ramping the new action's weight up.
      let prevAction: THREE.AnimationAction | null = null
      if (actionRef.current) {
        prevAction = actionRef.current
        // Don't call stop() here — stopping removes the action from
        // the mixer's evaluation list, causing bones to revert to
        // rest pose. Instead we fade its weight to zero in the crossfade.
      }

      // Resolve semantic keyword → full animation ID
      const resolvedId = animationController.resolve(animationId) ?? animationId

      // Find the loaded clip by animation ID prefix
      let loadedEntry: LoadedClipEntry | null = null
      let loadedKey: string | null = null
      for (const [key, entry] of loadedClipsRef.current.entries()) {
        if (key.startsWith(`${resolvedId}:`)) {
          loadedEntry = entry
          loadedKey = key
          break
        }
      }

      if (!loadedEntry) {
        animLog.warn(
          `Animation not found for "${animationId}" (resolved: "${resolvedId}")`,
        )
        animLog.warn(
          `Available clips: ${Array.from(loadedClipsRef.current.keys()).join(', ')}`,
        )
        return
      }

      const { clip: rawClip, asset } = loadedEntry
      animLog.log(`Playing "${animationId}" → resolved "${resolvedId}" → key "${loadedKey}"`)

      let clip: THREE.AnimationClip

      // ---- Handle VRMA specially ----
      if (asset.type === 'vrma') {
        if (!vrmCore) {
          animLog.warn(`VRMA ${animationId} requires VRM model to be loaded first`)
          return
        }
        const vrmAnim = vrmAnimationsRef.current.get(loadedKey!)
        if (!vrmAnim) {
          animLog.warn(`VRMA animation not found for key "${loadedKey}"`)
          return
        }
        try {
          clip = createVRMAnimationClip(vrmAnim, vrmCore)
          animLog.log(`Converted VRMA to AnimationClip: ${clip.name}, tracks=${clip.tracks.length}`)
        } catch (err) {
          animLog.error(`Failed to convert VRMA ${animationId}:`, err)
          return
        }
      } else if (asset.type === 'fbx') {
        // ---- FBX: retarget dynamically at play time ----
        // We do NOT cache retargeted clips because the first keyframe is
        // T-pose in the source data. Caching it bakes T-pose into the clip,
        // and adjusting only the first frame at play time is insufficient
        // (the rest of the clip still has stale T-pose data). Instead, we
        // retarget fresh each time and adjust the first keyframe to the
        // model's current pose, ensuring smooth transitions.
        const mixamoAsset = mixamoAssetCacheRef.current.get(asset.id)
        if (mixamoAsset && vrmCore && (vrmCore as any).humanoid) {
          // Get VRM meta version for coordinate flip
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const metaVersion = (vrmCore as any).meta?.metaVersion ?? null

          const humanoid = (vrmCore as any).humanoid
          clip = retargetMixamoClip(rawClip, mixamoAsset, humanoid, metaVersion) ?? rawClip
          animLog.log(`Retargeted FBX clip: ${clip.tracks.length} tracks`)
        } else {
          animLog.warn(
            `Retargeting skipped for "${loadedKey}" (mixamoAsset=${!!mixamoAsset}, vrmCore=${!!vrmCore})`,
          )
          clip = rawClip
        }

        // ---- Fix clip duration (FBX only) ----
        // Clip duration often extends past the last keyframe (e.g. 2.04s
        // when the last keyframe is at 2.00s). The mixer interpolates
        // toward rest pose during that gap, causing a T-pose flash at
        // the loop point. We trim duration to match the last keyframe.
        if (asset.type === 'fbx' && model) {
          // Clone the cached clip so we don't mutate it
          const trimmedClip = clip.clone()

          let lastKeyframeTime = 0
          trimmedClip.tracks.forEach((track) => {
            const lastTime = track.times[track.times.length - 1]
            if (lastTime > lastKeyframeTime) {
              lastKeyframeTime = lastTime
            }
          })
          trimmedClip.duration = lastKeyframeTime
          animLog.log(
            `Trimmed clip duration: ${clip.duration.toFixed(4)}s → ${trimmedClip.duration.toFixed(4)}s (last keyframe)`,
          )

          clip = trimmedClip
        }
      } else {
        // GLB: use as-is
        clip = rawClip
      }

      // ---- Verify all track node names match scene nodes ----
      if (model) {
        const sceneNodeNames = new Set<string>()
        model.traverse((obj) => {
          if (obj.isObject3D && obj.name) sceneNodeNames.add(obj.name)
        })
        const missing: string[] = []
        clip.tracks.forEach((t) => {
          const nodeName = t.name.split('.')[0]
          if (!sceneNodeNames.has(nodeName)) {
            missing.push(t.name)
          }
        })
        animLog.log(
          `Clip "${clip.name}": ${clip.tracks.length} tracks, ${sceneNodeNames.size} scene nodes, ${missing.length} missing bindings`,
        )
        if (missing.length > 0 && missing.length < clip.tracks.length) {
          animLog.log(`Missing bindings:`, missing.slice(0, 10).join(', '))
          animLog.log(`Scene nodes (first 20):`, [...sceneNodeNames].slice(0, 20).join(', '))
        } else if (missing.length > 0) {
          animLog.warn(`ALL ${missing.length} tracks have no matching scene node!`)
          animLog.warn(`Track names:`, clip.tracks.map((t) => t.name).join(', '))
          animLog.warn(`Scene nodes:`, [...sceneNodeNames].join(', '))
        }
      }

      // Create new action.
      // For transitions, we do a proper crossfade: the old action's weight
      // ramps down while the new action's weight ramps up. This ensures
      // bones are always driven by at least one action, preventing any
      // snap to rest pose.
      //
      // We also start the new action past its first keyframe. The first
      // keyframe of a retargeted FBX clip is the rest pose (identity
      // quaternion). If the action starts at time 0, the mixer evaluates
      // this rest pose immediately, pulling bones toward T-pose during
      // the crossfade. By starting at the second keyframe, the new action
      // begins from an animated pose, matching the old animation's end.
      const action = mixer.clipAction(clip)
      // Idle animation always loops; other animations play once
      action.loop =
        resolvedId === 'builtin-idle' ? THREE.LoopRepeat : THREE.LoopOnce
      action.clampWhenFinished = true
      action.weight = 0

      // Find the second keyframe time to skip the rest-pose first frame
      let secondKeyframeTime = 0.01 // fallback: 10ms past start
      for (const track of clip.tracks) {
        if (track.times.length >= 2 && track.times[1] > secondKeyframeTime) {
          secondKeyframeTime = track.times[1]
        }
      }

      action.play()
      action.time = secondKeyframeTime
      actionRef.current = action

      animLog.log(
        `Playing "${animationId}" (${clip.duration.toFixed(2)}s)`,
        `tracks: ${clip.tracks.length}, startOffset: ${secondKeyframeTime.toFixed(4)}s`,
      )

      // Crossfade: ramp old action weight down, new action weight up.
      // Both actions drive bones simultaneously during the blend.
      if (prevAction) {
        let fadeProgress = 0
        const FADE_DURATION = 500 // ms
        const FADE_STEPS = 50
        const STEP_TIME = FADE_DURATION / FADE_STEPS

        const fadeStep = () => {
          fadeProgress++
          const t = fadeProgress / FADE_STEPS
          // Smooth easing for more natural transition
          const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
          prevAction!.weight = 1 - eased
          action.weight = eased
          if (fadeProgress < FADE_STEPS) {
            setTimeout(fadeStep, STEP_TIME)
          } else {
            // Crossfade complete — stop the old action to remove it from
            // the mixer's evaluation list, preventing it from interfering
            // with the new animation's bone transforms.
            prevAction!.stop()
          }
        }

        queueMicrotask(() => {
          setTimeout(fadeStep, STEP_TIME)
        })
      } else {
        // First animation: ramp to full weight (no old action to blend from)
        action.weight = 1
      }

      // Save model position for restoration after animation
      if (model) {
        initialPosRef.current = model.position.clone()
      }

      // Listen for animation end via mixer's 'finished' event.
      // For non-looping animations, the action clamps to the last frame
      // (clampWhenFinished = true), preserving the pose. We do NOT stop
      // or reset the action — stopping would revert bones to rest pose.
      // The clamped action serves as the crossfade source for the next
      // animation, ensuring smooth transitions from the last frame.
      const mixerRef = mixer
      const onFinished = (event: { action: THREE.AnimationAction }) => {
        if (event.action !== action) return

        // Idle animation: never remove listener, never call onAnimationEnded.
        // This lets it loop continuously as the default pose.
        if (resolvedId === 'builtin-idle') return

        // Non-idle animations: clean up and signal completion
        mixerRef.removeEventListener('finished', onFinished)

        // Restore model position
        if (initialPosRef.current && model) {
          model.position.copy(initialPosRef.current)
        }

        onAnimationEnded()
      }
      mixerRef.addEventListener('finished', onFinished)
    },
    [mixer, model, onAnimationEnded, vrmCore],
  )

  // React to currentAnimation changes.
  // Also re-run when model becomes available — if currentAnimation was set
  // before the VRM loaded, playAnimation would have returned early. Now that
  // model is ready, play the queued animation.
  useEffect(() => {
    if (currentAnimation && model) {
      playAnimation(currentAnimation)
    }
  }, [currentAnimation, playAnimation, model])

  // Tick the mixer
  useFrame((_state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  return null
}
