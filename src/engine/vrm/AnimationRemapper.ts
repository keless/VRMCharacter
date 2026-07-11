import * as THREE from 'three'
import { logger } from '../../lib/logger'

const remapLog = logger('AnimationRemapper')

// ---------------------------------------------------------------------------
// Bone name mappings
// ---------------------------------------------------------------------------

/**
 * Mixamo → VRM humanoid bone name mapping.
 * Mixamo FBX files use `mixamorig:` prefixed names (colon-separated).
 * VRM 1.0 uses lowercase humanoid bone names.
 */
export const MIXAMO_TO_VRM: Record<string, string> = {
  // Root / torso
  'mixamorig:Hips': 'hips',
  'mixamorig:Spine': 'spine',
  'mixamorig:Spine1': 'chest',
  'mixamorig:Spine2': 'upperChest',

  // Neck / head
  'mixamorig:Neck': 'neck',
  'mixamorig:Head': 'head',
  'mixamorig:LeftEye': 'leftEye',
  'mixamorig:RightEye': 'rightEye',
  'mixamorig:Jaw': 'jaw',

  // Arms
  'mixamorig:LeftShoulder': 'leftShoulder',
  'mixamorig:LeftArm': 'leftUpperArm',
  'mixamorig:LeftForeArm': 'leftLowerArm',
  'mixamorig:LeftHand': 'leftHand',
  'mixamorig:LeftHandThumb1': 'leftThumbMetacarpal',
  'mixamorig:LeftHandThumb2': 'leftThumbProximal',
  'mixamorig:LeftHandThumb3': 'leftThumbDistal',
  'mixamorig:LeftHandThumb4': 'leftThumbDistal',
  'mixamorig:LeftHandIndex1': 'leftIndexProximal',
  'mixamorig:LeftHandIndex2': 'leftIndexIntermediate',
  'mixamorig:LeftHandIndex3': 'leftIndexDistal',
  'mixamorig:LeftHandIndex4': 'leftIndexDistal',
  'mixamorig:LeftHandMiddle1': 'leftMiddleProximal',
  'mixamorig:LeftHandMiddle2': 'leftMiddleIntermediate',
  'mixamorig:LeftHandMiddle3': 'leftMiddleDistal',
  'mixamorig:LeftHandMiddle4': 'leftMiddleDistal',
  'mixamorig:LeftHandRing1': 'leftRingProximal',
  'mixamorig:LeftHandRing2': 'leftRingIntermediate',
  'mixamorig:LeftHandRing3': 'leftRingDistal',
  'mixamorig:LeftHandRing4': 'leftRingDistal',
  'mixamorig:LeftHandPinky1': 'leftLittleProximal',
  'mixamorig:LeftHandPinky2': 'leftLittleIntermediate',
  'mixamorig:LeftHandPinky3': 'leftLittleDistal',
  'mixamorig:LeftHandPinky4': 'leftLittleDistal',

  'mixamorig:RightShoulder': 'rightShoulder',
  'mixamorig:RightArm': 'rightUpperArm',
  'mixamorig:RightForeArm': 'rightLowerArm',
  'mixamorig:RightHand': 'rightHand',
  'mixamorig:RightHandThumb1': 'rightThumbMetacarpal',
  'mixamorig:RightHandThumb2': 'rightThumbProximal',
  'mixamorig:RightHandThumb3': 'rightThumbDistal',
  'mixamorig:RightHandThumb4': 'rightThumbDistal',
  'mixamorig:RightHandIndex1': 'rightIndexProximal',
  'mixamorig:RightHandIndex2': 'rightIndexIntermediate',
  'mixamorig:RightHandIndex3': 'rightIndexDistal',
  'mixamorig:RightHandIndex4': 'rightIndexDistal',
  'mixamorig:RightHandMiddle1': 'rightMiddleProximal',
  'mixamorig:RightHandMiddle2': 'rightMiddleIntermediate',
  'mixamorig:RightHandMiddle3': 'rightMiddleDistal',
  'mixamorig:RightHandMiddle4': 'rightMiddleDistal',
  'mixamorig:RightHandRing1': 'rightRingProximal',
  'mixamorig:RightHandRing2': 'rightRingIntermediate',
  'mixamorig:RightHandRing3': 'rightRingDistal',
  'mixamorig:RightHandRing4': 'rightRingDistal',
  'mixamorig:RightHandPinky1': 'rightLittleProximal',
  'mixamorig:RightHandPinky2': 'rightLittleIntermediate',
  'mixamorig:RightHandPinky3': 'rightLittleDistal',
  'mixamorig:RightHandPinky4': 'rightLittleDistal',

  // Legs
  'mixamorig:LeftUpLeg': 'leftUpperLeg',
  'mixamorig:LeftLeg': 'leftLowerLeg',
  'mixamorig:LeftFoot': 'leftFoot',
  'mixamorig:LeftToeBase': 'leftToes',
  'mixamorig:LeftToe_End': 'leftToes',
  'mixamorig:RightUpLeg': 'rightUpperLeg',
  'mixamorig:RightLeg': 'rightLowerLeg',
  'mixamorig:RightFoot': 'rightFoot',
  'mixamorig:RightToeBase': 'rightToes',
  'mixamorig:RightToe_End': 'rightToes',
}

/**
 * Mixamo → Biped (J_Bip_*) bone name mapping.
 * Some VRM models use `J_Bip_*` naming instead of standard VRM names.
 */
export const MIXAMO_TO_BIPED: Record<string, string> = {
  // Root / torso
  'mixamorig:Hips': 'J_Bip_C_Hips',
  'mixamorig:Spine': 'J_Bip_C_Spine',
  'mixamorig:Spine1': 'J_Bip_C_Chest',
  'mixamorig:Spine2': 'J_Bip_C_UpperChest',

  // Neck / head
  'mixamorig:Neck': 'J_Bip_C_Neck',
  'mixamorig:Head': 'J_Bip_C_Head',
  'mixamorig:Jaw': 'J_Bip_C_Jaw',

  // Arms
  'mixamorig:LeftShoulder': 'J_Bip_L_Shoulder',
  'mixamorig:LeftArm': 'J_Bip_L_UpperArm',
  'mixamorig:LeftForeArm': 'J_Bip_L_LowerArm',
  'mixamorig:LeftHand': 'J_Bip_L_Hand',
  'mixamorig:LeftHandThumb1': 'J_Bip_L_Thumb1',
  'mixamorig:LeftHandThumb2': 'J_Bip_L_Thumb2',
  'mixamorig:LeftHandThumb3': 'J_Bip_L_Thumb3',
  'mixamorig:LeftHandIndex1': 'J_Bip_L_Index1',
  'mixamorig:LeftHandIndex2': 'J_Bip_L_Index2',
  'mixamorig:LeftHandIndex3': 'J_Bip_L_Index3',
  'mixamorig:LeftHandMiddle1': 'J_Bip_L_Middle1',
  'mixamorig:LeftHandMiddle2': 'J_Bip_L_Middle2',
  'mixamorig:LeftHandMiddle3': 'J_Bip_L_Middle3',
  'mixamorig:LeftHandRing1': 'J_Bip_L_Ring1',
  'mixamorig:LeftHandRing2': 'J_Bip_L_Ring2',
  'mixamorig:LeftHandRing3': 'J_Bip_L_Ring3',
  'mixamorig:LeftHandPinky1': 'J_Bip_L_Little1',
  'mixamorig:LeftHandPinky2': 'J_Bip_L_Little2',
  'mixamorig:LeftHandPinky3': 'J_Bip_L_Little3',
  'mixamorig:LeftHandPinky4': 'J_Bip_L_Little3',
  'mixamorig:LeftHandThumb4': 'J_Bip_L_Thumb3',
  'mixamorig:LeftHandIndex4': 'J_Bip_L_Index3',
  'mixamorig:LeftHandMiddle4': 'J_Bip_L_Middle3',
  'mixamorig:LeftHandRing4': 'J_Bip_L_Ring3',

  'mixamorig:RightShoulder': 'J_Bip_R_Shoulder',
  'mixamorig:RightArm': 'J_Bip_R_UpperArm',
  'mixamorig:RightForeArm': 'J_Bip_R_LowerArm',
  'mixamorig:RightHand': 'J_Bip_R_Hand',
  'mixamorig:RightHandThumb1': 'J_Bip_R_Thumb1',
  'mixamorig:RightHandThumb2': 'J_Bip_R_Thumb2',
  'mixamorig:RightHandThumb3': 'J_Bip_R_Thumb3',
  'mixamorig:RightHandIndex1': 'J_Bip_R_Index1',
  'mixamorig:RightHandIndex2': 'J_Bip_R_Index2',
  'mixamorig:RightHandIndex3': 'J_Bip_R_Index3',
  'mixamorig:RightHandMiddle1': 'J_Bip_R_Middle1',
  'mixamorig:RightHandMiddle2': 'J_Bip_R_Middle2',
  'mixamorig:RightHandMiddle3': 'J_Bip_R_Middle3',
  'mixamorig:RightHandRing1': 'J_Bip_R_Ring1',
  'mixamorig:RightHandRing2': 'J_Bip_R_Ring2',
  'mixamorig:RightHandRing3': 'J_Bip_R_Ring3',
  'mixamorig:RightHandPinky1': 'J_Bip_R_Little1',
  'mixamorig:RightHandPinky2': 'J_Bip_R_Little2',
  'mixamorig:RightHandPinky3': 'J_Bip_R_Little3',
  'mixamorig:RightHandPinky4': 'J_Bip_R_Little3',
  'mixamorig:RightHandThumb4': 'J_Bip_R_Thumb3',
  'mixamorig:RightHandIndex4': 'J_Bip_R_Index3',
  'mixamorig:RightHandMiddle4': 'J_Bip_R_Middle3',
  'mixamorig:RightHandRing4': 'J_Bip_R_Ring3',

  // Legs
  'mixamorig:LeftUpLeg': 'J_Bip_L_UpperLeg',
  'mixamorig:LeftLeg': 'J_Bip_L_LowerLeg',
  'mixamorig:LeftFoot': 'J_Bip_L_Foot',
  'mixamorig:LeftToeBase': 'J_Bip_L_ToeBase',
  'mixamorig:LeftToe_End': 'J_Bip_L_ToeBase',
  'mixamorig:RightUpLeg': 'J_Bip_R_UpperLeg',
  'mixamorig:RightLeg': 'J_Bip_R_LowerLeg',
  'mixamorig:RightFoot': 'J_Bip_R_Foot',
  'mixamorig:RightToeBase': 'J_Bip_R_ToeBase',
  'mixamorig:RightToe_End': 'J_Bip_R_ToeBase',
}

/**
 * Generic biped → VRM humanoid bone name mapping.
 * Some FBX files use `J_Bip_*` naming instead of `mixamorig*`.
 */
export const BIPED_TO_VRM: Record<string, string> = {
  // Root / torso
  J_Bip_C_Hips: 'hips',
  J_Bip_C_Spine: 'spine',
  J_Bip_C_Chest: 'chest',
  J_Bip_C_UpperChest: 'upperChest',

  // Neck / head
  J_Bip_C_Neck: 'neck',
  J_Bip_C_Head: 'head',

  // Right arm
  J_Bip_R_Shoulder: 'rightShoulder',
  J_Bip_R_UpperArm: 'rightUpperArm',
  J_Bip_R_LowerArm: 'rightLowerArm',
  J_Bip_R_Hand: 'rightHand',
  J_Bip_R_Thumb1: 'rightThumbMetacarpal',
  J_Bip_R_Thumb2: 'rightThumbProximal',
  J_Bip_R_Thumb3: 'rightThumbDistal',
  J_Bip_R_Index1: 'rightIndexProximal',
  J_Bip_R_Index2: 'rightIndexIntermediate',
  J_Bip_R_Index3: 'rightIndexDistal',
  J_Bip_R_Middle1: 'rightMiddleProximal',
  J_Bip_R_Middle2: 'rightMiddleIntermediate',
  J_Bip_R_Middle3: 'rightMiddleDistal',
  J_Bip_R_Ring1: 'rightRingProximal',
  J_Bip_R_Ring2: 'rightRingIntermediate',
  J_Bip_R_Ring3: 'rightRingDistal',
  J_Bip_R_Little1: 'rightLittleProximal',
  J_Bip_R_Little2: 'rightLittleIntermediate',
  J_Bip_R_Little3: 'rightLittleDistal',

  // Left arm
  J_Bip_L_Shoulder: 'leftShoulder',
  J_Bip_L_UpperArm: 'leftUpperArm',
  J_Bip_L_LowerArm: 'leftLowerArm',
  J_Bip_L_Hand: 'leftHand',
  J_Bip_L_Thumb1: 'leftThumbMetacarpal',
  J_Bip_L_Thumb2: 'leftThumbProximal',
  J_Bip_L_Thumb3: 'leftThumbDistal',
  J_Bip_L_Index1: 'leftIndexProximal',
  J_Bip_L_Index2: 'leftIndexIntermediate',
  J_Bip_L_Index3: 'leftIndexDistal',
  J_Bip_L_Middle1: 'leftMiddleProximal',
  J_Bip_L_Middle2: 'leftMiddleIntermediate',
  J_Bip_L_Middle3: 'leftMiddleDistal',
  J_Bip_L_Ring1: 'leftRingProximal',
  J_Bip_L_Ring2: 'leftRingIntermediate',
  J_Bip_L_Ring3: 'leftRingDistal',
  J_Bip_L_Little1: 'leftLittleProximal',
  J_Bip_L_Little2: 'leftLittleIntermediate',
  J_Bip_L_Little3: 'leftLittleDistal',

  // Legs
  J_Bip_R_UpperLeg: 'rightUpperLeg',
  J_Bip_R_LowerLeg: 'rightLowerLeg',
  J_Bip_R_Foot: 'rightFoot',
  J_Bip_R_ToeBase: 'rightToes',
  J_Bip_L_UpperLeg: 'leftUpperLeg',
  J_Bip_L_LowerLeg: 'leftLowerLeg',
  J_Bip_L_Foot: 'leftFoot',
  J_Bip_L_ToeBase: 'leftToes',
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retarget a Mixamo FBX animation clip for a VRM model.
 *
 * This implements the same retargeting logic as the three-vrm reference
 * `loadMixamoAnimation.js`:
 *
 * 1. **Bone name mapping** — `mixamorig*` → VRM humanoid bone names
 * 2. **Rotation rebaking** — re-bake each quaternion relative to the
 *    parent's rest-world rotation × the bone's rest-inverse rotation.
 *    This converts rotations from Mixamo's rest-pose space to VRM's.
 * 3. **Position scaling** — scale position tracks by the ratio of the
 *    VRM hips height to the Mixamo hips height in rest pose.
 * 4. **Coordinate flip** — for VRM 0.x models (metaVersion === '0'),
 *    negate axes to account for the left-handed coordinate system.
 *
 * @param clip — The original THREE.AnimationClip from the FBX loader
 * @param mixamoAsset — The THREE.Group returned by FBXLoader (provides
 *   rest-pose bone nodes for rotation rebaking and hips height)
 * @param vrmHumanoid — The VRM humanoid for bone node resolution
 * @param vrmMetaVersion — '0' for VRM 0.x (needs coordinate flip) or '1'
 * @returns A new THREE.AnimationClip retargeted for the VRM model, or
 *   null if no bones could be mapped
 */
export function retargetMixamoClip(
  clip: THREE.AnimationClip,
  mixamoAsset: THREE.Group,
  vrmHumanoid: { getRawBoneNode: (name: string) => THREE.Object3D | null },
  vrmMetaVersion: string | null,
): THREE.AnimationClip | null {
  const tracks: THREE.KeyframeTrack[] = []

  // Reusable math objects (avoid allocations in the hot loop)
  const restRotationInverse = new THREE.Quaternion()
  const parentRestWorldRotation = new THREE.Quaternion()
  const quatA = new THREE.Quaternion()
  const quatB = new THREE.Quaternion()
  const quatResult = new THREE.Quaternion()

  // Get the Mixamo hips node for position scale calculation
  const mixamoHips =
    mixamoAsset.getObjectByName('mixamorigHips') ??
    mixamoAsset.getObjectByName('mixamorig:Hips')
  if (!mixamoHips) {
    remapLog.warn('Could not find hips bone in Mixamo asset')
    return null
  }

  const motionHipsHeight = mixamoHips.position.y
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vrmHipsPose = (vrmHumanoid as any).normalizedRestPose?.hips
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vrmHipsHeight: number = (vrmHipsPose?.position?.[1] as number) ?? 1.0
  const hipsPositionScale = motionHipsHeight !== 0 ? vrmHipsHeight / motionHipsHeight : 1.0

  if (hipsPositionScale !== 1.0) {
    remapLog.log(`Hips position scale: ${vrmHipsHeight.toFixed(4)} / ${motionHipsHeight.toFixed(4)} = ${hipsPositionScale.toFixed(4)}`)
  }

  // Collect all bone names from the FBX asset for diagnostics
  const fbxBoneNames: string[] = []
  mixamoAsset.traverse((obj) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((obj as any).isBone || obj.name) fbxBoneNames.push(obj.name)
  })
  remapLog.log(`FBX bones (${fbxBoneNames.length}): ${fbxBoneNames.join(', ')}`)

  // Collect all VRM humanoid bone names that are resolvable
  const vrmBoneNames: string[] = []
  for (const vrmBone of Object.values(MIXAMO_TO_VRM) as [string]) {
    const node = vrmHumanoid.getRawBoneNode(vrmBone)
    if (node) vrmBoneNames.push(`${vrmBone}→${node.name}`)
  }
  remapLog.log(`VRM bones resolved (${vrmBoneNames.length}): ${vrmBoneNames.join(', ')}`)

  let mappedCount = 0
  let skippedCount = 0
  const skippedBones = new Set<string>()

  clip.tracks.forEach((track) => {
    const dotIndex = track.name.indexOf('.')
    if (dotIndex < 0) return

    const rawBone = track.name.substring(0, dotIndex)
    const property = track.name.substring(dotIndex + 1)

    // Find the Mixamo bone node in the FBX asset
    // Try multiple name forms
    const mixamoNode =
      mixamoAsset.getObjectByName(rawBone) ??
      mixamoAsset.getObjectByName(rawBone.replace(/([a-zA-Z])([A-Z])/g, '$1:$2'))
    if (!mixamoNode) {
      skippedCount++
      skippedBones.add(rawBone)
      return
    }

    // Resolve the bone name to a VRM humanoid bone name
    const vrmBoneName = resolveVrmBoneName(rawBone)
    if (!vrmBoneName) {
      skippedCount++
      skippedBones.add(rawBone)
      return
    }

    const vrmNode = vrmHumanoid.getRawBoneNode(vrmBoneName as any)
    if (!vrmNode) {
      skippedCount++
      skippedBones.add(rawBone)
      return
    }

    if (!vrmNode) {
      skippedCount++
      skippedBones.add(rawBone)
      return
    }

    // Get rest-pose rotations for rebaking
    mixamoNode.getWorldQuaternion(restRotationInverse).invert()
    if (mixamoNode.parent) {
      mixamoNode.parent.getWorldQuaternion(parentRestWorldRotation)
    } else {
      parentRestWorldRotation.set(0, 0, 0, 1)
    }

    if (property === 'quaternion' && track.values.length % 4 === 0) {
      const newValues = new Float64Array(track.values.length)

      for (let i = 0; i < track.values.length; i += 4) {
        quatA.set(
          track.values[i],
          track.values[i + 1],
          track.values[i + 2],
          track.values[i + 3],
        )

        quatResult.copy(quatA).multiply(restRotationInverse)
        quatB.copy(parentRestWorldRotation).multiply(quatResult)

        if (vrmMetaVersion === '0') {
          newValues[i] = -quatB.x
          newValues[i + 1] = quatB.y
          newValues[i + 2] = -quatB.z
          newValues[i + 3] = quatB.w
        } else {
          newValues[i] = quatB.x
          newValues[i + 1] = quatB.y
          newValues[i + 2] = quatB.z
          newValues[i + 3] = quatB.w
        }
      }

      const newTrack = new THREE.QuaternionKeyframeTrack(
        `${vrmNode.name}.${property}`,
        track.times,
        newValues,
      )
      tracks.push(newTrack)
      mappedCount++
    } else if (property === 'position' && track.values.length % 3 === 0) {
      const newValues = new Float64Array(track.values.length)
      for (let i = 0; i < track.values.length; i += 3) {
        newValues[i] = (vrmMetaVersion === '0' ? -track.values[i] : track.values[i]) * hipsPositionScale
        newValues[i + 1] = track.values[i + 1] * hipsPositionScale
        newValues[i + 2] = (vrmMetaVersion === '0' ? -track.values[i + 2] : track.values[i + 2]) * hipsPositionScale
      }

      const newTrack = new THREE.VectorKeyframeTrack(
        `${vrmNode.name}.${property}`,
        track.times,
        newValues,
      )
      tracks.push(newTrack)
      mappedCount++
    } else {
      skippedCount++
    }
  })

  if (skippedBones.size > 0) {
    remapLog.log(`Skipped bones: ${[...skippedBones].join(', ')}`)
  }

  if (mappedCount === 0) {
    remapLog.warn('retargetMixamoClip: no tracks mapped (skipped: %d)', skippedCount)
    return null
  }

  remapLog.log(
    `retargetMixamoClip: ${mappedCount}/${clip.tracks.length} tracks retargeted for "${clip.name}" (skipped: ${skippedCount})`,
  )

  const sampleTracks = tracks.slice(0, 10).map((t) => t.name).join(', ')
  remapLog.log(`Sample retargeted tracks: ${sampleTracks}`)

  return new THREE.AnimationClip(clip.name, clip.duration, tracks)
}

/**
 * Resolve a track bone name to a VRM humanoid bone name.
 * Handles multiple naming conventions:
 * - mixamorig:Hips (colon-separated, original Mixamo)
 * - mixamorigHips (colon stripped by FBX loader)
 * - J_Bip_C_Hips (biped naming from other rigs)
 * - Hips (prefix stripped entirely)
 *
 * Returns the VRM bone name (e.g. "hips") or null if unrecognizable.
 */
function resolveVrmBoneName(rawBone: string): string | null {
  // 1. Try exact match in VRM mapping (mixamorig:Hips form)
  if (MIXAMO_TO_VRM[rawBone]) return MIXAMO_TO_VRM[rawBone]

  // 2. Try adding a colon only after "mixamorig" prefix
  //    FBXLoader strips the colon from "mixamorig:Hips" → "mixamorigHips"
  //    and from "mixamorig:RightShoulder" → "mixamorigRightShoulder"
  //    We must restore the single colon after the prefix, NOT between
  //    every camelCase word (mixamorig:Right:Shoulder is WRONG)
  if (rawBone.startsWith('mixamorig')) {
    const rest = rawBone.substring(9) // everything after "mixamorig"
    if (rest) {
      const withColon = `mixamorig:${rest}`
      if (MIXAMO_TO_VRM[withColon]) return MIXAMO_TO_VRM[withColon]
    }
  }

  // 3. Try camelCase → colon conversion for non-mixamorig names
  //    e.g. "RightShoulder" → "Right:Shoulder" (fallback for other prefixes)
  const withColon = rawBone.replace(/([a-zA-Z])([A-Z])/g, '$1:$2')
  if (MIXAMO_TO_VRM[withColon]) return MIXAMO_TO_VRM[withColon]

  // 4. Try exact match in BIPED_TO_VRM (J_Bip_C_Hips → hips)
  if (BIPED_TO_VRM[rawBone]) return BIPED_TO_VRM[rawBone]

  // 5. Strip "mixamorig" prefix entirely (FBXLoader may remove it)
  //    e.g. "RightShoulder" → look up in MIXAMO_TO_VRM
  if (rawBone.startsWith('mixamorig')) {
    const stripped = rawBone.substring(9)
    if (stripped && MIXAMO_TO_VRM[stripped]) return MIXAMO_TO_VRM[stripped]
  }

  // 6. Try stripping common prefixes and matching against both maps
  //    Some FBX files use bare bone names like "Hips", "LeftHand", etc.
  const stripped = rawBone.replace(/^(mixamorig|J_Bip_|J_bip_)/, '')
  if (stripped !== rawBone) {
    if (MIXAMO_TO_VRM[stripped]) return MIXAMO_TO_VRM[stripped]
    if (BIPED_TO_VRM[stripped]) return BIPED_TO_VRM[stripped]
  }

  return null
}

/**
 * Simple bone name remapping without rotation rebaking or position scaling.
 * Useful as a fallback when the Mixamo asset or VRM humanoid isn't available.
 *
 * @param clip — The animation clip with Mixamo bone names
 * @param mapping — Bone name mapping to use (MIXAMO_TO_VRM or MIXAMO_TO_BIPED)
 * @returns A new clip with remapped bone names, or the original if nothing mapped
 */
export function remapClipNames(
  clip: THREE.AnimationClip,
  mapping: Record<string, string>,
): THREE.AnimationClip {
  const newTracks: THREE.KeyframeTrack[] = []
  let changed = false

  for (const track of clip.tracks) {
    const dotIndex = track.name.indexOf('.')
    if (dotIndex < 0) {
      newTracks.push(track)
      continue
    }

    const rawBone = track.name.substring(0, dotIndex)
    const property = track.name.substring(dotIndex + 1)

    // Try exact match
    let targetBone = mapping[rawBone]
    // Try with colon
    if (!targetBone) {
      const withColon = rawBone.replace(/([a-zA-Z])([A-Z])/g, '$1:$2')
      targetBone = mapping[withColon]
    }
    // Try stripped (remove colon)
    if (!targetBone) {
      const stripped = rawBone.replace(':', '')
      targetBone = mapping[stripped]
    }

    if (targetBone) {
      newTracks.push(
        new THREE.KeyframeTrack(
          `${targetBone}.${property}`,
          track.times,
          track.values,
          track.getInterpolation() as THREE.InterpolationModes,
        ),
      )
      changed = true
    } else {
      newTracks.push(track)
    }
  }

  if (!changed) return clip
  return new THREE.AnimationClip(clip.name, clip.duration, newTracks)
}
