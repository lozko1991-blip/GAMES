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

## [2026-08-03] Combat Feel Overhaul (MK-style) + Weapon Quick-Pick Panel
- **Hit Flash**: On every successful hit the defender gets `flashTimer` (3-4 frames); `Fighter.drawFlashOverlay()` renders a white additive silhouette (globalCompositeOperation 'lighter') during that window — classic MK white-flash impact.
- **Zoom Punch**: `state.hitZoom` (set in `combat.js applyHit`) makes the camera kick in ~3-5% toward the hit point for 7 frames with smooth decay (`main.js gameLoop`).
- **Squash & Stretch**: defenders stretch horizontally on hit (`squashTimer`/`squashAmount`, scaled inside the fighter transform).
- **Attack Recovery Frames**: heavy attacks (heavy_kick, uppercut, sweep, throw, flip, super, all weapons) now leave the fighter in `recoveryTimer` frames after the active window; movement and new actions are locked during recovery. Light attacks (punch/hook/kick/jumps) stay fast.
- **Attacker Stop-on-Hit**: attacker `vx` is damped on connect (0.45 light / 0.25 heavy) so hits feel meaty.
- **Impact Ring**: `createImpactRing()` in particles.js spawns an expanding stroke ring on heavy hits (greatsword/sword/spear/super/uppercut).
- **Audio Variation**: `AudioSys.punch()` / `kick()` now randomize pitch ±20Hz for less repetitive thuds.
- **Combo Cancel**: after a landed punch (`attackState===1 && hitRegistered`) the fighter can cancel into `special_slide`, `special_rise`, `projectile`, `super`, `uppercut` or `sweep` — MK-style fluidity.
- **Juggle Scaling**: each consecutive juggle hits launch ~15% weaker (min 40%), `juggleCount` resets on landing.
- **Block Pushback Weight**: blocking against greatsword/sword/spear/super/heavy_kick pushes the blocker back further.
- **Weapon Quick-Pick Panel (PC)**: new `#weapon-panel-p1` / `#weapon-panel-p2` side panels (left/right edge of the game screen, visible only during a fight) list all available weapons with icons; clicking a slot selects it instantly (same 420-frame active mechanic as keyboard cycling). P1 panel in SP lists only `state.ownedWeapons`; P2 panel appears only in local PvP. Handlers in `main.js`, render/rebuild caching in `render.js renderWeaponPanel()`, styles in style.css.
- **Hints Updated**: controls hints mention clicking the side weapon panel.

## [2026-08-03] Phase 2 — Living Limbs, Real Combat Physics, Weapon Ammo Limit, Hats
- **8-Joint Skeleton**: `Fighter.skeleton` extended with elbow (`lFArmAngle`/`rFArmAngle`) and knee (`lShinAngle`/`rShinAngle`) joints; `drawLimb2()` renders two-segment limbs (shoulder→elbow→hand, hip→knee→foot). Fake-IK: elbow bends downward, knee bends forward-up relative to limb direction. Shadow afterimages snap the new joints too.
- **Human Poses**: idle breathing with bent elbows/knees; walk with counter-phase arm/leg swing and knee lift; crouch with deep knee bend; hitstun/launched/knockdown have loose, flailing limbs; every attack pose (punch, kick, uppercut, sweep, hook, heavy kick, jump attacks, weapons) now drives elbows/knees separately (wind-up bend → snap straight on contact → soft recover).
- **Backflip**: new `action('backflip')` (attackState 16) — backward flip retreat with tucked pose; bound to the Special key while walking away from the opponent. Forward flip now also tucks knees/elbows during rotation.
- **Bounce Physics**: landing from a launch bounces (vy×0.38, max 2 bounces) with dust particles, thud and shake; settles into knockdown.
- **Wall Bounce**: launched/knockdown/hitstun fighters hitting arena edges rebound with a thud sound.
- **Directional Hit Reactions**: per-attack reaction poses — punch snaps head back, kick bends torso, hook tilts body sideways (`hitstunHead`/`hitstunTilt` set in applyHit, tilt decays while recovering).
- **Momentum Knockback**: attacker's current `vx` adds to defender knockback (run-in hits hit harder).
- **Hit Jitter**: defender micro-shakes ±1.7px while flashTimer is active.
- **Crouch Movement (Crawl)**: S/↓ + direction now crawls slowly instead of auto-sweeping; sweep is still on F/5 while crouching (tapAction) — same for local PvP player 2 and online.
- **AI Upgrades**: hold-block timer (blocks through full combos), backflip retreat vs weapons/supers, sweep punish vs crouching player, jump-in attacks (jump_punch/jump_kick) on helpless opponents.
- **Weapon Ammo Limit (5s)**: equipping a weapon starts a 300-frame (5s) ammo timer; when it expires the weapon is unequipped and a 900-frame (15s) reload cooldown starts — hands-only fighting during reload. Reload banner with live countdown in the side panel (weapon-panel), RELOAD label in HUD, weapon slots disabled during cooldown, "RELOADING..." floating text on blocked attempts.
- **Hats**: every fighter now wears a cap (cloth-colored, dark visor). `knockHatOff(pushDir)` launches the hat with parabolic physics + spin on uppercut/super/greatsword/sword/spear/hook/heavy_kick/first juggle hit; it lands on the ground and snaps back on the head when the fighter stands up again.
- **Hints Updated**: controls hint mentions crawl (S+direction) and backflip (Special while backing away).

## [2026-08-03] Online Multiplayer Bugfixes (PvP over the Internet)
- **Critical: Start button was never shown** — `#btn-start-online-game` stayed `hidden` forever, so the host could never start the match. It now becomes visible to the **host only** once the opponent handshakes (`state.netReady`). The guest waits for the host's `start_game`.
- **Wrong character on handshake**: `setupConnection()` sent `#char-select` (SP selector) instead of `#char-select-online`. Fixed; changing the online character selector re-sends the handshake live so the opponent always sees the current pick.
- **Guest started with wrong character**: when a guest received `start_game`, `#char-select` was not synced. `handleNetMessage('start_game')` now syncs `#char-select` and `#level-select` from the online selectors before `startGame()`.
- **No arena pick in lobby**: added `#level-select-online` (14 arenas + random) to the online lobby; `startOnlineGame()` syncs it into `#level-select` so the host's arena choice is sent to the guest.
- **`openOnlineLobby()`**: entering the online screen now resets any stale network state and shows clear step-by-step status ("both press ЛОБІ 1, first becomes HOST and presses ПОЧАТИ ОНЛАЙН БІЙ").
- **PeerJS missing guard**: `joinLobby`/`hostRoom`/`joinRoom` now check `typeof Peer === 'undefined'` and show a clear message if the PeerJS CDN failed to load.
- **Verified with emulated PeerJS test** (`smoke_mp.js`): host join → guest connects → host sees "Друг зайшов! Супротивник обрав: X" + start button → host start syncs character+arena → guest `start_game` syncs selectors and starts → guest handshake sets netReady.

## [2026-08-03] QA Testing & Critical AI Bugfix
- **Critical AI Bugfix (ReferenceError)**: `AIController.update()` in `ai.js` referenced `pressure` before its `const` declaration (line order: `if (this.holdBlockTimer > 0) { ... if (!pressure) ... }` came before `const pressure = player.attackState > 0`). This is a Temporal Dead Zone crash: the game threw `ReferenceError: Cannot access 'pressure' before initialization` whenever the bot had an active `holdBlockTimer` (hold-block behavior), killing the whole match. Moved `const pressure` above the hold-block branch.
- **Verified with full headless game-loop simulation** (`smoke_full.js`, 2000 frames of live combat with AI + random player actions + weapons + weather + rendering): no NaN/Infinity, no out-of-bounds fighters, no exceptions, hits/projectiles/particles/weapons all exercised, hp stays in bounds, FINISH HIM win detection works. Frame cost ~0.15 ms/frame (far below the 16.6 ms 60fps budget).
- **Hat physics verified**: hat knocked off a grounded fighter lands exactly at `GROUND_Y` (450) and stays there (51 frames; earlier "hat falls" failure was a test artifact — it started too high and had too few frames).

## [2026-08-03] MK Combat Feel Phase 1 (Input & Defense)
- **Input Buffer (A1)**: `action()` no longer silently drops inputs — if a fighter is busy (attack in progress / recovery), the action is buffered for 4 frames and executed the moment they are free (`bufferedAction`/`bufferTimer` in `fighter.js`). Combos now read smoothly like in MK. Buffer execution happens right after recovery decrement in `update()`.
- **Whiff Recovery (A2)**: missed attacks are punished — on attack end, `hitRegistered` is checked; whiffs get `max(6, round(attackRecovery * 1.6))` recovery frames (previously 0 for punches/kicks/hooks). Successful hits keep the old recovery. Punishes button-mashing at range.
- **Block Chip Damage (A3)**: normal punches/kicks/hooks/heavy kicks blocked = 0 chip (MK rules). Only special/weapon attacks (`super`, `greatsword`, `sword`, `spear`, `nunchucks`, `sausage`, lasso types) deal chip damage (15%) through block. Throws still bypass block entirely.
- **Tech-Throw (A4)**: if the defender is also in a throw (`attackState === 6`) when the throw connects, both throws cancel each other — both fighters reset to idle, knocked back 5 px apart, "TECH!" floating text, 8-frame mutual recovery, no damage. Both hitboxes/hitRegistered are cleared to prevent the defender's own throw from connecting on the same frame.
- **Verified** with `mk_features.js` (A1–A4 unit tests), `smoke_full.js` (2000-frame combat sim, all passed), `smoke_combat.js`, `smoke_mp.js`, `validate.js`.

## [2026-08-03] HiDPI Canvas + Side Weapon Panels (Layout Rework)
- **Bigger game window (laptop)**: the canvas now renders at native `1280×720` (was 960×540) while the entire game logic stays in logical `960×540` coordinates — `LOGICAL_W`/`LOGICAL_H`/`RENDER_SCALE` constants in `config.js`, `CTX.setTransform(RENDER_SCALE, ...)` at the top of `gameLoop` (main.js) and the round-start clear. All `CANVAS.width`/`CANVAS.height` reads replaced with the logical constants (41 spots across combat/fighter/input/main/multiplayer/render). `#game-wrapper` max size raised to 1280×720, result: a noticeably larger, still-crisp window on laptops.
- **Weapon panels moved out of the playfield**: `#weapon-panel-p1`/`#weapon-panel-p2` no longer overlay the canvas — they now sit in side columns beside the game in a new flex row `#game-stage` (index.html), so characters, projectiles and HUD are never covered. Panels restyled compact: vertical icon-over-name slots (74px wide, 7px labels), rounded translucent container, height-capped with hidden scrollbar.
- **Reload indicator moved too**: the RELOAD countdown banner lives inside the side panel (top slot, `⏳ RELOAD Ns`), away from the playfield; the HUD weapon-meter/label under the P1 health bar stay as-is (they are part of the top HUD, not the playfield).
- **Mobile**: on screens ≤1024px the panels collapse into compact horizontal strip(s) docked above the touch controls (`bottom: calc(30% + 30px)`), left/right edges, so phone play stays usable.
- **Verified**: all test suites green — `smoke_full.js` (2000-frame sim, 0.09 ms/frame), `mk_features.js`, `mk_features2.js`, `smoke_mp.js`, `validate.js`.

## [2026-08-03] MK Combat Feel Phase 2 (Dash & Super Armor, Krushing Blow, Fatal Blow)
- **Dash Recovery (A5)**: dash already existed (double-tap A/D in `config.js`); it now leaves the fighter in 3 recovery frames after the dash ends, so dash-spamming is no longer free and dashes feel like committed movement.
- **Super Armor (A6)**: while a fighter is performing the super move (`attackState === 5`, incl. the new Fatal Blow boost), incoming melee hits no longer interrupt it — damage and flash still apply, but no hitstun/launch/knockdown (armor text "ARMOR!", small hitstop). Throws, lasso pull/strike and projectiles pierce the armor (MK rules — grabs beat armor).
- **Krushing Blow (A7)**: `applyHit` detects counter-hit situations — defender is mid-attack (`attackState > 0`) and not blocking — and uppercut/super/greatsword/hook deal **double damage** with ×2 hitstop, extra screen shake and "KRUSHING BLOW!" floating text. Punishes reckless offense.
- **Fatal Blow (A8)**: once per match, when a fighter drops below 30% HP, pressing Special (with less than 100 SP) triggers a one-time empowered super — `action('fatal_blow')` (attackState 5, 48 frames, `fatalBlowBoost = true`): wider hitbox (135 vs 110), damage 30 vs 18, and 60 frames of super armor. "FATAL BLOW!" text, screen shake, `superHit` sound. Availability state (`p1FatalBlowUsed`/`p2FatalBlowUsed`) lives in `config.js` state, resets on new match, "FATAL BLOW READY!" notifies the moment the threshold is crossed. Online: host broadcasts `fatal_blow` so the guest's side consumes the flag and plays the animation too; both directions sync `fatalBlowBoost`/`fatalBlowUsed` through the `sync` packet, so a guest-triggered Fatal Blow keeps the boosted hitbox/damage on the authoritative host side. Mobile: the SPECIAL touch button routes through the same `tapAction` path, so Fatal Blow works on phones.
- **Verified** with `mk_features2.js` (A5–A8 unit tests, all passed), plus `mk_features.js`, `smoke_full.js`, `smoke_combat.js`, `smoke_mp.js`, `validate.js` — all green.





