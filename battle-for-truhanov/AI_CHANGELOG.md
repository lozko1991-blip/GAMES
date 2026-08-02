# AI Modification Changelog

This log is strictly maintained by AI assistants. It serves as a reliable project history to ensure perfect continuity, bug tracking, and seamless handoffs between different AI sessions. 
**Rule:** Every single structural or logical change MUST be documented here.

## [2026-06-18]
- **Structural Bugfix (ReferenceError)**: Removed `initMobileControls()` and `drawScene(0)` from `config.js` and moved them to the end of `main.js`. This prevents `ReferenceError` during page load, as these functions depend on `input.js` and `render.js` which load later.
- **Structural Bugfix (ReferenceError)**: Resolved `resumeAudio is not defined` and `AIController is not defined` ReferenceErrors by removing immediate/load-time event listeners and instantiation from `config.js`. Moved the `touchstart` and `visibilitychange` listeners to `audio.js` where `resumeAudio` and `AudioSys` are defined. Delayed instantiation of `AI_ENGINE` by declaring it as a global `let` in `config.js` and initializing it at the end of `ai.js` (after the `AIController` class is declared).
- **Syntax Hotfix**: Fixed missing and extra closing braces `}` in `input.js` and `config.js` caused by the initial monolithic `game.js` Python split script.
- **AI Workspace Setup**: Created `.agents/AGENTS.md` containing core project rules to prevent AI hallucinations, and created this `AI_CHANGELOG.md` to establish a strict modification history.
- **Architectural Reference**: An `instruction.md` file was previously created to document the overall file map and module responsibilities.

## [2026-08-02]
- **New Location "Кремль (Москва)"**: Added level at index 13 of `LEVELS` in `assets.js` — `district: "kremlin"`, `weather: "snow"`, sky `["#141018", "#2a1a1e"]`, ground `#4a3a30`, with a real photo of the Moscow Kremlin (960x540 JPEG, base64 inline) as `src`. Photo source: Wikimedia Commons `File:Moscow Kremlin.jpg` (CC BY-SA license — attribution required).
- **New Characters**: Added `putin` (special `special_slide`, fatality `borschaga_tram`, logo `star`, projType `fire`), `zelensky` (special `special_rise`, fatality `shuliavka_bridge`, logo `trident`, projType `lightning`, hairColor `#2b2118`), `bandera` (special `special_rise`, fatality `water_catfish`, logo `bandera`, projType `fire`) to `CHARACTERS` in `assets.js`.
- **Character Select UI**: Added the three new character options to all 5 character `<select>` elements in `index.html` (SP, local PvP, online).
- **Level Select UI**: Added `<option value="13">Кремль (Москва)</option>` to both `#level-select` and `#level-select-local` in `index.html`.
- **Level Unlock**: Extended `getOwnedLevels()` in `config.js` to include index 13.
- **New Weather "snow"**: Added `snow` particle spawn branch in `spawnWeather()` in `render.js` (white falling particles, life 240). Drawn via the default circle branch in `Particle.draw` (particles.js), no new particle type required.
- **Character Visuals**: Added character-specific face detail branches (`putin` bald + stubble, `bandera` hair + mustache, `zelensky` short dark hair) in `fighter.js` draw code.
- **New Chest Logos**: Added `star` (red star), `trident` (yellow trident), `bandera` (red/black flag) branches to the chest emblem drawing in `fighter.js`.
- **Validation Fix**: `validate.js` previously failed with `TypeError: Cannot read properties of undefined (reading 'getItem')` in `config.js:6` because `localStorage` was not mocked. Added a simple in-memory `localStorage` mock (getItem/setItem/removeItem) to `validate.js` browser-global stubs. `node validate.js` now passes with `SUCCESS: All scripts loaded in the correct order!`.
- **Syntax Hotfix (assets.js)**: The level entry inserted for "Кремль" was initially inserted with a trailing comma instead of the file's leading-comma style, causing `SyntaxError: Unexpected token '{'` at line 32. Fixed by adding a leading comma and removing the trailing comma before `];`.


