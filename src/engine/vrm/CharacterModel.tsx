import React, { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm'
import AnimationPlayer from './AnimationPlayer'
import type { CharacterAsset, AnimationAsset } from '../../types'

/**
 * Loads a VRM model and renders it in the scene.
 * Uses GLTFLoader.parse() with File ArrayBuffers.
 */
export default function CharacterModel({
  bodyAsset,
  bodyBuffer,
  hairAsset,
  clothingAsset,
  animations,
  currentAnimation,
  onAnimationEnded,
  onDebugInfo,
}: {
  bodyAsset: CharacterAsset
  bodyBuffer?: ArrayBuffer
  hairAsset: CharacterAsset | null
  clothingAsset: CharacterAsset | null
  animations: AnimationAsset[]
  currentAnimation: string | null
  onAnimationEnded: () => void
  onDebugInfo: (info: string) => void
}) {
  // Always-rendered group — ref must be available during useEffect
  const groupRef = useRef<THREE.Group>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [bodyAssetLoaded, setBodyAssetLoaded] = useState<CharacterAsset | null>(null)

  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const vrmRef = useRef<unknown>(null)
  const wireframeRef = useRef<THREE.Mesh>(null)
  const isLoadingRef = useRef(false)

  // Helper: load a VRM file from a File object using GLTFLoader.parse()
  const loadVrmFrom = (
    file: File,
    onLoaded: (model: THREE.Group, vrmData: unknown) => void,
    onError: (err: unknown) => void
  ) => {
    console.log('[loadVrmFrom] Starting load for:', file.name, file.size, 'bytes')
    const reader = new FileReader()
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer
      console.log('[loadVrmFrom] FileReader.onload, ArrayBuffer size:', arrayBuffer?.byteLength)
      if (!arrayBuffer) {
        onError(new Error('Failed to read file as ArrayBuffer'))
        return
      }

      console.log('[loadVrmFrom] Creating GLTFLoader and VRMLoaderPlugin')
      const loader = new GLTFLoader()
      loader.register((parser: any) => {
        console.log('[loadVrmFrom] VRMLoaderPlugin registered')
        return new VRMLoaderPlugin(parser)
      })

      console.log('[loadVrmFrom] Calling loader.parse()')
      try {
        loader.parse(
          arrayBuffer,
          '',
          (gltf: GLTF) => {
            console.log('[loadVrmFrom] parse() onLoad callback fired!')
            const model = gltf.scene
            const vrmData = (gltf as unknown as { userData: { vrm?: unknown } }).userData.vrm
            console.log('[loadVrmFrom] Model children:', model.children.length, 'VRM data:', !!vrmData)
            onLoaded(model, vrmData)
          },
          (err: unknown) => {
            console.error('[loadVrmFrom] parse() onError callback fired:', err)
            onError(err)
          }
        )
        console.log('[loadVrmFrom] loader.parse() returned (synchronous)')
      } catch (err) {
        console.error('[loadVrmFrom] loader.parse() threw synchronously:', err)
        onError(err)
      }
    }
    reader.onerror = () => {
      console.error('[loadVrmFrom] FileReader.onerror:', reader.error)
      onError(reader.error)
    }
    console.log('[loadVrmFrom] Calling reader.readAsArrayBuffer()')
    reader.readAsArrayBuffer(file)
  }

  // Helper: load a VRM directly from an ArrayBuffer (no File needed)
  const loadVrmFromBuffer = (
    arrayBuffer: ArrayBuffer,
    onLoaded: (model: THREE.Group, vrmData: unknown) => void,
    onError: (err: unknown) => void
  ) => {
    console.log('[loadVrmFromBuffer] Starting load, ArrayBuffer size:', arrayBuffer.byteLength)
    const loader = new GLTFLoader()
    loader.register((parser: any) => {
      console.log('[loadVrmFromBuffer] VRMLoaderPlugin registered')
      return new VRMLoaderPlugin(parser)
    })

    console.log('[loadVrmFromBuffer] Calling loader.parse()')
    try {
      loader.parse(
        arrayBuffer,
        '',
        (gltf: GLTF) => {
          console.log('[loadVrmFromBuffer] parse() onLoad callback fired!')
          const model = gltf.scene
          const vrmData = (gltf as unknown as { userData: { vrm?: unknown } }).userData.vrm
          console.log('[loadVrmFromBuffer] Model children:', model.children.length, 'VRM data:', !!vrmData)
          onLoaded(model, vrmData)
        },
        (err: unknown) => {
          console.error('[loadVrmFromBuffer] parse() onError callback fired:', err)
          onError(err)
        }
      )
      console.log('[loadVrmFromBuffer] loader.parse() returned (synchronous)')
    } catch (err) {
      console.error('[loadVrmFromBuffer] loader.parse() threw synchronously:', err)
      onError(err)
    }
  }

  // Trigger load when bodyAsset is set
  useEffect(() => {
    if (!bodyAsset) return
    console.log('[CharacterModel] bodyAsset set, queuing load:', bodyAsset.name)
    setBodyAssetLoaded(bodyAsset)
  }, [bodyAsset])

  // Actual loading — runs when bodyAssetLoaded changes AND groupRef is ready
  // OR when bodyBuffer is provided (programmatic load)
  useEffect(() => {
    if (!groupRef.current) {
      console.log('[CharacterModel] load skip: groupRef not ready')
      return
    }

    // Guard against double loads (React Strict Mode)
    if (isLoadingRef.current) {
      console.log('[CharacterModel] load skip: already loading')
      return
    }

    // Buffer-based load (programmatic)
    if (bodyBuffer) {
      console.log('[CharacterModel] Starting VRM load from buffer')
      isLoadingRef.current = true

      // Clear previous model
      if (groupRef.current!.children.length > 0) {
        VRMUtils.deepDispose(groupRef.current!)
        while (groupRef.current!.children.length > 0) {
          groupRef.current!.remove(groupRef.current!.children[0])
        }
      }

      loadVrmFromBuffer(
        bodyBuffer,
        (model, vrmData) => {
          const childCount = model.children.length
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const meshCount = (model.children as any[]).reduce(
            (sum: number, c: any) => sum + (c.isMesh ? 1 : 0) + (c.isGroup ? c.children.filter((x: any) => x.isMesh).length : 0),
            0
          )
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())

          const info = `${childCount} children, ${meshCount} meshes. Size: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}. Center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`
          console.log('VRM Load (buffer):', info)
          console.log('userData keys:', Object.keys(model.userData))
          console.log('VRM data present:', !!vrmData)
          onDebugInfo(info)

          groupRef.current!.add(model)

          if (vrmData) {
            vrmRef.current = vrmData
            mixerRef.current = new THREE.AnimationMixer(model)
          } else {
            mixerRef.current = new THREE.AnimationMixer(model)
          }

          setLoaded(true)
          setLoading(false)
          isLoadingRef.current = false
        },
        (err) => {
          console.error('Failed to load VRM body from buffer:', err)
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
          isLoadingRef.current = false
        }
      )
      return
    }

    // File-based load (file input)
    if (!bodyAssetLoaded) {
      console.log('[CharacterModel] load skip: no bodyAssetLoaded')
      return
    }

    console.log('[CharacterModel] Starting VRM load from file')
    isLoadingRef.current = true

    // Clear previous model
    if (groupRef.current!.children.length > 0) {
      VRMUtils.deepDispose(groupRef.current!)
      while (groupRef.current!.children.length > 0) {
        groupRef.current!.remove(groupRef.current!.children[0])
      }
    }

    const file = bodyAssetLoaded._file as File
    console.log('[CharacterModel] file:', file?.name, 'is File:', file instanceof File)
    if (!(file instanceof File)) {
      console.error('[CharacterModel] _file is not a File:', file)
      setError('_file is not a File')
      setLoading(false)
      return
    }

    loadVrmFrom(
      file,
      (model, vrmData) => {
        const childCount = model.children.length
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meshCount = (model.children as any[]).reduce(
          (sum: number, c: any) => sum + (c.isMesh ? 1 : 0) + (c.isGroup ? c.children.filter((x: any) => x.isMesh).length : 0),
          0
        )
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        const info = `${childCount} children, ${meshCount} meshes. Size: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}. Center: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`
        console.log('VRM Load:', info)
        console.log('userData keys:', Object.keys(model.userData))
        console.log('VRM data present:', !!vrmData)
        onDebugInfo(info)

        groupRef.current!.add(model)

        if (vrmData) {
          vrmRef.current = vrmData
          mixerRef.current = new THREE.AnimationMixer(model)
        } else {
          mixerRef.current = new THREE.AnimationMixer(model)
        }

        setLoaded(true)
        setLoading(false)
        isLoadingRef.current = false
      },
      (err) => {
        console.error('Failed to load VRM body:', err)
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
        isLoadingRef.current = false
      }
    )
  }, [bodyAssetLoaded, bodyBuffer, onDebugInfo])

  // Cleanup
  useEffect(() => {
    return () => {
      if (groupRef.current) {
        VRMUtils.deepDispose(groupRef.current)
        while (groupRef.current!.children.length > 0) {
          groupRef.current!.remove(groupRef.current!.children[0])
        }
      }
      mixerRef.current = null
      vrmRef.current = null
    }
  }, [])

  // Load and attach hair mesh
  useEffect(() => {
    if (!hairAsset || !groupRef.current || loading) return

    const file = hairAsset._file as File
    if (!file) return

    loadVrmFrom(
      file,
      (model) => {
        console.log('Hair loaded:', model.children.length, 'children')
        groupRef.current!.add(model)
      },
      (err) => console.error('Failed to load hair:', err)
    )
  }, [hairAsset, loading])

  // Load and attach clothing mesh
  useEffect(() => {
    if (!clothingAsset || !groupRef.current || loading) return

    const file = clothingAsset._file as File
    if (!file) return

    loadVrmFrom(
      file,
      (model) => {
        console.log('Clothing loaded:', model.children.length, 'children')
        groupRef.current!.add(model)
      },
      (err) => console.error('Failed to load clothing:', err)
    )
  }, [clothingAsset, loading])

  // Update debug wireframe bounds
  useFrame(() => {
    if (!loaded || !groupRef.current || !wireframeRef.current) return
    const model = groupRef.current.children[0] as THREE.Group
    if (!model) return

    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    wireframeRef.current.position.copy(center)
    wireframeRef.current.scale.copy(size).multiplyScalar(1.05)
  })

  // Idle breathing animation
  useFrame((state) => {
    if (!groupRef.current || !vrmRef.current) return
    const t = state.clock.getElapsedTime()
    const breathe = 1 + Math.sin(t * 1.5) * 0.008

    // @ts-expect-error vrmRef is three-vrm VRM instance
    const vrm = vrmRef.current as { humanoid?: { getRawBoneNode: (name: string) => THREE.Object3D | null } }
    if (vrm?.humanoid) {
      const chest = vrm.humanoid.getRawBoneNode('chest')
      if (chest) {
        chest.scale.setScalar(breathe)
      }
    }
  })

  // Always render the group — placeholders go inside
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {loading && (
        <mesh>
          <boxGeometry args={[0.5, 1.0, 0.5]} />
          <meshStandardMaterial color="#4444aa" />
        </mesh>
      )}
      {error && (
        <mesh>
          <boxGeometry args={[0.5, 1.0, 0.5]} />
          <meshStandardMaterial color="#aa4444" />
        </mesh>
      )}
      {/* Debug wireframe (always visible when loaded) */}
      {loaded && (
        <mesh ref={wireframeRef} visible={true}>
          <boxGeometry />
          <meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.3} />
        </mesh>
      )}

      <AnimationPlayer
        mixer={mixerRef.current}
        animations={animations}
        currentAnimation={currentAnimation}
        onAnimationEnded={onAnimationEnded}
      />
    </group>
  )
}
