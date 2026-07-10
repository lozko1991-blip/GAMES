        class AIController {
            constructor() {
                this.reactionQueue = [];
                this.decisionTimer = 0;
                this.lastSeenPlayerActionFrame = -1;
                this.botComboQueue = [];
                this.shouldPunish = false;
                this.footsiesTimer = 0;
                this.footsiesDir = 1;
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
                const reactionDelay = diff === 0 ? 8 : 3;
                
                const pressure = player.attackState > 0;
                const lastMove = player.lastActionType;

                if (player.lastActionFrame > this.lastSeenPlayerActionFrame) {
                    this.lastSeenPlayerActionFrame = player.lastActionFrame;
                }

                // If bot is blocking player's attack close by, trigger shouldPunish
                if (bot.isBlocking && pressure && absDist < 130) {
                    this.shouldPunish = true;
                }

                // Block-Punishing: If player finished attacking and bot blocked, launch a fast retaliating combo
                if (this.shouldPunish && !pressure && absDist < 125) {
                    this.shouldPunish = false;
                    const punishCombo = Math.random() < 0.5 ? ['punch', 'hook'] : ['kick', 'sweep'];
                    this.botComboQueue = punishCombo;
                    this.decisionTimer = 1;
                    return;
                }

                // Mortal Kombat logic: Low-profile anti-air uppercut reaction!
                if (player.isJumping && absDist < 120 && !bot.isJumping) {
                    if (Math.random() < (diff === 0 ? 0.60 : 0.90)) {
                        this.queueAction(() => { 
                            bot.state = 'crouch'; // Crouch to dodge air hitboxes
                            setTimeout(() => {
                                if (bot.state !== 'dead' && bot.state !== 'hitstun') {
                                    bot.action('uppercut');
                                }
                            }, 80);
                        }, reactionDelay);
                        return;
                    }
                }

                // Defensive pressure logic
                if (pressure) {
                    // Block low if player performs a slide sweep kick
                    if ((lastMove === 'sweep' || lastMove === 'special_slide') && absDist < 130) {
                        this.queueAction(() => {
                            bot.state = 'crouch';
                            bot.isBlocking = true;
                        }, reactionDelay);
                        return;
                    }
                    
                    // General blocking logic for all close-range attacks under pressure
                    if (absDist < 125 && Math.random() < (diff === 0 ? 0.65 : 0.92)) {
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

                // Protect against standard strikes and kicks
                if ((lastMove === 'punch' || lastMove === 'kick' || lastMove === 'hook' || lastMove === 'heavy_kick' || lastMove === 'jump_punch' || lastMove === 'jump_kick') && absDist < 125 && Math.random() < (diff === 0 ? 0.60 : 0.90)) {
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
                    this.decisionTimer = diff === 0 ? (10 + Math.random() * 8) : (4 + Math.random() * 6);
                    
                    if (absDist > 260) {
                        const rnd = Math.random();
                        if (rnd < 0.45) { bot.action('projectile') }
                        else if (rnd < 0.85) { bot.vx = dist > 0 ? 4.2 : -4.2; bot.state = 'move' }
                        else {
                            bot.state = 'dash';
                            bot.dashTimer = 10;
                            bot.vx = dist > 0 ? 13.0 : -13.0;
                            bot.isLeft = dist > 0;
                            AudioSys.whoosh();
                        }
                    } else if (absDist > 120) {
                        const rnd = Math.random();
                        if (rnd < 0.35) { // Snappy dash in and sweep combo
                            bot.state = 'dash';
                            bot.dashTimer = 10;
                            bot.vx = dist > 0 ? 13.0 : -13.0;
                            bot.isLeft = dist > 0;
                            AudioSys.whoosh();
                            this.queueAction(() => { bot.action('sweep') }, 6);
                        } else if (rnd < 0.70) {
                            // Spacing / Footsies back-and-forth movement drift
                            this.footsiesTimer--;
                            if (this.footsiesTimer <= 0) {
                                this.footsiesTimer = 15 + Math.random() * 25;
                                this.footsiesDir = Math.random() < 0.65 ? (dist > 0 ? -1 : 1) : (dist > 0 ? 1 : -1);
                            }
                            bot.vx = this.footsiesDir * 3.8;
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
                        
                        // Decide to perform combo
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
