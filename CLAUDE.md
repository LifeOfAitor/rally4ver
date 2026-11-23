# CLAUDE.md

## Project: Rally4ver

Cross-platform (iOS + Android) app that reads **rally pacenotes** aloud while you drive a pre-defined route, like a rally co-driver. It runs in the background next to Google Maps / Waze. Built with **React Native + Expo (SDK 58) + TypeScript**, same stack as RadarMoto (`~/source/app_radares`), from which config and patterns are copied. Distributed for free as an APK on GitHub (iOS build too).

UI language: Spanish. Use at the user's own responsibility; always show a safety disclaimer before a stage.

## Commands

```bash
npm test                 # Jest unit tests (pure logic in src/core)
npm run typecheck        # tsc --noEmit
npx expo install <pkg>   # ALWAYS use instead of npm install — picks SDK-compatible versions
npm run android / ios    # dev client build (Expo Go does not work: background location, MapLibre)
```

Run `npm test` and `npm run typecheck` before declaring work done. Build/test instructions for release builds and simulated drives: see RadarMoto's CLAUDE.md (same tooling).

## Architecture

```
route (LatLon[]) → buildPath (resample every 5 m, local XY)
  → generatePacenotes (curvature → bends → grade 1-6 + modifiers + links)
  → while driving: GPS fix → matcher (s along route) → caller (notes due at speed) → audio
                                                    → timer (live delta vs best run)
```

| Path | Responsibility |
|---|---|
| `src/core/geo.ts` | haversine, angles, equirectangular projector |
| `src/core/path.ts` | resampling, unwrapped headings, windowed curvature (positive = right) |
| `src/core/pacenotes.ts` | bend detection and grading, `cierra`/`abre`/`larga`/`cuidado`, `y`/distance links |
| `src/core/phrase.ts` | Spanish tokens (one audio clip each), speech text, on-screen label |
| `src/core/matcher.ts` | GPS → distance along route with a moving search window, off-route detection |
| `src/core/caller.ts` | when to speak each note (lead = max(80 m, speed × 6 s)); chains `y` notes |
| `src/core/timer.ts` | run recording, interpolated time at distance, live delta vs best run |
| `src/ui/theme.ts` | "rally clásico" palette: dark, yellow notes, red accents |
| `src/test/helpers.ts` | `buildRoad` synthetic roads (straights + arcs) for tests |

## Pacenote rules (keep these when changing code)

- **Scale 1-6: 1 = tightest, 6 = almost flat.** Grade by minimum radius: <20, <35, <55, <85, <130, <200 m. Wider is not called.
- Hairpin (`horquilla`) = ≥140° total and radius <25 m.
- Bends turning <20° in total are ignored; same-direction bends <10 m apart are merged.
- Gap <25 m → `y`; otherwise rounded to 30/50/70/100/150/200/250/300, then 100s; >1 km → "larga recta".
- `cuidado` before grade ≤2 or hairpin after ≥250 m of straight.
- Spoken order: `[cuidado] dirección grado|horquilla [larga] [cierra|abre] [y|distancia]`.

## Product decisions

- Always a fixed route (no free / predictive mode). Routes from: A→B on the map, Google Maps share link (origin/destination/waypoints re-routed on OSM, then drag to adjust), GPX import.
- Recce mode (record a drive, notes from the real GPS trace) and stage timer with live delta vs best run (optional, off by default) come after the MVP.
- Voice: pre-generated AI clips per token (Piper / ElevenLabs). Never ship copyrighted samples from games or videos.
