/**
 * Animation Retargeting Test Runner
 *
 * Loads each animation file, runs the full retargeting pipeline against
 * the VRM model, and reports per-animation results.
 *
 * Usage:
 *   npx tsx scripts/test-animations.ts [vrm-path]
 *
 * If no VRM path is given, uses the one from localStorage or the default.
 */

import { readFileSync, statSync } from 'fs'
import { resolve } from 'path'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'

// ── Imports from the project ────────────────────────────────────────────────

import { retargetMixamoClip, MIXAMO_TO_VRM } from '../src/engine/vrm/AnimationRemapper'

// ── Types ───────────────────────────────────────────────────────────────────

interface AnimationEntry {
  id: string
  name: string
  path: string
  type: 'fbx' | 'vrma'
}

interface TestResult {
  id: string
  name: string
  path: string
  type: string
  status: 'pass' | 'fail' | 'skip'
  tracksTotal: number
  tracksRetargeted: number
  tracksSkipped: number
  bonesFound: number
  bonesMapped: number
  errors: string[]
  warnings: string[]
  duration?: number
  // Extra tracking fields
  uniqueFbxBones?: Set<string>
  vrmaFileExists?: boolean
  vrmaValidGlTF?: boolean
}

// ── Config ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = resolve(__dirname, '..')
const PUBLIC_DIR = resolve(PROJECT_ROOT, 'public')
const INDEX_PATH = resolve(PUBLIC_DIR, 'animations', 'index.json')

// Default VRM path — override with CLI arg
const DEFAULT_VRM = '/home/keless/Downloads/VRM-GLB-GLTF/AvatarSample_E.vrm'

// ── Helpers ─────────────────────────────────────────────────────────────────

function log(section: string, msg: string): void {
  console.log(`\x1b[1m${section}\x1b[22m ${msg}`)
}

function pass(): void {
  console.log('\x1b[32mPASS\x1b[0m')
}

function fail(): void {
  console.log('\x1b[31mFAIL\x1b[0m')
}

function warn(msg: string): void {
  console.log(`\x1b[33mWARN\x1b[0m ${msg}`)
}

function info(msg: string): void {
  console.log(`\x1b[90mINFO\x1b[0m ${msg}`)
}

// ── Minimal glTF parser (reads JSON + BIN chunks) ──────────────────────────

function parseGLTBBinary(buffer: Buffer): { json: any; bin: Buffer | null } {
  if (buffer.length < 12) throw new Error('Buffer too small for glTF')
  const magic = buffer.readUInt32LE(0)
  if (magic !== 0x46546c67) throw new Error(`Not a glTF file (magic: 0x${magic.toString(16)})`)

  const version = buffer.readUInt32LE(4)
  if (version !== 2) throw new Error(`glTF version ${version} not supported`)

  const totalLength = buffer.readUInt32LE(8)
  let offset = 12
  let jsonChunk: any = null
  let binChunk: Buffer | null = null

  while (offset < totalLength) {
    const chunkLength = buffer.readUInt32LE(offset)
    const chunkType = buffer.readUInt32LE(offset + 4)
    const chunkData = buffer.subarray(offset + 8, offset + 8 + chunkLength)

    // "JSON" = 0x4E4F534A, "BIN " = 0x004E4942
    if (chunkType === 0x4e4f534a) {
      jsonChunk = JSON.parse(chunkData.toString('utf8'))
    } else if (chunkType === 0x004e4942) {
      binChunk = chunkData
    }
    offset += 8 + chunkLength
  }

  if (!jsonChunk) throw new Error('No JSON chunk in glTF file')
  return { json: jsonChunk, bin: binChunk }
}

// ── Load VRM model via Three.js GLTFLoader.parse ────────────────────────────

function loadVrmModel(vrmPath: string): { json: any; nodeNames: string[] } {
  const buffer = readFileSync(vrmPath)
  const { json, bin } = parseGLTBBinary(buffer)

  // Use Three.js GLTFLoader.parse to validate and process the glTF
  const gltfLoader = new GLTFLoader()
  try {
    gltfLoader.parse(
      JSON.stringify(json),
      '',
      (gltf: any) => {
        // parse is sync-callback-based; we'll read json directly below
      },
      { bin },
    )
  } catch {
    // parse may throw on validation; we'll use json directly
  }

  // Collect all node names from the scene graph
  const nodeNames: string[] = []
  function traverseNode(idx: number): void {
    const node = json.nodes![idx]
    if (node.name) nodeNames.push(node.name)
    if (node.children) {
      for (const child of node.children) traverseNode(child)
    }
  }
  if (json.scene != null && json.scenes != null && json.nodes != null) {
    const scene = json.scenes[json.scene]
    for (const idx of scene.nodes) traverseNode(idx)
  }

  return { json, nodeNames }
}

// ── Build a minimal VRM humanoid mock from the parsed VRM JSON ──────────────

interface VrmHumanoidMock {
  getRawBoneNode(vrmBoneName: string): { name: string; position: [number, number, number]; quaternion: [number, number, number, number] } | null
}

function buildVrmHumanoidMock(vrmJson: any, nodeNames: string[]): VrmHumanoidMock {
  // Build a map: nodeIndex → node name
  const nodeIndexToName = new Map<number, string>()
  function buildIndex(idx: number): void {
    const node = vrmJson.nodes![idx]
    nodeIndexToName.set(idx, node.name || `(node${idx})`)
    if (node.children) {
      for (const child of node.children) buildIndex(child)
    }
  }
  if (vrmJson.scene != null && vrmJson.scenes != null && vrmJson.nodes != null) {
    const scene = vrmJson.scenes[vrmJson.scene]
    for (const idx of scene.nodes) buildIndex(idx)
  }

  // Build bone name → node name mapping from VRM humanoid extension
  const vrmExt = vrmJson.extensions?.['XR_KHR_vrm_extensions_1_0']
    || vrmJson.extensions?.['VRM']

  const boneNameToNodeName = new Map<string, string>()

  if (vrmExt?.humanoid?.standardBones) {
    // VRM 1.0 format: object with keys like "-hips", "-leftUpperArm"
    for (const [key, value] of Object.entries(vrmExt.humanoid.standardBones)) {
      const boneData = value as { node?: number }
      if (boneData.node != null) {
        const nodeName = nodeIndexToName.get(boneData.node) || `(node${boneData.node})`
        const vrmBoneName = key.replace(/^-/, '')
        boneNameToNodeName.set(vrmBoneName, nodeName)
      }
    }
  } else if (vrmExt?.humanoid?.humanBones) {
    // VRM 0.x format: array of { bone, node }
    const bones = vrmExt.humanoid.humanBones as { bone: string; node: number }[]
    for (const { bone, node } of bones) {
      const nodeName = nodeIndexToName.get(node) || `(node${node})`
      boneNameToNodeName.set(bone, nodeName)
    }
  }

  console.log(`[Test] VRM bone mappings (${boneNameToNodeName.size}):`)
  for (const [vrmBone, nodeName] of boneNameToNodeName) {
    console.log(`  ${vrmBone.padEnd(25)} → "${nodeName}"`)
  }

  return {
    getRawBoneNode(vrmBoneName: string) {
      const nodeName = boneNameToNodeName.get(vrmBoneName)
      if (!nodeName) return null
      // Return a mock node with identity transform (rest pose)
      return {
        name: nodeName,
        position: [0, 0, 0] as [number, number, number],
        quaternion: [0, 0, 0, 1] as [number, number, number, number],
      }
    },
  }
}

/**
 * Compute VRM humanoid coverage: how many standard VRM bones
 * does this model actually have defined?
 */
function computeVrmBoneCoverage(vrmHumanoid: VrmHumanoidMock): { resolved: number; total: number; missing: string[] } {
  const standardBones = [
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
  const resolved: string[] = []
  const missing: string[] = []
  for (const bone of standardBones) {
    if (vrmHumanoid.getRawBoneNode(bone)) {
      resolved.push(bone)
    } else {
      missing.push(bone)
    }
  }
  return { resolved: resolved.length, total: standardBones.length, missing }
}

// ── Extract bone names from FBX file (static analysis) ──────────────────────

function extractFbxBones(fbxPath: string): { bones: Set<string>; clips: string[]; trackCount: number } {
  const buffer = readFileSync(fbxPath)
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 200000))

  const bones = new Set<string>()
  const clips = new Set<string>()
  let trackCount = 0

  // Extract bone names from CurveNodeName patterns
  // Format: "CurveNodeName: \"mixamorigHips.Transform\""
  const curvePattern = /CurveNodeName:\s*"([^"]+)"/g
  let match
  while ((match = curvePattern.exec(text)) !== null) {
    const trackName = match[1]
    trackCount++
    const dotIdx = trackName.indexOf('.')
    if (dotIdx > 0) {
      const boneName = trackName.substring(0, dotIdx)
      bones.add(boneName)
    }
  }

  // Also try to find animation stack names
  const stackPattern = /AnimationStack:\s*"\d+"\s*{\s*Name:\s*"([^"]+)"/g
  while ((match = stackPattern.exec(text)) !== null) {
    clips.add(match[1])
  }

  // If no stack names found, use a default
  if (clips.size === 0) clips.add('default')

  return { bones, clips: [...clips], trackCount }
}

// ── Map FBX bone names to VRM bone names ────────────────────────────────────

function resolveVrmBoneName(rawBone: string): string | null {
  // 1. Try exact match
  if (MIXAMO_TO_VRM[rawBone]) return MIXAMO_TO_VRM[rawBone]

  // 2. Try adding colon after mixamorig prefix
  if (rawBone.startsWith('mixamorig')) {
    const rest = rawBone.substring(9)
    if (rest && MIXAMO_TO_VRM[`mixamorig:${rest}`]) {
      return MIXAMO_TO_VRM[`mixamorig:${rest}`]
    }
  }

  // 3. Try camelCase → colon conversion
  const withColon = rawBone.replace(/([a-zA-Z])([A-Z])/g, '$1:$2')
  if (MIXAMO_TO_VRM[withColon]) return MIXAMO_TO_VRM[withColon]

  // 4. Try stripping mixamorig prefix
  if (rawBone.startsWith('mixamorig')) {
    const stripped = rawBone.substring(9)
    if (stripped && MIXAMO_TO_VRM[stripped]) return MIXAMO_TO_VRM[stripped]
  }

  return null
}

// ── Test a single FBX animation ─────────────────────────────────────────────

function testFbxAnimation(
  entry: AnimationEntry,
  vrmHumanoid: VrmHumanoidMock,
): TestResult {
  const result: TestResult = {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    type: 'fbx',
    status: 'pass',
    tracksTotal: 0,
    tracksRetargeted: 0,
    tracksSkipped: 0,
    bonesFound: 0,
    bonesMapped: 0,
    errors: [],
    warnings: [],
  }

  const fbxPath = resolve(PROJECT_ROOT, 'public', entry.path.replace(/^\//, ''))

  // Step 1: Load the FBX file with Three.js FBXLoader.parse
  let group: any = null
  try {
    const fbxBuffer = readFileSync(fbxPath)
    const fbxLoader = new FBXLoader()
    // FBXLoader.parse expects a string or ArrayBuffer
    group = fbxLoader.parse(fbxBuffer.buffer.slice(fbxBuffer.byteOffset, fbxBuffer.byteOffset + fbxBuffer.byteLength) as ArrayBuffer, fbxPath.substring(fbxPath.lastIndexOf('/') + 1))
  } catch (err: any) {
    result.status = 'fail'
    result.errors.push(`FBX load failed: ${err.message}`)
    return result
  }

  // Step 2: Get clips from the loaded group
  const clips = group.animations
  if (!clips || clips.length === 0) {
    result.status = 'fail'
    result.errors.push('No animation clips found in FBX')
    return result
  }

  result.tracksTotal = clips[0].tracks.length
  result.duration = clips[0].duration

  // Step 3: Analyze bones
  const fbxBones = new Set<string>()
  group.traverse((obj: any) => {
    if (obj.isBone || obj.name) fbxBones.add(obj.name)
  })
  result.bonesFound = fbxBones.size

  // Step 4: Map bones to VRM names
  const mappedBones = new Set<string>()
  const skippedBones = new Set<string>()

  for (const bone of fbxBones) {
    const vrmName = resolveVrmBoneName(bone)
    if (vrmName) {
      mappedBones.add(vrmName)
      // Verify the VRM bone exists
      const vrmNode = vrmHumanoid.getRawBoneNode(vrmName)
      if (!vrmNode) {
        skippedBones.add(`${bone}→${vrmName}(no VRM bone)`)
      }
    } else {
      skippedBones.add(bone)
    }
  }

  result.bonesMapped = mappedBones.size
  result.uniqueFbxBones = fbxBones

  // Step 5: Run actual retargeting on each clip
  for (const clip of clips) {
    try {
      const retargeted = retargetMixamoClip(clip, group, vrmHumanoid, null)
      if (retargeted) {
        result.tracksRetargeted += retargeted.tracks.length
      } else {
        result.warnings.push(`Retargeting returned null for clip "${clip.name}"`)
      }
    } catch (err: any) {
      result.status = 'fail'
      result.errors.push(`Retargeting error for "${clip.name}": ${err.message}`)
    }
  }

  result.tracksSkipped = result.tracksTotal - result.tracksRetargeted

  // Step 6: Check for issues
  if (result.tracksSkipped > 0) {
    result.warnings.push(`${result.tracksSkipped} tracks could not be retargeted`)
  }

  if (skippedBones.size > 0) {
    result.warnings.push(`Unmapped bones: ${[...skippedBones].slice(0, 10).join(', ')}`)
  }

  // Per-clip breakdown
  if (clips.length > 1) {
    result.warnings.push(`Multiple clips: ${clips.map(c => `"${c.name}" (${c.tracks.length} tracks)`).join(', ')}`)
  }

  return result
}

// ── Test a single VRMA animation ────────────────────────────────────────────

function testVrmaAnimation(
  entry: AnimationEntry,
  _vrmHumanoid: VrmHumanoidMock,
): TestResult {
  const result: TestResult = {
    id: entry.id,
    name: entry.name,
    path: entry.path,
    type: 'vrma',
    status: 'skip',
    tracksTotal: 0,
    tracksRetargeted: 0,
    tracksSkipped: 0,
    bonesFound: 0,
    bonesMapped: 0,
    errors: [],
    warnings: [],
  }

  const vrmaPath = resolve(PROJECT_ROOT, 'public', entry.path.replace(/^\//, ''))

  // Step 1: Check file exists
  try {
    statSync(vrmaPath)
    result.vrmaFileExists = true
  } catch {
    result.status = 'fail'
    result.errors.push(`File not found: ${entry.path}`)
    return result
  }

  // Step 2: Validate as glTF (VRMA is glTF-based)
  try {
    const buffer = readFileSync(vrmaPath)
    parseGLTBBinary(buffer)
    result.vrmaValidGlTF = true
  } catch (err: any) {
    result.status = 'fail'
    result.errors.push(`Invalid glTF: ${err.message}`)
    return result
  }

  // Step 3: Report — VRMA retargeting requires browser environment
  result.warnings.push('VRMA loading requires browser environment (Three.js VRMAnimationLoaderPlugin)')
  // Don't add to errors — this is an expected skip, not a failure

  return result
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const vrmPath = resolve(process.argv[2] || DEFAULT_VRM)

  try {
    statSync(vrmPath)
  } catch {
    console.error(`VRM file not found: ${vrmPath}`)
    process.exit(1)
  }

  console.log(`\n=== Animation Retargeting Test ===`)
  console.log(`VRM model: ${vrmPath}`)
  console.log(`Project:   ${PROJECT_ROOT}\n`)

  // ── Load VRM model ──────────────────────────────────────────────────────
  log('VRM Model', 'Loading...')
  let vrmJson: any
  let nodeNames: string[]
  try {
    const vrmData = loadVrmModel(vrmPath)
    vrmJson = vrmData.json
    nodeNames = vrmData.nodeNames
    console.log(`  Nodes: ${nodeNames.length}`)
  } catch (err: any) {
    console.error(`  Failed to parse VRM: ${err.message}`)
    process.exit(1)
  }

  // Build humanoid mock
  const vrmHumanoid = buildVrmHumanoidMock(vrmJson, nodeNames)

  // ── VRM Bone Coverage ─────────────────────────────────────────────────────
  log('VRM Bone Coverage', '')
  const coverage = computeVrmBoneCoverage(vrmHumanoid)
  const coveragePct = Math.round((coverage.resolved / coverage.total) * 100)
  console.log(`  ${coverage.resolved}/${coverage.total} standard VRM bones resolved (${coveragePct}%)`)
  if (coverage.missing.length > 0) {
    console.log(`  Missing: ${coverage.missing.join(', ')}`)
  }

  // ── Load animation index ────────────────────────────────────────────────
  log('Animation Index', 'Loading...')
  let entries: AnimationEntry[]
  try {
    const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
    entries = index.animations
    console.log(`  ${entries.length} animations found\n`)
  } catch (err: any) {
    console.error(`  Failed to load index: ${err.message}`)
    process.exit(1)
  }

  // Suppress verbose AnimationRemapper console.log during tests
  const origLog = console.log
  console.log = (...args: any[]) => {
    // Only log test-related output; remapper logs go to stderr
    const msg = args.join(' ')
    if (msg.startsWith('[AnimationRemapper]') || msg.startsWith('[Test]')) {
      process.stderr.write(msg + '\n')
    } else {
      origLog(...args)
    }
  }

  // ── Run tests ───────────────────────────────────────────────────────────
  const results: TestResult[] = []
  const startTime = Date.now()
  // Track all unique FBX bone names across all animations for consistency analysis
  const allFbxBones = new Set<string>()

  // Run tests sequentially
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const pct = Math.round(((i + 1) / entries.length) * 100)
    process.stdout.write(`\r  Testing... ${i + 1}/${entries.length} (${pct}%)`)

    let result: TestResult
    if (entry.type === 'fbx') {
      result = testFbxAnimation(entry, vrmHumanoid)
    } else if (entry.type === 'vrma') {
      result = testVrmaAnimation(entry, vrmHumanoid)
    } else {
      result = {
        id: entry.id,
        name: entry.name,
        path: entry.path,
        type: entry.type,
        status: 'skip',
        tracksTotal: 0,
        tracksRetargeted: 0,
        tracksSkipped: 0,
        bonesFound: 0,
        bonesMapped: 0,
        errors: [`Unknown type: ${entry.type}`],
        warnings: [],
      }
    }

    results.push(result)

    // Aggregate FBX bone data for consistency analysis
    if (entry.type === 'fbx' && result.uniqueFbxBones) {
      for (const bone of result.uniqueFbxBones) {
        allFbxBones.add(bone)
      }
    }
  }

  console.log('\n') // newline after progress

  // ── Report results ──────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length

  log('Results', `${passed} passed, ${failed} failed, ${skipped} skipped (${elapsed}s)\n`)

  // Per-animation detail
  for (const r of results) {
    const statusEmoji = r.status === 'pass' ? '\x1b[32m✓\x1b[0m'
      : r.status === 'fail' ? '\x1b[31m✗\x1b[0m'
      : '\x1b[90m⊘\x1b[0m'

    console.log(`  ${statusEmoji} ${r.name.padEnd(30)} [${r.type.padEnd(5)}] `)

    if (r.type === 'fbx') {
      console.log(`      Tracks: ${r.tracksRetargeted}/${r.tracksTotal} retargeted, ${r.tracksSkipped} skipped`)
      console.log(`      Bones:  ${r.bonesMapped}/${r.bonesFound} mapped`)
      if (r.duration) console.log(`      Duration: ${r.duration.toFixed(2)}s`)
    } else if (r.type === 'vrma') {
      if (r.vrmaFileExists === false) {
        console.log(`      File: MISSING`)
      } else if (r.vrmaValidGlTF === false) {
        console.log(`      File: exists, but NOT valid glTF`)
      } else {
        console.log(`      File: exists, valid glTF (retargeting requires browser)`)
      }
    }

    if (r.errors.length > 0) {
      for (const e of r.errors) console.log(`      \x1b[31mERROR: ${e}\x1b[0m`)
    }
    if (r.warnings.length > 0) {
      for (const w of r.warnings) console.log(`      \x1b[33mWARN: ${w}\x1b[0m`)
    }
    console.log()
  }

  // ── Summary table ───────────────────────────────────────────────────────
  console.log('\x1b[1m=== SUMMARY ===\x1b[0m')
  console.log(`  Total:    ${results.length}`)
  console.log(`  Passed:   ${passed}`)
  console.log(`  Failed:   ${failed}`)
  console.log(`  Skipped:  ${skipped}`)
  console.log(`  Time:     ${elapsed}s`)

  // Per-type breakdown
  const fbxResults = results.filter(r => r.type === 'fbx')
  const vrmaResults = results.filter(r => r.type === 'vrma')

  if (fbxResults.length > 0) {
    const fbxRetargeted = fbxResults.reduce((sum, r) => sum + r.tracksRetargeted, 0)
    const fbxTotal = fbxResults.reduce((sum, r) => sum + r.tracksTotal, 0)
    console.log(`\n  FBX: ${fbxResults.length} animations, ${fbxRetargeted}/${fbxTotal} tracks retargeted`)
  }
  if (vrmaResults.length > 0) {
    const vrmaRetargeted = vrmaResults.reduce((sum, r) => sum + r.tracksRetargeted, 0)
    const vrmaTotal = vrmaResults.reduce((sum, r) => sum + r.tracksTotal, 0)
    console.log(`  VRMA: ${vrmaResults.length} animations, ${vrmaRetargeted}/${vrmaTotal} tracks loaded`)
  }

  // Failed animations detail
  if (failed > 0) {
    console.log('\n\x1b[31m=== FAILED ANIMATIONS ===\x1b[0m')
    for (const r of results.filter(r => r.status === 'fail')) {
      console.log(`  \x1b[31m✗ ${r.name}\x1b[0m`)
      for (const e of r.errors) console.log(`      ${e}`)
    }
  }

  // Animations with skipped tracks
  const partial = results.filter(r => r.status === 'pass' && r.tracksSkipped > 0)
  if (partial.length > 0) {
    console.log(`\n\x1b[33m=== ANIMATIONS WITH SKIPPED TRACKS ===\x1b[0m`)
    for (const r of partial) {
      console.log(`  \x1b[33m⚠ ${r.name}: ${r.tracksSkipped}/${r.tracksTotal} skipped\x1b[0m`)
    }
  }

  // ── Bone Quality & Mapping Consistency ────────────────────────────────────
  const fbxTested = results.filter(r => r.type === 'fbx' && r.status !== 'skip')
  if (fbxTested.length > 0) {
    // Overall bone mapping quality
    const totalBonesSeen = allFbxBones.size
    let bonesMapped = 0
    let bonesUnmapped = 0
    const unmappedBones: string[] = []

    for (const bone of allFbxBones) {
      const vrmName = resolveVrmBoneName(bone)
      if (vrmName) {
        const vrmNode = vrmHumanoid.getRawBoneNode(vrmName)
        if (vrmNode) {
          bonesMapped++
        } else {
          bonesUnmapped++
          unmappedBones.push(`${bone}→${vrmName}(no VRM bone)`)
        }
      } else {
        bonesUnmapped++
        unmappedBones.push(bone)
      }
    }

    const mappingQuality = totalBonesSeen > 0
      ? Math.round((bonesMapped / totalBonesSeen) * 100)
      : 100

    log('Bone Mapping Quality', '')
    console.log(`  Unique FBX bones across all animations: ${totalBonesSeen}`)
    console.log(`  Mapped to VRM bone + found in model: ${bonesMapped} (${mappingQuality}%)`)
    if (bonesUnmapped > 0) {
      console.log(`  Unmapped or no VRM target: ${bonesUnmapped}`)
      // Categorize unmapped bones
      const mixamoEndBones = unmappedBones.filter(b => b.endsWith('_End') || b.includes('End'))
      const thumb1Bones = unmappedBones.filter(b => b.includes('Thumb1'))
      const unknownBones = unmappedBones.filter(b => !b.endsWith('_End') && !b.includes('End') && !b.includes('Thumb1'))

      if (mixamoEndBones.length > 0) {
        console.log(`    - End bones (expected, no animation data): ${mixamoEndBones.join(', ')}`)
      }
      if (thumb1Bones.length > 0) {
        console.log(`    - Thumb metacarpal mapping (VRM uses ThumbProximal, not Thumb1): ${thumb1Bones.join(', ')}`)
      }
      if (unknownBones.length > 0) {
        console.log(`    - Unknown/non-skeletal: ${unknownBones.join(', ')}`)
      }
    }

    // Naming consistency
    const namingPatterns = {
      mixamorigColon: 0, // mixamorig:Hips
      mixamorigStripped: 0, // mixamorigHips
      biped: 0, // J_Bip_*
      other: 0,
    }

    for (const bone of allFbxBones) {
      if (bone.includes(':')) namingPatterns.mixamorigColon++
      else if (bone.startsWith('mixamorig')) namingPatterns.mixamorigStripped++
      else if (bone.startsWith('J_Bip_') || bone.startsWith('J_bip_')) namingPatterns.biped++
      else namingPatterns.other++
    }

    log('FBX Naming Convention', '')
    console.log(`  mixamorig:Hips (colon):  ${namingPatterns.mixamorigColon}`)
    console.log(`  mixamorigHips (stripped): ${namingPatterns.mixamorigStripped}`)
    console.log(`  J_Bip_* (biped):         ${namingPatterns.biped}`)
    if (namingPatterns.other > 0) {
      const otherBones = [...allFbxBones].filter(b => !b.includes(':') && !b.startsWith('mixamorig') && !b.startsWith('J_Bip_') && !b.startsWith('J_bip_'))
      console.log(`  Other (${namingPatterns.other}): ${otherBones.join(', ')}`)
    } else {
      console.log(`  Other: 0`)
    }
  }

  console.log()

  // Exit with error code if any failed
  process.exit(failed > 0 ? 1 : 0)
}

main()
