/**
 * Categorized diagnostic logger.
 *
 * All diagnostic categories are off by default. Enable with:
 *   - Dev: `VITE_DEBUG_LOGS=1 npm run dev`
 *   - Runtime: `window.__DEBUG_LOGGING__ = true`
 *
 * Categories:
 *   App          — startup, VRM loading, file selection
 *   AnimationPlayer — clip loading, retargeting, playback
 *   AnimationRemapper — bone mapping, retargeting math
 *   CharacterModel — VRM load pipeline internals
 *   AnimationLoader — built-in animation loading
 *   PartSwapper  — part category swapping
 *   ChatPanel    — chat UI errors
 *   Global       — global error handlers (always on)
 */

// ── State ────────────────────────────────────────────────────────────────────

let enabled = false
const disabledCategories = new Set<string>()

/**
 * Enable or disable all diagnostic logging.
 * Called automatically from App.tsx on startup if VITE_DEBUG_LOGS is set.
 * Can also be toggled at runtime via `window.__DEBUG_LOGGING__`.
 */
export function setLogging(value: boolean): void {
  enabled = value
}

export function isEnabled(): boolean {
  return enabled
}

/**
 * Disable logging for a specific category.
 * Useful when debug logging is on but a particular category is too verbose.
 */
export function disableCategory(category: string): void {
  disabledCategories.add(category)
}

// ── Logger factory ───────────────────────────────────────────────────────────

export type LogLevel = 'log' | 'warn' | 'error'

interface Logger {
  log: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Create a categorized logger.
 * Returns methods that mirror console.log/warn/error but only
 * emit output when the category is enabled.
 *
 * Usage:
 *   const log = logger('App')
 *   log.log('Starting up...')
 *   log.warn('Something questionable...')
 *   log.error('Something failed:', err)
 */
export function logger(category: string): Logger {
  const prefix = `[${category}]`
  const isDisabled = disabledCategories.has(category)

  return {
    log: (...args: unknown[]) => {
      if (enabled && !isDisabled) console.log(prefix, ...args)
    },
    warn: (...args: unknown[]) => {
      if (enabled && !isDisabled) console.warn(prefix, ...args)
    },
    error: (...args: unknown[]) => {
      // Global errors always emit; disabled categories never emit; everything else gated
      if ((enabled || category === 'Global') && !isDisabled) console.error(prefix, ...args)
    },
  }
}
