import type { ChatResponse } from '../../types'

// Keyword → response mapping for the mock responder.
// animationId here is a SEMANTIC KEYWORD (e.g., "greet", "nod", "dance")
// that the AnimationController resolves to an actual animation file.
interface ResponseEntry {
  keywords: string[]
  responses: ChatResponse[]
}

const RESPONSES: ResponseEntry[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings', 'good'],
    responses: [
      { text: "Hello there! Nice to see you! *waves*", animationId: 'greet', expression: 'happy' },
      { text: 'Hey! How are you doing today?', animationId: 'nod', expression: 'happy' },
      { text: "Hi! I'm glad you stopped by!", animationId: 'acknowledge', expression: 'happy' },
    ],
  },
  {
    keywords: ['how', 'are', 'you', 'doing', 'feel'],
    responses: [
      { text: "I'm doing great, thanks for asking! *smiles*", animationId: 'excited', expression: 'happy' },
      { text: "Pretty good! Ready to hang out. How about you?", animationId: 'weight-shift', expression: 'happy' },
    ],
  },
  {
    keywords: ['name', 'who', 'what are you'],
    responses: [
      { text: "I'm your virtual companion! You can give me a name if you'd like.", animationId: 'nod', expression: 'neutral' },
    ],
  },
  {
    keywords: ['love', 'like', 'cute', 'pretty', 'beautiful'],
    responses: [
      { text: "Aww, thank you! *blushes* That's really sweet of you to say.", animationId: 'greet', expression: 'happy' },
      { text: 'You are too kind! *happy dance*', animationId: 'dance', expression: 'happy' },
    ],
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'leave'],
    responses: [
      { text: "Goodbye! Come back soon! *waves goodbye*", animationId: 'greet', expression: 'sad' },
      { text: 'See you later! Have a wonderful day!', animationId: 'nod', expression: 'happy' },
    ],
  },
  {
    keywords: ['joke', 'funny', 'laugh'],
    responses: [
      { text: 'Why did the VRM model cross the road? To show off its blendshapes! *giggles*', animationId: 'nod', expression: 'happy' },
      { text: "What do you call a VRoid who tells jokes? A stand-up character! *laughs*", animationId: 'dance', expression: 'happy' },
    ],
  },
  {
    keywords: ['music', 'song', 'sing', 'dance'],
    responses: [
      { text: "I can't really sing, but I'd love to dance! Want to see an animation?", animationId: 'dance', expression: 'happy' },
    ],
  },
  {
    keywords: ['help', 'what can', 'features', 'do'],
    responses: [
      { text: "I can chat with you, react to what you say, and show animations! I have over 50 animations ready to go.", expression: 'neutral' },
    ],
  },
  {
    keywords: ['animation', 'anim', 'move', 'motion'],
    responses: [
      { text: "I have lots of animations ready! Try saying hello, or ask me to dance!", animationId: 'excited', expression: 'happy' },
      { text: 'Want to see me move? Just chat with me and I\'ll react!', animationId: 'nod', expression: 'happy' },
    ],
  },
  {
    keywords: ['walk', 'walking', 'move around'],
    responses: [
      { text: "Let me show you around! *starts walking*", animationId: 'walk', expression: 'happy' },
      { text: 'I love to walk! Want to see me run?', animationId: 'running', expression: 'happy' },
    ],
  },
  {
    keywords: ['run', 'running', 'sprint', 'race'],
    responses: [
      { text: "Here I go! *sprints off*", animationId: 'running', expression: 'happy' },
      { text: 'Running is fun! *jogs in place*', animationId: 'jogging', expression: 'happy' },
    ],
  },
  {
    keywords: ['sad', 'upset', 'cry', 'depressed', 'unhappy'],
    responses: [
      { text: "Oh no, what's wrong? *looks concerned*", animationId: 'defeat', expression: 'sad' },
      { text: 'I\'m sorry you feel that way. I\'m here for you.', animationId: 'praying', expression: 'sad' },
    ],
  },
  {
    keywords: ['clap', 'applause', 'great', 'awesome', 'bravo'],
    responses: [
      { text: "Thank you! *claps happily*", animationId: 'clapping', expression: 'happy' },
      { text: 'Yay! *claps*', animationId: 'sitting-clap', expression: 'happy' },
    ],
  },
  {
    keywords: ['yawn', 'tired', 'sleep', 'bored', 'sleepy'],
    responses: [
      { text: "*yawns* Maybe I should take a break...", animationId: 'yawn', expression: 'neutral' },
      { text: 'I\'m getting sleepy... *lies down*', animationId: 'laying-sleeping', expression: 'neutral' },
    ],
  },
  {
    keywords: ['nod', 'yes', 'agree', 'agreed'],
    responses: [
      { text: "Yeah, I totally agree! *nods*", animationId: 'nod', expression: 'happy' },
      { text: "You're absolutely right! *nods vigorously*", animationId: 'hard-nod', expression: 'happy' },
    ],
  },
  {
    keywords: ['no', 'disagree', 'wrong', 'incorrect', 'nope'],
    responses: [
      { text: "Hmm, I'm not sure about that... *shakes head*", animationId: 'shake-no', expression: 'neutral' },
      { text: "I see it differently. *thoughtful shake*", animationId: 'thoughtful-shake', expression: 'neutral' },
    ],
  },
  {
    keywords: ['sit', 'sit down', 'rest', 'relax', 'take a seat'],
    responses: [
      { text: "Sure, let me take a seat. *sits down*", animationId: 'sit', expression: 'neutral' },
      { text: "Okay, I'm resting now.", animationId: 'sitting-angry', expression: 'neutral' },
    ],
  },
  {
    keywords: ['excited', 'awesome', 'cool', 'fun', 'yay', 'woo'],
    responses: [
      { text: "I'm so excited too! *bounces around*", animationId: 'excited', expression: 'happy' },
    ],
  },
  {
    keywords: ['wave', 'greeting', 'greet', 'hello there'],
    responses: [
      { text: "Hello there! *waves enthusiastically*", animationId: 'greet', expression: 'happy' },
    ],
  },
  {
    keywords: ['jump', 'jumping', 'leap', 'hop'],
    responses: [
      { text: "Boing! *jumps up*", animationId: 'jump', expression: 'happy' },
    ],
  },
  {
    keywords: ['pose', 'posing', 'stand', 'standing'],
    responses: [
      { text: "*strikes a pose*", animationId: 'pose', expression: 'neutral' },
    ],
  },
  {
    keywords: ['laugh', 'giggle', 'chuckle', 'snicker'],
    responses: [
      { text: "*giggles*", animationId: 'excited', expression: 'happy' },
    ],
  },
  {
    keywords: ['secret', 'whisper', 'confide'],
    responses: [
      { text: "*leans in close* Let me tell you a secret...", animationId: 'telling-secret', expression: 'happy' },
    ],
  },
  {
    keywords: ['robot', 'robotic', 'mechanical'],
    responses: [
      { text: "*beep boop* I am but a humble robot...", animationId: 'x-bot', expression: 'neutral' },
    ],
  },
  {
    keywords: ['pray', 'plead', 'beg', 'hope'],
    responses: [
      { text: "*prays earnestly* I hope things get better...", animationId: 'praying', expression: 'sad' },
    ],
  },
  {
    keywords: ['look away', 'shy', 'embarrassed'],
    responses: [
      { text: "*looks away shyly* ...", animationId: 'look-away', expression: 'neutral' },
    ],
  },
  {
    keywords: ['cocky', 'arrogant', 'smug', 'swag'],
    responses: [
      { text: "*strikes a cocky pose* Yeah, I know I'm awesome.", animationId: 'being-cocky', expression: 'happy' },
    ],
  },
  {
    keywords: ['dismissive', 'whatever', 'shrug'],
    responses: [
      { text: "*dismisses with a wave* Whatever...", animationId: 'dismissing-gesture', expression: 'neutral' },
    ],
  },
  {
    keywords: ['angry', 'mad', 'furious', 'annoyed'],
    responses: [
      { text: "*throws hands up in frustration* Ugh!", animationId: 'angry-gesture', expression: 'angry' },
    ],
  },
  {
    keywords: ['snatch', 'grab', 'steal'],
    responses: [
      { text: "*snatches it!* Mine now!", animationId: 'snatch', expression: 'happy' },
    ],
  },
  {
    keywords: ['open', 'present', 'showcase'],
    responses: [
      { text: "*opens arms wide* Let me show you!", animationId: 'opening', expression: 'happy' },
    ],
  },
  {
    keywords: ['button', 'push button'],
    responses: [
      { text: "*presses the big red button*", animationId: 'button-pushing', expression: 'happy' },
    ],
  },
  {
    keywords: ['turn', 'left', 'right'],
    responses: [
      { text: "*turns around*", animationId: 'left-turn', expression: 'neutral' },
    ],
  },
  {
    keywords: ['strafe', 'slide', 'side step'],
    responses: [
      { text: "*slides to the side*", animationId: 'left-strafe', expression: 'neutral' },
    ],
  },
  {
    keywords: ['squat', 'deep squat'],
    responses: [
      { text: "*squats down*", animationId: 'vrma-squat', expression: 'neutral' },
    ],
  },
  {
    keywords: ['spin', 'twirl', 'rotate'],
    responses: [
      { text: "*spins around*", animationId: 'vrma-spin', expression: 'happy' },
    ],
  },
  {
    keywords: ['peace', 'v sign', 'victory'],
    responses: [
      { text: "*peace sign!*", animationId: 'vrma-peace', expression: 'happy' },
    ],
  },
]

// Default response when no keywords match
const DEFAULT_RESPONSES: ChatResponse[] = [
  { text: "That's interesting! Tell me more.", animationId: 'nod', expression: 'neutral' },
  { text: "Hmm, I'm not sure what to say to that. *tilts head*", animationId: 'thoughtful-shake', expression: 'neutral' },
  { text: 'Oh? Go on...', expression: 'neutral' },
  { text: "I see! What else is on your mind?", animationId: 'weight-shift', expression: 'neutral' },
]

/**
 * Mock chat responder.
 * Matches user input against keyword patterns and returns a random matching response.
 * Falls back to default responses when no keywords match.
 *
 * The animationId field contains a SEMANTIC KEYWORD (e.g., "greet", "nod", "dance")
 * that the AnimationController resolves to an actual animation file at runtime.
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
