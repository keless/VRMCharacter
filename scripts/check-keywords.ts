/**
 * Audit which keywords resolve to the correct animation.
 */

interface KeywordEntry {
  keywords: string[]
  animationId: string
}

const KEYWORD_MAP: KeywordEntry[] = [
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

async function main() {
  // Build expected map: animationId → keywords that should resolve to it
  const expectedMap = new Map<string, string[]>()
  for (const entry of KEYWORD_MAP) {
    const id = `builtin-${entry.animationId}`
    if (!expectedMap.has(id)) expectedMap.set(id, [])
    for (const kw of entry.keywords) {
      expectedMap.get(id)!.push(kw)
    }
  }

  console.log('=== Keyword Resolution Audit ===\n')

  let totalTests = 0
  let mismatches = 0
  const mismatchesList: { keyword: string; expected: string; got: string }[] = []

  for (const [expectedId, keywords] of expectedMap) {
    for (const kw of keywords) {
      totalTests++
      const got = resolve(kw)
      if (got !== expectedId) {
        mismatches++
        mismatchesList.push({ keyword: kw, expected: expectedId, got })
      }
    }
  }

  console.log(`Total keyword tests: ${totalTests}`)
  console.log(`Mismatches: ${mismatches}`)
  console.log()

  if (mismatchesList.length > 0) {
    console.log('=== MISMATCHES ===\n')
    const byGot = new Map<string, typeof mismatchesList>()
    for (const m of mismatchesList) {
      if (!byGot.has(m.got)) byGot.set(m.got, [])
      byGot.get(m.got)!.push(m)
    }
    for (const [got, matches] of byGot) {
      console.log(`Resolves to ${got} (${matches.length} keywords):`)
      for (const m of matches) {
        console.log(`  "${m.keyword}" → expected ${m.expected}`)
      }
      console.log()
    }
  } else {
    console.log('All keywords resolve correctly!')
  }
}

main()
