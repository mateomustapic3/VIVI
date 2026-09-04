const { app, BrowserWindow, dialog, ipcMain, protocol } = require('electron')
const fs = require('node:fs')
const fsPromises = require('node:fs/promises')
const path = require('node:path')
const { Readable } = require('node:stream')

app.setName('VIVI - Virtual Vinyl')

const audioExtensions = new Set(['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac'])

// A normal web page may not read file:// URLs. This local-only protocol gives
// the renderer a safe way to stream just the files the user selected.
protocol.registerSchemesAsPrivileged([{
  scheme: 'media',
  privileges: { secure: true, standard: true, supportFetchAPI: true, stream: true, corsEnabled: true },
}])

const toMediaUrl = (filePath) => `media://audio/${encodeURIComponent(filePath)}`

const mimeTypes = {
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
}

async function findAudioFiles(folder) {
  const found = []
  async function visit(directory) {
    const entries = await fsPromises.readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(fullPath)
      else if (entry.isFile() && audioExtensions.has(path.extname(entry.name).toLowerCase())) {
        found.push({ name: path.parse(entry.name).name, path: fullPath, url: toMediaUrl(fullPath) })
      }
    }
  }
  await visit(folder)
  return found.sort((a, b) => a.name.localeCompare(b.name))
}

function createWindow() {
  const window = new BrowserWindow({
    title: 'VIVI - Virtual Vinyl',
    icon: path.join(__dirname, '../build/icon.png'),
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#161410',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false },
  })
  if (!app.isPackaged) window.loadURL('http://127.0.0.1:5173')
  else window.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  protocol.handle('media', (request) => {
    const filePath = decodeURIComponent(new URL(request.url).pathname.slice(1))
    return fsPromises.stat(filePath).then((file) => {
      const range = request.headers.get('range')
      const headers = {
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      }

      if (!range) {
        return new Response(Readable.toWeb(fs.createReadStream(filePath)), { headers: { ...headers, 'Content-Length': String(file.size) } })
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (!match) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${file.size}` } })

      const start = match[1] ? Number(match[1]) : Math.max(file.size - Number(match[2]), 0)
      const end = match[2] ? Math.min(Number(match[2]), file.size - 1) : file.size - 1
      if (start >= file.size || start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${file.size}` } })

      return new Response(Readable.toWeb(fs.createReadStream(filePath, { start, end })), {
        status: 206,
        headers: { ...headers, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${file.size}` },
      })
    }).catch(() => new Response('Audio file not found', { status: 404 }))
  })
  ipcMain.handle('library:pick-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || !result.filePaths[0]) return []
    return findAudioFiles(result.filePaths[0])
  })
  ipcMain.handle('library:pick-files', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], filters: [{ name: 'Audio', extensions: [...audioExtensions].map((ext) => ext.slice(1)) }] })
    return result.filePaths.map((filePath) => ({ name: path.parse(filePath).name, path: filePath, url: toMediaUrl(filePath) }))
  })
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
