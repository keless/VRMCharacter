import React, { useState, useEffect, useRef } from 'react'
import type { AnimationAsset } from '../types'

interface AnimationPickerProps {
  animations: AnimationAsset[]
  currentAnimation: string | null
  onPlay: (animationId: string) => void
  isLooping: boolean
  onLoopToggle: (looping: boolean) => void
}

/**
 * Floating panel for manually selecting and playing animations.
 * Shows the current animation, provides a dropdown to pick another,
 * and a toggle for looping vs. single-play.
 */
export default function AnimationPicker({
  animations,
  currentAnimation,
  onPlay,
  isLooping,
  onLoopToggle,
}: AnimationPickerProps) {
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const currentName = animations.find((a) => a.id === currentAnimation)?.name ?? null

  const handleSelect = (id: string) => {
    onPlay(id)
    setDropdownOpen(false)
  }

  // Close dropdown when clicking outside the panel
  useEffect(() => {
    if (!dropdownOpen) return

    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  return (
    <div style={styles.container}>
      {/* Toggle button */}
      <button
        style={styles.toggleButton}
        onClick={() => setOpen(!open)}
        title="Animation Control"
      >
        {open ? '✕' : '🎬'}
      </button>

      {/* Panel */}
      {open && (
        <div ref={panelRef} style={styles.panel}>
          <div style={styles.section}>
            <div style={styles.label}>Current</div>
            {currentName ? (
              <span style={styles.active}>{currentName}</span>
            ) : (
              <span style={styles.inactive}>None</span>
            )}
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <div style={styles.label}>Select</div>
            <div style={styles.dropdownContainer}>
              <button
                style={styles.dropdownButton}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {currentName || 'Choose animation…'}
              </button>
              {dropdownOpen && (
                <div style={styles.dropdown}>
                  {animations.length === 0 && (
                    <span style={styles.inactive}>No animations loaded</span>
                  )}
                  {animations.map((anim) => (
                    <button
                      key={anim.id}
                      style={{
                        ...styles.dropdownItem,
                        ...(anim.id === currentAnimation ? styles.dropdownItemActive : {}),
                      }}
                      onClick={() => handleSelect(anim.id)}
                    >
                      {anim.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <div style={styles.label}>Playback</div>
            <button
              style={{
                ...styles.playbackButton,
                background: isLooping ? 'rgba(100, 255, 100, 0.2)' : 'rgba(100, 100, 255, 0.15)',
                color: isLooping ? '#7fdd7f' : '#7faaff',
              }}
              onClick={() => onLoopToggle(!isLooping)}
            >
              {isLooping ? '⟳ Looping' : '→ Once'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    zIndex: 10,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(20, 20, 40, 0.85)',
    backdropFilter: 'blur(12px)',
    color: '#e0e0e0',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    marginBottom: 8,
    width: 220,
    padding: 16,
    background: 'rgba(20, 20, 40, 0.9)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: '#888',
    letterSpacing: 1,
  },
  active: {
    color: '#7faaff',
    fontSize: 12,
    wordBreak: 'break-all',
  },
  inactive: {
    color: '#555',
    fontSize: 12,
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '10px 0',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdownButton: {
    width: '100%',
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid rgba(100, 100, 255, 0.3)',
    background: 'rgba(100, 100, 255, 0.1)',
    color: '#ccc',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropdown: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    overflowY: 'auto' as const,
    background: 'rgba(20, 20, 40, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    zIndex: 20,
  },
  dropdownItem: {
    width: '100%',
    padding: '6px 10px',
    background: 'transparent',
    border: 'none',
    color: '#ccc',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  dropdownItemActive: {
    background: 'rgba(100, 100, 255, 0.25)',
    color: '#fff',
  },
  playbackButton: {
    width: '100%',
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(100, 100, 255, 0.3)',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
  },
}
