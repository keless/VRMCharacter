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
  // Model pose / standing
  { keywords: ['female standing pose', 'female standing', 'standing pose', 'standing', 'stand', 'stand still', 'freeze', 'default pose'], animationId: 'female-standing' },
  { keywords: ['pose', 'posing', 'model pose', 'fashion pose'], animationId: 'vrma-pose' },
  // Full body / dance
  { keywords: ['dancing', 'twerk', 'dance', 'boogie', 'groove', 'jam', 'move it', 'celebrate', 'party'], animationId: 'dance' },
  { keywords: ['full body', 'full body animation'], animationId: 'vrma-full-body' },

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
  { keywords: ['run', 'running', 'sprint', 'dash', 'race', 'hurry'], animationId: 'running' },
  { keywords: ['jog', 'jogging'], animationId: 'jogging' },
  { keywords: ['jump', 'jumping', 'leap', 'hop', 'bounce'], animationId: 'jump' },
  { keywords: ['start walk', 'start walking', 'begin walk', 'lets go', 'lets walk'], animationId: 'start-walking' },
  { keywords: ['left turn', 'turn left', 'left'], animationId: 'left-turn' },
  { keywords: ['right turn', 'turn right'], animationId: 'right-turn' },
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
   *
   * Keywords are matched by length (longest first) so that multi-word phrases like
   * "weight shift" are checked before short substrings like "hi" or "no" that could
   * appear inside other words (e.g., "shif**ting**", "disagre**e**").
   */
  resolve(keyword: string): string | null {
    // Normalize: replace hyphens with spaces so "weight-shift" matches "weight shift"
    // and "look over shoulder" style keywords work regardless of separator.
    const lower = keyword.toLowerCase().trim().replace(/-/g, ' ')

    // Flatten all keywords with their entry animationId, sort by length descending.
    // This ensures "weight shift" (12 chars) is checked before "hi" (2 chars).
    const flat: { kw: string; animationId: string }[] = []
    for (const entry of KEYWORD_MAP) {
      for (const kw of entry.keywords) {
        flat.push({ kw: kw.toLowerCase().replace(/-/g, ' '), animationId: entry.animationId })
      }
    }
    flat.sort((a, b) => b.kw.length - a.kw.length)

    for (const { kw, animationId } of flat) {
      if (lower.includes(kw)) {
        return `builtin-${animationId}`
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
