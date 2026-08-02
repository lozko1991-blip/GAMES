# Битва за Труханів — технічна документація

Файтинг на чистому HTML5 Canvas 2D. Без збірки, без npm, без ES6 modules — усі модулі підключаються `<script>` у строгому порядку і спілкуються через глобальні змінні.

- Мова інтерфейсу: українська. Жанр: 1v1 файтинг (місцевий / локальний 2 гравці / онлайн через PeerJS).
- Перевірка цілісності проєкту: `node validate.js` у папці `battle-for-truhanov/` → очікуй `SUCCESS: All scripts loaded in the correct order!` (код 0).

## Порядок завантаження (index.html) — КРИТИЧНИЙ

`peerjs (CDN) → assets.js → config.js → audio.js → particles.js → projectile.js → fighter.js → ai.js → combat.js → input.js → render.js → multiplayer.js → main.js`

Нові скрипти, що залежать від існуючих, додавати ТІЛЬКИ в кінець списку. Класи оголошуються у своєму скрипті, але якщо потрібна посилання на клас із раннього скрипта — див. патерн `let AI_ENGINE;` (declared у config.js, ініціалізований у кінці ai.js).

## Файли та розміри

| Файл | Розмір | Роль |
|---|---|---|
| `index.html` | 27.6 КБ | Розмітка, меню, HUD, підключення скриптів |
| `style.css` | 24.4 КБ | Стилі меню, екранів, кнопок |
| `assets.js` | 11.5 МБ | Base64-дані: CHARACTERS, LEVELS, SHOP_SKINS, SHOP_UPGRADES, SHOP_WEAPONS (НЕ ЧИТАТИ — opencode.json блокує) |
| `assets/*.png` | ~10 файлів | Текстурні зображення рівнів (borschaga, bortnychi, brain, dubyshche, hidropark, khreshchatyk, kneu, kyivstar, shuliavka, trukhaniv) (НЕ ЧИТАТИ) |
| `config.js` | 11.6 КБ | Глобальний стан, константи, економіка, `let AI_ENGINE;` |
| `audio.js` | 8.6 КБ | AudioSys — Web Audio API, тони/шум/BGM |
| `particles.js` | 3.9 КБ | Клас Particle (кров, пил, вибухи) |
| `projectile.js` | 7.1 КБ | Клас Projectile (снаряди зброї) |
| `fighter.js` | 74.6 КБ | Клас Fighter — фізика, атаки, хітбокси, стани |
| `ai.js` | 11.6 КБ | Клас AIController — поведінка бота |
| `combat.js` | 15.7 КБ | checkCollisions() — зіткнення снарядів і цілей |
| `input.js` | 22.1 КБ | Клавіатура, жести, зброя, вібрація |
| `render.js` | 13.8 КБ | Малювання фону, погоди, HUD, фаталіті |
| `multiplayer.js` | 19.4 КБ | PeerJS: лобі, хост/гість, синхронізація |
| `main.js` | 30.5 КБ | Екрани, ігровий цикл, потік раундів, магазин, управління |
| `validate.js` | 3.4 КБ | Перевірка порядку скриптів у Node (vm) |
| `instruction.md` | — | Опис гри для людей |
| `AI_CHANGELOG.md` | — | Журнал змін, зроблених AI |

## Глобальний стан (config.js)

- `CANVAS`, `CTX` — canvas і 2D-контекст.
- `GROUND_Y = 450` — лінія землі; `GRAVITY = 0.55`.
- `state` — об'єкт: `currentLevelIndex`, `difficulty`, `timer` (99), `roundNum`, `p1Wins`/`p2Wins`, `finishHimStage` (фаталіті), `screenShake`, `hitstopFrames`, `isRunning`, `projectiles` (масив снарядів), `particles`, `debris`.
- Онлайн-стан: `state.isOnline`, `state.isHost`, `state.netReady`, `state.peer`, `state.netConn`.
- `keyboardGestureMap` — мапа жестів клавіатури.
- `LEVELS.forEach(...)` — завантаження фонового зображення кожного рівня з assets.js.

## Економіка (LocalStorage, ключі `truhanov_*`)

- `truhanov_coins` — старт 200.
- `truhanov_owned_weapons`, `truhanov_equipped_weapon` — арсенал.
- `truhanov_owned_skins`, `truhanov_equipped_skin`.
- `truhanov_upgrades` — `{ hp, dmg, charge }` (впливають на maxHp, шкоду, заряд).
- `truhanov_win_streak` — серія перемог.

## Модулі та їх функції

### assets.js (НЕ читати)
Оголошує константи: `CHARACTERS` (9 бійців: lozko, demchuk, kolomiiets, palazhchenko, andriushka, olezhka, jonik, isnusha, sofiika), `LEVELS` (10 рівнів), `SHOP_SKINS`, `SHOP_UPGRADES`, `SHOP_WEAPONS`. Всередині — довгі Base64 data-URI; читати заборонено (див. opencode.json), використовувати через константи.

### config.js
Глобальні змінні та стан (див. вище). Також оголошує `let AI_ENGINE;` без ініціалізації — патерн відкладеної ініціалізації.

### audio.js — `AudioSys`
- `init()` — створення AudioContext (після user gesture).
- `playTone(freq, type, duration, vol, slideTo)` — синтез тону зі слайдом частоти.
- `playNoise(duration, vol, isLowPass)` — шум (вибухи, удари).
- `resumeAudio()` та слухачі `touchstart` — відновлення контексту на мобільних.
- BGM: `isPlayingBGM`, `bgmInterval` — циклічний фоновый тон.

### particles.js — `Particle`
Прості 2D-частинки (кров, пил, іскри). Малюються в render.js, оновлюються з гравітацією.

### projectile.js — `Projectile`
- Конструктор `(x, y, vx, color, type, owner, vy = 0)`; `radius` = 24 для `charged_rocket`, інакше 15.
- `update()` — рух; `draw()` — особливі візуали: `water`, `lightning`, `fire`, `bullet`, стріла лука (кастомний малюнок).

### fighter.js — `Fighter`
- Конструктор `(id, name, x, isLeft, config)`: `width 60`, `height 150`, `HP 100`, `sp` (супер-енергія).
- `maxHp = (config.maxHp || 150) + upgrades.hp * 15`.
- Поля: `skinColor`, `clothColor`, `projColor`, `projType`, `specialAttackType`, `fatalityType`, `charId`, `logo`, `hairColor`, `hitBox`, `comboCounter`, `skeleton` (кути кінцівок), `dashTimer`, `juggleCount` (підкидання у комбо), `weaponCharge`/`weaponTimer`/`weaponSelected`/`activeType` (зброя).
- Стани атак через `attackState` (числові коди атак — перевіряй у коді перед зміною), knockback/launch/knockdown, супер-прийоми, фаталіті (finish him).

### ai.js — `AIController`
- `update(bot, player)` — головний метод; одразу пропускає хід, якщо бот: мертвий, в стані dazed/hitstun/launched/knockdown, `attackState > 0` (атака у розпалі), або `state.isMatchEnding`.
- Реагує на зброю гравця: якщо гравець дістає pipe/rifle/bazooka — бот випадково обирає одну з них.
- Поля: `reactionQueue`, `decisionTimer`, `botComboQueue`, `shouldPunish`, `footsiesTimer`/`footsiesDir` (тримати дистанцію).
- У кінці файлу: `AI_ENGINE = new AIController();` — відкладена ініціалізація.

### combat.js — `checkCollisions()`
- Прохід по `state.projectiles`: перевірка попадання в супротивника власника, `proj.update()`, видалення за межами екрана.
- Зіткнення з землею для `debris` і `lightning_bolt` → `createElementalBurst()`.
- Снаряди без власника (`owner == null`), `debris` і блискавка б'ють ОБОХ бійців.
- Шкода: bullet **10**, rocket **18**, charged_rocket **16**, debris **6**.

### input.js
- `triggerHaptic(ms)` — вібрація (`navigator.vibrate`).
- `getPlayerWeaponType(player)`; `triggerWeapon(player)` — активувати зброю (логіка бота окрема).
- `cycleWeapon(player)` — p1 циклить `state.ownedWeapons`; бот циклить `['none','pipe','rifle','bazooka','sausage','bow','nunchucks','spear','greatsword']`.
- `weaponTimer = 420` — тривалість активної зброї.

### render.js
- `updateWeaponHUD()`, `drawBackgroundGlow()`, `drawLevelBackdrop()` (horizon = 300; особлива обробка рівня trukhaniv).
- Погодні ефекти, HUD (HP, раунд, таймер, комбо), анімації фаталіті.

### multiplayer.js (PeerJS)
- `updateOnlineStatus()`, `onDiffChange(val)` (перемикання панелі складності), `resetOnlineState()`.
- `joinLobby(num)` → `new Peer('truhanov-lobby-' + num)`; хост/гість, `netReady`, синхронізація стану повідомленнями.

### main.js
- `showScreen(screenId)` — екрани: `screen-main-menu`, `screen-select-sp`, `screen-select-local`, `screen-online-lobby`, `screen-instructions`, `screen-shop`.
- `toggleFullscreen()`; `initMobileControls()`; `drawScene()`.
- `gameLoop()` — `hitstopFrames` (стоп-кадри при ударах) → зменшення лічильника → `requestAnimationFrame`.
- Потік раундів: `roundNum`, `p1Wins`/`p2Wins`, таймер 99, кінець матчу (`isMatchEnding`), магазин і купівля (coins/upgrades/skins/weapons).

## validate.js — як працює перевірка

1. Регуляркою витягує порядок `<script src="...">` з index.html.
2. Мокає браузерні глобали (window, document, canvas-контекст).
3. Завантажує кожен скрипт у Node vm послідовно.
4. Очікує вивід `SUCCESS: All scripts loaded in the correct order!` і код 0; інакше — помилка з номером проблемного скрипта.

## Журнал змін (AI_CHANGELOG.md)

Після будь-якої зміни логіки — додай запис: дата `[YYYY-MM-DD]`, що змінив, чому, чим перевірено. Історія вже містить: перенесення `initMobileControls`/`drawScene` у main.js, `resumeAudio`/`touchstart` у audio.js, відкладену ініціалізацію `AI_ENGINE` (фікс ReferenceError), синтаксичні хотфікси.

## Шпаргалка «де що змінити»

- Баланс шкоди зброї → combat.js.
- Поведінка бота → ai.js.
- HP/фізика/атаки бійця → fighter.js (обережно, файл великий і має специфічне форматування від Python-спліту — не реформатуй).
- Нова зброя/скини → константи у assets.js (через користувача!).
- Нові екрани → index.html + showScreen у main.js.
- Онлайн-логіка → multiplayer.js.
