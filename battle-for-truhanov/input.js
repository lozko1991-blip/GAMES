        function triggerHaptic(ms) { if (navigator.vibrate) { navigator.vibrate(ms) } }
        function getPlayerWeaponType(player) {
            return player.weaponSelected === 'pistol' ? 'pistol' : 'sword';
        }
        function triggerWeapon(player) {
            if (!player) return false;
            const isBot = player.id === 'p2' && state.difficulty !== 'pvp' && !state.isOnline;
            if (isBot) {
                if (player.weaponCharge < 100 || player.weaponTimer > 0) return false;
                player.weaponCharge = 0;
                const botWeapons = ['pipe', 'rifle', 'bazooka'];
                player.weaponSelected = botWeapons[Math.floor(Math.random() * botWeapons.length)];
                player.weaponTimer = 420;
                player.weaponActiveType = player.weaponSelected;
                AudioSys.superHit();
                state.screenShake = Math.max(state.screenShake, 8);
                triggerHaptic(70);
                updateWeaponHUD();
                return true;
            } else {
                cycleWeapon(player);
                return true;
            }
        }
        function cycleWeapon(player) {
            if (!player) return;
            const weapons = (player.id === 'p1') ? state.ownedWeapons : ['none', 'pipe', 'rifle', 'bazooka', 'sausage', 'bow', 'nunchucks', 'spear', 'greatsword'];
            let idx = weapons.indexOf(player.weaponSelected || 'none');
            idx = (idx + 1) % weapons.length;
            player.weaponSelected = weapons[idx];
            if (player.weaponSelected === 'none') {
                player.weaponTimer = 0;
                player.weaponActiveType = null;
            } else {
                player.weaponTimer = 420;
                player.weaponActiveType = player.weaponSelected;
            }
            updateWeaponHUD();
            showFloatingText(player.weaponSelected.toUpperCase(), player.x + 15, player.y - 25, '#ffcc00');
        }
        function tapAction(player, actionName) {
            if (!player) return;
            if (actionName === 'sky_figures') {
                for (let s = 0; s < 4; s++) {
                    const spawnX = 50 + Math.random() * (CANVAS.width - 100);
                    const color = ['#ff0055', '#00ffcc', '#ffcc00', '#00ff00'][Math.floor(Math.random() * 4)];
                    const vy = 4.5 + Math.random() * 2;
                    state.projectiles.push(new Projectile(spawnX, -20, 0, color, 'debris', null, vy));
                    if (state.isOnline) {
                        sendNetData({
                            type: 'spawn_projectile',
                            projType: 'debris',
                            x: spawnX,
                            y: -20,
                            vx: 0,
                            vy: vy,
                            color: color,
                            ownerId: null
                        });
                    }
                }
                AudioSys.whoosh();
                return;
            }
            if (player.weaponSelected && player.weaponSelected !== 'none') {
                if (actionName === 'punch') {
                    if (['pipe', 'sausage', 'nunchucks', 'spear', 'greatsword'].includes(player.weaponSelected)) player.action('weapon_pipe_light');
                    else if (['rifle', 'bow'].includes(player.weaponSelected)) player.action('weapon_rifle_shoot');
                    else if (player.weaponSelected === 'bazooka') player.action('weapon_bazooka_shoot');
                } else if (actionName === 'kick') {
                    if (['pipe', 'sausage', 'nunchucks', 'spear', 'greatsword'].includes(player.weaponSelected)) player.action('weapon_pipe_heavy');
                    else if (['rifle', 'bow'].includes(player.weaponSelected)) player.action('weapon_rifle_melee');
                    else if (player.weaponSelected === 'bazooka') player.action('weapon_bazooka_melee');
                } else {
                    if (actionName === 'special') {
                        if (player.sp >= 100) player.action('super');
                        else if (state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']) player.action('special_rise');
                        else player.action('projectile');
                    }
                    else if (actionName === 'throw') { player.action('throw') }
                    else if (actionName === 'weapon') { triggerWeapon(player) }
                }
                return;
            }
            if (actionName === 'punch') { 
                if (player.state === 'crouch') player.action('uppercut');
                else if (player.isJumping) player.action('jump_punch');
                else player.action('punch');
            }
            else if (actionName === 'kick') { 
                if (player.state === 'crouch' || player.isBlocking) player.action('sweep');
                else if (player.isJumping) player.action('jump_kick');
                else player.action('kick');
            }
            else if (actionName === 'special') {
                if (player.sp >= 100) player.action('super');
                else if (state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']) player.action('special_rise');
                else player.action('projectile');
            }
            else if (actionName === 'throw') { player.action('throw') }
            else if (actionName === 'weapon') { triggerWeapon(player) }
        }
        function holdAction(player, actionName) {
            if (!player) return;
            if (actionName === 'lightning_strike') {
                const randVal = Math.random();
                let strikeX = Math.random() * CANVAS.width;
                const p1 = state.player;
                const p2 = state.bot;
                if (p1 && p2) {
                    if (randVal < 0.35) {
                        strikeX = p1.x + p1.width / 2;
                    } else if (randVal < 0.70) {
                        strikeX = p2.x + p2.width / 2;
                    }
                }
                state.projectiles.push(new Projectile(strikeX, -40, 0, '#00ffff', 'lightning_bolt', null, 24.0));
                AudioSys.superHit();
                state.screenShake = Math.max(state.screenShake, 15);
                if (state.isOnline) {
                    sendNetData({
                        type: 'spawn_projectile',
                        projType: 'lightning_bolt',
                        x: strikeX,
                        y: -40,
                        vx: 0,
                        vy: 24.0,
                        color: '#00ffff',
                        ownerId: null
                    });
                }
                return;
            }
            if (player.weaponSelected && player.weaponSelected !== 'none') {
                if (actionName === 'weapon') { cycleWeapon(player); return; }
                if (actionName === 'punch') {
                    if (['pipe', 'sausage', 'nunchucks', 'spear', 'greatsword'].includes(player.weaponSelected)) player.action('weapon_pipe_spin');
                    else if (['rifle', 'bow'].includes(player.weaponSelected)) player.action('weapon_rifle_burst');
                    else if (player.weaponSelected === 'bazooka') player.action('weapon_bazooka_charged');
                } else if (actionName === 'kick') {
                    if (['pipe', 'sausage', 'nunchucks', 'spear', 'greatsword'].includes(player.weaponSelected)) player.action('weapon_pipe_heavy');
                    else if (['rifle', 'bow'].includes(player.weaponSelected)) player.action('weapon_rifle_melee');
                    else if (player.weaponSelected === 'bazooka') player.action('weapon_bazooka_melee');
                } else {
                    tapAction(player, actionName);
                }
                return;
            }
            if (actionName === 'punch') { player.action('hook') }
            else if (actionName === 'kick') { player.action('heavy_kick') }
            else if (actionName === 'special') player.action('flip');
            else if (actionName === 'throw') player.action('throw');
            else if (actionName === 'weapon') cycleWeapon(player);
        }
        function beginGesture(id, onTap, onHold, holdMs = 260) {
            const existing = state.controlGestures[id];
            if (existing) clearTimeout(existing.timer);
            const gesture = { resolved: false, holdTriggered: false, onTap, onHold, timer: null };
            gesture.timer = setTimeout(() => {
                gesture.holdTriggered = true;
                gesture.resolved = true;
                if (typeof gesture.onHold === 'function') gesture.onHold();
            }, holdMs);
            state.controlGestures[id] = gesture;
        }
        function endGesture(id) {
            const gesture = state.controlGestures[id];
            if (!gesture) return;
            clearTimeout(gesture.timer);
            if (!gesture.holdTriggered && typeof gesture.onTap === 'function') gesture.onTap();
            delete state.controlGestures[id];
        }
        function processInput() {
            if (state.isOnline) {
                const p = state.isHost ? state.player : state.bot;
                const opp = state.isHost ? state.bot : state.player;
                if (!p || p.state === 'dead' || p.state === 'hitstun' || p.state === 'launched' || p.state === 'knockdown' || state.isMatchEnding) return;
                
                if (p.state !== 'dash') {
                    if (!p.isJumping) { p.vx = 0 }
                    p.isBlocking = false;
                    const opponentOnRight = (opp.x > p.x);
                    const movingBack = (opponentOnRight && (state.keys['a'] || state.keys['A'] || state.keys['ArrowLeft'])) || (!opponentOnRight && (state.keys['d'] || state.keys['D'] || state.keys['ArrowRight']));
                    if (movingBack) { p.isBlocking = true }
                    if (p.attackState === 0) {
                        p.state = 'idle';
                        
                        const crouchKey = state.keys['s'] || state.keys['S'] || state.keys['KeyS'] || state.keys['ArrowDown'];
                        const leftKey = state.keys['a'] || state.keys['A'] || state.keys['KeyA'] || state.keys['ArrowLeft'];
                        const rightKey = state.keys['d'] || state.keys['D'] || state.keys['KeyD'] || state.keys['ArrowRight'];
                        const jumpKey = state.keys[' '] || state.keys['Space'];
                        const uppercutKey = state.keys['w'] || state.keys['W'] || state.keys['KeyW'];
                        const oldJumpKey = state.keys['ArrowUp'];

                        if (crouchKey && (leftKey || rightKey)) {
                            p.action('sweep');
                        } else if (crouchKey) {
                            p.state = 'crouch'; p.vx = 0;
                        } else {
                            if (leftKey) { p.vx = -4.2; p.isLeft = false; p.state = 'move' }
                            if (rightKey) { p.vx = 4.2; p.isLeft = true; p.state = 'move' }
                            
                            if (uppercutKey && !p.isJumping) {
                                p.action('uppercut');
                            } else if (jumpKey && !p.isJumping) {
                                if (leftKey || rightKey) {
                                    p.action('flip');
                                } else {
                                    p.vy = -13.0; p.isJumping = true; p.isVerticalJump = true;
                                }
                            } else if (oldJumpKey && !p.isJumping) {
                                p.vy = -13.0; p.isJumping = true;
                                if (leftKey) { p.vx = -4.2; p.isVerticalJump = false }
                                else if (rightKey) { p.vx = 4.2; p.isVerticalJump = false }
                                else { p.isVerticalJump = true }
                            }
                        }
                    }
                }
                return;
            }

            const p = state.player; if (!p || p.state === 'dead' || p.state === 'hitstun' || p.state === 'launched' || p.state === 'knockdown' || state.isMatchEnding) return;
            if (p.state !== 'dash') {
                if (!p.isJumping) { p.vx = 0 }
                p.isBlocking = false; const opponentOnRight = (state.bot.x > p.x);
                const movingBack = (opponentOnRight && (state.keys['a'] || state.keys['A'] || (state.difficulty !== 'pvp' && state.keys['ArrowLeft']))) || (!opponentOnRight && (state.keys['d'] || state.keys['D'] || (state.difficulty !== 'pvp' && state.keys['ArrowRight'])));
                if (movingBack) { p.isBlocking = true }
                if (p.attackState === 0) {
                    p.state = 'idle';
                    
                    const crouchKey = state.keys['s'] || state.keys['S'] || state.keys['KeyS'] || (state.difficulty !== 'pvp' && state.keys['ArrowDown']);
                    const leftKey = state.keys['a'] || state.keys['A'] || state.keys['KeyA'] || (state.difficulty !== 'pvp' && state.keys['ArrowLeft']);
                    const rightKey = state.keys['d'] || state.keys['D'] || state.keys['KeyD'] || (state.difficulty !== 'pvp' && state.keys['ArrowRight']);
                    const jumpKey = state.keys[' '] || state.keys['Space'];
                    const uppercutKey = state.keys['w'] || state.keys['W'] || state.keys['KeyW'];
                    const oldJumpKey = (state.difficulty !== 'pvp' && state.keys['ArrowUp']);

                    if (crouchKey && (leftKey || rightKey)) {
                        p.action('sweep');
                    } else if (crouchKey) {
                        p.state = 'crouch'; p.vx = 0;
                    } else {
                        if (leftKey) { p.vx = -4.2; p.isLeft = false; p.state = 'move' }
                        if (rightKey) { p.vx = 4.2; p.isLeft = true; p.state = 'move' }
                        
                        if (uppercutKey && !p.isJumping) {
                            p.action('uppercut');
                        } else if (jumpKey && !p.isJumping) {
                            if (leftKey || rightKey) {
                                p.action('flip');
                            } else {
                                p.vy = -13.0; p.isJumping = true; p.isVerticalJump = true;
                            }
                        } else if (oldJumpKey && !p.isJumping) {
                            p.vy = -13.0; p.isJumping = true;
                            if (leftKey) { p.vx = -4.2; p.isVerticalJump = false }
                            else if (rightKey) { p.vx = 4.2; p.isVerticalJump = false }
                            else { p.isVerticalJump = true }
                        }
                    }
                }
            }

            if (state.difficulty === 'pvp') {
                const p2 = state.bot; if (!p2 || p2.state === 'dead' || p2.state === 'hitstun' || p2.state === 'launched' || p2.state === 'knockdown' || state.isMatchEnding) return;
                if (p2.state !== 'dash') {
                    if (!p2.isJumping) { p2.vx = 0 }
                    p2.isBlocking = false; const p2OpponentOnRight = (state.player.x > p2.x);
                    const p2MovingBack = (p2OpponentOnRight && state.keys['ArrowLeft']) || (!p2OpponentOnRight && state.keys['ArrowRight']);
                    if (p2MovingBack) { p2.isBlocking = true }
                    if (p2.attackState === 0) {
                        p2.state = 'idle';
                        
                        const crouchKey2 = state.keys['ArrowDown'];
                        const leftKey2 = state.keys['ArrowLeft'];
                        const rightKey2 = state.keys['ArrowRight'];
                        const jumpKey2 = state.keys['ArrowUp'];

                        if (crouchKey2 && (leftKey2 || rightKey2)) {
                            p2.action('sweep');
                        } else if (crouchKey2) {
                            p2.state = 'crouch'; p2.vx = 0;
                        } else {
                            if (leftKey2) { p2.vx = -4.2; p2.isLeft = false; p2.state = 'move' }
                            if (rightKey2) { p2.vx = 4.2; p2.isLeft = true; p2.state = 'move' }
                            
                            if (jumpKey2 && !p2.isJumping) {
                                if (leftKey2 || rightKey2) {
                                    p2.action('flip');
                                } else {
                                    p2.vy = -13.0; p2.isJumping = true; p2.isVerticalJump = true;
                                }
                            }
                        }
                    }
                }
            }
        }
        function cancelGesture(id) {
            const gesture = state.controlGestures[id];
            if (!gesture) return;
            clearTimeout(gesture.timer);
            delete state.controlGestures[id];
        }
        window.addEventListener('wheel', handleWheel, { passive: false });
        if (typeof CANVAS !== 'undefined' && CANVAS) {
            CANVAS.addEventListener('wheel', handleWheel, { passive: false });
        }
        function initMobileControls() {
            const usePointer = 'PointerEvent' in window;
            const bindBtn = (id, keyName) => {
                const btn = document.getElementById(id); if (!btn) return;
                const press = (e) => { 
                    if (e.cancelable) e.preventDefault(); 
                    triggerHaptic(15); 
                    state.keys[keyName] = true;
                    
                    const p = (state.isOnline) ? ((state.isHost) ? state.player : state.bot) : state.player;
                    if (p && p.state !== 'dead' && p.state !== 'hitstun' && p.state !== 'launched' && p.state !== 'knockdown' && p.attackState === 0 && !state.isMatchEnding) {
                        const now = Date.now();
                        if (keyName === 'ArrowRight') {
                            if (now - p.lastTapTime.right < 240) {
                                p.state = 'dash'; p.dashTimer = 10; p.vx = 13.0; p.isLeft = true;
                                AudioSys.whoosh();
                                showFloatingText("DASH!", p.x + 15, p.y - 10, '#00ffcc');
                            }
                            p.lastTapTime.right = now;
                        } else if (keyName === 'ArrowLeft') {
                            if (now - p.lastTapTime.left < 240) {
                                p.state = 'dash'; p.dashTimer = 10; p.vx = -13.0; p.isLeft = false;
                                AudioSys.whoosh();
                                showFloatingText("DASH!", p.x + 15, p.y - 10, '#00ffcc');
                            }
                            p.lastTapTime.left = now;
                        }
                    }
                };
                const release = (e) => { if (e.cancelable) e.preventDefault(); state.keys[keyName] = false };
                if (usePointer) {
                    btn.addEventListener('pointerdown', press, { passive: false });
                    btn.addEventListener('pointerup', release, { passive: false });
                    btn.addEventListener('pointercancel', release, { passive: false });
                    btn.addEventListener('pointerleave', release, { passive: false });
                } else {
                    btn.addEventListener('touchstart', press, { passive: false });
                    btn.addEventListener('touchend', release, { passive: false });
                    btn.addEventListener('touchcancel', release, { passive: false });
                }
            };
            const bindActionBtn = (id, actionName) => {
                const btn = document.getElementById(id); if (!btn) return;
                const press = (e) => {
                    if (e.cancelable) e.preventDefault(); triggerHaptic(20);
                    const localP = (state.isOnline && !state.isHost) ? state.bot : state.player;
                    beginGesture(`btn:${id}`,
                        () => {
                            if (!localP) return;
                            if (actionName === 'weapon') { tapAction(localP, 'weapon'); return }
                            if (actionName === 'special') { tapAction(localP, 'special'); return }
                            tapAction(localP, actionName);
                        },
                        () => {
                            if (!localP) return;
                            if (actionName === 'weapon') { holdAction(localP, 'weapon'); return }
                            if (actionName === 'special') { holdAction(localP, 'special'); return }
                            holdAction(localP, actionName);
                        },
                        actionName === 'special' ? 240 : 260
                    );
                };
                const release = (e) => { if (e.cancelable) e.preventDefault(); endGesture(`btn:${id}`) };
                if (usePointer) {
                    btn.addEventListener('pointerdown', press, { passive: false });
                    btn.addEventListener('pointerup', release, { passive: false });
                    btn.addEventListener('pointercancel', release, { passive: false });
                    btn.addEventListener('pointerleave', release, { passive: false });
                } else {
                    btn.addEventListener('touchstart', press, { passive: false });
                    btn.addEventListener('touchend', release, { passive: false });
                    btn.addEventListener('touchcancel', release, { passive: false });
                }
            };
            bindBtn('m-left', 'ArrowLeft'); bindBtn('m-right', 'ArrowRight'); bindBtn('m-up', 'ArrowUp'); bindBtn('m-down', 'ArrowDown');
            bindActionBtn('m-punch', 'punch'); bindActionBtn('m-kick', 'kick'); bindActionBtn('m-special', 'special'); bindActionBtn('m-throw', 'throw'); bindActionBtn('m-weapon', 'weapon');
        }
