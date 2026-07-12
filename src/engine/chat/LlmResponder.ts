import type { ChatResponse } from '../../types'
import { getMockResponse } from './MockResponder'

/**
 * Conversation message for building LLM context.
 */
export interface ChatHistoryEntry {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Interface for LLM-driven chat responders.
 * Implementations take a user message and return a structured response
 * containing text, optional animation suggestion, and optional expression.
 * An optional history of recent conversation turns can be provided for context.
 */
export interface LlmResponder {
  respond(message: string, history?: ChatHistoryEntry[]): Promise<ChatResponse>
}

/**
 * Mock LLM responder for development/testing.
 * Wraps the existing keyword-based response logic in the LlmResponder interface.
 * Returns the response immediately with no delay.
 *
 * This is a temporary implementation — it will be replaced by a real LLM
 * adapter that calls a local inference endpoint and parses JSON output.
 */
export class MockLlmResponder implements LlmResponder {
  async respond(message: string, _history?: ChatHistoryEntry[]): Promise<ChatResponse> {
    return getMockResponse(message)
  }
}

// Singleton instance — used by default in ChatPanel
export const mockLlmResponder = new MockLlmResponder()
