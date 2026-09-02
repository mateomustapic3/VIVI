# VIVI - Virtual Vinyl

Prva radna verzija desktop virtualnog gramofona za macOS i Windows.

## Pokretanje

Potreban je Node.js (LTS verzija).

```bash
npm install
npm run dev
```

U aplikaciji odaberi **Add folder** za skeniranje foldera (uključujući podfoldere) ili **Add files** za pojedinačne pjesme. Podržani su MP3, WAV, FLAC, OGG, M4A i AAC.

## Trenutačno uključeno

- lokalni file picker i folder-based queue
- play/pause, prethodna/sljedeća pjesma, seek i glasnoća
- automatska iduća pjesma
- animacija ploče i ručice

Sljedeće faze: crossfade s dva audio kanala, vinyl DSP (šum, pucketanje, wow/flutter) i instalacijski paketi za oba operativna sustava.
