# VIVI — Virtual Vinyl

VIVI is a desktop music player that turns a local music library into a tactile virtual turntable. It pairs a high-detail 3D deck with a playable vinyl interface: cue a song with the tonearm, scratch the record, adjust the physical controls and shape the sound in real time.

VIVI plays **local audio files only**. Your music stays on your computer; the app does not upload, convert or stream your library.

<img width="1280" height="803" alt="image" src="https://github.com/user-attachments/assets/7851185b-fae7-4382-b74a-94fe335fa253" />


## Highlights

- High-detail interactive 3D turntable with animated platter, record label, tonearm and hardware LEDs.
- Add individual files or scan a whole folder recursively. Supported formats: MP3, WAV, FLAC, OGG, M4A and AAC.
- Queue management: select tracks, drag to reorder them, or remove tracks you no longer want.
- Play, pause, previous/next, timeline seeking and hold-to-scan previous/next controls.
- Direct tonearm control: drag the stylus onto the record to cue by groove position; move it away to stop.
- Left-side vinyl scratching with inertia. Scratch audio is enabled only while the stylus is on the record.
- 16 / 33 / 45 RPM modes with a physical motor acceleration and deceleration ramp.
- Pitch adjustment from −8 to +8 semitones, linked to both the UI control and deck pitch fader.
- Dual volume controls, reverb and a seven-band equalizer with presets.
- Crossfade, warmth, configurable crackle and Lo-Fi vinyl-age processing with severe wear wobble near the maximum setting.
- Accent colour options, adaptive record-label colouring and selectable surfaces: dark wood, light wood, black wood, metal, concrete, leaves, black, or a custom image.
- Adaptive contrast for bright backgrounds: centre-panel copy automatically switches to a darker palette while dark surfaces retain the original appearance.
- Responsive layout and demand-driven 3D rendering that reduces unnecessary CPU/GPU work while the deck is idle.
- One-click reset for every audio, appearance and turntable setting.

## Install

Download the appropriate installer from the GitHub release assets.

| Platform | File | Notes |
| --- | --- | --- |
| macOS (Apple Silicon) | `VIVI-<version>-mac-arm64.dmg` | Open the DMG and drag VIVI to Applications. |
| macOS (Intel) | `VIVI-<version>-mac-x64.dmg` | Open the DMG and drag VIVI to Applications. |
| Windows 10/11 (64-bit) | `VIVI-<version>-win-x64.exe` | Run the installer and choose an installation folder if desired. |

End users **do not need Node.js, npm or `npm run dev`**. After installation, they open VIVI like any other desktop application from Applications, Start, Desktop, or the installed shortcut.

The macOS builds are unsigned. If macOS blocks the first launch, open the app with Control-click → **Open**, then confirm once in the system dialog.

## Development only

The following commands are for contributors working from the source code. They are not required to use an installed VIVI release.

### Requirements

- Node.js 20 or newer (current LTS recommended)
- npm

### Development

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
```

### Desktop installers

```bash
# Native macOS DMG and ZIP
npm run dist:mac

# Windows NSIS installer (run on Windows, or use the GitHub Actions workflow)
npm run dist:win
```

Generated installers are written to `release/` and are intentionally excluded from version control. The repository includes a GitHub Actions workflow that creates both macOS and Windows installers when a version tag is pushed.

## Controls

| Area | Action |
| --- | --- |
| Record, left side | Drag to scratch. |
| Tonearm/stylus | Drag across the playable record area to cue. Drag off the record to stop and return to rest. |
| Deck play button | Starts and pauses the loaded song; its LED is active only when a track is loaded. |
| 16 / 45 deck buttons | Toggle the matching RPM preset. Selecting again returns the deck to 33 RPM. |
| Deck pitch fader | Drag vertically to set pitch from −8 to +8 semitones. |
| Transport controls | Click for previous/next; hold previous or next to scan through the song. |
| Queue | Drag a row to reorder it; click × to remove it. |

## Audio and privacy

VIVI opens only the files and folders you explicitly select. Audio is streamed through Electron's local `media://` protocol and is processed locally with the Web Audio API. No user audio, playlist data or custom background image leaves the device.

## Project structure

```text
src/main.tsx             React application, player state and Web Audio controls
src/TurntableScene.tsx   Three.js turntable scene, labels and deck interaction
src/styles.css           Interface, responsive layout and themes
src/assets/              Model and built-in background assets
electron/main.cjs        Electron window, file pickers and local media protocol
electron/preload.cjs     Restricted bridge exposed to the renderer
.github/workflows/       Cross-platform release builds
```

## Releasing a new version

1. Update the `version` field in `package.json`.
2. Commit the version change and create a matching Git tag, for example `v1.2.0`.
3. Push the tag to GitHub.
4. The release workflow builds macOS and Windows installers and attaches them to a GitHub Release.

## License

This project is for personal use unless a separate licence is added.
