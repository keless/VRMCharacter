export interface ElectronAPI {
  loadVrmFromPath: (filePath: string) => Promise<Uint8Array>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
