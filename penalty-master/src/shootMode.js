/*********************************************************************
 SHOOT MODE (режим «Стрілець») — стрілялка по гравцям
 ---------------------------------------------------------------------
Окремий режим‑міні‑гра. Просто: гравець стріляє м’язем по цілях‑гравцях
на полі; вони падають, нараховуються очки + комбо.
Фізика та асети переиспользуються з penalty-master:
  - Ball3D        (physics.js)  — повний 3D‑балістичний рух м’язя
  - Camera3D      (physics.js)  — перспектива / тряска
  - GoalNet       (physics.js)  — ворота + сітка як фон
  - SkeletalCharacter (characters.js) — цілі + анімація падіння
  - gameVFX / gameAudio — ефекти та звуки
Патерн UI/вводу зведений до basketball.js / matrixRun.js (власні
key‑ліслухачі, власний rAF‑цикл) — Не конфліктує з gameControls
PenaltyMasterGame, бо не користується ним.
*********************************************************************/
class PlayerShootGame {
    constructor(canvas, onClose) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onClose = onClose;

        // --- переиспользуємо фізику та 3D‑рендер ---
        this.camera = new Camera3D();
        this.ball = new Ball3D();
        this.goalNet = new GoalNet();

        // --- цілі ---
        this.targets = [];
        this.targetCount = SHOOT_MODE_TARGET_COUNT;

        // --- стан гри ---
        this.score = 0;
        this.hits = 0;
        this.shots = 0;
        this.combo = 0;               // безперервна смуга влучань (без "проміжка")
        this.hitsThisShot = 0;        // влучання у поточному польоті
        this.timeLeft = SHOOT_MODE_TIME_LIMIT;
        this.gameState = 'aiming';    // 'aiming' | 'flight' | 'cooldown' | 'result'
        this.bestScore = parseInt(safeStorage.getItem('pm_shoot_best_score')) || 0;

        // --- вхід ---
        this.keys = {};
        this.aimX = 0.8;   // дефолт на найближчу колонку цілей
        this.aimY = 2.4;   // дефолтна дуга через висоту тулуба (~1.45 м) при повній силі
        this.power = 0;
        this.isChargingPower = false;
        this.sideSpin = 0;
        this.topSpin = 0;

        this._rafId = 0;
        this._lastTime = 0;
        this._running = false;
        this._prevSpace = false;

        // --- HUD (DOM) ---
        this._hud = {
            score: document.getElementById('shoot-hud-score'),
            hits:  document.getElementById('shoot-hud-hits'),
            combo: document.getElementById('shoot-hud-combo'),
            time:  document.getElementById('shoot-hud-time'),
            power: document.getElementById('shoot-hud-power')
        };

        // обробники (будемо знімати — мають ref)
        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp   = this._handleKeyUp.bind(this);
    }

    /* ================================================== START / LOOP / STOP */
    start() {
        this.spawnTargets();
        this.ball.reset();
        this.gameState = 'aiming';
        this._lastTime = performance.now();
        this._running = true;
        this.updateHUD();
        this._bindEvents();
        requestAnimationFrame((t) => this.loop(t));
    }

    stop() {
        this._running = false;
        cancelAnimationFrame(this._rafId);
        this._unbindEvents();
    }

    loop(time) {
        if (!this._running) return;
        const now = time || performance.now();
        const dt = Math.min(0.032, (now - this._lastTime) / 1000);
        this._lastTime = now;

        this.update(dt);
        this.render();

        if (this._running) {
            this._rafId = requestAnimationFrame((t) => this.loop(t));
        }
    }

    /* ================================================== TARGETS */
    spawnTargets() {
        this.targets = [];
        const baseLevel = LEVEL_PRESETS[0]; // "Шкільний Двір" — колір форми
        // розсипаємо цілі поперемінному рядках по ширині поля
        const rows = 3;
        const cols = 4;
        const startX = -(GOAL_WIDTH / 2) + 0.8;
        const stepX = GOAL_WIDTH / cols;
        for (let i = 0; i < this.targetCount; i++) {
            const t = new SkeletalCharacter(false);
            const row = i % rows;
            const col = Math.floor(i / rows);
            t.position.set(
                startX + col * stepX,
                0,
                SHOOT_MODE_TARGET_Z_MIN + (i / this.targetCount) * SHOOT_MODE_TARGET_Z_SPAN
            );
            t.setPose('idle');
            t.applyLevelColors(baseLevel);
            this.targets.push(t);
        }
    }

    /* ================================================== INPUT */
    _bindEvents() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup',   this._onKeyUp);

        const btnLeft   = document.getElementById('shoot-btn-aim-left');
        const btnRight  = document.getElementById('shoot-btn-aim-right');
        const btnUp     = document.getElementById('shoot-btn-up');
        const btnDown   = document.getElementById('shoot-btn-down');
        const btnKick   = document.getElementById('shoot-btn-kick');

        const hold = (btn, key) => {
            if (!btn) return;
            const down = (e) => { this.keys[key] = true; if (e.cancelable) e.preventDefault(); };
            const up   = (e) => { this.keys[key] = false; if (e.cancelable) e.preventDefault(); };
            btn.ontouchstart = down; btn.ontouchend = up;
            btn.onmousedown  = down; btn.onmouseup   = up;
        };
        hold(btnLeft,  'ArrowLeft');
        hold(btnRight, 'ArrowRight');
        hold(btnUp,    'ArrowUp');
        hold(btnDown,  'ArrowDown');
        hold(btnKick,  'Space');
    }

    _unbindEvents() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup',   this._onKeyUp);
    }

    _handleKeyDown(e) {
        this.keys[e.code] = true;
        if (e.code === 'Escape') this.closeMode();
    }

    _handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    closeMode() {
        this.stop();
        const scr = document.getElementById('screen-shoot-mode');
        if (scr) scr.classList.remove('active');
        if (this.onClose) this.onClose();
    }

    /* ================================================== AIMING / SHOOT */
    update(dt) {
        // таймер раунду (продовжується в усіх станах, окрім result)
        if (this.gameState !== 'result') {
            this.timeLeft -= dt;
        }

        if (this.gameState === 'aiming') {
            this._updateAim(dt);
            this._updatePower(dt);
            if (this._tryShoot()) {
                this.shoot();
            }
        }

        if (this.gameState === 'flight') {
            this.ball.update(dt);
            if (this.goalNet) this.goalNet.handleBallCollision(this.ball);
            this._updateTargets(dt);
            this.checkHits();

            const speed = this.ball.velocity.length();
            if (this.ball.isStatic || (speed < 0.4 && this.ball.position.coordinateY <= BALL_RADIUS + 0.05)) {
                // м’яч зупинився → кінець польоту; «проміжок» без влучань скинує смугу
                if (this.hitsThisShot === 0) this.combo = 0;
                this.gameState = 'cooldown';
                this._lastShotAt = performance.now();
            }
        }

        if (this.gameState === 'cooldown') {
            // коротка пауза перед наступним пострілом
            if (performance.now() - this._lastShotAt > 0.35) {
                this.resetShot();
            }
        }

        if (this.gameState !== 'result' && this.timeLeft <= 0) {
            this.endRound();
        }

        this.updateHUD();
    }

    _updateAim(dt) {
        const aimSpeed = 7.5;
        const maxX = GOAL_WIDTH / 2 + 2.8;
        const maxY = GOAL_HEIGHT + 1.8;

        if (this.keys['ArrowLeft']  || this.keys['KeyA']) {
            this.aimX = Math.max(-maxX, this.aimX - aimSpeed * dt);
            this.sideSpin = Math.max(-1.0, this.sideSpin - 1.5 * dt);
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD']) {
            this.aimX = Math.min( maxX, this.aimX + aimSpeed * dt);
            this.sideSpin = Math.min( 1.0, this.sideSpin + 1.5 * dt);
        }
        if (this.keys['ArrowUp']    || this.keys['KeyW']) {
            this.aimY = Math.min(maxY, this.aimY + aimSpeed * 1.35 * dt);
            this.topSpin = Math.max(-1.0, this.topSpin - 1.2 * dt);
        }
        if (this.keys['ArrowDown']  || this.keys['KeyS']) {
            this.aimY = Math.max(0.05, this.aimY - aimSpeed * 1.1 * dt);
            this.topSpin = Math.min( 1.0, this.topSpin + 1.2 * dt);
        }
    }

    _updatePower(dt) {
        const space = !!(this.keys['Space']);
        const wasHeld = this._prevSpace;
        this._prevSpace = space;
        if (space) {
            if (!this.isChargingPower) this.isChargingPower = true;
            this.power = Math.min(100.0, this.power + 110.0 * dt);
        } else {
            this.isChargingPower = false;
        }
        this._justReleased = wasHeld && !space;
    }

    _tryShoot() {
        // стріляти при відпусканні Space, якщо заряд ≥ 5
        return this._justReleased && this.power >= 5;
    }

    shoot() {
        const angleX = Math.atan2(this.aimX, PENALTY_SPOT_Z);
        const angleY = Math.atan2(this.aimY - BALL_RADIUS, PENALTY_SPOT_Z);

        let powerMult = 1.0;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) powerMult = 1.22;

        let adjustedAimY = angleY;
        if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
            adjustedAimY = 0.01;
            powerMult *= 0.9;
        }

        // стати картки (PAC/PAS/SHO) — reuse логіка з PenaltyMasterGame
        let pasStat = 75, shoStat = 75;
        try {
            const cardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';
            const card = CARD_DATABASE.find(c => c.id === cardId);
            if (card) { pasStat = card.pas; shoStat = card.sho; }
        } catch (e) { /* ігноруємо */ }

        const sideSpinMult = 0.5 + (pasStat / 100) * 0.7;
        const topSpinMult  = 0.5 + (pasStat / 100) * 0.7;
        const statsPowerMult = 0.95 + (shoStat / 100) * 0.15;

        const finalPower = this.power * powerMult * statsPowerMult;
        const sideSpin = this.sideSpin * sideSpinMult;
        const topSpin  = this.topSpin  * topSpinMult;

        this.ball.kick(finalPower, angleX, adjustedAimY, sideSpin, topSpin);

        this.shots++;

        // Ball3D.kick() вже викликає gameAudio.playKick() + gameVFX.spawnGrassExplosion()
        this.hitsThisShot = 0;
        this.gameState = 'flight';
    }

    resetShot() {
        this.ball.reset();
        // приціл зберігається між пострілами (не скидаємо на дефолт)
        this.power = 0;
        this.isChargingPower = false;
        this.sideSpin = 0;
        this.topSpin = 0;
        this.hitsThisShot = 0;
        this.gameState = 'aiming';
    }

    /* ================================================== HITS */
    _updateTargets(dt) {
        this.targets.forEach(t => t.update(dt));
    }

    checkHits() {
        const bp = this.ball.position;
        this.targets.forEach(t => {
            if (t.pose === 'fall' || t.pose === 'fallen') return; // вже впав
            const spineWorld = new Vector3(
                t.position.coordinateX + t.joints.spine.coordinateX,
                t.position.coordinateY + t.joints.spine.coordinateY,
                t.position.coordinateZ + t.joints.spine.coordinateZ
            );
            if (bp.distanceTo(spineWorld) < SHOOT_MODE_HIT_RADIUS) {
                this._registerHit(t, spineWorld);
            }
        });
    }

    _registerHit(target, hitPos) {
        target.setPose('fall');
        this.hits++;
        this.hitsThisShot++;
        this.combo++;
        const points = SHOOT_MODE_BASE_POINTS * this.combo;
        this.score += points;
        gameAudio.playPostHit();
        gameVFX.spawnTargetHitExplosion(hitPos);
    }

    /* ================================================== RENDER */
    render() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, w, h);

        // фон неба + легке трав'яне поле (просто смужка)
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#0b0400');
        sky.addColorStop(1, '#062400');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#0a2e00';
        ctx.fillRect(0, h * 0.65, w, h * 0.35);

        this.camera.update();

        // ворота + сітка (фон)
        this.goalNet.render(ctx, this.camera, w, h);

        // цілі
        this.targets.forEach(t => t.render(ctx, this.camera, w, h));

        // м'яч
        const proj = this.camera.project(this.ball.position, w, h);
        if (proj) {
            this.ball.render(ctx, proj.x, proj.y, proj.scale);
        }

        // приціл (тільки у режимі aim)
        if (this.gameState === 'aiming' || this.gameState === 'cooldown') {
            this._renderAimReticle(ctx);
        }
    }

    _renderAimReticle(ctx) {
        const w = this.canvas.width, h = this.canvas.height;
        const angleX = Math.atan2(this.aimX, PENALTY_SPOT_Z);
        const angleY = Math.atan2(this.aimY - BALL_RADIUS, PENALTY_SPOT_Z);
        const forceMult = 16 + (this.power / 100) * 19;
        const speedZ = -Math.cos(angleY) * Math.cos(angleX) * forceMult;
        const speedX =  Math.cos(angleY) * Math.sin(angleX) * forceMult;
        const speedY =  Math.sin(angleY) * forceMult;
        const len = Math.sqrt(speedX*speedX + speedY*speedY + speedZ*speedZ) || 1;
        const aimPt = new Vector3(
            this.ball.position.coordinateX + (speedX/len) * 8,
            this.ball.position.coordinateY + (speedY/len) * 8,
            this.ball.position.coordinateZ + (speedZ/len) * 8
        );
        const p = this.camera.project(aimPt, w, h);
        if (p) {
            ctx.save();
            ctx.strokeStyle = this.power >= 90 ? '#ff6600' : '#ffffff';
            ctx.lineWidth = 1.6 * (p.scale / 300);
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6 * (p.scale / 300), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    /* ================================================== HUD */
    updateHUD() {
        const set = (el, txt) => { if (el) el.textContent = txt; };
        set(this._hud.score, 'Очки: ' + this.score);
        set(this._hud.hits,   'Влучання: ' + this.hits);
        set(this._hud.combo,  'Комбо: ×' + this.combo);
        set(this._hud.time,   'Час: ' + Math.max(0, Math.ceil(this.timeLeft)));
        if (this._hud.power) this._hud.power.style.width = this.power + '%';
    }

    /* ================================================== END */
    endRound() {
        this._running = false;
        cancelAnimationFrame(this._rafId);
        this._unbindEvents();

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            safeStorage.setItem('pm_shoot_best_score', this.score);
        }

        const modeScreen = document.getElementById('screen-shoot-mode');
        if (modeScreen) modeScreen.classList.remove('active');

        const txt = document.getElementById('shoot-result-text');
        if (txt) {
            txt.innerHTML =
                `<div>Влучань: <b>${this.hits}</b> з ${this.shots} пострілів</div>` +
                `<div>Комбо‑максимум: <b>${this.combo}</b></div>` +
                `<div>Рахунок: <b style="color:#ff6600">${this.score}</b></div>` +
                `<div>Рекорд: <b>${this.bestScore}</b></div>`;
        }
        showScreen('screen-shoot-result');
    }
}
