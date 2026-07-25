import React, { useState, useCallback, useRef, useEffect } from 'react'
import CharacterScene from './scenes/CharacterScene'
import ChatPanel from './components/ChatPanel'
import AssetPicker from './components/AssetPicker'
import { loadBuiltInAnimations } from './engine/vrm/AnimationLoader'
import { animationController } from './engine/vrm/AnimationController'
import { RealLlmResponder } from './engine/chat/RealLlmResponder'
import { mockLlmResponder } from './engine/chat/LlmResponder'
import type { ChatHistoryEntry, LlmResponder } from './engine/chat/LlmResponder'
import { logger, setLogging, isEnabled, disableCategory } from './lib/logger'
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
  disableCategory('AnimationPlayer')
}
// Also allow runtime toggle: window.__DEBUG_LOGGING__ = true
Object.defineProperty(window, '__DEBUG_LOGGING__', {
  configurable: true,
  enumerable: false,
  get(): boolean { return isEnabled() },
  set(value: boolean) {
    setLogging(value)
    if (value) disableCategory('AnimationPlayer')
  },
})

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [bodyAsset, setBodyAsset] = useState<CharacterAsset | null>(null)
  const [hairAsset, setHairAsset] = useState<CharacterAsset | null>(null)
  const [clothingAsset, setClothingAsset] = useState<CharacterAsset | null>(null)
  const [animations, setAnimations] = useState<AnimationAsset[]>([])
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null)
  const [appReady, setAppReady] = useState(false)
  const [bodyBuffer, setBodyBuffer] = useState<ArrayBuffer | null>(null)
  const [llmHistory, setLlmHistory] = useState<ChatHistoryEntry[]>([])
  const [driverMode, setDriverMode] = useState<'llm' | 'mock'>('mock')
  const autoLoadedRef = useRef(false)

  // LLM responder instance (loads config at runtime from public/llm-config.json)
  const realResponder = new RealLlmResponder()

  // Active responder — swaps between mock and LLM at runtime
  const activeResponder: LlmResponder = driverMode === 'llm' ? realResponder : mockLlmResponder

  // Diagnostic logger (enabled via VITE_DEBUG_LOGS=1)
  const appLog = logger('App')

  // Animation selection is driven by chat responses via handleCharacterResponse.
  // Start idle animation as soon as the VRM body is loaded.
  useEffect(() => {
    if ((bodyAsset || bodyBuffer) && !currentAnimation) {
      const idle = animationController.resolve('idle')
      if (idle) {
        setCurrentAnimation(idle)
      }
    }
  }, [bodyAsset, bodyBuffer, currentAnimation])

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

    // Load the file via IPC first, then set both asset and buffer together
    // in a single render to prevent the loading effect from firing with
    // a stale buffer (which would show the previous model).
    let bytes: Uint8Array
    try {
      bytes = await window.electronAPI.loadVrmFromPath(filePath)
      appLog.log('Body VRM loaded:', bytes.length, 'bytes')
    } catch (err: unknown) {
      appLog.error('Failed to load body VRM:', err)
      return
    }
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

    const asset: CharacterAsset = {
      id: `body-${filePath}-${Date.now()}`,
      name: filePath.split(/[/\\]/).pop()!.replace(/\.vrm$/i, ''),
      category: 'body',
      filePath,
    }
    setBodyAsset(asset)
    setBodyBuffer(arrayBuffer)
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

      // Track history for LLM context (last 20 exchanges)
      setLlmHistory((prev) => [
        ...prev.slice(-19),
        { role: 'assistant', content: response.text },
      ])

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
          // which loops continuously as the default pose. Skip if already idle.
          if (currentAnimation === 'builtin-idle') return
          const idle = animationController.resolve('idle')
          if (idle) {
            setCurrentAnimation(idle)
          }
        }}
        onLoadBody={handleBodySelect}
      />

      {/* Floating UI Panels */}
      <AssetPicker
        bodyAsset={bodyAsset}
        hairAsset={hairAsset}
        clothingAsset={clothingAsset}
        onBodySelect={handleBodySelect}
        onHairSelect={() => hairInputRef.current?.click()}
        onClothingSelect={() => clothingInputRef.current?.click()}
        driverMode={driverMode}
        onDriverModeChange={setDriverMode}
      />

      <ChatPanel
        messages={messages}
        onSend={handleSendMessage}
        onCharacterResponse={handleCharacterResponse}
        llmResponder={activeResponder}
        llmHistory={llmHistory}
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
}
