/**
 * Test specific user inputs to see what animations they resolve to.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load the actual AnimationController
const index = JSON.parse(readFileSync(resolve(__dirname, '../public/animations/index.json'), 'utf8'))
const animationMap = new Map<string, string>()
for (const entry of index.animations) {
  animationMap.set(entry.id, entry.name)
}

// Reproduce the resolve function from AnimationController
const KEYWORD_MAP: { keywords: string[]; animationId: string }[] = [
  { keywords: ['hello', 'hi', 'hey', 'greet', 'greeting', 'wave', 'hello there', 'good morning', 'good afternoon', 'good evening', 'bow', 'formal greeting'], animationId: 'vrma-greeting' },
  { keywords: ['peace', 'peace sign', 'v sign', 'victory'], animationId: 'vrma-peace' },
  { keywords: ['spin', 'spin around', 'twirl', 'rotate'], animationId: 'vrma-spin' },
  { keywords: ['squat', 'squatting', 'deep squat'], animationId: 'vrma-squat' },
  { keywords: ['shoot', 'pointing', 'aim', 'target'], animationId: 'vrma-shoot' },
  { keywords: ['pose', 'posing', 'model pose', 'fashion pose', 'stand', 'standing', 'stand still', 'freeze', 'default pose'], animationId: 'vrma-pose' },
  { keywords: ['full body', 'full body animation', 'dance', 'dancing', 'twerk', 'boogie', 'groove', 'jam', 'move it', 'celebrate', 'party'], animationId: 'vrma-full-body' },
  { keywords: ['acknowledge', 'acknowledging', 'acknowledgement', 'nod', 'yes', 'agree', 'agreed', 'sure', 'right', 'exactly'], animationId: 'acknowledging' },
  { keywords: ['hard nod', 'vigorously nod', 'strong nod'], animationId: 'hard-nod' },
  { keywords: ['lengthy nod', 'long nod', 'deep nod'], animationId: 'lengthy-nod' },
  { keywords: ['sarcastic nod', 'sarcastic', 'ironic', 'doubt', 'skeptical', 'hmm', 'really'], animationId: 'sarcastic-nod' },
  { keywords: ['no', 'nope', 'deny', 'disagree', 'wrong', 'incorrect', 'false', 'never', 'not'], animationId: 'shake-no' },
  { keywords: ['thoughtful', 'thinking', 'think about', 'ponder', 'consider', 'let me see'], animationId: 'thoughtful-shake' },
  { keywords: ['annoyed', 'annoying', 'irritated', 'frustrated', 'ugh', 'come on'], animationId: 'annoyed-head-shake' },
  { keywords: ['angry', 'mad', 'furious', 'pissed', 'rage', 'annoying gesture'], animationId: 'angry-gesture' },
  { keywords: ['happy', 'glad', 'joy', 'excited', 'awesome', 'cool', 'great', 'fantastic', 'wonderful', 'amazing', 'yay', 'woo'], animationId: 'excited' },
  { keywords: ['clap', 'clapping', 'applause', 'bravo', 'hand gesture', 'happy gesture'], animationId: 'clapping' },
  { keywords: ['cute', 'pretty', 'beautiful', 'love', 'like', 'adorable', 'sweet', 'charming'], animationId: 'happy-gesture' },
  { keywords: ['weight shift', 'shifting', 'casual', 'chill', 'relaxed', 'leaning'], animationId: 'weight-shift' },
  { keywords: ['look away', 'looking away', 'shy', 'embarrassed', 'bashful', 'coy'], animationId: 'look-away' },
  { keywords: ['sad', 'unhappy', 'depressed', 'down', 'cry', 'crying', 'tears', 'upset', 'heartbroken'], animationId: 'defeat' },
  { keywords: ['sigh', 'relieved', 'phew', 'relief', 'whew'], animationId: 'relieved-sigh' },
  { keywords: ['joke', 'funny', 'laugh', 'haha', 'lol', 'humor', 'humour', 'comedy'], animationId: 'excited' },
  { keywords: ['secret', 'tell a secret', 'whisper', 'confide', 'confession'], animationId: 'telling-secret' },
  { keywords: ['look over shoulder', 'looking over shoulder', 'peek', 'sneak', 'curious'], animationId: 'look-over-shoulder' },
  { keywords: ['cocky', 'arrogant', 'smug', 'conceited', 'swag', 'cool guy'], animationId: 'being-cocky' },
  { keywords: ['dismissive', 'dismissing', 'whatever', 'shrug', 'idc', 'i dont care'], animationId: 'dismissing-gesture' },
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

function resolve(keyword: string): string | null {
  const lower = keyword.toLowerCase().trim()
  const flat: { kw: string; animationId: string }[] = []
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      flat.push({ kw: kw.toLowerCase(), animationId: entry.animationId })
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

// Test the specific failing inputs
const tests = [
  'dancing twerk',
  'dancing',
  'twerk',
  'weight shift',
  'weight',
  'female standing pose',
  'female standing',
  'standing pose',
  'standing',
  'pose',
  'female locomotion',
  'locomotion',
]

console.log('=== Specific Input Tests ===\n')
for (const input of tests) {
  const resolved = resolve(input)
  // Find the animation name from the index
  let animName = '?'
  if (resolved) {
    // Try to find matching animation in index
    for (const entry of index.animations) {
      if (entry.id === resolved.replace('builtin-', '') || resolved.includes(entry.id)) {
        animName = entry.name
        break
      }
    }
    // Also check if it's a vrma animation
    if (animName === '?') {
      const vrmaMap: Record<string, string> = {
        'vrma-greeting': 'Standing Greeting',
        'vrma-peace': 'Peace',
        'vrma-spin': 'Spin',
        'vrma-squat': 'Squat',
        'vrma-shoot': 'Shoot',
        'vrma-pose': 'Female Standing Pose',
        'vrma-full-body': 'Dancing Twerk',
      }
      animName = vrmaMap[resolved.replace('builtin-', '')] || resolved
    }
  }
  console.log(`  '${input}' → ${resolved} (${animName})`)
}

// Also show which keywords matched for each
console.log('\n=== Match Details ===\n')
for (const input of tests) {
  const lower = input.toLowerCase().trim()
  const flat: { kw: string; animationId: string }[] = []
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      flat.push({ kw: kw.toLowerCase(), animationId: entry.animationId })
    }
  }
  flat.sort((a, b) => b.kw.length - a.kw.length)
  // Find all matching keywords
  const matches: { kw: string; animationId: string }[] = []
  for (const { kw, animationId } of flat) {
    if (lower.includes(kw)) {
      matches.push({ kw, animationId })
    }
  }
  if (matches.length > 0 && matches.length < 5) {
    console.log(`  '${input}':`)
    for (const m of matches) {
      console.log(`    matches '${m.kw}' → ${m.animationId}`)
    }
    console.log()
  } else if (matches.length >= 5) {
    console.log(`  '${input}': ${matches.length} matches (showing top 3):`)
    for (const m of matches.slice(0, 3)) {
      console.log(`    matches '${m.kw}' → ${m.animationId}`)
    }
    console.log()
  }
}
