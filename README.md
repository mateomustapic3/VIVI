<p align="center">
  <img src="https://raw.githubusercontent.com/mateomustapic3/VIVI/main/build/icon.png" width="112" alt="VIVI icon">
</p>

<h1 align="center">VIVI — Virtual Vinyl</h1>

<p align="center">
  A tactile desktop music player that turns your local music library into a playable virtual turntable.
</p>

<p align="center">
  <a href="https://github.com/mateomustapic3/VIVI/releases/latest">Download latest release</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#controls">Controls</a>
  ·
  <a href="#development">Development</a>
</p>

![VIVI turntable interface](https://github.com/user-attachments/assets/7851185b-fae7-4382-b74a-94fe335fa253)

## About

VIVI is a local-first desktop music player built around a detailed interactive 3D turntable. Load songs from your computer, place the needle on the record, scratch the platter, shape the sound and organise your listening queue.

Your music remains on your device. VIVI does not upload, stream, convert or analyse your library online.

## Download

Download the installer that matches your computer from the [latest release](https://github.com/mateomustapic3/VIVI/releases/latest).

| Platform | Installer | Notes |
| --- | --- | --- |
| macOS — Apple Silicon | [`VIVI-<version>-mac-Apple-Silicon.dmg`](https://github.com/mateomustapic3/VIVI/releases/download/v1.2.2/VIVI-1.2.2-mac-Apple-Silicon.dmg) | For M1, M2, M3, M4 and newer Macs. |
| macOS — Intel | `VIVI-<version>-mac-Intel.dmg` | For Intel-based Macs only. |
| Windows 10 / 11 — 64-bit | `VIVI-<version>-Windows-x64.exe` | Standard Windows installer. |

> Apple Silicon MacBooks must use the installer labelled **Apple Silicon**. Do not use the Intel version on an M-series Mac.

After installation, VIVI opens like any other desktop app. You do not need Node.js, npm, Terminal or `npm run dev`.

### macOS first launch

The macOS build is not yet Apple-notarized. If macOS displays a security warning on the first launch:

1. Open the **Applications** folder.
2. Control-click VIVI.
3. Select **Open**.
4. Confirm **Open** once more.

## Features

### Interactive turntable

- High-detail 3D turntable with animated platter, record label, tonearm, pitch fader and hardware LEDs.
- Drag the tonearm across the record to cue a song by groove position.
- Move the needle off the record to stop playback naturally.
- Scratch the left side of the platter with realistic inertia.
- Scratch audio plays only while the stylus is on the record.
- 16, 33 and 45 RPM modes with motor-style acceleration and deceleration.
- Pitch adjustment from −8 to +8 semitones, linked to both the sidebar control and physical deck fader.

### Music library and queue

- Add individual files or recursively scan an entire music folder.
- Supports MP3, WAV, FLAC, OGG, M4A and AAC.
- Select a track from the queue to load and play it.
- Drag queue entries to reorder songs.
- Remove individual tracks from the queue at any time.
- Previous, next, play, pause, timeline seeking and hold-to-scan controls.

### Sound shaping

- Separate music volume and master volume controls.
- Reverb control and seven-band equalizer with presets.
- Adjustable crossfade between consecutive songs.
- Warmth control for vinyl-style saturation and surface character.
- Crackle control for vinyl pops and record texture.
- Lo-Fi intensity control for simulated vinyl age, tonal wear, wow and flutter at high values.
- Reset button to restore every setting to its default state.

### Appearance

- Accent colours: orange, pink, green, blue, yellow, red, purple and white.
- Accent colour also updates the loaded record label.
- Built-in backgrounds: dark walnut, light oak, black wood, gunmetal, concrete, leaves and full black.
- Custom background image support.
- Automatic contrast adjustment for bright backgrounds.
- Responsive layout for different screen sizes.

## Controls

| Area | Action |
| --- | --- |
| Record — left side | Drag to scratch the platter. |
| Tonearm / stylus | Drag across the playable record area to cue. Drag off the record to stop. |
| Deck play button | Start or pause the loaded song. |
| 16 / 45 deck buttons | Activate 16 or 45 RPM. Click the active speed again to return to 33 RPM. |
| Deck pitch fader | Drag vertically to set pitch from −8 to +8 semitones. |
| Timeline | Click or drag to seek through the current song. |
| Previous / next | Click to change track. Hold to scan backward or forward through the song. |
| Queue | Drag rows to reorder them, or click × to remove a track. |

## Privacy

VIVI accesses only files and folders that you explicitly select.

Audio playback, queue data, sound processing and custom backgrounds stay on your computer. The application uses Electron's local `media://` protocol and the Web Audio API; no music files or personal data are sent to a server.

## Development

These instructions are only for contributors building VIVI from source.

### Requirements

- Node.js 20 or newer
- npm

### Run locally

```bash
npm install
npm run dev
```

### Production build

```bash
npm run build
```

The production-ready web files are generated in the `dist/` directory.

### Build desktop installers

```bash
# macOS DMG and ZIP
npm run dist:mac

# Windows NSIS installer
npm run dist:win
```

Generated installers are written to `release/` and are excluded from version control.

## Project structure

```text
src/main.tsx             Player state, audio engine and interface controls
src/TurntableScene.tsx   Three.js turntable scene and deck interaction
src/styles.css           Layout, themes and responsive styling
src/assets/              3D model, backgrounds and preview assets
electron/main.cjs        Electron window, file pickers and media protocol
electron/preload.cjs     Restricted renderer bridge
build/                   Application icons for macOS and Windows
.github/workflows/       Automated cross-platform release builds
```

## Releasing a new version

1. Update the version in `package.json`.
2. Update `package-lock.json`.

```bash
npm install --package-lock-only --ignore-scripts
```

3. Test the production build.

```bash
npm run build
```

4. Commit the version change and create a matching Git tag.

```bash
git add .
git commit -m "Release VIVI 1.2.3"
git tag -a v1.2.3 -m "VIVI 1.2.3"
git push origin main
git push origin v1.2.3
```

5. GitHub Actions automatically builds and publishes installers for:

   - macOS Apple Silicon
   - macOS Intel
   - Windows 64-bit

## License

This project is currently intended for personal use. Add a licence file before redistributing or accepting external contributions.
