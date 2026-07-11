import { logger } from '../../lib/logger'

const animLog = logger('PartSwapper')
import type { CharacterAsset } from '../../types'

/**
 * Manages character part swapping (hair, clothing, etc.).
 * Each part category has a set of available assets and one active selection.
 */
export class PartSwapper {
  private parts: Map<
    string,
    {
      available: CharacterAsset[]
      selected: CharacterAsset | null
    }
  > = new Map()

  // Callback for when a part changes
  private onChangeCallbacks: Array<(part: string, asset: CharacterAsset | null) => void> = []

  onPartChange(
    callback: (part: string, asset: CharacterAsset | null) => void
  ): () => void {
    this.onChangeCallbacks.push(callback)
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(
        (cb) => cb !== callback
      )
    }
  }

  /**
   * Register available assets for a part category.
   */
  registerPart(part: string, assets: CharacterAsset[]): void {
    const existing = this.parts.get(part)
    if (existing) {
      // Merge with existing
      const existingIds = new Set(existing.available.map((a) => a.id))
      const merged = [
        ...existing.available,
        ...assets.filter((a) => !existingIds.has(a.id)),
      ]
      this.parts.set(part, {
        available: merged,
        selected: existing.selected,
      })
    } else {
      this.parts.set(part, { available: assets, selected: null })
    }
  }

  /**
   * Get available assets for a part category.
   */
  getAvailable(part: string): CharacterAsset[] {
    return this.parts.get(part)?.available ?? []
  }

  /**
   * Get the currently selected asset for a part category.
   */
  getSelected(part: string): CharacterAsset | null {
    return this.parts.get(part)?.selected ?? null
  }

  /**
   * Swap a part to a new asset.
   */
  swap(part: string, asset: CharacterAsset): void {
    const entry = this.parts.get(part)
    if (!entry) {
      animLog.warn(`Part category not registered: ${part}`)
      return
    }

    const prev = entry.selected
    entry.selected = asset

    // Notify listeners
    this.onChangeCallbacks.forEach((cb) => cb(part, asset))

    animLog.log(`Swapped ${part}: ${prev?.name ?? 'none'} → ${asset.name}`)
  }

  /**
   * Reset a part to no selection.
   */
  reset(part: string): void {
    const entry = this.parts.get(part)
    if (!entry) return

    const prev = entry.selected
    entry.selected = null

    this.onChangeCallbacks.forEach((cb) => cb(part, null))
  }

  /**
   * Get all current selections.
   */
  getAllSelections(): Record<string, CharacterAsset | null> {
    const result: Record<string, CharacterAsset | null> = {}
    this.parts.forEach((entry, part) => {
      result[part] = entry.selected
    })
    return result
  }
}

// Singleton instance
export const partSwapper = new PartSwapper()
