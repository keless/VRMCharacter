export interface OpenDialogOptions {
  title?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: string[]
}

export interface OpenDialogResult {
  canceled: boolean
  filePaths: string[]
}

export interface ElectronAPI {
  // Load a VRM file from a filesystem path (returns ArrayBuffer)
  loadVrmFromPath: (filePath: string) => Promise<Uint8Array>
  // Show a file picker dialog and return selected paths
  showOpenFileDialog: (options: OpenDialogOptions) => Promise<OpenDialogResult>
  // Save a preference key-value pair
  savePreference: (key: string, value: string) => Promise<boolean>
  // Load a preference value by key
  loadPreference: (key: string) => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
