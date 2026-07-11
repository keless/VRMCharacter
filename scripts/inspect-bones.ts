/**
 * Minimal diagnostic: parses VRM (.glb) and FBX files in pure Node.js,
 * lists all bone/node names, and shows the comparison.
 *
 * Usage:
 *   npx tsx scripts/inspect-bones.ts <vrm-path> <fbx-path>
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)
if (args.length < 2) {
  console.error('Usage: npx tsx scripts/inspect-bones.ts <vrm-path> <fbx-path>')
  process.exit(1)
}

const vrmPath = resolve(args[0])
const fbxPath = resolve(args[1])

// ── Minimal glTF (.glb) parser ──────────────────────────────────────────────

function parseGLB(buffer: Buffer) {
  if (buffer.length < 12) throw new Error('Not a valid glTF file')
  // glTF 2.0 binary format uses little-endian
  const header = buffer.readUInt32LE(0)
  if (header !== 0x46546c67) throw new Error(`Not a glTF file (magic: 0x${header.toString(16)})`)
  const version = buffer.readUInt32LE(4)
  const totalLength = buffer.readUInt32LE(8)
  if (version !== 2) throw new Error(`glTF version ${version} (only 2.0 supported)`)

  let offset = 12
  let jsonChunk: any = null
  let binChunk: Buffer | null = null

  while (offset < totalLength) {
    const chunkLength = buffer.readUInt32LE(offset)
    const chunkType = buffer.readUInt32LE(offset + 4)
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength)

    if (chunkType === 0x4E4F534A) { // "JSON"
      jsonChunk = JSON.parse(chunkData.toString('utf8'))
    } else if (chunkType === 0x004E4942) { // "BIN"
      binChunk = chunkData
    }

    offset += 8 + chunkLength
  }

  if (!jsonChunk) throw new Error('No JSON chunk in glTF file')
  return { json: jsonChunk, bin: binChunk }
}

// ── Collect all node names from glTF scene ──────────────────────────────────

function collectNodeNames(json: any): string[] {
  const names: string[] = []

  function traverseNode(nodeIndex: number) {
    const node = json.nodes![nodeIndex]
    if (node.name) names.push(node.name)
    if (node.children) {
      for (const child of node.children) {
        traverseNode(child)
      }
    }
  }

  if (json.scene !== undefined && json.scenes !== undefined && json.nodes !== undefined) {
    const scene = json.scenes[json.scene]
    for (const nodeIndex of scene.nodes) {
      traverseNode(nodeIndex)
    }
  }

  return names
}

// ── VRM humanoid bone resolution ────────────────────────────────────────────

function resolveVRMBones(json: any): { bone: string; nodeName: string }[] {
  const results: { bone: string; nodeName: string }[] = []

  // VRM humanoid bones are stored in the VRM extension
  const extensions = json.extensions || {}
  const vrmExt = extensions['XR_KHR_vrm_extensions_1_0'] || extensions['VRM]']

  // Different VRM versions use different extension names
  // VRM 1.0: XR_KHR_vrm_extensions_1_0
  // VRM 0.x: VRM (or VRM0)
  const vrm = vrmExt || extensions['VRM'] || extensions['VRM0']

  if (vrm && vrm.humanoid) {
    const humanoid = vrm.humanoid
    const boneNames = [
      'hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'jaw',
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

    for (const boneName of boneNames) {
      const boneKey = `-${boneName}` // VRM 1.0 uses "-boneName" keys
      const boneData = humanoid.standardBones?.[boneKey] || humanoid.standardBones?.[boneName]

      if (boneData && boneData.node !== undefined) {
        const nodeName = json.nodes?.[boneData.node]?.name || '(unnamed)'
        results.push({ bone: boneName, nodeName })
      } else {
        results.push({ bone: boneName, nodeName: 'NOT FOUND' })
      }
    }
  }

  return results
}

// ── FBX animation bone extraction ───────────────────────────────────────────

function extractFBXBones(fbxPath: string): { clipName: string; bones: string[]; tracks: string[] }[] {
  const buffer = readFileSync(fbxPath)
  const text = buffer.toString('utf8')

  // FBX is a binary or ASCII format. For Mixamo FBX files, they're usually binary.
  // We'll use the Three.js FBXLoader's parse method which works with base64 strings.
  // But since that requires Three.js browser APIs, let's try a simpler approach:
  // Parse the FBX ASCII/text representation to find animation clip names and tracks.

  // For binary FBX, this is complex. Let's use a heuristic:
  // Look for "AnimationStack" and "AnimationLayer" and "Curve" definitions.
  // This is a simplified parser that works for many FBX files.

  // Actually, the simplest approach for Mixamo FBX files:
  // They always have one animation clip named "mixamo.com" or similar.
  // The tracks use "mixamorig*" bone names.

  // Let's try to extract what we can from the raw text:
  const results: { clipName: string; bones: string[]; tracks: string[] }[] = []

  // Check if this is ASCII FBX
  if (text.includes('FBXBinary') || text.includes('\\x')) {
    // Binary FBX - we need to parse it properly
    // For Mixamo FBX files, the animation data is in the binary format
    // Let's use a regex-based approach on the raw buffer

    // Binary FBX structure: we need to find CurveNodeName strings
    // This is complex, so let's use a workaround:
    // Mixamo FBX files always use mixamorig* bone names
    // We'll extract them by looking for the animation curve data

    // For now, return placeholder - we'll use the Three.js approach in the browser
    return [{ clipName: '(binary FBX - see browser console)', bones: [], tracks: [] }]
  } else {
    // ASCII FBX - parse it
    const lines = text.split('\n')
    let currentClip = ''
    const clips = new Map<string, Set<string>>()
    const allTracks: string[] = []

    for (const line of lines) {
      // Look for animation stack names
      if (line.includes('AnimationStack')) {
        const match = line.match(/:"([^"]+)"/)
        if (match) currentClip = match[1]
      }

      // Look for curve node names (bone names)
      const curveMatch = line.match(/CurveNodeName:"([^"]+)"/)
      if (curveMatch) {
        const boneName = curveMatch[1].split('.')[0]
        if (!clips.has(currentClip)) clips.set(currentClip, new Set())
        clips.get(currentClip)!.add(boneName)
        allTracks.push(curveMatch[1])
      }
    }

    for (const [clipName, bones] of clips) {
      results.push({
        clipName,
        bones: [...bones].sort(),
        tracks: allTracks.slice(0, 20),
      })
    }
  }

  return results
}

// ── Main ────────────────────────────────────────────────────────────────────

function main() {
  // ── VRM Model ─────────────────────────────────────────────────────────────
  console.log('=== VRM Model Node Names ===')
  console.log(`Loading VRM: ${vrmPath}\n`)

  const vrmBuffer = readFileSync(vrmPath)
  const { json } = parseGLB(vrmBuffer)

  const vrmNodeNames = collectNodeNames(json)
  console.log(`Total nodes: ${vrmNodeNames.length}`)
  console.log()

  // Categorize
  const boneLikeNodes: string[] = []
  const meshNodes: string[] = []
  const otherNodes: string[] = []

  for (const name of vrmNodeNames) {
    const lower = name.toLowerCase()
    if (
      lower.match(/^(hips|spine|chest|neck|head|jaw|eye|hand|foot|toe|shoulder|arm|leg|thumb|finger|metacarpal|proximal|intermediate|distal)/) ||
      lower.includes('bip') ||
      lower.includes('j_bone') ||
      lower.includes('j_skel') ||
      lower.includes('j_')
    ) {
      boneLikeNodes.push(name)
    } else if (lower.includes('mesh') || lower.includes('body') || lower.includes('hair') || lower.includes('cloth')) {
      meshNodes.push(name)
    } else {
      otherNodes.push(name)
    }
  }

  console.log(`--- Bone-like nodes (${boneLikeNodes.length}) ---`)
  boneLikeNodes.sort().forEach((n) => console.log(`  ${n}`))
  console.log()

  console.log(`--- Mesh/geometry nodes (${meshNodes.length}) (first 20) ---`)
  meshNodes.sort().slice(0, 20).forEach((n) => console.log(`  ${n}`))
  console.log()

  if (otherNodes.length > 0) {
    console.log(`--- Other nodes (${otherNodes.length}) (first 20) ---`)
    otherNodes.sort().slice(0, 20).forEach((n) => console.log(`  ${n}`))
    console.log()
  }

  console.log(`--- ALL node names (${vrmNodeNames.length}) sorted ---`)
  vrmNodeNames.sort().forEach((n) => console.log(`  ${n}`))
  console.log()

  // VRM humanoid bone resolution
  console.log('=== VRM Humanoid Bone Resolution ===')
  const vrmBones = resolveVRMBones(json)
  for (const { bone, nodeName } of vrmBones) {
    console.log(`  ${bone.padEnd(25)} → "${nodeName}"`)
  }
  console.log()

  // ── FBX Animation ─────────────────────────────────────────────────────────
  console.log('=== FBX Animation Clip Tracks ===')
  console.log(`Loading FBX: ${fbxPath}\n`)

  // Check if FBX is binary
  const fbxHeader = readFileSync(fbxPath, { encoding: 'utf8', start: 0, end: 200 })
  const isBinaryFBX = fbxHeader.includes('FBXBinary') || fbxHeader.startsWith('\xca\xfe')

  if (isBinaryFBX) {
    console.log('FBX is binary format. Using Three.js FBXLoader parse with base64...')
    // For binary FBX, we need to parse the animation data
    // Mixamo FBX files have a known structure:
    // - One animation stack named "mixamo.com" or similar
    // - Tracks use "mixamorig*" bone names

    // Let's extract bone names from the binary FBX using a regex on the raw buffer
    // Binary FBX stores strings as: length (4 bytes) + string + null terminator
    // We'll look for "mixamorig" patterns

    const fbxBuffer = readFileSync(fbxPath)
    const fbxText = fbxBuffer.toString('utf8', 0, Math.min(fbxBuffer.length, 50000))

    // Try to find bone names by looking for common patterns in the binary data
    // Mixamo FBX files store curve node names in the format: "mixamorigBoneName.Transform"
    // We can search for these patterns

    const boneNames = new Set<string>()
    const trackNames: string[] = []

    // Search for mixamorig bone names
    const mixamoPattern = /mixamorig[A-Z][a-zA-Z]*/g
    let match
    while ((match = mixamoPattern.exec(fbxText)) !== null) {
      boneNames.add(match[0])
    }

    // Search for J_Bip_ bone names (non-Mixamo FBX)
    const bipedPattern = /J_Bip_[A-Za-z0-9_]*/g
    while ((match = bipedPattern.exec(fbxText)) !== null) {
      boneNames.add(match[0])
    }

    // Search for generic bone patterns (e.g., "CurveNodeName" in ASCII FBX)
    const curvePattern = /CurveNodeName:"([^"]+)"/g
    while ((match = curvePattern.exec(fbxText)) !== null) {
      trackNames.push(match[1])
      const bone = match[1].split('.')[0]
      if (!boneNames.has(bone)) boneNames.add(bone)
    }

    console.log(`Bone names (${boneNames.size}):`)
    const sortedBones = [...boneNames].sort()
    sortedBones.forEach((n) => console.log(`  ${n}`))
    console.log()

    if (trackNames.length > 0) {
      console.log(`Sample tracks (${trackNames.length}):`)
      trackNames.slice(0, 10).forEach((t) => console.log(`  ${t}`))
      console.log()
    }

    // Categorize
    const mixamoBones = sortedBones.filter((b) => b.toLowerCase().startsWith('mixamorig'))
    const bipedBones = sortedBones.filter((b) => b.toLowerCase().includes('bip') || b.toLowerCase().includes('j_'))
    const unknownBones = sortedBones.filter((b) => !b.toLowerCase().startsWith('mixamorig') && !b.toLowerCase().includes('bip') && !b.toLowerCase().includes('j_'))

    if (mixamoBones.length > 0) console.log(`Mixamo bones (${mixamoBones.length}): ${mixamoBones.join(', ')}`)
    if (bipedBones.length > 0) console.log(`Biped bones (${bipedBones.length}): ${bipedBones.join(', ')}`)
    if (unknownBones.length > 0) console.log(`Unknown bones (${unknownBones.length}): ${unknownBones.join(', ')}`)
    console.log()
  } else {
    // ASCII FBX
    const fbxResults = extractFBXBones(fbxPath)
    for (const { clipName, bones, tracks } of fbxResults) {
      console.log(`--- Clip: "${clipName}" (${bones.length} bones) ---`)
      bones.forEach((n) => console.log(`  ${n}`))
      console.log()
    }
  }

  // ── Comparison ────────────────────────────────────────────────────────────
  console.log('=== COMPARISON ===')

  // VRM bone-like names (lowercase → original)
  const vrmBoneLower = new Map<string, string>()
  for (const name of boneLikeNodes) {
    vrmBoneLower.set(name.toLowerCase(), name)
  }

  // FBX bone names (from the parsed data)
  const fbxBuffer = readFileSync(fbxPath)
  const fbxText = fbxBuffer.toString('utf8', 0, Math.min(fbxBuffer.length, 50000))

  const fbxBoneLower = new Set<string>()
  const mixamoPattern = /mixamorig([A-Z][a-zA-Z]*)/g
  let m
  while ((m = mixamoPattern.exec(fbxText)) !== null) {
    fbxBoneLower.add(`mixamorig${m[1]}`.toLowerCase())
  }
  const bipedPattern = /J_Bip_([A-Za-z0-9_]*)/g
  while ((m = bipedPattern.exec(fbxText)) !== null) {
    fbxBoneLower.add(`J_Bip_${m[1]}`.toLowerCase())
  }

  // Exact matches
  const matches: { vrm: string; fbx: string }[] = []
  const fbxOnly: string[] = []
  const vrmOnly: string[] = []

  for (const fbx of fbxBoneLower) {
    if (vrmBoneLower.has(fbx)) {
      matches.push({ vrm: vrmBoneLower.get(fbx)!, fbx })
    } else {
      fbxOnly.push(fbx)
    }
  }
  for (const vrm of vrmBoneLower.keys()) {
    if (!fbxBoneLower.has(vrm)) vrmOnly.push(vrm)
  }

  console.log(`Exact matches (${matches.length}):`)
  matches.forEach(({ vrm, fbx }) => console.log(`  "${vrm}" <-> "${fbx}"`))
  console.log()

  console.log(`FBX-only bones (${fbxOnly.length}):`)
  fbxOnly.sort().forEach((n) => console.log(`  ${n}`))
  console.log()

  console.log(`VRM-only bones (${vrmOnly.length}):`)
  vrmOnly.sort().forEach((n) => console.log(`  ${n}`))
  console.log()

  // Suffix matching
  console.log('=== SUFFIX MATCHING (FBX bone ends with _<vrm-bone>) ===')
  const suffixMatches: { vrm: string; fbx: string }[] = []
  for (const fbx of fbxBoneLower) {
    const lastUnderscore = fbx.lastIndexOf('_')
    if (lastUnderscore >= 0) {
      const suffix = fbx.slice(lastUnderscore + 1)
      if (vrmBoneLower.has(suffix)) {
        suffixMatches.push({ vrm: vrmBoneLower.get(suffix)!, fbx })
      }
    }
  }
  console.log(`Suffix matches (${suffixMatches.length}):`)
  suffixMatches.forEach(({ vrm, fbx }) => console.log(`  "${fbx}" → "${vrm}"`))
  console.log()

  // Substring matching
  console.log('=== SUBSTRING MATCHING (FBX bone contains vrm-bone) ===')
  const subMatches: { vrm: string; fbx: string }[] = []
  for (const fbx of fbxBoneLower) {
    for (const vrm of vrmBoneLower.keys()) {
      if (fbx.includes(vrm)) {
        subMatches.push({ vrm, fbx })
        break
      }
    }
  }
  console.log(`Substring matches (${subMatches.length}):`)
  subMatches.forEach(({ vrm, fbx }) => console.log(`  "${fbx}" contains "${vrm}"`))
  console.log()

  // ── Remapping suggestion ──────────────────────────────────────────────────
  console.log('=== REMAPPING SUGGESTION ===')
  console.log('The FBX animation uses Mixamo bones (mixamorig* prefix).')
  console.log('The VRM model uses standard VRM humanoid bone names.')
  console.log()
  console.log('The remapping should convert:')
  console.log('  mixamorigHips → hips (or whatever the VRM node is named)')
  console.log('  mixamorigSpine → spine (or whatever the VRM node is named)')
  console.log('  etc.')
  console.log()
  console.log('Check the "VRM Humanoid Bone Resolution" section above for the')
  console.log('actual VRM node names to use in the remapping table.')
  console.log()
  console.log('=== DONE ===')
}

main()
