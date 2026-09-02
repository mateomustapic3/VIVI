const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vinyl', {
  pickFolder: () => ipcRenderer.invoke('library:pick-folder'),
  pickFiles: () => ipcRenderer.invoke('library:pick-files'),
})
