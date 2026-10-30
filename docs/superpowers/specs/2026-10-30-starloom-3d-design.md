# Starloom 3D — design

Status: draft for owner review. Replaces the flat Starloom at the same address
(https://marouncoder.github.io/starloom/, repo MarounCoder/starloom).

## Intent

Starloom becomes a real 3D universe in the browser, in the spirit of NASA's
Eyes on the Solar System (https://eyes.nasa.gov/apps/solar-system/), with
Starloom's own twist: the sky is an instrument. You fly around the real Solar
System inside a sky of real stars, see the real constellations, and make your
own by joining real stars. Every star is a note; a constellation is a melody.

The why: the flat version was fun but felt like a toy map. The owner wants the
sense of actually being out there, with real objects you can learn about, while
keeping the playful, musical identity that NASA's app doesn't have.

Success: someone opens the link, sees Earth hanging in a sky of real stars with
Orion drawn on it, taps their way to a melody within a minute, then flies away
from Earth and hears their constellation's melody bend as its shape stretches.

## Decided with the owner

- **Replaces** the current flat Starloom (same repo, same URL). No toggle back.
- **New constellations join real stars** already in the sky. Users never place
  invented stars.
- You can **fly beyond the Solar System to nearby stars**, and constellations
  (real and user-made) **stretch out of shape** as you leave Earth, because they
  are drawn between the stars' true 3D positions.
- **Sharing by link** and the **poster export** carry over.
- **Shooting stars and wishes are dropped.**
- **Movement must feel like today's Starloom, not like NASA Eyes.** The owner
  likes NASA's accuracy but finds getting around in it clunky. What they love
  in the current app is the endless, fluid exploring: drag and scroll and glide
  anywhere with momentum, and it never runs out.
- **The universe is infinite.** Near home everything is real (planets, real
  stars, real constellations). Past the edge of the real star data, a
  generated universe continues forever: more stars, nebulae, galaxies.
- **Search and "fly to" stay as optional shortcuts**, not the main way to move.
- All technical decisions are delegated to Claude (the builder may refine the
  ones marked "Claude's call" below).

## Goals

1. **Real Solar System.** Sun, eight planets, Earth's Moon and the major moons
   (Jupiter's four Galilean moons, Titan) at their real positions for the
   current date, using real imagery. Saturn has rings. Click/tap a body to
   select it; the camera glides to it and orbits it.
2. **Real stars.** A star catalogue with true 3D positions, rendered as a sky
   that is correct from wherever the camera is. Brightness and colour come from
   the real data and update with distance as you fly.
3. **Real constellations.** The 88 IAU constellations drawn as lines between
   their real stars, with names. Toggleable lines and labels.
4. **Your constellations.** A "draw" mode: tap real stars one after another to
   join them. Undo, rename (keep the whimsical French name generator), new,
   delete. Drawn as lines between true 3D positions.
5. **Music.** Each star sounds a note; Play loops a constellation's melody;
   Play all plays every constellation in view. Real constellations can be played
   too. Instruments and scales carry over from today's app.
6. **Info.** Tapping a star shows its name (proper name, Bayer/Flamsteed, or
   catalogue id), distance in light-years, apparent and absolute magnitude,
   colour/spectral class, and which constellation it belongs to. Planets show
   the facts cards they have today.
7. **Free flight (the primary way to move).** Drag to look/steer, scroll or
   pinch to fly forwards and back, with momentum that glides to a stop like
   today's panning. Speed scales automatically with the distance to the
   nearest thing worth seeing: slow and precise near a planet, very fast
   between stars, so Earth to Neptune or to a nearby star takes seconds and
   you are never stranded in empty space. Keyboard (WASD/arrows) works too.
   Approaching a body never clips through it.
8. **Shortcuts.** A search box (planets, moons, named stars, constellations)
   and a short list of suggested places. Choosing one glides you there; you can
   take over with a drag at any moment.
9. **Infinite generated universe.** Beyond the real catalogue, deterministic
   procedural content in 3D chunks: star fields with plausible colours and
   brightnesses, nebulae, star clusters and distant galaxies. The same place
   always looks the same. The hand-off from real to generated stars is
   seamless (no visible wall). Generated stars can be joined into
   constellations and played exactly like real ones, and share links can
   point to them.
10. **Time.** Real-time by default, with a control to speed time up or reverse
   it, and a "now" button. Planet and moon positions follow the clock.
11. **Share and poster.** The share link carries user constellations, the
   current target and camera, instrument and scale. The poster renders the
   current 3D view at high resolution inside the existing chart frame.

## Non-goals

- Landing on or rendering planet terrain; spacecraft; asteroids/comets;
  exoplanet systems; other galaxies; VR; multiplayer; accounts or a backend.
- Physical accuracy in the generated region. Past the real data it only needs
  to be beautiful, plausible and consistent, not scientifically correct.
- Migrating constellations saved in the old flat version (there are no real
  users yet; old local data can be ignored).

## Anti-goals (would be a failure even if it "works")

- Losing the music-first identity: it must not feel like a lesser NASA Eyes
  with sound bolted on. Drawing and playing must be one or two taps away.
- Navigation that feels like NASA Eyes: having to pick a target to go
  anywhere, sluggish travel, or fighting the camera.
- Jitter, flicker or z-fighting at planet scale, or a camera that gets lost
  in empty space with nothing on screen.
- Label soup: unreadable piles of overlapping names.
- A long blank loading screen. First useful frame within ~3 s on a decent
  connection; heavy data streams in after.
- Breaking on phones. It must run on a recent mid-range phone, with lighter
  settings if needed.

## Constraints

- Static site on GitHub Pages under `/starloom/`; no server. All data ships as
  static files.
- Open licences only, and attribution shown in the app's About panel and the
  README. Code stays MIT. Note: if HYG is used it is CC BY-SA, which applies to
  the data file, not the code.
- Keep the visual identity: deep ink, brass accent, Italiana / Spectral /
  IBM Plex Mono, the brass toolbar.
- `prefers-reduced-motion`: camera moves become instant cuts.
- Keep the repo's working practices: pure logic in tested modules (Vitest),
  lint + test + build in CI, deploy on push to `main`.

## How it gets made (Claude's calls)

- **Rendering:** three.js through React Three Fiber, with drei helpers and a
  bloom pass from @react-three/postprocessing. React keeps the HUD.
- **Scale:** true scale (no squashed orbits), so the view feels like NASA Eyes.
  Distant bodies get screen-space markers and labels so you can always see and
  tap them. Positions are kept in float64 (kilometres) on the CPU and rendered
  relative to the camera (floating origin), with a logarithmic depth buffer.
- **Ephemeris:** the `astronomy-engine` library (MIT) for planet, moon and
  Moon-phase positions instead of today's mean-longitude approximation.
- **Stars:** the HYG database (CC BY-SA 4.0), trimmed to roughly naked-eye
  plus binocular stars (target 30–60k stars, a few MB compressed), packed into
  a compact binary file loaded after first paint. Rendered as GPU points whose
  size and brightness come from apparent magnitude computed from the current
  camera position, and whose colour comes from the B–V index.
- **Constellation lines:** openly licensed IAU line data keyed to Hipparcos ids
  so lines attach to catalogue stars exactly. The licence must be recorded.
- **Planet textures:** the 2k textures from Solar System Scope (CC BY 4.0) or
  NASA public-domain imagery. Lower resolution on phones.
- **Milky Way backdrop:** an openly licensed all-sky panorama on a sphere at
  infinity, fading as you approach a star so it does not swamp the scene
  (see Movement note below for far travel).
- **Music mapping:** pitch comes from where a star appears from the current
  camera, not from its catalogue position. Degree = the star's apparent angular
  height relative to the constellation's first star, measured against the
  ecliptic north as "up", quantised to the chosen scale. Rhythm follows the
  apparent angular distance between consecutive stars. Volume follows apparent
  brightness. As you fly, apparent positions change, so melodies change.
- **Data model:** a user constellation stores star ids (+ breaks), a name and
  a hue. Real stars use catalogue ids; generated stars use a stable id derived
  from their chunk coordinates and index, so they survive reloads and links.
  Old flat-world constellations are not migrated.
- **Movement:** a custom free-flight controller (not orbit controls) with
  distance-scaled speed and inertia; "fly to" is an eased path that hands
  control back on any input.
- **Milky Way backdrop:** visible from the real neighbourhood; as you travel
  far into generated space it fades and generated galaxies take over.

## Left to the builder

- Shader details for stars, atmosphere glow and the Sun.
- Label culling and priority rules (within the anti-goal above).
- The exact star magnitude cut-off, texture sizes per device class, and the
  catalogue packing format.
- HUD layout details within the existing identity, including where search,
  time controls and the draw-mode toggle sit.
- The list of suggested places.
- Procedural generation details (densities, chunk size, object mix) and how
  the real/generated boundary is blended.

## Settled after the builder check (Claude's calls)

- **Pitch depends on where you are, not where you look.** A star's degree is
  its ecliptic-latitude difference from the constellation's first star, as
  seen from the camera's position. Turning or rolling the view never changes a
  melody; moving does.
- **True scale stands.** Shapes and melodies only visibly bend once you travel
  light-years, not within the Solar System. Onboarding and the suggested places
  steer people to an early nearby-star trip (Alpha Centauri, Sirius), which
  takes seconds with distance-scaled speed.
- **Real constellations are playable.** Tapping a constellation's name selects
  it; Play plays it. Its melody is a walk along its line segments (depth-first
  from its brightest star, breaks between disconnected parts). "Make a copy"
  turns it into an editable constellation of your own; this replaces today's
  presets and the P key. Play all plays your own constellations in view plus
  any real one you have selected, never all 88 at once.
- **Release path.** Development happens on a branch that deploys a preview to
  `/starloom/next/`. The main URL switches over once in one go, when the first
  release is ready. The first release covers the success scene, free flight,
  the infinite universe, drawing/playing, star and planet info, search, and
  sharing. Time controls beyond "now" and the poster may follow just after.

## Decided by the owner after the builder check

- **Galaxies are places, not scenery.** Flying towards a generated galaxy
  resolves it, level by level, into its own stars, nebulae and clusters, which
  can be drawn and played like any others. Generation is therefore nested
  (galaxy → region → stars) with level of detail, and generated-star ids must
  encode that hierarchy so share links stay valid forever.
- **Gaps near home are filled, and labelled.** Faint generated stars fill the
  real neighbourhood so it never looks sparse or like a bubble. Their info card
  says "Uncharted star (generated)" and never presents made-up data as real.
