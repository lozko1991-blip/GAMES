        class Fighter {
            constructor(id, name, x, isLeft, config) {
                this.id = id; this.name = name; this.x = x; this.y = GROUND_Y - 150; this.width = 60; this.height = 150;
                this.vx = 0; this.vy = 0; this.isLeft = isLeft; this.hp = 100; this.sp = 0; this.skinColor = config.skin;
                this.clothColor = config.cloth; this.projColor = config.projColor; this.projType = config.projType;
                this.specialAttackType = config.special; this.fatalityType = config.fatality; this.state = 'idle';
                this.maxHp = config.maxHp || 150;
                this.charId = config.charId || 'lozko';
                this.logo = config.logo || null;
                this.hairColor = config.hairColor || this.clothColor;
                this.isJumping = false; this.isVerticalJump = false; this.isBlocking = false; this.attackState = 0;
                this.attackTimer = 0; this.hitstunTimer = 0; this.knockdownTimer = 0; this.rotation = 0; this.squashY = 0;
                this.skeleton = { headY: 0, lArmAngle: 0, rArmAngle: 0, lLegAngle: 0, rLegAngle: 0 };
                this.hitBox = { x: 0, y: 0, w: 0, h: 0, active: false, dmg: 0, type: 'punch' };
                this.comboCounter = 0; this.comboResetTimer = 0;
                this.hitRegistered = false;
                this.weaponCharge = 0; this.weaponTimer = 0; this.weaponSelected = 'none'; this.weaponActiveType = null;
                this.lastActionType = null; this.lastActionFrame = -1;
                this.shadows = [];
                this.dashTimer = 0; this.juggleCount = 0; this.lastHitType = '';
                this.lastTapTime = { left: 0, right: 0 };
                this.punchComboCount = 0; this.kickComboCount = 0;
                this.lastPunchTime = 0; this.lastKickTime = 0;
                this.lassoActive = false; this.lassoTimer = 0;
                this.lassoTargetX = 0; this.lassoTargetY = 0;
                this.lassoType = null;
            }
            isBot() {
                return this.id === 'p2' && state.difficulty !== 'pvp' && !state.isOnline;
            }
            update() {
                if (this.sp < 100) this.sp += 0.055;
                if (this.weaponCharge < 100) this.weaponCharge = Math.min(100, this.weaponCharge + (this.hp < this.maxHp * 0.6 ? 0.085 : 0.03));
                if (this.isBot()) {
                    if (this.weaponTimer > 0) {
                        this.weaponTimer--;
                        if (this.weaponTimer <= 0) {
                            this.weaponActiveType = null;
                            this.weaponSelected = 'none';
                        }
                    }
                } else {
                    if (this.weaponSelected && this.weaponSelected !== 'none') {
                        this.weaponTimer = 420;
                        this.weaponActiveType = this.weaponSelected;
                    } else {
                        this.weaponTimer = 0;
                        this.weaponActiveType = null;
                    }
                }
                const nowTime = Date.now();
                if (nowTime - this.lastPunchTime > 600) {
                    this.punchComboCount = 0;
                }
                if (nowTime - this.lastKickTime > 600) {
                    this.kickComboCount = 0;
                }
                if (this.comboResetTimer > 0) {
                    this.comboResetTimer--;
                    if (this.comboResetTimer === 0) this.comboCounter = 0;
                }
                if (this.lassoActive) {
                    this.lassoTimer--;
                    if (this.lassoTimer <= 0) {
                        this.lassoActive = false;
                    } else {
                        const opp = (this.id === 'p1') ? state.bot : state.player;
                        if (opp) {
                            const dist = opp.x - this.x;
                            const inRange = this.isLeft ? (dist > 0 && dist <= 220) : (dist < 0 && dist >= -220);
                            const yOverlap = Math.abs((this.y + this.height / 2) - (opp.y + opp.height / 2)) < 120;
                            if (inRange && yOverlap && opp.state !== 'dead') {
                                this.lassoTargetX = opp.x + opp.width / 2;
                                this.lassoTargetY = opp.y + opp.height / 2;
                            } else {
                                this.lassoTargetX = this.isLeft ? (this.x + this.width + 220) : (this.x - 220);
                                this.lassoTargetY = this.y + 40;
                            }
                        }
                    }
                }
                if (this.state === 'dash') {
                    this.dashTimer--;
                    this.vx = this.isLeft ? 8.6 : -8.6;
                    if (this.dashTimer <= 0) { this.state = 'idle'; }
                } else if (this.state === 'hitstun' || this.state === 'dazed') {
                    this.hitstunTimer--;
                    if (this.hitstunTimer <= 0) this.state = 'idle';
                    this.vx *= 0.82;
                } else if (this.state === 'launched') {
                    if (this.y + this.height >= GROUND_Y) {
                        this.state = 'knockdown'; this.knockdownTimer = 60; this.vy = 0; this.y = GROUND_Y - this.height;
                        AudioSys.playTone(85, 'triangle', 0.25, 0.35); state.screenShake = 12;
                    }
                } else if (this.state === 'knockdown') {
                    this.knockdownTimer--; this.vx *= 0.8;
                    if (this.knockdownTimer <= 0) { this.state = 'idle' }
                }

                if (this.state === 'crouch' || this.attackState === 4) { this.height = 80; if (!this.isJumping && this.state !== 'launched') this.y = GROUND_Y - 80; }
                else if (this.state === 'knockdown') { this.height = 30; if (!this.isJumping && this.state !== 'launched') this.y = GROUND_Y - 30; }
                else { this.height = 150; if (!this.isJumping && this.state !== 'launched') this.y = GROUND_Y - 150; }

                this.y += this.vy;
                if (this.y + this.height < GROUND_Y) {
                    this.vy += GRAVITY; this.isJumping = true;
                } else {
                    if (this.isJumping) {
                        this.squashY = 15; this.isJumping = false; this.isVerticalJump = false; this.vy = 0; this.y = GROUND_Y - this.height;
                    } else if (this.state !== 'launched') {
                        this.y = GROUND_Y - this.height;
                    }
                    if (this.squashY > 0) this.squashY *= 0.7;
                }
                if (this.state !== 'hitstun' && this.state !== 'launched' && this.state !== 'knockdown') {
                    if (this.isBlocking || this.attackState > 0 || this.state === 'crouch') { this.vx *= 0.5 }
                }
                this.x += this.vx;
                if (this.x < 0) this.x = 0;
                if (this.x + this.width > CANVAS.width) this.x = CANVAS.width - this.width;
                this.hitBox.active = false;
                if (this.attackState > 0) {
                    this.attackTimer--;
                    const activeStart = this.attackState === 6 ? 4 : 5;
                    const activeEnd = this.attackState === 6 ? 10 : 14;
                    if (this.attackTimer >= activeStart && this.attackTimer <= activeEnd) {
                        this.hitBox.active = true; this.hitBox.y = this.y + 40; this.hitBox.h = 35;
                        if (this.attackState === 1) {
                            const isUnarmed = this.weaponTimer <= 0 || !this.weaponActiveType;
                            this.hitBox.w = isUnarmed ? 85 : 68; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.dmg = 4.5; this.hitBox.type = 'punch';
                        } else if (this.attackState === 2) {
                            const isUnarmed = this.weaponTimer <= 0 || !this.weaponActiveType;
                            this.hitBox.w = isUnarmed ? 95 : 84; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 50; this.hitBox.dmg = 7.2; this.hitBox.type = 'kick';
                        } else if (this.attackState === 3) {
                            this.hitBox.w = 76; this.hitBox.x = this.isLeft ? this.x + this.width * 0.7 : this.x - this.hitBox.w * 0.7; this.hitBox.y = this.y - 10; this.hitBox.h = 72; this.hitBox.dmg = 10; this.hitBox.type = 'uppercut';
                        } else if (this.attackState === 4) {
                            this.hitBox.w = 95; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 110; this.hitBox.h = 35; this.hitBox.dmg = 8.5; this.hitBox.type = 'sweep';
                        } else if (this.attackState === 6) {
                            this.hitBox.w = 60; this.hitBox.x = this.isLeft ? this.x + this.width - 2 : this.x - this.hitBox.w + 2; this.hitBox.y = this.y + 32; this.hitBox.h = 78; this.hitBox.dmg = 9; this.hitBox.type = 'throw';
                        } else if (this.attackState === 7) {
                            this.hitBox.w = 70; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 4; this.hitBox.h = 70; this.hitBox.dmg = 9.2; this.hitBox.type = 'flip';
                        } else if (this.attackState === 8) {
                            this.hitBox.w = 90; this.hitBox.x = this.isLeft ? this.x + this.width + 4 : this.x - this.hitBox.w - 4; this.hitBox.y = this.y + 36; this.hitBox.h = 48; this.hitBox.dmg = 6.2; this.hitBox.type = 'hook';
                        } else if (this.attackState === 9) {
                            this.hitBox.w = 88; this.hitBox.x = this.isLeft ? this.x + this.width - 2 : this.x - this.hitBox.w + 2; this.hitBox.y = this.y + 58; this.hitBox.h = 34; this.hitBox.dmg = 6.8; this.hitBox.type = 'heavy_kick';
                        } else if (this.attackState === 12) {
                            this.hitBox.w = 60; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 30; this.hitBox.h = 50; this.hitBox.dmg = 6; this.hitBox.type = 'punch';
                        } else if (this.attackState === 13) {
                            this.hitBox.w = 70; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 40; this.hitBox.h = 50; this.hitBox.dmg = 8.5; this.hitBox.type = 'kick';
                        } else if (this.attackState === 10) {
                            this.hitBox.w = this.weaponHitBoxWidth || 120;
                            this.hitBox.x = this.isLeft ? this.x + this.width + 2 : this.x - this.hitBox.w - 2;
                            this.hitBox.y = this.y + 20;
                            this.hitBox.h = 72;
                            this.hitBox.dmg = this.weaponDamage || 8.8;
                            this.hitBox.type = this.weaponHitType || 'sword';
                        } else if (this.attackState === 5) {
                            this.hitBox.w = 110; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 10; this.hitBox.h = 110; this.hitBox.dmg = 18; this.hitBox.type = 'super';
                        } else if (this.attackState === 14) {
                            this.hitBox.w = 220; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 30; this.hitBox.h = 45; this.hitBox.dmg = 8; this.hitBox.type = 'lasso_pull';
                        } else if (this.attackState === 15) {
                            this.hitBox.w = 220; this.hitBox.x = this.isLeft ? this.x + this.width : this.x - this.hitBox.w; this.hitBox.y = this.y + 30; this.hitBox.h = 45; this.hitBox.dmg = 15; this.hitBox.type = 'lasso_strike';
                        }
                    }
                    if (this.attackTimer <= 0) {
                        this.attackState = 0;
                        this.hitRegistered = false;
                    }
                }
                if (this.attackState === 7 || this.attackState === 4 || this.attackState === 5 || this.state === 'launched' || this.state === 'dash' || (this.weaponTimer > 0 && this.vx !== 0)) {
                    if (state.frameCount % 2 === 0) {
                        this.shadows.push({
                            x: this.x,
                            y: this.y,
                            rotation: this.rotation,
                            squashY: this.squashY,
                            skeleton: {
                                headY: this.skeleton.headY,
                                lArmAngle: this.skeleton.lArmAngle,
                                rArmAngle: this.skeleton.rArmAngle,
                                lLegAngle: this.skeleton.lLegAngle,
                                rLegAngle: this.skeleton.rLegAngle
                            },
                            isLeft: this.isLeft
                        });
                        if (this.shadows.length > 5) {
                            this.shadows.shift();
                        }
                    }
                } else {
                    if (this.shadows.length > 0 && state.frameCount % 3 === 0) {
                        this.shadows.shift();
                    }
                }
                this.animateSkeleton();
            }
            animateSkeleton() {
                const time = Date.now() * 0.007;
                let targetHeadY = 0; let targetLArm = 0.3; let targetRArm = -0.3; let targetLLeg = 0.1; let targetRLeg = -0.1; let targetRot = 0;
                const dir = this.isLeft ? 1 : -1;
                if (this.isBlocking && this.state !== 'hitstun' && this.state !== 'launched' && this.state !== 'knockdown' && this.state !== 'dead' && this.attackState === 0) {
                    targetHeadY = this.state === 'crouch' ? 18 : 3;
                    targetLArm = -1.35 * dir;
                    targetRArm = 1.35 * dir;
                    if (this.state === 'crouch') {
                        targetLLeg = 0.6; targetRLeg = -0.6;
                    } else {
                        targetLLeg = 0.05; targetRLeg = -0.05;
                    }
                } else if (this.state === 'idle') {
                    targetHeadY = Math.sin(time) * 2.5; targetLArm = 0.4 + Math.sin(time) * 0.1; targetRArm = -0.4 - Math.sin(time) * 0.1; targetLLeg = 0.1; targetRLeg = -0.1;
                } else if (this.state === 'move') {
                    targetHeadY = Math.sin(time * 1.8) * 2; targetLArm = Math.sin(time * 1.5) * 0.9; targetRArm = -Math.sin(time * 1.5) * 0.9; targetLLeg = Math.sin(time * 1.5) * 0.8; targetRLeg = -Math.sin(time * 1.5) * 0.8;
                } else if (this.state === 'crouch') {
                    targetHeadY = 18; targetLArm = 0.8; targetRArm = -0.8; targetLLeg = 0.6; targetRLeg = -0.6;
                } else if (this.state === 'hitstun') {
                    targetHeadY = -6; targetLArm = -0.8 * dir; targetRArm = 0.8 * dir; targetLLeg = -0.2; targetRLeg = 0.2;
                } else if (this.state === 'launched') {
                    targetHeadY = -10; targetLArm = Math.sin(time * 3.5) * 1.5; targetRArm = Math.cos(time * 3.5) * 1.5; targetLLeg = Math.sin(time * 3.5) * 1.2; targetRLeg = -Math.cos(time * 3.5) * 1.2; targetRot = time * 0.8 * dir;
                } else if (this.state === 'knockdown') {
                    targetHeadY = 12; targetLArm = 1.2; targetRArm = -1.2; targetLLeg = 0.8; targetRLeg = 0.8; targetRot = (Math.PI / 2) * dir;
                } else if (this.state === 'dazed') {
                    targetHeadY = Math.sin(time * 2.5) * 3; targetLArm = 1.0 + Math.sin(time * 1.2) * 0.3; targetRArm = -1.0 - Math.sin(time * 1.2) * 0.3; targetLLeg = 0.15; targetRLeg = -0.15;
                } else if (this.state === 'dead') {
                    targetHeadY = 15; targetLArm = 1.5; targetRArm = -1.5; targetLLeg = 0.2; targetRLeg = -0.2; targetRot = (Math.PI / 2) * dir;
                }
                if (this.attackState === 1) {
                    const t = this.attackTimer;
                    if (t >= 14) {
                        targetLArm = (Math.PI / 6) * dir; targetRArm = -0.4 * dir; targetRot = -0.08 * dir; targetHeadY = 2;
                    } else if (t >= 7) {
                        targetLArm = (-Math.PI / 1.1) * dir; targetRArm = -0.1 * dir; targetRot = 0.15 * dir; targetHeadY = 4;
                    } else {
                        targetLArm = (-Math.PI / 2.2) * dir; targetRArm = -0.3 * dir; targetRot = 0.05 * dir;
                    }
                } else if (this.attackState === 2) {
                    const t = this.attackTimer;
                    if (t >= 18) {
                        targetLLeg = (Math.PI / 4) * dir; targetRLeg = -0.2 * dir; targetHeadY = -4; targetLArm = 0.5 * dir; targetRArm = -0.5 * dir;
                    } else if (t >= 8) {
                        targetLLeg = (-Math.PI / 1.1) * dir; targetRLeg = 0.25 * dir; targetHeadY = 4; targetLArm = 0.3 * dir; targetRArm = -0.7 * dir;
                    } else {
                        targetLLeg = (-Math.PI / 3) * dir; targetRLeg = 0.1 * dir;
                    }
                } else if (this.attackState === 3) {
                    const t = this.attackTimer;
                    if (t >= 22) { targetLArm = 1.2 * dir; targetRArm = -0.8 * dir; targetHeadY = 16; } 
                    else if (t >= 10) { targetLArm = (-Math.PI * 1.15) * dir; targetRArm = 0.4 * dir; targetHeadY = -12; }
                    else { targetLArm = 0.3 * dir; targetRArm = -0.3 * dir; targetHeadY = 0; }
                } else if (this.attackState === 4) {
                    const t = this.attackTimer;
                    if (t >= 12) { targetLLeg = (-Math.PI / 1.1) * dir; targetRLeg = 0.8 * dir; targetHeadY = 24; }
                    else { targetLLeg = 0.2 * dir; targetRLeg = -0.2 * dir; targetHeadY = 10; }
                } else if (this.attackState === 6) {
                    targetLArm = -0.8 * dir; targetRArm = 1.2 * dir; targetHeadY = 2;
                } else if (this.attackState === 7) {
                    const t = this.attackTimer;
                    const spinAngle = ((32 - t) / 32) * Math.PI * 2 * dir;
                    targetRot = spinAngle;
                    if (t >= 24) { targetLArm = -0.4 * dir; targetRArm = -0.4 * dir; targetLLeg = 1.2 * dir; targetRLeg = 1.2 * dir; targetHeadY = -8; }
                    else if (t >= 12) { targetLArm = 1.2 * dir; targetRArm = -1.2 * dir; targetRLeg = (-Math.PI / 1.0) * dir; targetLLeg = 0.2 * dir; targetHeadY = -20; }
                    else { targetLArm = 0.8 * dir; targetRArm = -0.8 * dir; targetLLeg = 0.4 * dir; targetRLeg = -0.4 * dir; targetHeadY = 10; }
                } else if (this.attackState === 8) {
                    const t = this.attackTimer;
                    if (t >= 16) { targetLArm = 1.5 * dir; targetRArm = -0.8 * dir; targetRot = -0.4 * dir; targetHeadY = -6; targetLLeg = -0.4 * dir; targetRLeg = 0.4 * dir; }
                    else if (t >= 6) { targetLArm = (-Math.PI / 1.05) * dir; targetRArm = 0.6 * dir; targetRot = 0.55 * dir; targetHeadY = 8; targetLLeg = 0.8 * dir; targetRLeg = -0.2 * dir; }
                    else { targetLArm = 0.2 * dir; targetRArm = -0.2 * dir; targetRot = 0; targetHeadY = 2; }
                } else if (this.attackState === 9) {
                    targetLLeg = (-Math.PI / 1.3) * dir; targetRLeg = 0.15 * dir; targetHeadY = 8;
                } else if (this.attackState === 12) {
                    const t = this.attackTimer;
                    if (t >= 12) {
                        targetLArm = (Math.PI / 4) * dir; targetRArm = -0.2 * dir; targetHeadY = -6;
                    } else if (t >= 6) {
                        targetLArm = (-Math.PI / 1.0) * dir; targetRArm = -0.1 * dir; targetHeadY = 6;
                    } else {
                        targetLArm = (-Math.PI / 1.8) * dir; targetRArm = -0.2 * dir;
                    }
                } else if (this.attackState === 13) {
                    const t = this.attackTimer;
                    if (t >= 14) {
                        targetLLeg = (Math.PI / 3) * dir; targetRLeg = -0.1 * dir;
                    } else if (t >= 6) {
                        targetLLeg = (-Math.PI / 1.0) * dir; targetRLeg = 0.4 * dir; targetHeadY = 8;
                    } else {
                        targetLLeg = (-Math.PI / 2.2) * dir; targetRLeg = 0.2 * dir;
                    }
                } else if (this.attackState === 10) {
                    const t = this.attackTimer;
                    if (t >= 16) { 
                        if (dir === 1) { targetRArm = (-Math.PI * 0.8) * dir; targetLArm = 0.6 * dir; } else { targetLArm = (-Math.PI * 0.8) * dir; targetRArm = -0.6 * dir; } 
                        targetRot = -0.25 * dir; targetHeadY = -8; targetLLeg = -0.2 * dir; targetRLeg = 0.2 * dir;
                    }
                    else if (t >= 5) { 
                        if (dir === 1) { targetRArm = (Math.PI / 1.1) * dir; targetLArm = -0.8 * dir; } else { targetLArm = (Math.PI / 1.1) * dir; targetRArm = 0.8 * dir; } 
                        targetRot = 0.45 * dir; targetHeadY = 12; targetLLeg = 0.6 * dir; targetRLeg = -0.6 * dir;
                    }
                    else { 
                        if (dir === 1) { targetRArm = (Math.PI / 2.5) * dir; targetLArm = 0.3 * dir; } else { targetLArm = (Math.PI / 2.5) * dir; targetRArm = -0.3 * dir; } 
                        targetRot = 0.1 * dir; targetHeadY = 4; 
                    }
                } else if (this.attackState === 11) {
                    const t = this.attackTimer;
                    if (t >= 13) { 
                        if (dir === 1) { targetRArm = (Math.PI / 2.1) * dir; targetLArm = 0.4 * dir; } else { targetLArm = (Math.PI / 2.1) * dir; targetRArm = -0.4 * dir; } 
                        targetRot = -0.1 * dir; targetHeadY = -2;
                    }
                    else if (t >= 9) { 
                        if (dir === 1) { targetRArm = (Math.PI / 1.6) * dir; targetLArm = 0.6 * dir; } else { targetLArm = (Math.PI / 1.6) * dir; targetRArm = -0.6 * dir; } 
                        targetRot = -0.2 * dir; targetHeadY = -6;
                    }
                    else { 
                        if (dir === 1) { targetRArm = 0.4 * dir; targetLArm = 0.3 * dir; } else { targetLArm = 0.4 * dir; targetRArm = -0.3 * dir; } 
                        targetRot = 0; targetHeadY = 0; 
                    }
                } else if (this.attackState === 5) {
                    targetLArm = (-Math.PI / 1.2) * dir; targetRArm = (Math.PI / 1.2) * dir; targetHeadY = 6;
                } else if (this.attackState === 14 || this.attackState === 15) {
                    targetLArm = (-Math.PI / 1.85) * dir; targetRArm = (Math.PI / 1.85) * dir; targetHeadY = 4;
                }
                const lerp = (a, b, speed) => a + (b - a) * speed;
                this.skeleton.headY = lerp(this.skeleton.headY, targetHeadY, 0.25);
                this.skeleton.lArmAngle = lerp(this.skeleton.lArmAngle, targetLArm, 0.25);
                this.skeleton.rArmAngle = lerp(this.skeleton.rArmAngle, targetRArm, 0.25);
                this.skeleton.lLegAngle = lerp(this.skeleton.lLegAngle, targetLLeg, 0.25);
                this.skeleton.rLegAngle = lerp(this.skeleton.rLegAngle, targetRLeg, 0.25);
                this.rotation = lerp(this.rotation, targetRot, 0.25);
            }
            draw() {
                const dir = this.isLeft ? 1 : -1;
                if (this.shadows && this.shadows.length > 0) {
                    this.shadows.forEach((snap, index) => {
                        const opacity = (index + 1) / (this.shadows.length + 1) * 0.32;
                        const sDir = snap.isLeft ? 1 : -1;
                        CTX.save();
                        CTX.globalAlpha = opacity;
                        CTX.translate(snap.x + this.width / 2, snap.y + this.height / 2);
                        if (snap.rotation !== 0) { CTX.rotate(snap.rotation) }
                        const shadowColor = this.projColor;
                        const headX = 0;
                        const headY = -48 + snap.skeleton.headY + snap.squashY * 0.5;
                        const snapLHandX = -48 * sDir + Math.sin(snap.skeleton.lArmAngle) * 38;
                        const snapLHandY = Math.cos(snap.skeleton.lArmAngle) * 15;
                        const snapRHandX = 48 * sDir - Math.sin(snap.skeleton.rArmAngle) * 38;
                        const snapRHandY = Math.cos(snap.skeleton.rArmAngle) * 15;
                        this.drawMuscleLimb(-13 * sDir, 22, -22 * sDir + Math.sin(snap.skeleton.lLegAngle) * 38, 78, 16, shadowColor, shadowColor);
                        this.drawMuscleLimb(13 * sDir, 22, 18 * sDir - Math.sin(snap.skeleton.rLegAngle) * 38, 78, 16, shadowColor, shadowColor);
                        CTX.fillStyle = shadowColor;
                        CTX.beginPath(); CTX.moveTo(-23, -30); CTX.bezierCurveTo(-26, -5, -19, 20, -15, 30); CTX.lineTo(15, 30); CTX.bezierCurveTo(19, 20, 26, -5, 23, -30); CTX.closePath(); CTX.fill();
                        this.drawMuscleLimb(-22 * sDir, -22, snapLHandX, snapLHandY, 13, shadowColor, shadowColor);
                        this.drawMuscleLimb(22 * sDir, -22, snapRHandX, snapRHandY, 13, shadowColor, shadowColor);
                        CTX.beginPath(); CTX.arc(headX, headY, 19, 0, Math.PI * 2); CTX.fill();
                        CTX.restore();
                    });
                }
                CTX.save(); CTX.fillStyle = 'rgba(0,0,0,0.45)'; CTX.beginPath();
                const heightDiff = GROUND_Y - (this.y + this.height);
                const shadowScale = Math.max(0.1, 1 - heightDiff / 280);
                CTX.ellipse(this.x + this.width / 2, GROUND_Y, 38 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2); CTX.fill(); CTX.restore();
                CTX.save(); CTX.translate(this.x + this.width / 2, this.y + this.height / 2);
                if (this.rotation !== 0) { CTX.rotate(this.rotation) }
                const headX = 0; const headY = -48 + this.skeleton.headY + this.squashY * 0.5;
                this.drawMuscleLimb(-13 * dir, 22, -22 * dir + Math.sin(this.skeleton.lLegAngle) * 38, 78, 16, this.clothColor, this.skinColor);
                this.drawMuscleLimb(13 * dir, 22, 18 * dir - Math.sin(this.skeleton.rLegAngle) * 38, 78, 16, this.clothColor, this.skinColor);
                // Draw Animal Tail
                if (this.charId === 'jonik') {
                    CTX.save();
                    CTX.strokeStyle = '#ff9933';
                    CTX.lineWidth = 6;
                    CTX.lineCap = 'round';
                    CTX.beginPath();
                    CTX.moveTo(-8 * dir, 22);
                    CTX.bezierCurveTo(-25 * dir, 35, -35 * dir, 10, -42 * dir, 25);
                    CTX.stroke();
                    CTX.restore();
                } else if (this.charId === 'isnusha') {
                    CTX.save();
                    CTX.strokeStyle = '#999999';
                    CTX.lineWidth = 10;
                    CTX.lineCap = 'round';
                    CTX.beginPath();
                    CTX.moveTo(-8 * dir, 22);
                    CTX.bezierCurveTo(-20 * dir, 32, -30 * dir, 0, -22 * dir, -12);
                    CTX.stroke();
                    CTX.strokeStyle = '#ffffff';
                    CTX.lineWidth = 8;
                    CTX.beginPath();
                    CTX.moveTo(-24 * dir, -6);
                    CTX.lineTo(-22 * dir, -12);
                    CTX.stroke();
                    CTX.restore();
                }

                const torsoGrad = CTX.createLinearGradient(0, -30, 0, 30); torsoGrad.addColorStop(0, this.clothColor); torsoGrad.addColorStop(1, '#0f0f15'); CTX.fillStyle = torsoGrad;
                if (this.charId === 'andriushka') {
                    CTX.beginPath();
                    CTX.moveTo(-23, -30);
                    CTX.bezierCurveTo(-38, -10, -38, 20, -20, 30);
                    CTX.lineTo(20, 30);
                    CTX.bezierCurveTo(38, 20, 38, -10, 23, -30);
                    CTX.closePath();
                    CTX.fill();
                } else {
                    CTX.beginPath(); CTX.moveTo(-23, -30); CTX.bezierCurveTo(-26, -5, -19, 20, -15, 30); CTX.lineTo(15, 30); CTX.bezierCurveTo(19, 20, 26, -5, 23, -30); CTX.closePath(); CTX.fill();
                }
                
                // Draw Chest Logo
                if (this.logo) {
                    CTX.save();
                    if (this.logo === 'ps5') {
                        CTX.fillStyle = '#ffffff';
                        CTX.font = 'bold 8px Arial';
                        CTX.textAlign = 'center';
                        CTX.textBaseline = 'middle';
                        CTX.fillText('PS5', 0, -5);
                    } else if (this.logo === 'xbox') {
                        CTX.fillStyle = '#107c10';
                        CTX.beginPath();
                        CTX.arc(0, -5, 8, 0, Math.PI * 2);
                        CTX.fill();
                        CTX.strokeStyle = '#ffffff';
                        CTX.lineWidth = 1.5;
                        CTX.beginPath();
                        CTX.moveTo(-4, -9); CTX.lineTo(4, -1);
                        CTX.moveTo(4, -9); CTX.lineTo(-4, -1);
                        CTX.stroke();
                    } else if (this.logo === 'germany') {
                        CTX.fillStyle = '#000000';
                        CTX.fillRect(-8, -10, 16, 3);
                        CTX.fillStyle = '#ff0000';
                        CTX.fillRect(-8, -7, 16, 3);
                        CTX.fillStyle = '#ffcc00';
                        CTX.fillRect(-8, -4, 16, 3);
                    } else if (this.logo === 'claude') {
                        CTX.fillStyle = '#d97736';
                        CTX.beginPath();
                        CTX.arc(0, -5, 8, 0, Math.PI * 2);
                        CTX.fill();
                        CTX.fillStyle = '#ffffff';
                        CTX.font = 'bold 7px monospace';
                        CTX.textAlign = 'center';
                        CTX.textBaseline = 'middle';
                        CTX.fillText('</>', 0, -5);
                    } else if (this.logo === 'joystick') {
                        CTX.fillStyle = '#555555';
                        CTX.fillRect(-6, -2, 12, 5);
                        CTX.strokeStyle = '#cccccc';
                        CTX.lineWidth = 2;
                        CTX.beginPath();
                        CTX.moveTo(0, -2);
                        CTX.lineTo(3, -9);
                        CTX.stroke();
                        CTX.fillStyle = '#ff0000';
                        CTX.beginPath();
                        CTX.arc(3, -9, 3, 0, Math.PI * 2);
                        CTX.fill();
                    } else if (this.logo === 'cat') {
                        CTX.fillStyle = '#ffe0b2';
                        CTX.beginPath();
                        CTX.arc(0, -5, 4, 0, Math.PI * 2);
                        CTX.arc(-4, -9, 2, 0, Math.PI * 2);
                        CTX.arc(0, -10, 2, 0, Math.PI * 2);
                        CTX.arc(4, -9, 2, 0, Math.PI * 2);
                        CTX.fill();
                    } else if (this.logo === 'dog') {
                        CTX.fillStyle = '#ffffff';
                        CTX.fillRect(-6, -7, 12, 3);
                        CTX.beginPath();
                        CTX.arc(-6, -7, 2, 0, Math.PI * 2);
                        CTX.arc(-6, -4, 2, 0, Math.PI * 2);
                        CTX.arc(6, -7, 2, 0, Math.PI * 2);
                        CTX.arc(6, -4, 2, 0, Math.PI * 2);
                        CTX.fill();
                    } else if (this.logo === 'heart') {
                        CTX.fillStyle = '#ff3366';
                        CTX.beginPath();
                        CTX.arc(-4, -6, 4, 0, Math.PI * 2);
                        CTX.arc(4, -6, 4, 0, Math.PI * 2);
                        CTX.fill();
                        CTX.beginPath();
                        CTX.moveTo(-8, -5);
                        CTX.lineTo(8, -5);
                        CTX.lineTo(0, 3);
                        CTX.closePath();
                        CTX.fill();
                    } else if (this.logo === 'police') {
                        // Golden Shield base
                        CTX.fillStyle = '#ffee00';
                        CTX.strokeStyle = '#cca300';
                        CTX.lineWidth = 1.5;
                        CTX.beginPath();
                        CTX.moveTo(-6, -10);
                        CTX.quadraticCurveTo(0, -12, 6, -10);
                        CTX.lineTo(6, -5);
                        CTX.quadraticCurveTo(6, 0, 0, 4);
                        CTX.quadraticCurveTo(-6, 0, -6, -5);
                        CTX.closePath();
                        CTX.fill();
                        CTX.stroke();
                        
                        // Blue star/core inside
                        CTX.fillStyle = '#0033aa';
                        CTX.beginPath();
                        CTX.arc(0, -4, 3, 0, Math.PI * 2);
                        CTX.fill();
                        
                        // A tiny gold dot in the center of the star
                        CTX.fillStyle = '#ffffff';
                        CTX.beginPath();
                        CTX.arc(0, -4, 1, 0, Math.PI * 2);
                        CTX.fill();
                    }
                    CTX.restore();
                }

                const lHandX = -48 * dir + Math.sin(this.skeleton.lArmAngle) * 38;
                const lHandY = Math.cos(this.skeleton.lArmAngle) * 15;
                const rHandX = 48 * dir - Math.sin(this.skeleton.rArmAngle) * 38;
                const rHandY = Math.cos(this.skeleton.rArmAngle) * 15;
                this.drawMuscleLimb(-22 * dir, -22, lHandX, lHandY, 13, this.skinColor, this.skinColor);
                this.drawMuscleLimb(22 * dir, -22, rHandX, rHandY, 13, this.skinColor, this.skinColor);
                
                // Animal Ears
                if (this.charId === 'jonik' || this.charId === 'isnusha') {
                    CTX.save();
                    CTX.fillStyle = this.charId === 'jonik' ? '#ff9933' : '#444444';
                    CTX.beginPath();
                    CTX.moveTo(headX - 16, headY - 6);
                    CTX.lineTo(headX - 18, headY - 26);
                    CTX.lineTo(headX - 4, headY - 14);
                    CTX.closePath();
                    CTX.fill();
                    CTX.beginPath();
                    CTX.moveTo(headX + 16, headY - 6);
                    CTX.lineTo(headX + 18, headY - 26);
                    CTX.lineTo(headX + 4, headY - 14);
                    CTX.closePath();
                    CTX.fill();
                    
                    CTX.fillStyle = '#ffb3d1';
                    CTX.beginPath();
                    CTX.moveTo(headX - 14, headY - 8);
                    CTX.lineTo(headX - 15, headY - 22);
                    CTX.lineTo(headX - 6, headY - 13);
                    CTX.closePath();
                    CTX.fill();
                    CTX.beginPath();
                    CTX.moveTo(headX + 14, headY - 8);
                    CTX.lineTo(headX + 15, headY - 22);
                    CTX.lineTo(headX + 6, headY - 13);
                    CTX.closePath();
                    CTX.fill();
                    CTX.restore();
                }

                CTX.fillStyle = this.skinColor; CTX.beginPath(); CTX.arc(headX, headY, 19, 0, Math.PI * 2); CTX.fill();
                
                if (this.charId === 'jonik') {
                    // Draw cat face details
                    CTX.save();
                    CTX.fillStyle = '#00ff66';
                    CTX.beginPath();
                    CTX.ellipse(headX + 5 * dir, headY - 3, 3, 5, 0, 0, Math.PI * 2);
                    CTX.fill();
                    CTX.fillStyle = '#000000';
                    CTX.beginPath();
                    CTX.ellipse(headX + 5 * dir, headY - 3, 1, 4, 0, 0, Math.PI * 2);
                    CTX.fill();
                    
                    CTX.strokeStyle = '#000000';
                    CTX.lineWidth = 1;
                    CTX.beginPath();
                    CTX.moveTo(headX + 10 * dir, headY + 3); CTX.lineTo(headX + 22 * dir, headY + 1);
                    CTX.moveTo(headX + 10 * dir, headY + 5); CTX.lineTo(headX + 24 * dir, headY + 5);
                    CTX.moveTo(headX + 10 * dir, headY + 7); CTX.lineTo(headX + 22 * dir, headY + 9);
                    CTX.stroke();
                    
                    CTX.fillStyle = '#ff9999';
                    CTX.beginPath();
                    CTX.moveTo(headX + 8 * dir, headY + 2);
                    CTX.lineTo(headX + 11 * dir, headY + 2);
                    CTX.lineTo(headX + 9.5 * dir, headY + 4);
                    CTX.closePath();
                    CTX.fill();
                    CTX.restore();
                } else if (this.charId === 'isnusha') {
                    // Draw dog face details
                    CTX.save();
                    CTX.fillStyle = '#444444';
                    CTX.beginPath();
                    CTX.arc(headX + 4 * dir, headY - 4, 8, 0, Math.PI * 2);
                    CTX.fill();
                    
                    CTX.fillStyle = '#331100';
                    CTX.beginPath();
                    CTX.arc(headX + 6 * dir, headY - 4, 3, 0, Math.PI * 2);
                    CTX.fill();
                    
                    CTX.fillStyle = '#000000';
                    CTX.beginPath();
                    CTX.arc(headX + 11 * dir, headY + 2, 4, 0, Math.PI * 2);
                    CTX.fill();
                    CTX.restore();
                } else {
                    // Draw default human hair, scarf bandana, and face details
                    CTX.fillStyle = this.hairColor; CTX.beginPath(); CTX.arc(headX, headY - 8, 20, Math.PI, 0); CTX.fill();
                    CTX.strokeStyle = this.clothColor; CTX.lineWidth = 3.5; CTX.beginPath(); CTX.moveTo(-16 * dir, headY - 4);
                    CTX.quadraticCurveTo(-26 * dir, headY + 6 + Math.sin(Date.now() * 0.01) * 2, -32 * dir, headY + 1); CTX.stroke();
                    CTX.strokeStyle = '#000'; CTX.lineWidth = 2; CTX.beginPath();
                    if (this.isLeft) { CTX.moveTo(headX + 2, headY - 2); CTX.lineTo(headX + 11, headY) } else { CTX.moveTo(headX - 2, headY - 2); CTX.lineTo(headX - 11, headY) }
                    CTX.stroke();
                }
                if (this.isBlocking) { CTX.strokeStyle = '#00ffcc'; CTX.lineWidth = 3; CTX.beginPath(); CTX.arc(22 * dir, -10, 28, -Math.PI / 2, Math.PI / 2); CTX.stroke() }
                if (this.state === 'dazed') {
                    CTX.fillStyle = '#ffcc00'; const starTime = Date.now() * 0.015;
                    for (let i = 0; i < 3; i++) {
                        const starX = headX + Math.sin(starTime + (i * Math.PI * 2 / 3)) * 22;
                        const starY = headY - 22 + Math.cos(starTime + (i * Math.PI * 2 / 3)) * 6;
                        CTX.beginPath(); CTX.arc(starX, starY, 3, 0, Math.PI * 2); CTX.fill();
                    }
                }
                const hasWeaponActive = this.weaponTimer > 0;
                const isAttackingWithWeapon = this.attackState === 10 || this.attackState === 11;
                if (hasWeaponActive || isAttackingWithWeapon) {
                    const activeHandX = dir === 1 ? rHandX : lHandX;
                    const activeHandY = dir === 1 ? rHandY : lHandY;
                    const shoulderX = (dir === 1 ? 22 : -22) * dir;
                    const shoulderY = -22;
                    const armAngle = Math.atan2(activeHandY - shoulderY, activeHandX - shoulderX);
                    const wType = this.weaponActiveType || this.weaponSelected;
                    if (wType === 'pipe') {
                        CTX.save(); CTX.translate(activeHandX, activeHandY); CTX.rotate(armAngle);
                        CTX.fillStyle = '#8a8e93'; CTX.fillRect(-6, -3, 36, 6);
                        CTX.fillStyle = '#a6abb0'; CTX.fillRect(-6, -3, 36, 1.5);
                        CTX.fillStyle = '#555558'; CTX.fillRect(-8, -4, 4, 8);
                        CTX.restore();
                        if (this.attackState === 10 && this.attackTimer > 4 && this.attackTimer < 18) {
                            CTX.save(); CTX.strokeStyle = '#cccccc'; CTX.lineWidth = 4; CTX.globalAlpha = 0.25; CTX.shadowBlur = 8; CTX.shadowColor = '#ffffff';
                            const startArcAngle = armAngle - 0.7 * dir; const endArcAngle = armAngle;
                            CTX.beginPath(); CTX.arc(shoulderX, shoulderY, 74, startArcAngle, endArcAngle, dir === -1); CTX.stroke();
                            CTX.restore();
                        }
                    } else if (wType === 'rifle') {
                        CTX.save(); CTX.translate(activeHandX, activeHandY); CTX.rotate(armAngle);
                        CTX.fillStyle = '#8a5229'; CTX.fillRect(-10, -1, 10, 5);
                        CTX.fillStyle = '#2d3033'; CTX.fillRect(0, -3, 24, 6); CTX.fillRect(6, 3, 5, 8);
                        CTX.fillStyle = '#1c1e20'; CTX.fillRect(10, 1, 4, 10);
                        CTX.fillStyle = '#4f5459'; CTX.fillRect(24, -2, 16, 3);
                        if (this.attackState === 11 && this.attackTimer >= 10 && this.attackTimer <= 13) {
                            CTX.shadowBlur = 18; CTX.shadowColor = '#ffaa00'; CTX.fillStyle = '#ffffff'; CTX.beginPath(); CTX.arc(44, -1, 5, 0, Math.PI * 2); CTX.fill();
                            CTX.fillStyle = 'rgba(255, 120, 0, 0.7)'; CTX.beginPath(); CTX.arc(45, -1, 12, 0, Math.PI * 2); CTX.fill();
                        }
                        CTX.restore();
                    } else if (wType === 'bazooka') {
                        CTX.save(); CTX.translate(activeHandX, activeHandY); CTX.rotate(armAngle);
                        CTX.fillStyle = '#3a593d'; CTX.fillRect(-12, -7, 38, 14);
                        CTX.fillStyle = '#1e2022'; CTX.fillRect(-2, 7, 4, 8);
                        CTX.fillStyle = '#1c2e21'; CTX.fillRect(-16, -9, 4, 18);
                        if (this.attackState === 11 && this.attackTimer >= 22 && this.attackTimer <= 26) {
                            CTX.shadowBlur = 25; CTX.shadowColor = '#ff5500'; CTX.fillStyle = '#ffffff'; CTX.beginPath(); CTX.arc(32, 0, 8, 0, Math.PI * 2); CTX.fill();
                            CTX.fillStyle = 'rgba(255, 60, 0, 0.8)'; CTX.beginPath(); CTX.arc(34, 0, 20, 0, Math.PI * 2); CTX.fill();
                        }
                        CTX.restore();
                    } else if (wType === 'sword') {
                        CTX.save();
                        CTX.translate(activeHandX, activeHandY);
                        CTX.rotate(armAngle);
                        CTX.fillStyle = '#ffcc00'; CTX.fillRect(0, -6, 3, 12);
                        CTX.fillStyle = '#4a1a2a'; CTX.fillRect(-8, -1.5, 8, 3);
                        CTX.fillStyle = '#ffcc00'; CTX.beginPath(); CTX.arc(-9, 0, 2, 0, Math.PI * 2); CTX.fill();
                        const bladeGrad = CTX.createLinearGradient(0, 0, 42, 0); bladeGrad.addColorStop(0, '#e8e8f2'); bladeGrad.addColorStop(0.8, '#ffffff'); bladeGrad.addColorStop(1, this.projColor);
                        CTX.shadowBlur = 10; CTX.shadowColor = this.projColor; CTX.fillStyle = bladeGrad;
                        CTX.beginPath(); CTX.moveTo(3, -2.5); CTX.lineTo(40, -1.8); CTX.lineTo(46, 0); CTX.lineTo(40, 1.8); CTX.lineTo(3, 2.5); CTX.closePath(); CTX.fill();
                        CTX.shadowBlur = 0; CTX.strokeStyle = '#ffffff'; CTX.lineWidth = 0.8; CTX.beginPath(); CTX.moveTo(4, 0); CTX.lineTo(40, 0); CTX.stroke();
                        CTX.restore();
                        if (this.attackState === 10 && this.attackTimer > 4 && this.attackTimer < 18) {
                            CTX.save(); CTX.strokeStyle = this.projColor; CTX.lineWidth = 5; CTX.globalAlpha = 0.28; CTX.shadowBlur = 12; CTX.shadowColor = this.projColor;
                            const startArcAngle = armAngle - 0.75 * dir; const endArcAngle = armAngle;
                            CTX.beginPath(); CTX.arc(shoulderX, shoulderY, 78, startArcAngle, endArcAngle, dir === -1); CTX.stroke();
                            CTX.restore();
                        }
                    } else if (wType === 'pistol') {
                        CTX.save(); CTX.translate(activeHandX, activeHandY); CTX.rotate(armAngle);
                        CTX.fillStyle = '#2b2b2e'; CTX.fillRect(0, -3, 14, 5.5); CTX.fillRect(-2, -1, 4.5, 9); CTX.fillStyle = '#4b4b4e'; CTX.fillRect(-3, -4.5, 17, 2.5);
                        CTX.strokeStyle = '#2b2b2e'; CTX.lineWidth = 1; CTX.beginPath(); CTX.arc(2, 2, 2.5, 0, Math.PI, false); CTX.stroke();
                        if (this.attackState === 11 && this.attackTimer >= 11 && this.attackTimer <= 14) {
                            CTX.shadowBlur = 18; CTX.shadowColor = '#ffcc00'; CTX.fillStyle = '#ffffff'; CTX.beginPath(); CTX.arc(18, -3, 6, 0, Math.PI * 2); CTX.fill();
                            CTX.fillStyle = 'rgba(255, 180, 0, 0.65)'; CTX.beginPath(); CTX.arc(19, -3, 14, 0, Math.PI * 2); CTX.fill();
                            for (let s = 0; s < 5; s++) { const sx = 19 + Math.random() * 14; const sy = -3 + (Math.random() - 0.5) * 8; CTX.fillStyle = '#ffee00'; CTX.fillRect(sx, sy, 2, 2); }
                        }
                        CTX.restore();
                    }
                }
                CTX.restore();

                if (this.lassoActive) {
                    const dir = this.isLeft ? 1 : -1;
                    const rHandX = 48 * dir - Math.sin(this.skeleton.rArmAngle) * 38;
                    const rHandY = Math.cos(this.skeleton.rArmAngle) * 15;
                    const lHandX = -48 * dir + Math.sin(this.skeleton.lArmAngle) * 38;
                    const lHandY = Math.cos(this.skeleton.lArmAngle) * 15;
                    
                    const handX = (this.x + this.width / 2) + (this.isLeft ? rHandX : lHandX);
                    const handY = (this.y + this.height / 2) + (this.isLeft ? rHandY : lHandY);
                    
                    CTX.save();
                    // Glowing yellow-orange lasso line
                    CTX.strokeStyle = '#ffee00';
                    CTX.lineWidth = 4.5;
                    CTX.shadowBlur = 12;
                    CTX.shadowColor = '#ff6600';
                    CTX.lineCap = 'round';
                    CTX.beginPath();
                    CTX.moveTo(handX, handY);
                    CTX.lineTo(this.lassoTargetX, this.lassoTargetY);
                    CTX.stroke();
                    
                    // Core line
                    CTX.strokeStyle = '#ffffff';
                    CTX.lineWidth = 1.5;
                    CTX.shadowBlur = 0;
                    CTX.beginPath();
                    CTX.moveTo(handX, handY);
                    CTX.lineTo(this.lassoTargetX, this.lassoTargetY);
                    CTX.stroke();
                    
                    // Sparks along the lasso
                    for (let s = 0; s < 6; s++) {
                        const t = Math.random();
                        const sparkX = handX + (this.lassoTargetX - handX) * t + (Math.random() - 0.5) * 14;
                        const sparkY = handY + (this.lassoTargetY - handY) * t + (Math.random() - 0.5) * 14;
                        CTX.fillStyle = Math.random() < 0.5 ? '#ffaa00' : '#ffff55';
                        CTX.fillRect(sparkX, sparkY, 3, 3);
                    }
                    CTX.restore();
                }
            }
            drawMuscleLimb(startX, startY, endX, endY, maxThickness, color1, color2) {
                if (startX === endX && startY === endY) { endX += 0.1 }
                if (color1 === color2) {
                    CTX.fillStyle = color1;
                } else {
                    const grad = CTX.createLinearGradient(startX, startY, endX, endY);
                    grad.addColorStop(0, color1);
                    grad.addColorStop(1, color2);
                    CTX.fillStyle = grad;
                }
                const angle = Math.atan2(endY - startY, endX - startX); const halfThick = maxThickness / 2;
                CTX.beginPath(); CTX.moveTo(startX + Math.sin(angle) * halfThick, startY - Math.cos(angle) * halfThick);
                CTX.bezierCurveTo(startX + (endX - startX) * 0.5 + Math.sin(angle) * halfThick * 1.2, startY + (endY - startY) * 0.5 - Math.cos(angle) * halfThick * 1.2, endX + Math.sin(angle) * halfThick * 0.5, endY - Math.cos(angle) * halfThick * 0.5, endX, endY);
                CTX.bezierCurveTo(endX - Math.sin(angle) * halfThick * 0.5, endY + Math.cos(angle) * halfThick * 0.5, startX + (endX - startX) * 0.5 - Math.sin(angle) * halfThick * 1.2, startY + (endY - startY) * 0.5 + Math.cos(angle) * halfThick * 1.2, startX - Math.sin(angle) * halfThick, startY + Math.cos(angle) * halfThick);
                CTX.closePath(); CTX.fill();
            }
            triggerLasso(lassoType) {
                if (this.state === 'dead' || this.state === 'hitstun' || this.state === 'dazed' || this.state === 'launched' || this.state === 'knockdown') return;
                this.attackState = lassoType === 'pull' ? 14 : 15;
                this.attackTimer = 24;
                this.lassoActive = true;
                this.lassoTimer = 24;
                this.lassoType = lassoType;
                
                AudioSys.whoosh();
                
                const opp = (this.id === 'p1') ? state.bot : state.player;
                if (!opp) return;
                
                const dist = opp.x - this.x;
                const inRange = this.isLeft ? (dist > 0 && dist <= 220) : (dist < 0 && dist >= -220);
                const yOverlap = Math.abs((this.y + this.height / 2) - (opp.y + opp.height / 2)) < 120;
                
                if (inRange && yOverlap && opp.state !== 'dead') {
                    this.lassoTargetX = opp.x + opp.width / 2;
                    this.lassoTargetY = opp.y + opp.height / 2;
                } else {
                    this.lassoTargetX = this.isLeft ? (this.x + this.width + 220) : (this.x - 220);
                    this.lassoTargetY = this.y + 40;
                }
            }
            action(type) {
                if (this.attackState > 0 || this.state === 'hitstun' || this.state === 'dead' || this.state === 'dazed') return;
                this.hitRegistered = false;
                
                const isUnarmed = this.weaponTimer <= 0 || !this.weaponActiveType;
                if (isUnarmed) {
                    if (type === 'punch') {
                        const now = Date.now();
                        if (now - this.lastPunchTime > 600) {
                            this.punchComboCount = 0;
                        }
                        this.punchComboCount++;
                        this.lastPunchTime = now;
                        if (this.punchComboCount >= 4) {
                            this.punchComboCount = 0;
                            this.triggerLasso('pull');
                            return;
                        }
                    } else if (type === 'kick') {
                        const now = Date.now();
                        if (now - this.lastKickTime > 600) {
                            this.kickComboCount = 0;
                        }
                        this.kickComboCount++;
                        this.lastKickTime = now;
                        if (this.kickComboCount >= 4) {
                            this.kickComboCount = 0;
                            this.triggerLasso('strike');
                            return;
                        }
                    }
                }

                if ((type === 'punch' || type === 'kick') && this.weaponTimer > 0 && this.weaponActiveType) {
                    const w = this.weaponActiveType;
                    if (w === 'pipe') {
                        type = type === 'punch' ? 'weapon_pipe_light' : 'weapon_pipe_heavy';
                    } else if (w === 'rifle') {
                        type = type === 'punch' ? 'weapon_rifle_shoot' : 'weapon_rifle_melee';
                    } else if (w === 'bazooka') {
                        type = type === 'punch' ? 'weapon_bazooka_shoot' : 'weapon_bazooka_melee';
                    } else {
                        type = 'weapon';
                    }
                }
                this.lastActionType = type; this.lastActionFrame = state.frameCount;
                if (type === 'punch') { this.attackState = 1; this.attackTimer = 21; AudioSys.whoosh() }
                else if (type === 'hook') { this.attackState = 8; this.attackTimer = 25; AudioSys.whoosh(); this.vx = this.isLeft ? 2.3 : -2.3 }
                else if (type === 'kick') { this.attackState = 2; this.attackTimer = 25; AudioSys.whoosh() }
                else if (type === 'heavy_kick') { this.attackState = 9; this.attackTimer = 28; AudioSys.whoosh(); this.vx = this.isLeft ? 3.0 : -3.0 }
                else if (type === 'jump_punch') { this.attackState = 12; this.attackTimer = 20; AudioSys.whoosh() }
                else if (type === 'jump_kick') { this.attackState = 13; this.attackTimer = 22; AudioSys.whoosh() }
                else if (type === 'special_rise' || type === 'uppercut') { this.attackState = 3; this.attackTimer = 30; this.vy = -8.6; AudioSys.whoosh() }
                else if (type === 'flip') { this.attackState = 7; this.attackTimer = 32; this.vy = -11.0; this.vx = this.isLeft ? 4.6 : -4.6; this.isJumping = true; AudioSys.whoosh() }
                else if (type === 'special_slide' || type === 'sweep') { this.attackState = 4; this.attackTimer = 28; this.vx = this.isLeft ? 13 : -13; AudioSys.whoosh() }
                else if (type === 'throw') { this.attackState = 6; this.attackTimer = 26; AudioSys.whoosh(); this.vx = this.isLeft ? 4.2 : -4.2 }
                else if (type === 'super' && this.sp >= 100) { this.attackState = 5; this.attackTimer = 38; this.sp = 0; AudioSys.superHit() }
                else if (type === 'weapon_pipe_light') {
                    this.attackState = 10; this.attackTimer = 18; AudioSys.whoosh();
                    this.weaponDamage = 7.5; this.weaponHitType = 'pipe'; this.weaponHitBoxWidth = 110;
                    this.vx = this.isLeft ? 2.5 : -2.5;
                }
                else if (type === 'weapon_pipe_spin') {
                    this.attackState = 10; this.attackTimer = 32; AudioSys.superHit();
                    this.weaponDamage = 16.0; this.weaponHitType = 'heavy_kick'; this.weaponHitBoxWidth = 140;
                    this.vx = this.isLeft ? 6.5 : -6.5;
                }
                else if (type === 'weapon_rifle_burst') {
                    AudioSys.projectileLaunch();
                    const pDir = this.isLeft ? 1 : -1;
                    state.projectiles.push(new Projectile(this.x + this.width / 2 + 42 * pDir, this.y + 38, pDir * 24.0, '#bfc6d6', 'bullet', this));
                    setTimeout(() => {
                        if (this.state !== 'dead' && this.state !== 'hitstun' && this.state !== 'launched' && this.state !== 'knockdown') {
                            AudioSys.projectileLaunch();
                            state.projectiles.push(new Projectile(this.x + this.width / 2 + 42 * pDir, this.y + 38, pDir * 24.0, '#bfc6d6', 'bullet', this));
                        }
                    }, 120);
                    setTimeout(() => {
                        if (this.state !== 'dead' && this.state !== 'hitstun' && this.state !== 'launched' && this.state !== 'knockdown') {
                            AudioSys.projectileLaunch();
                            state.projectiles.push(new Projectile(this.x + this.width / 2 + 42 * pDir, this.y + 38, pDir * 24.0, '#bfc6d6', 'bullet', this));
                        }
                    }, 240);
                    this.attackState = 11; this.attackTimer = 26; this.vx = this.isLeft ? -4.0 : 4.0;
                    if (state.isOnline && this.id === (state.isHost ? 'p1' : 'p2')) {
                        sendNetData({ type: 'spawn_projectile', projType: 'bullet', x: this.x + this.width / 2 + 42 * pDir, y: this.y + 38, vx: pDir * 24.0, color: '#bfc6d6' });
                        setTimeout(() => { sendNetData({ type: 'spawn_projectile', projType: 'bullet', x: this.x + this.width / 2 + 42 * pDir, y: this.y + 38, vx: pDir * 24.0, color: '#bfc6d6' }) }, 120);
                        setTimeout(() => { sendNetData({ type: 'spawn_projectile', projType: 'bullet', x: this.x + this.width / 2 + 42 * pDir, y: this.y + 38, vx: pDir * 24.0, color: '#bfc6d6' }) }, 240);
                    }
                }
                else if (type === 'weapon_bazooka_charged') {
                    AudioSys.projectileLaunch();
                    const pDir = this.isLeft ? 1 : -1;
                    state.projectiles.push(new Projectile(this.x + this.width / 2 + 45 * pDir, this.y + 38, pDir * 14.0, '#cc00ff', 'charged_rocket', this));
                    this.attackState = 11; this.attackTimer = 34; this.vx = this.isLeft ? -7.0 : 7.0;
                    if (state.isOnline && this.id === (state.isHost ? 'p1' : 'p2')) {
                        sendNetData({
                            type: 'spawn_projectile',
                            projType: 'charged_rocket',
                            x: this.x + this.width / 2 + 45 * pDir,
                            y: this.y + 38,
                            vx: pDir * 14.0,
                            color: '#cc00ff'
                        });
                    }
                }
                else if (type === 'weapon_pipe_heavy') {
                    this.attackState = 10; this.attackTimer = 26; AudioSys.superHit();
                    this.weaponDamage = 13.0; this.weaponHitType = 'heavy_kick'; this.weaponHitBoxWidth = 125;
                    this.vx = this.isLeft ? 4.0 : -4.0;
                }
                else if (type === 'weapon_rifle_melee') {
                    this.attackState = 10; this.attackTimer = 20; AudioSys.punch();
                    this.weaponDamage = 8.5; this.weaponHitType = 'hook'; this.weaponHitBoxWidth = 95;
                    this.vx = this.isLeft ? 2.0 : -2.0;
                }
                else if (type === 'weapon_bazooka_melee') {
                    this.attackState = 10; this.attackTimer = 24; AudioSys.superHit();
                    this.weaponDamage = 10.5; this.weaponHitType = 'uppercut'; this.weaponHitBoxWidth = 105;
                    this.vx = this.isLeft ? 1.5 : -1.5;
                }
                else if (type === 'weapon_rifle_shoot') {
                    AudioSys.projectileLaunch();
                    const pDir = this.isLeft ? 1 : -1;
                    state.projectiles.push(new Projectile(this.x + this.width / 2 + 42 * pDir, this.y + 38, pDir * 24.0, '#bfc6d6', 'bullet', this));
                    this.attackState = 11; this.attackTimer = 14; this.vx = this.isLeft ? -2.0 : 2.0;
                    if (state.isOnline && this.id === (state.isHost ? 'p1' : 'p2')) {
                        sendNetData({
                            type: 'spawn_projectile',
                            projType: 'bullet',
                            x: this.x + this.width / 2 + 42 * pDir,
                            y: this.y + 38,
                            vx: pDir * 24.0,
                            color: '#bfc6d6'
                        });
                    }
                }
                else if (type === 'weapon_bazooka_shoot') {
                    AudioSys.projectileLaunch();
                    const pDir = this.isLeft ? 1 : -1;
                    state.projectiles.push(new Projectile(this.x + this.width / 2 + 45 * pDir, this.y + 38, pDir * 12.0, '#ff5500', 'rocket', this));
                    this.attackState = 11; this.attackTimer = 28; this.vx = this.isLeft ? -5.0 : 5.0;
                    if (state.isOnline && this.id === (state.isHost ? 'p1' : 'p2')) {
                        sendNetData({
                            type: 'spawn_projectile',
                            projType: 'rocket',
                            x: this.x + this.width / 2 + 45 * pDir,
                            y: this.y + 38,
                            vx: pDir * 12.0,
                            color: '#ff5500'
                        });
                    }
                }
                else if (type === 'weapon') {
                    if (this.weaponTimer <= 0 || !this.weaponActiveType) return;
                    if (this.weaponActiveType === 'sword') { this.attackState = 10; this.attackTimer = 22; AudioSys.superHit(); this.vx = this.isLeft ? 3.2 : -3.2 }
                    else {
                        AudioSys.projectileLaunch();
                        const pDir = this.isLeft ? 1 : -1;
                        state.projectiles.push(new Projectile(this.x + this.width / 2 + 42 * pDir, this.y + 38, pDir * 24.0, '#bfc6d6', 'bullet', this));
                        this.attackState = 11; this.attackTimer = 16; this.vx = this.isLeft ? -4.0 : 4.0;
                        if (state.isOnline && this.id === (state.isHost ? 'p1' : 'p2')) {
                            sendNetData({
                                type: 'spawn_projectile',
                                projType: 'bullet',
                                x: this.x + this.width / 2 + 42 * pDir,
                                y: this.y + 38,
                                vx: pDir * 24.0,
                                color: '#bfc6d6'
                            });
                        }
                    }
                }
                else if (type === 'projectile') {
                    AudioSys.projectileLaunch(); const pDir = this.isLeft ? 1 : -1;
                    state.projectiles.push(new Projectile(this.x + this.width / 2 + 45 * pDir, this.y + 40, pDir * 9.0, this.projColor, this.projType, this));
                    if (state.isOnline && this.id === (state.isHost ? 'p1' : 'p2')) {
                        sendNetData({
                            type: 'spawn_projectile',
                            projType: this.projType,
                            x: this.x + this.width / 2 + 45 * pDir,
                            y: this.y + 40,
                            vx: pDir * 9.0,
                            color: this.projColor
                        });
                    }
                }
            }
        }
