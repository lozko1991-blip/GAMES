        class AIController {
            constructor() {
                this.reactionQueue = [];
                this.decisionTimer = 0;
                this.lastSeenPlayerActionFrame = -1;
                this.botComboQueue = [];
            }
            update(bot, player) {
                if (!bot || !player) return;
                
                // AI reacts to player taking a weapon by equipping a random one
                if (player.weaponSelected && player.weaponSelected !== 'none' && (!bot.weaponSelected || bot.weaponSelected === 'none')) {
                    const botWeapons = ['pipe', 'rifle', 'bazooka'];
                    bot.weaponSelected = botWeapons[Math.floor(Math.random() * botWeapons.length)];
                    bot.weaponTimer = 420;
                    bot.weaponActiveType = bot.weaponSelected;
                    bot.weaponCharge = 0;
                    AudioSys.superHit();
                    state.screenShake = Math.max(state.screenShake, 8);
                    if (typeof updateWeaponHUD === 'function') updateWeaponHUD();
                    showFloatingText(bot.weaponSelected.toUpperCase(), bot.x + 15, bot.y - 25, '#ff5500');
                }

                if (bot.state === 'dead' || bot.state === 'dazed' || bot.state === 'hitstun' || bot.state === 'launched' || bot.state === 'knockdown' || bot.attackState > 0 || state.isMatchEnding) return;
                const dist = player.x - bot.x;
                const absDist = Math.abs(dist);
                bot.isLeft = dist > 0;
                bot.isBlocking = false;
                
                const diff = parseInt(state.difficulty);
                // Difficulty settings: 0 = Student (Normal) - 8 frames delay, 1 = Master (Hard) - 3 frames delay
                const reactionDelay = diff === 0 ? 8 : 3;
                
                const pressure = player.attackState > 0;
                const lastMove = player.lastActionType;

                if (player.lastActionFrame > this.lastSeenPlayerActionFrame) {
                    this.lastSeenPlayerActionFrame = player.lastActionFrame;
                }

                // Mortal Kombat logic: Anti-air uppercut reaction!
                if (player.isJumping && absDist < 100 && !bot.isJumping && bot.state !== 'crouch') {
                    if (Math.random() < (diff === 0 ? 0.55 : 0.85)) {
                        this.queueAction(() => { bot.action('uppercut') }, reactionDelay);
                        return;
                    }
                }

                // Defensive pressure logic
                if (pressure) {
                    // Block low if player performs a slide sweep kick
                    if (lastMove === 'sweep' && absDist < 120) {
                        this.queueAction(() => {
                            bot.state = 'crouch';
                            bot.isBlocking = true;
                        }, reactionDelay);
                        return;
                    }
                    
                    // General blocking logic
                    if (absDist < 88 && Math.random() < (diff === 0 ? 0.60 : 0.90)) {
                        this.queueAction(() => { bot.isBlocking = true }, reactionDelay);
                        return;
                    }
                }

                // Defensive reaction to projectiles (crouch, jump, or block)
                if (lastMove === 'projectile' && absDist > 140 && Math.random() < (diff === 0 ? 0.65 : 0.95)) {
                    const rnd = Math.random();
                    if (rnd < 0.45) { // Crouch under projectile
                        this.queueAction(() => {
                            bot.state = 'crouch';
                            bot.vx = 0;
                            setTimeout(() => { if (bot.state === 'crouch') bot.state = 'idle'; }, 300);
                        }, reactionDelay);
                    } else if (rnd < 0.80) { // Jump over projectile
                        this.queueAction(() => {
                            bot.vy = -12;
                            bot.isJumping = true;
                            bot.vx = dist > 0 ? 3.5 : -3.5;
                        }, reactionDelay);
                    } else { // Block
                        this.queueAction(() => { bot.isBlocking = true }, reactionDelay);
                    }
                    return;
                }

                if ((lastMove === 'kick' || lastMove === 'heavy_kick') && absDist < 115 && Math.random() < (diff === 0 ? 0.55 : 0.85)) {
                    this.queueAction(() => { bot.isBlocking = true }, reactionDelay);
                    return;
                }

                if (lastMove === 'weapon' && absDist < 145 && Math.random() < (diff === 0 ? 0.60 : 0.90)) {
                    this.queueAction(() => {
                        bot.isBlocking = true;
                        bot.vx = dist > 0 ? -2.8 : 2.8;
                    }, reactionDelay);
                    return;
                }

                if (lastMove === 'throw' && absDist < 75 && Math.random() < (diff === 0 ? 0.60 : 0.90)) {
                    this.queueAction(() => {
                        bot.vx = dist > 0 ? -4.4 : 4.4;
                        bot.state = 'move';
                    }, reactionDelay);
                    return;
                }

                if (this.reactionQueue.length > 0) {
                    const cur = this.reactionQueue[0];
                    cur.delay--;
                    if (cur.delay <= 0) { cur.action(); this.reactionQueue.shift() }
                    return;
                }

                // Process bot combo queue if active
                if (this.botComboQueue && this.botComboQueue.length > 0) {
                    this.decisionTimer--;
                    if (this.decisionTimer <= 0) {
                        this.decisionTimer = diff === 0 ? (10 + Math.random() * 8) : (4 + Math.random() * 6);
                        const nextAttack = this.botComboQueue.shift();
                        bot.action(nextAttack);
                    }
                    return;
                }

                this.decisionTimer--;
                if (this.decisionTimer <= 0) {
                    // Capped decision rate: Master attacks more frequently (+50% difficulty)
                    this.decisionTimer = diff === 0 ? (10 + Math.random() * 8) : (4 + Math.random() * 6);
                    
                    if (absDist > 260) {
                        const rnd = Math.random();
                        if (rnd < 0.45) { bot.action('projectile') }
                        else if (rnd < 0.85) { bot.vx = dist > 0 ? 4.2 : -4.2; bot.state = 'move' }
                        else {
                            bot.state = 'dash';
                            bot.dashTimer = 11;
                            bot.vx = dist > 0 ? 8.6 : -8.6;
                            bot.isLeft = dist > 0;
                            AudioSys.whoosh();
                        }
                    } else if (absDist > 120) {
                        const rnd = Math.random();
                        if (rnd < 0.35) { // Dash in and sweep combo
                            bot.state = 'dash';
                            bot.dashTimer = 11;
                            bot.vx = dist > 0 ? 8.6 : -8.6;
                            bot.isLeft = dist > 0;
                            AudioSys.whoosh();
                            this.queueAction(() => { bot.action('sweep') }, 6);
                        } else if (rnd < 0.70) {
                            bot.vx = dist > 0 ? 4.6 : -4.6;
                            bot.state = 'move';
                        } else {
                            bot.action('projectile');
                        }
                    } else {
                        // Close range: alternate attacks strategically
                        bot.state = 'idle';
                        const rand = Math.random();
                        const desperate = bot.hp < bot.maxHp * 0.35;
                        const isUnarmed = bot.weaponTimer <= 0 || !bot.weaponActiveType;
                        
                        // Decide to perform unarmed lasso combo
                        if (isUnarmed && rand < (diff === 0 ? 0.15 : 0.35)) {
                            this.botComboQueue = Math.random() < 0.5 ? ['punch', 'punch', 'punch', 'punch'] : ['kick', 'kick', 'kick', 'kick'];
                            this.decisionTimer = 1;
                            return;
                        }
                        
                        if (bot.weaponCharge >= 100 && rand < (desperate ? 0.45 : 0.25)) { 
                            triggerWeapon(bot); 
                        }
                        else if (bot.hp < bot.maxHp * 0.25 && rand < 0.30) { 
                            bot.isBlocking = true; 
                        }
                        else if (rand < 0.20) { 
                            bot.action('throw'); 
                        }
                        else if (rand < 0.45) { 
                            bot.action('punch'); 
                        }
                        else if (rand < 0.70) { 
                            bot.action('kick'); 
                        }
                        else if (rand < 0.85) { 
                            bot.action('sweep'); 
                        }
                        else if (rand < 0.93) { 
                            bot.action(bot.specialAttackType); 
                        }
                        else { 
                            bot.action('flip'); 
                        }
                    }
                } else if (bot.vx !== 0) {
                    bot.state = 'move';
                } else {
                    bot.state = 'idle';
                }
            }
            queueAction(action, delay) { if (this.reactionQueue.length < 4) { this.reactionQueue.push({ action, delay }) } }
        }
        AI_ENGINE = new AIController();
