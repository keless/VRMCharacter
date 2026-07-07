import { app, BrowserWindow, ipcMain } from 'electron'
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
  mainWindow.webContents.on('console-message', (_event, _level, message, _line, _sourceId) => {
    console.log(`[renderer] ${message}`)
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
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
