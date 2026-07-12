import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'

// Keep a global reference of the window object to prevent garbage collection
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'VRM Character',
    frame: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Capture renderer console output
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mainWindow.webContents.on('console-message', (_event: any, _level: any, message: string) => {
    console.log(`[renderer] ${message}`)
  })

  // Hide the default menu bar (File, Edit, View, Window)
  mainWindow.setMenu(null)

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handler: load VRM file from filesystem path
ipcMain.handle('load-vrm-from-path', (_event, filePath: string) => {
  console.log('[main] Loading VRM from path:', filePath)
  try {
    const buffer = readFileSync(filePath)
    console.log('[main] Read', buffer.length, 'bytes')
    return buffer
  } catch (err) {
    console.error('[main] Failed to read VRM file:', err)
    throw err
  }
})

// IPC handler: show file picker dialog (returns selected file paths)
ipcMain.handle('show-open-file-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  const mainWindowRef = mainWindow
  if (!mainWindowRef) {
    return { canceled: true, filePaths: [] }
  }
  const result = await dialog.showOpenDialog(mainWindowRef, options)
  return result
})

// IPC handler: save last VRM path to app preference
ipcMain.handle('save-preference', async (_event, key: string, value: string) => {
  try {
    const userDataPath = app.getPath('userData')
    const { writeFileSync, existsSync, mkdirSync } = await import('fs')
    const { join } = await import('path')
    const prefFile = join(userDataPath, 'prefs.json')
    let prefs: Record<string, string> = {}
    if (existsSync(prefFile)) {
      prefs = JSON.parse(readFileSync(prefFile, 'utf-8'))
    }
    prefs[key] = value
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    writeFileSync(prefFile, JSON.stringify(prefs))
    return true
  } catch (err) {
    console.error('[main] Failed to save preference:', err)
    return false
  }
})

// IPC handler: load last VRM path from app preference
ipcMain.handle('load-preference', async (_event, key: string) => {
  try {
    const userDataPath = app.getPath('userData')
    const { readFileSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const prefFile = join(userDataPath, 'prefs.json')
    if (existsSync(prefFile)) {
      const prefs = JSON.parse(readFileSync(prefFile, 'utf-8'))
      return prefs[key] || null
    }
    return null
  } catch (err) {
    console.error('[main] Failed to load preference:', err)
    return null
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
