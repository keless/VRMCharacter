import { logger } from '../../lib/logger'

const animLog = logger('AnimationLoader')
import type { AnimationAsset, AnimationClipInfo } from '../../types'

interface AnimationEntry {
  id: string
  name: string
  path: string
  type: 'fbx' | 'vrma'
}

interface AnimationIndex {
  animations: AnimationEntry[]
}

/**
 * Loads the built-in animation index and returns AnimationAsset[] with resolved URLs.
 * Animations are loaded once at startup so they're always available.
 */
export async function loadBuiltInAnimations(): Promise<AnimationAsset[]> {
  try {
    const resp = await fetch('/animations/index.json')
    if (!resp.ok) {
      animLog.warn('AnimationLoader Could not load animation index:', resp.status)
      return []
    }
    const index: AnimationIndex = await resp.json()

    const assets: AnimationAsset[] = []
    for (const entry of index.animations) {
      // Resolve the path — in dev it's /animations/..., in production it's the same
      // since public/ files are served at the root
      const filePath = entry.path.startsWith('http') ? entry.path : `/${entry.path}`

      assets.push({
        id: `builtin-${entry.id}`,
        name: entry.name,
        filePath,
        type: entry.type,
        duration: 0,
        clips: [],
      })
    }

    animLog.log(`Loaded ${assets.length} built-in animations`)
    return assets
  } catch (err) {
    animLog.error('AnimationLoader Failed to load built-in animations:', err)
    return []
  }
}

/**
 * Fetches clip info for a single animation file.
 * This is called after the animation is loaded to populate clip names.
 */
export async function fetchClipInfo(asset: AnimationAsset): Promise<AnimationClipInfo[]> {
  const clips: AnimationClipInfo[] = []

  if (asset.type === 'fbx') {
    // FBX: we can't easily get clip info without loading the file
    // The AnimationPlayer will populate this when it loads
    clips.push({ name: 'default', duration: 0 })
  } else if (asset.type === 'vrma') {
    // VRMA: same, need to load to get clip info
    clips.push({ name: 'default', duration: 0 })
  } else {
    clips.push({ name: 'default', duration: 0 })
  }

  return clips
}
