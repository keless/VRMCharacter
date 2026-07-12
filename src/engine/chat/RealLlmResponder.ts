import type { ChatResponse } from '../../types'
import type { LlmResponder, ChatHistoryEntry } from './LlmResponder'

interface LlmConfig {
  endpoint: string
  model: string
  contextSize: number
}

interface AnimationDescription {
  id: string
  name: string
  description: string
}

interface AnimationIndex {
  animations: AnimationDescription[]
}

interface LlmRequest {
  model: string
  messages: { role: string; content: string }[]
  temperature?: number
  max_tokens?: number
  response_format?: { type: string }
}

interface LlmResponse {
  choices?: Array<{ message?: { content?: string } }>
}

/**
 * Extract JSON from LLM output that may be wrapped in markdown code fences
 * or surrounded by extra text.
 *
 * Handles patterns like:
 *   - Plain JSON: {"text": "..."}
 *   - Markdown fence: ```json\n{...}\n```
 *   - Markdown fence without lang: ```\n{...}\n```
 *   - Extra text before/after
 */
function extractJson(text: string): string | null {
  // Try the raw text first
  try {
    const parsed = JSON.parse(text)
    return JSON.stringify(parsed)
  } catch { /* fall through */ }

  // Strip markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      const inner = fenceMatch[1].trim()
      JSON.parse(inner) // validate
      return inner
    } catch { /* fall through */ }
  }

  // Try to find a JSON object by locating matching braces
  const firstBrace = text.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      escape = false
      continue
    }

    if (ch === '\\') {
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) {
        const candidate = text.slice(firstBrace, i + 1)
        try {
          JSON.parse(candidate) // validate
          return candidate
        } catch { /* fall through */ }
        break
      }
    }
  }

  return null
}

/**
 * LLM-driven chat responder.
 * Loads configuration from public/llm-config.json at runtime,
 * sends the user message (with system prompt + conversation history)
 * to a local LLM via OpenAI-compatible API, and parses the JSON response.
 *
 * Expected LLM JSON response format:
 * {
 *   "text": "response text here",
 *   "animationId": "animation-id",
 *   "expression": "happy" | "sad" | "neutral"
 * }
 */
export class RealLlmResponder implements LlmResponder {
  private config: LlmConfig | null = null
  private animations: AnimationDescription[] = []

  constructor() {
    this.loadConfig()
  }

  private async loadConfig(): Promise<void> {
    try {
      const configResp = await fetch('/llm-config.json')
      if (!configResp.ok) {
        console.warn('[RealLlmResponder] Could not load llm-config.json:', configResp.status)
        return
      }
      this.config = await configResp.json()
    } catch {
      console.warn('[RealLlmResponder] Failed to load llm-config.json')
    }

    try {
      const animResp = await fetch('/animation-descriptions.json')
      if (!animResp.ok) {
        console.warn('[RealLlmResponder] Could not load animation-descriptions.json:', animResp.status)
        return
      }
      const index: AnimationIndex = await animResp.json()
      this.animations = index.animations
    } catch {
      console.warn('[RealLlmResponder] Failed to load animation-descriptions.json')
    }
  }

  private buildSystemPrompt(): string {
    const animList = this.animations
      .map((a) => `  - "${a.id}" (${a.name}): ${a.description}`)
      .join('\n')

    return `You are a lively VRM virtual companion. Respond naturally to the user's messages.

You MUST respond with a JSON object in this exact format:
{
  "text": "your response text",
  "animationId": "animation-id-from-list",
  "expression": "happy" | "sad" | "neutral"
}

Rules:
- "text" should be a natural, conversational response (keep it short, 1-2 sentences)
- "animationId" MUST be one of the animation IDs listed below
- "expression" is optional but recommended: "happy" for positive emotions, "sad" for negative, "neutral" for everything else
- Do NOT include any text outside the JSON object
- Do NOT wrap the JSON in markdown code fences

Available animations:
${animList}

If you are unsure which animation to use, pick "idle" (the default resting pose).`
  }

  private buildMessages(userMessage: string, history: { role: 'user' | 'assistant'; content: string }[]): LlmRequest['messages'] {
    const messages: LlmRequest['messages'] = [
      { role: 'system', content: this.buildSystemPrompt() },
    ]

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content })
    }

    messages.push({ role: 'user', content: userMessage })
    return messages
  }

  async respond(message: string, history?: ChatHistoryEntry[], attempt: number = 1): Promise<ChatResponse> {
    if (!this.config) {
      console.warn('[RealLlmResponder] Config not loaded yet, using defaults')
    }

    const endpoint = this.config?.endpoint ?? 'http://localhost:8000/v1/chat/completions'
    const model = this.config?.model ?? 'your-model-here'
    const contextSize = this.config?.contextSize ?? 5

    // Limit history to contextSize most recent exchanges
    const recentHistory = history?.slice(-contextSize) ?? []

    let messages = this.buildMessages(message, recentHistory)

    // On retry, add a corrective message so the LLM knows to fix its output
    if (attempt > 1) {
      messages = [...messages.slice(0, -1), { role: 'user', content: `You previously gave an invalid response. Respond with ONLY a JSON object in this exact format:\n{"text": "your response", "animationId": "animation-id", "expression": "happy" | "sad" | "neutral"}\nNo extra text, no markdown.` }]
    }

    try {
      const body: LlmRequest = {
        model,
        messages,
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}`)
      }

      const data: LlmResponse = await response.json()
      const content = data.choices?.[0]?.message?.content ?? ''

      // Extract and parse JSON from the LLM output
      const jsonStr = extractJson(content)

      if (!jsonStr) {
        if (attempt <= 2) {
          // Retry with a stricter prompt
          console.warn(`[RealLlmResponder] Failed to extract JSON (attempt ${attempt}), retrying...`)
          return this.respond(message, history, attempt + 1)
        }
        console.warn('[RealLlmResponder] LLM did not return valid JSON after retries, using fallback')
        return { text: content.trim() || "I'm sorry, I couldn't process that right now.", expression: 'neutral' }
      }

      let parsed: ChatResponse
      try {
        parsed = JSON.parse(jsonStr)
      } catch {
        console.warn('[RealLlmResponder] Extracted text is not valid JSON:', jsonStr)
        return { text: content.trim() || "I'm sorry, I couldn't process that right now.", expression: 'neutral' }
      }

      return {
        text: parsed.text ?? '...',
        animationId: parsed.animationId,
        expression: parsed.expression,
      }
    } catch (err) {
      console.error('[RealLlmResponder] LLM request failed:', err)
      // Return a fallback response so the chat doesn't break
      return { text: "I'm sorry, I couldn't process that right now.", expression: 'sad' }
    }
  }
}
