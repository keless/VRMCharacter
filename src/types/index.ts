// Character asset (VRM file for body, hair, or clothing)
export interface CharacterAsset {
  id: string
  name: string
  category: 'body' | 'hair' | 'clothing'
  filePath: string
  _file?: unknown // internal: the File object for loading
}

// Animation asset (glTF file from Mixamo)
export interface AnimationAsset {
  id: string
  name: string
  filePath: string
  duration: number
  clips: AnimationClipInfo[]
}

export interface AnimationClipInfo {
  name: string
  duration: number
}

// A message in the chat
export interface ChatMessage {
  id: string
  sender: 'user' | 'character'
  text: string
  timestamp: number
  // Optional animation to play when this message appears
  animationId?: string
  // Optional blendshape expression to trigger
  expression?: string
}

// Current state of the character
export interface CharacterState {
  bodyAsset: CharacterAsset | null
  hairAsset: CharacterAsset | null
  clothingAsset: CharacterAsset | null
  currentAnimation: string | null
  currentExpression: string
}

// Response from the chat responder (mock or LLM)
export interface ChatResponse {
  text: string
  animationId?: string
  expression?: string
}
