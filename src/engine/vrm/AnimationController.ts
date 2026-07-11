import type { AnimationAsset } from '../../types'

/**
 * Semantic keyword → animation ID mapping.
 * VRMA animations are listed first (VRM-native, correct skeleton).
 * FBX fallbacks are listed after (Mixamo skeleton, won't animate VRM correctly).
 * Order matters: first match wins.
 */
const KEYWORD_MAP: { keywords: string[]; animationId: string }[] = [
  // === VRMA animations (VRM-native, correct skeleton) ===
  // Greetings
  { keywords: ['hello', 'hi', 'hey', 'greet', 'greeting', 'wave', 'hello there', 'good morning', 'good afternoon', 'good evening', 'bow', 'formal greeting'], animationId: 'vrma-greeting' },
  // Peace / victory
  { keywords: ['peace', 'peace sign', 'v sign', 'victory'], animationId: 'vrma-peace' },
  // Spin
  { keywords: ['spin', 'spin around', 'twirl', 'rotate'], animationId: 'vrma-spin' },
  // Squat
  { keywords: ['squat', 'squatting', 'deep squat'], animationId: 'vrma-squat' },
  // Shoot / point
  { keywords: ['shoot', 'pointing', 'aim', 'target'], animationId: 'vrma-shoot' },
  // Model pose
  { keywords: ['pose', 'posing', 'model pose', 'fashion pose', 'stand', 'standing', 'stand still', 'freeze', 'default pose'], animationId: 'vrma-pose' },
  // Full body
  { keywords: ['full body', 'full body animation', 'dance', 'dancing', 'twerk', 'boogie', 'groove', 'jam', 'move it', 'celebrate', 'party'], animationId: 'vrma-full-body' },

  // === FBX fallbacks (Mixamo skeleton — may not animate correctly on VRM) ===
  // Greetings / acknowledgments
  { keywords: ['acknowledge', 'acknowledging', 'acknowledgement', 'nod', 'yes', 'agree', 'agreed', 'sure', 'right', 'exactly'], animationId: 'acknowledging' },
  { keywords: ['hard nod', 'vigorously nod', 'strong nod'], animationId: 'hard-nod' },
  { keywords: ['lengthy nod', 'long nod', 'deep nod'], animationId: 'lengthy-nod' },
  { keywords: ['sarcastic nod', 'sarcastic', 'ironic', 'doubt', 'skeptical', 'hmm', 'really'], animationId: 'sarcastic-nod' },

  // Negation / disagreement
  { keywords: ['no', 'nope', 'deny', 'disagree', 'wrong', 'incorrect', 'false', 'never', 'not'], animationId: 'shake-no' },
  { keywords: ['thoughtful', 'thinking', 'think about', 'ponder', 'consider', 'let me see'], animationId: 'thoughtful-shake' },
  { keywords: ['annoyed', 'annoying', 'irritated', 'frustrated', 'ugh', 'come on'], animationId: 'annoyed-head-shake' },
  { keywords: ['angry', 'mad', 'furious', 'pissed', 'rage', 'annoying gesture'], animationId: 'angry-gesture' },

  // Happiness / positive
  { keywords: ['happy', 'glad', 'joy', 'excited', 'awesome', 'cool', 'great', 'fantastic', 'wonderful', 'amazing', 'yay', 'woo'], animationId: 'excited' },
  { keywords: ['clap', 'clapping', 'applause', 'bravo', 'hand gesture', 'happy gesture'], animationId: 'clapping' },
  { keywords: ['cute', 'pretty', 'beautiful', 'love', 'like', 'adorable', 'sweet', 'charming'], animationId: 'happy-gesture' },
  { keywords: ['weight shift', 'shifting', 'casual', 'chill', 'relaxed', 'leaning'], animationId: 'weight-shift' },
  { keywords: ['look away', 'looking away', 'shy', 'embarrassed', 'bashful', 'coy'], animationId: 'look-away' },

  // Sadness / negative
  { keywords: ['sad', 'unhappy', 'depressed', 'down', 'cry', 'crying', 'tears', 'upset', 'heartbroken'], animationId: 'defeat' },
  { keywords: ['sigh', 'relieved', 'phew', 'relief', 'whew'], animationId: 'relieved-sigh' },

  // Communication / expressions
  { keywords: ['joke', 'funny', 'laugh', 'haha', 'lol', 'humor', 'humour', 'comedy'], animationId: 'excited' },
  { keywords: ['secret', 'tell a secret', 'whisper', 'confide', 'confession'], animationId: 'telling-secret' },
  { keywords: ['look over shoulder', 'looking over shoulder', 'peek', 'sneak', 'curious'], animationId: 'look-over-shoulder' },
  { keywords: ['cocky', 'arrogant', 'smug', 'conceited', 'swag', 'cool guy'], animationId: 'being-cocky' },
  { keywords: ['dismissive', 'dismissing', 'whatever', 'shrug', 'idc', 'i dont care'], animationId: 'dismissing-gesture' },

  // Movement
  { keywords: ['walk', 'walking', 'stroll', 'amble', 'wander'], animationId: 'walking' },
  { keywords: ['run', 'running', 'jog', 'sprint', 'dash', 'race', 'hurry'], animationId: 'running' },
  { keywords: ['jog', 'jogging'], animationId: 'jogging' },
  { keywords: ['jump', 'jumping', 'leap', 'hop', 'bounce'], animationId: 'jump' },
  { keywords: ['start walk', 'start walking', 'begin walk', 'lets go', 'lets walk'], animationId: 'start-walking' },
  { keywords: ['left turn', 'turn left', 'left'], animationId: 'left-turn' },
  { keywords: ['right turn', 'turn right', 'right'], animationId: 'right-turn' },
  { keywords: ['left strafe', 'strafe left', 'move left', 'go left'], animationId: 'left-strafe' },
  { keywords: ['right strafe', 'strafe right', 'move right', 'go right'], animationId: 'right-strafe' },
  { keywords: ['left walk', 'walk left'], animationId: 'left-strafe-walk' },
  { keywords: ['right walk', 'walk right'], animationId: 'right-strafe-walk' },

  // Poses / states
  { keywords: ['sit', 'sitting', 'sit down', 'take a seat', 'seat'], animationId: 'sitting' },
  { keywords: ['sit angry', 'angry sit', 'mad sit', 'pout'], animationId: 'sitting-angry' },
  { keywords: ['sit clap', 'sitting clap', 'seat clap'], animationId: 'sitting-clap' },
  { keywords: ['yawn', 'yawning', 'tired', 'sleepy', 'sleep', 'bored', 'boring', 'rest', 'nap'], animationId: 'yawn' },
  { keywords: ['lay', 'laying', 'lying', 'lay down', 'lie down', 'sleeping', 'bed', 'resting'], animationId: 'laying-sleeping' },
  { keywords: ['locomotion', 'locomotion pose', 'ready pose'], animationId: 'female-locomotion' },
  { keywords: ['open', 'opening', 'present', 'showcase', 'display'], animationId: 'opening' },
  { keywords: ['button', 'pushing', 'push button', 'press button'], animationId: 'button-pushing' },
  { keywords: ['pray', 'praying', 'plead', 'beg', 'hope', 'wish'], animationId: 'praying' },
  { keywords: ['snatch', 'grab', 'grabbing', 'steal', 'take'], animationId: 'snatch' },
  { keywords: ['x-bot', 'robot', 'robotic', 'mechanical'], animationId: 'x-bot' },
  { keywords: ['female lay', 'female laying', 'laying pose'], animationId: 'female-laying-pose' },
  { keywords: ['male lay', 'male laying', 'male laying pose'], animationId: 'male-laying' },
  { keywords: ['situp', 'sit up', 'get up', 'stand up', 'rise'], animationId: 'situp-to-idle' },
]

/**
 * AnimationController manages the mapping between semantic keywords
 * and actual animation files. The AI/chat layer uses keywords; the
 * controller resolves them to the best available animation.
 */
export class AnimationController {
  private assets: AnimationAsset[] = []
  private loadedClipNames = new Map<string, string>() // animationId → primary clip name

  /**
   * Register available animation assets.
   */
  setAssets(assets: AnimationAsset[]): void {
    this.assets = assets
  }

  /**
   * Register a clip name for an animation ID (called when AnimationPlayer loads a clip).
   * animationId is the full asset ID (e.g., "builtin-standing-greeting").
   */
  registerClip(animationId: string, clipName: string): void {
    // Only set if not already registered (first clip wins for single-clip animations)
    if (!this.loadedClipNames.has(animationId)) {
      this.loadedClipNames.set(animationId, clipName)
    }
  }

  /**
   * Resolve a semantic keyword to an animation ID.
   * Returns the FULL asset ID (e.g., "builtin-standing-greeting") so it matches loaded clips.
   */
  resolve(keyword: string): string | null {
    const lower = keyword.toLowerCase().trim()

    // Try exact keyword match first (longer keywords first to prefer specific matches)
    const sorted = [...KEYWORD_MAP].sort((a, b) => b.keywords.length - a.keywords.length)
    for (const entry of sorted) {
      for (const kw of entry.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          // Return the full asset ID with builtin- prefix
          return `builtin-${entry.animationId}`
        }
      }
    }

    return null
  }

  /**
   * Get the clip key for a full animation ID.
   * Returns null if no clip name is registered — callers should fall back to
   * searching by animation ID prefix.
   */
  getClipKey(animationId: string): string | null {
    const clipName = this.loadedClipNames.get(animationId)
    if (clipName) {
      return `${animationId}:${clipName}`
    }
    return null
  }

  /**
   * List all available animation IDs.
   */
  listAnimations(): { id: string; name: string }[] {
    return this.assets.map((a) => ({ id: a.id.replace('builtin-', ''), name: a.name }))
  }
}

// Singleton instance
export const animationController = new AnimationController()
