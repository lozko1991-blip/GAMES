/*********************************************************************
MULTIPLAYER MODULE (PeerJS WebRTC Sync Engine)
*********************************************************************/

const multiplayerState = {
    isOnline: false,
    isHost: false,
    role: null, // 'striker' або 'keeper'
    peer: null,
    conn: null,
    roomCode: null,
    opponentRole: null,
    opponentReady: false,
    localReady: false,
    netReady: false
};

function updateOnlineStatus(text) {
    const el = document.getElementById('online-status');
    if (el) el.innerText = text;
}

function resetOnlineState() {
    multiplayerState.isOnline = false;
    multiplayerState.isHost = false;
    multiplayerState.role = null;
    multiplayerState.opponentRole = null;
    multiplayerState.opponentReady = false;
    multiplayerState.localReady = false;
    multiplayerState.netReady = false;

    if (multiplayerState.conn) {
        multiplayerState.conn.close();
        multiplayerState.conn = null;
    }
    if (multiplayerState.peer) {
        multiplayerState.peer.destroy();
        multiplayerState.peer = null;
    }

    updateOnlineStatus("Очікування вибору");
    document.getElementById('host-info').classList.add('hidden');
    document.getElementById('room-id-display').innerText = "Завантаження...";
    document.getElementById('join-room-id').value = "";
}

function hostRoom() {
    resetOnlineState();
    multiplayerState.isOnline = true;
    multiplayerState.isHost = true;

    updateOnlineStatus("Ініціалізація PeerJS...");
    
    // Генеруємо 5-значний пін-код
    const shortCode = Math.floor(10000 + Math.random() * 90000).toString();
    const peerId = 'pm-' + shortCode;
    multiplayerState.roomCode = shortCode;

    multiplayerState.peer = new Peer(peerId);

    multiplayerState.peer.on('open', (id) => {
        document.getElementById('host-info').classList.remove('hidden');
        document.getElementById('room-id-display').innerText = shortCode;
        updateOnlineStatus("Очікування підключення суперника...");
    });

    multiplayerState.peer.on('connection', (connection) => {
        multiplayerState.conn = connection;
        setupConnection();
    });

    multiplayerState.peer.on('error', (err) => {
        console.error("PeerJS error:", err);
        updateOnlineStatus("Помилка з'єднання: " + err.type);
    });
}

function joinRoom() {
    resetOnlineState();
    const code = document.getElementById('join-room-id').value.trim();
    if (!code || code.length !== 5) {
        updateOnlineStatus("Введіть коректний 5-значний код!");
        return;
    }

    multiplayerState.isOnline = true;
    multiplayerState.isHost = false;
    multiplayerState.roomCode = code;

    updateOnlineStatus("Підключення до сигнального сервера...");

    multiplayerState.peer = new Peer();

    multiplayerState.peer.on('open', (id) => {
        updateOnlineStatus(`З'єднання з кімнатою ${code}...`);
        const hostPeerId = 'pm-' + code;
        multiplayerState.conn = multiplayerState.peer.connect(hostPeerId);
        setupConnection();
    });

    multiplayerState.peer.on('error', (err) => {
        console.error("PeerJS error:", err);
        updateOnlineStatus("Помилка підключення.");
    });
}

function setupConnection() {
    multiplayerState.conn.on('open', () => {
        updateOnlineStatus("Підключено! Оберіть роль...");
        showScreen('screen-select-role');
        document.getElementById('role-selection-status').innerText = "Очікування вашого вибору ролі...";
    });

    multiplayerState.conn.on('data', (data) => {
        handleNetMessage(data);
    });

    multiplayerState.conn.on('close', () => {
        updateOnlineStatus("Суперник відключився.");
        alert("З'єднання розірвано суперником.");
        resetOnlineState();
        showScreen('screen-main-menu');
    });

    multiplayerState.conn.on('error', (err) => {
        console.error("Connection error:", err);
        updateOnlineStatus("Помилка передачі даних.");
        resetOnlineState();
    });
}

function sendNetData(data) {
    if (multiplayerState.isOnline && multiplayerState.conn && multiplayerState.conn.open) {
        multiplayerState.conn.send(data);
    }
}

function selectRole(role) {
    multiplayerState.role = role;
    multiplayerState.localReady = true;

    document.getElementById('role-selection-status').innerText = `Ви обрали: ${role === 'striker' ? 'Б\'ючого' : 'Воротаря'}. Очікування суперника...`;

    sendNetData({
        type: 'select_role',
        role: role
    });

    checkRolesAssigned();
}

function handleNetMessage(packet) {
    if (!packet || !packet.type) return;

    switch (packet.type) {
        case 'select_role':
            multiplayerState.opponentRole = packet.role;
            multiplayerState.opponentReady = true;
            checkRolesAssigned();
            break;

        case 'sync_aim':
            // Отримуємо координати прицілу від б'ючого гравця
            if (multiplayerState.role === 'keeper' && activeGameInstance) {
                gameControls.aimX = packet.aimX;
                gameControls.aimY = packet.aimY;
                gameControls.power = packet.power;
            }
            break;

        case 'kick':
            // Запуск удару
            if (multiplayerState.role === 'keeper' && activeGameInstance) {
                activeGameInstance.gameState = 'kick';
                activeGameInstance.player.setPose('kick_swing');
                activeGameInstance.runupProgress = 0;

                // Синхронізуємо силу і приціл в момент удару
                gameControls.power = packet.power;
                gameControls.aimX = packet.aimX;
                gameControls.aimY = packet.aimY;
                gameControls.sideSpin = packet.sideSpin;
                gameControls.topSpin = packet.topSpin;
                
                // Запускаємо рубіж реакції нашого кіпера
                activeGameInstance.goalkeeperAI.onBallKicked(activeGameInstance.ball);
            }
            break;

        case 'keeper_move':
            // Оновлення переміщення воротаря на екрані striker
            if (multiplayerState.role === 'striker' && activeGameInstance) {
                activeGameInstance.goalkeeper.position.coordinateX = packet.x;
                activeGameInstance.goalkeeper.position.coordinateY = packet.y;
                activeGameInstance.goalkeeper.setPose(packet.pose);
            }
            break;

        case 'keeper_antic':
            // Синхронізація кумедної пози воротаря перед ударом
            if (multiplayerState.role === 'striker' && activeGameInstance) {
                activeGameInstance.goalkeeper.setPose(packet.pose);
            }
            break;

        case 'result':
            // Синхронізація результату раунду
            if (activeGameInstance) {
                activeGameInstance.triggerShotResult(packet.isGoal, packet.message);
            }
            break;
    }
}

function checkRolesAssigned() {
    if (multiplayerState.localReady && multiplayerState.opponentReady) {
        if (multiplayerState.role === multiplayerState.opponentRole) {
            // Конфлікт ролей: якщо обидва обрали однакову роль, хост залишає собі обрану роль, а гість міняє
            if (!multiplayerState.isHost) {
                multiplayerState.role = multiplayerState.role === 'striker' ? 'keeper' : 'striker';
                alert(`Обидва обрали однакову роль. Ваша роль змінена на: ${multiplayerState.role === 'striker' ? 'Б\'ючий' : 'Воротар'}`);
            }
        }

        // Запуск онлайн гри
        startOnlineGame();
    }
}

function startOnlineGame() {
    document.getElementById('screen-select-role').classList.remove('active');
    document.getElementById('hud-container').classList.add('active');

    if (!activeGameInstance) {
        activeGameInstance = new PenaltyMasterGame();
        activeGameInstance.start();
    } else {
        activeGameInstance.resetShot();
    }

    // Примусово вимикаємо AI воротаря для онлайн гри, оскільки воротарем керує людина
    if (multiplayerState.role === 'striker') {
        activeGameInstance.goalkeeperAI.isReacting = false;
    }
    
    // Встановлюємо HUD статус для мережевого режиму
    document.getElementById('hud-difficulty').innerText = "ONLINE";
}

// Копіювання коду при кліку на табло
document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('room-id-display');
    if (display) {
        display.addEventListener('click', () => {
            const code = display.innerText;
            if (code && code !== "Завантаження...") {
                navigator.clipboard.writeText(code).then(() => {
                    updateOnlineStatus(`Код ${code} скопійовано!`);
                }).catch(err => {
                    console.error("Could not copy:", err);
                });
            }
        });
    }
});
