/**
 * T-Pose Diagnostic Tool
 *
 * Loads a VRM model (via direct glTF JSON parsing), loads an animation (FBX),
 * retargets it, runs it through THREE.AnimationMixer, and checks at the loop
 * point whether bones are drifting toward T-pose.
 *
 * Root cause breakdown:
 *   1. Clip duration gap — does the clip extend past the last keyframe?
 *   2. First keyframe mismatch — does the first keyframe match the rest pose?
 *   3. Last keyframe near rest — is the last keyframe close to rest pose?
 *   4. Retargeting shift — does retargeting change quaternion values?
 *   5. Mixer interpolation — does the mixer interpolate toward rest pose?
 *
 * Usage:
 *   npx tsx scripts/diagnose-tpose.ts <vrm-path> <animation-path> [--loop]
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import * as THREE from 'three'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { retargetMixamoClip, MIXAMO_TO_VRM } from '../src/engine/vrm/AnimationRemapper'

// ── Config ────────────────────────────────────────────────────────────────────

const DEFAULT_VRM = '/home/keless/Downloads/VRM-GLB-GLTF/AvatarSample_E.vrm'
const DEFAULT_ANIM = '/home/keless/Code/VRMCharacter/public/animations/acknowledging.fbx'

const HUMAN_BONES = [
  'hips', 'spine', 'chest', 'upperChest',
  'neck', 'head', 'jaw',
  'leftEye', 'rightEye',
  'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
  'leftThumbMetacarpal', 'leftThumbProximal', 'leftThumbDistal',
  'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
  'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
  'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
  'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
  'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
  'rightThumbMetacarpal', 'rightThumbProximal', 'rightThumbDistal',
  'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
  'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
  'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
  'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal',
  'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
  'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function deg(v: number): string {
  return `${(v * 180 / Math.PI).toFixed(1)}°`
}

function quatAngle(q: THREE.Quaternion): number {
  return 2 * Math.acos(Math.min(Math.abs(q.w), 1))
}

function quatDiff(a: THREE.Quaternion, b: THREE.Quaternion): number {
  const dot = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w)
  return 2 * Math.acos(Math.min(dot, 1))
}

function quatToEuler(q: THREE.Quaternion): { x: number; y: number; z: number } {
  const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return { x: euler.x, y: euler.y, z: euler.z }
}

function quatStr(q: THREE.Quaternion): string {
  return `[${q.x.toFixed(4)}, ${q.y.toFixed(4)}, ${q.z.toFixed(4)}, ${q.w.toFixed(4)}]`
}

// ── Minimal glTF parser ──────────────────────────────────────────────────────

function parseGLTF(buffer: Buffer): { json: any; bin: Buffer | null } {
  if (buffer.length < 12) throw new Error('Buffer too small for glTF')
  const magic = buffer.readUInt32LE(0)
  if (magic !== 0x46546c67) throw new Error(`Not glTF (magic: 0x${magic.toString(16)})`)
  const version = buffer.readUInt32LE(4)
  if (version !== 2) throw new Error(`glTF v${version} not supported`)
  const total = buffer.readUInt32LE(8)
  let offset = 12
  let jsonChunk: any = null
  let binChunk: Buffer | null = null
  while (offset < total) {
    const len = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    const data = buffer.subarray(offset + 8, offset + 8 + len)
    if (type === 0x4e4f534a) jsonChunk = JSON.parse(data.toString('utf8'))
    else if (type === 0x004e4942) binChunk = data
    offset += 8 + len
  }
  if (!jsonChunk) throw new Error('No JSON chunk')
  return { json: jsonChunk, bin: binChunk }
}

// ── Build node hierarchy from glTF JSON ───────────────────────────────────────

interface GltfNode {
  index: number
  name: string
  children: number[]
  translation: [number, number, number]
  rotation: [number, number, number, number]
  scale: [number, number, number]
  mesh?: number
  skin?: number
}

function buildNodeHierarchy(json: any): Map<number, GltfNode> {
  const nodes = new Map<number, GltfNode>()
  if (!json.nodes) return nodes
  for (let i = 0; i < json.nodes.length; i++) {
    const n = json.nodes[i]
    nodes.set(i, {
      index: i,
      name: n.name || `(node${i})`,
      children: n.children || [],
      translation: n.translation || [0, 0, 0],
      rotation: n.rotation || [0, 0, 0, 1],
      scale: n.scale || [1, 1, 1],
      mesh: n.mesh,
      skin: n.skin,
    })
  }
  return nodes
}

// ── Resolve VRM humanoid bone → node index ────────────────────────────────────

function resolveVrmBones(json: any, nodeMap: Map<number, GltfNode>): Map<string, number> {
  const mapping = new Map<string, number>()
  const vrmExt = json.extensions?.['XR_KHR_vrm_extensions_1_0']
    || json.extensions?.['VRM']

  if (!vrmExt?.humanoid) return mapping

  // VRM 1.0: standardBones object with keys like "-hips"
  if (vrmExt.humanoid.standardBones) {
    for (const [key, value] of Object.entries(vrmExt.humanoid.standardBones)) {
      const boneData = value as { node?: number }
      if (boneData.node != null) {
        const vrmBone = key.replace(/^-/, '')
        mapping.set(vrmBone, boneData.node)
      }
    }
  }

  // VRM 0.x: humanBones array
  if (vrmExt.humanoid.humanBones) {
    const bones = vrmExt.humanoid.humanBones as { bone: string; node: number }[]
    for (const { bone, node } of bones) {
      mapping.set(bone, node)
    }
  }

  return mapping
}

// ── Compute world transform of a node in rest pose ────────────────────────────

function computeWorldTransform(
  nodeId: number,
  nodeMap: Map<number, GltfNode>,
  parentWorldMatrix: THREE.Matrix4 | null,
): THREE.Matrix4 {
  const node = nodeMap.get(nodeId)!
  const matrix = new THREE.Matrix4()

  // Scale
  const scale = new THREE.Vector3(...node.scale)
  matrix.makeScale(scale.x, scale.y, scale.z)

  // Rotation
  const rot = new THREE.Quaternion(...node.rotation)
  matrix.premultiply(new THREE.Matrix4().makeRotationFromQuaternion(rot))

  // Translation
  const pos = new THREE.Vector3(...node.translation)
  matrix.premultiply(new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z))

  // Parent
  if (parentWorldMatrix) {
    matrix.premultiply(parentWorldMatrix)
  }

  return matrix
}

// ── Read quaternion keyframe at time ──────────────────────────────────────────

function readQuatTrack(
  track: THREE.QuaternionKeyframeTrack,
  time: number,
): THREE.Quaternion {
  const times = track.times
  const values = track.values
  let idx = 0
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= time + 1e-6) idx = i
    else break
  }

  if (idx >= times.length - 1) {
    return new THREE.Quaternion(
      values[idx * 4], values[idx * 4 + 1], values[idx * 4 + 2], values[idx * 4 + 3],
    )
  }

  const t0 = times[idx]
  const t1 = times[idx + 1]
  const t = (time - t0) / (t1 - t0)

  const q0 = new THREE.Quaternion(
    values[idx * 4], values[idx * 4 + 1], values[idx * 4 + 2], values[idx * 4 + 3],
  )
  const q1 = new THREE.Quaternion(
    values[(idx + 1) * 4], values[(idx + 1) * 4 + 1], values[(idx + 1) * 4 + 2], values[(idx + 1) * 4 + 3],
  )
  const q = q0.clone().slerp(q1, t)
  return q
}

// ── Read vector3 keyframe at time ─────────────────────────────────────────────

function readVec3Track(
  track: THREE.VectorKeyframeTrack,
  time: number,
): THREE.Vector3 {
  const times = track.times
  const values = track.values
  let idx = 0
  for (let i = 0; i < times.length; i++) {
    if (times[i] <= time + 1e-6) idx = i
    else break
  }

  if (idx >= times.length - 1) {
    return new THREE.Vector3(
      values[idx * 3], values[idx * 3 + 1], values[idx * 3 + 2],
    )
  }

  const t0 = times[idx]
  const t1 = times[idx + 1]
  const t = (time - t0) / (t1 - t0)

  const v0 = new THREE.Vector3(
    values[idx * 3], values[idx * 3 + 1], values[idx * 3 + 2],
  )
  const v1 = new THREE.Vector3(
    values[(idx + 1) * 3], values[(idx + 1) * 3 + 1], values[(idx + 1) * 3 + 2],
  )
  return v0.lerp(v1, t)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const vrmPath = resolve(args[0] || DEFAULT_VRM)
  const animPath = resolve(args[1] || DEFAULT_ANIM)
  const doLoop = args.includes('--loop')

  console.log('\n=== T-Pose Diagnostic Tool ===')
  console.log(`VRM:         ${vrmPath}`)
  console.log(`Animation:   ${animPath}`)
  console.log(`Loop mode:   ${doLoop ? 'yes' : 'no'}\n`)

  // ── Step 1: Parse VRM glTF JSON ───────────────────────────────────────────

  console.log('\x1b[1mStep 1: Parsing VRM model\x1b[0m')

  const vrmBuffer = readFileSync(vrmPath)
  const { json: vrmJson } = parseGLTF(vrmBuffer)
  const nodeMap = buildNodeHierarchy(vrmJson)
  const vrmBoneToNode = resolveVrmBones(vrmJson, nodeMap)

  console.log(`  Nodes: ${nodeMap.size}`)
  console.log(`  VRM humanoid bones resolved: ${vrmBoneToNode.size}`)

  // Compute world transforms for all nodes in rest pose
  const worldTransforms = new Map<number, THREE.Matrix4>()
  function computeWorld(nodeId: number, parentMatrix: THREE.Matrix4 | null) {
    const wt = computeWorldTransform(nodeId, nodeMap, parentMatrix)
    worldTransforms.set(nodeId, wt)
    const node = nodeMap.get(nodeId)!
    for (const childId of node.children) {
      computeWorld(childId, wt)
    }
  }
  // Start from ALL scene root nodes (VRM files often have multiple roots: Face, Body, Root, etc.)
  const sceneRoots = vrmJson.scene != null ? vrmJson.scenes?.[vrmJson.scene]?.nodes || [] : []
  for (const rootNodeIdx of sceneRoots) {
    computeWorld(rootNodeIdx, null)
  }

  // Record rest-pose quaternions for VRM humanoid bones
  const restPoseQuats = new Map<string, THREE.Quaternion>()
  const restPoseNodes = new Map<string, { name: string; quat: THREE.Quaternion }>()

  for (const [vrmBone, nodeId] of vrmBoneToNode) {
    const wt = worldTransforms.get(nodeId)
    if (wt) {
      const quat = new THREE.Quaternion().setFromRotationMatrix(wt)
      restPoseQuats.set(vrmBone, quat)
      const nodeName = nodeMap.get(nodeId)?.name || `(node${nodeId})`
      restPoseNodes.set(vrmBone, { name: nodeName, quat })
    }
  }

  console.log(`  Rest-pose quaternions recorded for ${restPoseQuats.size} bones`)
  console.log(`  Sample rest-pose (leftUpperArm): ${quatStr(restPoseQuats.get('leftUpperArm') || new THREE.Quaternion())}`)
  console.log(`  Sample rest-pose (rightUpperArm): ${quatStr(restPoseQuats.get('rightUpperArm') || new THREE.Quaternion())}`)

  // ── Step 2: Load FBX animation ────────────────────────────────────────────

  console.log('\n\x1b[1mStep 2: Loading FBX animation\x1b[0m')

  const fbxBuffer = readFileSync(animPath)
  const fbxLoader = new FBXLoader()
  const fbxGroup = fbxLoader.parse(
    fbxBuffer.buffer.slice(fbxBuffer.byteOffset, fbxBuffer.byteOffset + fbxBuffer.byteLength) as ArrayBuffer,
    animPath.substring(animPath.lastIndexOf('/') + 1),
  )

  const clips = fbxGroup.animations
  if (!clips || clips.length === 0) {
    console.error('  No animation clips found in FBX')
    process.exit(1)
  }

  // Find first non-empty clip
  let rawClip: THREE.AnimationClip | null = null
  for (const clip of clips) {
    if (clip.tracks.length > 0) {
      rawClip = clip
      break
    }
  }

  if (!rawClip) {
    console.error('  No non-empty clips')
    process.exit(1)
  }

  console.log(`  Clip: "${rawClip.name}"`)
  console.log(`  Tracks: ${rawClip.tracks.length}`)
  console.log(`  Duration: ${rawClip.duration.toFixed(4)}s`)

  // List bones in the animation
  const animBones = new Set<string>()
  rawClip.tracks.forEach((track) => {
    const dotIdx = track.name.indexOf('.')
    if (dotIdx > 0) animBones.add(track.name.substring(0, dotIdx))
  })
  console.log(`  Bones (${animBones.size}): ${[...animBones].join(', ')}`)

  // Track quaternion tracks
  const quatTracks = rawClip.tracks.filter(
    (t) => t instanceof THREE.QuaternionKeyframeTrack,
  ) as THREE.QuaternionKeyframeTrack[]
  const vec3Tracks = rawClip.tracks.filter(
    (t) => t instanceof THREE.VectorKeyframeTrack,
  ) as THREE.VectorKeyframeTrack[]

  console.log(`  Quaternion tracks: ${quatTracks.length}`)
  console.log(`  Vector3 tracks: ${vec3Tracks.length}`)

  // ── Step 3: Duration gap analysis ─────────────────────────────────────────

  console.log('\n\x1b[1mStep 3: Duration gap analysis\x1b[0m')

  let lastKeyframeTime = 0
  rawClip.tracks.forEach((track) => {
    const lastTime = track.times[track.times.length - 1]
    if (lastTime > lastKeyframeTime) lastKeyframeTime = lastTime
  })

  const durationGap = rawClip.duration - lastKeyframeTime
  console.log(`  Clip duration:     ${rawClip.duration.toFixed(4)}s`)
  console.log(`  Last keyframe:     ${lastKeyframeTime.toFixed(4)}s`)
  console.log(`  Duration gap:      ${durationGap.toFixed(4)}s`)

  let durationGapCause = false
  if (durationGap > 0.001) {
    console.log(`  \x1b[33m>>> GAP EXISTS: mixer will interpolate toward rest pose during this gap\x1b[0m`)
    durationGapCause = true
  } else {
    console.log(`  No duration gap.`)
  }

  // ── Step 4: Retarget the clip ─────────────────────────────────────────────

  console.log('\n\x1b[1mStep 4: Retargeting\x1b[0m')

  // Build VRM humanoid mock with real rest-pose node transforms
  interface RealVrmHumanoid {
    getRawBoneNode(name: string): THREE.Object3D | null
  }

  // Create real Three.js bone objects with proper rest-pose transforms
  // Also build a map: vrmBoneName → actual node name (for track lookup)
  const vrmBoneNodes = new Map<string, THREE.Object3D>()
  const vrmBoneToNodeName = new Map<string, string>()

  for (const [vrmBone, nodeId] of vrmBoneToNode) {
    const wt = worldTransforms.get(nodeId)
    const nodeName = nodeMap.get(nodeId)?.name || `(node${nodeId})`
    const obj = new THREE.Object3D()
    obj.name = nodeName
    if (wt) {
      obj.quaternion.setFromRotationMatrix(wt)
      obj.position.setFromMatrixPosition(wt)
    }
    vrmBoneNodes.set(vrmBone, obj)
    vrmBoneToNodeName.set(vrmBone, nodeName)
  }

  console.log(`  VRM bone → node name mapping:`)
  for (const [vrmBone, nodeName] of vrmBoneToNodeName) {
    console.log(`    ${vrmBone.padEnd(20)} → ${nodeName}`)
  }

  const realHumanoid: RealVrmHumanoid = {
    getRawBoneNode(vrmBoneName: string): THREE.Object3D | null {
      return vrmBoneNodes.get(vrmBoneName) || null
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retargetedClip = retargetMixamoClip(rawClip, fbxGroup, realHumanoid, null) as any

  if (!retargetedClip) {
    console.error('  Retargeting returned null!')
    process.exit(1)
  }

  console.log(`  Retargeted tracks: ${retargetedClip.tracks.length}`)

  // Build lookup maps for tracks
  const rawQuatMap = new Map<string, THREE.QuaternionKeyframeTrack>()
  for (const track of quatTracks) {
    rawQuatMap.set(track.name, track)
  }

  const retargetedQuatMap = new Map<string, THREE.QuaternionKeyframeTrack>()
  for (const track of retargetedClip.tracks) {
    if (track instanceof THREE.QuaternionKeyframeTrack) {
      retargetedQuatMap.set(track.name, track)
    }
  }

  // ── Step 5: Compare raw vs retargeted quaternions ─────────────────────────

  console.log('\n\x1b[1mStep 5: Raw vs retargeted quaternion comparison\x1b[0m')

  // For each bone that has both raw and retargeted quaternion tracks,
  // compare quaternions at key time points
  const TPOSE_BONES = [
    'leftUpperArm', 'rightUpperArm',
    'leftLowerArm', 'rightLowerArm',
    'leftShoulder', 'rightShoulder',
    'hips', 'spine', 'chest', 'upperChest',
    'neck', 'head',
    'leftUpperLeg', 'rightUpperLeg',
    'leftHand', 'rightHand',
  ]

  // Map retargeted track names back to VRM bone names for display
  // Retargeted track names use the VRM bone's actual node name (e.g., "J_Bip_L_UpperArm")
  // We need to match them to VRM bone names

  function findRetargetedTrackForVrmBone(vrmBone: string): THREE.QuaternionKeyframeTrack | null {
    const nodeName = vrmBoneToNodeName.get(vrmBone)
    if (!nodeName) return null
    // Find track that starts with this node name
    for (const [trackName, track] of retargetedQuatMap) {
      if (trackName.startsWith(nodeName + '.')) return track
    }
    return null
  }

  // Sample time points
  const sampleTimes: number[] = [0, lastKeyframeTime]
  if (doLoop) {
    sampleTimes.push(rawClip.duration - 0.001) // just before clip duration
    sampleTimes.push(rawClip.duration) // at clip duration
  }

  console.log(`\n  Sample times: ${sampleTimes.map(t => t.toFixed(4)).join(', ')}\n`)

  // Per-bone, per-time comparison
  const comparisonData: {
    time: number
    vrmBone: string
    nodeName: string
    restQuat: THREE.Quaternion
    rawQuat: THREE.Quaternion | null
    retargetedQuat: THREE.Quaternion | null
    rawDiffFromRest: number
    retargetedDiffFromRest: number
  }[] = []

  for (const time of sampleTimes) {
    for (const vrmBone of TPOSE_BONES) {
      const restQuat = restPoseQuats.get(vrmBone)
      if (!restQuat) continue

      const nodeObj = vrmBoneNodes.get(vrmBone)
      if (!nodeObj) continue

      const nodeName = nodeObj.name

      // Find raw track (FBX bone name → try to match)
      // FBX uses mixamorig* names, we need to map back
      let rawQuat: THREE.Quaternion | null = null
      for (const [fbxBone, vrmName] of Object.entries(MIXAMO_TO_VRM)) {
        if (vrmName === vrmBone) {
          const track = rawQuatMap.get(`${fbxBone}.quaternion`)
            || rawQuatMap.get(`${fbxBone.replace(':', '')}.quaternion`)
          if (track) {
            rawQuat = readQuatTrack(track, time)
            break
          }
        }
      }

      // Find retargeted track
      const retTrack = findRetargetedTrackForVrmBone(vrmBone)
      let retargetedQuat: THREE.Quaternion | null = null
      if (retTrack) {
        retargetedQuat = readQuatTrack(retTrack, time)
      }

      const rawDiff = rawQuat ? quatDiff(rawQuat, restQuat) * (180 / Math.PI) : 0
      const retDiff = retargetedQuat ? quatDiff(retargetedQuat, restQuat) * (180 / Math.PI) : 0

      comparisonData.push({
        time, vrmBone, nodeName, restQuat,
        rawQuat, retargetedQuat,
        rawDiffFromRest: rawDiff,
        retargetedDiffFromRest: retDiff,
      })
    }
  }

  // Print comparison table
  console.log(`  {'Time'.padEnd(12)} {'VRM Bone'.padEnd(20)} {'Rest'.padEnd(24)} {'Raw'.padEnd(24)} {'Retargeted'.padEnd(24)} {'RawΔ'.padEnd(8)} {'RetΔ'.padEnd(8)}`)
  console.log('  ' + '─'.repeat(106))

  for (const d of comparisonData) {
    const timeStr = `${d.time.toFixed(4)}s`.padEnd(12)
    const boneStr = d.vrmBone.padEnd(20)
    const restStr = quatStr(d.restQuat).padEnd(24)

    const rawStr = d.rawQuat ? quatStr(d.rawQuat).padEnd(24) : 'N/A'.padEnd(24)
    const retStr = d.retargetedQuat ? quatStr(d.retargetedQuat).padEnd(24) : 'N/A'.padEnd(24)

    const rawDelta = `${d.rawDiffFromRest.toFixed(1)}°`.padEnd(8)
    const retDelta = `${d.retargetedDiffFromRest.toFixed(1)}°`.padEnd(8)

    const rawColor = d.rawDiffFromRest < 2 ? '\x1b[90m' : d.rawDiffFromRest < 10 ? '\x1b[33m' : '\x1b[31m'
    const retColor = d.retargetedDiffFromRest < 2 ? '\x1b[90m' : d.retargetedDiffFromRest < 10 ? '\x1b[33m' : '\x1b[31m'

    console.log(`  ${timeStr} ${boneStr} ${restStr} ${rawColor}${rawStr}\x1b[0m ${retColor}${retStr}\x1b[0m ${rawDelta} ${retDelta}`)
  }

  // ── Step 6: Mixer simulation ──────────────────────────────────────────────

  console.log('\n\x1b[1mStep 6: Mixer simulation\x1b[0m')

  // Create a minimal scene with bone objects at their rest-pose transforms
  const sceneRoot = new THREE.Group()
  for (const [vrmBone, obj] of vrmBoneNodes) {
    sceneRoot.add(obj)
  }

  const mixer = new THREE.AnimationMixer(sceneRoot)

  // Test with trimmed clip (duration trimmed to last keyframe)
  const trimmedDuration = lastKeyframeTime
  const trimmedTracks = retargetedClip.tracks.map((track) => {
    if (track instanceof THREE.QuaternionKeyframeTrack) {
      const times = track.times
      const values = track.values
      const filtered: number[] = []
      const fTimes: number[] = []
      for (let i = 0; i < times.length; i++) {
        if (times[i] <= lastKeyframeTime + 1e-6) {
          fTimes.push(times[i])
          for (let j = 0; j < 4; j++) filtered.push(values[i * 4 + j])
        }
      }
      if (fTimes.length > 0) {
        return new THREE.QuaternionKeyframeTrack(track.name, fTimes, filtered)
      }
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      const times = track.times
      const values = track.values
      const filtered: number[] = []
      const fTimes: number[] = []
      for (let i = 0; i < times.length; i++) {
        if (times[i] <= lastKeyframeTime + 1e-6) {
          fTimes.push(times[i])
          for (let j = 0; j < 3; j++) filtered.push(values[i * 3 + j])
        }
      }
      if (fTimes.length > 0) {
        return new THREE.VectorKeyframeTrack(track.name, fTimes, filtered)
      }
    }
    return track
  }).filter((t) => t !== null)

  const trimmedClip = new THREE.AnimationClip(retargetedClip.name, trimmedDuration, trimmedTracks)

  // Also create untrimmed version
  const untrimmedClip = new THREE.AnimationClip(retargetedClip.name, rawClip.duration, retargetedClip.tracks)

  console.log(`  Trimmed clip: ${trimmedClip.duration.toFixed(4)}s, ${trimmedClip.tracks.length} tracks`)
  console.log(`  Untrimmed clip: ${untrimmedClip.duration.toFixed(4)}s, ${untrimmedClip.tracks.length} tracks`)

  // Simulate with trimmed clip
  console.log(`\n  --- Trimmed clip (duration = last keyframe) ---`)
  const trimmedAction = mixer.clipAction(trimmedClip)
  trimmedAction.setLoop(THREE.LoopRepeat)
  trimmedAction.play()

  // Play through the full loop
  const loopPoints = [
    { label: 'start', time: 0 },
    { label: '25%', time: trimmedDuration * 0.25 },
    { label: '50%', time: trimmedDuration * 0.5 },
    { label: '75%', time: trimmedDuration * 0.75 },
    { label: 'last-frame', time: trimmedDuration },
    { label: 'loop-wraps', time: 0 }, // wraps to 0
  ]

  for (const pt of loopPoints) {
    mixer.stopAllAction()
    const action = mixer.clipAction(trimmedClip)
    action.setLoop(THREE.LoopRepeat)
    action.play()

    // Set the action time directly
    action.time = pt.time % trimmedClip.duration
    mixer.update(0)

    console.log(`\n  t=${pt.time.toFixed(4)}s (${pt.label}):`)
    for (const vrmBone of TPOSE_BONES) {
      const nodeObj = vrmBoneNodes.get(vrmBone)
      if (!nodeObj) continue
      const boneQuat = nodeObj.quaternion
      const restQuat = restPoseQuats.get(vrmBone)!
      const diffDeg = quatDiff(boneQuat, restQuat) * (180 / Math.PI)
      const marker = diffDeg < 2 ? '\x1b[90m·\x1b[0m' : diffDeg < 10 ? '\x1b[33m◐\x1b[0m' : '\x1b[32m●\x1b[0m'
      console.log(`    ${marker} ${vrmBone.padEnd(20)} diff=${diffDeg.toFixed(1)}°  ${quatStr(boneQuat)}`)
    }
  }

  // Simulate with untrimmed clip
  console.log(`\n  --- Untrimmed clip (full duration, includes gap) ---`)
  const untrimmedAction = mixer.clipAction(untrimmedClip)
  untrimmedAction.setLoop(THREE.LoopRepeat)
  untrimmedAction.play()

  // Key loop points near the end
  const nearEndPoints = [
    { label: 'last-kf', time: lastKeyframeTime },
    { label: 'gap-1/4', time: lastKeyframeTime + durationGap * 0.25 },
    { label: 'gap-1/2', time: lastKeyframeTime + durationGap * 0.5 },
    { label: 'gap-3/4', time: lastKeyframeTime + durationGap * 0.75 },
    { label: 'end', time: rawClip.duration - 0.001 },
    { label: 'wrap→0', time: 0 },
  ]

  for (const pt of nearEndPoints) {
    mixer.stopAllAction()
    const action = mixer.clipAction(untrimmedClip)
    action.setLoop(THREE.LoopRepeat)
    action.play()
    action.time = pt.time % untrimmedClip.duration
    mixer.update(0)

    console.log(`\n  t=${pt.time.toFixed(4)}s (${pt.label}):`)
    for (const vrmBone of TPOSE_BONES) {
      const nodeObj = vrmBoneNodes.get(vrmBone)
      if (!nodeObj) continue
      const boneQuat = nodeObj.quaternion
      const restQuat = restPoseQuats.get(vrmBone)!
      const diffDeg = quatDiff(boneQuat, restQuat) * (180 / Math.PI)
      const marker = diffDeg < 2 ? '\x1b[90m·\x1b[0m' : diffDeg < 10 ? '\x1b[33m◐\x1b[0m' : '\x1b[32m●\x1b[0m'
      console.log(`    ${marker} ${vrmBone.padEnd(20)} diff=${diffDeg.toFixed(1)}°  ${quatStr(boneQuat)}`)
    }
  }

  // ── Step 7: Root cause diagnosis ──────────────────────────────────────────

  console.log('\n\x1b[1mStep 7: Root Cause Diagnosis\x1b[0m')

  const causes: { name: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; detail: string }[] = []

  // Cause 1: Duration gap
  if (durationGapCause) {
    causes.push({
      name: 'Clip duration extends past last keyframe',
      severity: durationGap > 0.01 ? 'HIGH' : 'MEDIUM',
      detail: `Duration (${rawClip.duration.toFixed(4)}s) > last keyframe (${lastKeyframeTime.toFixed(4)}s). Gap: ${durationGap.toFixed(4)}s. Mixer interpolates toward rest pose during this gap, causing T-pose flash at loop point.`,
    })
  }

  // Cause 2: First keyframe mismatch with rest pose
  console.log(`\n  First keyframe vs rest pose analysis:`)
  let firstKeyframeMaxDiff = 0
  let firstKeyframeMaxBone = ''
  for (const vrmBone of TPOSE_BONES) {
    const restQuat = restPoseQuats.get(vrmBone)
    if (!restQuat) continue

    // Find matching raw track
    let rawQuatAt0: THREE.Quaternion | null = null
    for (const [fbxBone, vrmName] of Object.entries(MIXAMO_TO_VRM)) {
      if (vrmName === vrmBone) {
        const track = rawQuatMap.get(`${fbxBone}.quaternion`)
          || rawQuatMap.get(`${fbxBone.replace(':', '')}.quaternion`)
        if (track) {
          rawQuatAt0 = readQuatTrack(track, 0)
          break
        }
      }
    }

    // Find matching retargeted track
    const retTrack = findRetargetedTrackForVrmBone(vrmBone)
    let retQuatAt0: THREE.Quaternion | null = null
    if (retTrack) retQuatAt0 = readQuatTrack(retTrack, 0)

    if (rawQuatAt0) {
      const diff = quatDiff(rawQuatAt0, restQuat) * (180 / Math.PI)
      if (diff > firstKeyframeMaxDiff) {
        firstKeyframeMaxDiff = diff
        firstKeyframeMaxBone = vrmBone
      }
    }
    if (retQuatAt0) {
      const diff = quatDiff(retQuatAt0, restQuat) * (180 / Math.PI)
      if (diff > firstKeyframeMaxDiff) {
        firstKeyframeMaxDiff = diff
        firstKeyframeMaxBone = vrmBone
      }
    }
  }

  console.log(`  Max first-frame deviation from rest: ${firstKeyframeMaxDiff.toFixed(1)}° (${firstKeyframeMaxBone})`)

  if (firstKeyframeMaxDiff > 30) {
    causes.push({
      name: 'First keyframe far from rest pose',
      severity: 'HIGH',
      detail: `First frame differs from rest pose by ${firstKeyframeMaxDiff.toFixed(1)}°. This causes a visible snap when the animation starts.`,
    })
  } else if (firstKeyframeMaxDiff > 5) {
    causes.push({
      name: 'First keyframe moderately from rest pose',
      severity: 'MEDIUM',
      detail: `First frame differs from rest pose by ${firstKeyframeMaxDiff.toFixed(1)}°. May cause a small snap.`,
    })
  }

  // Cause 3: Last keyframe near identity (rest)
  console.log(`\n  Last keyframe vs rest pose analysis:`)
  let lastKeyframeMaxDiff = 0
  let lastKeyframeMaxBone = ''
  for (const vrmBone of TPOSE_BONES) {
    const restQuat = restPoseQuats.get(vrmBone)
    if (!restQuat) continue

    const retTrack = findRetargetedTrackForVrmBone(vrmBone)
    if (retTrack) {
      const retQuatAtLast = readQuatTrack(retTrack, lastKeyframeTime)
      const diff = quatDiff(retQuatAtLast, restQuat) * (180 / Math.PI)
      if (diff > lastKeyframeMaxDiff) {
        lastKeyframeMaxDiff = diff
        lastKeyframeMaxBone = vrmBone
      }
    }
  }

  console.log(`  Max last-frame deviation from rest: ${lastKeyframeMaxDiff.toFixed(1)}° (${lastKeyframeMaxBone})`)

  if (lastKeyframeMaxDiff < 5) {
    causes.push({
      name: 'Last keyframe near rest pose',
      severity: 'HIGH',
      detail: `Last keyframe is only ${lastKeyframeMaxDiff.toFixed(1)}° from rest pose. When the loop restarts, the animation may appear to snap from rest pose to the first animated frame.`,
    })
  }

  // Cause 4: Retargeting shifts quaternions
  console.log(`\n  Retargeting shift analysis:`)
  let maxRetargetShift = 0
  let maxRetargetBone = ''
  for (const vrmBone of TPOSE_BONES) {
    // Find matching raw track
    let rawTrack: THREE.QuaternionKeyframeTrack | null = null
    for (const [fbxBone, vrmName] of Object.entries(MIXAMO_TO_VRM)) {
      if (vrmName === vrmBone) {
        rawTrack = rawQuatMap.get(`${fbxBone}.quaternion`)
          || rawQuatMap.get(`${fbxBone.replace(':', '')}.quaternion`) || null
        if (rawTrack) break
      }
    }
    if (!rawTrack) continue

    const retTrack = findRetargetedTrackForVrmBone(vrmBone)
    if (!retTrack) continue

    // Compare at first and last keyframe
    for (const time of [0, lastKeyframeTime]) {
      const rawQ = readQuatTrack(rawTrack, time)
      const retQ = readQuatTrack(retTrack, time)
      const shift = quatDiff(rawQ, retQ) * (180 / Math.PI)
      if (shift > maxRetargetShift) {
        maxRetargetShift = shift
        maxRetargetBone = vrmBone
      }
    }
  }

  console.log(`  Max retargeting shift: ${maxRetargetShift.toFixed(1)}° (${maxRetargetBone})`)

  if (maxRetargetShift > 30) {
    causes.push({
      name: 'Retargeting significantly changes quaternion values',
      severity: 'MEDIUM',
      detail: `Retargeting shifts quaternions by up to ${maxRetargetShift.toFixed(1)}°. The rotation rebaking process may be introducing pose shifts.`,
    })
  }

  // Cause 5: Mixer behavior check
  // Check if the mixer-evaluated bone quaternions match the retargeted clip quaternions
  console.log(`\n  Mixer evaluation check (at loop point, trimmed clip):`)
  mixer.stopAllAction()
  const loopAction = mixer.clipAction(trimmedClip)
  loopAction.setLoop(THREE.LoopRepeat)
  loopAction.play()
  loopAction.time = trimmedDuration
  mixer.update(0)

  let mixerMatchMax = 0
  let mixerMatchBone = ''
  for (const vrmBone of TPOSE_BONES) {
    const boneObj = vrmBoneNodes.get(vrmBone)
    if (!boneObj) continue
    const retTrack = findRetargetedTrackForVrmBone(vrmBone)
    if (!retTrack) continue

    const boneQuat = boneObj.quaternion
    const clipQuat = readQuatTrack(retTrack, lastKeyframeTime)
    const mismatch = quatDiff(boneQuat, clipQuat) * (180 / Math.PI)
    if (mismatch > mixerMatchMax) {
      mixerMatchMax = mismatch
      mixerMatchBone = vrmBone
    }
  }

  console.log(`  Max mixer vs clip mismatch: ${mixerMatchMax.toFixed(1)}° (${mixerMatchBone})`)

  if (mixerMatchMax > 5) {
    causes.push({
      name: 'Mixer-evaluated bone differs from clip quaternion',
      severity: 'MEDIUM',
      detail: `At the loop point, the mixer-evaluated bone quaternion differs from the clip's target quaternion by ${mixerMatchMax.toFixed(1)}°. This suggests the mixer or bone hierarchy is interfering with the animation evaluation.`,
    })
  }

  // Print diagnosis
  if (causes.length === 0) {
    console.log(`\n  \x1b[32mNo obvious root causes found.\x1b[0m`)
  } else {
    for (const cause of causes) {
      const color = cause.severity === 'HIGH' ? '\x1b[31m' : cause.severity === 'MEDIUM' ? '\x1b[33m' : '\x1b[90m'
      console.log(`\n  ${color}[${cause.severity}]\x1b[0m ${cause.name}`)
      console.log(`    ${cause.detail}`)
    }
  }

  // ── Step 8: Summary ───────────────────────────────────────────────────────

  console.log('\n\x1b[1m\nStep 8: Summary\x1b[0m')
  console.log(`  VRM bones resolved: ${restPoseQuats.size}`)
  console.log(`  Animation bones: ${animBones.size}`)
  console.log(`  Retargeted tracks: ${retargetedClip.tracks.length}`)
  console.log(`  Duration gap: ${durationGap.toFixed(4)}s`)
  console.log(`  Root causes found: ${causes.length}`)

  if (causes.some(c => c.severity === 'HIGH')) {
    console.log(`\n  \x1b[31m>>> HIGH severity causes detected — these are likely the source of the T-pose.\x1b[0m`)
  }

  console.log('\n=== Diagnosis Complete ===\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
