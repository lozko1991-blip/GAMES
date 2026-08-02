# Kronos Football — режим «Стрілець» (стрілялка по гравцях)

Детальний план додавання нової міні‑гри‑режиму до `penalty-master` — «вистріл по полю: б’єшь м’язь по гравцям, вони падають, нараховуються очки/комбо». Використовує **тільки існуючі асети та фізику** (Ball3D, SkeletalCharacter, gameVFX, gameAudio, safeStorage, карти/форми/м’ячі з SHOP_ITEMS). Новий режим — окремий `.overlay-screen`, не торкає основний PenaltyMasterGame.

> Статус: **РЕАЛІЗОВАНО (v1)** — 2026‑08‑02. Виконано кроки 1–7 (всі пункти розділу 7), окрім живого браузер‑тесту (крок 8 — ручний). Див. короткий підсумок нижче.
>
> Фактичні відхилення від плану:
> - Міні‑гра має **власний canvas** (`shoot-canvas`, 800×450), а не `game-canvas` (щоб не втручатися у фонову сцену пенальті).
> - `triggerShootMode()` додатково ставить `activeGameInstance.gameState='menu'` + `gameControls.reset()` на вході (і відновлює стан на виході) — це запобігає випадковому пенальті‑вистрілу у тлі, бо `gameControls` має власні `window`‑keydown/keyup‑слухачі, які інакше реагували б на Space/стрілки під час «Стрілеця».
> - Пози падіння: назви `fall` (анімація ~0.25с) та `fallen` (статично лежить) — див. `characters.js`.
> - Рекорд: `pm_shoot_best_score` (safeStorage).

## 1. Архітектура та підключення (за патерном basketball.js / matrixRun.js)

| Компонент | Джерело патерну | Новий режим робить так само |
|---|---|---|
| Міні‑гра‑клас | `BasketballGame` (basketball.js:4) `class BasketballGame { constructor(canvas, onClose) }` | `class PlayerShootGame { constructor(canvas, onClose) }` |
| UI‑кнопки | `basket-btn-left/right/jump/shoot` (basketball.js:215) | `shoot-btn-left/right/power/spin` (id в index.html) |
| Запуск з меню | `btn-basketball-menu` → `activeGameInstance.triggerBasketballGame()` (main.js:3309, 2543) | `btn-shoot-menu` → `activeGameInstance.triggerShootMode()` |
| Екран‑оверлей | `showScreen('screen-basketball')` / `screen-basketball-back` (main.js 2549, 3318) | `showScreen('screen-shoot-mode')` + `btn-shoot-back` |
| Результат/реплей | overlay з `btn-basket-replay`/`btn-basket-continue` (main.js:2580) | `screen-shoot-result` + `btn-shoot-replay`/`btn-shoot-back` |

### Порядок скриптів (index.html) — НЕ змінюємо!
`peerjs → config → audio → physics → characters → multiplayer → matrixRun → basketball → main.js`

Новий `src/shootMode.js` додаємо **перед main.js** (залежить: Ball3D, SkeletalCharacter, GoalkeeperAI? ні, gameVFX, gameAudio, safeStorage — усі вже глобальні раніше). `main.js` залишаємо останнім (він створює `activeGameInstance` та кнопку `triggerShootMode`).

## 2. Файли та що конкретно міняємо/додаємо

1. **`index.html`** — додаємо в меню (біля `btn-basketball-menu`):
   ```html
   <button class="menu-button" id="btn-shoot-menu">Стрілець</button>
   ```
   та новий overlay‑екран `screen-shoot-mode` (canvas той самий `game-canvas`, ще HUD‑шкали: балли, кількість влучань, комбо, час) і `screen-shoot-result`.
2. **`src/shootMode.js`** (НОВИЙ, ~500–700 рядків) — `class PlayerShootGame`:
   - `constructor(canvas, onClose)` — canvas/ctx, `this.ball = new Ball3D()`, `this.targets = []` (масив `SkeletalCharacter`), `this.aim`/`power` (копія PlayerControls‑логіки), `this.score`, `this.combo`, `this.hits`, `this.timeLeft`.
   - `start()` — спаун N таргетів рівномірно по полю (X в `[-3.6, 3.6]`, Z в `[5..9.5]`, Y=0), `setPose('idle')` кожному; `resetBall()`.
   - `onAimInput` / `onShoot` — повторюємо формулу player.js: `angleX = atan2(aimX, PENALTY_SPOT_Z)`, `angleY = atan2(aimY-BALL_RADIUS, PENALTY_SPOT_Z)`, power 0–100 (Space), `ball.kick(power, angleX, angleY, sideSpin, topSpin)`.
   - `loop(time)` / `update(dt)` — `ball.update(dt)`; `this.targets.forEach` `t.update(dt)`; `checkHits()`.
   - `checkHits()` — для кожного живого таргету: `if (ball.position.distanceTo(targetRoot) < BALL_RADIUS + TARGET_HIT_RADIUS)` → таргет `setPose('hit')` (падіння), знищуємо/деактівуємо таргет, `score += basePoints * comboMult * speedBonus`, `combo++`, `gameVFX.spawnGrassExplosion/targetHitExplosion`, `gameAudio.playPostHit()`.
   - `render(ctx, camera)` — рендеримо поле (можна reuse `GoalNet`-фоновку або `renderLevelBackdrop`‑логіку), 10‑11 цілей, м’яч (`ball.render`), HUD.
3. **`main.js`** — +`triggerShootMode()` (main.js:2543 `triggerBasketballGame` — копіюємо шаблон):
   ```js
   triggerShootMode() {
       showScreen('screen-shoot-mode');
       this.shootGame = new PlayerShootGame(document.getElementById('game-canvas'), () => {
           showScreen('screen-shoot-result'); /* + UI реплею */
       });
       this.shootGame.start();
   }
   ```
   + кнопка: `document.getElementById('btn-shoot-menu').addEventListener('click', () => { activeGameInstance.triggerShootMode(); });`
4. **`characters.js`** — **додаємо пози для падіння** у `SkeletalCharacter.update(deltaTime)`:
   - `case 'hit':` / `case 'fall':` — анімація: `spine`/head нахиляються вперед, `kneeL/R`/`hip` зг 折, `animationTimer` → інтерполяція до лежачого стану; `footL/R` стискаються. (Мінімальна «анімація падіння» — 1‑2 секунди, потім `setPose('hit_ground')` — лежать.)
   - Не змінюємо існуючі пози (`idle/run/kick_swing/...`) — лише додаємо нову гілку.
5. **`physics.js`** — **не змінюємо**. `Ball3D` переиспользується з усіма пост‑еффектами (ground bounce, post collision). Пости не тригеряться, бо таргети стоять у полі (Z∈[5;9.5]), а не у воротах. Якщо зручніше — таргети розташовуємо у `z > 0.05` і `x ∉ [-GOAL_WIDTH/2; GOAL_WIDTH/2]`, інакше goal‑post collision = feature.
6. **`config.js`** — додаємо константи для нового режиму:
   ```js
   const SHOOT_MODE_TARGET_COUNT = 11;
   const SHOOT_MODE_HIT_RADIUS = 0.42;      // BALL_RADIUS + 0.31
   const SHOOT_MODE_BASE_POINTS = 100;
   const SHOOT_MODE_TIME_LIMIT = 60;        // секунд на раунд
   const TARGET_POSES = { ... };
   ```
   Конвенція `pm_*` зберігання: `pm_shoot_best_score`, `pm_shoot_total_hits`. (Теж через `safeStorage`.)

## 3. Геймплейний цикл (один раунд)

1. **start()** — `showScreen('screen-shoot-mode')`, спаун N таргетів (SkeletalCharacter, `isGoalkeeper=false`), кожному `setPose('idle')`, `applyLevelColors(LEVEL_PRESETS[currentLevel])` (reuse).
2. **aiming** — гравець цілиться (клавіатура A/D/W/S чи swipe / touch), `power` заряджається Space (0→100, `110*dt`), Q/E — зміщення старту (reuse `playerStartingOffsetX`‑логіка). HUD: індикатор power, прицел.
3. **shoot** — `ball.kick(...)`, `gameAudio.playKick()`, `gameVFX.spawnGrassExplosion`, ставимо `gameState='flight'`.
4. **flight** — `ball.update(dt)` (drag, Magnus‑spin, wind, gravity, ground bounce). Паралельно `checkHits()`:
   - Якщо м’яч влучив у таргет → таргет `setPose('hit')` (падіння), `combo++`, `score += 100 * combo * (1 + speedAtImpact/30)` (швидкість влучання бонусує), `targetHits++`, VFX + SFX.
   - Якщо м’яч зупинився (`velocity.length() < 0.5`) або отримавший ground‑bounce без влучання → кінець польоту (resetBall або результат раунду).
   - Таргети можуть "реакцію": швидке `setPose('flinch')` перед падінням.
5. **resetShot()** — підготовка нового польоту (ball.reset(), ще N таргетів, power=0).
6. **end of round** — коли всі таргети вбиті або час (timer `SHOOT_MODE_TIME_LIMIT`) закінчився → `showScreen('screen-shoot-result')`: кількість влучань / % / комбо / найкращий рекорд (`pm_shoot_best_score`).

## 4. Переваги / що переиспользується

- **Фізика м’язя** `Ball3D` ціликом (drag, Magnus, вітер, bounce) — виглядає «так само», як виштовхування пенальті.
- **Анімація гравця/воротаря** `SkeletalCharacter` + `applyLevelColors` (форма, кольори, чобач).
- **Екіпіровка**: `pm_equipped_ball` (fire/ice/neon/gold) → візуал м’язя, `pm_equipped_kit`/`boots`/`cap` → зовнішній вигляд таргетів.
- **VFX/SFX**: `gameVFX.spawnGrassExplosion/spawnTargetHitExplosion/spawnConfetti`, `gameAudio.playKick/playPostHit/playGoalCheer`.
- **Камера/3D‑проєкція** `Camera3D` — та ж перспектива.
- **safeStorage / PM‑ключі** — `pm_shoot_*`.
- **UI‑патерн overlay‑screen + showScreen** + `.btn-back`.

## 5. Ризики і як їх не дати «зламати гру»

- **Не ламати Ball3D**: не експортуємо змінений `update`/`kick`; не чіпаємо `GOAL_POST_RADIUS`‑колізії — вони не тригеряться для таргетів (таргети не у воротах).
- **Не ламати меню**: кнопка `btn-shoot-menu` — окремий id, `showScreen('screen-shoot-mode')` просто переключає `.active` між overlay‑скрінами (як basketball). `btn-shoot-back → showScreen('screen-main-menu')`.
- **Не ламати PenaltyMasterGame**: `triggerShootMode()` створює окремий `this.shootGame` та окремий overlay — як `triggerBasketballGame()`. При виході видаляємо overlay + `shootGame = null`.
- **Пози в characters.js**: додаємо лише нову `pose`-гілку `if/else`; існуючі пози нетронуті → `node --check` і робота воротаря/гравця не постраждють.
- **Пам’ять**: пул часток `gameVFX` (400) — не перевищимо; таргетів ~11, кожен `SkeletalCharacter` легкий.
- **Перевірка**: `node --check src/shootMode.js src/characters.js src/main.js src/index.html`(HTML ручна)`. Гейм‑тест: відкрити `index.html`, меню → «Стрілець», промінь має влучати у статуєтку, вона падає, рахунок росте, ESC/back → в меню.

## 6. Додаткові ideї (не в обов’язковій частині v1)

- **Рівні**: кожен рівень (Шкільний двір → Лос‑Анджелес) задає складність таргетів (швидше рухаються, менше часу).
- **Рух таргетів**: `electricMine`‑логіка (bouncing X) — reuse для «хлопців‑бегунів».
- **Скін‑бонуси**: `ice`‑м’яч ковзає далі, `fire`‑м’яч швидше → вищий бал.
- **Колекція**: збиті таргети дають картки угорі (це ж `CARD_DATABASE`) — інтеграція з колекцією.
- **Онлайн**: передати `kick`‑подію через `sendNetData` (multiplayer.js pattern) для соревновання.

## 7. План розробки (конкретні кроки)

1. ✅ `index.html`: додати `btn-shoot-menu` у меню + overlay `screen-shoot-mode`/`screen-shoot-result` (CSS — reuse `.overlay-screen`).
2. ✅ `config.js`: додати константи `SHOOT_MODE_TARGET_COUNT`, `SHOOT_MODE_HIT_RADIUS`, `SHOOT_MODE_BASE_POINTS`, `SHOOT_MODE_TIME_LIMIT` (+ `SHOOT_MODE_TARGET_Z_MIN`, `SHOOT_MODE_TARGET_Z_SPAN`, `SHOOT_MODE_AIM_X_MAX`).
3. ✅ `characters.js`: додати пози `fall`/`fallen` у `SkeletalCharacter.update` (падіння ~0.25с → лежить).
4. ✅ `src/shootMode.js` (новий): `class PlayerShootGame` (constructor/start/loop/update/render/checkHits/resetShot + HUD; власні key‑слухачі + мобільні кнопки; переиспользує Ball3D/Camera3D/GoalNet/SkeletalCharacter/gameVFX/gameAudio).
5. ✅ `index.html`: підключити `<script src="./src/shootMode.js">` перед main.js.
6. ✅ `main.js`: `triggerShootMode()`, кнопка `btn-shoot-menu`, `btn-shoot-back`/`btn-shoot-replay`/`btn-shoot-menu-back` (+ захист від подвійного запуску, gameState‑switch + gameControls.reset()).
7. ✅ `node --check` кожного файлу → без SyntaxError (shootMode/main/characters/config/physics/audio — усі OK).
8. ⏳ Браузер‑ручний тест: меню → «Стрілець» → приціл → Space → м’яч летить → влучання → падіння → рахунок росте → back → у меню.

**Примітка:** документ спочатку був планом; станом на 2026‑08‑02 режим «Стрілець» реалізовано повністю (крім ручного браузер‑тесту).
