        function checkCollisions() {
            const p1 = state.player; const p2 = state.bot; if (!p1 || !p2) return;
            for (let i = state.projectiles.length - 1; i >= 0; i--) {
                const proj = state.projectiles[i]; proj.update();
                if (proj.x < -40 || proj.x > CANVAS.width + 40 || proj.y > GROUND_Y + 10) { state.projectiles.splice(i, 1); continue }
                
                // Ground collision for sky hazards
                if ((proj.type === 'debris' || proj.type === 'lightning_bolt') && proj.y >= GROUND_Y) {
                    createElementalBurst(proj.x, GROUND_Y, proj.type === 'lightning_bolt' ? 'lightning' : 'energy');
                    state.projectiles.splice(i, 1);
                    continue;
                }
                
                const targets = [];
                if (proj.owner === null || proj.type === 'debris' || proj.type === 'lightning_bolt') {
                    targets.push({ t: p1, a: p2 });
                    targets.push({ t: p2, a: p1 });
                } else {
                    targets.push({ t: proj.owner === p1 ? p2 : p1, a: proj.owner });
                }
                
                let hit = false;
                for (let tc of targets) {
                    const target = tc.t;
                    const attacker = tc.a;
                    const distToTarget = Math.abs(proj.x - (target.x + target.width / 2));
                    if (distToTarget < 35 && proj.y > target.y && proj.y < target.y + target.height) {
                        if (!state.isOnline || state.isHost) {
                            const dmgVal = proj.type === 'bullet' ? 10 : (proj.type === 'rocket' ? 18 : (proj.type === 'charged_rocket' ? 16 : (proj.type === 'debris' ? 6 : (proj.type === 'lightning_bolt' ? 16 : 9))));
                            const typeVal = (proj.type === 'rocket' || proj.type === 'charged_rocket' || proj.type === 'lightning_bolt') ? 'super' : 'projectile';
                            applyHit(attacker, target, dmgVal, typeVal);
                        }
                        createElementalBurst(proj.x, proj.y, (proj.type === 'rocket' || proj.type === 'charged_rocket') ? 'fire' : proj.type);
                        state.projectiles.splice(i, 1);
                        hit = true;
                        break;
                    }
                }
                if (hit) continue;
            }
            if (state.isOnline && !state.isHost) return;
            const pDist = Math.abs(p1.x - p2.x);
            if (pDist < 42 && p1.state !== 'launched' && p2.state !== 'launched') {
                const push = (42 - pDist) / 2; if (p1.x < p2.x) { p1.x -= push; p2.x += push } else { p1.x += push; p2.x -= push }
            }
            [{ a: p1, d: p2 }, { a: p2, d: p1 }].forEach(pair => {
                const attacker = pair.a; const defender = pair.d;
                if (attacker.hitBox.active && !attacker.hitRegistered) {
                    const hitX = attacker.hitBox.x < defender.x + defender.width && attacker.hitBox.x + attacker.hitBox.w > defender.x;
                    const hitY = attacker.hitBox.y < defender.y + defender.height && attacker.hitBox.y + attacker.hitBox.h > defender.y;
                    if (hitX && hitY) { attacker.hitRegistered = true; applyHit(attacker, defender, attacker.hitBox.dmg, attacker.hitBox.type) }
                }
            });
        }
        function applyHit(attacker, defender, dmg, type, fromNet = false) {
            if (defender.state === 'dead') return;
            if (state.isOnline && !state.isHost && !fromNet) return;
            if (state.isOnline && state.isHost) {
                sendNetData({
                    type: 'hit_effect',
                    attackerId: attacker.id,
                    defenderId: defender.id,
                    dmg: dmg,
                    hitType: type
                });
            }
            if (state.finishHimStage) { executeFatality(attacker, defender); return }
            const pushDir = attacker.isLeft ? 1 : -1;
            let finalDmg = dmg; let blocked = false;
            if (defender.state === 'launched' && !defender.isBlocking) {
                // JUGGLE!
                defender.vy = -7.5; defender.vx = pushDir * 3.5; 
                showFloatingText("JUGGLE!", defender.x + 30, defender.y - 20, '#ff00ff');
                createImpactBurst(defender.x + defender.width / 2, defender.y + 40, '#ffffff', attacker.isLeft ? 1 : -1); AudioSys.punch();
                state.screenShake = Math.max(state.screenShake, 6); state.hitstopFrames = Math.max(state.hitstopFrames, 4);
            } else if (defender.isBlocking && type !== 'projectile' && type !== 'throw') {
                finalDmg = Math.max(1, Math.floor(dmg * 0.2)); blocked = true; AudioSys.block(); createBlockSparks(defender.x + defender.width / 2, defender.y + 55);
                state.hitstopFrames = Math.max(state.hitstopFrames, 4); state.screenShake = Math.max(state.screenShake, 4);
                defender.vx = pushDir * 3.2; // Push opponent back slightly on block
                createImpactBurst(defender.x + defender.width / 2, defender.y + 50, '#00ffcc', attacker.isLeft ? 1 : -1);
            } else {
                createBloodSplatter(defender.x + defender.width / 2, defender.y + 45, attacker.isLeft, type === 'sword' ? 3.5 : (type === 'super' || type === 'hook' || type === 'heavy_kick' || type === 'projectile' ? 1.8 : 1));
                if (type === 'lasso_pull') {
                    AudioSys.superHit();
                    defender.state = 'dazed';
                    defender.hitstunTimer = 48;
                    defender.vx = 0;
                    defender.vy = 0;
                    defender.x = Math.max(0, Math.min(CANVAS.width - defender.width, attacker.x + (attacker.isLeft ? 65 : -65)));
                    state.screenShake = Math.max(state.screenShake, 10);
                    state.hitstopFrames = Math.max(state.hitstopFrames, 6);
                    showFloatingText("PULL!", defender.x + 30, defender.y - 10, '#ffee00');
                    createImpactBurst(defender.x + defender.width / 2, defender.y + 40, '#ffee00', attacker.isLeft ? 1 : -1);
                } else if (type === 'lasso_strike') {
                    AudioSys.superHit();
                    defender.state = 'knockdown';
                    defender.knockdownTimer = 60;
                    defender.vy = -5.0;
                    defender.vx = pushDir * 8.0;
                    state.screenShake = Math.max(state.screenShake, 15);
                    state.hitstopFrames = Math.max(state.hitstopFrames, 8);
                    showFloatingText("LASSO STRIKE!", defender.x + 30, defender.y - 10, '#ffcc00');
                    createImpactBurst(defender.x + defender.width / 2, defender.y + 40, '#ffaa00', attacker.isLeft ? 1 : -1);
                } else if (type === 'uppercut') {
                    AudioSys.superHit(); defender.state = 'launched'; defender.vy = -13.0; defender.vx = pushDir * 3.6; state.screenShake = 16; state.hitstopFrames = 9; showFloatingText("LAUNCHER!", defender.x + 30, defender.y - 10, '#ffee00');
                    createImpactBurst(defender.x + defender.width / 2, defender.y + 22, '#ffee00', attacker.isLeft ? 1 : -1);
                } else if (type === 'sweep') {
                    AudioSys.superHit(); defender.state = 'knockdown'; defender.knockdownTimer = 72; defender.vy = -4.6; defender.vx = pushDir * 5.0; state.screenShake = 12; state.hitstopFrames = 7; showFloatingText("TRIP!", defender.x + 30, defender.y + 20, '#ff00ff');
                    createImpactBurst(defender.x + defender.width / 2, defender.y + 92, '#ff00ff', attacker.isLeft ? 1 : -1);
                } else if (type === 'throw') {
                    AudioSys.superHit(); defender.state = 'hitstun'; defender.hitstunTimer = 18; defender.vx = pushDir * 12.0; defender.vy = -1.0; state.screenShake = 10; state.hitstopFrames = 7; showFloatingText("THROWN!", defender.x + 20, defender.y - 6, '#ffffff');
                    createImpactBurst(defender.x + defender.width / 2, defender.y + 44, '#ffffff', attacker.isLeft ? 1 : -1);
                } else if (type === 'super') {
                    AudioSys.superHit(); defender.state = 'hitstun'; defender.hitstunTimer = 22; defender.vx = pushDir * 14.0; state.screenShake = 22; state.hitstopFrames = 18; defender.lastHitType = 'super'; showFloatingText("CRITICAL!", defender.x + 30, defender.y, '#ff0055');
                    createImpactBurst(defender.x + defender.width / 2, defender.y + 50, '#ff0055', attacker.isLeft ? 1 : -1);
                } else {
                    const isKick = type === 'kick';
                    if (type === 'hook') {
                        AudioSys.superHit(); defender.state = 'knockdown'; defender.knockdownTimer = 55; defender.vy = -3.0; defender.vx = pushDir * 6.5; state.screenShake = 12; state.hitstopFrames = 10; defender.lastHitType = 'hook';
                        showFloatingText("HOOK!", defender.x + 30, defender.y + 6, '#ffcc00');
                        createImpactBurst(defender.x + defender.width / 2, defender.y + 40, '#ffcc00', attacker.isLeft ? 1 : -1);
                    } else if (type === 'heavy_kick') {
                        AudioSys.superHit(); defender.state = 'knockdown'; defender.knockdownTimer = 60; defender.vy = -3.2; defender.vx = pushDir * 7.5; state.screenShake = 14; state.hitstopFrames = 12; defender.lastHitType = 'heavy_kick';
                        showFloatingText("HEAVY KICK!", defender.x + 30, defender.y + 6, '#ff9900');
                        createImpactBurst(defender.x + defender.width / 2, defender.y + 48, '#ff9900', attacker.isLeft ? 1 : -1);
                    } else if (type === 'sword') {
                        AudioSys.superHit(); defender.state = 'hitstun'; defender.hitstunTimer = 22; defender.vx = pushDir * 14.0; state.screenShake = 18; state.hitstopFrames = 15; defender.lastHitType = 'sword';
                        showFloatingText("SLASH!", defender.x + 24, defender.y + 4, '#ffcc00');
                        createImpactBurst(defender.x + defender.width / 2, defender.y + 42, '#ffcc00', attacker.isLeft ? 1 : -1);
                    } else {
                        AudioSys.punch(); defender.state = 'hitstun'; defender.hitstunTimer = isKick ? 14 : 11;
                        if (isKick) {
                            defender.vy = -3.8; defender.vx = pushDir * 8.2; // Hop back on kick
                        } else {
                            defender.vx = pushDir * 6.4; // Regular slide on punch
                        }
                        state.screenShake = isKick ? 7 : 5; state.hitstopFrames = isKick ? 6 : 4; defender.lastHitType = type;
                        createImpactBurst(defender.x + defender.width / 2, defender.y + 48, isKick ? '#ffcc00' : '#ffffff', attacker.isLeft ? 1 : -1);
                    }
                }
                triggerHaptic(45);
            }
            defender.hp -= finalDmg; if (defender.hp < 0) defender.hp = 0;
            if (!blocked) {
                attacker.comboCounter++; attacker.comboResetTimer = 85; showCombo(attacker.comboCounter);
                if (attacker.comboCounter === 4 && state.toastyTimer <= 0) { state.toastyTimer = 80 }
            }
            const comboBonus = attacker.comboCounter > 1 ? (1.0 + attacker.comboCounter * 0.15) : 1.0;
            attacker.weaponCharge = Math.min(100, attacker.weaponCharge + finalDmg * 1.8 * comboBonus);
            updateWeaponHUD();
            updateHUD();
        }
        function executeFatality(attacker, loser) {
            state.finishHimStage = false; clearTimeout(state.finishHimTimeout); state.isMatchEnding = true; 
            if (attacker.id === 'p1') state.p1Wins++; else state.p2Wins++;
            updateRoundNodes(); AudioSys.fatalitySound(); state.screenShake = 25; triggerHaptic(200);
            if (attacker.fatalityType === 'water_catfish') { state.fatalityAnimation = { type: 'catfish', timer: 100, loser: loser } }
            else if (attacker.fatalityType === 'shuliavka_bridge') { state.fatalityAnimation = { type: 'bridge', timer: 100, y: -80, loser: loser } }
            else if (attacker.fatalityType === 'kneu_gradebook') { state.fatalityAnimation = { type: 'gradebook', timer: 100, y: -80, loser: loser } }
            else if (attacker.fatalityType === 'borschaga_tram') { state.fatalityAnimation = { type: 'tram', timer: 100, x: -200, loser: loser } }
            const announcer = document.getElementById('fight-announcer'); announcer.innerText = "FATALITY"; announcer.style.color = '#ff0000'; announcer.style.textShadow = '0 0 30px #ff0000, 3px 3px #000'; announcer.style.display = 'block';
            setTimeout(() => { state.isRunning = false; showRoundResults(attacker) }, 2500);
        }
