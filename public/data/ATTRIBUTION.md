# Data and image credits

- **Planet, Sun, Moon and Milky Way maps** (`public/textures/`): Solar System Scope,
  https://www.solarsystemscope.com/textures/, licensed CC BY 4.0
  (https://creativecommons.org/licenses/by/4.0/). Downloaded by `scripts/fetch-textures.mjs`, unmodified.
- **Stars** (`stars.bin`, `stars-names.json`): the HYG database v4.1 by David Nash (astronexus),
  https://github.com/astronexus/HYG-Database, licensed CC BY-SA 4.0
  (https://creativecommons.org/licenses/by-sa/4.0/). Repacked by `scripts/build-stars.mjs`: stars brighter
  than magnitude 7.5, within 25 pc, or used by a constellation figure. Figure stars with no known distance
  are placed at 1,000 pc. The repacked files are shared under the same licence.
- **Constellation figures** (`constellations.json`): Stellarium's "modern" sky culture,
  https://github.com/Stellarium/stellarium/tree/master/skycultures/modern, text and data licensed
  CC BY-SA 4.0. Converted to line pairs by `scripts/build-lines.mjs`; shared under the same licence.
