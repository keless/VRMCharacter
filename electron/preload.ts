import { contextBridge, ipcRenderer, OpenDialogOptions } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Load a VRM file from a filesystem path (returns ArrayBuffer)
  loadVrmFromPath: (filePath: string): Promise<Uint8Array> =>
    ipcRenderer.invoke('load-vrm-from-path', filePath),
  // Show a file picker dialog and return selected paths
  showOpenFileDialog: (options: OpenDialogOptions): Promise<{ canceled: boolean; filePaths: string[] }> =>
    ipcRenderer.invoke('show-open-file-dialog', options),
  // Save a preference key-value pair
  savePreference: (key: string, value: string): Promise<boolean> =>
    ipcRenderer.invoke('save-preference', key, value),
  // Load a preference value by key
  loadPreference: (key: string): Promise<string | null> =>
    ipcRenderer.invoke('load-preference', key),
})
