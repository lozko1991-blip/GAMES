        function updateWeaponHUD() {
            const fill = document.getElementById('weapon-fill');
            const label = document.getElementById('weapon-label');
            if (!fill || !label) return;
            const player = state.player;
            if (!player) {
                fill.style.width = '0%';
                label.innerText = 'WPN: NONE';
                return;
            }
            fill.style.width = player.weaponSelected === 'none' ? '0%' : '100%';
            const activeText = player.weaponTimer > 0 ? `${player.weaponActiveType || player.weaponSelected}` : player.weaponSelected;
            label.innerText = player.weaponTimer > 0 ? `WPN: ${activeText.toUpperCase()}` : `WPN: ${activeText.toUpperCase()}`;
            label.style.color = player.weaponTimer > 0 ? '#ffcc00' : '#fff';
        }
        function drawBackgroundGlow(x, y, radius, color, alpha = 1) {
            CTX.save();
            CTX.globalAlpha = alpha;
            const grad = CTX.createRadialGradient(x, y, radius * 0.1, x, y, radius);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            CTX.fillStyle = grad;
            CTX.beginPath(); CTX.arc(x, y, radius, 0, Math.PI * 2); CTX.fill();
            CTX.restore();
        }
        function drawLevelBackdrop(lvl, scrollOffset) {
            const horizon = 300;
            CTX.save();
            if (lvl.district === 'trukhaniv') {
                drawBackgroundGlow(760 - scrollOffset * 0.08, 90, 95, 'rgba(255,220,150,0.35)', 1);
                CTX.fillStyle = 'rgba(255,255,255,0.06)';
                CTX.beginPath(); CTX.arc(150 - scrollOffset * 0.06, 120, 28, 0, Math.PI * 2); CTX.fill();
                CTX.strokeStyle = 'rgba(120, 95, 40, 0.6)'; CTX.lineWidth = 4;
                CTX.beginPath(); CTX.moveTo(560 - scrollOffset * 0.5, 160); CTX.quadraticCurveTo(675 - scrollOffset * 0.3, 110, 820 - scrollOffset * 0.15, 132); CTX.stroke();
                CTX.fillStyle = 'rgba(10,25,18,0.55)';
                for (let i = 0; i < 7; i++) { CTX.fillRect(20 + i * 155 - scrollOffset * (0.08 + i * 0.005), horizon - 48 - (i % 2) * 12, 26, 48 + (i % 3) * 10) }
                CTX.fillStyle = 'rgba(18, 35, 28, 0.65)'; CTX.fillRect(0, 330, CANVAS.width, 30);
            } else if (lvl.district === 'khreshchatyk') {
                drawBackgroundGlow(720 - scrollOffset * 0.1, 100, 110, 'rgba(255,120,70,0.28)', 1);
                CTX.fillStyle = 'rgba(20, 12, 28, 0.95)';
                for (let i = 0; i < 9; i++) {
                    const bx = 40 + i * 105 - scrollOffset * 0.35;
                    const by = 120 + (i % 3) * 10;
                    CTX.fillRect(bx, by, 72, 170 - (i % 4) * 18);
                    CTX.fillStyle = 'rgba(255, 220, 160, 0.18)';
                    for (let w = 0; w < 4; w++) { CTX.fillRect(bx + 10 + (w % 2) * 22, by + 20 + Math.floor(w / 2) * 36, 10, 14) }
                    CTX.fillStyle = 'rgba(20, 12, 28, 0.95)';
                }
                CTX.strokeStyle = 'rgba(255,255,255,0.15)'; CTX.lineWidth = 6; CTX.beginPath();
                CTX.moveTo(0, 360); CTX.lineTo(CANVAS.width, 360); CTX.stroke();
                CTX.fillStyle = 'rgba(40, 20, 20, 0.85)'; CTX.fillRect(0, 330, CANVAS.width, 40);
            } else if (lvl.district === 'hidropark') {
                drawBackgroundGlow(220, 105, 70, 'rgba(90,220,170,0.24)', 1);
                CTX.fillStyle = 'rgba(10, 38, 24, 0.8)';
                for (let i = 0; i < 12; i++) {
                    const x = (i * 90) - scrollOffset * 0.08;
                    CTX.fillRect(x, 130 + (i % 3) * 4, 22, 145);
                    CTX.beginPath(); CTX.arc(x + 12, 120, 34, 0, Math.PI * 2); CTX.fill();
                }
                CTX.fillStyle = 'rgba(20,120,170,0.18)'; CTX.fillRect(0, 255, CANVAS.width, 70);
                CTX.fillStyle = 'rgba(45, 75, 28, 0.75)'; CTX.fillRect(0, 330, CANVAS.width, 30);
                CTX.fillStyle = 'rgba(255,255,255,0.08)'; CTX.beginPath(); CTX.ellipse(600 - scrollOffset * 0.2, 145, 42, 42, 0, 0, Math.PI * 2); CTX.fill();
            } else if (lvl.district === 'shuliavka') {
                drawBackgroundGlow(680, 85, 80, 'rgba(160,160,255,0.2)', 1);
                CTX.fillStyle = 'rgba(12,12,18,0.92)';
                CTX.fillRect(0, 150, CANVAS.width, 160);
                CTX.fillStyle = 'rgba(28,28,36,0.96)';
                CTX.fillRect(40 - scrollOffset * 0.18, 120, 260, 36);
                CTX.fillRect(620 - scrollOffset * 0.14, 115, 250, 38);
                CTX.fillStyle = 'rgba(255,255,255,0.08)';
                CTX.fillRect(0, 330, CANVAS.width, 30);
                CTX.strokeStyle = 'rgba(180,180,190,0.5)'; CTX.lineWidth = 4;
                CTX.beginPath(); CTX.moveTo(0, 145); CTX.lineTo(CANVAS.width, 120); CTX.stroke();
                CTX.beginPath(); CTX.moveTo(0, 180); CTX.lineTo(CANVAS.width, 170); CTX.stroke();
            } else if (lvl.district === 'kneu') {
                drawBackgroundGlow(250, 110, 70, 'rgba(90,120,255,0.18)', 1);
                CTX.fillStyle = 'rgba(10,16,34,0.92)'; CTX.fillRect(120 - scrollOffset * 0.08, 130, 520, 150);
                CTX.fillStyle = 'rgba(255,255,255,0.1)';
                CTX.fillRect(220 - scrollOffset * 0.08, 110, 320, 20);
                for (let i = 0; i < 6; i++) { CTX.fillRect(170 + i * 82 - scrollOffset * 0.08, 160, 18, 90) }
                for (let i = 0; i < 8; i++) { CTX.fillRect(160 + i * 60 - scrollOffset * 0.05, 220, 16, 12) }
                CTX.fillStyle = 'rgba(255,215,80,0.25)'; CTX.fillRect(110, 330, CANVAS.width, 30);
            } else if (lvl.district === 'borschaga') {
                drawBackgroundGlow(780, 100, 80, 'rgba(255,80,120,0.18)', 1);
                CTX.fillStyle = 'rgba(16,16,20,0.96)';
                for (let i = 0; i < 5; i++) {
                    const bx = 20 + i * 180 - scrollOffset * 0.12;
                    CTX.fillRect(bx, 90 + (i % 2) * 20, 120, 220);
                    CTX.fillStyle = 'rgba(255,255,255,0.07)';
                    for (let w = 0; w < 10; w++) { CTX.fillRect(bx + 12 + (w % 3) * 28, 115 + Math.floor(w / 3) * 28, 10, 10) }
                    CTX.fillStyle = 'rgba(16,16,20,0.96)';
                }
                CTX.fillStyle = 'rgba(255,120,0,0.16)'; CTX.fillRect(0, 325, CANVAS.width, 35);
                CTX.strokeStyle = 'rgba(255,170,80,0.25)'; CTX.lineWidth = 3;
                CTX.beginPath(); CTX.moveTo(0, 200); CTX.lineTo(CANVAS.width, 195); CTX.stroke();
            }
            CTX.restore();
        }
        function spawnWeather(lvl) {
            if (lvl.weather === 'rain' && Math.random() < 0.52) {
                addParticle(new Particle(Math.random() * CANVAS.width, 0, -2.5, 10 + Math.random() * 4, 1, 'rgba(160,200,240,0.48)', 60, 'rain'));
            } else if (lvl.weather === 'leaves' && Math.random() < 0.08) {
                addParticle(new Particle(Math.random() * CANVAS.width, 0, -1 - Math.random() * 2.5, 1.2 + Math.random() * 2, 3.5 + Math.random() * 3, 'rgba(200,120,60,0.75)', 185, 'leaves'));
            } else if (lvl.weather === 'chestnuts' && Math.random() < 0.05) {
                addParticle(new Particle(Math.random() * CANVAS.width, 0, -0.6 - Math.random(), 2 + Math.random() * 3, 4.5, '#5c3d2e', 160, 'chestnuts'));
            } else if (lvl.weather === 'diplomas' && Math.random() < 0.05) {
                addParticle(new Particle(Math.random() * CANVAS.width, 0, -1 - Math.random(), 1 + Math.random() * 2, 3.5, '#ffffff', 150, 'diplomas'));
            } else if (lvl.weather === 'wind' && Math.random() < 0.14) {
                addParticle(new Particle(CANVAS.width, Math.random() * GROUND_Y, -5.5 - Math.random() * 3, 0, 1.5 + Math.random() * 1.5, 'rgba(255,255,255,0.09)', 120, 'wind'));
            }
        }
        function drawScene(lvlIndex) {
            const lvl = LEVELS[lvlIndex];
            const p1X = state.player ? state.player.x : 150; const scrollOffset = (p1X - 450) * 0.04;
            
            let darkAlpha = 0;
            if (state.finishHimStage) darkAlpha = 0.85;
            if (state.fatalityAnimation) darkAlpha = 1.0;

            if (lvl.img && lvl.img.complete && lvl.img.naturalWidth > 0) {
                CTX.save();
                CTX.imageSmoothingEnabled = false;
                const iw = lvl.img.naturalWidth; const ih = lvl.img.naturalHeight;
                const scale = Math.max(CANVAS.width / iw, CANVAS.height / ih);
                const dw = iw * scale; const dh = ih * scale;
                const dx = (CANVAS.width - dw) / 2 - scrollOffset * 0.5;
                const dy = (CANVAS.height - dh) / 2;
                CTX.drawImage(lvl.img, 0, 0, iw, ih, dx, dy, dw, dh);
                
                CTX.fillStyle = `rgba(0, 0, 0, ${0.25 + darkAlpha * 0.75})`; 
                CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
                CTX.restore();
                
                if (darkAlpha < 1) {
                    CTX.strokeStyle = 'rgba(255,255,255,0.12)'; CTX.lineWidth = 3; CTX.beginPath(); CTX.moveTo(0, GROUND_Y); CTX.lineTo(CANVAS.width, GROUND_Y); CTX.stroke();
                }
            } else {
                const skyGrad = CTX.createLinearGradient(0, 0, 0, GROUND_Y); skyGrad.addColorStop(0, lvl.sky[0]); skyGrad.addColorStop(1, lvl.sky[1]);
                CTX.fillStyle = skyGrad; CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
                drawLevelBackdrop(lvl, scrollOffset);
                CTX.fillStyle = lvl.ground; CTX.fillRect(0, GROUND_Y, CANVAS.width, CANVAS.height - GROUND_Y);
                if (darkAlpha > 0) {
                    CTX.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`; CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
                } else {
                    CTX.strokeStyle = 'rgba(255,255,255,0.12)'; CTX.lineWidth = 3; CTX.beginPath(); CTX.moveTo(0, GROUND_Y); CTX.lineTo(CANVAS.width, GROUND_Y); CTX.stroke();
                }
            }
        }
        function showCombo(count) {
            if (count < 2) return;
            const comboDiv = document.getElementById('combo-display'); comboDiv.innerText = `COMBO x${count}`; comboDiv.style.display = 'block';
            setTimeout(() => { comboDiv.style.display = 'none' }, 800);
        }
        function updateHUD() {
            if (!state.player || !state.bot) return;
            const p1HpPct = (state.player.hp / state.player.maxHp) * 100;
            const p2HpPct = (state.bot.hp / state.bot.maxHp) * 100;
            document.getElementById('hp-p1').style.width = `${p1HpPct}%`; document.getElementById('sp-p1').style.width = `${state.player.sp}%`;
            document.getElementById('hp-p2').style.width = `${p2HpPct}%`; document.getElementById('sp-p2').style.width = `${state.bot.sp}%`;
            setTimeout(() => {
                if (state.player) document.getElementById('hp-delay-p1').style.width = `${(state.player.hp / state.player.maxHp) * 100}%`;
                if (state.bot) document.getElementById('hp-delay-p2').style.width = `${(state.bot.hp / state.bot.maxHp) * 100}%`;
            }, 550);
            updateWeaponHUD();
        }
        function drawFatalityAnim() {
            const anim = state.fatalityAnimation; if (!anim) return; anim.timer--;
            if (anim.type === 'catfish') {
                anim.loser.draw(); CTX.save(); CTX.fillStyle = '#0055ff'; CTX.beginPath(); CTX.moveTo(anim.loser.x - 60, GROUND_Y); CTX.bezierCurveTo(anim.loser.x, GROUND_Y - 120, anim.loser.x + 60, GROUND_Y - 120, anim.loser.x + 120, GROUND_Y); CTX.closePath(); CTX.fill();
                if (anim.timer < 70) {
                    CTX.fillStyle = '#3a3a3a'; CTX.beginPath(); CTX.ellipse(anim.loser.x + 30, GROUND_Y - 40 - Math.sin(anim.timer * 0.1) * 30, 35, 45, 0, 0, Math.PI * 2); CTX.fill();
                    CTX.fillStyle = '#ff0000'; CTX.beginPath(); CTX.arc(anim.loser.x + 20, GROUND_Y - 60, 4, 0, Math.PI * 2); CTX.arc(anim.loser.x + 40, GROUND_Y - 60, 4, 0, Math.PI * 2); CTX.fill();
                }
                CTX.restore();
            } else if (anim.type === 'bridge') {
                if (anim.y < GROUND_Y - 120) anim.y += 8; anim.loser.draw(); CTX.save(); CTX.fillStyle = '#55555d'; CTX.fillRect(anim.loser.x - 30, anim.y, 120, 40); CTX.fillStyle = '#ff3300'; CTX.font = "bold 10px monospace"; CTX.fillText("РЕМОНТ", anim.loser.x + 5, anim.y + 24);
                if (anim.y >= GROUND_Y - 120) { anim.loser.squashY = 80; anim.loser.height = 30 }
                CTX.restore();
            } else if (anim.type === 'gradebook') {
                if (anim.y < GROUND_Y - 120) anim.y += 9; anim.loser.draw(); CTX.save(); CTX.fillStyle = '#cc0000'; CTX.fillRect(anim.loser.x - 20, anim.y, 100, 50); CTX.fillStyle = '#fff'; CTX.font = "bold 8px monospace"; CTX.fillText("НЕЗАРАХОВАНО", anim.loser.x - 15, anim.y + 30);
                if (anim.y >= GROUND_Y - 120) {
                    anim.loser.squashY = 90; anim.loser.height = 15;
                    for (let i = 0; i < 5; i++) { CTX.strokeStyle = '#ffee00'; CTX.lineWidth = 3; CTX.beginPath(); CTX.moveTo(anim.loser.x + 30, anim.y); CTX.lineTo(anim.loser.x + 30 + (Math.random() * 40 - 20), GROUND_Y); CTX.stroke() }
                }
                CTX.restore();
            } else if (anim.type === 'tram') {
                anim.x += 12; anim.loser.draw(); CTX.save(); CTX.fillStyle = '#ff3300'; CTX.fillRect(anim.x, GROUND_Y - 100, 140, 95); CTX.fillStyle = '#ffcc00'; CTX.fillRect(anim.x + 100, GROUND_Y - 80, 40, 40);
                CTX.fillStyle = '#fff'; CTX.font = "bold 20px monospace"; CTX.fillText("1", anim.x + 50, GROUND_Y - 40);
                if (anim.x + 140 >= anim.loser.x && anim.x <= anim.loser.x + anim.loser.width) { anim.loser.x += 14; anim.loser.vy = -6 }
                CTX.restore();
            }
            if (anim.timer <= 0) { state.fatalityAnimation = null }
        }
