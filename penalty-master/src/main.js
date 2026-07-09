/*********************************************************************
INPUT, AIMING, MAIN GAME ENGINE LOOP & STATE MANAGER
*********************************************************************/

/*
====================================================
CLASS
PlayerControls

Відповідає за
✔ Слухання клавіатури
✔ Збільшення сили при утриманні пробілу
====================================================
*/
class PlayerControls {
    constructor() {
        this.keys = {};
        
        this.aimX = 0;
        this.aimY = 1.2;
        
        this.power = 0;
        this.isChargingPower = false;
        
        this.playerStartingOffsetX = 0;
        
        this.sideSpin = 0;
        this.topSpin = 0;

        this.initializeListeners();
    }

    initializeListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Escape') {
                togglePauseMenu();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    reset() {
        this.power = 0;
        this.isChargingPower = false;
        this.sideSpin = 0;
        this.topSpin = 0;
        this.aimX = 0;
        this.aimY = 1.2;
        this.keys = {}; // Очищуємо натиснуті кнопки, щоб уникнути зависання
    }

    /*
    ====================================================
    Function
    update()
    Призначення: Зчитує натиснуті кнопки та змінює стан гри.
    ====================================================
    */
    update(deltaTime, isRunUpStarted, gameState) {
        const aimSpeed = 4.8; // Збільшена швидкість прицілювання для чутливості

        // Дозволяємо цілитися під час вибору старту розбігу ТА під час самого розбігу
        if (gameState === 'aiming' || gameState === 'runup' || isRunUpStarted) {
            if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
                this.aimX = Math.max(-GOAL_WIDTH/2 - 0.8, this.aimX - aimSpeed * deltaTime);
                this.sideSpin = Math.max(-1.0, this.sideSpin - 1.5 * deltaTime);
            }
            if (this.keys['ArrowRight'] || this.keys['KeyD']) {
                this.aimX = Math.min(GOAL_WIDTH/2 + 0.8, this.aimX + aimSpeed * deltaTime);
                this.sideSpin = Math.min(1.0, this.sideSpin + 1.5 * deltaTime);
            }
            if (this.keys['ArrowUp'] || this.keys['KeyW']) {
                this.aimY = Math.min(GOAL_HEIGHT + 0.6, this.aimY + aimSpeed * 0.8 * deltaTime);
                this.topSpin = Math.max(-1.0, this.topSpin - 1.2 * deltaTime);
            }
            if (this.keys['ArrowDown'] || this.keys['KeyS']) {
                this.aimY = Math.max(0.05, this.aimY - aimSpeed * 0.8 * deltaTime);
                this.topSpin = Math.min(1.0, this.topSpin + 1.2 * deltaTime);
            }
        }

        // Керуємо стартовим офсетом зміщення гравця тільки коли прицілювання чисте (сила 0)
        if (gameState === 'aiming' && this.power === 0) {
            if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
                this.playerStartingOffsetX = Math.max(-2.5, this.playerStartingOffsetX - 2.5 * deltaTime);
            }
            if (this.keys['ArrowRight'] || this.keys['KeyD']) {
                this.playerStartingOffsetX = Math.min(2.5, this.playerStartingOffsetX + 2.5 * deltaTime);
            }
        }

        if (this.keys['Space']) {
            if (!isRunUpStarted) {
                this.isChargingPower = true;
            }
            if (this.isChargingPower) {
                this.power = Math.min(100.0, this.power + 110.0 * deltaTime);
            }
        } else {
            if (this.isChargingPower) {
                this.isChargingPower = false;
            }
        }
    }
}

const gameControls = new PlayerControls();

/*
====================================================
CLASS
PenaltyMasterGame

Відповідає за
✔ Головний цикл гри
✔ Зв'язування компонентів воєдино
====================================================
*/
class PenaltyMasterGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.camera = new Camera3D();
        this.goalNet = new GoalNet();
        
        this.player = new SkeletalCharacter(false);
        this.goalkeeper = new SkeletalCharacter(true);
        this.goalkeeperAI = new GoalkeeperAI(this.goalkeeper);
        this.ball = new Ball3D();

        this.lastTime = 0;
        this.gameTime = 0;
        this.fps = 60;
        this.fpsTimer = 0;
        this.frameCount = 0;

        this.gameState = 'aiming';
        this.runupProgress = 0;
        
        this.shotsCount = 0;
        this.goalsCount = 0;
        this.streakCount = 0;

        this.totalShots = 0;
        this.totalGoals = 0;
        this.goalkeeperSaves = 0;
        this.maxStreak = 0;
        this.postHits = 0;

        this.timeScale = 1.0;
        this.slowMoEnabled = true;

        this.windX = 0;
        this.windZ = 0;

        // Targets configuration in 3D (x, y, z)
        this.targets = [
            { id: 'top-left',  position: new Vector3(-GOAL_WIDTH/2 + 0.5, GOAL_HEIGHT - 0.5, 0), active: true },
            { id: 'top-right', position: new Vector3(GOAL_WIDTH/2 - 0.5, GOAL_HEIGHT - 0.5, 0), active: true }
        ];

        // Масив слідів бутс та падінь на полі (Pitch Degradation)
        this.pitchStains = [];
        this.targetHits = 0;
        this.coins = 0;

        // FIFA-style cinematic cutscene state
        this.cutsceneActive = false;
        this.cutsceneStage = 0;
        this.cutsceneTimer = 0;
        this.cutsceneIsGoal = false;
        this.cutsceneOrbitalAngle = 0;
        this._preSceneCamPos = null;
        this._preSceneCamTarget = null;

        // ===== LEVEL SYSTEM =====
        this.currentLevelIndex = 0; // 0-4
        this.levelGoalsScored = 0;  // goals in this level session
        this.levelShotsInLevel = 0;
        this.lastShotIsGoal = false;
        
        // Camera flashes simulation for stadium audience
        this.audienceFlashes = [];
        for (let i = 0; i < 45; i++) {
            this.audienceFlashes.push({
                xRatio: Math.random(),
                yRatio: Math.random(),
                intensity: Math.random(),
                speed: 0.8 + Math.random() * 2.2
            });
        }

        this.loadStatsFromStorage();
        this.generateNewWind();
        
        // Починаємо гру одразу зі складності LEGEND для максимального інтересу
        this.applyLevel(4); // Фінал ЧС 2026: Лос-Анджелес Стедіум (Складність LEGEND)
    }

    /*
    ====================================================
    Function
    start()
    Призначення: Запускає ігровий цикл.
    ====================================================
    */
    start() {
        this.resetShot();
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    /*
    ====================================================
    Function
    applyLevel()
    Призначення: Налаштовує всі параметри поточного рівня.
    ====================================================
    */
    applyLevel(levelIndex) {
        this.currentLevelIndex = Math.min(levelIndex, LEVEL_PRESETS.length - 1);
        const lvl = LEVEL_PRESETS[this.currentLevelIndex];

        this.levelGoalsScored = 0;
        this.levelShotsInLevel = 0;

        this.player.applyLevelColors(lvl);
        this.goalkeeper.applyLevelColors(lvl);

        // Перезаписуємо форму гравця кольорами обраного клубу
        const selectedClub = safeStorage.getItem('pm_selected_club') || 'real';
        const activeClub = CLUB_PRESETS.find(c => c.id === selectedClub);
        if (activeClub) {
            this.player.jerseyColor = activeClub.color;
            this.player.shortsColor = activeClub.shortColor;
            this.player.socksColor = activeClub.sockColor;
        }

        this.goalkeeperAI.setDifficulty(DIFFICULTY_PRESETS[lvl.difficulty]);

        const lvlEl = document.getElementById('hud-level');
        if (lvlEl) lvlEl.innerText = `Рівень ${lvl.id}: ${lvl.name}`;
        const progEl = document.getElementById('hud-level-progress');
        if (progEl) {
            const need = lvl.goalsToAdvance;
            progEl.innerText = `Голі: ${this.levelGoalsScored}/${need}`;
        }

        this.currentLevel = lvl;
    }

    /*
    ====================================================
    Function
    loop()
    Призначення: Один ігровий кадр.
    ====================================================
    */
    loop(currentTime) {
        if (document.getElementById('screen-pause').classList.contains('active')) {
            this.lastTime = currentTime;
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        let deltaTime = (currentTime - this.lastTime) / 1000.0;
        this.lastTime = currentTime;

        if (isNaN(deltaTime) || deltaTime <= 0) {
            deltaTime = 0.01666; 
        }
        if (deltaTime > 0.1) deltaTime = 0.1;

        const scaledDeltaTime = deltaTime * this.timeScale;

        this.frameCount++;
        this.fpsTimer += deltaTime;
        if (this.fpsTimer >= 1.0) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsTimer = 0;
            document.getElementById('hud-fps').innerText = this.fps;
        }

        this.update(scaledDeltaTime, deltaTime);
        this.render(scaledDeltaTime);

        requestAnimationFrame((t) => this.loop(t));
    }

    /*
    ====================================================
    Function
    update()
    Призначення: Оновлює фізичні об'єкти та стани геймплею.
    ====================================================
    */
    update(scaledDeltaTime, realDeltaTime) {
        this.camera.update();
        gameVFX.update(scaledDeltaTime);
        
        const isRunUpStarted = this.gameState !== 'aiming';
        gameControls.update(realDeltaTime, isRunUpStarted, this.gameState);

        document.getElementById('hud-power-fill').style.width = gameControls.power + '%';

        this.goalNet.update(scaledDeltaTime);

        if (this.gameState === 'flight' || this.gameState === 'result') {
            this.ball.velocity.coordinateX += this.windX * 0.05 * scaledDeltaTime;
            this.ball.velocity.coordinateZ += this.windZ * 0.05 * scaledDeltaTime;

            this.ball.update(scaledDeltaTime);
            this.goalNet.handleBallCollision(this.ball);
        }

        // Якщо ми граємо онлайн і ми є воротарем, дозволимо керувати ним вручну
        if (multiplayerState.isOnline && multiplayerState.role === 'keeper') {
            const moveSpeed = 4.0;
            if (gameControls.keys['ArrowLeft'] || gameControls.keys['KeyA']) {
                this.goalkeeper.position.coordinateX = Math.max(-GOAL_WIDTH/2 - 0.7, this.goalkeeper.position.coordinateX - moveSpeed * scaledDeltaTime);
            }
            if (gameControls.keys['ArrowRight'] || gameControls.keys['KeyD']) {
                this.goalkeeper.position.coordinateX = Math.min(GOAL_WIDTH/2 + 0.7, this.goalkeeper.position.coordinateX + moveSpeed * scaledDeltaTime);
            }

            // Робимо сейв (стрибок) при натисканні пробілу
            if (gameControls.keys['Space'] && this.gameState === 'flight' && !this.goalkeeperAI.hasJumped) {
                // Визначаємо куди кидатися на основі натиснутої стрілки
                const isLeft = gameControls.keys['ArrowLeft'] || gameControls.keys['KeyA'];
                const isRight = gameControls.keys['ArrowRight'] || gameControls.keys['KeyD'];
                const isHigh = gameControls.keys['ArrowUp'] || gameControls.keys['KeyW'];
                
                this.goalkeeperAI.hasJumped = true;
                this.goalkeeperAI.predictedTargetX = this.goalkeeper.position.coordinateX + (isLeft ? -1.8 : (isRight ? 1.8 : 0));
                this.goalkeeperAI.predictedTargetY = isHigh ? 1.6 : 0.4;
                
                const isAcrobaticDiff = Math.random() < 0.50; // 50% сальто
                if (isAcrobaticDiff) {
                    this.goalkeeper.setPose(isLeft ? 'somersault_left' : 'somersault_right');
                } else {
                    this.goalkeeper.setPose(isLeft ? (isHigh ? 'dive_high_left' : 'dive_low_left') : (isHigh ? 'dive_high_right' : 'dive_low_right'));
                }
                this.goalkeeperAI.divePhase = 1;
                this.goalkeeperAI.diveVelocityY = Math.sqrt(2.2 * PHYSICS_GRAVITY * this.goalkeeperAI.predictedTargetY);
            }

            // Відправляємо координати нашого воротаря супернику
            sendNetData({
                type: 'keeper_move',
                x: this.goalkeeper.position.coordinateX,
                y: this.goalkeeper.position.coordinateY,
                pose: this.goalkeeper.pose
            });
        }

        // Оновлюємо воротаря: для воротаря-гравця фізику стрибків рахує ШІ-клас (для спрощення), але без вибору рішень ШІ
        if (multiplayerState.isOnline && multiplayerState.role === 'keeper') {
            // Ручне оновлення падіння воротаря
            if (this.goalkeeperAI.divePhase >= 1) {
                const deltaX = this.goalkeeperAI.predictedTargetX - this.goalkeeper.position.coordinateX;
                const maxStep = 8.2 * scaledDeltaTime;
                this.goalkeeper.position.coordinateX += Math.sign(deltaX) * Math.min(Math.abs(deltaX), maxStep);

                this.goalkeeperAI.diveVelocityY -= PHYSICS_GRAVITY * 1.4 * scaledDeltaTime;
                this.goalkeeper.position.coordinateY += this.goalkeeperAI.diveVelocityY * scaledDeltaTime;

                if (this.goalkeeper.position.coordinateY <= 0.0) {
                    this.goalkeeper.position.coordinateY = 0.0;
                    this.goalkeeperAI.diveVelocityY = 0;
                    this.goalkeeperAI.divePhase = 3;
                }
            }
        } else {
            this.goalkeeperAI.update(scaledDeltaTime, this.ball);
        }
        
        this.goalkeeper.update(scaledDeltaTime);

        const playerMultiplier = this.gameState === 'runup' ? 1.2 : 1.0;
        this.player.update(scaledDeltaTime, playerMultiplier);

        switch(this.gameState) {
            case 'aiming':
                const startZ = PENALTY_SPOT_Z + 2.8;
                const startX = gameControls.playerStartingOffsetX;
                this.player.position.set(startX, 0, startZ);
                this.player.headingAngle = Math.atan2(-startX, -3.0);
                this.player.setPose('idle');

                // Воротар підстрибує перед ударом (для синглплеєра)
                if (!multiplayerState.isOnline) {
                    this.goalkeeper.setPose('goalkeeper_bounce');
                }

                // Якщо гра онлайн і ми воротар - ми не можемо бити
                if (multiplayerState.isOnline && multiplayerState.role === 'keeper') {
                    // Воротар може виконувати провокативні пози або підстрибування перед ударом
                    if (gameControls.keys['KeyW']) {
                        this.goalkeeper.setPose('hang_bar');
                        sendNetData({ type: 'keeper_antic', pose: 'hang_bar' });
                    } else if (gameControls.keys['KeyS']) {
                        this.goalkeeper.setPose('walk_bar');
                        sendNetData({ type: 'keeper_antic', pose: 'walk_bar' });
                    } else if (gameControls.keys['KeyF']) {
                        this.goalkeeper.setPose('goalkeeper_bounce');
                        sendNetData({ type: 'keeper_antic', pose: 'goalkeeper_bounce' });
                    } else if (gameControls.keys['KeyA'] || gameControls.keys['KeyD']) {
                        this.goalkeeper.setPose('idle');
                        sendNetData({ type: 'keeper_antic', pose: 'idle' });
                    }
                }

                // Обманний рух (замах): якщо натиснути кнопку F перед розбігом
                if (gameControls.keys['KeyF'] && (multiplayerState.role !== 'keeper')) {
                    this.gameState = 'fake_swing';
                    this.runupProgress = 0;
                    this.player.setPose('fake_kick');
                    if (multiplayerState.isOnline) {
                        sendNetData({ type: 'keeper_antic', pose: 'fake_kick' });
                    }
                    // Воротар-ШІ реагує на обманку і стрибає раніше!
                    if (!multiplayerState.isOnline) {
                        setTimeout(() => {
                            this.goalkeeperAI.onBallKicked(this.ball);
                        }, 150);
                    }
                }

                if (!gameControls.isChargingPower && gameControls.power > 5) {
                    if (multiplayerState.isOnline && multiplayerState.role === 'keeper') {
                        // Воротар очікує удар від б'ючого
                    } else {
                        this.gameState = 'runup';
                        this.runupProgress = 0;
                        gameAudio.playWhistle();
                        
                        // Ховаємо картку Ultimate Team при розбігу
                        const card = document.getElementById('ut-card-broadcast');
                        if (card) card.className = 'ut-card-hidden';
                    }
                } else if (multiplayerState.isOnline && multiplayerState.role === 'striker') {
                    // Надсилаємо приціл супернику-воротарю
                    sendNetData({
                        type: 'sync_aim',
                        aimX: gameControls.aimX,
                        aimY: gameControls.aimY,
                        power: gameControls.power
                    });
                }
                break;

            case 'fake_swing':
                this.runupProgress += scaledDeltaTime * 4.0;
                if (this.runupProgress >= 1.0) {
                    this.gameState = 'aiming';
                    this.runupProgress = 0;
                    gameControls.reset();
                }
                break;

            case 'runup':
                this.player.setPose('run');
                const runSpeed = 4.8;
                const distanceVector = new Vector3(0, 0, PENALTY_SPOT_Z).subtract(this.player.position);
                const distanceVal = distanceVector.length();

                if (distanceVal > 0.42) {
                    const runDir = distanceVector.normalize();
                    this.player.position = this.player.position.add(runDir.scale(runSpeed * scaledDeltaTime));

                    // Періодично додаємо сліди бутс від бігу
                    if (Math.random() < 0.15) {
                        this.pitchStains.push({
                            position: this.player.position.clone(),
                            radius: 0.05 + Math.random() * 0.05
                        });
                    }
                } else {
                    this.gameState = 'kick';
                    this.player.setPose('kick_swing');
                    this.runupProgress = 0;
                }
                break;

            case 'kick':
                this.runupProgress += scaledDeltaTime * 4.0;
                this.player.setPose('kick_strike');
                
                const slideVector = new Vector3(0, 0, -1.2);
                this.player.position = this.player.position.add(slideVector.scale(scaledDeltaTime));
                
                if (this.runupProgress >= 1.0) {
                    const angleX = Math.atan2(gameControls.aimX, PENALTY_SPOT_Z);
                    const angleY = Math.atan2(gameControls.aimY - BALL_RADIUS, PENALTY_SPOT_Z);

                    let powerMultiplier = 1.0;
                    if (gameControls.keys['ShiftLeft']) {
                        powerMultiplier = 1.22;
                    }
                    
                    let adjustedAimY = angleY;
                    if (gameControls.keys['ControlLeft']) {
                        adjustedAimY = 0.01;
                        powerMultiplier *= 0.9;
                    }

                    const finalPower = gameControls.power * powerMultiplier;

                    this.ball.kick(
                        finalPower, 
                        angleX, 
                        adjustedAimY, 
                        gameControls.sideSpin, 
                        gameControls.topSpin
                    );

                    if (multiplayerState.isOnline && multiplayerState.role === 'striker') {
                        sendNetData({
                            type: 'kick',
                            power: gameControls.power,
                            aimX: gameControls.aimX,
                            aimY: gameControls.aimY,
                            sideSpin: gameControls.sideSpin,
                            topSpin: gameControls.topSpin
                        });
                    }

                    this.goalkeeperAI.onBallKicked(this.ball);
                    this.gameState = 'flight';
                    this.runupProgress = 0; 
                }
                break;

            case 'flight':
                this.runupProgress += scaledDeltaTime;
                if (this.runupProgress < 0.4) {
                    this.player.setPose('kick_strike');
                } else {
                    this.player.setPose('idle');
                }
                this.trackCameraToBall(scaledDeltaTime);

                // В мережевій грі колізії розраховує тільки striker (б'ючий), а воротар отримує пакет result
                const isLocalOrStriker = !multiplayerState.isOnline || multiplayerState.role === 'striker';
                const saveResult = isLocalOrStriker ? this.goalkeeperAI.checkSaveCollision(this.ball) : null;
                if (saveResult) {
                    this.gameState = 'result';
                    this.timeScale = 1.0;

                    if (saveResult.type === 'save') {
                        this.ball.velocity.set(0, 0, 0);
                        this.ball.angularVelocity.set(0, 0, 0);
                        this.ball.isStatic = true;
                        this.goalkeeper.setPose('idle');
                        
                        // Додаємо слід ковзання воротаря на газоні в місці падіння
                        this.pitchStains.push({
                            position: this.goalkeeper.position.clone(),
                            radius: 0.16 + Math.random() * 0.08
                        });

                        gameAudio.playKeeperSave();
                        this.triggerShotResult(false, 'СЕЙВ ВОРОТАРЯ!');
                    } else {
                        const n  = saveResult.contactNormal; 
                        const kv = saveResult.keeperVel;     
                        const bv = this.ball.velocity;        

                        const relVelDotN = (
                            (bv.coordinateX - kv.coordinateX) * n.coordinateX +
                            (bv.coordinateY - kv.coordinateY) * n.coordinateY +
                            (bv.coordinateZ - kv.coordinateZ) * n.coordinateZ
                        );

                        const restitution = 0.72; 
                        const impulseMag = -(1.0 + restitution) * relVelDotN;

                        const newVelX = bv.coordinateX + impulseMag * n.coordinateX + kv.coordinateX * 0.45;
                        const newVelY = bv.coordinateY + impulseMag * n.coordinateY + Math.abs(kv.coordinateY) * 0.3 + 1.5;
                        const newVelZ = Math.abs(bv.coordinateZ) * restitution + 3.5; 

                        this.ball.velocity = new Vector3(newVelX, newVelY, newVelZ);
                        this.ball.angularVelocity = new Vector3(
                            (Math.random() - 0.5) * 8.0,
                            kv.coordinateX * -0.4,
                            (Math.random() - 0.5) * 4.0
                        );

                        gameAudio.playKeeperSave();
                        this.triggerShotResult(false, 'ВІДБИТО!');
                    }
                }

                // Check collision with interactive targets in the corners of the goal
                if (isLocalOrStriker && !this.ball.didHitTarget && this.ball.position.coordinateZ <= 0.8 && this.ball.position.coordinateZ >= -0.2) {
                    this.targets.forEach(target => {
                        if (target.active) {
                            const distanceVec = this.ball.position.subtract(target.position);
                            // Ігноруємо глибину Z для плоского перерізу мішені у створі воріт
                            const dist2D = Math.sqrt(distanceVec.coordinateX*distanceVec.coordinateX + distanceVec.coordinateY*distanceVec.coordinateY);
                            if (dist2D < (TARGET_RADIUS + BALL_RADIUS)) {
                                target.active = false;
                                this.ball.didHitTarget = true;
                                this.targetHits++;
                                
                                // Гучний звук та вибух часток
                                gameAudio.playGoalCheer();
                                gameVFX.spawnTargetHitExplosion(target.position);
                                
                                // Тряска камери для соковитості
                                this.camera.triggerShake(0.85);
                            }
                        }
                    });
                }

                if (isLocalOrStriker) {
                    if (this.ball.position.coordinateZ <= 0.05 && this.ball.position.coordinateZ >= -0.2) {
                        const inGoalX = Math.abs(this.ball.position.coordinateX) < (GOAL_WIDTH / 2 - 0.03);
                        const inGoalY = this.ball.position.coordinateY < (GOAL_HEIGHT - 0.03) && this.ball.position.coordinateY > 0.05;

                        if (inGoalX && inGoalY) {
                            this.gameState = 'result';
                            this.timeScale = 1.0;
                            this.ball.velocity = this.ball.velocity.scale(0.12);
                            this.ball.angularVelocity = this.ball.angularVelocity.scale(0.1);
                            gameAudio.playNetRustle();
                            gameAudio.playGoalCheer();
                            gameVFX.spawnConfettiRain(this.ball.position);
                            this.triggerShotResult(true, 'Лозко молодець');
                        }
                    }

                    if (this.ball.position.coordinateZ < -0.3) {
                        this.gameState = 'result';
                        this.timeScale = 1.0;
                        gameAudio.playMissGroan();
                        this.triggerShotResult(false, 'Палажченко гуска');
                    } else if (Math.abs(this.ball.position.coordinateX) > GOAL_WIDTH / 2 + 1.8 || this.ball.position.coordinateY > GOAL_HEIGHT + 1.2) {
                        this.gameState = 'result';
                        this.timeScale = 1.0;
                        gameAudio.playMissGroan();
                        this.triggerShotResult(false, 'Палажченко гуска');
                    }
                }

                if (this.slowMoEnabled && this.ball.position.coordinateZ < 3.2 && this.ball.position.coordinateZ > 0.4) {
                    this.timeScale = 0.25;
                } else {
                    this.timeScale = 1.0;
                }
                break;

            case 'result':
                if (this.cutsceneActive) {
                    this.updateCutscene(scaledDeltaTime);
                } else {
                    this.trackCameraToBall(scaledDeltaTime);
                }

                if (this.lastShotIsGoal) {
                    this.player.setPose('celebrate');
                    this.goalkeeper.setPose('sad');
                } else {
                    this.player.setPose('sad');
                    this.goalkeeper.setPose('celebrate');
                }
                break;
        }
    }

    trackCameraToBall(deltaTime) {
        const targetCamX = this.ball.position.coordinateX * 0.72;
        const targetCamY = Math.max(1.5, this.ball.position.coordinateY * 0.8 + 0.5);
        const targetCamZ = this.ball.position.coordinateZ + 4.2;

        this.camera.position.coordinateX += (targetCamX - this.camera.position.coordinateX) * 3.5 * deltaTime;
        this.camera.position.coordinateY += (targetCamY - this.camera.position.coordinateY) * 3.5 * deltaTime;
        this.camera.position.coordinateZ += (targetCamZ - this.camera.position.coordinateZ) * 3.5 * deltaTime;
    }

    startCutscene(isGoal) {
        this.cutsceneActive = true;
        this.cutsceneIsGoal = isGoal;
        this.cutsceneStage = 1;
        this.cutsceneTimer = 0;
        this.cutsceneOrbitalAngle = 0;

        this._preSceneCamPos    = this.camera.position.clone();
        this._preSceneCamTarget = this.camera.target.clone();
    }

    updateCutscene(deltaTime) {
        this.cutsceneTimer += deltaTime;

        if (this.cutsceneStage === 1) {
            const focusTarget = this.cutsceneIsGoal ? this.ball.position : this.goalkeeper.position;
            const stageProg = Math.min(1.0, this.cutsceneTimer / 1.4);

            const closeX = focusTarget.coordinateX + Math.sin(this.cutsceneTimer * 0.6) * 0.4;
            const closeY = focusTarget.coordinateY + 0.6;
            const closeZ = focusTarget.coordinateZ + (this.cutsceneIsGoal ? 1.8 : 1.2);

            const lerpK = 4.5 * deltaTime;
            this.camera.position.coordinateX += (closeX - this.camera.position.coordinateX) * lerpK;
            this.camera.position.coordinateY += (closeY - this.camera.position.coordinateY) * lerpK;
            this.camera.position.coordinateZ += (closeZ - this.camera.position.coordinateZ) * lerpK;

            this.camera.target.coordinateX += (focusTarget.coordinateX - this.camera.target.coordinateX) * lerpK;
            this.camera.target.coordinateY += (focusTarget.coordinateY - this.camera.target.coordinateY) * lerpK;
            this.camera.target.coordinateZ += (focusTarget.coordinateZ - this.camera.target.coordinateZ) * lerpK;

            if (this.cutsceneTimer >= 1.4) {
                this.cutsceneStage = 2;
                this.cutsceneTimer = 0;
                this.cutsceneOrbitalAngle = Math.PI * 0.15;
            }

        } else if (this.cutsceneStage === 2) {
            const focusChar = this.cutsceneIsGoal ? this.player : this.goalkeeper;
            const orbitRadius = 2.8;
            const orbitHeight = 1.3;

            this.cutsceneOrbitalAngle += 0.55 * deltaTime; 

            const targetOrbX = focusChar.position.coordinateX + Math.sin(this.cutsceneOrbitalAngle) * orbitRadius;
            const targetOrbZ = focusChar.position.coordinateZ + Math.cos(this.cutsceneOrbitalAngle) * orbitRadius;

            const lerpK = 2.8 * deltaTime;
            this.camera.position.coordinateX += (targetOrbX - this.camera.position.coordinateX) * lerpK;
            this.camera.position.coordinateY += (orbitHeight - this.camera.position.coordinateY) * lerpK;
            this.camera.position.coordinateZ += (targetOrbZ - this.camera.position.coordinateZ) * lerpK;

            this.camera.target.coordinateX += (focusChar.position.coordinateX - this.camera.target.coordinateX) * lerpK;
            this.camera.target.coordinateY += (1.0 - this.camera.target.coordinateY) * lerpK;
            this.camera.target.coordinateZ += (focusChar.position.coordinateZ - this.camera.target.coordinateZ) * lerpK;

            if (this.cutsceneTimer >= 2.8) {
                this.cutsceneActive = false;
                this.cutsceneStage = 0;
            }
        }
    }

    triggerShotResult(isGoal, messageText) {
        this.shotsCount++;
        this.lastShotIsGoal = isGoal;

        // Надсилаємо результат супернику, якщо ми б'ючий (він розраховує колізії першим)
        if (multiplayerState.isOnline && multiplayerState.role === 'striker') {
            sendNetData({
                type: 'result',
                isGoal: isGoal,
                message: messageText
            });
        }
        
        if (isGoal) {
            this.goalsCount++;
            this.streakCount++;
            if (this.streakCount > this.maxStreak) {
                this.maxStreak = this.streakCount;
            }
            this.totalGoals++;

            // Нараховуємо монети за гол (+10) та за мішень (+25 якщо збили)
            let earned = 10;
            if (this.ball.didHitTarget) {
                earned += 25;
            }
            this.coins += earned;

            this.levelGoalsScored++;
            const lvl = this.currentLevel || LEVEL_PRESETS[0];
            const progEl = document.getElementById('hud-level-progress');
            if (progEl) progEl.innerText = `Голі: ${this.levelGoalsScored}/${lvl.goalsToAdvance}`;

            // Кожні 3 забиті голи видаємо новий пак карток Ultimate Team
            if (this.goalsCount > 0 && this.goalsCount % 3 === 0) {
                setTimeout(() => {
                    triggerPackOpening();
                }, 4400);
            } else if (this.levelGoalsScored >= lvl.goalsToAdvance && this.currentLevelIndex < LEVEL_PRESETS.length - 1) {
                setTimeout(() => {
                    this.showLevelUp(this.currentLevelIndex + 1);
                }, 4200);
            }
        } else {
            this.streakCount = 0;
            if (messageText.includes('СЕЙВ') || messageText.includes('ВІДБИТО')) {
                this.goalkeeperSaves++;
            }
        }

        this.totalShots++;
        if (this.ball.hitPostCount > 0) {
            this.postHits += this.ball.hitPostCount;
        }

        this.saveStatsToStorage();
        this.updateHUD();

        const banner = document.getElementById('banner-overlay');
        const bannerText = document.getElementById('banner-text');
        bannerText.innerText = messageText;
        
        bannerText.className = 'banner-text';
        if (isGoal) bannerText.classList.add('banner-goal');
        else if (messageText.includes('СЕЙВ') || messageText.includes('ВІДБИТО')) bannerText.classList.add('banner-save');
        else bannerText.classList.add('banner-miss');

        const lvl = this.currentLevel || LEVEL_PRESETS[0];
        if (isGoal) bannerText.innerText = `${lvl.playerName} молодец👏`;
        else if (!messageText.includes('СЕЙВ') && !messageText.includes('ВІДБИТО'))
            bannerText.innerText = `${lvl.keeperName} гуска🦢`;

        banner.classList.add('active');

        const triggerCutscene = isGoal || messageText.includes('СЕЙВ') || messageText.includes('ВІДБИТО');
        if (triggerCutscene) {
            this.startCutscene(isGoal);
        }

        const resetDelay = triggerCutscene ? 4800 : 3500;
        setTimeout(() => {
            banner.classList.remove('active');
            this.cutsceneActive = false;
            
            // Запобігаємо зависанню при переході на наступний рівень
            const levelUpScreen = document.getElementById('screen-level-up');
            const isLevelUpActive = levelUpScreen && levelUpScreen.classList.contains('active');
            
            if (!isLevelUpActive) {
                this.resetShot();
            }
        }, resetDelay);
    }

    resetShot() {
        this.gameState = 'aiming';
        this.timeScale = 1.0;
        this.ball.reset();
        this.goalkeeperAI.reset();
        gameControls.reset();

        // Reactivate goal targets
        this.targets.forEach(t => t.active = true);

        // Відображаємо картку Ultimate Team гравця при прицілюванні
        const card = document.getElementById('ut-card-broadcast');
        if (card) {
            const lvl = this.currentLevel || LEVEL_PRESETS[0];
            const activeClubId = safeStorage.getItem('pm_selected_club') || 'real';
            const activeClub = CLUB_PRESETS.find(c => c.id === activeClubId);
            
            document.getElementById('ut-card-val-name').innerText = lvl.playerName;
            document.getElementById('ut-card-val-logo').innerText = activeClub ? activeClub.logo : '👑';
            
            // Випадкові характеристики для реалістичності FC 26
            const randRating = 90 + Math.floor(Math.random() * 9);
            document.getElementById('ut-card-val-rating').innerText = randRating;

            card.className = 'ut-card-visible';
        }

        this.camera.position.set(0, 1.8, PENALTY_SPOT_Z + 4.2);
        this.camera.target.set(0, 1.0, 0);

        this.generateNewWind();
        this.updateHUD();
    }

    showLevelUp(nextLevelIdx) {
        const nextLvl = LEVEL_PRESETS[nextLevelIdx];
        const screen = document.getElementById('screen-level-up');
        if (!screen) return;

        document.getElementById('levelup-title').innerText = `Рівень ${nextLvl.id}`;
        document.getElementById('levelup-name').innerText = nextLvl.name;
        document.getElementById('levelup-subtitle').innerText = nextLvl.subtitle;
        document.getElementById('levelup-next-keeper').innerText = `Воротар: ${nextLvl.keeperName}`;

        screen.classList.add('active');

        document.getElementById('btn-levelup-continue').onclick = () => {
            screen.classList.remove('active');
            this.applyLevel(nextLevelIdx);
            this.resetShot();
        };
    }

    getTrajectoryPoints(width, height) {
        const angleX = Math.atan2(gameControls.aimX, PENALTY_SPOT_Z);
        const angleY = Math.atan2(gameControls.aimY - BALL_RADIUS, PENALTY_SPOT_Z);

        let powerMultiplier = 1.0;
        if (gameControls.keys['ShiftLeft']) powerMultiplier = 1.22;
        
        let adjustedAimY = angleY;
        if (gameControls.keys['ControlLeft']) {
            adjustedAimY = 0.01;
            powerMultiplier *= 0.9;
        }

        const currentPower = gameControls.power > 5 ? gameControls.power : 70;
        const finalPower = currentPower * powerMultiplier;

        const forceMult = 16.0 + (finalPower / 100.0) * 19.0;
        const speedZ = -Math.cos(adjustedAimY) * Math.cos(angleX) * forceMult;
        const speedX = Math.cos(adjustedAimY) * Math.sin(angleX) * forceMult;
        const speedY = Math.sin(adjustedAimY) * forceMult;

        let simBallPos = new Vector3(this.ball.position.coordinateX, this.ball.position.coordinateY, this.ball.position.coordinateZ);
        let simBallVel = new Vector3(speedX, speedY, speedZ);
        let simAngularVel = new Vector3(
            gameControls.topSpin * 2.5,
            gameControls.sideSpin * -3.5,
            gameControls.sideSpin * 0.8
        );

        const timeStep = 0.016; 
        const trajectoryPoints = [];

        for (let step = 0; step < 70; step++) {
            const proj = this.camera.project(simBallPos, width, height);
            if (proj) {
                trajectoryPoints.push(proj);
            }

            if (simBallPos.coordinateZ <= 0.0 || simBallPos.coordinateY < BALL_RADIUS - 0.02) {
                break;
            }

            const speed = simBallVel.length();
            if (speed > 0.05) {
                const drag = 0.5 * PHYSICS_AIR_DENSITY * BALL_DRAG_COEFFICIENT * BALL_CROSS_SECTION * speed * speed;
                simBallVel.coordinateX += (-simBallVel.coordinateX / speed) * (drag / BALL_MASS) * timeStep;
                simBallVel.coordinateY += (-simBallVel.coordinateY / speed) * (drag / BALL_MASS) * timeStep;
                simBallVel.coordinateZ += (-simBallVel.coordinateZ / speed) * (drag / BALL_MASS) * timeStep;
            }

            if (speed > 0.1 && simAngularVel.length() > 0.1) {
                const magnus = simAngularVel.cross(simBallVel).scale(BALL_MAGNUS_COEFFICIENT / BALL_MASS);
                simBallVel = simBallVel.add(magnus.scale(timeStep));
            }

            simBallVel.coordinateY -= PHYSICS_GRAVITY * timeStep;
            
            simBallVel.coordinateX += this.windX * 0.05 * timeStep;
            simBallVel.coordinateZ += this.windZ * 0.05 * timeStep;

            simBallPos = simBallPos.add(simBallVel.scale(timeStep));
        }

        return trajectoryPoints;
    }

    generateNewWind() {
        let maxWind = 3.0;
        if (this.goalkeeperAI.difficulty && this.goalkeeperAI.difficulty.name === 'HARD') maxWind = 7.0;
        if (this.goalkeeperAI.difficulty && this.goalkeeperAI.difficulty.name === 'LEGEND') maxWind = 12.0;

        this.windX = (Math.random() - 0.5) * 2.0 * maxWind;
        this.windZ = (Math.random() - 0.5) * maxWind;
    }

    render(scaledDeltaTime) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.clearRect(0, 0, width, height);

        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height * 0.45);
        const lvl = this.currentLevel || LEVEL_PRESETS[0];
        skyGrad.addColorStop(0, lvl.skyTop);
        skyGrad.addColorStop(0.5, lvl.skyMid);
        skyGrad.addColorStop(1, lvl.skyBot);
        this.ctx.fillStyle = skyGrad;
        this.ctx.fillRect(0, 0, width, height);

        const goalProj = this.camera.project(new Vector3(0, GOAL_HEIGHT, 0), width, height);
        let horizonY = height * 0.45;
        if (goalProj && !isNaN(goalProj.y) && isFinite(goalProj.scale)) {
            horizonY = goalProj.y + 25 * (goalProj.scale / 300);
        }
        if (isNaN(horizonY) || !isFinite(horizonY)) {
            horizonY = height * 0.45;
        }

        this.ctx.fillStyle = lvl.stadiumColor;
        this.ctx.beginPath();
        this.ctx.moveTo(0, horizonY - height * 0.25);
        this.ctx.lineTo(width, horizonY - height * 0.25);
        this.ctx.lineTo(width, horizonY);
        this.ctx.lineTo(0, horizonY);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = lvl.stadiumColor;
        this.ctx.lineWidth = 1.0;
        for (let coordinateY = horizonY - height * 0.22; coordinateY < horizonY - 5; coordinateY += 6) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, coordinateY);
            this.ctx.lineTo(width, coordinateY);
            this.ctx.stroke();
        }

        this.audienceFlashes.forEach(flash => {
            // При святкуванні гола спалахи камери вибухають набагато частіше та інтенсивніше
            const isGoalCelebrate = this.cutsceneActive && this.cutsceneIsGoal;
            const flashSpeedMultiplier = isGoalCelebrate ? 4.5 : 1.0;
            
            flash.intensity += flash.speed * (scaledDeltaTime || 0.016) * flashSpeedMultiplier;
            if (flash.intensity > Math.PI) {
                flash.intensity = 0;
                flash.xRatio = Math.random();
                flash.yRatio = Math.random();
                flash.speed = isGoalCelebrate ? 2.5 + Math.random() * 4.5 : 0.8 + Math.random() * 3.5;
            }
            const brightness = Math.sin(flash.intensity) * (isGoalCelebrate ? 1.45 : 1.0);
            if (brightness > 0.05) {
                const flashX = flash.xRatio * width;
                const flashY = (horizonY - height * 0.22) + flash.yRatio * (height * 0.20);
                
                this.ctx.fillStyle = lvl.lightColor2;
                this.ctx.save();
                this.ctx.globalAlpha = brightness * 0.85;
                this.ctx.beginPath();
                this.ctx.arc(flashX, flashY, 1.8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        });

        const floodLights = [
            { x: width * 0.1, y: horizonY - height * 0.25 },
            { x: width * 0.35, y: horizonY - height * 0.28 },
            { x: width * 0.65, y: horizonY - height * 0.28 },
            { x: width * 0.9, y: horizonY - height * 0.25 }
        ];
        
        floodLights.forEach(light => {
            if (isNaN(light.x) || !isFinite(light.x) || isNaN(light.y) || !isFinite(light.y)) {
                return;
            }
            this.ctx.strokeStyle = '#050510';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.moveTo(light.x, light.y);
            this.ctx.lineTo(light.x - 10, light.y + 40);
            this.ctx.stroke();

            const radG = this.ctx.createRadialGradient(light.x, light.y, 1, light.x, light.y, 45);
            radG.addColorStop(0, '#ffffff');
            radG.addColorStop(0.2, lvl.lightColor1);
            radG.addColorStop(0.5, lvl.lightColor2);
            radG.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = radG;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, 45, 0, Math.PI * 2);
            this.ctx.fill();
        });

        const grassColors = [lvl.grassA, lvl.grassB];
        const totalGrassStripes = 20;
        const overlapZ = 0.05; 
        
        for (let stripeIdx = 0; stripeIdx < totalGrassStripes; stripeIdx++) {
            const progressNear = stripeIdx / totalGrassStripes;
            const progressFar = (stripeIdx + 1) / totalGrassStripes;

            const zNear = 18.0 - progressNear * 22.0;
            const zFar = 18.0 - progressFar * 22.0 - overlapZ;

            const pLeftNear = new Vector3(-25.0, 0, zNear);
            const pRightNear = new Vector3(25.0, 0, zNear);
            const pLeftFar = new Vector3(-25.0, 0, zFar);
            const pRightFar = new Vector3(25.0, 0, zFar);

            const projLN = this.camera.project(pLeftNear, width, height);
            const projRN = this.camera.project(pRightNear, width, height);
            const projLF = this.camera.project(pLeftFar, width, height);
            const projRF = this.camera.project(pRightFar, width, height);

            if (projLN && projRN && projLF && projRF) {
                this.ctx.fillStyle = grassColors[stripeIdx % 2];
                this.ctx.beginPath();
                this.ctx.moveTo(projLF.x, projLF.y);
                this.ctx.lineTo(projRF.x, projRF.y);
                this.ctx.lineTo(projRN.x, projRN.y);
                this.ctx.lineTo(projLN.x, projLN.y);
                this.ctx.closePath();
                this.ctx.fill();
            }
        }

        // Рендеринг слідів бутс та падінь (Pitch Degradation)
        this.pitchStains.forEach(stain => {
            const proj = this.camera.project(stain.position, width, height);
            if (proj) {
                const size = stain.radius * proj.scale;
                this.ctx.fillStyle = 'rgba(10, 35, 10, 0.45)'; // Темний бруд від розкопаного газону
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });

        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        this.ctx.lineWidth = 2.0;

        const lineGoalL = new Vector3(-12.0, 0, 0);
        const lineGoalR = new Vector3(12.0, 0, 0);
        const projGL = this.camera.project(lineGoalL, width, height);
        const projGR = this.camera.project(lineGoalR, width, height);
        if (projGL && projGR) {
            this.ctx.beginPath();
            this.ctx.moveTo(projGL.x, projGL.y);
            this.ctx.lineTo(projGR.x, projGR.y);
            this.ctx.stroke();
        }

        const boxPoints = [
            new Vector3(-20.16, 0, 0),
            new Vector3(-20.16, 0, 16.5),
            new Vector3(20.16, 0, 16.5),
            new Vector3(20.16, 0, 0)
        ];
        const projBox = boxPoints.map(p => this.camera.project(p, width, height));
        if (projBox.every(p => p !== null)) {
            this.ctx.beginPath();
            this.ctx.moveTo(projBox[0].x, projBox[0].y);
            this.ctx.lineTo(projBox[1].x, projBox[1].y);
            this.ctx.lineTo(projBox[2].x, projBox[2].y);
            this.ctx.lineTo(projBox[3].x, projBox[3].y);
            this.ctx.stroke();
        }

        const spotProj = this.camera.project(new Vector3(0, 0, PENALTY_SPOT_Z), width, height);
        if (spotProj) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.beginPath();
            this.ctx.arc(spotProj.x, spotProj.y, 4 * (spotProj.scale / 300), 0, Math.PI * 2);
            this.ctx.fill();
        }

        // ====================================================
        // KRONOS FOOTBALL DIGITAL AD BOARDS (Рекламні щити)
        // ====================================================
        const adTexts = ['KRONOS FOOTBALL', 'PLAYSTATION 5', 'NIKE SOCCER', 'PEPSI MAX', 'CHAMPIONS LEAGUE'];
        const adIndex = Math.floor((this.gameTime || 0) * 0.5) % adTexts.length;
        
        // Реакція на гол: щити блимають золотим кольором
        const isGoalReaction = this.cutsceneActive && this.cutsceneIsGoal;
        const currentAdText = isGoalReaction ? '⚽ GOAL! GOAL! GOAL! ⚽' : adTexts[adIndex];
        const adColor = isGoalReaction ? '#ffd700' : '#00ffcc';
        const adBorder = isGoalReaction ? '#ffffff' : '#00ffcc';

        // Малюємо щити ліворуч та праворуч від воріт
        const adBoards = [
            { start: new Vector3(-11, 0, 4), end: new Vector3(-8, 0, 0) },
            { start: new Vector3(8, 0, 0), end: new Vector3(11, 0, 4) }
        ];

        adBoards.forEach(board => {
            const pStart = board.start;
            const pEnd = board.end;
            const pStartTop = new Vector3(pStart.coordinateX, 0.8, pStart.coordinateZ);
            const pEndTop = new Vector3(pEnd.coordinateX, 0.8, pEnd.coordinateZ);

            const projSB = this.camera.project(pStart, width, height);
            const projEB = this.camera.project(pEnd, width, height);
            const projSBT = this.camera.project(pStartTop, width, height);
            const projEBT = this.camera.project(pEndTop, width, height);

            if (projSB && projEB && projSBT && projEBT) {
                // Заливка щита
                const grad = this.ctx.createLinearGradient(projSBT.x, projSBT.y, projEBT.x, projEBT.y);
                if (isGoalReaction) {
                    grad.addColorStop(0, '#4a3c00');
                    grad.addColorStop(0.5, '#b8860b');
                    grad.addColorStop(1, '#4a3c00');
                } else {
                    grad.addColorStop(0, '#000814');
                    grad.addColorStop(0.5, '#001845');
                    grad.addColorStop(1, '#000814');
                }

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.moveTo(projSBT.x, projSBT.y);
                this.ctx.lineTo(projEBT.x, projEBT.y);
                this.ctx.lineTo(projEB.x, projEB.y);
                this.ctx.lineTo(projSB.x, projSB.y);
                this.ctx.closePath();
                this.ctx.fill();

                // Неонова рамка
                this.ctx.strokeStyle = adBorder;
                this.ctx.lineWidth = 2 * (projSBT.scale / 300);
                this.ctx.stroke();

                // Текст на щиті з прокруткою
                this.ctx.save();
                const midX = (projSBT.x + projEBT.x) / 2;
                const midY = (projSBT.y + projEBT.y + 10 * (projSBT.scale / 300)) / 2;
                this.ctx.translate(midX, midY);
                
                // Нахил під кутом перспективи
                const angle = Math.atan2(projEBT.y - projSBT.y, projEBT.x - projSBT.x);
                this.ctx.rotate(angle);

                // Ефект прокрутки тексту (маркер світлодіодного табло)
                const textScrollOffset = Math.sin((this.gameTime || 0) * 3) * 10;
                
                this.ctx.fillStyle = adColor;
                this.ctx.font = `bold ${Math.max(8, Math.round(10 * (projSBT.scale / 300)))}px Outfit`;
                this.ctx.textAlign = 'center';
                this.ctx.shadowBlur = isGoalReaction ? 15 : 8;
                this.ctx.shadowColor = adColor;
                this.ctx.fillText(currentAdText, textScrollOffset, 0);
                this.ctx.restore();
            }
        });

        this.goalNet.render(this.ctx, this.camera, width, height);

        // Малювання інтерактивних мішеней у створі воріт
        this.targets.forEach(target => {
            if (target.active) {
                const proj = this.camera.project(target.position, width, height);
                if (proj) {
                    const radius = TARGET_RADIUS * proj.scale;
                    
                    // Золотисте неонове коло
                    this.ctx.save();
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowColor = '#00ffcc';
                    
                    // Зовнішнє коло
                    this.ctx.strokeStyle = '#00ffcc';
                    this.ctx.lineWidth = 3.5 * (proj.scale / 300);
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
                    this.ctx.stroke();

                    // Друге коло
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 1.5 * (proj.scale / 300);
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y, radius * 0.65, 0, Math.PI * 2);
                    this.ctx.stroke();

                    // Червоний центр мішені
                    this.ctx.fillStyle = '#ff007f';
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y, radius * 0.3, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.restore();
                }
            }
        });

        const postLeftBase = new Vector3(-GOAL_WIDTH / 2, 0, 0);
        const postLeftTop = new Vector3(-GOAL_WIDTH / 2, GOAL_HEIGHT, 0);
        const postRightBase = new Vector3(GOAL_WIDTH / 2, 0, 0);
        const postRightTop = new Vector3(GOAL_WIDTH / 2, GOAL_HEIGHT, 0);

        const projLLBase = this.camera.project(postLeftBase, width, height);
        const projLLTop = this.camera.project(postLeftTop, width, height);
        const projRRBase = this.camera.project(postRightBase, width, height);
        const projRRTop = this.camera.project(postRightTop, width, height);

        if (projLLBase && projLLTop && projRRBase && projRRTop) {
            this.ctx.lineCap = 'round';
            this.ctx.strokeStyle = lvl.postColor;
            
            const postWidth = GOAL_POST_RADIUS * 2 * (projLLBase.scale);
            this.ctx.lineWidth = postWidth;

            this.ctx.beginPath();
            this.ctx.moveTo(projLLBase.x, projLLBase.y);
            this.ctx.lineTo(projLLTop.x, projLLTop.y);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(projRRBase.x, projRRBase.y);
            this.ctx.lineTo(projRRTop.x, projRRTop.y);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(projLLTop.x, projLLTop.y);
            this.ctx.lineTo(projRRTop.x, projRRTop.y);
            this.ctx.stroke();

            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
            this.ctx.lineWidth = postWidth * 0.4;
            this.ctx.beginPath();
            this.ctx.moveTo(projLLBase.x + postWidth * 0.1, projLLBase.y);
            this.ctx.lineTo(projLLTop.x + postWidth * 0.1, projLLTop.y);
            this.ctx.moveTo(projRRBase.x + postWidth * 0.1, projRRBase.y);
            this.ctx.lineTo(projRRTop.x + postWidth * 0.1, projRRTop.y);
            this.ctx.stroke();
        }

        if (this.gameState === 'aiming' || this.gameState === 'runup') {
            const aimWorld = new Vector3(gameControls.aimX, gameControls.aimY, 0);
            const aimProj = this.camera.project(aimWorld, width, height);

            if (aimProj) {
                const trajPoints = this.getTrajectoryPoints(width, height);
                if (trajPoints.length > 1) {
                    this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.15)';
                    this.ctx.lineWidth = 6;
                    this.ctx.beginPath();
                    this.ctx.moveTo(trajPoints[0].x, trajPoints[0].y);
                    for (let k = 1; k < trajPoints.length; k++) {
                        this.ctx.lineTo(trajPoints[k].x, trajPoints[k].y);
                    }
                    this.ctx.stroke();

                    this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.65)';
                    this.ctx.lineWidth = 2.5;
                    this.ctx.setLineDash([6, 8]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(trajPoints[0].x, trajPoints[0].y);
                    for (let k = 1; k < trajPoints.length; k++) {
                        this.ctx.lineTo(trajPoints[k].x, trajPoints[k].y);
                    }
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                }

                if (trajPoints.length > 0) {
                    const lastPt = trajPoints[trajPoints.length - 1];
                    
                    this.ctx.fillStyle = 'rgba(0, 255, 204, 0.25)';
                    this.ctx.beginPath();
                    this.ctx.arc(lastPt.x, lastPt.y, 9, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.fillStyle = '#00ffcc';
                    this.ctx.beginPath();
                    this.ctx.arc(lastPt.x, lastPt.y, 4.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                
                const aimRadius = 15 * (aimProj.scale / 300) + (gameControls.power * 0.2);
                this.ctx.arc(aimProj.x, aimProj.y, aimRadius, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(aimProj.x - 8, aimProj.y);
                this.ctx.lineTo(aimProj.x + 8, aimProj.y);
                this.ctx.moveTo(aimProj.x, aimProj.y - 8);
                this.ctx.lineTo(aimProj.x, aimProj.y + 8);
                this.ctx.stroke();
            }
        }

        if (this.ball.position.coordinateY > 0) {
            const shadowWorld = new Vector3(this.ball.position.coordinateX, 0.01, this.ball.position.coordinateZ);
            const shadowProj = this.camera.project(shadowWorld, width, height);
            if (shadowProj) {
                const radius = BALL_RADIUS * shadowProj.scale;
                const heightFactor = Math.max(0, 1.0 - (this.ball.position.coordinateY / 4.5));
                this.ctx.fillStyle = `rgba(5, 12, 5, ${0.45 * heightFactor})`;
                this.ctx.beginPath();
                this.ctx.arc(shadowProj.x, shadowProj.y, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        const renderQueue = [];
        
        renderQueue.push({
            depth: this.player.position.coordinateZ,
            render: () => this.player.render(this.ctx, this.camera, width, height)
        });

        renderQueue.push({
            depth: this.goalkeeper.position.coordinateZ,
            render: () => this.goalkeeper.render(this.ctx, this.camera, width, height)
        });

        const ballProj = this.camera.project(this.ball.position, width, height);
        if (ballProj) {
            renderQueue.push({
                depth: this.ball.position.coordinateZ,
                render: () => this.ball.render(this.ctx, ballProj.x, ballProj.y, ballProj.scale)
            });
        }

        gameVFX.render(this.ctx, this.camera, width, height);

        renderQueue.sort((a, b) => a.depth - b.depth);
        renderQueue.forEach(item => item.render());

        this.renderWindIndicator(width, height);
    }

    renderWindIndicator(width, height) {
        const indicatorX = width - 70;
        const indicatorY = 120;
        const maxRadius = 30;

        this.ctx.save();
        this.ctx.fillStyle = 'rgba(10, 10, 25, 0.6)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.arc(indicatorX, indicatorY, maxRadius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        const windSpeed = Math.sqrt(this.windX*this.windX + this.windZ*this.windZ);
        if (windSpeed > 0.1) {
            const angle = Math.atan2(this.windZ, this.windX);
            
            this.ctx.translate(indicatorX, indicatorY);
            this.ctx.rotate(angle);
            
            this.ctx.strokeStyle = '#00ffcc';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(-15, 0);
            this.ctx.lineTo(15, 0);
            this.ctx.lineTo(8, -5);
            this.ctx.moveTo(15, 0);
            this.ctx.lineTo(8, 5);
            this.ctx.stroke();
        }

        this.ctx.restore();
        
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ВІТЕР', indicatorX, indicatorY - 35);
        this.ctx.fillText(windSpeed.toFixed(1) + ' м/с', indicatorX, indicatorY + maxRadius + 15);
    }

    updateHUD() {
        document.getElementById('hud-goals').innerText = this.goalsCount;
        document.getElementById('hud-shots').innerText = this.shotsCount;
        document.getElementById('hud-streak').innerText = this.streakCount;
        
        const accuracy = this.shotsCount > 0 ? Math.round((this.goalsCount / this.shotsCount) * 100) : 0;
        document.getElementById('hud-accuracy').innerText = accuracy + '%';

        document.getElementById('hud-difficulty').innerText = this.goalkeeperAI.difficulty ? this.goalkeeperAI.difficulty.name : 'EASY';

        // Оновлюємо монетки в HUD
        const coinsEl = document.getElementById('hud-coins');
        if (coinsEl) coinsEl.innerText = this.coins;
    }

    loadStatsFromStorage() {
        this.totalShots = parseInt(safeStorage.getItem('pm_total_shots')) || 0;
        this.totalGoals = parseInt(safeStorage.getItem('pm_total_goals')) || 0;
        this.goalkeeperSaves = parseInt(safeStorage.getItem('pm_goalkeeper_saves')) || 0;
        this.maxStreak = parseInt(safeStorage.getItem('pm_max_streak')) || 0;
        this.postHits = parseInt(safeStorage.getItem('pm_post_hits')) || 0;

        const savedSound = safeStorage.getItem('pm_sound_effects');
        if (savedSound !== null) {
            const isSound = savedSound === 'true';
            gameAudio.soundEnabled = isSound;
            document.getElementById('setting-sound').checked = isSound;
        }

        const savedAmbient = safeStorage.getItem('pm_ambient');
        if (savedAmbient !== null) {
            const isAmbient = savedAmbient === 'true';
            gameAudio.ambientEnabled = isAmbient;
            document.getElementById('setting-ambient').checked = isAmbient;
        }

        const savedSlowMo = safeStorage.getItem('pm_slowmo');
        if (savedSlowMo !== null) {
            this.slowMoEnabled = savedSlowMo === 'true';
            document.getElementById('setting-slowmo').checked = this.slowMoEnabled;
        }

        this.coins = parseInt(safeStorage.getItem('pm_coins')) || 0;

        const savedDiff = safeStorage.getItem('pm_difficulty');
        if (savedDiff && DIFFICULTY_PRESETS[savedDiff]) {
            this.goalkeeperAI.setDifficulty(DIFFICULTY_PRESETS[savedDiff]);
        }
    }

    saveStatsToStorage() {
        safeStorage.setItem('pm_total_shots', this.totalShots);
        safeStorage.setItem('pm_total_goals', this.totalGoals);
        safeStorage.setItem('pm_goalkeeper_saves', this.goalkeeperSaves);
        safeStorage.setItem('pm_max_streak', this.maxStreak);
        safeStorage.setItem('pm_post_hits', this.postHits);
        safeStorage.setItem('pm_coins', this.coins);
    }

    resetAllStats() {
        this.totalShots = 0;
        this.totalGoals = 0;
        this.goalkeeperSaves = 0;
        this.maxStreak = 0;
        this.postHits = 0;
        
        this.shotsCount = 0;
        this.goalsCount = 0;
        this.streakCount = 0;

        this.saveStatsToStorage();
        this.updateHUD();
        this.populateStatsScreen();
    }

    populateStatsScreen() {
        document.getElementById('stat-total-shots').innerText = this.totalShots;
        document.getElementById('stat-total-goals').innerText = this.totalGoals;
        document.getElementById('stat-goalkeeper-saves').innerText = this.goalkeeperSaves;
        
        const accuracy = this.totalShots > 0 ? Math.round((this.totalGoals / this.totalShots) * 100) : 0;
        document.getElementById('stat-accuracy').innerText = accuracy + '%';
        
        document.getElementById('stat-max-streak').innerText = this.maxStreak;
        document.getElementById('stat-post-hits').innerText = this.postHits;
    }
}

let activeGameInstance = null;

/*
====================================================
UI SCREEN MANAGER & NAVIGATION
====================================================
*/
function showScreen(screenId) {
    document.querySelectorAll('.overlay-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    // Ховаємо Ultimate Team картку на будь-якому іншому екрані меню
    if (screenId !== 'hud-container') {
        const card = document.getElementById('ut-card-broadcast');
        if (card) card.className = 'ut-card-hidden';
    }
}

document.getElementById('btn-start-game').addEventListener('click', () => {
    gameAudio.init();
    
    showScreen('screen-main-menu');
    document.getElementById('screen-main-menu').classList.remove('active');
    document.getElementById('hud-container').classList.add('active');

    if (!activeGameInstance) {
        activeGameInstance = new PenaltyMasterGame();
        activeGameInstance.start();
    } else {
        activeGameInstance.resetShot();
    }
});

function togglePauseMenu() {
    if (activeGameInstance && activeGameInstance.gameState !== 'aiming' && activeGameInstance.gameState !== 'flight' && activeGameInstance.gameState !== 'result') return;

    const pauseScreen = document.getElementById('screen-pause');
    if (pauseScreen.classList.contains('active')) {
        pauseScreen.classList.remove('active');
    } else {
        pauseScreen.classList.add('active');
    }
}

document.getElementById('btn-resume-game').addEventListener('click', () => {
    document.getElementById('screen-pause').classList.remove('active');
});

document.getElementById('btn-restart-game').addEventListener('click', () => {
    document.getElementById('screen-pause').classList.remove('active');
    activeGameInstance.shotsCount = 0;
    activeGameInstance.goalsCount = 0;
    activeGameInstance.streakCount = 0;
    activeGameInstance.resetShot();
});

document.getElementById('btn-quit-main-menu').addEventListener('click', () => {
    document.getElementById('screen-pause').classList.remove('active');
    document.getElementById('hud-container').classList.remove('active');
    showScreen('screen-main-menu');
});

document.getElementById('btn-difficulty-menu').addEventListener('click', () => {
    showScreen('screen-difficulty');
});

document.getElementById('btn-stats-menu').addEventListener('click', () => {
    if (activeGameInstance) {
        activeGameInstance.populateStatsScreen();
    } else {
        const tempGame = new PenaltyMasterGame();
        tempGame.populateStatsScreen();
    }
    showScreen('screen-stats');
});

document.getElementById('btn-settings-menu').addEventListener('click', () => {
    showScreen('screen-settings');
});

document.getElementById('btn-instructions-menu').addEventListener('click', () => {
    showScreen('screen-instructions');
});

document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
        resetOnlineState(); // Скидаємо онлайн стан при виході в головне меню
        showScreen('screen-main-menu');
    });
});

/*
====================================================
SHOP MANAGEMENT SYSTEM
====================================================
*/
let shopCurrentTab = 'balls'; // 'balls' або 'boots'

function getPlayerCoins() {
    if (activeGameInstance) return activeGameInstance.coins;
    return parseInt(safeStorage.getItem('pm_coins')) || 0;
}

function addPlayerCoins(amount) {
    if (activeGameInstance) {
        activeGameInstance.coins += amount;
        activeGameInstance.saveStatsToStorage();
        activeGameInstance.updateHUD();
    } else {
        const c = (parseInt(safeStorage.getItem('pm_coins')) || 0) + amount;
        safeStorage.setItem('pm_coins', c);
    }
    updateShopCoinsDisplay();
}

function updateShopCoinsDisplay() {
    const balance = getPlayerCoins();
    document.getElementById('shop-coins-display').innerText = balance;
    const hudCoins = document.getElementById('hud-coins');
    if (hudCoins) hudCoins.innerText = balance;
}

function renderShopItems() {
    const container = document.getElementById('shop-items-container');
    container.innerHTML = '';

    const items = SHOP_ITEMS[shopCurrentTab];
    const ownedKey = shopCurrentTab === 'balls' ? 'pm_owned_balls' : 'pm_owned_boots';
    const equippedKey = shopCurrentTab === 'balls' ? 'pm_equipped_ball' : 'pm_equipped_boot';
    const defaultEquipped = shopCurrentTab === 'balls' ? 'classic' : 'black';

    // Отримуємо список куплених товарів
    let owned = JSON.parse(safeStorage.getItem(ownedKey));
    if (!owned || !Array.isArray(owned)) {
        owned = [defaultEquipped];
        safeStorage.setItem(ownedKey, JSON.stringify(owned));
    }

    const equipped = safeStorage.getItem(equippedKey) || defaultEquipped;

    items.forEach(item => {
        const isOwned = owned.includes(item.id);
        const isEquipped = equipped === item.id;

        const card = document.createElement('div');
        card.className = `shop-card ${isEquipped ? 'active' : ''}`;

        // Додаємо маленьке прев'ю скіна
        let previewHTML = '';
        if (shopCurrentTab === 'balls') {
            let ballStyle = `background: ${item.color};`;
            if (item.glowColor) {
                ballStyle += `box-shadow: 0 0 10px ${item.glowColor}; border-color: ${item.glowColor};`;
            }
            previewHTML = `<div class="shop-card-preview-ball" style="${ballStyle}"></div>`;
        } else {
            previewHTML = `<div class="shop-card-preview-boots" style="background: ${item.color};"></div>`;
        }

        let buttonText = 'Вибрати';
        let buttonStyle = 'border-color: var(--primary-glow);';
        
        if (isEquipped) {
            buttonText = 'Екіпіровано';
            buttonStyle = 'border-color: #ffd700; color: #ffd700; background: rgba(255,215,0,0.1);';
        } else if (!isOwned) {
            buttonText = `Купити: 🪙 ${item.price}`;
            buttonStyle = 'border-color: #ff9900; color: #ff9900;';
        }

        card.innerHTML = `
            <div class="shop-card-title">${item.name}</div>
            ${previewHTML}
            <button class="menu-button shop-buy-btn" data-id="${item.id}" style="margin: 5px 0 0 0; padding: 6px 12px; font-size: 0.85rem; ${buttonStyle}">${buttonText}</button>
        `;

        // Обробник кліку на покупку/вибір
        card.querySelector('.shop-buy-btn').addEventListener('click', () => {
            handleShopItemClick(item, isOwned, isEquipped, ownedKey, equippedKey);
        });

        container.appendChild(card);
    });
}

function handleShopItemClick(item, isOwned, isEquipped, ownedKey, equippedKey) {
    if (isEquipped) return;

    if (isOwned) {
        // Просто екіпіруємо
        safeStorage.setItem(equippedKey, item.id);
        renderShopItems();
        if (activeGameInstance) {
            activeGameInstance.updateHUD();
        }
    } else {
        // Покупка
        const coins = getPlayerCoins();
        if (coins >= item.price) {
            // Зменшуємо баланс
            if (activeGameInstance) {
                activeGameInstance.coins -= item.price;
                activeGameInstance.saveStatsToStorage();
                activeGameInstance.updateHUD();
            } else {
                safeStorage.setItem('pm_coins', coins - item.price);
            }

            // Додаємо в список куплених
            let owned = JSON.parse(safeStorage.getItem(ownedKey)) || [];
            owned.push(item.id);
            safeStorage.setItem(ownedKey, JSON.stringify(owned));

            // Автоматично екіпіруємо
            safeStorage.setItem(equippedKey, item.id);

            updateShopCoinsDisplay();
            renderShopItems();
            gameAudio.playGoalCheer(); // Звук успішної покупки
        } else {
            alert('Недостатньо монет! Забивайте голи та збивайте мішені, щоб заробити більше.');
        }
    }
}

document.getElementById('btn-shop-menu').addEventListener('click', () => {
    gameAudio.init();
    updateShopCoinsDisplay();
    renderShopItems();
    showScreen('screen-shop');
});

document.getElementById('tab-shop-balls').addEventListener('click', (e) => {
    shopCurrentTab = 'balls';
    document.getElementById('tab-shop-balls').style.borderColor = 'var(--primary-glow)';
    document.getElementById('tab-shop-balls').style.background = 'rgba(0, 255, 204, 0.1)';
    document.getElementById('tab-shop-boots').style.borderColor = 'rgba(255,255,255,0.2)';
    document.getElementById('tab-shop-boots').style.background = 'transparent';
    renderShopItems();
});

document.getElementById('tab-shop-boots').addEventListener('click', (e) => {
    shopCurrentTab = 'boots';
    document.getElementById('tab-shop-boots').style.borderColor = 'var(--primary-glow)';
    document.getElementById('tab-shop-boots').style.background = 'rgba(0, 255, 204, 0.1)';
    document.getElementById('tab-shop-balls').style.borderColor = 'rgba(255,255,255,0.2)';
    document.getElementById('tab-shop-balls').style.background = 'transparent';
    renderShopItems();
});

/*
====================================================
TEAM SELECT LOGIC (EA SPORTS FC 26)
====================================================
*/
let selectedClubId = safeStorage.getItem('pm_selected_club') || 'real';

function renderClubSelectionList() {
    const container = document.getElementById('club-list-container');
    container.innerHTML = '';

    CLUB_PRESETS.forEach(club => {
        const item = document.createElement('div');
        const isActive = club.id === selectedClubId;
        item.className = `club-select-item ${isActive ? 'active' : ''}`;
        item.setAttribute('data-id', club.id);

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span class="club-logo-tag">${club.logo}</span>
                <span style="font-weight: 700; font-size: 1.1rem;">${club.name}</span>
            </div>
            <div style="width: 15px; height: 15px; border-radius: 50%; background: ${club.color}; border: 1.5px solid #fff;"></div>
        `;

        item.addEventListener('click', () => {
            document.querySelectorAll('.club-select-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            selectedClubId = club.id;
        });

        container.appendChild(item);
    });
}

document.getElementById('btn-team-select-menu').addEventListener('click', () => {
    gameAudio.init();
    selectedClubId = safeStorage.getItem('pm_selected_club') || 'real';
    renderClubSelectionList();
    showScreen('screen-team-select');
});

document.getElementById('btn-confirm-team').addEventListener('click', () => {
    safeStorage.setItem('pm_selected_club', selectedClubId);
    
    // Оновлюємо форму діючого гравця, якщо гра запущена
    if (activeGameInstance) {
        const activeClub = CLUB_PRESETS.find(c => c.id === selectedClubId);
        if (activeClub) {
            activeGameInstance.player.jerseyColor = activeClub.color;
            activeGameInstance.player.shortsColor = activeClub.shortColor;
            activeGameInstance.player.socksColor = activeClub.sockColor;
        }
    }
    
    showScreen('screen-main-menu');
});

/*
====================================================
CARD COLLECTION & PACK OPENINGS (EA SPORTS FC 26 UT)
====================================================
*/
function getOwnedCards() {
    let cards = JSON.parse(safeStorage.getItem('pm_owned_cards'));
    if (!cards || !Array.isArray(cards)) {
        cards = ['c_palazhchenko']; // Початкова безкоштовна картка
        safeStorage.setItem('pm_owned_cards', JSON.stringify(cards));
    }
    return cards;
}

function saveOwnedCards(cardsArray) {
    safeStorage.setItem('pm_owned_cards', JSON.stringify(cardsArray));
}

function renderCollectionDeck() {
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    const owned = getOwnedCards();
    const currentClubId = safeStorage.getItem('pm_selected_club') || 'real';
    const activeClub = CLUB_PRESETS.find(c => c.id === currentClubId);
    const activeClubLogo = activeClub ? activeClub.logo : '';

    CARD_DATABASE.forEach(card => {
        const isOwned = owned.includes(card.id);
        
        // Розраховуємо хімію (якщо логотипи/клуби картки збігаються з обраним клубом)
        const chemMatch = card.logo === activeClubLogo;
        const chemistryStars = chemMatch ? '⭐⭐⭐' : '⭐';

        const cardEl = document.createElement('div');
        cardEl.className = `ut-card-collectible ut-card-${card.rarity} ${isOwned ? '' : 'locked'}`;

        cardEl.innerHTML = `
            <div style="font-size: 0.5rem; font-weight: 800; opacity: 0.7; display: flex; justify-content: space-between; width: 100%;">
                <span>UT 26</span>
                <span style="color: #ffd700;">${isOwned ? chemistryStars : ''}</span>
            </div>
            <div class="collectible-rating">${card.rating}</div>
            <div class="collectible-pos">${card.pos}</div>
            <div class="collectible-name">${card.name}</div>
            <div class="collectible-logo">${card.logo}</div>
            <div class="collectible-stats">
                <div>PAC <span>${card.pac}</span></div>
                <div>SHO <span>${card.sho}</span></div>
                <div>PAS <span>${card.pas}</span></div>
                <div>DRI <span>${card.dri}</span></div>
                <div>DEF <span>${card.def}</span></div>
                <div>PHY <span>${card.phy}</span></div>
            </div>
        `;

        grid.appendChild(cardEl);
    });
}

function triggerPackOpening() {
    // Обираємо випадкову картку з бази даних
    // Ймовірність: легендарні випадають рідше!
    const roll = Math.random();
    let selectedRarity = 'bronze';
    if (roll < 0.05) selectedRarity = 'legendary'; // 5%
    else if (roll < 0.20) selectedRarity = 'gold'; // 15%
    else if (roll < 0.55) selectedRarity = 'silver'; // 35%

    const filteredPool = CARD_DATABASE.filter(c => c.rarity === selectedRarity);
    const rewardCard = filteredPool[Math.floor(Math.random() * filteredPool.length)] || CARD_DATABASE[0];

    // Додаємо картку в список куплених, якщо її ще немає
    let owned = getOwnedCards();
    if (!owned.includes(rewardCard.id)) {
        owned.push(rewardCard.id);
        saveOwnedCards(owned);
    }

    // Відображаємо картку в оверлеї
    const holder = document.getElementById('pack-card-holder');
    holder.innerHTML = '';

    const cardEl = document.createElement('div');
    cardEl.className = `ut-card-collectible ut-card-${rewardCard.rarity} pack-reveal-anim`;
    cardEl.style.width = '170px';
    cardEl.style.height = '250px';
    cardEl.style.fontSize = '0.95rem';

    cardEl.innerHTML = `
        <div style="font-size: 0.6rem; font-weight: 800; opacity: 0.7;">UT 26</div>
        <div class="collectible-rating" style="font-size: 2.1rem;">${rewardCard.rating}</div>
        <div class="collectible-pos" style="font-size: 0.75rem;">${rewardCard.pos}</div>
        <div class="collectible-name" style="font-size: 1.05rem; margin-top: 15px;">${rewardCard.name}</div>
        <div class="collectible-logo" style="font-size: 1.6rem; margin: 8px 0;">${rewardCard.logo}</div>
        <div class="collectible-stats" style="font-size: 0.65rem; border-top: 1px solid rgba(0,0,0,0.15); padding-top: 8px; width: 90%;">
            <div>PAC <span>${rewardCard.pac}</span></div>
            <div>SHO <span>${rewardCard.sho}</span></div>
            <div>PAS <span>${rewardCard.pas}</span></div>
            <div>DRI <span>${rewardCard.dri}</span></div>
            <div>DEF <span>${rewardCard.def}</span></div>
            <div>PHY <span>${rewardCard.phy}</span></div>
        </div>
    `;

    holder.appendChild(cardEl);

    // Звуки та ефекти вибуху залежно від цінності
    if (rewardCard.rarity === 'legendary') {
        gameAudio.playGoalCheer();
        gameVFX.spawnConfettiRain(new Vector3(0, 0, 0));
    } else if (rewardCard.rarity === 'gold') {
        gameAudio.playGoalCheer();
    } else {
        gameAudio.playWhistle();
    }

    showScreen('screen-pack-opening');
}

document.getElementById('btn-collection-menu').addEventListener('click', () => {
    gameAudio.init();
    renderCollectionDeck();
    showScreen('screen-collection');
});

document.getElementById('btn-close-pack').addEventListener('click', () => {
    showScreen('screen-main-menu');
});

// MULTIPLAYER INTERACTIVE BINDINGS
document.getElementById('btn-online-menu').addEventListener('click', () => {
    gameAudio.init();
    resetOnlineState();
    showScreen('screen-online-lobby');
});

document.getElementById('btn-host-room').addEventListener('click', () => {
    hostRoom();
});

document.getElementById('btn-join-room').addEventListener('click', () => {
    joinRoom();
});

document.getElementById('btn-role-striker').addEventListener('click', () => {
    selectRole('striker');
});

document.getElementById('btn-role-keeper').addEventListener('click', () => {
    selectRole('keeper');
});

// Додаємо обробку кліків на швидкі публічні лобі
document.querySelectorAll('.btn-quick-lobby').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const lobbyCode = e.target.getAttribute('data-lobby');
        connectToQuickLobby(lobbyCode);
    });
});

const setDifficultyPreset = (diffName) => {
    const preset = DIFFICULTY_PRESETS[diffName];
    safeStorage.setItem('pm_difficulty', diffName);
    if (activeGameInstance) {
        activeGameInstance.goalkeeperAI.setDifficulty(preset);
        activeGameInstance.updateHUD();
    }
    showScreen('screen-main-menu');
};

document.getElementById('btn-diff-easy').addEventListener('click', () => setDifficultyPreset('EASY'));
document.getElementById('btn-diff-medium').addEventListener('click', () => setDifficultyPreset('MEDIUM'));
document.getElementById('btn-diff-hard').addEventListener('click', () => setDifficultyPreset('HARD'));
document.getElementById('btn-diff-legend').addEventListener('click', () => setDifficultyPreset('LEGEND'));

document.getElementById('btn-reset-stats').addEventListener('click', () => {
    if (confirm('Ви впевнені, що хочете скинути всю статистику?')) {
        if (activeGameInstance) {
            activeGameInstance.resetAllStats();
        } else {
            const temp = new PenaltyMasterGame();
            temp.resetAllStats();
        }
    }
});

document.getElementById('setting-sound').addEventListener('change', (e) => {
    gameAudio.setSoundEnabled(e.target.checked);
    safeStorage.setItem('pm_sound_effects', e.target.checked);
});

document.getElementById('setting-sound').checked = gameAudio.soundEnabled;

document.getElementById('setting-ambient').addEventListener('change', (e) => {
    gameAudio.setAmbientEnabled(e.target.checked);
    safeStorage.setItem('pm_ambient', e.target.checked);
});

document.getElementById('setting-slowmo').addEventListener('change', (e) => {
    if (activeGameInstance) activeGameInstance.slowMoEnabled = e.target.checked;
    safeStorage.setItem('pm_slowmo', e.target.checked);
});

document.getElementById('btn-toggle-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.log('Помилка повного екрану: ' + err.message);
        });
    } else {
        document.exitFullscreen();
    }
});

/*
====================================================
CANVAS RESIZER & BOOTSTRAP
====================================================
*/
const targetCanvas = document.getElementById('game-canvas');

function resizeGameCanvas() {
    targetCanvas.width = window.innerWidth;
    targetCanvas.height = window.innerHeight;
    if (activeGameInstance) {
        activeGameInstance.render();
    }
}

window.addEventListener('resize', resizeGameCanvas);
resizeGameCanvas();

window.addEventListener('click', () => {
    gameAudio.init();
}, { once: false });
