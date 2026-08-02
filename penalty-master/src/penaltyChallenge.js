/*********************************************************************
 PENALTY CHALLENGE (режим «Стрілець» / «Пенальті-виклик»)
 ---------------------------------------------------------------------
Додатковий режим на базі основної гри: гравець б'є пенальті зі споту
(PENALTY_SPOT_Z) по стіні суперників, що стоять перед воротами.
Перевикористовує ту саму фізику (Ball3D — балістика, спін, опір),
ту саму камеру, ті ж ворота (GoalNet) і того ж воротаря-гравця
(GoalkeeperAI з HARD-складністю). Гольки/падіння — як у пенальті.
Особливості, запрошені користувачем:
  * 6 гравців-«стіна» у 2 ряди біля воріт, КОЖНА рухається (синусоїда)
  * влучання → м'яч відбивається (рикошет) і може збити ще одного
  * 🥇 золотий суперник (раз на раунд) — +500 очок
  * ⚡ пауер-удар (POWER >= 95%) — +50% очок за гол
  * 🧤 3 удари поспіль — м'яч тече вогнем
  * промах = воротар смішно віджимається (pose «push_ups»)
Лише новий файл + мінімум правок у main.js/index.html/characters.js;
PenaltyMasterGame не змінюється.
*********************************************************************/
class PenaltyChallengeGame {
    constructor(canvas, onClose) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onClose = onClose;

        this.camera = new Camera3D();
        this.ball = new Ball3D();
        this.goalNet = new GoalNet();
        this.keeper = new SkeletalCharacter(true);
        this.keeperAI = new GoalkeeperAI(this.keeper);
        this.keeperAI.setDifficulty(DIFFICULTY_PRESETS.HARD);

        this.targetCount = PENALTY_CHALLENGE_WALL_PER_ROW[0] + PENALTY_CHALLENGE_WALL_PER_ROW[1];
        this.targets = [];

        this.score = 0;
        this.hits = 0;
        this.goals = 0;
        this.shots = 0;
        this.combo = 0;
        this.hitsThisShot = 0;
        this.cleanSeries = 0;          // поспіль ударів без промаху/збиття воротарем
        this.powerShotCount = 0;
        this.timeLeft = PENALTY_CHALLENGE_SHOT_CLOCK;
        this.gameState = 'aiming';     // 'aiming' | 'flight' | 'cooldown' | 'result'
        this.round = 1;
        this.bestScore = parseInt(safeStorage.getItem('pm_challenge_best_score')) || 0;

        this.keys = {};
        this.aimX = 0;
        this.aimY = 2.4;
        this.power = 0;
        this.isChargingPower = false;
        this.sideSpin = 0;
        this.topSpin = 0;

        this._rafId = 0;
        this._lastTime = 0;
        this._running = false;
        this._prevSpace = false;
        this._justReleased = false;
        this._shotStarted = 0;
        this._lastShotAt = 0;
        this._keeperShowoffTimer = 0;
        this._pendingMissShowoff = false;
        this._isPowerShot = false;
        this._fireTrail = false;
        this.roundElapsed = 0;

        this._hud = {
            score: document.getElementById('pc-hud-score'),
            hits:  document.getElementById('pc-hud-hits'),
            combo: document.getElementById('pc-hud-combo'),
            time:  document.getElementById('pc-hud-time'),
            power: document.getElementById('pc-hud-power'),
            round: document.getElementById('pc-hud-round')
        };

        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp   = this._handleKeyUp.bind(this);
        this._level = LEVEL_PRESETS[0];
        this._stadium = this._resolveStadium();
    }

    _resolveStadium() {
        try {
            const id = safeStorage.getItem('pm_equipped_stadium') || 'default';
            const s = SHOP_ITEMS.stadiums.find(st => st.id === id);
            return s || this._level;
        } catch (e) { return this._level; }
    }

    /* ================================================== START / LOOP / STOP */
    start() {
        this.spawnTargets();
        this.ball.reset();
        this.keeper.position.set(0, 0, 0);
        this.keeperAI.reset();
        this.keeper.setPose('idle');
        this.aimX = 0;
        this.gameState = 'aiming';
        this.shots = 0;
        this.combo = 0;
        this.cleanSeries = 0;
        this.roundElapsed = 0;
        this.timeLeft = PENALTY_CHALLENGE_SHOT_CLOCK;
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
        const dt = Math.max(0, Math.min(0.04, (now - this._lastTime) / 1000));
        this._lastTime = now;

        this.update(dt);
        this.render();

        if (this._running) {
            this._rafId = requestAnimationFrame((t) => this.loop(t));
        }
    }

    /* ================================================== TARGETS (стіна біля воріт) */
    spawnTargets() {
        this.targets = [];
        const rows = PENALTY_CHALLENGE_WALL_ROWS;
        const zByRow = PENALTY_CHALLENGE_WALL_Z;
        const spread = PENALTY_CHALLENGE_WALL_X_SPREAD;
        let captainIdx = Math.floor(Math.random() * this.targetCount);
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            const perRow = PENALTY_CHALLENGE_WALL_PER_ROW[r];
            const z = zByRow[r];
            for (let i = 0; i < perRow; i++) {
                const col = (perRow === 1) ? 0 : ((i / (perRow - 1)) * 2 - 1); // -1..1
                const t = new SkeletalCharacter();
                t.position.set(col * spread, 0, z);
                t.setPose('idle');
                t.applyLevelColors(this._level);
                // рухомі цілі: різна амплітуда, швидкість, фаза
                t.homeX = t.position.coordinateX;
                t.moveAmp = 0.6 + Math.random() * 0.4;
                t.moveSpeed = PENALTY_CHALLENGE_MOVE_SPEED_MIN + Math.random() *
                    (PENALTY_CHALLENGE_MOVE_SPEED_MAX - PENALTY_CHALLENGE_MOVE_SPEED_MIN);
                t.movePhase = Math.random() * Math.PI * 2;
                t.isCaptain = (idx === captainIdx);
                if (t.isCaptain) {
                    t.jerseyColor = '#ffd700'; t.shortsColor = '#111111';
                    t.socksColor = '#ffd700';
                }
                this.targets.push(t);
                idx++;
            }
        }
    }

    /* ================================================== INPUT */
    _bindEvents() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup',   this._onKeyUp);

        const hold = (btn, key) => {
            if (!btn) return;
            const down = (e) => { this.keys[key] = true; if (e.cancelable) e.preventDefault(); };
            const up   = (e) => { this.keys[key] = false; if (e.cancelable) e.preventDefault(); };
            btn.ontouchstart = down; btn.ontouchend = up;
            btn.onmousedown  = down; btn.onmouseup   = up;
        };
        hold(document.getElementById('pc-btn-aim-left'),  'ArrowLeft');
        hold(document.getElementById('pc-btn-aim-right'), 'ArrowRight');
        hold(document.getElementById('pc-btn-up'),         'ArrowUp');
        hold(document.getElementById('pc-btn-down'),       'ArrowDown');
        hold(document.getElementById('pc-btn-kick'),       'Space');
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
        const scr = document.getElementById('screen-penalty-challenge');
        if (scr) scr.classList.remove('active');
        if (this.onClose) this.onClose();
    }

    /* ================================================== AIMING / SHOOT */
    update(dt) {
        this.roundElapsed += dt;
        const speedScale = 1.0 + this.roundElapsed * PENALTY_CHALLENGE_HARD_LIVE_BOOST / 60;

        if (this.gameState === 'aiming') {
            this.timeLeft -= dt;
            this._updateAim(dt);
            this._updatePower(dt);
            if (this._tryShoot()) this.shoot();
            this.keeper.update(dt);
            // 🧤 3 удари поспіль без промаху → вогняний м'яч на наступний удар
            this._fireTrail = this.cleanSeries >= 3;
            if (this._keeperShowoffTimer > 0) {
                this._keeperShowoffTimer -= dt;
                if (this._keeperShowoffTimer <= 0) this.keeper.setPose('idle');
            }
        }

        if (this.gameState === 'flight') {
            this._shotStarted += dt;
            this.ball.update(dt);
            this.keeper.update(dt);
            this.keeperAI.update(dt, this.ball);
            this._updateTargets(dt, speedScale);
            this.checkHits();
            this.checkGoalAndSave();

            const speed = this.ball.velocity.length();
            // м'яч зупинився / вилетів за межі — кінець польоту
            if (this.ball.isStatic || (speed < 0.4 && this.ball.position.coordinateY <= BALL_RADIUS + 0.05)) {
                this.endShot();
            } else if (this._shotStarted > 4.0) {
                // промах повз усе (високо/далеко) — не чекаємо поки м'яч сам затихне
                this.endShot();
            }
        }

        if (this.gameState === 'cooldown') {
            if (performance.now() - this._lastShotAt > 0.35) {
                this.resetShot(true);
            }
        }

        if (this.gameState !== 'result' && this.timeLeft <= 0 && this.shots < PENALTY_CHALLENGE_TOTAL_SHOTS) {
            // дедлайн тоски: просто скидаємо таймер і даємо ще шанс
            this.timeLeft = PENALTY_CHALLENGE_SHOT_CLOCK;
        }

        this.updateHUD();
    }

    _updateAim(dt) {
        const aimSpeed = 7.5;
        if (this.keys['ArrowLeft']  || this.keys['KeyA']) this.aimX = Math.max(-MAX_AIM_X, this.aimX - aimSpeed * dt);
        if (this.keys['ArrowRight'] || this.keys['KeyD']) this.aimX = Math.min( MAX_AIM_X, this.aimX + aimSpeed * dt);
        if (this.keys['ArrowUp']    || this.keys['KeyW']) this.aimY = Math.min(MAX_AIM_Y, this.aimY + aimSpeed * 1.35 * dt);
        if (this.keys['ArrowDown']   || this.keys['KeyS']) this.aimY = Math.max(0.4, this.aimY - aimSpeed * 1.1 * dt);
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

        let pasStat = 75, shoStat = 75;
        try {
            const cardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';
            const card = CARD_DATABASE.find(c => c.id === cardId);
            if (card) { pasStat = card.pas; shoStat = card.sho; }
        } catch (e) { /* ігноруємо */ }

        const statsPowerMult = 0.95 + (shoStat / 100) * 0.15;
        const finalPower = this.power * powerMult * statsPowerMult;

        this.sideSpin = this.aimX * 0.45;
        this.topSpin  = (this.keys['KeyW'] || this.keys['ArrowUp']) ? -0.5 : 0.3;

        this._isPowerShot = (this.power >= 95);
        if (this._isPowerShot) this.powerShotCount++;

        this.ball.kick(finalPower, angleX, adjustedAimY, this.sideSpin, this.topSpin);
        // Ball3D.kick вже playKick + spawnGrassExplosion

        this.shots++;
        this.hitsThisShot = 0;
        this._shotStarted = 0;
        this._keeperShowoffTimer = 0;
        this._lastShotAt = performance.now();
        this.gameState = 'flight';
        this.keeperAI.onBallKicked(this.ball);
    }

    resetShot(advanceRound = false) {
        this.ball.reset();
        this.power = 0;
        this.isChargingPower = false;
        this.sideSpin = 0;
        this.topSpin = 0;
        this._isPowerShot = false;
        this.hitsThisShot = 0;
        this._keeperShowoffTimer = 0;
        if (advanceRound) {
            this.round++;
            if (this.round > PENALTY_CHALLENGE_TOTAL_SHOTS) {
                this.endRound();
                return;
            }
        }
        this.resetShotDelayedShowoff();
        this.gameState = 'aiming';
        this.timeLeft = PENALTY_CHALLENGE_SHOT_CLOCK;
    }

    /* ================================================== TARGETS UPDATE (рух) */
    _updateTargets(dt, speedScale) {
        this.targets.forEach(t => {
            if (t.pose === 'fall' || t.pose === 'fallen') return; // повний впад — не рухатися
            t.position.coordinateX = t.homeX + Math.sin(t.movePhase + t.moveSpeed * speedScale * performance.now() * 0.001) * t.moveAmp;
            t.update(dt);
        });
    }

    /* ================================================== HITS + RICHOCHET */
    checkHits() {
        const bp = this.ball.position;
        for (const t of this.targets) {
            if (t.pose === 'fall' || t.pose === 'fallen') continue;
            const spineWorld = new Vector3(
                t.position.coordinateX + t.joints.spine.coordinateX,
                t.position.coordinateY + t.joints.spine.coordinateY,
                t.position.coordinateZ + t.joints.spine.coordinateZ
            );
            if (bp.distanceTo(spineWorld) < PENALTY_CHALLENGE_HIT_RADIUS) {
                this._registerHit(t, spineWorld);
            }
        }
    }

    _registerHit(target, hitPos) {
        target.setPose('fall');
        this.hits++;
        this.hitsThisShot++;
        this.combo++;

        let points = SHOOT_MODE_BASE_POINTS * this.combo;
        if (target.isCaptain) points += 500;
        if (this._isPowerShot) points = Math.round(points * 1.5);
        this.score += points;

        gameAudio.playPostHit();
        gameVFX.spawnTargetHitExplosion(hitPos);

        // 🔥 рикошет: м'яч відбивається і може збити ще когось
        const v = this.ball.velocity;
        const n = this.ball.position.clone().subtract(hitPos).normalize();
        const vn = v.dot(n);
        const reflected = v.subtract(n.scale(vn * 2)).scale(0.42);
        reflected.coordinateY = Math.abs(reflected.coordinateY) * 0.42 + 0.5;
        this.ball.velocity.set(reflected.coordinateX, reflected.coordinateY, reflected.coordinateZ);
        this.ball.isStatic = false;
    }

    /* ================================================== GOAL / SAVE / MISS */
    checkGoalAndSave() {
        const bp = this.ball.position;

        // воротар рухається — перевірка відбиття
        if (Math.abs(bp.coordinateZ) < 0.5) {
            const res = this.keeperAI.checkSaveCollision(this.ball);
            if (res) {
                gameAudio.playKeeperSave();
                const speed = this.ball.velocity.length() || 1;
                if (res.type === 'save') {
                    // зловлення — м'яч воротарем, немого далі
                    this.ball.velocity.set(0, 0, 0);
                    this.ball.isStatic = true;
                    this.ball.isKicked = false;
                    this.noFireTrail();
                    this.endShot(); // це був збережений удар
                    return;
                } else {
                    const normal = res.contactNormal;
                    const v = this.ball.velocity;
                    const vn = v.dot(normal);
                    const rv = v.subtract(normal.scale(vn * 2)).scale(0.55);
                    rv.coordinateY += 1.5;
                    this.ball.velocity.set(rv.coordinateX, rv.coordinateY, rv.coordinateZ);
                }
            }
        }

        // воріт? м'яч перетнув лінію воріт (z<=0.05)
        if (bp.coordinateZ <= 0.05 && this.ball.isKicked) {
            const inGoalX = Math.abs(bp.coordinateX) < (GOAL_WIDTH / 2 - 0.03);
            const inGoalY = bp.coordinateY < (GOAL_HEIGHT - 0.03) && bp.coordinateY > 0.05;
            if (inGoalX && inGoalY) {
                this.scoreGoal();
                return;
            }
        }
    }

    scoreGoal() {
        this.goals++;
        let points = 150 * Math.max(1, this.combo); // чистий гол = мінімум ×1
        if (this._isPowerShot) points = Math.round(points * 1.5); // ⚡ пауер-удар
        this.score += points;
        this.hitsThisShot++;

        gameAudio.playGoalCheer();
        gameVFX.spawnConfettiRain(new Vector3(0, 1.2, 0));
        this.ball.position.coordinateZ = 0.04; // м'яч у мережі
        this.ball.velocity.set(0, 0, 0);
        this.ball.isStatic = true;
        this.ball.isKicked = false;
        this.noFireTrail();
        this.endShot();
    }

    endShot() {
        if (this.gameState === 'cooldown' || this.gameState === 'result') return;
        this._lastShotAt = performance.now();
        this.gameState = 'cooldown';
        this.keeper.setPose('idle');

        if (this.hitsThisShot === 0) {
            // промах: воротар смішно віджимається (показ після cooldown через resetShotDelayedShowoff)
            this._keeperShowoffTimer = 0;
            this._pendingMissShowoff = true;
            this.cleanSeries = 0;
            this.combo = 0;
            this.noFireTrail();
        } else {
            this.cleanSeries++;
        }
    }

    resetShotDelayedShowoff() {
        if (this._pendingMissShowoff) {
            this._pendingMissShowoff = false;
            this.keeper.setPose('push_ups');
            this._keeperShowoffTimer = 1.6;
        }
    }

    noFireTrail() { this._fireTrail = false; }

    /* ================================================== HUD */
    updateHUD() {
        const set = (el, txt) => { if (el) el.textContent = txt; };
        set(this._hud.score, 'Очки: ' + this.score);
        set(this._hud.hits,   'Влучання: ' + this.hits);
        set(this._hud.combo,  'Комбо: ×' + this.combo);
        set(this._hud.time,   'Час: ' + Math.max(0, Math.ceil(this.timeLeft)));
        set(this._hud.round,  'Удар: ' + this.round + '/' + PENALTY_CHALLENGE_TOTAL_SHOTS);
        if (this._hud.power) {
            this._hud.power.style.width = this.power + '%';
            this._hud.power.style.background = this._isPowerShot ? '#ffff00' : '#ff6600';
        }
    }

    /* ================================================== RENDER */
    render() {
        const w = this.canvas.width, h = this.canvas.height;
        const ctx = this.ctx;
        const L = this._level, S = this._stadium;

        // фон: небо + трибуни (копія вигляду основної гри)
        ctx.clearRect(0, 0, w, h);
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, S.skyTop || L.skyTop);
        sky.addColorStop(0.45, S.skyMid || L.skyMid);
        sky.addColorStop(1, S.skyBot || L.skyBot);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        const goalProj = this.camera.project(new Vector3(0, GOAL_HEIGHT, 0), w, h);
        let horizonY = h * 0.5;
        if (goalProj && !isNaN(goalProj.y)) horizonY = goalProj.y + 25 * (goalProj.scale / 300);

        // трибуни/стадіон
        const stadiumColor = S.stadiumColor || L.stadiumColor;
        ctx.fillStyle = stadiumColor;
        ctx.beginPath();
        ctx.moveTo(0, horizonY - h * 0.2);
        ctx.lineTo(w, horizonY - h * 0.2);
        ctx.lineTo(w, horizonY);
        ctx.lineTo(0, horizonY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = stadiumColor;
        ctx.lineWidth = 1;
        for (let y = horizonY - h * 0.18; y < horizonY - 4; y += 6) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        this.camera.update();

        // розмітка поля: штрафна лінія + кут ліній (використовують проєкцію камери)
        this._renderPitch(ctx, w, h);

        // ворота + сітка (фон)
        this.goalNet.render(ctx, this.camera, w, h);

        // воротар (живий персонаж)
        this.keeper.update(0.016);
        this.keeper.render(ctx, this.camera, w, h);

        // стіна суперників
        this.targets.forEach(t => t.render(ctx, this.camera, w, h));

        // м'яч і тінь
        const proj = this.camera.project(this.ball.position, w, h);
        if (proj) {
            this.ball.render(ctx, proj.x, proj.y, proj.scale);
            // тінь
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#000';
            const sh = (proj.scale / 300) * 14;
            ctx.beginPath();
            ctx.ellipse(proj.x, proj.y + sh * 0.6, sh, sh * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // вогняна стежка 🧤
        if (this._fireTrail && this.ball.trailPositions && this.ball.trailPositions.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#ff6600'; ctx.fillStyle = '#ff6600';
            ctx.globalAlpha = 0.8;
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3;
            // trailPositions містять Vector3? рендимо проєкції останніх кількох
            const pts = this.ball.trailPositions;
            const recent = pts.slice(-14);
            if (recent.length > 1) {
                ctx.beginPath();
                for (let i = 0; i < recent.length; i++) {
                    const p = this.camera.project(recent[i], w, h);
                    if (p) {
                        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
                    }
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // приціл
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
        const aimPoint = new Vector3(
            this.ball.position.coordinateX + (speedX/len) * 8,
            this.ball.position.coordinateY + (speedY/len) * 8,
            this.ball.position.coordinateZ + (speedZ/len) * 8
        );
        const p = this.camera.project(aimPoint, w, h);
        if (p) {
            ctx.save();
            ctx.strokeStyle = this.power >= 90 ? '#ffff00' : '#ffffff';
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 1.6 * (p.scale / 300);
            ctx.beginPath(); ctx.arc(p.x, p.y, 6 * (p.scale / 300), 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }

    _renderPitch(ctx, w, h) {
        // штрафна лінія (на висоті воріт, z=0) + кутові лінії + динамічний маркер цілей
        const color = 'rgba(255,255,255,0.6)';
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
        // штрафна лінія воріт
        const l0 = this.camera.project(new Vector3(-4.5, 0.05, 0), w, h);
        const l1 = this.camera.project(new Vector3( 4.5, 0.05, 0), w, h);
        if (l0 && l1 && isFinite(l0.x) && isFinite(l1.x)) {
            ctx.beginPath(); ctx.moveTo(l0.x, l0.y); ctx.lineTo(l1.x, l1.y); ctx.stroke();
        }
        // кутові лінії
        const a = this.camera.project(new Vector3(-4.5, 0.05, 0.5), w, h);
        const b = this.camera.project(new Vector3(-6.5, 0.05, 0), w, h);
        if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        const c = this.camera.project(new Vector3( 4.5, 0.05, 0.5), w, h);
        const d = this.camera.project(new Vector3( 6.5, 0.05, 0), w, h);
        if (c && d) { ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke(); }
        // круг споту
        const s0 = this.camera.project(new Vector3(0, 0.04, PENALTY_SPOT_Z), w, h);
        const s1 = this.camera.project(new Vector3(0.9, 0.04, PENALTY_SPOT_Z), w, h);
        if (s0 && s1) {
            ctx.beginPath(); ctx.arc(s0.x, s0.y, Math.hypot(s1.x - s0.x, s1.y - s0.y), 0, Math.PI * 2); ctx.stroke();
        }
    }

    /* ================================================== END */
    endRound() {
        this._running = false;
        cancelAnimationFrame(this._rafId);
        this._unbindEvents();
        this.gameState = 'result';

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            safeStorage.setItem('pm_challenge_best_score', this.score);
        }
        const screen = document.getElementById('screen-penalty-challenge');
        if (screen) screen.classList.remove('active');

        const txt = document.getElementById('pc-result-text');
        if (txt) {
            txt.innerHTML =
                `<div>Голів: <b>${this.goals}</b> з ${this.shots} ударів</div>` +
                `<div>Влучань: <b>${this.hits}</b> / падінь: <b>${this.targets.filter(t=>t.pose==='fallen' || t.pose==='fall').length}</b></div>` +
                `<div>Пауер-ударів: <b>${this.powerShotCount}</b></div>` +
                `<div>Рахунок: <b style="color:#ff6600">${this.score}</b> (рекорд <b>${this.bestScore}</b>)</div>`;
        }
        showScreen('screen-penalty-challenge-result');
    }
}

const MAX_AIM_X = GOAL_WIDTH / 2 + 2.8;
const MAX_AIM_Y = GOAL_HEIGHT + 1.8;
