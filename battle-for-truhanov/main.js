        function toggleFullscreen() {
            const w = document.getElementById('game-wrapper'); const btn = document.getElementById('fs-toggle-btn');
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                if (w.requestFullscreen) { w.requestFullscreen().catch(() => { w.classList.add('fullscreen-active') }) }
                else if (w.webkitRequestFullscreen) { w.webkitRequestFullscreen() }
                else { w.classList.add('fullscreen-active') }
                w.classList.add('fullscreen-active'); btn.innerText = "✖ ВИХІД";
            } else {
                if (document.exitFullscreen) { document.exitFullscreen() }
                else if (document.webkitExitFullscreen) { document.webkitExitFullscreen() }
                w.classList.remove('fullscreen-active'); btn.innerText = "⛶ ФУЛСКРІН";
            }
        }
        function gameLoop() {
            if (!state.isRunning) return; if (!state.player || !state.bot) return;
            if (state.hitstopFrames > 0) { state.hitstopFrames--; requestAnimationFrame(gameLoop); return }
            state.frameCount++;
            CTX.setTransform(1, 0, 0, 1, 0, 0);
            CTX.clearRect(0, 0, CANVAS.width, CANVAS.height); processInput(); if (state.difficulty !== 'pvp' && !state.isOnline) { AI_ENGINE.update(state.bot, state.player); }
            state.player.update(); state.bot.update(); checkCollisions(); spawnWeather(LEVELS[state.currentLevelIndex]);
            CTX.save();
            if (state.screenShake > 0) {
                const dx = (Math.random() - 0.5) * state.screenShake; const dy = (Math.random() - 0.5) * state.screenShake;
                CTX.translate(dx, dy); state.screenShake *= 0.84; if (state.screenShake < 0.4) state.screenShake = 0;
            }
            drawScene(state.currentLevelIndex);
            if (state.particles.length > 120) { state.particles.splice(0, state.particles.length - 120) }
            for (let i = state.particles.length - 1; i >= 0; i--) { const part = state.particles[i]; part.update(); part.draw(); if (part.life <= 0) state.particles.splice(i, 1) }
            state.player.draw(); if (state.fatalityAnimation) { drawFatalityAnim() } else { state.bot.draw() }
            state.projectiles.forEach(p => p.draw());
            for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
                const ft = state.floatingTexts[i]; ft.y += ft.vy; ft.alpha -= 0.02; if (ft.alpha <= 0) { state.floatingTexts.splice(i, 1); continue }
                CTX.save(); CTX.globalAlpha = ft.alpha; CTX.font = "italic bold 16px monospace"; CTX.fillStyle = ft.color; CTX.strokeStyle = '#000'; CTX.lineWidth = 3; CTX.strokeText(ft.text, ft.x, ft.y); CTX.fillText(ft.text, ft.x, ft.y); CTX.restore();
            }
            if (state.toastyTimer > 0) {
                state.toastyTimer--; CTX.save(); CTX.font = "italic bold 24px monospace"; CTX.fillStyle = "#ffcc00"; CTX.strokeStyle = "#ff0055"; CTX.lineWidth = 3;
                const slideInX = CANVAS.width - Math.min(140, state.toastyTimer * 5); CTX.strokeText("TOASTY!", slideInX, CANVAS.height - 40); CTX.fillText("TOASTY!", slideInX, CANVAS.height - 40); CTX.restore();
            }
            CTX.restore();
            updateWeaponHUD();
            if (typeof syncMultiplayer === 'function') syncMultiplayer();
            if ((state.player.hp <= 0 || state.bot.hp <= 0) && !state.isMatchEnding) { endRound() } else { requestAnimationFrame(gameLoop) }
        }
        function startGame() {
            AudioSys.init(); AudioSys.startBGM();
            if (state.difficulty !== 'pvp' && state.difficulty !== 'online') {
                const diffEl = document.getElementById('diff-select');
                state.difficulty = diffEl ? diffEl.value : '0';
            }
            
            if (state.isOnline) {
                if (state.isHost) {
                    const lvlVal = document.getElementById('level-select').value;
                    if (lvlVal === 'random') {
                        state.currentLevelIndex = Math.floor(Math.random() * LEVELS.length);
                    } else {
                        state.currentLevelIndex = parseInt(lvlVal);
                    }
                    sendNetData({
                        type: 'start_game',
                        levelIndex: state.currentLevelIndex,
                        hostCharId: document.getElementById('char-select').value,
                        difficulty: state.difficulty
                    });
                }
            } else {
                const lvlVal = document.getElementById('level-select').value;
                if (lvlVal === 'random') {
                    state.currentLevelIndex = Math.floor(Math.random() * LEVELS.length);
                } else {
                    state.currentLevelIndex = parseInt(lvlVal);
                }
            }
            
            state.p1Wins = 0; state.p2Wins = 0; state.roundNum = 1; state.finishHimStage = false; state.fatalityAnimation = null;
            state.isMatchEnding = false; state.screenShake = 0; state.hitstopFrames = 0; state.toastyTimer = 0; state.controlGestures = {}; state.frameCount = 0;
            state.particles = []; state.projectiles = []; state.floatingTexts = [];
            clearTimeout(state.finishHimTimeout); clearInterval(state.timerInterval);
            document.getElementById('screen-menu').classList.add('hidden'); startNewRoundSequence();
        }
        function startNewRoundSequence() {
            clearTimeout(state.finishHimTimeout); clearInterval(state.timerInterval);
            state.isMatchEnding = false; state.finishHimStage = false; state.fatalityAnimation = null; state.timer = 180; state.keys = {};
            state.screenShake = 0; state.hitstopFrames = 0; state.toastyTimer = 0; state.particles = []; state.projectiles = []; state.floatingTexts = [];
            state.controlGestures = {};
            document.getElementById('timer').innerText = state.timer;
            
            if (state.roundNum > 1) {
                if (!state.isOnline || state.isHost) {
                    state.currentLevelIndex = (state.currentLevelIndex + 1) % LEVELS.length;
                }
            }
            
            // Зміна треку відповідно до поточної арени
            if (typeof AudioSys !== 'undefined' && typeof AudioSys.changeTrackForLevel === 'function') {
                AudioSys.changeTrackForLevel(state.currentLevelIndex);
            }
            
            let p1CharId = document.getElementById('char-select').value;
            let p2CharId = 'demchuk';
            if (state.isOnline) {
                if (state.isHost) {
                    p1CharId = document.getElementById('char-select').value;
                    p2CharId = state.opponentCharId || 'demchuk';
                } else {
                    p1CharId = state.opponentCharId || 'lozko';
                    p2CharId = document.getElementById('char-select').value;
                }
            } else {
                const char2Val = document.getElementById('char2-select').value;
                if (char2Val === 'random') {
                    const keys = Object.keys(CHARACTERS);
                    p2CharId = keys[(keys.indexOf(p1CharId) + 1 + state.currentLevelIndex) % keys.length];
                } else {
                    p2CharId = char2Val;
                }
            }
            
            state.player = new Fighter('p1', CHARACTERS[p1CharId].name, 150, true, CHARACTERS[p1CharId]);
            state.bot = new Fighter('p2', CHARACTERS[p2CharId].name, 720, false, CHARACTERS[p2CharId]);
            state.player.maxHp = 180; state.player.hp = state.player.maxHp;
            state.bot.maxHp = (state.difficulty === 'pvp' || state.isOnline) ? 180 : 210 + (parseInt(state.difficulty) * 20); state.bot.hp = state.bot.maxHp;
            updateWeaponHUD();
            document.getElementById('name-p1').innerText = state.player.name; document.getElementById('name-p2').innerText = state.bot.name;
            updateHUD(); updateRoundNodes();
            
            const hint = document.getElementById('controls-hint');
            const wHint = document.getElementById('weapon-controls-hint');
            if (hint) {
                hint.style.display = 'block';
                if (state.hintTimeout) clearTimeout(state.hintTimeout);
                state.hintTimeout = setTimeout(() => {
                    hint.style.display = 'none';
                }, 20000);
            }
            if (wHint) {
                wHint.style.display = 'block';
                if (state.wHintTimeout) clearTimeout(state.wHintTimeout);
                state.wHintTimeout = setTimeout(() => {
                    wHint.style.display = 'none';
                }, 20000);
            }
            const announcer = document.getElementById('fight-announcer'); announcer.innerText = `ROUND ${state.roundNum}`; announcer.style.color = "#fff"; announcer.style.textShadow = "0 0 15px rgba(255,0,85,0.8),2px 2px #000"; announcer.style.display = 'block';
            AudioSys.announce(`ROUND ${state.roundNum}`);
            
            CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
            drawScene(state.currentLevelIndex);
            state.player.draw(); state.bot.draw();

            setTimeout(() => {
                announcer.innerText = "FIGHT!"; AudioSys.announce("FIGHT"); document.getElementById('hud').style.display = 'flex'; document.getElementById('timer-box').style.display = 'block';
                state.isRunning = true; startTimer(); gameLoop(); setTimeout(() => { announcer.style.display = 'none' }, 900);
            }, 1800);
        }
        function startTimer() {
            clearInterval(state.timerInterval);
            state.timerInterval = setInterval(() => { if (state.isRunning && !state.isMatchEnding) { state.timer--; document.getElementById('timer').innerText = state.timer; if (state.timer <= 0) { endRoundByTime() } } }, 1000);
        }
        function updateRoundNodes() {
            const drawNodes = (id, wins) => {
                const nodes = document.querySelectorAll(`#${id} .round-node`);
                nodes.forEach((node, idx) => { if (idx < wins) node.classList.add('active'); else node.classList.remove('active') });
            };
            drawNodes('rounds-p1', state.p1Wins); drawNodes('rounds-p2', state.p2Wins);
        }
        function endRound() {
            let roundWinner = null; let potentialMatchWinner = false;
            if (state.player.hp > 0 && state.bot.hp <= 0) { roundWinner = state.player; if (state.p1Wins === 1) potentialMatchWinner = true }
            else if (state.bot.hp > 0 && state.player.hp <= 0) { roundWinner = state.bot; if (state.p2Wins === 1) potentialMatchWinner = true }
            if (potentialMatchWinner && !state.finishHimStage) {
                state.finishHimStage = true; state.isMatchEnding = true; clearInterval(state.timerInterval);
                const loser = state.player.hp <= 0 ? state.player : state.bot; loser.hp = 1; loser.state = 'dazed';
                const announcer = document.getElementById('fight-announcer'); announcer.innerText = "FINISH HIM!"; announcer.style.color = '#ff0055'; announcer.style.textShadow = '0 0 20px #ff0055,3px 3px #000'; announcer.style.display = 'block';
                AudioSys.finishHimSound(); state.isMatchEnding = false; state.bot.vx = 0;
                state.finishHimTimeout = setTimeout(() => {
                    if (state.finishHimStage) {
                        state.finishHimStage = false; loser.hp = 0; loser.state = 'dead'; state.isMatchEnding = true;
                        if (state.player.hp > 0) state.p1Wins++; else state.p2Wins++;
                        setTimeout(() => { state.isRunning = false; showRoundResults(roundWinner) }, 1200);
                    }
                }, 5000);
                return;
            }
            state.isMatchEnding = true; clearInterval(state.timerInterval);
            if (state.player.hp > 0 && state.bot.hp <= 0) { state.p1Wins++ } else { state.p2Wins++ }
            updateRoundNodes();
            const loser = state.player.hp <= 0 ? state.player : state.bot; loser.state = 'dead';
            setTimeout(() => { state.isRunning = false; showRoundResults(roundWinner) }, 1200);
        }
        function endRoundByTime() {
            state.isMatchEnding = true; clearInterval(state.timerInterval); let roundWinner = null;
            if (state.player.hp > state.bot.hp) { roundWinner = state.player; state.p1Wins++ }
            else if (state.bot.hp > state.player.hp) { roundWinner = state.bot; state.p2Wins++ }
            state.isRunning = false; showRoundResults(roundWinner);
        }
        function showRoundResults(winner) {
            if (winner && winner.id === 'p1') {
                let earned = 50;
                if (state.p1Wins === 2) earned += 100;
                state.coins += earned;
                localStorage.setItem('truhanov_coins', state.coins.toString());
                showFloatingText(`+${earned} COINS!`, CANVAS.width / 2 - 55, CANVAS.height / 2 - 50, '#00ffcc');
            }
            const resScreen = document.getElementById('screen-result'); const title = document.getElementById('result-title'); const desc = document.getElementById('result-desc'); const nextBtn = document.getElementById('btn-next');
            resScreen.classList.remove('hidden'); document.getElementById('hud').style.display = 'none'; document.getElementById('timer-box').style.display = 'none';
            let winnerName = winner ? winner.name : "Нічия"; AudioSys.announce(winner ? `${winnerName} WINS` : "DRAW");
            if (state.isOnline) {
                nextBtn.style.display = 'block';
                if (state.isHost) {
                    nextBtn.disabled = false;
                    nextBtn.style.display = 'block';
                    if (state.p1Wins === 2 || state.p2Wins === 2) {
                        const matchWinnerName = state.p1Wins === 2 ? state.player.name : state.bot.name;
                        title.style.color = state.p1Wins === 2 ? "#00ffcc" : "#ff0055";
                        title.innerText = "ДВОБІЙ ЗАВЕРШЕНО";
                        desc.innerText = `Переможець: ${matchWinnerName}!`;
                        nextBtn.innerText = "Наступний Бій";
                        nextBtn.onclick = () => {
                            resScreen.classList.add('hidden');
                            state.currentLevelIndex = (state.currentLevelIndex + 1) % LEVELS.length;
                            state.p1Wins = 0; state.p2Wins = 0; state.roundNum = 1;
                            sendNetData({
                                type: 'start_round',
                                levelIndex: state.currentLevelIndex,
                                roundNum: state.roundNum
                            });
                            startNewRoundSequence();
                        };
                    } else {
                        title.style.color = "#ffcc00";
                        title.innerText = winner ? `${winnerName} перемагає` : "Нічия";
                        desc.innerText = `Приготуйтеся до раунду ${state.roundNum + 1}`;
                        nextBtn.innerText = "Наступний Раунд";
                        nextBtn.onclick = () => {
                            resScreen.classList.add('hidden');
                            state.roundNum++;
                            sendNetData({
                                type: 'start_round',
                                levelIndex: state.currentLevelIndex,
                                roundNum: state.roundNum
                            });
                            startNewRoundSequence();
                        };
                    }
                } else {
                    nextBtn.style.display = 'none';
                    if (state.p1Wins === 2 || state.p2Wins === 2) {
                        const matchWinnerName = state.p1Wins === 2 ? state.player.name : state.bot.name;
                        title.style.color = state.p2Wins === 2 ? "#00ffcc" : "#ff0055";
                        title.innerText = "ДВОБІЙ ЗАВЕРШЕНО";
                        desc.innerText = `Переможець: ${matchWinnerName}! Очікування хоста...`;
                    } else {
                        title.style.color = "#ffcc00";
                        title.innerText = winner ? `${winnerName} перемагає` : "Нічия";
                        desc.innerText = `Приготуйтеся до раунду ${state.roundNum + 1}. Очікування хоста...`;
                    }
                }
                return;
            }

            if (state.p1Wins === 2) {
                if (state.currentLevelIndex === LEVELS.length - 1) {
                    title.style.color = "#00ffcc"; title.innerText = "ЧЕМПІОН КИЄВА!"; desc.innerText = `${state.player.name} здобув перемогу у всіх районах!`; nextBtn.innerText = "Почати знову";
                    nextBtn.onclick = () => { resScreen.classList.add('hidden'); showMenu() };
                } else {
                    title.style.color = "#00ffcc"; title.innerText = "ПЕРЕМОГА!"; desc.innerText = `Ви здолали супротивника! Наступна локація: ${LEVELS[state.currentLevelIndex + 1].name}`; nextBtn.innerText = "Наступний Бій";
                    nextBtn.onclick = () => { 
                        resScreen.classList.add('hidden'); 
                        state.currentLevelIndex++; 
                        state.p1Wins = 0; state.p2Wins = 0; state.roundNum = 1; 
                        startNewRoundSequence(); 
                    };
                }
            } else if (state.p2Wins === 2) {
                title.style.color = "#ff0055"; title.innerText = "ПОРВАНІ КЕДИ"; desc.innerText = "Київські двори виявилися сильнішими..."; nextBtn.innerText = "Спробувати ще";
                nextBtn.onclick = () => { resScreen.classList.add('hidden'); state.p1Wins = 0; state.p2Wins = 0; state.roundNum = 1; startNewRoundSequence() };
            } else {
                title.style.color = "#ffcc00"; title.innerText = winner ? `${winnerName} перемагає` : "Нічия"; desc.innerText = `Приготуйтеся до раунду ${state.roundNum + 1}`; nextBtn.innerText = "Наступний Раунд";
                nextBtn.onclick = () => { resScreen.classList.add('hidden'); state.roundNum++; startNewRoundSequence() };
            }
        }
        function nextRound() {}
        function showMenu() {
            state.isRunning = false; AudioSys.stopBGM(); clearTimeout(state.finishHimTimeout); clearInterval(state.timerInterval); state.controlGestures = {};
            document.getElementById('screen-result').classList.add('hidden'); document.getElementById('hud').style.display = 'none'; document.getElementById('timer-box').style.display = 'none';
            document.getElementById('screen-menu').classList.remove('hidden'); drawScene(0);
            const hint = document.getElementById('controls-hint');
            if (hint) hint.style.display = 'none';
            const wHint = document.getElementById('weapon-controls-hint');
            if (wHint) wHint.style.display = 'none';
        }

        initMobileControls();
        const resetFullscreenUI = () => {
            const w = document.getElementById('game-wrapper'); const btn = document.getElementById('fs-toggle-btn');
            if (!document.fullscreenElement && !document.webkitFullscreenElement) { w.classList.remove('fullscreen-active'); btn.innerText = "⛶ ФУЛСКРІН" }
        };
        document.addEventListener('fullscreenchange', resetFullscreenUI);
        document.addEventListener('webkitfullscreenchange', resetFullscreenUI);
        drawScene(0);

        // ─── SHOP SYSTEM & ECONOMY LOGIC ─────────────────────────
        let shopCurrentTab = 'weapons';
        
        function openShop() {
            document.getElementById('screen-menu').classList.add('hidden');
            document.getElementById('screen-shop').classList.remove('hidden');
            document.getElementById('shop-modal-coins').innerText = state.coins;
            renderShopItems();
        }
        
        function closeShop() {
            document.getElementById('screen-shop').classList.add('hidden');
            document.getElementById('screen-menu').classList.remove('hidden');
            document.getElementById('shop-coins-display').innerText = state.coins;
            updateLevelDropdownLocks();
        }
        
        function selectShopTab(tabName) {
            shopCurrentTab = tabName;
            ['weapons', 'skins', 'levels'].forEach(t => {
                const btn = document.getElementById(`tab-shop-${t}`);
                if (btn) {
                    if (t === tabName) {
                        btn.style.background = '#660099';
                        btn.style.borderColor = '#8800cc';
                        btn.style.color = 'white';
                    } else {
                        btn.style.background = '#222';
                        btn.style.borderColor = '#444';
                        btn.style.color = '#ccc';
                    }
                }
            });
            renderShopItems();
        }
        
        function renderShopItems() {
            const container = document.getElementById('shop-items-container');
            if (!container) return;
            container.innerHTML = '';
            
            let items = [];
            if (shopCurrentTab === 'weapons') items = SHOP_WEAPONS;
            else if (shopCurrentTab === 'skins') items = SHOP_SKINS;
            else if (shopCurrentTab === 'levels') items = SHOP_LEVELS;
            
            items.forEach(item => {
                let isOwned = false;
                let isEquipped = false;
                
                if (shopCurrentTab === 'weapons') {
                    isOwned = state.ownedWeapons.includes(item.id);
                    isEquipped = state.equippedWeapon === item.id;
                } else if (shopCurrentTab === 'skins') {
                    isOwned = state.ownedSkins.includes(item.id);
                    isEquipped = state.equippedSkin === item.id;
                } else if (shopCurrentTab === 'levels') {
                    isOwned = state.ownedLevels.includes(item.id);
                }
                
                const card = document.createElement('div');
                card.style.background = 'rgba(20,20,40,0.7)';
                card.style.border = isEquipped ? '2px solid #00ffcc' : '1px solid #444';
                card.style.borderRadius = '6px';
                card.style.padding = '8px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.justifyContent = 'space-between';
                card.style.alignItems = 'center';
                card.style.textAlign = 'center';
                
                let btnHTML = '';
                if (isOwned) {
                    if (shopCurrentTab === 'levels') {
                        btnHTML = `<button style="background:#111; border-color:#333; color:#888; width:100%; cursor:default; padding: 4px;" disabled>РОЗБЛОКОВАНО</button>`;
                    } else {
                        btnHTML = `<button onclick="equipShopItem('${item.id}')" style="background:${isEquipped ? '#006655' : '#333'}; border-color:${isEquipped ? '#00ffcc' : '#555'}; color:white; width:100%; cursor:pointer; padding: 4px;">${isEquipped ? 'ЕКІПІРОВАНО' : 'ВИБРАТИ'}</button>`;
                    }
                } else {
                    const canAfford = state.coins >= item.price;
                    btnHTML = `<button onclick="buyShopItem('${item.id}', ${item.price})" style="background:${canAfford ? '#660099' : '#333'}; border-color:${canAfford ? '#8800cc' : '#444'}; color:${canAfford ? 'white' : '#888'}; width:100%; cursor:${canAfford ? 'pointer' : 'not-allowed'}; padding: 4px;" ${canAfford ? '' : 'disabled'}>КУПИТИ: ${item.price} 🪙</button>`;
                }
                
                let previewHTML = '';
                if (shopCurrentTab === 'weapons') {
                    previewHTML = `<span style="font-size:28px; margin-bottom:4px;">${item.id === 'sausage' ? '🥖' : (item.id === 'bow' ? '🏹' : (item.id === 'nunchucks' ? '⛓️' : (item.id === 'spear' ? '🔱' : '⚔️')))}</span>`;
                } else if (shopCurrentTab === 'skins') {
                    previewHTML = `<div style="width:24px; height:24px; border-radius:50%; background:${item.cloth}; border:2px solid ${item.line || '#fff'}; margin-bottom:6px;"></div>`;
                } else if (shopCurrentTab === 'levels') {
                    previewHTML = `<span style="font-size:28px; margin-bottom:4px;">🗺️</span>`;
                }

                card.innerHTML = `
                    \${previewHTML}
                    <div style="font-size:10px; font-weight:bold; color:#ffcc00; margin-bottom:2px;">\${item.name}</div>
                    <div style="font-size:8px; color:#aaa; margin-bottom:8px; height:32px; overflow:hidden;">\${item.desc}</div>
                    \${btnHTML}
                `;
                container.appendChild(card);
            });
        }
        
        function buyShopItem(id, price) {
            if (state.coins < price) return;
            state.coins -= price;
            localStorage.setItem('truhanov_coins', state.coins.toString());
            document.getElementById('shop-modal-coins').innerText = state.coins;
            document.getElementById('shop-coins-display').innerText = state.coins;
            
            if (shopCurrentTab === 'weapons') {
                state.ownedWeapons.push(id);
                localStorage.setItem('truhanov_owned_weapons', JSON.stringify(state.ownedWeapons));
                state.equippedWeapon = id;
                localStorage.setItem('truhanov_equipped_weapon', id);
            } else if (shopCurrentTab === 'skins') {
                state.ownedSkins.push(id);
                localStorage.setItem('truhanov_owned_skins', JSON.stringify(state.ownedSkins));
                state.equippedSkin = id;
                localStorage.setItem('truhanov_equipped_skin', id);
            } else if (shopCurrentTab === 'levels') {
                const lvlIdx = parseInt(id);
                state.ownedLevels.push(lvlIdx);
                localStorage.setItem('truhanov_owned_levels', JSON.stringify(state.ownedLevels));
            }
            AudioSys.superHit();
            renderShopItems();
            updateLevelDropdownLocks();
        }
        
        function equipShopItem(id) {
            if (shopCurrentTab === 'weapons') {
                state.equippedWeapon = id;
                localStorage.setItem('truhanov_equipped_weapon', id);
            } else if (shopCurrentTab === 'skins') {
                state.equippedSkin = id;
                localStorage.setItem('truhanov_equipped_skin', id);
            }
            AudioSys.punch();
            renderShopItems();
        }
        
        function updateLevelDropdownLocks() {
            for (let i = 10; i <= 12; i++) {
                const opt = document.getElementById(`opt-level-${i}`);
                if (opt) {
                    if (state.ownedLevels.includes(i)) {
                        opt.disabled = false;
                        opt.innerText = LEVELS[i].name;
                    } else {
                        opt.disabled = true;
                        opt.innerText = `🔒 ` + LEVELS[i].name;
                    }
                }
            }
        }
        
        // Setup initial coin displays and option locks
        updateLevelDropdownLocks();
        setTimeout(() => {
            const coinsLabel = document.getElementById('shop-coins-display');
            if (coinsLabel) coinsLabel.innerText = state.coins;
        }, 100);
