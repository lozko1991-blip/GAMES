# Kronos Football (Penalty Master) - AI Developer Guidelines

> Глобальні правила спільно для обох проєктів: `AGENTS.md` у корені репозиторію.
> Технічний опис проєкту (модулі, класи, функції, ключі LocalStorage): `docs/PENALTY_MASTER.md`. Користувач пише українською — відповідай стисло українською.

## 1. Workspace Context
Vanilla HTML5 Canvas симулятор пенальті «Kronos Football» + міні-ігри (basketball, matrix run). Без збірки, без npm, без ES6 modules — глобальні змінні через послідовні `<script>` у `index.html`.

## 2. Перевірка після змін (у проєкту НЕМАЄ validate.js)
1. Після кожної зміни JS-файлу виконай синтаксичну перевірку:
   ```bash
   node --check src/файл.js
   ```
2. Код 0 = синтаксис ОК. Zero-error tolerance: жодних SyntaxError/ReferenceError.
3. Ідеально — відкрити `index.html` у браузері та перевірити консоль (F12) на помилки.

## 3. Архітектурні правила
1. **Строгий порядок завантаження**: `peerjs CDN → config.js → audio.js → physics.js → characters.js → multiplayer.js → matrixRun.js → basketball.js → main.js`. Нові скрипти — тільки в кінець списку.
2. **Без ES6 `import/export`** — тільки глобальні змінні. Головний клас `PenaltyMasterGame` ініціалізується в `main.js` (останній скрипт); екземпляр `gameAudio` створюється в `audio.js`, `safeStorage` — у `config.js`.
3. **LocalStorage**: всі ключі `pm_*` через обгортку `safeStorage` (крім прямого `localStorage.getItem('pm_equipped_ball')` у basketball.js). Ніколи не вводь ключі без префікса `pm_`.
4. **Машина станів гри**: `aiming → fake_swing → runup → kick → flight → result`. Змінюючи переходи, перевір усі `this.gameState = ...` у main.js (є ~12 місць).

## 4. Якість
1. **Стабільний FPS**: не додавай важких обчислень у `update(dt)` / `render()` — 3D-проєкція через `Camera.project` має лишитися легкою.
2. **Мобільні**: всі нові кнопки — pointer+touch події; не ламай swipe-прицілювання у `PlayerControls`.
3. **Без заглушок**: жодного placeholder-коду; нові функції мають бути повністю робочими.
4. **Зворотна сумісність**: не змінюй сигнатури `Ball.kick`, `GoalkeeperAI.update`, `SkeletalCharacter.setPose` без потреби — вони викликаються з багатьох місць.
