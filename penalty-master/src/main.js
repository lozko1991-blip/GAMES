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

        // Touch aiming directly on the game canvas
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            let isTouching = false;
            
            const handleTouchAim = (touchX, touchY) => {
                const rect = canvas.getBoundingClientRect();
                const relativeX = (touchX - rect.left) / rect.width;
                const relativeY = (touchY - rect.top) / rect.height;
                
                // Map relative touch coordinates [0..1] to wider aiming bounds
                this.aimX = (relativeX - 0.5) * 14.5;
                this.aimY = (1.0 - relativeY) * 4.6;
                
                this.aimX = Math.max(-6.46, Math.min(6.46, this.aimX));
                this.aimY = Math.max(0.05, Math.min(4.24, this.aimY));
            };

            canvas.addEventListener('touchstart', (e) => {
                const state = activeGameInstance ? activeGameInstance.gameState : '';
                if (state === 'aiming' || state === 'runup') {
                    isTouching = true;
                    const touch = e.touches[0];
                    handleTouchAim(touch.clientX, touch.clientY);
                    if (e.cancelable) e.preventDefault();
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                if (isTouching) {
                    const touch = e.touches[0];
                    handleTouchAim(touch.clientX, touch.clientY);
                    if (e.cancelable) e.preventDefault();
                }
            }, { passive: false });

            canvas.addEventListener('touchend', () => {
                isTouching = false;
            });
        }
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
            let shoStat = 75;
            try {
                const equippedCardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';
                const activeCard = CARD_DATABASE.find(c => c.id === equippedCardId);
                if (activeCard) shoStat = activeCard.sho;
            } catch (e) {
                console.warn('Error reading SHO stat: ', e);
            }

            // Зчитуємо вплив кепки на точність прицілювання (aiming sway reduction)
            let capSwayReduction = 0.0;
            try {
                const equippedCap = safeStorage.getItem('pm_equipped_cap') || 'none';
                if (equippedCap === 'cap_forward') capSwayReduction = 0.05;
                else if (equippedCap === 'cap_backward') capSwayReduction = 0.10;
                else if (equippedCap === 'crown') capSwayReduction = 0.20;
            } catch (e) {
                console.warn('Error reading equipped cap sway: ', e);
            }

            // Розраховуємо силу коливання прицілу (sway) залежно від точності гравця
            let swayAmplitude = Math.max(0.01, 1.25 * (1.0 - shoStat / 100));
            swayAmplitude *= (1.0 - capSwayReduction);

            const swaySpeed = Math.max(0.4, 3.2 * (1.0 - shoStat / 100));
            const time = performance.now() * 0.001 * swaySpeed;

            // Додаємо постійне коливання (коли гравець утримує або не утримує приціл)
            this.aimX += Math.sin(time * 2.0) * swayAmplitude * deltaTime;
            this.aimY += Math.cos(time * 1.6) * swayAmplitude * 0.7 * deltaTime;

            if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
                this.aimX = Math.max(-GOAL_WIDTH/2 - 2.8, this.aimX - aimSpeed * deltaTime);
                this.sideSpin = Math.max(-1.0, this.sideSpin - 1.5 * deltaTime);
            }
            if (this.keys['ArrowRight'] || this.keys['KeyD']) {
                this.aimX = Math.min(GOAL_WIDTH/2 + 2.8, this.aimX + aimSpeed * deltaTime);
                this.sideSpin = Math.min(1.0, this.sideSpin + 1.5 * deltaTime);
            }
            if (this.keys['ArrowUp'] || this.keys['KeyW']) {
                this.aimY = Math.min(GOAL_HEIGHT + 1.8, this.aimY + aimSpeed * 0.8 * deltaTime);
                this.topSpin = Math.max(-1.0, this.topSpin - 1.2 * deltaTime);
            }
            if (this.keys['ArrowDown'] || this.keys['KeyS']) {
                this.aimY = Math.max(0.05, this.aimY - aimSpeed * 0.8 * deltaTime);
                this.topSpin = Math.min(1.0, this.topSpin + 1.2 * deltaTime);
            }

            // Надійно лімітуємо координати прицілювання (розширені межі для об'єктів біля воріт)
            this.aimX = Math.max(-GOAL_WIDTH/2 - 2.8, Math.min(GOAL_WIDTH/2 + 2.8, this.aimX));
            this.aimY = Math.max(0.05, Math.min(GOAL_HEIGHT + 1.8, this.aimY));
        }

        // Керуємо стартовим офсетом зміщення гравця за допомогою Q / E (для уникнення конфліктів з прицілюванням)
        if (gameState === 'aiming' && this.power === 0) {
            if (this.keys['KeyQ']) {
                this.playerStartingOffsetX = Math.max(-2.5, this.playerStartingOffsetX - 2.5 * deltaTime);
            }
            if (this.keys['KeyE']) {
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

        // Спеціальні інтерактивні об'єкти біля воріт (збільшені нагороди за влучання, підтримка фізики)
        this.customTargets = [
            { id: 'dartboard', name: 'Мішень-Дартс', position: new Vector3(5.2, 1.6, -0.8), originPos: new Vector3(5.2, 1.6, -0.8), radius: 0.8, active: true, hitState: null, hitRotation: 0, hitVelocity: new Vector3(0,0,0), hitAngularVelocity: 0 },
            { id: 'dummy', name: 'Манекен', position: new Vector3(-5.0, 0.9, -0.2), originPos: new Vector3(-5.0, 0.9, -0.2), radius: 0.5, active: true, hitState: null, hitRotation: 0, hitVelocity: new Vector3(0,0,0), hitAngularVelocity: 0 },
            { id: 'photographer', name: 'Фотограф', position: new Vector3(-4.5, 0.5, -2.5), originPos: new Vector3(-4.5, 0.5, -2.5), radius: 0.6, active: true, hitState: null, hitRotation: 0, hitVelocity: new Vector3(0,0,0), hitAngularVelocity: 0 }
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
        const selectedClub = safeStorage.getItem('pm_selected_club') || 'polissya';
        const activeClub = CLUB_PRESETS.find(c => c.id === selectedClub);
        if (activeClub) {
            this.player.jerseyColor = activeClub.color;
            this.player.shortsColor = activeClub.shortColor;
            this.player.socksColor = activeClub.sockColor;
        }

        // Перезаписуємо форму кастомним кітом, якщо екіпірований
        const equippedKitId = safeStorage.getItem('pm_equipped_kit') || 'default';
        if (equippedKitId !== 'default') {
            const kit = SHOP_ITEMS.kits.find(k => k.id === equippedKitId);
            if (kit) {
                this.player.jerseyColor = kit.jersey;
                this.player.shortsColor = kit.shorts;
                this.player.socksColor = kit.socks;
            }
        }

        // Перезаписуємо ім'я гравця на купленого/екіпірованого з Ultimate Team
        const equippedCardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';
        const activeCard = CARD_DATABASE.find(c => c.id === equippedCardId);
        if (activeCard) {
            lvl.playerName = activeCard.name;
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

            // Адаптивний оптимізатор продуктивності під слабкі ноутбуки
            if (this.fps < 45) {
                // Якщо лагає - зменшуємо максимальну кількість часток вдвічі для плавності
                gameVFX.maxParticlesScale = 0.5;
            } else {
                gameVFX.maxParticlesScale = 1.0;
            }
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

        // Фізичне оновлення збитих мішеней (падання, обертання під дією сили тяжіння)
        if (this.customTargets) {
            this.customTargets.forEach(target => {
                if (target.hitState) {
                    target.position.coordinateX += target.hitVelocity.coordinateX * scaledDeltaTime;
                    target.position.coordinateY += target.hitVelocity.coordinateY * scaledDeltaTime;
                    target.position.coordinateZ += target.hitVelocity.coordinateZ * scaledDeltaTime;
                    
                    target.hitVelocity.coordinateY -= 9.8 * scaledDeltaTime; // сила тяжіння
                    target.hitRotation += target.hitAngularVelocity * scaledDeltaTime;
                    
                    if (target.position.coordinateY < 0.05) {
                        target.position.coordinateY = 0.05;
                        target.hitVelocity.set(0, 0, 0);
                        target.hitAngularVelocity = 0;
                        // Залишаємо лежати
                    }
                }
            });
        }

        switch(this.gameState) {
            case 'aiming': {
                const startZ = PENALTY_SPOT_Z + 2.8;
                const startX = gameControls.playerStartingOffsetX;
                this.player.position.set(startX, 0, startZ);
                this.player.headingAngle = Math.atan2(-startX, -3.0);
                this.player.setPose('idle');

                if (!multiplayerState.isOnline) {
                    this.goalkeeper.setPose('goalkeeper_bounce');
                }

                if (multiplayerState.isOnline && multiplayerState.role === 'keeper') {
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

                if (gameControls.keys['KeyF'] && (multiplayerState.role !== 'keeper')) {
                    this.gameState = 'fake_swing';
                    this.runupProgress = 0;
                    this.player.setPose('fake_kick');
                    if (multiplayerState.isOnline) {
                        sendNetData({ type: 'keeper_antic', pose: 'fake_kick' });
                    }
                    if (!multiplayerState.isOnline) {
                        setTimeout(() => { this.goalkeeperAI.onBallKicked(this.ball); }, 150);
                    }
                }

                if (!gameControls.isChargingPower && gameControls.power > 5) {
                    if (multiplayerState.isOnline && multiplayerState.role === 'keeper') {
                        // Воротар очікує удар
                    } else {
                        this.gameState = 'runup';
                        this.runupProgress = 0;
                        gameAudio.playWhistle();
                        const card = document.getElementById('ut-card-broadcast');
                        if (card) card.className = 'ut-card-hidden';
                    }
                } else if (multiplayerState.isOnline && multiplayerState.role === 'striker') {
                    sendNetData({ type: 'sync_aim', aimX: gameControls.aimX, aimY: gameControls.aimY, power: gameControls.power });
                }
                break;
            }

            case 'fake_swing': {
                this.runupProgress += scaledDeltaTime * 4.0;
                if (this.runupProgress >= 1.0) {
                    this.gameState = 'aiming';
                    this.runupProgress = 0;
                    gameControls.reset();
                }
                break;
            }

            case 'runup': {
                this.player.setPose('run');
                
                let pacStat = 75;
                try {
                    const equippedCardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';
                    const activeCard = CARD_DATABASE.find(c => c.id === equippedCardId);
                    if (activeCard) pacStat = activeCard.pac;
                } catch (e) {
                    console.warn('Error reading PAC stat: ', e);
                }
                const runSpeed = 3.6 + (pacStat / 100) * 2.0; // від 3.6 до 5.6
                
                const distanceVector = new Vector3(0, 0, PENALTY_SPOT_Z).subtract(this.player.position);
                const distanceVal = distanceVector.length();

                if (distanceVal > 0.42) {
                    const runDir = distanceVector.normalize();
                    this.player.position = this.player.position.add(runDir.scale(runSpeed * scaledDeltaTime));
                    if (Math.random() < 0.15) {
                        this.pitchStains.push({ position: this.player.position.clone(), radius: 0.05 + Math.random() * 0.05 });
                        if (this.pitchStains.length > 40) this.pitchStains.shift();
                    }
                } else {
                    this.gameState = 'kick';
                    this.player.setPose('kick_swing');
                    this.runupProgress = 0;
                }
                break;
            }

            case 'kick': {
                this.runupProgress += scaledDeltaTime * 4.0;
                this.player.setPose('kick_strike');

                const slideVector = new Vector3(0, 0, -1.2);
                this.player.position = this.player.position.add(slideVector.scale(scaledDeltaTime));

                if (this.runupProgress >= 1.0) {
                    const angleX = Math.atan2(gameControls.aimX, PENALTY_SPOT_Z);
                    const angleY = Math.atan2(gameControls.aimY - BALL_RADIUS, PENALTY_SPOT_Z);

                    let powerMultiplier = 1.0;
                    if (gameControls.keys['ShiftLeft']) powerMultiplier = 1.22;

                    let adjustedAimY = angleY;
                    if (gameControls.keys['ControlLeft']) {
                        adjustedAimY = 0.01;
                        powerMultiplier *= 0.9;
                    }

                    let pasStat = 75;
                    let shoStat = 75;
                    try {
                        const equippedCardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';
                        const activeCard = CARD_DATABASE.find(c => c.id === equippedCardId);
                        if (activeCard) {
                            pasStat = activeCard.pas;
                            shoStat = activeCard.sho;
                        }
                    } catch (e) {
                        console.warn('Error reading stats for kick: ', e);
                    }

                    const sideSpinMult = 0.5 + (pasStat / 100) * 0.7;
                    const topSpinMult = 0.5 + (pasStat / 100) * 0.7;
                    const statsPowerMultiplier = 0.95 + (shoStat / 100) * 0.15;

                    const finalPower = gameControls.power * powerMultiplier * statsPowerMultiplier;
                    this.ball.kick(
                        finalPower, 
                        angleX, 
                        adjustedAimY, 
                        gameControls.sideSpin * sideSpinMult, 
                        gameControls.topSpin * topSpinMult
                    );

                    if (multiplayerState.isOnline && multiplayerState.role === 'striker') {
                        sendNetData({ type: 'kick', power: gameControls.power, aimX: gameControls.aimX, aimY: gameControls.aimY, sideSpin: gameControls.sideSpin, topSpin: gameControls.topSpin });
                    }

                    this._roundEnded = false; // скидаємо захист від подвійного тригера
                    this.goalkeeperAI.onBallKicked(this.ball);
                    this.gameState = 'flight';
                    this._flightTimer = 0;
                    this.runupProgress = 0;
                }
                break;
            }

            case 'flight': {
                this.runupProgress += scaledDeltaTime;
                this.player.setPose(this.runupProgress < 0.4 ? 'kick_strike' : 'idle');
                this.trackCameraToBall(scaledDeltaTime);

                const isLocalOrStriker = !multiplayerState.isOnline || multiplayerState.role === 'striker';
                const saveResult = (isLocalOrStriker && !this._roundEnded) ? this.goalkeeperAI.checkSaveCollision(this.ball) : null;
                if (saveResult) {
                    this._roundEnded = true;
                    this.gameState = 'result';
                    this.timeScale = 1.0;

                    if (saveResult.type === 'save') {
                        this.ball.velocity.set(0, 0, 0);
                        this.ball.angularVelocity.set(0, 0, 0);
                        this.ball.isStatic = true;
                        this.goalkeeper.setPose('idle');
                        this.pitchStains.push({ position: this.goalkeeper.position.clone(), radius: 0.16 + Math.random() * 0.08 });
                        gameAudio.playKeeperSave();
                        this.triggerShotResult(false, 'СЕЙВ ВОРОТАРЯ!');
                    } else {
                        const n  = saveResult.contactNormal;
                        const kv = saveResult.keeperVel;
                        const bv = this.ball.velocity;
                        const relVelDotN = (bv.coordinateX - kv.coordinateX) * n.coordinateX + (bv.coordinateY - kv.coordinateY) * n.coordinateY + (bv.coordinateZ - kv.coordinateZ) * n.coordinateZ;
                        const restitution = 0.72;
                        const impulseMag = -(1.0 + restitution) * relVelDotN;
                        const newVelX = bv.coordinateX + impulseMag * n.coordinateX + kv.coordinateX * 0.45;
                        const newVelY = bv.coordinateY + impulseMag * n.coordinateY + Math.abs(kv.coordinateY) * 0.3 + 1.5;
                        const newVelZ = -(Math.abs(bv.coordinateZ) * restitution + 2.0);
                        this.ball.velocity = new Vector3(newVelX, newVelY, newVelZ);
                        this.ball.angularVelocity = new Vector3((Math.random() - 0.5) * 8.0, kv.coordinateX * -0.4, (Math.random() - 0.5) * 4.0);
                        gameAudio.playKeeperSave();
                        this.triggerShotResult(false, 'ВІДБИТО!');
                    }
                    break;
                }

                // Мішені у кутах воріт
                if (isLocalOrStriker && !this.ball.didHitTarget && this.ball.position.coordinateZ <= 0.8 && this.ball.position.coordinateZ >= -0.2) {
                    this.targets.forEach(target => {
                        if (target.active) {
                            const dv = this.ball.position.subtract(target.position);
                            const d2 = Math.sqrt(dv.coordinateX*dv.coordinateX + dv.coordinateY*dv.coordinateY);
                            if (d2 < (TARGET_RADIUS + BALL_RADIUS)) {
                                target.active = false;
                                this.ball.didHitTarget = true;
                                this.targetHits++;
                                gameAudio.playGoalCheer();
                                gameVFX.spawnTargetHitExplosion(target.position);
                                this.camera.triggerShake(0.85);
                            }
                        }
                    });
                }

                // Спеціальні цілі біля воріт (Дартс, Манекен, Фотограф)
                if (isLocalOrStriker && !this.ball.didHitTarget && this.customTargets) {
                    this.customTargets.forEach(target => {
                        if (target.active) {
                            const dv = this.ball.position.subtract(target.position);
                            const distance = dv.length();
                            if (distance < (target.radius + BALL_RADIUS)) {
                                target.active = false;
                                this.ball.didHitTarget = true;
                                gameVFX.spawnTargetHitExplosion(target.position);
                                this.camera.triggerShake(1.2);

                                // Надаємо фізичного імпульсу від удару м'яча
                                target.hitState = target.id === 'dartboard' ? 'spinning' : 'falling';
                                target.hitVelocity = new Vector3(
                                    this.ball.velocity.coordinateX * (target.id === 'dummy' ? 0.35 : 0.18),
                                    6.5 + Math.random() * 2.5,
                                    this.ball.velocity.coordinateZ * 0.18
                                );
                                target.hitAngularVelocity = target.id === 'dartboard' ? 22.0 : (target.id === 'photographer' ? -4.5 : 6.0);

                                if (target.id === 'dummy') {
                                    gameAudio.playNetRustle();
                                    this.coins += 50;
                                    this.saveStatsToStorage();
                                    this.updateHUD();
                                    this.showCustomHitText("МАНЕКЕН ЗБИТО! 🎯 +50 МОНЕТ", '#ff6600');
                                } else if (target.id === 'photographer') {
                                    gameAudio.playKeeperSave();
                                    this.coins += 75;
                                    this.saveStatsToStorage();
                                    this.updateHUD();
                                    this.showCustomHitText("ФОТОГРАФ В ШОЦІ! 📸 +75 МОНЕТ", '#00ccff');
                                } else if (target.id === 'dartboard') {
                                    const distCenter = Math.hypot(dv.coordinateX, dv.coordinateY);
                                    let dartCoins = 25;
                                    let dartTitle = "ДАРТС! 🎯 +25 МОНЕТ";
                                    
                                    if (distCenter < 0.18) {
                                        dartCoins = 100;
                                        dartTitle = "БУЛЛС-АЙ! 🎯 +100 МОНЕТ";
                                    } else if (distCenter < 0.45) {
                                        dartCoins = 50;
                                        dartTitle = "ДАРТС: ЦЕНТР! 🎯 +50 МОНЕТ";
                                    }
                                    
                                    this.coins += dartCoins;
                                    this.saveStatsToStorage();
                                    this.updateHUD();
                                    this.showCustomHitText(dartTitle, '#ffd700');
                                    gameAudio.playGoalCheer();
                                }
                            }
                        }
                    });
                }

                if (isLocalOrStriker) {
                    const bx = this.ball.position.coordinateX;
                    const by = this.ball.position.coordinateY;
                    const bz = this.ball.position.coordinateZ;

                    // ГОЛ
                    if (bz <= 0.05 && bz >= -0.2) {
                        const inGoalX = Math.abs(bx) < (GOAL_WIDTH / 2 - 0.03);
                        const inGoalY = by < (GOAL_HEIGHT - 0.03) && by > 0.05;
                        if (inGoalX && inGoalY) {
                            this._roundEnded = true;
                            this.gameState = 'result';
                            this.timeScale = 1.0;
                            this.ball.velocity = this.ball.velocity.scale(0.12);
                            this.ball.angularVelocity = this.ball.angularVelocity.scale(0.1);
                            gameAudio.playNetRustle();
                            gameAudio.playGoalCheer();
                            gameVFX.spawnConfettiRain(this.ball.position);
                            this.triggerShotResult(true, 'Лозко молодець');
                            break;
                        }
                    }

                    // ПРОМАХ / ВИЙШОВ ЗА ПОЛЕ
                    this._flightTimer = (this._flightTimer || 0) + scaledDeltaTime;
                    const missedGoal      = bz < -0.3;
                    const wideOrHigh      = Math.abs(bx) > GOAL_WIDTH / 2 + 1.8 || by > GOAL_HEIGHT + 1.2;
                    const towardCamera    = bz > 12.0;
                    const stoppedOnGround = by <= BALL_RADIUS + 0.05 && this.ball.velocity.length() < 0.5 && bz > 1.5;
                    const timeout         = this._flightTimer > 6.0;

                    if (missedGoal || wideOrHigh || towardCamera || stoppedOnGround || timeout) {
                        this._roundEnded = true;
                        this.gameState = 'result';
                        this.timeScale = 1.0;
                        this._flightTimer = 0;
                        gameAudio.playMissGroan();
                        this.triggerShotResult(false, 'Палажченко гуска');
                    }
                }

                if (this.slowMoEnabled && this.ball.position.coordinateZ < 3.2 && this.ball.position.coordinateZ > 0.4) {
                    this.timeScale = 0.25;
                } else if (this.gameState === 'flight') {
                    this.timeScale = 1.0;
                }
                break;
            }

            case 'result': {
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

            case 'matrix_headshot_cutscene': {
                this.matrixTimer = (this.matrixTimer || 0) + scaledDeltaTime;
                this.matrixOrbitAngle = (this.matrixOrbitAngle || 0) + scaledDeltaTime * 0.35;

                const targetX = 0;
                const targetY = 1.25;
                const targetZ = 0.0;
                const orbitRadius = 4.5;
                
                // Обертання камери навколо воротаря в стилі Матриці (bullet-time)
                this.camera.position.set(
                    targetX + Math.sin(this.matrixOrbitAngle) * orbitRadius,
                    targetY + 0.45 * Math.sin(this.matrixOrbitAngle * 1.5) + 0.2,
                    targetZ + Math.cos(this.matrixOrbitAngle) * orbitRadius
                );
                this.camera.target.set(targetX, targetY, targetZ);

                if (this.matrixTimer < 1.0) {
                    const progress = Math.min(1.0, this.matrixTimer / 1.0);
                    // Траєкторія м'яча прямо в голову воротарю
                    this.ball.position.coordinateX = 0;
                    this.ball.position.coordinateY = 0.11 + progress * (1.58 - 0.11) + Math.sin(progress * Math.PI) * 0.8;
                    this.ball.position.coordinateZ = 11.0 - progress * 11.0;
                    this.ball.velocity.set(0, 0, -11.0);
                    this.ball.angularVelocity.set(40, 0, 0);
                    
                    this.goalkeeper.position.set(0, 0, 0);
                    this.goalkeeper.setPose('idle');
                } else {
                    if (!this.matrixHitTriggered) {
                        this.matrixHitTriggered = true;
                        
                        // Ефектний вибух часток у точці влучання (в голову)
                        gameVFX.spawnTargetHitExplosion(new Vector3(0, 1.58, 0));
                        this.camera.triggerShake(1.5);
                        
                        gameAudio.playKeeperSave();
                        gameAudio.playMissGroan();
                        
                        // Переводимо воротаря у позу падіння Матриці
                        this.goalkeeper.setPose('matrix_fall');
                        
                        // М'яч відлітає назад
                        this.ball.velocity.set(0.5, 1.8, 3.5);
                        this.ball.angularVelocity.set(-5, 10, -5);
                    }
                    
                    // Фізика польоту м'яча після влучання
                    this.ball.velocity.coordinateY -= PHYSICS_GRAVITY * scaledDeltaTime;
                    this.ball.position.coordinateX += this.ball.velocity.coordinateX * scaledDeltaTime;
                    this.ball.position.coordinateY += this.ball.velocity.coordinateY * scaledDeltaTime;
                    this.ball.position.coordinateZ += this.ball.velocity.coordinateZ * scaledDeltaTime;
                    
                    if (this.ball.position.coordinateY < BALL_RADIUS) {
                        this.ball.position.coordinateY = BALL_RADIUS;
                        this.ball.velocity.coordinateY = -this.ball.velocity.coordinateY * 0.45;
                        this.ball.velocity.coordinateX *= 0.8;
                        this.ball.velocity.coordinateZ *= 0.8;
                    }
                }

                if (this.matrixTimer >= 5.0) {
                    this.gameState = 'aiming';
                    this.timeScale = 1.0;
                    this.matrixTimer = 0;
                    this.matrixOrbitAngle = 0;
                    this.matrixHitTriggered = false;
                    this.matrix3DStreams = null;
                    
                    this.showMatrixRewardOverlay();
                }
                break;
            }
        }
    } // end update()

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

            // Застосовуємо множник монет поточного клубу
            try {
                const selectedClub = safeStorage.getItem('pm_selected_club') || 'polissya';
                const activeClub = CLUB_PRESETS.find(c => c.id === selectedClub);
                if (activeClub) {
                    earned = Math.round(earned * activeClub.coinMultiplier);
                }
            } catch (e) {
                console.warn('Error reading club multiplier: ', e);
            }
            this.coins += earned;

            // Нараховуємо престиж (XP)
            try {
                let prestigeEarned = 15;
                if (this.ball.didHitTarget) prestigeEarned += 20;
                if (this.streakCount > 1) prestigeEarned += this.streakCount * 5;
                
                const currentPrestige = parseInt(safeStorage.getItem('pm_prestige')) || 0;
                safeStorage.setItem('pm_prestige', currentPrestige + prestigeEarned);
            } catch (e) {
                console.warn('Error adding prestige: ', e);
            }

            this.levelGoalsScored++;
            const lvl = this.currentLevel || LEVEL_PRESETS[0];
            const progEl = document.getElementById('hud-level-progress');
            if (progEl) progEl.innerText = `Голі: ${this.levelGoalsScored}/${lvl.goalsToAdvance}`;

            // Кожні 4 забиті голи запускаємо міні-гру «Матричний Прорив»
            if (this.goalsCount > 0 && this.goalsCount % 4 === 0) {
                setTimeout(() => {
                    this.triggerMatrixMiniGame();
                }, 4400);
            } else if (this.goalsCount > 0 && this.goalsCount % 3 === 0) {
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
            
            // Запобігаємо зависанню при переході на наступний рівень або міні-гру
            const levelUpScreen = document.getElementById('screen-level-up');
            const isLevelUpActive = levelUpScreen && levelUpScreen.classList.contains('active');
            const matrixScreen = document.getElementById('screen-matrix-run');
            const isMatrixActive = matrixScreen && matrixScreen.classList.contains('active');
            
            if (!isLevelUpActive && !isMatrixActive) {
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
        if (this.customTargets) {
            this.customTargets.forEach(t => {
                t.active = true;
                t.hitState = null;
                t.hitRotation = 0;
                t.position.coordinateX = t.originPos.coordinateX;
                t.position.coordinateY = t.originPos.coordinateY;
                t.position.coordinateZ = t.originPos.coordinateZ;
                t.hitVelocity.set(0, 0, 0);
                t.hitAngularVelocity = 0;
            });
        }

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

            // Перевіряємо зачеплення будь-якої цілі для кольорової підсвітки траєкторії (Real-time target locking)
            this.targets.forEach(t => {
                if (t.active && simBallPos.subtract(t.position).length() < (TARGET_RADIUS + BALL_RADIUS)) {
                    this.aimLockedTarget = t;
                }
            });
            if (this.customTargets) {
                this.customTargets.forEach(t => {
                    if (t.active && simBallPos.subtract(t.position).length() < (t.radius + BALL_RADIUS)) {
                        this.aimLockedTarget = t;
                    }
                });
            }
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

        const lvl = this.currentLevel || LEVEL_PRESETS[0];

        // Зчитуємо екіпірований стадіон з магазину
        let skyTop = lvl.skyTop;
        let skyMid = lvl.skyMid;
        let skyBot = lvl.skyBot;
        let stadiumColor = lvl.stadiumColor;
        let grassA = lvl.grassA;
        let grassB = lvl.grassB;
        let lightColor1 = lvl.lightColor1;
        let lightColor2 = lvl.lightColor2;

        try {
            const equippedStadiumId = safeStorage.getItem('pm_equipped_stadium') || 'default';
            const stadium = SHOP_ITEMS.stadiums.find(s => s.id === equippedStadiumId);
            if (stadium && equippedStadiumId !== 'default') {
                skyTop = stadium.skyTop;
                skyMid = stadium.skyMid;
                skyBot = stadium.skyBot;
                stadiumColor = stadium.stadiumColor;
                grassA = stadium.grassA;
                grassB = stadium.grassB;
                // Неоново-блакитні прожектори для сучасних стадіонів
                lightColor1 = 'rgba(0, 255, 204, 0.7)';
                lightColor2 = 'rgba(0, 255, 204, 0.15)';
            }
        } catch (e) {
            console.warn('Error applying stadium styles: ', e);
        }

        const skyGrad = this.ctx.createLinearGradient(0, 0, 0, height * 0.45);
        skyGrad.addColorStop(0, skyTop);
        skyGrad.addColorStop(0.5, skyMid);
        skyGrad.addColorStop(1, skyBot);
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

        this.ctx.fillStyle = stadiumColor;
        this.ctx.beginPath();
        this.ctx.moveTo(0, horizonY - height * 0.25);
        this.ctx.lineTo(width, horizonY - height * 0.25);
        this.ctx.lineTo(width, horizonY);
        this.ctx.lineTo(0, horizonY);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = stadiumColor;
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
                
                this.ctx.fillStyle = lightColor2;
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
            radG.addColorStop(0.2, lightColor1);
            radG.addColorStop(0.5, lightColor2);
            radG.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = radG;
            this.ctx.beginPath();
            this.ctx.arc(light.x, light.y, 45, 0, Math.PI * 2);
            this.ctx.fill();
        });

        const grassColors = [grassA, grassB];
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

        // Малювання спеціальних інтерактивних об'єктів біля воріт
        if (this.customTargets) {
            this.customTargets.forEach(target => {
                if (!target.active) return;
                const proj = this.camera.project(target.position, width, height);
                if (!proj) return;

                const radius = target.radius * proj.scale;
                this.ctx.save();

                if (target.id === 'dartboard') {
                    // Малюємо класичну мішень дартсу
                    this.ctx.shadowBlur = 15;
                    this.ctx.shadowColor = '#ffd700';
                    this.ctx.lineWidth = 2 * (proj.scale / 300);

                    // Сектори дартсу
                    const segments = 20;
                    const angles = (Math.PI * 2) / segments;
                    for (let i = 0; i < segments; i++) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(proj.x, proj.y);
                        this.ctx.arc(proj.x, proj.y, radius, i * angles, (i + 1) * angles);
                        this.ctx.closePath();
                        this.ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 153, 51, 0.4)' : 'rgba(204, 0, 0, 0.4)';
                        this.ctx.fill();
                        this.ctx.strokeStyle = '#ffffff';
                        this.ctx.stroke();
                    }

                    // Внутрішнє кільце
                    this.ctx.strokeStyle = '#ffd700';
                    this.ctx.lineWidth = 4 * (proj.scale / 300);
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y, radius * 0.45, 0, Math.PI * 2);
                    this.ctx.stroke();

                    // Bullseye (Червоний центр)
                    this.ctx.fillStyle = '#ff0033';
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y, radius * 0.18, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    // Текст над дартсом
                    this.ctx.fillStyle = '#ffd700';
                    this.ctx.font = `bold ${Math.round(11 * (proj.scale / 300))}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText("ДАРТС 🎯", proj.x, proj.y - radius - 8);
                }
                else if (target.id === 'dummy') {
                    // Малюємо манекен (картонний щит)
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#ff6600';
                    
                    // Ніжка
                    this.ctx.strokeStyle = '#855e42';
                    this.ctx.lineWidth = 6 * (proj.scale / 300);
                    this.ctx.beginPath();
                    this.ctx.moveTo(proj.x, proj.y + radius);
                    this.ctx.lineTo(proj.x, proj.y + radius * 2.1);
                    this.ctx.stroke();

                    // Манекен (тіло)
                    this.ctx.fillStyle = 'rgba(255, 102, 0, 0.35)';
                    this.ctx.strokeStyle = '#ff6600';
                    this.ctx.lineWidth = 3 * (proj.scale / 300);
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y - radius * 0.5, radius * 0.55, 0, Math.PI * 2); // голова
                    this.ctx.rect(proj.x - radius * 0.5, proj.y, radius, radius * 1.2); // торс
                    this.ctx.fill();
                    this.ctx.stroke();

                    // Малюємо хрест на тілі
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                    this.ctx.lineWidth = 2 * (proj.scale / 300);
                    this.ctx.beginPath();
                    this.ctx.moveTo(proj.x - radius * 0.4, proj.y + radius * 0.6);
                    this.ctx.lineTo(proj.x + radius * 0.4, proj.y + radius * 0.6);
                    this.ctx.moveTo(proj.x, proj.y + radius * 0.2);
                    this.ctx.lineTo(proj.x, proj.y + radius * 1.0);
                    this.ctx.stroke();

                    this.ctx.fillStyle = '#ff6600';
                    this.ctx.font = `bold ${Math.round(11 * (proj.scale / 300))}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText("МАНЕКЕН 🛡️", proj.x, proj.y - radius * 1.3);
                }
                else if (target.id === 'photographer') {
                    // Малюємо фотографа з великою камерою
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = '#00ccff';
                    this.ctx.strokeStyle = '#00ccff';
                    this.ctx.lineWidth = 3 * (proj.scale / 300);
                    
                    // Голова фотографа
                    this.ctx.beginPath();
                    this.ctx.arc(proj.x, proj.y - radius * 0.6, radius * 0.35, 0, Math.PI * 2);
                    this.ctx.stroke();

                    // Тіло та ноги (сидяче положення)
                    this.ctx.beginPath();
                    this.ctx.moveTo(proj.x, proj.y - radius * 0.25);
                    this.ctx.lineTo(proj.x - radius * 0.2, proj.y + radius * 0.4); // спина/таз
                    this.ctx.lineTo(proj.x - radius * 0.5, proj.y + radius * 0.9); // ноги
                    this.ctx.moveTo(proj.x - radius * 0.2, proj.y + radius * 0.4);
                    this.ctx.lineTo(proj.x + radius * 0.3, proj.y + radius * 0.9);
                    this.ctx.stroke();

                    // Великий об'єктив камери
                    this.ctx.fillStyle = '#333333';
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2 * (proj.scale / 300);
                    this.ctx.fillRect(proj.x + radius * 0.1, proj.y - radius * 0.7, radius * 0.7, radius * 0.35);
                    this.ctx.strokeRect(proj.x + radius * 0.1, proj.y - radius * 0.7, radius * 0.7, radius * 0.35);

                    // Фото-штатив (тринога)
                    this.ctx.strokeStyle = '#888888';
                    this.ctx.beginPath();
                    this.ctx.moveTo(proj.x + radius * 0.4, proj.y - radius * 0.35);
                    this.ctx.lineTo(proj.x + radius * 0.1, proj.y + radius * 0.9);
                    this.ctx.moveTo(proj.x + radius * 0.4, proj.y - radius * 0.35);
                    this.ctx.lineTo(proj.x + radius * 0.7, proj.y + radius * 0.9);
                    this.ctx.stroke();

                    this.ctx.fillStyle = '#00ccff';
                    this.ctx.font = `bold ${Math.round(11 * (proj.scale / 300))}px monospace`;
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText("ФОТОГРАФ 📸", proj.x, proj.y - radius * 1.2);
                }

                this.ctx.restore();
            });
        }

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
            
            let postColor = lvl.postColor;
            try {
                const equippedGoalId = safeStorage.getItem('pm_equipped_goal') || 'default';
                const goalSkin = SHOP_ITEMS.goals.find(g => g.id === equippedGoalId);
                if (goalSkin) {
                    postColor = goalSkin.postColor;
                }
            } catch (e) {
                console.warn('Error applying goalpost styles: ', e);
            }
            this.ctx.strokeStyle = postColor;
            
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
                // Скидаємо блокування цілі перед розрахунком траєкторії
                this.aimLockedTarget = null;
                const trajPoints = this.getTrajectoryPoints(width, height);

                // Визначаємо кольори підсвічування
                let traceColorGlow = 'rgba(0, 255, 204, 0.15)';
                let traceColorLine = 'rgba(0, 255, 204, 0.65)';
                let crosshairColor = '#00ffcc';
                let crosshairColorGlow = 'rgba(0, 255, 204, 0.8)';

                if (this.aimLockedTarget) {
                    if (this.aimLockedTarget.id === 'dartboard') {
                        traceColorGlow = 'rgba(255, 215, 0, 0.2)';
                        traceColorLine = 'rgba(255, 215, 0, 0.7)';
                        crosshairColor = '#ffd700';
                        crosshairColorGlow = 'rgba(255, 215, 0, 0.85)';
                    } else if (this.aimLockedTarget.id === 'dummy') {
                        traceColorGlow = 'rgba(255, 102, 0, 0.2)';
                        traceColorLine = 'rgba(255, 102, 0, 0.7)';
                        crosshairColor = '#ff6600';
                        crosshairColorGlow = 'rgba(255, 102, 0, 0.85)';
                    } else if (this.aimLockedTarget.id === 'photographer') {
                        traceColorGlow = 'rgba(0, 204, 255, 0.2)';
                        traceColorLine = 'rgba(0, 204, 255, 0.7)';
                        crosshairColor = '#00ccff';
                        crosshairColorGlow = 'rgba(0, 204, 255, 0.85)';
                    } else {
                        // Звичайні мішені у кутах
                        traceColorGlow = 'rgba(255, 0, 127, 0.2)';
                        traceColorLine = 'rgba(255, 0, 127, 0.7)';
                        crosshairColor = '#ff007f';
                        crosshairColorGlow = 'rgba(255, 0, 127, 0.85)';
                    }
                }

                if (trajPoints.length > 1) {
                    this.ctx.strokeStyle = traceColorGlow;
                    this.ctx.lineWidth = 6;
                    this.ctx.beginPath();
                    this.ctx.moveTo(trajPoints[0].x, trajPoints[0].y);
                    for (let k = 1; k < trajPoints.length; k++) {
                        this.ctx.lineTo(trajPoints[k].x, trajPoints[k].y);
                    }
                    this.ctx.stroke();

                    this.ctx.strokeStyle = traceColorLine;
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
                    
                    this.ctx.fillStyle = traceColorGlow;
                    this.ctx.beginPath();
                    this.ctx.arc(lastPt.x, lastPt.y, 9, 0, Math.PI * 2);
                    this.ctx.fill();

                    this.ctx.fillStyle = crosshairColor;
                    this.ctx.beginPath();
                    this.ctx.arc(lastPt.x, lastPt.y, 4.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.strokeStyle = crosshairColorGlow;
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
                this.ctx.strokeStyle = crosshairColor;
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

        // Обчислюємо ballProj ДО того, як використовуємо його в шлейфі
        const ballProj = this.camera.project(this.ball.position, width, height);

        // Малювання шлейфу м'яча (Ball Trail rendering)
        if (this.ball.isKicked && this.ball.trailPositions && this.ball.trailPositions.length > 1) {
            this.ctx.save();
            this.ctx.lineWidth = 4 * (ballProj ? ballProj.scale / 300 : 1);
            this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
            this.ctx.beginPath();

            let firstTrailProj = this.camera.project(this.ball.trailPositions[0], width, height);
            if (firstTrailProj) {
                this.ctx.moveTo(firstTrailProj.x, firstTrailProj.y);
            }

            for (let i = 1; i < this.ball.trailPositions.length; i++) {
                let trailProj = this.camera.project(this.ball.trailPositions[i], width, height);
                if (trailProj) {
                    this.ctx.lineTo(trailProj.x, trailProj.y);
                }
            }
            this.ctx.stroke();
            this.ctx.restore();
        }

        if (ballProj) {
            // Додаємо красивий неоновий ореол (Halo) навколо м'яча при швидкому польоті
            const ballSpeed = this.ball.velocity.length();
            if (ballSpeed > 5) {
                this.ctx.save();
                this.ctx.shadowBlur = Math.min(25, ballSpeed * 1.5);
                this.ctx.shadowColor = '#00ffcc';
                this.ctx.beginPath();
                this.ctx.arc(ballProj.x, ballProj.y, BALL_RADIUS * ballProj.scale * 1.15, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(0, 255, 204, 0.12)';
                this.ctx.fill();
                this.ctx.restore();
            }

            renderQueue.push({
                depth: this.ball.position.coordinateZ,
                render: () => this.ball.render(this.ctx, ballProj.x, ballProj.y, ballProj.scale)
            });
        }

        gameVFX.render(this.ctx, this.camera, width, height);

        renderQueue.sort((a, b) => a.depth - b.depth);
        renderQueue.forEach(item => item.render());

        // Візуалізація коду Матриці поверх 3D полотна під час катсцени
        if (this.gameState === 'matrix_headshot_cutscene') {
            this.ctx.fillStyle = 'rgba(0, 255, 102, 0.08)';
            this.ctx.fillRect(0, 0, width, height);

            if (!this.matrix3DStreams) {
                this.matrix3DStreams = [];
                const cols = Math.floor(width / 22);
                for (let i = 0; i < cols; i++) {
                    this.matrix3DStreams.push({
                        x: i * 22,
                        y: Math.random() * -height,
                        speed: 120 + Math.random() * 200,
                        chars: Array.from({length: 15}, () => String.fromCharCode(33 + Math.floor(Math.random() * 93)))
                    });
                }
            }

            this.ctx.fillStyle = 'rgba(0, 255, 102, 0.25)';
            this.ctx.font = '11px monospace';
            this.matrix3DStreams.forEach(stream => {
                stream.y += stream.speed * scaledDeltaTime;
                if (stream.y > height) {
                    stream.y = Math.random() * -200;
                    stream.chars = Array.from({length: 15}, () => String.fromCharCode(33 + Math.floor(Math.random() * 93)));
                }
                stream.chars.forEach((char, idx) => {
                    this.ctx.fillText(char, stream.x, stream.y + idx * 13);
                });
            });
        }

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

    triggerMatrixMiniGame() {
        const screen = document.getElementById('screen-matrix-run');
        if (!screen) return;

        // Ховаємо основний інтерфейс
        document.getElementById('hud-container').classList.remove('active');
        showScreen('screen-matrix-run');

        const canvas = document.getElementById('matrix-canvas');
        const runner = new MatrixRunGame(
            canvas,
            (coins) => {
                screen.classList.remove('active');
                document.getElementById('hud-container').classList.add('active');
                showScreen('hud-container');
                
                // Запускаємо slow-mo катсцену
                this.startMatrixCutscene(coins);
            },
            () => {
                this.showMatrixDefeatOverlay();
            }
        );
        runner.start();
    }

    triggerBasketballGame() {
        const screen = document.getElementById('screen-basketball');
        if (!screen) return;

        // Ховаємо основний інтерфейс
        document.getElementById('hud-container').classList.remove('active');
        showScreen('screen-basketball');

        const canvas = document.getElementById('basketball-canvas');
        const bgame = new BasketballGame(
            canvas,
            () => {
                screen.classList.remove('active');
                showScreen('screen-main-menu');
            }
        );
        this.activeBasketballInstance = bgame;
        bgame.start();
    }

    showBasketballRewardOverlay(coinsReward) {
        this.coins += coinsReward;
        this.saveStatsToStorage();
        this.updateHUD();

        const overlay = document.createElement('div');
        overlay.id = 'basketball-reward-popup';
        overlay.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(13,5,24,0.92); z-index:100; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#ff3399; font-family:"Outfit", sans-serif;';
        
        overlay.innerHTML = `
            <div class="menu-card" style="border-color:#ff3399; background:#0d0518; max-width:480px; box-shadow:0 0 35px rgba(255,51,153,0.3);">
                <h1 style="color:#ff3399; text-shadow:0 0 10px #ff3399; font-weight:900; font-family:\'Outfit\';">БАСКЕТБОЛЬНИЙ ФІНІШ</h1>
                <p style="color:#fff; font-size:1.1rem; margin:15px 0;">Чудові кидки! Ви успішно заробили монети на баскетбольному майданчику.</p>
                <div style="font-size:2rem; font-weight:bold; color:#00ffff; margin:15px 0; text-shadow:0 0 10px #00ffff;">
                    🪙 +${coinsReward} МОНЕТ
                </div>
                <div style="display:flex; gap:15px; justify-content:center; margin-top:20px;">
                    <button class="menu-button" id="btn-basket-replay" style="border-color:#00ffff; color:#00ffff; margin:0; padding:10px 20px;">Зіграти знову</button>
                    <button class="menu-button" id="btn-basket-continue" style="border-color:#ff3399; color:#ff3399; margin:0; padding:10px 20px;">У меню</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-basket-replay').onclick = () => {
            document.body.removeChild(overlay);
            this.triggerBasketballGame();
        };

        document.getElementById('btn-basket-continue').onclick = () => {
            document.body.removeChild(overlay);
            showScreen('screen-main-menu');
        };
    }

    showCustomHitText(text, color) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: absolute;
            top: 35%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: ${color};
            font-size: 2.2rem;
            font-weight: 900;
            font-family: 'Outfit', sans-serif;
            text-shadow: 0 0 15px ${color}, 0 0 30px ${color};
            z-index: 99;
            pointer-events: none;
            text-transform: uppercase;
            animation: hitTextAnim 2.2s forwards cubic-bezier(0.18, 0.89, 0.32, 1.28);
        `;
        
        if (!document.getElementById('hit-text-keyframes')) {
            const style = document.createElement('style');
            style.id = 'hit-text-keyframes';
            style.innerHTML = `
                @keyframes hitTextAnim {
                    0% { transform: translate(-50%, 0%) scale(0.4); opacity: 0; }
                    15% { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
                    30% { transform: translate(-50%, -50%) scale(1.0); opacity: 1; }
                    80% { transform: translate(-50%, -80%) scale(1.0); opacity: 1; }
                    100% { transform: translate(-50%, -110%) scale(0.85); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        div.innerText = text;
        document.body.appendChild(div);
        setTimeout(() => {
            if (div.parentNode) div.parentNode.removeChild(div);
        }, 2200);
    }

    startMatrixCutscene(coinsReward) {
        this.gameState = 'matrix_headshot_cutscene';
        this.timeScale = 0.12; // Ефект надповільного часу
        
        this.matrixTimer = 0;
        this.matrixOrbitAngle = 0;
        this.matrixHitTriggered = false;
        this.matrix3DStreams = null;
        this.matrixCoinsReward = coinsReward;

        this.ball.reset();
        this.ball.position.set(0, 0.11, 11.0);
        this.ball.velocity.set(0, 0, -11.0);

        this.goalkeeper.position.set(0, 0, 0);
        this.goalkeeper.setPose('idle');
    }

    showMatrixRewardOverlay() {
        this.coins += this.matrixCoinsReward;
        this.saveStatsToStorage();
        this.updateHUD();

        const overlay = document.createElement('div');
        overlay.id = 'matrix-reward-popup';
        overlay.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(2,11,5,0.92); z-index:100; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#00ff66; font-family:"Outfit", sans-serif;';
        
        overlay.innerHTML = `
            <div class="menu-card" style="border-color:#00ff66; background:#020b05; max-width:480px; box-shadow:0 0 35px rgba(0,255,102,0.3);">
                <h1 style="color:#00ff66; text-shadow:0 0 10px #00ff66; font-weight:900; font-family:\'Outfit\';">MATRIX HEADSHOT!</h1>
                <p style="color:#fff; font-size:1.1rem; margin:15px 0;">Влучання в голову воротаря виконано! Воротар ефектно ліг відпочити 💤</p>
                <div style="font-size:2rem; font-weight:bold; color:#00ffcc; margin:15px 0; text-shadow:0 0 10px #00ffcc;">
                    🪙 +${this.matrixCoinsReward} МОНЕТ
                </div>
                <div style="display:flex; gap:15px; justify-content:center; margin-top:20px;">
                    <button class="menu-button" id="btn-matrix-replay-win" style="border-color:#00ffcc; color:#00ffcc; margin:0; padding:10px 20px;">Зіграти знову</button>
                    <button class="menu-button" id="btn-matrix-continue-win" style="border-color:#00ff66; color:#00ff66; margin:0; padding:10px 20px;">Продовжити</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-matrix-replay-win').onclick = () => {
            document.body.removeChild(overlay);
            this.triggerMatrixMiniGame();
        };

        document.getElementById('btn-matrix-continue-win').onclick = () => {
            document.body.removeChild(overlay);
            this.resetShot();
            showScreen('hud-container');
        };
    }

    showMatrixDefeatOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'matrix-defeat-popup';
        overlay.style.cssText = 'position: absolute; top:0; left:0; width:100%; height:100%; background:rgba(20,5,5,0.92); z-index:100; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#ff3333; font-family:"Outfit", sans-serif;';
        
        overlay.innerHTML = `
            <div class="menu-card" style="border-color:#ff3333; background:#0c0202; max-width:480px; box-shadow:0 0 35px rgba(255,51,51,0.3);">
                <h1 style="color:#ff3333; text-shadow:0 0 10px #ff3333; font-weight:900; font-family:\'Outfit\';">СИСТЕМНИЙ ЗБІЙ</h1>
                <p style="color:#fff; font-size:1.1rem; margin:15px 0;">Ви зіткнулися з брандмауером та зазнали поразки!</p>
                <div style="display:flex; gap:15px; justify-content:center; margin-top:20px;">
                    <button class="menu-button" id="btn-matrix-replay-fail" style="border-color:#00ffcc; color:#00ffcc; margin:0; padding:10px 20px;">Спробувати ще раз</button>
                    <button class="menu-button" id="btn-matrix-continue-fail" style="border-color:#ff3333; color:#ff3333; margin:0; padding:10px 20px;">Продовжити</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-matrix-replay-fail').onclick = () => {
            document.body.removeChild(overlay);
            this.triggerMatrixMiniGame();
        };

        document.getElementById('btn-matrix-continue-fail').onclick = () => {
            document.body.removeChild(overlay);
            this.resetShot();
            showScreen('hud-container');
        };
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

    let items;
    let ownedKey;
    let equippedKey;
    let defaultEquipped;

    if (shopCurrentTab === 'players') {
        items = CARD_DATABASE;
        ownedKey = 'pm_owned_cards';
        equippedKey = 'pm_equipped_card';
        defaultEquipped = 'c_palazhchenko';
    } else {
        items = SHOP_ITEMS[shopCurrentTab];
        ownedKey = `pm_owned_${shopCurrentTab}`;
        
        const equippedKeys = {
            balls: 'pm_equipped_ball',
            boots: 'pm_equipped_boot',
            caps: 'pm_equipped_cap',
            kits: 'pm_equipped_kit',
            goals: 'pm_equipped_goal',
            stadiums: 'pm_equipped_stadium'
        };
        equippedKey = equippedKeys[shopCurrentTab];

        const defaultEquippedVals = {
            balls: 'classic',
            boots: 'black',
            caps: 'none',
            kits: 'default',
            goals: 'default',
            stadiums: 'default'
        };
        defaultEquipped = defaultEquippedVals[shopCurrentTab];
    }

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

        // Додаємо прев'ю скіна
        let previewHTML = '';
        if (shopCurrentTab === 'balls') {
            let ballStyle = `background: ${item.color};`;
            if (item.glowColor) {
                ballStyle += `box-shadow: 0 0 10px ${item.glowColor}; border-color: ${item.glowColor};`;
            }
            previewHTML = `<div class="shop-card-preview-ball" style="${ballStyle}"></div>`;
        } else if (shopCurrentTab === 'boots') {
            previewHTML = `<div class="shop-card-preview-boots" style="background: ${item.color};"></div>`;
        } else if (shopCurrentTab === 'caps') {
            previewHTML = `<div style="font-size: 2.2rem; text-align: center; margin: 8px 0;">${item.id === 'crown' ? '👑' : (item.id === 'none' ? '❌' : '🧢')}</div>`;
        } else if (shopCurrentTab === 'kits') {
            let kitStyle = item.jersey === 'club' ? 'background: linear-gradient(135deg, #00ffcc 0%, #ff00ff 100%)' : `background: ${item.jersey}`;
            previewHTML = `<div style="${kitStyle}; width: 38px; height: 38px; border-radius: 50%; margin: 8px auto; border: 2px solid rgba(255,255,255,0.25);"></div>`;
        } else if (shopCurrentTab === 'goals') {
            let netGlow = item.glowColor ? `box-shadow: 0 0 10px ${item.glowColor}; border-color: ${item.glowColor};` : 'border-color: #fff;';
            previewHTML = `<div style="border: 2px solid; ${netGlow} width: 62px; height: 32px; margin: 10px auto; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); font-size: 0.85rem; font-weight: 800; color: ${item.postColor || '#fff'}">🥅</div>`;
        } else if (shopCurrentTab === 'stadiums') {
            let grassGrad = `background: linear-gradient(180deg, ${item.skyBot} 0%, ${item.grassA} 100%)`;
            previewHTML = `<div style="${grassGrad}; width: 65px; height: 38px; border-radius: 4px; margin: 8px auto; border: 1.5px solid rgba(255,255,255,0.15);"></div>`;
        } else if (shopCurrentTab === 'players') {
            previewHTML = `
                <div class="ut-card-collectible ut-card-${item.rarity}" style="transform: scale(0.62); margin: -28px auto -15px auto; pointer-events: none;">
                    <div class="collectible-rating" style="font-size: 1.25rem;">${item.rating}</div>
                    <div class="collectible-pos" style="font-size: 0.65rem; top: 22px;">${item.pos}</div>
                    <div class="collectible-name" style="font-size: 0.7rem; bottom: 8px;">${item.name}</div>
                    <div class="collectible-logo" style="font-size: 1.4rem; top: 28px;">${item.logo}</div>
                </div>
            `;
        }

        let buttonText = 'Вибрати';
        let buttonStyle = 'border-color: var(--primary-glow);';
        
        if (isEquipped) {
            buttonText = 'Екіпіровано';
            buttonStyle = 'border-color: #ffd700; color: #ffd700; background: rgba(255,215,0,0.1); pointer-events: none;';
        } else if (!isOwned) {
            buttonText = `Купити: 🪙 ${item.price}`;
            buttonStyle = 'border-color: #ff9900; color: #ff9900;';
        }

        card.innerHTML = `
            <div class="shop-card-title" style="font-size: 0.9rem;">${item.name}</div>
            ${previewHTML}
            <button class="menu-button shop-buy-btn" data-id="${item.id}" style="margin: 5px 0 0 0; padding: 6px 12px; font-size: 0.85rem; ${buttonStyle}">${buttonText}</button>
        `;

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
            // Спеціальний випадок для кастомної форми під час гри
            if (shopCurrentTab === 'kits' && activeGameInstance.player) {
                if (item.id === 'default') {
                    const activeClubId = safeStorage.getItem('pm_selected_club') || 'polissya';
                    const activeClub = CLUB_PRESETS.find(c => c.id === activeClubId);
                    if (activeClub) {
                        activeGameInstance.player.jerseyColor = activeClub.color;
                        activeGameInstance.player.shortsColor = activeClub.shortColor;
                        activeGameInstance.player.socksColor = activeClub.sockColor;
                    }
                } else {
                    activeGameInstance.player.jerseyColor = item.jersey;
                    activeGameInstance.player.shortsColor = item.shorts;
                    activeGameInstance.player.socksColor = item.socks;
                }
            }
        }
    } else {
        // Покупка
        const coins = getPlayerCoins();
        if (coins >= item.price) {
            // Зменшуємо баланс монет
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
            gameAudio.playGoalCheer(); // Звук успіху
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

// Допоміжна функція для скидання активних стилів вкладок магазину
function resetShopTabStyles() {
    const tabs = ['tab-shop-balls', 'tab-shop-boots', 'tab-shop-caps', 'tab-shop-kits', 'tab-shop-goals', 'tab-shop-stadiums', 'tab-shop-players'];
    tabs.forEach(tabId => {
        const el = document.getElementById(tabId);
        if (el) {
            el.style.borderColor = 'rgba(255,255,255,0.2)';
            el.style.background = 'transparent';
        }
    });
}

function selectShopTab(tabId, tabName) {
    shopCurrentTab = tabName;
    resetShopTabStyles();
    const el = document.getElementById(tabId);
    if (el) {
        el.style.borderColor = 'var(--primary-glow)';
        el.style.background = 'rgba(0, 255, 204, 0.1)';
    }
    renderShopItems();
}

document.getElementById('tab-shop-balls').addEventListener('click', () => selectShopTab('tab-shop-balls', 'balls'));
document.getElementById('tab-shop-boots').addEventListener('click', () => selectShopTab('tab-shop-boots', 'boots'));
document.getElementById('tab-shop-caps').addEventListener('click', () => selectShopTab('tab-shop-caps', 'caps'));
document.getElementById('tab-shop-kits').addEventListener('click', () => selectShopTab('tab-shop-kits', 'kits'));
document.getElementById('tab-shop-goals').addEventListener('click', () => selectShopTab('tab-shop-goals', 'goals'));
document.getElementById('tab-shop-stadiums').addEventListener('click', () => selectShopTab('tab-shop-stadiums', 'stadiums'));
document.getElementById('tab-shop-players').addEventListener('click', () => selectShopTab('tab-shop-players', 'players'));

/*
====================================================
CAREER & TRANSFER SYSTEM (FC 26 CAREER MODE)
====================================================
*/
function getPlayerPrestige() {
    return parseInt(safeStorage.getItem('pm_prestige')) || 0;
}

function renderCareerScreen() {
    const prestige = getPlayerPrestige();
    const currentClubId = safeStorage.getItem('pm_selected_club') || 'polissya';
    const currentClub = CLUB_PRESETS.find(c => c.id === currentClubId) || CLUB_PRESETS[CLUB_PRESETS.length - 1];

    document.getElementById('career-club-logo').innerText = currentClub.logo;
    document.getElementById('career-club-name').innerText = currentClub.name;
    document.getElementById('career-prestige-display').innerText = prestige;

    const container = document.getElementById('career-transfer-list');
    container.innerHTML = '';

    const playerCoins = getPlayerCoins();

    CLUB_PRESETS.forEach(club => {
        const item = document.createElement('div');
        const isCurrent = club.id === currentClubId;
        const isLocked = prestige < club.requiredPrestige;
        const canAfford = playerCoins >= club.transferFee;

        item.className = `club-select-item ${isCurrent ? 'active' : ''}`;

        let actionHTML = '';
        if (isCurrent) {
            actionHTML = `<span style="color: #ffd700; font-weight: 800; font-size: 0.85rem;">📝 ПОТОЧНИЙ КОНТРАКТ</span>`;
        } else if (isLocked) {
            actionHTML = `<span style="color: #ff3366; font-size: 0.85rem; font-weight: 700;">🔒 Потрібно ⭐ ${club.requiredPrestige}</span>`;
        } else {
            const btnColor = canAfford ? '#ff9900' : 'rgba(255,255,255,0.2)';
            const btnTextColor = canAfford ? '#ff9900' : 'rgba(255,255,255,0.4)';
            actionHTML = `<button class="menu-button transfer-buy-btn" data-id="${club.id}" style="margin: 0; padding: 6px 12px; font-size: 0.8rem; border-color: ${btnColor}; color: ${btnTextColor};" ${canAfford ? '' : 'disabled'}>Підписати: 🪙 ${club.transferFee}</button>`;
        }

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; text-align: left;">
                <span class="club-logo-tag" style="font-size: 1.25rem;">${club.logo}</span>
                <div>
                    <div style="font-weight: 800; font-size: 0.95rem; color: #fff;">${club.name}</div>
                    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">
                        Бонус до монет: <span style="color: #00ffcc; font-weight: 700;">x${club.coinMultiplier.toFixed(1)}</span>
                    </div>
                </div>
            </div>
            <div>
                ${actionHTML}
            </div>
        `;

        if (!isCurrent && !isLocked && canAfford) {
            item.querySelector('.transfer-buy-btn').addEventListener('click', () => {
                const coins = getPlayerCoins();
                // Знімаємо кошти за трансфер
                if (activeGameInstance) {
                    activeGameInstance.coins -= club.transferFee;
                    activeGameInstance.saveStatsToStorage();
                    activeGameInstance.updateHUD();
                } else {
                    safeStorage.setItem('pm_coins', coins - club.transferFee);
                }

                safeStorage.setItem('pm_selected_club', club.id);
                gameAudio.playGoalCheer(); // Звук радості
                alert(`Вітаємо! Ви підписали офіційний контракт з клубом ${club.name}! 🎉`);

                renderCareerScreen();

                // Оновлюємо форму гравця, якщо запущено
                if (activeGameInstance) {
                    const equippedKitId = safeStorage.getItem('pm_equipped_kit') || 'default';
                    if (equippedKitId === 'default') {
                        activeGameInstance.player.jerseyColor = club.color;
                        activeGameInstance.player.shortsColor = club.shortColor;
                        activeGameInstance.player.socksColor = club.sockColor;
                    }
                }
            });
        }

        container.appendChild(item);
    });
}

document.getElementById('btn-career-menu').addEventListener('click', () => {
    gameAudio.init();
    renderCareerScreen();
    showScreen('screen-career');
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
    const currentClubId = safeStorage.getItem('pm_selected_club') || 'polissya';
    const activeClub = CLUB_PRESETS.find(c => c.id === currentClubId);
    const activeClubLogo = activeClub ? activeClub.logo : '';
    const equippedCardId = safeStorage.getItem('pm_equipped_card') || 'c_palazhchenko';

    CARD_DATABASE.forEach(card => {
        const isOwned = owned.includes(card.id);
        const isEquipped = equippedCardId === card.id;
        
        // Розраховуємо хімію (якщо логотипи/клуби картки збігаються з обраним клубом)
        const chemMatch = card.logo === activeClubLogo;
        const chemistryStars = chemMatch ? '⭐⭐⭐' : '⭐';

        const cardEl = document.createElement('div');
        cardEl.className = `ut-card-collectible ut-card-${card.rarity} ${isOwned ? '' : 'locked'} ${isEquipped ? 'active-equipped' : ''}`;

        cardEl.innerHTML = `
            <div style="font-size: 0.5rem; font-weight: 800; opacity: 0.7; display: flex; justify-content: space-between; width: 100%;">
                <span>UT 26</span>
                <span style="color: #ffd700;">${isOwned ? (isEquipped ? '✅ ЕКІП' : chemistryStars) : ''}</span>
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

        if (isOwned) {
            cardEl.style.cursor = 'pointer';
            cardEl.addEventListener('click', () => {
                if (isEquipped) return;
                safeStorage.setItem('pm_equipped_card', card.id);
                renderCollectionDeck();
                
                // Оновлюємо ім'я діючого гравця під час гри
                if (activeGameInstance) {
                    activeGameInstance.currentLevel.playerName = card.name;
                    activeGameInstance.updateHUD();
                }
            });
        }

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

document.getElementById('btn-matrix-run').addEventListener('click', () => {
    gameAudio.init();
    if (!activeGameInstance) {
        activeGameInstance = new PenaltyMasterGame();
        activeGameInstance.start();
    }
    activeGameInstance.triggerMatrixMiniGame();
});

document.getElementById('btn-matrix-back').addEventListener('click', () => {
    showScreen('screen-main-menu');
});

document.getElementById('btn-basketball-menu').addEventListener('click', () => {
    gameAudio.init();
    if (!activeGameInstance) {
        activeGameInstance = new PenaltyMasterGame();
        activeGameInstance.start();
    }
    activeGameInstance.triggerBasketballGame();
});

document.getElementById('btn-basketball-back').addEventListener('click', () => {
    if (activeGameInstance && activeGameInstance.activeBasketballInstance) {
        activeGameInstance.activeBasketballInstance.isPlaying = false;
        activeGameInstance.activeBasketballInstance.unbindEvents();
        const coins = activeGameInstance.activeBasketballInstance.coinsEarned;
        activeGameInstance.showBasketballRewardOverlay(coins);
    } else {
        showScreen('screen-main-menu');
    }
});

// FULLSCREEN & MOBILE GAMEPAD CONTROLS BINDINGS
const btnFullscreen = document.getElementById('btn-fullscreen');
if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable fullscreen: ${err.message}`);
            });
            btnFullscreen.innerText = '📺 Згорнути';
        } else {
            document.exitFullscreen();
            btnFullscreen.innerText = '📱 У весь екран';
        }
    });
}

// Big Kick Button on mobile layout
const btnKick = document.getElementById('mobile-btn-kick');
if (btnKick) {
    const startCharge = (e) => {
        if (activeGameInstance && gameControls) {
            gameControls.isChargingPower = true;
        }
        if (e.cancelable) e.preventDefault();
    };
    const endCharge = (e) => {
        if (activeGameInstance && gameControls && gameControls.isChargingPower) {
            gameControls.isChargingPower = false;
            if (activeGameInstance.gameState === 'aiming' || (activeGameInstance.gameState === 'runup' && !activeGameInstance.isRunUpStarted)) {
                activeGameInstance.startRunUp();
            }
        }
        if (e.cancelable) e.preventDefault();
    };

    btnKick.addEventListener('touchstart', startCharge, { passive: false });
    btnKick.addEventListener('touchend', endCharge);
    btnKick.addEventListener('mousedown', startCharge);
    btnKick.addEventListener('mouseup', endCharge);
}

// Q/E buttons on mobile layout
const btnQ = document.getElementById('mobile-btn-q');
const btnE = document.getElementById('mobile-btn-e');
if (btnQ && btnE) {
    const startQ = (e) => { if(gameControls) gameControls.keys['KeyQ'] = true; if(e.cancelable) e.preventDefault(); };
    const endQ = () => { if(gameControls) gameControls.keys['KeyQ'] = false; };
    btnQ.addEventListener('touchstart', startQ, { passive: false });
    btnQ.addEventListener('touchend', endQ);
    btnQ.addEventListener('mousedown', startQ);
    btnQ.addEventListener('mouseup', endQ);

    const startE = (e) => { if(gameControls) gameControls.keys['KeyE'] = true; if(e.cancelable) e.preventDefault(); };
    const endE = () => { if(gameControls) gameControls.keys['KeyE'] = false; };
    btnE.addEventListener('touchstart', startE, { passive: false });
    btnE.addEventListener('touchend', endE);
    btnE.addEventListener('mousedown', startE);
    btnE.addEventListener('mouseup', endE);
}

// Auto-detect touch capability or small layout to show gamepad
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const gamepad = document.getElementById('mobile-gamepad');
if (gamepad) {
    if (isTouchDevice || window.innerWidth < 850) {
        gamepad.style.display = 'flex';
    }
}

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

document.getElementById('btn-emergency-continue').addEventListener('click', () => {
    if (activeGameInstance) {
        // Зачищаємо потенційно завислі оверлеї банерів
        const banner = document.getElementById('banner-overlay');
        if (banner) banner.classList.remove('active');
        
        const lvlUp = document.getElementById('screen-level-up');
        if (lvlUp) lvlUp.classList.remove('active');

        const packOpen = document.getElementById('screen-pack-opening');
        if (packOpen) packOpen.classList.remove('active');

        // Примусово скидаємо кут камери, позиції об'єктів та стан раунду
        activeGameInstance.cutsceneActive = false;
        activeGameInstance.resetShot();
        console.log('🔄 Emergency round continue triggered by player.');
    }
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

// Автоматичний тест економії та трансферів
// Автоматичний тест економії та трансферів
function runEconomyTestIfRequested() {
    if (window.location.search.includes('run_test_economy=true') || window.RUN_TEST_ECONOMY_OVERRIDE) {
        console.log('[TEST] Starting economy and career mode integration test synchronously...');
        // Stub window.alert to prevent thread blocking in headless browser
        const originalAlert = window.alert;
        window.alert = (msg) => {
            console.log('[TEST] Intercepted window.alert:', msg);
        };
        try {
            // 1. Скидаємо/налаштовуємо тестовий стан
            safeStorage.setItem('pm_coins', '1000');
            safeStorage.setItem('pm_prestige', '500');
            safeStorage.setItem('pm_selected_club', 'polissya');
            safeStorage.setItem('pm_owned_balls', JSON.stringify(['classic']));
            safeStorage.setItem('pm_owned_cards', JSON.stringify(['c_palazhchenko']));

            // Перевіряємо початкові дані
            if (getPlayerCoins() !== 1000) throw new Error('Initial coins incorrect');
            if (getPlayerPrestige() !== 500) throw new Error('Initial prestige incorrect');

            // 2. Симулюємо покупку товару в магазину (М'яч)
            // Вогняний м'яч коштує 200 монет
            const fireBall = SHOP_ITEMS.balls.find(b => b.id === 'fire');
            if (!fireBall) throw new Error('Fire ball item config not found');
            
            // Клік по покупці
            handleShopItemClick(fireBall, false, false, 'pm_owned_balls', 'pm_equipped_ball');

            // Перевіряємо баланс після покупки (1000 - 200 = 800)
            const afterBallCoins = getPlayerCoins();
            if (afterBallCoins !== 800) throw new Error(`Coins balance after ball buy is incorrect: expected 800, got ${afterBallCoins}`);

            // Перевіряємо що вогняний м'яч тепер серед куплених
            const ownedBalls = JSON.parse(safeStorage.getItem('pm_owned_balls'));
            if (!ownedBalls.includes('fire')) throw new Error('Owned balls does not include fire ball after purchase');

            // 3. Симулюємо трансфер (перехід у клуб Ювентус)
            // Ювентус коштує 350 монет, вимагає 250 престижу
            const juve = CLUB_PRESETS.find(c => c.id === 'juventus');
            if (!juve) throw new Error('Juventus club preset not found');

            // Змінюємо вибір та здійснюємо покупку контракту
            // Спочатку перевіримо, чи спрацює покупка контракту (ми маємо 800 монет і 500 престижу)
            renderCareerScreen();
            
            const transferBtn = document.querySelector('.transfer-buy-btn[data-id="juventus"]');
            if (!transferBtn) throw new Error('Juventus transfer button not found in rendered career screen');

            // Клікаємо кнопку підписання контракту
            transferBtn.click();

            // Перевіряємо баланс після переходу (800 - 350 = 450)
            const afterTransferCoins = getPlayerCoins();
            if (afterTransferCoins !== 450) throw new Error(`Coins balance after transfer is incorrect: expected 450, got ${afterTransferCoins}`);

            // Перевіряємо обраний клуб
            const selectedClub = safeStorage.getItem('pm_selected_club');
            if (selectedClub !== 'juventus') throw new Error(`Active club after transfer is incorrect: expected juventus, got ${selectedClub}`);

            // 4. Перевіряємо блокування клубу з високими вимогами (Баварія - потрібен 500 престижу, 700 монет. Ми маємо 450 монет)
            // Баварія не повинна бути доступна для покупки
            renderCareerScreen();
            const bayernBtn = document.querySelector('.transfer-buy-btn[data-id="bayern"]');
            if (bayernBtn && !bayernBtn.disabled) {
                throw new Error('Bayern club is purchasable but player has insufficient coins');
            }

            console.log('✔ [TEST] ALL ECONOMY AND CAREER MODE INTEGRATION TESTS PASSED!');
            fetch('http://localhost:12345/pass').catch(() => {});
        } catch (err) {
            console.error('❌ [TEST] ECONOMY AND CAREER MODE INTEGRATION TEST FAILED:', err.message);
            fetch('http://localhost:12345/fail?error=' + encodeURIComponent(err.message)).catch(() => {});
        }
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    runEconomyTestIfRequested();
} else {
    window.addEventListener('DOMContentLoaded', runEconomyTestIfRequested);
}
