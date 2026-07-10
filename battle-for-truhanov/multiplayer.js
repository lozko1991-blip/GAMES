        // Мережева технологія (PeerJS) та синхронізація
        function updateOnlineStatus(text) {
            const el = document.getElementById('online-status');
            if (el) el.innerText = text;
        }

        function onDiffChange(val) {
            const panel = document.getElementById('online-panel');
            if (val === 'online') {
                panel.classList.remove('hidden');
                updateOnlineStatus("Оберіть роль для початку");
            } else {
                panel.classList.add('hidden');
                resetOnlineState();
            }
        }

        function resetOnlineState() {
            state.isOnline = false;
            state.isHost = false;
            state.netReady = false;
            state.opponentCharId = null;
            if (state.netConn) {
                state.netConn.close();
                state.netConn = null;
            }
            if (state.peer) {
                state.peer.destroy();
                state.peer = null;
            }
            updateOnlineStatus("Оберіть роль для початку");
            document.getElementById('host-info').classList.add('hidden');
            document.getElementById('room-id-display').innerText = "Завантаження...";
            document.getElementById('join-room-id').value = "";
        }

        function joinLobby(num) {
            resetOnlineState();
            state.isOnline = true;
            const lobbyId = 'truhanov-lobby-' + num;
            
            updateOnlineStatus(`Підключення до Лобі ${num}...`);
            
            // Try to act as the Host first
            state.peer = new Peer(lobbyId);
            
            state.peer.on('open', (id) => {
                state.isHost = true;
                updateOnlineStatus(`Ви зайшли в Лобі ${num} як ХОСТ. Очікування суперника...`);
                showFloatingText(`ЛОБІ ${num}: ХОСТ`, CANVAS.width / 2 - 80, CANVAS.height / 2, '#00ffcc');
            });
            
            state.peer.on('connection', (conn) => {
                state.netConn = conn;
                setupConnection();
            });
            
            state.peer.on('error', (err) => {
                if (err.type === 'unavailable-id') {
                    // Lobby already has a host! Connect as Guest.
                    updateOnlineStatus(`Лобі ${num} зайняте. Підключаємось як ГІСТЬ...`);
                    
                    if (state.peer) {
                        state.peer.destroy();
                        state.peer = null;
                    }
                    
                    state.peer = new Peer();
                    state.peer.on('open', (id) => {
                        state.isHost = false;
                        state.netConn = state.peer.connect(lobbyId);
                        setupConnection();
                        showFloatingText(`ЛОБІ ${num}: ГІСТЬ`, CANVAS.width / 2 - 80, CANVAS.height / 2, '#ffcc00');
                    });
                    
                    state.peer.on('error', (guestErr) => {
                        console.error("Guest Peer error:", guestErr);
                        updateOnlineStatus("Помилка лобі: " + guestErr.type);
                    });
                } else {
                    console.error("Host Peer error:", err);
                    updateOnlineStatus("Помилка з'єднання: " + err.type);
                }
            });
        }

        function hostRoom() {
            resetOnlineState();
            state.isOnline = true;
            state.isHost = true;
            
            updateOnlineStatus("Ініціалізація PeerJS...");
            const shortCode = Math.floor(10000 + Math.random() * 90000).toString();
            const peerId = 'truhanov-' + shortCode;
            
            state.peer = new Peer(peerId);
            
            state.peer.on('open', (id) => {
                document.getElementById('host-info').classList.remove('hidden');
                document.getElementById('room-id-display').innerText = shortCode;
                updateOnlineStatus("Кімнату створено. Очікування клієнта...");
            });
            
            state.peer.on('connection', (conn) => {
                state.netConn = conn;
                setupConnection();
            });
            
            state.peer.on('error', (err) => {
                console.error("Peer error:", err);
                updateOnlineStatus("Помилка з'єднання: " + err.type);
            });
        }

        function joinRoom() {
            resetOnlineState();
            const code = document.getElementById('join-room-id').value.trim();
            if (!code) {
                updateOnlineStatus("Будь ласка, введіть код кімнати!");
                return;
            }
            
            state.isOnline = true;
            state.isHost = false;
            updateOnlineStatus("Підключення до сигнального сервера...");
            
            state.peer = new Peer();
            
            state.peer.on('open', (id) => {
                updateOnlineStatus("З'єднання з кімнатою " + code + "...");
                const hostPeerId = 'truhanov-' + code;
                state.netConn = state.peer.connect(hostPeerId);
                setupConnection();
            });
            
            state.peer.on('error', (err) => {
                console.error("Peer error:", err);
                updateOnlineStatus("Помилка підключення до сервера.");
            });
        }

        function setupConnection() {
            state.netConn.on('open', () => {
                updateOnlineStatus("Підключено! Обмін персонажами...");
                const localChar = document.getElementById('char-select').value;
                sendNetData({
                    type: 'handshake',
                    charId: localChar
                });
            });
            
            state.netConn.on('data', (data) => {
                handleNetMessage(data);
            });
            
            state.netConn.on('close', () => {
                updateOnlineStatus("З'єднання розірвано супротивником.");
                resetOnlineState();
            });
            
            state.netConn.on('error', (err) => {
                console.error("Connection error:", err);
                updateOnlineStatus("Помилка передачі даних.");
                resetOnlineState();
            });
        }

        function sendNetData(data) {
            if (state.isOnline && state.netConn && state.netConn.open) {
                state.netConn.send(data);
            }
        }

        function handleNetMessage(packet) {
            if (!packet || !packet.type) return;
            
            switch (packet.type) {
                case 'handshake':
                    state.opponentCharId = packet.charId;
                    state.netReady = true;
                    updateOnlineStatus("Готово! Супротивник обрав: " + CHARACTERS[packet.charId].name);
                    break;
                    
                case 'start_game':
                    state.opponentCharId = packet.hostCharId;
                    state.currentLevelIndex = packet.levelIndex;
                    state.difficulty = packet.difficulty;
                    startGame();
                    break;
                    
                case 'start_round':
                    state.currentLevelIndex = packet.levelIndex;
                    state.roundNum = packet.roundNum;
                    if (packet.roundNum === 1) {
                        state.p1Wins = 0;
                        state.p2Wins = 0;
                    }
                    document.getElementById('screen-result').classList.add('hidden');
                    startNewRoundSequence();
                    break;
                    
                case 'sync':
                    if (state.isHost) {
                        const p2 = state.bot;
                        if (p2 && packet.p2) {
                            p2.x = packet.p2.x;
                            p2.y = packet.p2.y;
                            p2.vx = packet.p2.vx;
                            p2.vy = packet.p2.vy;
                            p2.state = packet.p2.state;
                            p2.attackState = packet.p2.attackState;
                            p2.attackTimer = packet.p2.attackTimer;
                            p2.isLeft = packet.p2.isLeft;
                            p2.isBlocking = packet.p2.isBlocking;
                            p2.weaponTimer = packet.p2.weaponTimer;
                            p2.weaponActiveType = packet.p2.weaponActiveType;
                            p2.weaponCharge = packet.p2.weaponCharge;
                            p2.weaponSelected = packet.p2.weaponSelected;
                            p2.lassoActive = packet.p2.lassoActive;
                            p2.lassoTargetX = packet.p2.lassoTargetX;
                            p2.lassoTargetY = packet.p2.lassoTargetY;
                            p2.lassoType = packet.p2.lassoType;
                        }
                    } else {
                        const p1 = state.player;
                        const p2 = state.bot;
                        
                        if (p1 && packet.p1) {
                            p1.x = packet.p1.x;
                            p1.y = packet.p1.y;
                            p1.vx = packet.p1.vx;
                            p1.vy = packet.p1.vy;
                            p1.state = packet.p1.state;
                            p1.attackState = packet.p1.attackState;
                            p1.attackTimer = packet.p1.attackTimer;
                            p1.isLeft = packet.p1.isLeft;
                            p1.isBlocking = packet.p1.isBlocking;
                            p1.hp = packet.p1.hp;
                            p1.sp = packet.p1.sp;
                            p1.weaponTimer = packet.p1.weaponTimer;
                            p1.weaponActiveType = packet.p1.weaponActiveType;
                            p1.weaponCharge = packet.p1.weaponCharge;
                            p1.weaponSelected = packet.p1.weaponSelected;
                            p1.lassoActive = packet.p1.lassoActive;
                            p1.lassoTargetX = packet.p1.lassoTargetX;
                            p1.lassoTargetY = packet.p1.lassoTargetY;
                            p1.lassoType = packet.p1.lassoType;
                        }
                        
                        if (p2 && packet.p2) {
                            p2.x = packet.p2.x;
                            p2.y = packet.p2.y;
                            p2.vx = packet.p2.vx;
                            p2.vy = packet.p2.vy;
                            p2.state = packet.p2.state;
                            p2.attackState = packet.p2.attackState;
                            p2.attackTimer = packet.p2.attackTimer;
                            p2.isLeft = packet.p2.isLeft;
                            p2.isBlocking = packet.p2.isBlocking;
                            p2.hp = packet.p2.hp;
                            p2.sp = packet.p2.sp;
                            p2.weaponTimer = packet.p2.weaponTimer;
                            p2.weaponActiveType = packet.p2.weaponActiveType;
                            p2.weaponCharge = packet.p2.weaponCharge;
                            p2.weaponSelected = packet.p2.weaponSelected;
                            p2.lassoActive = packet.p2.lassoActive;
                            p2.lassoTargetX = packet.p2.lassoTargetX;
                            p2.lassoTargetY = packet.p2.lassoTargetY;
                            p2.lassoType = packet.p2.lassoType;
                        }
                        
                        if (packet.timer !== undefined) {
                            state.timer = packet.timer;
                            document.getElementById('timer').innerText = state.timer;
                        }
                        
                        updateHUD();
                    }
                    break;
                    
                case 'spawn_projectile':
                    let owner = null;
                    if (packet.ownerId === 'p1') {
                        owner = state.player;
                    } else if (packet.ownerId === 'p2') {
                        owner = state.bot;
                    } else if (packet.ownerId === undefined) {
                        owner = state.isHost ? state.bot : state.player;
                    }
                    AudioSys.projectileLaunch();
                    const newProj = new Projectile(packet.x, packet.y, packet.vx, packet.color, packet.projType, owner, packet.vy || 0);
                    state.projectiles.push(newProj);
                    break;
                    
                case 'hit_effect':
                    if (!state.isHost) {
                        const attacker = (packet.attackerId === 'p1') ? state.player : state.bot;
                        const defender = (packet.defenderId === 'p1') ? state.player : state.bot;
                        if (attacker && defender) {
                            applyHit(attacker, defender, packet.dmg, packet.hitType, true);
                        }
                    }
                    break;
            }
        }

        function syncMultiplayer() {
            if (!state.isOnline || !state.netConn || !state.netReady) return;
            
            if (state.isHost) {
                if (!state.player || !state.bot) return;
                sendNetData({
                    type: 'sync',
                    p1: {
                        x: state.player.x,
                        y: state.player.y,
                        vx: state.player.vx,
                        vy: state.player.vy,
                        state: state.player.state,
                        attackState: state.player.attackState,
                        attackTimer: state.player.attackTimer,
                        isLeft: state.player.isLeft,
                        isBlocking: state.player.isBlocking,
                        hp: state.player.hp,
                        sp: state.player.sp,
                        weaponTimer: state.player.weaponTimer,
                        weaponActiveType: state.player.weaponActiveType,
                        weaponCharge: state.player.weaponCharge,
                        weaponSelected: state.player.weaponSelected,
                        lassoActive: state.player.lassoActive,
                        lassoTargetX: state.player.lassoTargetX,
                        lassoTargetY: state.player.lassoTargetY,
                        lassoType: state.player.lassoType
                    },
                    p2: {
                        x: state.bot.x,
                        y: state.bot.y,
                        vx: state.bot.vx,
                        vy: state.bot.vy,
                        state: state.bot.state,
                        attackState: state.bot.attackState,
                        attackTimer: state.bot.attackTimer,
                        isLeft: state.bot.isLeft,
                        isBlocking: state.bot.isBlocking,
                        hp: state.bot.hp,
                        sp: state.bot.sp,
                        weaponTimer: state.bot.weaponTimer,
                        weaponActiveType: state.bot.weaponActiveType,
                        weaponCharge: state.bot.weaponCharge,
                        weaponSelected: state.bot.weaponSelected,
                        lassoActive: state.bot.lassoActive,
                        lassoTargetX: state.bot.lassoTargetX,
                        lassoTargetY: state.bot.lassoTargetY,
                        lassoType: state.bot.lassoType
                    },
                    timer: state.timer
                });
            } else {
                if (!state.bot) return;
                sendNetData({
                    type: 'sync',
                    p2: {
                        x: state.bot.x,
                        y: state.bot.y,
                        vx: state.bot.vx,
                        vy: state.bot.vy,
                        state: state.bot.state,
                        attackState: state.bot.attackState,
                        attackTimer: state.bot.attackTimer,
                        isLeft: state.bot.isLeft,
                        isBlocking: state.bot.isBlocking,
                        weaponTimer: state.bot.weaponTimer,
                        weaponActiveType: state.bot.weaponActiveType,
                        weaponCharge: state.bot.weaponCharge,
                        weaponSelected: state.bot.weaponSelected,
                        lassoActive: state.bot.lassoActive,
                        lassoTargetX: state.bot.lassoTargetX,
                        lassoTargetY: state.bot.lassoTargetY,
                        lassoType: state.bot.lassoType
                    }
                });
            }
        }

        // Add copy-on-click to room display
        document.addEventListener('DOMContentLoaded', () => {
            const display = document.getElementById('room-id-display');
            if (display) {
                display.addEventListener('click', () => {
                    const code = display.innerText;
                    if (code && code !== "Завантаження...") {
                        navigator.clipboard.writeText(code).then(() => {
                            updateOnlineStatus("Код кімнати " + code + " скопійовано!");
                            if (typeof showFloatingText === 'function') {
                                showFloatingText("СКОПІЙОВАНО!", CANVAS.width / 2 - 50, CANVAS.height / 2, '#00ffcc');
                            }
                        }).catch(err => {
                            console.error("Could not copy:", err);
                        });
                    }
                });
            }
        });

        // ─── UI BUTTON HANDLERS FOR GAME MODES ────────────────────
        function startSinglePlayerGame() {
            const diffVal = document.getElementById('diff-select').value;
            state.difficulty = diffVal;
            startGame();
        }

        function startLocalPvPGame() {
            state.difficulty = 'pvp';
            startGame();
        }

        function startOnlineGame() {
            state.difficulty = 'online';
            startGame();
        }

        function toggleCustomOnlinePanel() {
            const panel = document.getElementById('custom-online-panel');
            if (panel) {
                panel.classList.toggle('hidden');
            }
        }
