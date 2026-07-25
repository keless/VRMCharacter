import React, { useState } from 'react'
import type { CharacterAsset } from '../types'

interface AssetPickerProps {
  bodyAsset: CharacterAsset | null
  hairAsset: CharacterAsset | null
  clothingAsset: CharacterAsset | null
  onBodySelect: () => void
  onHairSelect: () => void
  onClothingSelect: () => void
  driverMode: 'llm' | 'mock'
  onDriverModeChange: (mode: 'llm' | 'mock') => void
}

/**
 * Floating panel for selecting character assets (body, hair, clothing).
 * Animations are built-in and auto-loaded.
 * Triggers file picker dialogs via parent component.
 */
export default function AssetPicker({
  bodyAsset,
  hairAsset,
  clothingAsset,
  onBodySelect,
  onHairSelect,
  onClothingSelect,
  driverMode,
  onDriverModeChange,
}: AssetPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div style={styles.container}>
      {/* Toggle button */}
      <button
        style={styles.toggleButton}
        onClick={() => setOpen(!open)}
        title="Character Customization"
      >
        {open ? '✕' : '🎭'}
      </button>

      {/* Panel */}
      {open && (
        <div style={styles.panel}>
          <div style={styles.section}>
            <div style={styles.label}>Body</div>
            {bodyAsset ? (
              <div style={styles.assetRow}>
                <span style={styles.active}>{bodyAsset.name}</span>
              </div>
            ) : (
              <span style={styles.inactive}>No body loaded</span>
            )}
            <button
              style={{ ...styles.loadButton, ...styles.primaryButton }}
              onClick={onBodySelect}
            >
              {bodyAsset ? 'Change Body' : 'Load Body'}
            </button>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <div style={styles.label}>Hair</div>
            {hairAsset ? (
              <div style={styles.assetRow}>
                <span style={styles.active}>{hairAsset.name}</span>
              </div>
            ) : (
              <span style={styles.inactive}>No hair loaded</span>
            )}
            <button
              style={styles.loadButton}
              onClick={onHairSelect}
            >
              {hairAsset ? 'Change Hair' : 'Load Hair'}
            </button>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <div style={styles.label}>Clothing</div>
            {clothingAsset ? (
              <div style={styles.assetRow}>
                <span style={styles.active}>{clothingAsset.name}</span>
              </div>
            ) : (
              <span style={styles.inactive}>No clothing loaded</span>
            )}
            <button
              style={styles.loadButton}
              onClick={onClothingSelect}
            >
              {clothingAsset ? 'Change Clothing' : 'Load Clothing'}
            </button>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <div style={styles.label}>Animations</div>
            <span style={{ ...styles.inactive, fontSize: 11 }}>67 built-in animations loaded</span>
          </div>

          <div style={styles.divider} />

          <div style={styles.section}>
            <div style={styles.label}>Chat Driver</div>
            <div style={styles.toggleRow}>
              <button
                style={{
                  ...styles.modeButton,
                  ...(driverMode === 'mock' ? styles.modeButtonActive : {}),
                }}
                onClick={() => onDriverModeChange('mock')}
              >
                Mock
              </button>
              <button
                style={{
                  ...styles.modeButton,
                  ...(driverMode === 'llm' ? styles.modeButtonActive : {}),
                }}
                onClick={() => onDriverModeChange('llm')}
              >
                LLM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
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
    marginTop: 8,
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
  assetRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  active: {
    color: '#7faaff',
    fontSize: 12,
    wordBreak: 'break-all',
    flex: 1,
  },
  inactive: {
    color: '#555',
    fontSize: 12,
  },
  loadButton: {
    marginTop: 4,
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(100, 100, 255, 0.3)',
    background: 'rgba(100, 100, 255, 0.15)',
    color: '#7faaff',
    fontSize: 12,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  primaryButton: {
    background: 'rgba(100, 100, 255, 0.4)',
    color: '#fff',
    fontWeight: 600,
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.08)',
    margin: '10px 0',
  },
  toggleRow: {
    display: 'flex',
    gap: 4,
  },
  modeButton: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid rgba(100, 100, 255, 0.3)',
    background: 'rgba(100, 100, 255, 0.1)',
    color: '#7faaff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  modeButtonActive: {
    background: 'rgba(100, 100, 255, 0.4)',
    color: '#fff',
    borderColor: 'rgba(100, 100, 255, 0.6)',
  },
}
