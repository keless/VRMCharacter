import React, { useState, useRef, useEffect } from 'react'
import { logger } from '../lib/logger'

const chatLog = logger('ChatPanel')
import type { ChatMessage } from '../types'
import type { LlmResponder, ChatHistoryEntry } from '../engine/chat/LlmResponder'
import { animationController } from '../engine/vrm/AnimationController'

interface ChatPanelProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  onCharacterResponse: (response: {
    text: string
    animationId?: string
    expression?: string
  }) => void
  llmResponder: LlmResponder
  llmHistory: ChatHistoryEntry[]
}

export default function ChatPanel({
  messages,
  onSend,
  onCharacterResponse,
  llmResponder,
  llmHistory,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    onSend(text)
    setInput('')
    setSending(true)

    try {
      const response = await llmResponder.respond(text, llmHistory)
      // Resolve the keyword to an actual animation ID
      let animationId: string | undefined
      if (response.animationId) {
        const resolved = animationController.resolve(response.animationId)
        if (resolved) {
          animationId = resolved
        }
      }
      onCharacterResponse({
        text: response.text,
        animationId,
        expression: response.expression,
      })
    } catch (err) {
      chatLog.error('Chat response failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>Chat</span>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.message,
              ...(msg.sender === 'user' ? styles.userMessage : styles.charMessage),
            }}
          >
            <div style={styles.messageText}>{msg.text}</div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div style={{ ...styles.message, ...styles.charMessage }}>
            <div style={styles.typing}>
              <span style={{ ...styles.dot, animationDelay: '0s' }} />
              <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
              <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          ref={inputRef}
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
        />
        <button
          style={{
            ...styles.sendButton,
            ...(sending ? styles.sendButtonDisabled : {}),
          }}
          onClick={handleSend}
          disabled={sending}
        >
          Send
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 360,
    height: 420,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(20, 20, 40, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e0e0e0',
    letterSpacing: 0.5,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  message: {
    maxWidth: '85%',
    padding: '8px 12px',
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  userMessage: {
    alignSelf: 'flex-end',
    background: 'rgba(100, 100, 255, 0.5)',
    color: '#fff',
    borderBottomRightRadius: 4,
  },
  charMessage: {
    alignSelf: 'flex-start',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 13,
  },
  typing: {
    display: 'flex',
    gap: 4,
    padding: '8px 12px',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.5)',
    display: 'inline-block',
  },
  inputRow: {
    display: 'flex',
    padding: 8,
    gap: 8,
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: '#e0e0e0',
    fontSize: 13,
    outline: 'none',
  },
  sendButton: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    background: 'rgba(100, 100, 255, 0.6)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}
