import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Ground from './Ground'
import CharacterModel from '../engine/vrm/CharacterModel'
import type { CharacterAsset, AnimationAsset } from '../types'

// Chat panel width in pixels (matches ChatPanel.tsx)
const CHAT_PANEL_WIDTH = 360

/**
 * Calculate the visible center offset ratio and camera offset.
 * The chat panel blocks the right side of the screen, so the visible
 * area center is shifted left. We shift the camera right to compensate.
 */
function useVisibleCenterOffset() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920)

  const offset = useMemo(() => {
    // The chat panel blocks the right side, so the visible area center
    // is shifted left by CHAT_PANEL_WIDTH / 2 pixels from screen center.
    // Convert that to world-space offset: (chatWidth / 2 / viewportWidth) * cameraDistance
    const distance = 2.5
    const ratio = CHAT_PANEL_WIDTH / (2 * width)
    return ratio * distance
  }, [width])

  return { offset }
}

interface CharacterSceneProps {
  bodyAsset: CharacterAsset | null
  bodyBuffer: ArrayBuffer | null
  hairAsset: CharacterAsset | null
  clothingAsset: CharacterAsset | null
  animations: AnimationAsset[]
  currentAnimation: string | null
  onAnimationEnded: () => void
  onLoadBody: () => void
}

export default function CharacterScene({
  bodyAsset,
  bodyBuffer,
  hairAsset,
  clothingAsset,
  animations,
  currentAnimation,
  onAnimationEnded,
  onLoadBody,
}: CharacterSceneProps) {
  const { offset } = useVisibleCenterOffset()

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        camera={{ position: [offset, 1.1, 2.5], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#1a1a2e' }}
      >
        {/* Stronger ambient light for visibility */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight
          position={[-2, 3, -1]}
          intensity={0.5}
          color="#8888ff"
        />
        <directionalLight
          position={[0, 2, -3]}
          intensity={0.6}
          color="#ffffff"
        />

        {/* Ground */}
        <Ground />

        {/* Camera Controls */}
        <OrbitControls
          target={[offset, 1.2, 0]}
          minDistance={1.5}
          maxDistance={6}
          minPolarAngle={Math.PI * 0.1}
          maxPolarAngle={Math.PI * 0.85}
          enableZoom={true}
          enablePan={false}
        />

        {/* Character Model */}
        {(bodyAsset || bodyBuffer) && (
          <CharacterModel
            bodyAsset={bodyAsset as CharacterAsset}
            bodyBuffer={bodyBuffer ?? undefined}
            hairAsset={hairAsset}
            clothingAsset={clothingAsset}
            animations={animations}
            currentAnimation={currentAnimation}
            onAnimationEnded={onAnimationEnded}
          />
        )}
      </Canvas>

      {/* No character overlay */}
      {!bodyAsset && !bodyBuffer && (
        <div style={styles.overlay}>
          <div style={styles.card}>
            <div style={styles.icon}>🧍</div>
            <div style={styles.title}>No Character Loaded</div>
            <div style={styles.hint}>
              Click the button below or use the <strong>🎭 Customize</strong> panel to load a VRM file.
            </div>
            <button
              style={styles.loadButton}
              onClick={onLoadBody}
            >
              Load Character
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  card: {
    textAlign: 'center',
    padding: '32px 40px',
    background: 'rgba(20, 20, 40, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'auto',
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  loadButton: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(100, 100, 255, 0.6)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
