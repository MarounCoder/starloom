# Starloom — design

## Intent

A fun, polished web toy: an infinite night sky you explore and play like an instrument.
It grew out of a single-page prototype and is being rebuilt as a public,
presentable React project. Success means someone who opens the live demo smiles within
ten seconds, makes a melody within thirty, and keeps wandering to see what else is out there.

## Goals

- **Infinite sky.** Drag to pan, scroll or pinch to zoom. The sky is procedurally generated
  and deterministic: the same place always looks the same.
- **Play the sky.** Tap to place a star; each star is a note (higher on screen = higher pitch).
  Stars placed in a row join into a constellation. Play a constellation as a looping melody,
  or play every constellation in view at once.
- **Things to find.** A Milky Way band (dust, glow, dark lanes), nebulae, star clusters,
  distant galaxies, and a solar system whose planets sit at their real heliocentric longitudes
  for today and then orbit at high speed. Tapping a planet shows real facts and plays its tone.
- **Preset constellations** (Orion, Big Dipper, Cassiopeia, Cygnus, Lyra, Southern Cross,
  Scorpius, Leo) that can be dropped anywhere and played.
- **Shooting stars** cross the sky now and then; catching one shows a wish.
- **Day/night cycle:** dusk → night → dawn loop, with the moon in today's real phase.
  Can be pinned to "always night".
- **Share by link:** the whole sky (constellations, instrument, scale, view) lives in the URL hash.
- **Instruments and scales:** chimes, glass bell, music box, soft pad; major pentatonic,
  minor pentatonic, hirajōshi, lydian.
- **Export a poster:** the current view as a portrait PNG star chart with title and names.

## Non-goals

- 3D flight. The universe is a flat map with parallax layers.
- Accounts, backends, or multiplayer. Persistence is localStorage; sharing is the link.
- Astronomical accuracy beyond the planets' longitudes and the moon phase.

## Anti-goals

- Janky panning, or taps that turn into accidental stars while dragging.
- Sound that plays before the user interacts, or that is harsh/loud.
- A page that feels like a template: no generic UI kit look.

## Constraints

- React + TypeScript + Vite, deployed to GitHub Pages under `/starloom/`.
- No personal names anywhere in the public repo.
- Works at phone width with touch (tap, drag, pinch); respects `prefers-reduced-motion`.

## Decisions (Claude's calls, delegated by the owner)

- Name: **Starloom**. Visual identity carried over from the prototype: deep ink sky, brass
  accent, Italiana display, Spectral body, IBM Plex Mono for catalogue data (self-hosted via Fontsource).
- State in Zustand (persisted); camera kept in a mutable view module so panning never re-renders React.
- One canvas renderer that takes `(ctx, camera, size, options)` so the poster export reuses it.
- Pitch is relative to the constellation's first star (so melodies are stable wherever you are).
- Shooting stars live in screen space (they are in the atmosphere); everything else is world space.
- Vitest for the pure modules (rng, camera, scales, share, moon, solar positions, constellation ops).
- GitHub Actions: lint, test, build, deploy to Pages on every push to `main`.
