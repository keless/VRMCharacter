import type { ChatResponse } from '../../types'

// Keyword → response mapping for the mock responder
interface ResponseEntry {
  keywords: string[]
  responses: ChatResponse[]
}

const RESPONSES: ResponseEntry[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings', 'good'],
    responses: [
      {
        text: "Hello there! Nice to see you! *waves*",
        animationId: 'wave',
        expression: 'happy',
      },
      {
        text: 'Hey! How are you doing today?',
        animationId: 'nod',
        expression: 'happy',
      },
      {
        text: "Hi! I'm glad you stopped by!",
        expression: 'happy',
      },
    ],
  },
  {
    keywords: ['how', 'are', 'you', 'doing', 'feel'],
    responses: [
      {
        text: "I'm doing great, thanks for asking! *smiles*",
        expression: 'happy',
      },
      {
        text: "Pretty good! Ready to hang out. How about you?",
        animationId: 'wave',
        expression: 'happy',
      },
    ],
  },
  {
    keywords: ['name', 'who', 'what are you'],
    responses: [
      {
        text: "I'm your virtual companion! You can give me a name if you'd like.",
        expression: 'neutral',
      },
    ],
  },
  {
    keywords: ['love', 'like', 'cute', 'pretty', 'beautiful'],
    responses: [
      {
        text: "Aww, thank you! *blushes* That's really sweet of you to say.",
        expression: 'happy',
        animationId: 'bow',
      },
      {
        text: 'You are too kind! *happy dance*',
        expression: 'happy',
        animationId: 'dance',
      },
    ],
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'leave'],
    responses: [
      {
        text: "Goodbye! Come back soon! *waves goodbye*",
        animationId: 'wave',
        expression: 'sad',
      },
      {
        text: 'See you later! Have a wonderful day!',
        animationId: 'bow',
        expression: 'happy',
      },
    ],
  },
  {
    keywords: ['joke', 'funny', 'laugh'],
    responses: [
      {
        text: 'Why did the VRM model cross the road? To show off its blendshapes! *giggles*',
        expression: 'happy',
        animationId: 'nod',
      },
      {
        text: "What do you call a VRoid who tells jokes? A stand-up character! *laughs*",
        expression: 'happy',
      },
    ],
  },
  {
    keywords: ['music', 'song', 'sing'],
    responses: [
      {
        text: "I can't really sing, but I'd love to dance! Want to see an animation?",
        animationId: 'dance',
        expression: 'happy',
      },
    ],
  },
  {
    keywords: ['help', 'what can', 'features', 'do'],
    responses: [
      {
        text: "I can chat with you, react to what you say, and show animations! You can also change my hair and clothes using the panel in the corner.",
        expression: 'neutral',
      },
    ],
  },
]

// Default response when no keywords match
const DEFAULT_RESPONSES: ChatResponse[] = [
  {
    text: "That's interesting! Tell me more.",
    expression: 'neutral',
  },
  {
    text: "Hmm, I'm not sure what to say to that. *tilts head*",
    expression: 'neutral',
    animationId: 'nod',
  },
  {
    text: 'Oh? Go on...',
    expression: 'neutral',
  },
  {
    text: "I see! What else is on your mind?",
    expression: 'neutral',
  },
]

/**
 * Mock chat responder.
 * Matches user input against keyword patterns and returns a random matching response.
 * Falls back to default responses when no keywords match.
 */
export function getMockResponse(message: string): ChatResponse {
  const lower = message.toLowerCase().trim()

  // Find matching entries
  const matches = RESPONSES.filter((entry) =>
    entry.keywords.some((kw) => lower.includes(kw))
  )

  // Pick a random response from matching entries, or use default
  const pool = matches.length > 0 ? matches : [{ responses: DEFAULT_RESPONSES }]
  const entry = pool[Math.floor(Math.random() * pool.length)]
  const responses = entry.responses
  return responses[Math.floor(Math.random() * responses.length)]
}

/**
 * Interface for chat responders.
 * MockResponder implements this; LLM adapter can be swapped in later.
 */
export interface ChatResponder {
  respond(message: string): Promise<ChatResponse>
}

/**
 * MockResponder class implementation.
 */
export class MockResponderImpl implements ChatResponder {
  async respond(message: string): Promise<ChatResponse> {
    // Simulate a small delay for realism
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000))
    return getMockResponse(message)
  }
}

export const mockResponder = new MockResponderImpl()
