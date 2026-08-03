# AI Modification Changelog (Penalty Master)

This log is strictly maintained by AI assistants. It serves as a reliable project history to ensure perfect continuity, bug tracking, and seamless handoffs between different AI sessions.
**Rule:** Every single structural or logical change MUST be documented here.

## [2026-08-03] FIFA-Style Game Feel (Phases 1-4)

### Ф1 — Трансляція (broadcast feel)
- **crowdSwell(boost)**: додано `AudioManager.crowdSwell(boost = 0.30)` у `src/audio.js` — плавний підйом гучності натовпу до `base + boost` за 0.5 с і спад до base за 3.2 с.
- **ГОООЛ!/СЕЙВ!**: у `PenaltyMasterGame.triggerShotResult()` (src/main.js), після `banner.classList.add('active')`, для голу додано `showCustomHitText('ГОООЛ!', '#ffd700')` + `crowdSwell(0.30)`; для текстів із «СЕЙВ»/«ВІДБИТО» — `showCustomHitText('СЕЙВ!', '#00e5ff')` + `crowdSwell(0.12)`.
- **Камера розбігу (dolly)**: у станах `'runup'` та `'kick'` (update()) камера плавно під'їжджає до м'яча: `coordinateZ += (13.2 - z) * 1.5 * dt` / `(12.4 - z) * 2.0 * dt`, `coordinateY += (1.7 - y) * 1.5 * dt`.

### Ф2 — Сок удару (punch feel)
- **Dive stretch**: при відбитті кулаком воротаря (`saveResult.type === 'punch'`, main.js ~рядок 800) воротар отримує позу `dive_low_right` або `dive_low_left` (за напрямком відбиття) замість звичайного сейву.
- **Магнус**: `BALL_MAGNUS_COEFFICIENT` у `src/config.js` збільшено 0.16 → 0.19 (помітніша підкрутка м'яча у польоті).

### Ф3 — Кар'єра (career feel)
- **Форма воротаря ±5%**: `this.keeperForm` на кожен рівень = `0.95 + Math.random() * 0.10`; у `applyLevel()` застосовується до копії пресета складності: `reactionDelay × (2 − form)`, `diveSpeed × form` (вища форма = швидший і реактивніший воротар).
- **Стрічка новин**: `NEWS_DB` (12 українських футбольних заголовків) у main.js; `renderCareerScreen()` виводить 3 випадкові у `#career-news-ticker` (index.html, екран кар'єри).
- **Форма у кар'єрі**: `#career-keeper-form` показує поточну форму воротаря (зелений ≥100%, оранжевий <100%).

### Ф4 — Фінал та UI
- **TOP CORNER ×2**: у блоці виявлення гола (main.js ~рядок 930) — якщо м'яч у межах 1.1 м від верхнього кута воріт, встановлюється `_lastShotTopCorner` (скидається у `resetShot()`); у `triggerShotResult()` нагорода за гол множиться ×2 + плашка `TOP CORNER! ×2` (#ff5e9c).
- **Шкала сили**: `#hud-power-fill` змінює колір під час зарядки: бірюза → жовта (>55%) → червона (>85%).

## [2026-08-03] Mini-Games UX (Packages A-D)

### A — Мобільний геймпад
- **CSS (style.css)**: на тач-пристроях (`@media (hover: none), (pointer: coarse)`) кнопки міні-ігор стають fixed-геймпадом по кутах екрана (66×58px, `touch-action: none`, blur): basket — рух зліва; matrix — гальмо/ривок/стрибок/слайд зліва + удар справа; shootMode/penaltyChallenge — D-pad зліва + удар справа; кнопки «вийти» — у правий верхній кут. На десктопі кнопки не змінюються.
- **Swipe у Matrix Run** (matrixRun.js): свайп по канвасу вгору — стрибок, вниз — слайд (поріг 42px); події прив'язуються в `bindEvents()` і чистяться в `unbindEvents()`.

### B — Приціл траєкторії
- **shootMode.js / penaltyChallenge.js `_renderAimReticle`**: пунктирна лінія траєкторії польоту м'яча (симуляція 160 кроків × 1/60 с із `PHYSICS_GRAVITY`, початкова швидкість = формула `kick()`: `forceMult 16 + power/100*19`) + жовтий маркер кінцевої точки (перетин сітки z≈0 або землі).
- **Drag-приціл**: `_handleTouchStart/_handleTouchMove` на canvas — переміщення прицілу пальцем (X: −0.014/px, Y: +0.011/px, з клемпами цілі); обробники в `_bindEvents`/`_unbindEvents`.

### C — Баскетбол (basketball.js)
- Зона захоплення drag мишкою 40 → 120px (тач — 180px як було).
- **Заряджений стрибок-кидок**: утримування Space → `isChargingJump`/`jumpCharge` (0..100, швидкість 240/с) → відпускання = стрибок ×(0.55..1.2); `_releaseJump()` ігнорує release, якщо м'яч уже полетів. Шкала сили над гравцем (бірюза/жовта/червона у draw()).
- Скидання зарядки в `resetBall()`; кнопка стрибка на геймпаді — миттєвий стандартний стрибок через `jump()`.

### D — Matrix Run (matrixRun.js)
- **Інерція швидкості**: `_curMult` плавно добирає ціль (0.5/1.0/1.6) зі швидкістю 8/с — гальмо/ривок без стрибків.
- **Прогресія швидкості**: базова швидкість росте до +60% до фінішу (400 м).
- **Гарантія прохідності**: перешкоди чергуються групами (hurdle/spike ↔ laser/breakable) через `_lastSpawnGroup` (75% — зміна групи) — жодних двох однакових підряд.

