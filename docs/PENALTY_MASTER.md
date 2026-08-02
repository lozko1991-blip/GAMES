# Kronos Football (Penalty Master) — технічна документація

Симулятор пенальті на чистому HTML5 Canvas + міні-ігри (basketball, matrix run). Без збірки, без npm, без ES6 modules — усі модулі підключаються `<script>` у строгому порядку і спілкуються через глобальні змінні.

- Мова інтерфейсу: українська.
- Перевірка: проєкт НЕ має validate.js → після змін виконуй синтаксичну перевірку кожного зміненого файлу: `node --check src/файл.js`.
- LocalStorage: ключі `pm_*`, доступ через обгортку `safeStorage` (config.js).

## Порядок завантаження (index.html) — КРИТИЧНИЙ

`peerjs@1.5.4 (CDN unpkg) → src/config.js → src/audio.js → src/physics.js → src/characters.js → src/multiplayer.js → src/matrixRun.js → src/basketball.js → src/main.js`

`main.js` — останній: він залежить від усіх попередніх (класи Ball, SkeletalCharacter, GoalkeeperAI, BasketballGame, MatrixRunGame, multiplayerState, gameAudio, safeStorage). Нові скрипти додавай ТІЛЬКИ в кінець списку.

## Файли

| Файл | Рядків | Роль |
|---|---|---|
| `index.html` | — | Розмітка, меню, мобільний геймпад, кнопка fullscreen, підключення скриптів |
| `src/style.css` | — | Стилі |
| `src/config.js` | ~230 | Константи фізики, складності, рівнів, магазину, клубів, карток; `safeStorage` |
| `src/audio.js` | 425 | `AudioManager` — усі звуки гри; екземпляр `gameAudio` |
| `src/physics.js` | 1061 | `Vector3`, `Camera`, `Particle`, `Ball` — 3D-проєкція та фізика м'яча, сітка воріт |
| `src/characters.js` | 1001 | `SkeletalCharacter` (скелетна анімація), `GoalkeeperAI` (ШІ воротаря) |
| `src/multiplayer.js` | ~240 | PeerJS: хост/гість, ролі striker/keeper, кімнати за PIN |
| `src/matrixRun.js` | 802 | Міні-гра `MatrixRunGame` (викликається з кар'єри клубу) |
| `src/basketball.js` | 852 | Міні-гра `BasketballGame` (нагорода після результативного матчу) |
| `src/main.js` | ~3600 | Головний клас `PenaltyMasterGame`, UI, екрани, магазин, кар'єра, колекція |

## config.js — константи та дані

- Фізика: `PHYSICS_GRAVITY = 9.81`, `BALL_MASS = 0.43`, `BALL_RADIUS = 0.11`, `GOAL_WIDTH = 7.32`, `GOAL_HEIGHT = 2.44`, `PENALTY_SPOT_Z = 11.0`.
- `DIFFICULTY_PRESETS` — EASY / MEDIUM / HARD / LEGEND: `{ reactionDelay, diveSpeed, predictionError, mistakeChance }`.
- `LEVEL_PRESETS` — палітри/параметри рівнів (стадіони).
- `safeStorage` — обгортка localStorage з `getItem(key)` / `setItem(key, value)` (безпечна обробка недоступності сховища).
- `SHOP_ITEMS`, `CLUB_PRESETS` (кар'єра: `id 'polissya'` за замовчуванням, `requiredPrestige`, `transferFee`, `logo`), `CARD_DATABASE` (колекція карток).

## physics.js

- `Vector3` — вектор; `Camera` — проєкція 3D→2D (`project`).
- `Particle` — частинка зі зв'язками (Verlet-стиль, сітка воріт).
- `Ball` — м'яч: `reset()`, `kick(kickPower, targetAngleX, targetAngleY, sideSpin, topSpin)`, `updateRotationMatrix(deltaTime)` (обертання м'яча).
- Читає з safeStorage: `pm_equipped_goal`, `pm_equipped_stadium`, `pm_equipped_ball`.

## characters.js

- `SkeletalCharacter` — скелетна фігура з суглобами (pelvis, spine, head, shoulderL/R, elbowL/R, handL/R, hipL/R, kneeL/R, footL/R).
  - `constructor(isGoalkeeper = false)`, `applyLevelColors(levelPreset)`, `setPose(poseName)` (наприклад `'kick_strike'`), `update(deltaTime, runSpeedMultiplier)`, `render(ctx, camera, canvasWidth, canvasHeight)`.
  - Кольори екіпіровки: jersey, shorts, socks, boots, cap — читає `pm_equipped_boot`, `pm_equipped_cap`.
- `GoalkeeperAI` — воротар:
  - `constructor(skeletalKeeper)`, `reset()`, `setDifficulty(diffPreset)`, `simulateBallToGoal(ball)`, `onBallKicked(ball)`, `update(deltaTime, ball)`, `checkSaveCollision(ball)`.

## audio.js — `AudioManager` (екземпляр `gameAudio`)

- `init()`, `resume()` — ініціалізація/відновлення AudioContext.
- Звуки: `playKick()`, `playPostHit()` (стійка/штанга), `playNetRustle()` (сітка), `playWhistle()` (свисток), `playKeeperSave()`, `playGoalCheer()`, `playMissGroan()`.
- Фон: `startAmbient()`, `stopAmbient()`; налаштування `setSoundEnabled(val)`, `setAmbientEnabled(val)`; `createNoiseNode(duration)`.

## multiplayer.js (PeerJS)

- `multiplayerState` — `{ isOnline, isHost, role ('striker' | 'keeper'), peer, conn, roomCode, opponentReady, localReady, netReady }`.
- `hostRoom()` — хост створює кімнату, PIN = `'pm-' + 5-значний код`.
- Синхронізація: у т.ч. перемикання `activeGameInstance.gameState = 'kick'` у супротивника (стрілка каже «бий»).

## matrixRun.js — `MatrixRunGame`

`class MatrixRunGame { constructor(canvas, onWin, onFail, clubPreset) }` — міні-гра-випробування у кар'єрі клубу. `onWin`/`onFail` — колбеки результату, `clubPreset` — клуб кар'єри.

## basketball.js — `BasketballGame`

Міні-гра «баскетбол» (нагорода за матч). Клас `BasketballGame(canvas, onClose)`.

- Цикл: `start()`, `loop(time)`, `update(dt)`, `draw()`.
- Управління: `bindEvents()` / `unbindEvents()`, `movePlayer(amount)`, `jump()`, `shootKeyboard()` / `shootBall()`.
- М'яч: `resetBall()`, `positionBallOnPlayer()`; стани `ball.state`: `'held'` → `'flying'` → `'scored'` / `'missed'`.
- Інше: `resetWind()` (вітер), `spawnTrailParticle(x, y, color)`, `checkCollisions()`, `handleScore()` / `handleMiss()` (із `setTimeout`), `spawnConfetti(color, count)`.
- Активний м'яч із магазину: `pm_equipped_ball` (за замовчуванням `'classic'`).

## main.js — ядро гри

### Класи
- `PlayerControls` (~рядок 15) — ввід гравця: кнопки, `aimX`/`aimY`, `power`, `isChargingPower`, `sideSpin`, `topSpin`; на мобільних — swipe-прицілювання.
- `PenaltyMasterGame` (~рядок 213) — головний клас (кілька тисяч рядків).

### Машина станів (this.gameState)
`'aiming'` → `'fake_swing'` (обманний замах) → `'runup'` (розбіг: `runupProgress`) → `'kick'` (удар: `player.setPose('kick_strike')`, камера стежить за м'ячем) → `'flight'` → `'result'` → `'aiming'` (наступний удар).

Особливі стани/події: мішені бонусів (трюкові удари, зокрема `electricMine`), `matrix_headshot_cutscene` (рядок ~2638) — катсцена головою після влучання, `showBasketballRewardOverlay` — нагорода-баскетбол.

### Екрани та UI
- `showScreen(screenId)` (~рядок 2728), `togglePauseMenu()`, `resizeGameCanvas()`, підключення мобільних кнопок.
- `setDifficultyPreset(diffName)` (зберігає у `pm_difficulty`).

### Магазин
- `getPlayerCoins()` / `addPlayerCoins(amount)` (`pm_coins`), `renderShopItems()`, `handleShopItemClick()` (купівля → `pm_coins - price`, запис у owned/equipped), `selectShopTab()`.

### Кар'єра
- `getPlayerPrestige()` (`pm_prestige`), `renderCareerScreen()`; трансфери клубів: перевірка `requiredPrestige`, сплата `transferFee`, запис `pm_selected_club`.

### Колекція карток
- `getOwnedCards()` / `saveOwnedCards()` (`pm_owned_cards`), `renderCollectionDeck()`, `triggerPackOpening()` (відкриття пакунків), екіпірування картки → `pm_equipped_card` (за замовчуванням `'c_palazhchenko'`).

### Статистика та налаштування (зберігаються у safeStorage)
`pm_total_shots`, `pm_total_goals`, `pm_goalkeeper_saves`, `pm_max_streak`, `pm_post_hits`, `pm_sound_effects`, `pm_ambient`, `pm_slowmo`, `pm_difficulty`, `pm_coins`, `pm_prestige`.

### Тест економіки
`runEconomyTestIfRequested()` — службовий тест: встановлює `pm_coins=1000`, `pm_prestige=500`, `pm_selected_club='polissya'`, `pm_owned_balls=['classic']`, `pm_owned_cards=['c_palazhchenko']`.

## LocalStorage: повний список ключів `pm_*`

`pm_coins`, `pm_prestige`, `pm_selected_club`, `pm_owned_balls`, `pm_equipped_ball`, `pm_equipped_boot`, `pm_equipped_cap`, `pm_equipped_kit`, `pm_owned_cards`, `pm_equipped_card`, `pm_equipped_goal`, `pm_equipped_stadium`, `pm_total_shots`, `pm_total_goals`, `pm_goalkeeper_saves`, `pm_max_streak`, `pm_post_hits`, `pm_sound_effects`, `pm_ambient`, `pm_slowmo`, `pm_difficulty`.

## Шпаргалка «де що змінити»

- Фізика м'яча / удар → physics.js (`Ball.kick`, `updateRotationMatrix`).
- Воротар (складність, реакція, кидки) → characters.js (`GoalkeeperAI`).
- Анімація персонажів/поз → characters.js (`SkeletalCharacter.setPose`, `render`).
- Звуки → audio.js (`gameAudio`).
- Баланс складності → config.js (`DIFFICULTY_PRESETS`).
- Магазин/кар'єра/колекція → main.js (функції вище).
- Онлайн → multiplayer.js.
- Міні-ігри → basketball.js, matrixRun.js.
