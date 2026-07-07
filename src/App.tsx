import React, { useState, useCallback, useRef, useEffect } from 'react'
import CharacterScene from './scenes/CharacterScene'
import ChatPanel from './components/ChatPanel'
import AssetPicker from './components/AssetPicker'
import type { CharacterAsset, ChatMessage, AnimationAsset } from './types'

// Global error handler
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason)
})

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [bodyAsset, setBodyAsset] = useState<CharacterAsset | null>(null)
  const [hairAsset, setHairAsset] = useState<CharacterAsset | null>(null)
  const [clothingAsset, setClothingAsset] = useState<CharacterAsset | null>(null)
  const [animations, setAnimations] = useState<AnimationAsset[]>([])
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [appReady, setAppReady] = useState(false)
  const [bodyBuffer, setBodyBuffer] = useState<ArrayBuffer | null>(null)
  const autoLoadedRef = useRef(false)

  // Hidden file inputs
  const bodyInputRef = useRef<HTMLInputElement>(null)
  const hairInputRef = useRef<HTMLInputElement>(null)
  const clothingInputRef = useRef<HTMLInputElement>(null)

  // Mount debug
  useEffect(() => {
    console.log('App mounted, setting up file inputs...')
    setAppReady(true)
  }, [])

  // Auto-load VRM from VITE_VRM_PATH env var (programmatic loading)
  useEffect(() => {
    if (autoLoadedRef.current) {
      console.log('[App] Auto-load already in progress, skipping')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vrmPath = (import.meta.env as any).VITE_VRM_PATH
    if (!vrmPath) {
      console.log('[App] No VITE_VRM_PATH set, skipping auto-load')
      return
    }
    console.log('[App] Auto-loading VRM from:', vrmPath)
    autoLoadedRef.current = true
    setAppReady(false)

    // Check if we're in Electron (electronAPI available)
    if (window.electronAPI && window.electronAPI.loadVrmFromPath) {
      window.electronAPI.loadVrmFromPath(vrmPath)
        .then((bytes: Uint8Array) => {
          console.log('[App] VRM loaded via IPC:', bytes.length, 'bytes')
          const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
          setBodyBuffer(arrayBuffer)
          setAppReady(true)
        })
        .catch((err: unknown) => {
          console.error('[App] Failed to load VRM via IPC:', err)
          setAppReady(true)
        })
    } else {
      console.warn('[App] electronAPI not available — running in browser mode, cannot load from path')
      setAppReady(true)
    }
  }, [])

  // Handle file selection via hidden <input> elements
  const handleFileChange = useCallback(
    (
      event: React.ChangeEvent<HTMLInputElement>,
      category: 'body' | 'hair' | 'clothing'
    ) => {
      console.log('File input changed for:', category)
      const file = event.target.files?.[0]
      if (!file) {
        console.log('No file selected')
        return
      }
      console.log('File selected:', file.name, file.size, 'bytes')

      const asset: CharacterAsset = {
        id: `${category}-${file.name}-${Date.now()}`,
        name: file.name.replace(/\.vrm$/i, ''),
        category,
        filePath: `file://${file.name}`,
        _file: file as unknown as string,
      }
      console.log('Setting asset:', asset)
      if (category === 'body') setBodyAsset(asset)
      else if (category === 'hair') setHairAsset(asset)
      else setClothingAsset(asset)

      // Reset input so the same file can be selected again
      event.target.value = ''
    },
    []
  )

  const handleSendMessage = useCallback((text: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])
  }, [])

  const handleCharacterResponse = useCallback(
    (response: { text: string; animationId?: string; expression?: string }) => {
      const charMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'character',
        text: response.text,
        timestamp: Date.now(),
        animationId: response.animationId,
        expression: response.expression,
      }
      setMessages((prev) => [...prev, charMessage])
      if (response.animationId) {
        setCurrentAnimation(response.animationId)
      }
    },
    []
  )

  return (
    <div style={styles.container}>
      {/* Debug status indicator */}
      <div style={styles.statusBar}>
        <span style={{
          ...styles.statusDot,
          backgroundColor: appReady ? '#00ff00' : '#ff0000',
        }} />
        <span style={styles.statusText}>
          {appReady ? 'READY' : 'LOADING...'}
          {bodyAsset ? ` | Body: ${bodyAsset.name}` : ' | No body'}
        </span>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={bodyInputRef}
        type="file"
        accept=".vrm"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'body')}
      />
      <input
        ref={hairInputRef}
        type="file"
        accept=".vrm"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'hair')}
      />
      <input
        ref={clothingInputRef}
        type="file"
        accept=".vrm"
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'clothing')}
      />

      {/* 3D Viewport */}
      <CharacterScene
        bodyAsset={bodyAsset}
        bodyBuffer={bodyBuffer}
        hairAsset={hairAsset}
        clothingAsset={clothingAsset}
        animations={animations}
        currentAnimation={currentAnimation}
        onAnimationEnded={() => setCurrentAnimation(null)}
        onLoadBody={() => {
          console.log('Load body button clicked')
          bodyInputRef.current?.click()
        }}
        debugInfo={debugInfo}
        onDebugInfo={setDebugInfo}
      />

      {/* Floating UI Panels */}
      <AssetPicker
        bodyAsset={bodyAsset}
        hairAsset={hairAsset}
        clothingAsset={clothingAsset}
        onBodySelect={() => {
          console.log('AssetPicker: Load body clicked')
          bodyInputRef.current?.click()
        }}
        onHairSelect={() => hairInputRef.current?.click()}
        onClothingSelect={() => clothingInputRef.current?.click()}
      />

      <ChatPanel
        messages={messages}
        onSend={handleSendMessage}
        onCharacterResponse={handleCharacterResponse}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#1a1a2e',
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: '4px 12px',
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#ccc',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
  },
  statusText: {
    fontFamily: 'monospace',
  },
}
