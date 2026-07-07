import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Load a VRM file from a filesystem path (returns ArrayBuffer)
  loadVrmFromPath: (filePath: string): Promise<Uint8Array> =>
    ipcRenderer.invoke('load-vrm-from-path', filePath),
})
