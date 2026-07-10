        const CANVAS = document.getElementById('gameCanvas');
        const CTX = CANVAS.getContext('2d');
        const GROUND_Y = 450;
        const GRAVITY = 0.55;
        // Safely load economy items from LocalStorage
        const getCoins = () => parseInt(localStorage.getItem('truhanov_coins') || '200'); // Start with 200 free coins
        const getOwnedWeapons = () => JSON.parse(localStorage.getItem('truhanov_owned_weapons') || '["none", "pipe", "pistol", "rifle", "bazooka", "sword"]');
        const getEquippedWeapon = () => localStorage.getItem('truhanov_equipped_weapon') || 'none';
        const getOwnedSkins = () => JSON.parse(localStorage.getItem('truhanov_owned_skins') || '["default"]');
        const getEquippedSkin = () => localStorage.getItem('truhanov_equipped_skin') || 'default';
        const getOwnedLevels = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // All levels unlocked by default!
        const getUpgrades = () => JSON.parse(localStorage.getItem('truhanov_upgrades') || '{"hp":0,"dmg":0,"charge":0}');
        const getWinStreak = () => parseInt(localStorage.getItem('truhanov_win_streak') || '0');

        LEVELS.forEach(lvl => { lvl.img = new Image(); lvl.img.src = lvl.src; });
        let state = {
            currentLevelIndex: 0, difficulty: 1, isRunning: false, player: null, bot: null, keys: {}, timer: 99, timerInterval: null,
            particles: [], projectiles: [], floatingTexts: [], roundNum: 1, p1Wins: 0, p2Wins: 0, isMatchEnding: false,
            finishHimStage: false, finishHimTimeout: null, screenShake: 0, hitstopFrames: 0, toastyTimer: 0, fatalityAnimation: null,
            controlGestures: {}, inputLock: false, frameCount: 0, hintTimeout: null,
            isOnline: false, isHost: false, netReady: false, opponentCharId: null, peer: null, netConn: null,
            // Shop & economy states
            coins: getCoins(),
            ownedWeapons: getOwnedWeapons(),
            equippedWeapon: getEquippedWeapon(),
            ownedSkins: getOwnedSkins(),
            equippedSkin: getEquippedSkin(),
            ownedLevels: getOwnedLevels(),
            upgrades: getUpgrades(),
            winStreak: getWinStreak()
        };
        let AI_ENGINE;
        window.addEventListener('keydown', (e) => { if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0) { e.preventDefault() } });
        const keyboardGestureMap = {
            // Primary: E (punch/hook), F (kick), R (special/projectile), Q (throw)
            e:    { tap: 'punch',   hold: 'hook' },
            f:    { tap: 'kick',    hold: 'heavy_kick' },
            r:    { tap: 'special', hold: 'special_slide' },
            q:    { tap: 'throw',   hold: 'throw' },
                        '4': { tap: 'punch', hold: 'hook' },
            'numpad4': { tap: 'punch', hold: 'hook' },
            '5': { tap: 'kick', hold: 'heavy_kick' },
            'numpad5': { tap: 'kick', hold: 'heavy_kick' },
            '6': { tap: 'special', hold: 'special_slide' },
            'numpad6': { tap: 'special', hold: 'special_slide' },
            '8': { tap: 'throw', hold: 'throw' },
            '0': { tap: 'weapon', hold: 'weapon' },
            'numpad0': { tap: 'weapon', hold: 'weapon' },
            'numpad8': { tap: 'throw', hold: 'throw' },
            // Aliases: J / K / L (classic fighting game layout)
            j:    { tap: 'punch',   hold: 'hook' },
            k:    { tap: 'kick',    hold: 'heavy_kick' },
            l:    { tap: 'special', hold: 'special_slide' },
            u:    { tap: 'special', hold: 'special' },
            // Weapon triggers
            i:    { tap: 'weapon',  hold: 'weapon' },
            c:    { tap: 'weapon',  hold: 'weapon' },
            shift:{ tap: 'sky_figures',  hold: 'lightning_strike' },
            // Code-based (keyboard-layout-independent)
            keye: { tap: 'punch',   hold: 'hook' },
            keyf: { tap: 'kick',    hold: 'heavy_kick' },
            keyr: { tap: 'special', hold: 'special_slide' },
            keyq: { tap: 'throw',   hold: 'throw' },
            keyj: { tap: 'punch',   hold: 'hook' },
            keyk: { tap: 'kick',    hold: 'heavy_kick' },
            keyl: { tap: 'special', hold: 'special_slide' },
            keyi: { tap: 'weapon',  hold: 'weapon' },
            keyc: { tap: 'weapon',  hold: 'weapon' },
            shiftleft: { tap: 'sky_figures', hold: 'lightning_strike' }
        };
        window.addEventListener('keydown', (e) => {
            state.keys[e.key] = true;
            if (e.code) state.keys[e.code] = true;
            const key = e.key.toLowerCase();
            const code = e.code ? e.code.toLowerCase() : '';
            const now = Date.now();
            
            const localP = (state.isOnline) ? ((state.isHost) ? state.player : state.bot) : state.player;
            if (localP && localP.state !== 'dead' && localP.state !== 'hitstun' && localP.state !== 'launched' && localP.state !== 'knockdown' && localP.attackState === 0 && !state.isMatchEnding) {
                const isDashRight = key === 'd' || code === 'keyd' || (!state.isOnline && state.difficulty !== 'pvp' && key === 'arrowright');
                const isDashLeft = key === 'a' || code === 'keya' || (!state.isOnline && state.difficulty !== 'pvp' && key === 'arrowleft');
                if (isDashRight) {
                    if (now - localP.lastTapTime.right < 240) { localP.state = 'dash'; localP.dashTimer = 11; localP.vx = 8.6; localP.isLeft = true; AudioSys.whoosh(); showFloatingText("DASH!", localP.x + 15, localP.y - 10, '#00ffcc'); }
                    localP.lastTapTime.right = now;
                } else if (isDashLeft) {
                    if (now - localP.lastTapTime.left < 240) { localP.state = 'dash'; localP.dashTimer = 11; localP.vx = -8.6; localP.isLeft = false; AudioSys.whoosh(); showFloatingText("DASH!", localP.x + 15, localP.y - 10, '#00ffcc'); }
                    localP.lastTapTime.left = now;
                }
            }
            
            if (!state.isOnline && state.difficulty === 'pvp') {
                const p2 = state.bot;
                if (p2 && p2.state !== 'dead' && p2.state !== 'hitstun' && p2.state !== 'launched' && p2.state !== 'knockdown' && p2.attackState === 0 && !state.isMatchEnding) {
                    if (key === 'arrowright') {
                        if (now - p2.lastTapTime.right < 240) { p2.state = 'dash'; p2.dashTimer = 11; p2.vx = 8.6; p2.isLeft = true; AudioSys.whoosh(); showFloatingText("DASH!", p2.x + 15, p2.y - 10, '#00ffcc'); }
                        p2.lastTapTime.right = now;
                    } else if (key === 'arrowleft') {
                        if (now - p2.lastTapTime.left < 240) { p2.state = 'dash'; p2.dashTimer = 11; p2.vx = -8.6; p2.isLeft = false; AudioSys.whoosh(); showFloatingText("DASH!", p2.x + 15, p2.y - 10, '#00ffcc'); }
                        p2.lastTapTime.left = now;
                    }
                }
            }
            
            const mapping = keyboardGestureMap[key] || keyboardGestureMap[code];
            if (mapping && !e.repeat) {
                const isP2Key = ['0','4','5','6','8','numpad0','numpad4','numpad5','numpad6','numpad8'].includes(key) || ['numpad4','numpad5','numpad6','numpad8'].includes(code);
                let targetPlayer = state.player;
                let shouldProcess = true;
                
                if (state.isOnline) {
                    targetPlayer = state.isHost ? state.player : state.bot;
                    if (isP2Key) shouldProcess = false;
                } else {
                    targetPlayer = (state.difficulty === 'pvp' && isP2Key) ? state.bot : state.player;
                    shouldProcess = !isP2Key || state.difficulty === 'pvp';
                }
                
                if (shouldProcess) {
                    beginGesture(`key:${e.code || e.key}`, () => tapAction(targetPlayer, mapping.tap), () => holdAction(targetPlayer, mapping.hold), key === ' ' || code === 'space' ? 220 : 250);
                }
            }
        });
        window.addEventListener('keyup', (e) => {
            state.keys[e.key] = false;
            if (e.code) state.keys[e.code] = false;
            endGesture(`key:${e.code || e.key}`);
        });
        // ─── MOUSE CONTROLS ──────────────────────────────────────
        if (!state.mouseButtons) {
            state.mouseButtons = { left: false, right: false };
        }
        window.addEventListener('contextmenu', (e) => {
            if (state.isRunning) e.preventDefault();
        });
        window.addEventListener('mousedown', (e) => {
            const p = (state.isOnline && !state.isHost) ? state.bot : state.player;
            if (!state.isRunning || !p || p.state === 'dead' || state.isMatchEnding) return;
            if (e.target.tagName === 'BUTTON' || e.target.closest('#res-screen') || e.target.closest('#screen-menu')) return;
            if (state.difficulty === 'pvp' && !state.isOnline) return;
            
            if (e.button === 0) {
                state.mouseButtons.left = true;
            } else if (e.button === 2) {
                state.mouseButtons.right = true;
                e.preventDefault();
            } else if (e.button === 1) { // Middle click -> Blue water projectile orb
                e.preventDefault();
                AudioSys.projectileLaunch();
                const pDir = p.isLeft ? 1 : -1;
                state.projectiles.push(new Projectile(p.x + p.width / 2 + 45 * pDir, p.y + 40, pDir * 9.0, '#00ccff', 'water', p));
                if (state.isOnline) {
                    sendNetData({
                        type: 'spawn_projectile',
                        projType: 'water',
                        x: p.x + p.width / 2 + 45 * pDir,
                        y: p.y + 40,
                        vx: pDir * 9.0,
                        color: '#00ccff'
                    });
                }
                return;
            } else {
                return;
            }
            if (state.mouseButtons.left && state.mouseButtons.right) {
                cancelGesture('mouse:left');
                cancelGesture('mouse:right');
                beginGesture('mouse:throw', () => tapAction(p, 'throw'), () => holdAction(p, 'throw'), 250);
            } else if (state.mouseButtons.left) {
                beginGesture('mouse:left', () => tapAction(p, 'punch'), () => holdAction(p, 'punch'), 250);
            } else if (state.mouseButtons.right) {
                beginGesture('mouse:right', () => tapAction(p, 'kick'), () => holdAction(p, 'kick'), 250);
            }
        });
        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                state.mouseButtons.left = false;
                endGesture('mouse:left');
            } else if (e.button === 2) {
                state.mouseButtons.right = false;
                endGesture('mouse:right');
            }
            if (!state.mouseButtons.left || !state.mouseButtons.right) {
                endGesture('mouse:throw');
            }
        });
        let lastWheelTime = 0;
        const handleWheel = (e) => {
            if (!state.isRunning || !state.player || state.player.state === 'dead' || state.isMatchEnding) return;
            // Prevent scrolling page when playing
            e.preventDefault();
            const now = Date.now();
            if (now - lastWheelTime < 180) return; // Cooldown to prevent scroll-spamming
            lastWheelTime = now;
            cycleWeapon(state.player);
        };