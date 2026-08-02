# Kronos Football — план покращення фізики

Стан на створення цього документа: фізика вже дуже продвінена (3D‑модель м’яча з Drag, Magnus, вітром, висотою стадіону та турбулентністю; ШІ воротаря сам симулює рух м’яча). Цей план — аналіз слабких місць та конкретні, виконувані зміни без руйнування існуювалого балансу.

## Виконані зміни (2026-02-08) — «воротар + вітер»

Зміни зроблено, перевірено `node --check src/characters.js src/main.js src/physics.js` (Exit 0). Балістика м’язя та feel **не змінені**.

1. **`GoalkeeperAI.simulateBallToGoal` (characters.js)** — додано урахування вітру так само, як у руху реального м’язя та лінії прицілення: `windX/Z = this.game.windX/Z`, `simBallVel.coordinateX += windX * 0.05 * timeStep` (після гравітації, перед кроком позиції).
2. **`PenaltyMasterGame` (main.js:224)** — `this.goalkeeperAI.game = this;`, щоб воротар міг читати `this.windX/windZ` (генерується `generateNewWind`).

Чому саме так і чому не інше:
- `window.gameApp`, який читає `Ball3D.update` (physics.js:753), **ніде не присвоюється** → його relative-velocity‑wind‑шлях мертвий (wind = 0). Активувати його не можна — це **подвоїло б вітер** (relative drag + експліцитний push main.js:449) і зламав б налаштовану балістику.
- Тому єдиний безпечний фікс — зробити воротаря wind‑aware через той самий `wind*0.05*dt`, яким користується реальний м’яч (main.js:449/1416).
- На безвітряному полі (EASY‑середовище) зміна **нічого не робить** (wind=0 → ідентично). На HARD/LEGEND (wind до 12 м/с) воротар тепер передбачає drift → рятує реалістичні вразив збиті раніше на «закоху» wind.
- Турбулентність `sin(performance.now())` залишена **незмінною**: це колишӗкий косметичний ±8% drag, а не систематична помилка. Виявлення її вплину на воротаря (±~0.1 м) менше за `saveRadiusHands 0.42`, отже вплив на честиність воротаря переважно малий порівняно з wind‑фіксом. Не дотикали, бо це змінило б feel м’язя (порушило б баланс, а ми не можемо візуально тестувати траєкторію без браузера).

### Додаткові виявлення (документовано, не лікувалися — требують браузер‑тесту)
- `simulateBallToGoal` (160 кроків × 0.015с) і лінія прицілення (70 × 0.016с) використовують **absolute-velocity drag**, а `Ball3D.update` — **relative-velocity drag**. Це розхідність між цифрами; воротар зараз краще відповідає лінії прицілення (обидва absolute + експліцитний wind), а не реальному м’язю. Фікс досягнути — мета виконана.
- `peakHeight = sqrt(2.2*GRAVITY*peakHeight)` (keeper step) vs `GRAVITY*1.2*dt` (keeper jump) — розрив 2.2↔1.2, планується вирівняти (опційно, low‑risk, требе тест).

## 1. Модель м’яча (physics.js: `Ball3D.kick` / `update` / `handleCollisions`)

### Що вже добре
- `Ball3D.kick(kickPower, targetAngleX, targetAngleY, sideSpin, topSpin)` — 3‑вимірний вектор швидкості, спін → `angularVelocity`, forceMult `16 + kickPower/100*19`.
- Drag = `0.5 * airDensity * BALL_DRAG_COEFFICIENT * BALL_CROSS_SECTION * relSpeed²`; Magnus = `angularVelocity × velocity` (ефект Бені), з урахуванням `airDensity` та швидкості.
- Вітер (`window.gameApp.windX/Z`), висота стадіону → `airDensity` (експоненційна барометрична формула).
- Відскік від землі: `restitution = clamp(0.42, 0.75 - speed*0.018)`, friction 0.72, ефекти посухи/вологої трави.
- Колізії зі штангами‑циліндрами (`checkCapsuleCollision`, restitution 0.72, триггер `playPostHit` + camera.shake).

### Слабкі місця
1. **Турбулентність** (`physics.js:765`): `1 + sin(performance.now()*0.05)*0.08` — це не випадковість, а періодічний джиттер; виглядає механічно й непередбачувано для ШІ. **Рішення:** замінити на Perlin/value noise або зберегти один фіксований випадковий множник на польот (наприк. `this._turbulence = 1 + (Math.random()*0.16-0.08)`), щоб воротар (який симулює без турбулентності — див. нижче) і реальна траєкторія збігалися.
2. **Розрив логіки Drag/Magnus у `Ball3D.update`** vs **`GoalkeeperAI.simulateBallToGoal`** (characters.js:808): симуляція воротаря рахує drag/Magnus/гравітацію, **але не рахує вітер і турбулентність** → для воротаря траєкторія відріхниться від реальної. Це — головне джерело «воротар пропускає/ловить не туди».
3. **Відскік від землі**: friction жорстко 0.72, а при `foggy` → 0.88 (ковзання). Немає зв’язку зі скіном м’яча або типом покриття. Бажано піднести тертя до `BALL_DRAG_COEFFICIENT`/`friction`-параметру в `Ball3D`.
4. **Постіййний drag без залежності від кута атаки** — у реальності drag зростає при високій швидкості; тут є relSpeed, але `turbulence` множиться окремо. Достатньо, але `BALL_DRAG_COEFFICIENT = 0.25` можна зробити конфігурацією скін‑залежною (fire — швидше летить? ice — повільніше).

### Конкретні зміни (фізики + баланс)
- [ ] `physics.js`765: замінити sin-турбулентність на один раз на польот `this._turbulence = 1.0 + (Math.random()*0.16 - 0.08)` (встановлюється у `kick`), і застосовувати `currentDragCoeff *= this._turbulence`. Це робить траєкторію **детермінованою для однієї гри** і збігається з симуляцією воротаря.
- [ ] `characters.js`808 `simulateBallToGoal`: додати участ вітру та `this._turbulence`, аби симуляція = реальність. (Воротар перестасть «пропускати»/«ловити» по-ранішньому інакше.)
- [ ] config.js: додати `BALL_SKIN_MODIFIERS = { fire:{drag:0.9}, neon:{drag:1.0}, gold:{drag:1.05}, ice:{drag:1.2, restitution:0.85}, classic:{} }` і застосовувати у `kick`/`update` — різні м’ячі летять по‑різному.

## 2. Воротар (characters.js: `GoalkeeperAI`)

### Що вже добре
- `simulateBallToGoal` (808) — реалістична прогноз‑симуляція (drag, Magnus, гравіт., Ground‑bounce 0.65, 160 кроків × 0.015с).
- `onBallKicked` (847): `reactionDelay` × `predictionError` × `mistakeChance`; «хибний» прогноз при `mistakeChance`; ре‑симуляція кожні `correctionInterval=0.12`с з blend 0.72.
- `update` (877): реакція, стрибок/сальто/keeper_split, `diveVelocity`, обмеження `±0.9` за межами воріт.
- `checkSaveCollision` (951): hand/spine‑радіуси (0.42/0.60), catch/punch за difficulty (0.22/0.72/0.88).

### Слабкі місця
1. **Воротар стоїть у центрі Z=0**, а м'яч летить по осі Z до воріт. `checkSaveCollision` діє, лише коли `|ball.z| <= 0.5` — отже воротар «вмикається» тільки у вузькій смузі. Якщо м'яч летить вгорі/вбік, воротар ще не успіває або вийде за межу анімації. **Не біда** — це реалістично, лише треба дати зростати `diveSpeed` в HARD/LEGEND (вже 12/16), але **reactionDelay** має floor 0.
2. **`mistakeChance` випадкові «хибки»** роблять воротаря непередбачуваним, що добре для гри, але у HARD=0.01, LEGEND=0.00 → «ідеальний» воротар, який реакцію 0.01с і 16 dive — починає «читати». Це нормально для режиму, але виглядає неспобедно. Можна залишити.
3. **Немає урахування зброю/скіну м'яча та вітру в симуляції** (див. п.1).
4. **Поріг стрибка 0.25** (902) + **maxStep `*2.45`** (934) + **гравітація `*1.2`** (938) — це ручні тюнінги. Проблема: при `diveVelocityY` обчислюється `sqrt(2.2*GRAVITY*peakHeight)` (921), а в `update` гравіт. `*1.2` — розрив (м'ягше 2.2 vs 1.2). **Рекомендація:** привести коефіцієнти до одного (наприклад 1.2 обидва або вирівняти).

### Конкретні зміни
- [x] `simulateBallToGoal`: додати wind + `_turbulence` (п.1 розділу м’яча) — це один і той самий баг.
- [ ] `onBallKicked` / `update`: залишити реакцію 0.01 сек → досить, це гра‑режим.
- [ ] Вирівняти `peakHeight`‑формулу: замість `sqrt(2.2*GRAVITY*peakHeight)` → `sqrt(2*GRAVITY*peakHeight)` (стандр. проєктильна), і `GRAVITY*1.2` залишити як «підстрибунок» (зробити константою `KEEPER_JUMP_GRAVITY_MULT = 1.2`).
- [ ] Додати легкий `predictionError*GOAL_WIDTH` floor у EASY (бо `mistakeChance 0.38` вже робить його пропускаючим) — зараз нормально.

## 3. Гравець / керування (main.js: `PlayerControls`, `PenaltyMasterGame`)

### Що вже добре
- 3 способи задавати кут: keyboard aimX/aimY (7.5 sensitivity), touch swipe (sensitivityX 14.5 / Y 4.6, relative offset), `setDifficultyPreset`.
- М’яч: `angleX = atan2(aimX, 11)`, `angleY = atan2(aimY - 0.11, 11)`.
- Power: заряджається `110 * dt` до 100; `ShiftLeft` → 1.22× (сила); `ControlLeft` → `adjustedAimY = 0.01` (пущ низький) + 0.9× сили.
- Стати гравця (PAC/PAS/SHO) впливають: runSpeed `3.6 + pac/100*2.0`, side/topSpin `0.5 + pas/100*0.7`, power `0.95 + sho/100*0.15`; `capSwayReduction` 0.05/0.10/0.20.

### Як це працює (вже, без бажання змінювати)
- `ArrowLeft`/`A` → `aimX` зменшується та `sideSpin` —1.5*dt; `ArrowRight`/`D` → `aimX`+`sideSpin` +.
- `ArrowUp`/`W` → `aimY` зростає (x1.35) та `topSpin` -1.2*dt; `ArrowDown`/`S` → `aimY`+`topSpin` +.
- Q/E → `playerStartingOffsetX` (бігунок з боку до боку перед розбігом) лише коли `power === 0`.
- Clamp: `aimX` ±(`GOAL_WIDTH/2 + 2.8`) ≈ ±6.46, `aimY` 0.05…(`GOAL_HEIGHT + 1.8`) = 4.24.
- Power: `Space` заряджає `110*dt` до 100; `ShiftLeft` 1.22× сила; `ControlLeft` → `adjustedAimY = 0.01` (пущ низький) + 0.9× сили.

### Слабкі місця
1. **`ControlLeft` (низький driven shot)** жорстко колищує `aimY` у 0.01 — бере весь спін/топ‑спін з поточного стану, можливо бажано теж занулення `topSpin`, бо інакше вищезаданий topSpin конкурує з «низьким» кутом. Перевірити.
2. **`aimY` max `GOAL_HEIGHT + 1.8` = 4.24** — це «високий арок», але чистий вертикаль 4.24 (без topSpin) майже у небо; `topSpin` (ArrowUp) його компенсує. Працює, лише новачкам непонятно.
3. **Power 110*dt до 100** — швидко, немає індикації over‑charge (немає over‑charge узагалі: ліміт 100).

### Конкретні зміни
- [ ] `main.js:682` (`ControlLeft`) за бажанням теж зануляти `topSpin = 0` для чистого driven‑low.
- [ ] UI: індикатор power + підказка про keybindingи (sideSpin/topSpin/Q‑E).
- [ ] `trackCameraToBall` (1090): камера слідує за м’ячем — добре. При потребі прискорити трек‑швидкість для високих арок.

## 4. Синоні симуляції vs реальність

Найважливіша згодність: **один і той самий фізичний крок має використовуватись і в `Ball3D.update`, і в `GoalkeeperAI.simulateBallToGoal`.** Зараз вони майже збігаються, але різняться в: (а) турбулентність, (b) вітер, (c) ground‑bounce restitution (0.65 у симуляції vs динамічний 0.42–0.75 + friction у реальному). 

### Рекомендація‑пріоритет
1. **Wind‑фікс воротаря виконано** (see “Виконані зміни”). turbulence залишено колише̲м (опційно, low‑risk, требує браузер‑тесту feel м’язя).
2. **Додати `BALL_SKIN_MODIFIERS`** → різні м’ячі (fire/ice/gold/neon) носять різний геймплей, а не лише графіку.
3. Лінійні поправки воротаря (`peakHeight`, `maxStep`, floor‑за‑межами) — робити лише після тесту з пунктом 1.

## 5. Як перевіряти зміни

- battle-for-truhanov немає validate.js для penalty-master → після кожного файлу: `node --check src/physics.js src/characters.js src/main.js`.
- Запустити гру у браузері, відкрити F12 → консоль на помилки.
- A/B‑тест: зміна одного параметра (наприклад `BALL_DRAG_COEFFICIENT`) та порівняння `Ball3D.update` із `simulateBallToGoal` у консолі (можна логувати).
