import React, { useState, useCallback, useRef, useEffect } from 'react'
import CharacterScene from './scenes/CharacterScene'
import ChatPanel from './components/ChatPanel'
import AssetPicker from './components/AssetPicker'
import { loadBuiltInAnimations } from './engine/vrm/AnimationLoader'
import { animationController } from './engine/vrm/AnimationController'
import { logger, setLogging, isEnabled } from './lib/logger'
import type { CharacterAsset, ChatMessage, AnimationAsset } from './types'

// Global error handler (always on)
const globalLog = logger('Global')
window.addEventListener('error', (e) => {
  globalLog.error('Global error:', e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  globalLog.error('Unhandled rejection:', e.reason)
})

// Enable diagnostic logging if VITE_DEBUG_LOGS is set
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debugFlag = (import.meta.env as any).VITE_DEBUG_LOGS
if (debugFlag) {
  setLogging(true)
}
// Also allow runtime toggle: window.__DEBUG_LOGGING__ = true
Object.defineProperty(window, '__DEBUG_LOGGING__', {
  configurable: true,
  enumerable: false,
  get(): boolean { return isEnabled() },
  set(value: boolean) { setLogging(value) },
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

  // Diagnostic logger (enabled via VITE_DEBUG_LOGS=1)
  const appLog = logger('App')

  // Animation selection is driven by chat responses via handleCharacterResponse.

  // Hidden file inputs (hair/clothing only — body uses Electron dialog)
  const hairInputRef = useRef<HTMLInputElement>(null)
  const clothingInputRef = useRef<HTMLInputElement>(null)

  // Mount debug
  useEffect(() => {
    appLog.log('App mounted, setting up file inputs...')
    // Load built-in animations on startup
    loadBuiltInAnimations().then((builtIn) => {
      // Register with the animation controller
      animationController.setAssets(builtIn)
      setAnimations(builtIn)
    })
    setAppReady(true)
  }, [])

  // Auto-load VRM: VITE_VRM_PATH (env) takes priority, then localStorage (persisted path)
  useEffect(() => {
    if (autoLoadedRef.current) {
      appLog.log('Auto-load already in progress, skipping')
      return
    }
    if (!window.electronAPI || !window.electronAPI.loadVrmFromPath) {
      appLog.log('electronAPI not available — running in browser mode, skipping auto-load')
      setAppReady(true)
      return
    }

    const loadFromPath = async (label: string, filePath: string) => {
      appLog.log(`Auto-loading VRM from ${label}:`, filePath)
      autoLoadedRef.current = true
      setAppReady(false)
      try {
        const bytes = await window.electronAPI.loadVrmFromPath(filePath)
        appLog.log('VRM loaded via IPC:', bytes.length, 'bytes')
        const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
        const assetName = filePath.split(/[/\\]/).pop()!.replace(/\.vrm$/i, '')
        setBodyAsset({
          id: `auto-${filePath}`,
          name: assetName,
          category: 'body',
          filePath,
        })
        setBodyBuffer(arrayBuffer)
        setAppReady(true)
      } catch (err: unknown) {
        appLog.error(`Failed to load VRM from ${label}:`, err)
        setAppReady(true)
      }
    }

    // Priority 1: VITE_VRM_PATH env var (programmatic/testing)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const envPath = (import.meta.env as any).VITE_VRM_PATH
    if (envPath) {
      loadFromPath('VITE_VRM_PATH', envPath)
      return
    }

    // Priority 2: Persisted path from localStorage
    const savedPath = localStorage.getItem('lastVrmPath')
    if (savedPath) {
      appLog.log('Restoring last VRM from localStorage:', savedPath)
      loadFromPath('localStorage', savedPath)
    }
  }, [])

  // Handle file selection via hidden <input> elements (hair/clothing only)
  const handleFileChange = useCallback(
    (
      event: React.ChangeEvent<HTMLInputElement>,
      category: 'hair' | 'clothing'
    ) => {
      appLog.log('File input changed for:', category)
      const file = event.target.files?.[0]
      if (!file) {
        appLog.log('No file selected')
        return
      }
      appLog.log('File selected:', file.name, file.size, 'bytes')

      const asset: CharacterAsset = {
        id: `${category}-${file.name}-${Date.now()}`,
        name: file.name.replace(/\.vrm$/i, ''),
        category,
        filePath: `file://${file.name}`,
        _file: file as unknown as string,
      }
      appLog.log('Setting asset:', asset)
      if (category === 'hair') setHairAsset(asset)
      else setClothingAsset(asset)

      // Reset input so the same file can be selected again
      event.target.value = ''
    },
    []
  )

  // Handle body VRM selection via Electron file dialog (exposes real filesystem path)
  const handleBodySelect = useCallback(async () => {
    if (!window.electronAPI?.showOpenFileDialog) {
      appLog.warn('Electron file dialog not available')
      return
    }
    const result = await window.electronAPI.showOpenFileDialog({
      title: 'Select VRM body model',
      filters: [{ name: 'VRM Model', extensions: ['vrm'] }],
      properties: ['openFile'],
    })
    if (result.canceled || result.filePaths.length === 0) {
      appLog.log('Body selection canceled')
      return
    }
    const filePath = result.filePaths[0]
    appLog.log('Body VRM selected:', filePath)

    // Save path to localStorage for auto-restore on next launch
    localStorage.setItem('lastVrmPath', filePath)

    const asset: CharacterAsset = {
      id: `body-${filePath}-${Date.now()}`,
      name: filePath.split(/[/\\]/).pop()!.replace(/\.vrm$/i, ''),
      category: 'body',
      filePath,
    }
    setBodyAsset(asset)

    // Load the file via IPC
    try {
      const bytes = await window.electronAPI.loadVrmFromPath(filePath)
      appLog.log('Body VRM loaded:', bytes.length, 'bytes')
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      setBodyBuffer(arrayBuffer)
    } catch (err: unknown) {
      appLog.error('Failed to load body VRM:', err)
    }
  }, [])

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

      // Auto-play animation if the responder provided one
      if (response.animationId) {
        const resolved = animationController.resolve(response.animationId)
        if (resolved) {
          setCurrentAnimation(resolved)
        }
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

      {/* Hidden file inputs (hair/clothing only — body uses Electron dialog) */}
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
        onAnimationEnded={() => {
          // When an animation finishes, transition to the idle animation
          // which loops continuously as the default pose
          const idle = animationController.resolve('idle')
          if (idle) {
            setCurrentAnimation(idle)
          }
        }}
        onLoadBody={handleBodySelect}
        debugInfo={debugInfo}
        onDebugInfo={setDebugInfo}
      />

      {/* Floating UI Panels */}
      <AssetPicker
        bodyAsset={bodyAsset}
        hairAsset={hairAsset}
        clothingAsset={clothingAsset}
        onBodySelect={handleBodySelect}
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
