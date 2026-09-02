/// <reference types="vite/client" />

declare module '*.glb?url' {
  const url: string
  export default url
}

type Track = { name: string; path: string; url: string }

interface Window {
  vinyl: {
    pickFolder: () => Promise<Track[]>
    pickFiles: () => Promise<Track[]>
  }
}
