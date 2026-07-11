/*********************************************************************
 * MATRIX STRIKER RUN - 2D VECTOR MINI-GAME
 *********************************************************************/
class MatrixRunGame {
    constructor(canvas, onWin, onFail, clubPreset) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onWin = onWin;
        this.onFail = onFail;
        this.clubPreset = clubPreset || { color: '#00ff66', shortColor: '#ffffff' };

        this.width = canvas.width;
        this.height = canvas.height;

        this.isPlaying = false;
        this.distance = 0;
        this.targetDistance = 400; // Run 400 meters to win
        this.speed = 220; // base pixels per second

        // Player properties
        this.player = {
            x: 100,
            y: 0, // Offset from ground
            width: 30,
            height: 60,
            velocityY: 0,
            isJumping: false,
            isSliding: false,
            slideTimer: 0,
            shootCooldown: 0,
            invulnerableTimer: 0
        };

        this.groundY = this.height - 60;
        this.gravity = 980; // pixels/s^2
        this.jumpForce = -450;

        this.lives = 3;
        this.maxLives = 3;
        this.ammo = 5;
        this.coinsCollected = 0;

        this.obstacles = [];
        this.projectiles = [];
        this.particles = [];
        this.collectibles = [];
        this.matrixStreams = [];

        // Timers
        this.spawnTimer = 0;
        this.collectibleSpawnTimer = 0;
        this.coinSpawnTimer = 0;
        this.lastTime = 0;

        this.initMatrixStreams();
        this.bindEvents();
    }

    initMatrixStreams() {
        this.matrixStreams = [];
        const cols = Math.floor(this.width / 20);
        for (let i = 0; i < cols; i++) {
            this.matrixStreams.push({
                x: i * 20,
                y: Math.random() * -this.height,
                speed: 80 + Math.random() * 120,
                chars: Array.from({length: 10}, () => String.fromCharCode(33 + Math.floor(Math.random() * 93)))
            });
        }
    }

    bindEvents() {
        this.keysPressed = {};

        this.keydownHandler = (e) => {
            if (!this.isPlaying) return;
            this.keysPressed[e.code] = true;

            // Space або Стрілка вгору - Стрибок
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
                this.jump();
                e.preventDefault();
            }
            // Стрілка вниз - Слайд
            if (e.code === 'KeyS' || e.code === 'ArrowDown') {
                this.slide();
                e.preventDefault();
            }
            // Клавіші F або E - Удар м'ячем
            if (e.code === 'KeyF' || e.code === 'KeyE') {
                this.shoot();
                e.preventDefault();
            }
        };

        this.keyupHandler = (e) => {
            if (!this.isPlaying) return;
            this.keysPressed[e.code] = false;
        };

        window.addEventListener('keydown', this.keydownHandler);
        window.addEventListener('keyup', this.keyupHandler);

        // Кнопки Touch UI з миттєвою реакцією без затримки 300мс
        const btnJump = document.getElementById('matrix-btn-jump');
        const btnSlide = document.getElementById('matrix-btn-slide');
        const btnShoot = document.getElementById('matrix-btn-shoot');
        const btnBrake = document.getElementById('matrix-btn-brake');
        const btnBoost = document.getElementById('matrix-btn-boost');

        if (btnJump) {
            btnJump.onclick = () => this.jump();
            btnJump.ontouchstart = (e) => { this.jump(); if(e.cancelable) e.preventDefault(); };
        }
        if (btnSlide) {
            btnSlide.onclick = () => this.slide();
            btnSlide.ontouchstart = (e) => { this.slide(); if(e.cancelable) e.preventDefault(); };
        }
        if (btnShoot) {
            btnShoot.onclick = () => this.shoot();
            btnShoot.ontouchstart = (e) => { this.shoot(); if(e.cancelable) e.preventDefault(); };
        }

        if (btnBrake) {
            const startBrake = (e) => { this.keysPressed['ArrowLeft'] = true; if(e.cancelable) e.preventDefault(); };
            const endBrake = () => { this.keysPressed['ArrowLeft'] = false; };
            btnBrake.ontouchstart = startBrake;
            btnBrake.ontouchend = endBrake;
            btnBrake.onmousedown = startBrake;
            btnBrake.onmouseup = endBrake;
        }

        if (btnBoost) {
            const startBoost = (e) => { this.keysPressed['ArrowRight'] = true; if(e.cancelable) e.preventDefault(); };
            const endBoost = () => { this.keysPressed['ArrowRight'] = false; };
            btnBoost.ontouchstart = startBoost;
            btnBoost.ontouchend = endBoost;
            btnBoost.onmousedown = startBoost;
            btnBoost.onmouseup = endBoost;
        }
    }

    unbindEvents() {
        window.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('keyup', this.keyupHandler);
        
        // Очищення мобільних обробників подій для запобігання витоку пам'яті
        const btnJump = document.getElementById('matrix-btn-jump');
        const btnSlide = document.getElementById('matrix-btn-slide');
        const btnShoot = document.getElementById('matrix-btn-shoot');
        const btnBrake = document.getElementById('matrix-btn-brake');
        const btnBoost = document.getElementById('matrix-btn-boost');
        
        if (btnJump) { btnJump.onclick = null; btnJump.ontouchstart = null; }
        if (btnSlide) { btnSlide.onclick = null; btnSlide.ontouchstart = null; }
        if (btnShoot) { btnShoot.onclick = null; btnShoot.ontouchstart = null; }
        if (btnBrake) { btnBrake.ontouchstart = null; btnBrake.ontouchend = null; btnBrake.onmousedown = null; btnBrake.onmouseup = null; }
        if (btnBoost) { btnBoost.ontouchstart = null; btnBoost.ontouchend = null; btnBoost.onmousedown = null; btnBoost.onmouseup = null; }

        this.keysPressed = {};
    }

    start() {
        this.isPlaying = true;
        this.distance = 0;
        this.lives = 3;
        this.ammo = 5;
        this.coinsCollected = 0;
        this.obstacles = [];
        this.projectiles = [];
        this.particles = [];
        this.collectibles = [];
        this.player.y = 0;
        this.player.x = 100;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.isSliding = false;
        this.player.invulnerableTimer = 0;
        this.spawnTimer = 0;
        this.collectibleSpawnTimer = 0;
        this.coinSpawnTimer = 0;

        this.lastTime = performance.now();
        this.initMatrixStreams();
        
        requestAnimationFrame((t) => this.loop(t));
    }

    jump() {
        if (!this.player.isJumping && !this.player.isSliding) {
            this.player.velocityY = this.jumpForce;
            this.player.isJumping = true;
            if (window.gameAudio) window.gameAudio.playKeeperSave(); 
        }
    }

    slide() {
        if (!this.player.isJumping && !this.player.isSliding) {
            this.player.isSliding = true;
            this.player.slideTimer = 0.55; 
            this.player.height = 30; 
        }
    }

    shoot() {
        if (this.ammo > 0 && this.player.shootCooldown <= 0) {
            this.ammo--;
            this.player.shootCooldown = 0.35; 

            this.projectiles.push({
                x: this.player.x + 30,
                y: this.groundY - this.player.y - (this.player.isSliding ? 15 : 35),
                radius: 8,
                velocityX: 580 
            });

            if (window.gameAudio) window.gameAudio.playWhistle(); 
        }
    }

    spawnObstacle() {
        const types = ['hurdle', 'spike', 'laser', 'breakable'];
        const type = types[Math.floor(Math.random() * types.length)];

        let obs = {
            x: this.width + 50,
            type: type,
            width: 30,
            height: 40,
            y: 0, 
            shattered: false
        };

        if (type === 'laser') {
            obs.height = 25;
            obs.y = 45; 
            obs.width = 40;
        } else if (type === 'breakable') {
            obs.height = 65;
            obs.width = 25;
            obs.y = 0;
        } else if (type === 'spike') {
            obs.width = 35;
            obs.height = 30;
        }

        this.obstacles.push(obs);
    }

    spawnCollectible() {
        this.collectibles.push({
            x: this.width + 50,
            y: this.groundY - 60 - Math.random() * 70,
            width: 20,
            height: 20,
            type: 'ball'
        });
    }

    spawnCoinGroup() {
        const patterns = ['line', 'arc', 'sine'];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        const startX = this.width + 50;
        const count = 3 + Math.floor(Math.random() * 3); 
        
        for (let i = 0; i < count; i++) {
            let coinY = this.groundY - 30;
            if (pattern === 'line') {
                coinY = this.groundY - 50;
            } else if (pattern === 'arc') {
                const mid = (count - 1) / 2;
                const distFromMid = i - mid;
                coinY = this.groundY - 120 + distFromMid * distFromMid * 18;
            } else if (pattern === 'sine') {
                coinY = this.groundY - 70 + Math.sin(i * 1.2) * 40;
            }
            
            this.collectibles.push({
                x: startX + i * 35,
                y: coinY,
                width: 16,
                height: 16,
                type: 'coin'
            });
        }
    }

    shatterObstacle(obs) {
        obs.shattered = true;
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 50 + Math.random() * 150;
            this.particles.push({
                x: obs.x + obs.width / 2,
                y: this.groundY - obs.y - obs.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                radius: 2 + Math.random() * 3,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0
            });
        }
        if (window.gameAudio) window.gameAudio.playNetRustle(); 
    }

    loop(time) {
        if (!this.isPlaying) return;

        const deltaTime = Math.min(0.1, (time - this.lastTime) * 0.001);
        this.lastTime = time;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Розраховуємо швидкість бігу та положення гравця залежно від стрілок
        let speedMultiplier = 1.0;
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) {
            speedMultiplier = 0.5; // Гальмування / Додатковий час на роздуми
        } else if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) {
            speedMultiplier = 1.6; // Прискорення / Ривок вперед
        }

        // Плавний нахил/зсув гравця залежно від швидкості
        const targetX = (speedMultiplier === 0.5) ? 65 : ((speedMultiplier === 1.6) ? 165 : 100);
        this.player.x += (targetX - this.player.x) * 6.5 * dt;

        const currentRunSpeed = this.speed * speedMultiplier;

        // Накопичення дистанції
        this.distance += currentRunSpeed * 0.05 * dt;
        
        // Перемога
        if (this.distance >= this.targetDistance) {
            this.isPlaying = false;
            this.unbindEvents();
            const coinsEarned = 100 + this.lives * 50 + this.coinsCollected; 
            this.onWin(coinsEarned);
            return;
        }

        // Таймери
        if (this.player.shootCooldown > 0) this.player.shootCooldown -= dt;
        if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= dt;

        if (this.player.isSliding) {
            this.player.slideTimer -= dt;
            if (this.player.slideTimer <= 0) {
                this.player.isSliding = false;
                this.player.height = 60;
            }
        }

        // Гравітація та стрибок
        if (this.player.isJumping) {
            this.player.velocityY += this.gravity * dt;
            this.player.y -= this.player.velocityY * dt;

            if (this.player.y <= 0) {
                this.player.y = 0;
                this.player.velocityY = 0;
                this.player.isJumping = false;
            }
        }

        // Спавн перешкод
        this.spawnTimer += dt;
        const spawnInterval = Math.max(1.1, 2.0 - (this.distance / 250)) / speedMultiplier;
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle();
        }

        // Спавн додаткових м'ячів
        this.collectibleSpawnTimer += dt;
        if (this.collectibleSpawnTimer >= 4.2) {
            this.collectibleSpawnTimer = 0;
            this.spawnCollectible();
        }

        // Спавн груп золотих монет
        this.coinSpawnTimer += dt;
        if (this.coinSpawnTimer >= 2.6) {
            this.coinSpawnTimer = 0;
            this.spawnCoinGroup();
        }

        // Оновлення коду Матриці на фоні
        this.matrixStreams.forEach(stream => {
            stream.y += stream.speed * dt;
            if (stream.y > this.height) {
                stream.y = Math.random() * -150;
                stream.chars = Array.from({length: 10}, () => String.fromCharCode(33 + Math.floor(Math.random() * 93)));
            }
        });

        // Оновлення снарядів (ударів м'ячем)
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.velocityX * dt;
            
            if (proj.x > this.width + 20) {
                this.projectiles.splice(i, 1);
                continue;
            }

            for (let j = 0; j < this.obstacles.length; j++) {
                const obs = this.obstacles[j];
                if (obs.type === 'breakable' && !obs.shattered) {
                    const hitX = proj.x + proj.radius >= obs.x && proj.x - proj.radius <= obs.x + obs.width;
                    const hitY = proj.y + proj.radius >= this.groundY - obs.y - obs.height && proj.y - proj.radius <= this.groundY - obs.y;
                    
                    if (hitX && hitY) {
                        this.shatterObstacle(obs);
                        this.projectiles.splice(i, 1);
                        break;
                    }
                }
            }
        }

        // Оновлення збірних предметів (м'ячі, монети)
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const col = this.collectibles[i];
            col.x -= currentRunSpeed * dt;

            // Колізія з гравцем
            const pX = this.player.x;
            const pY = this.groundY - this.player.y - this.player.height;
            const hitX = col.x + col.width >= pX && col.x <= pX + this.player.width;
            const hitY = col.y + col.height >= pY && col.y <= pY + this.player.height;

            if (hitX && hitY) {
                if (col.type === 'ball') {
                    this.ammo = Math.min(10, this.ammo + 3);
                    if (window.gameAudio) window.gameAudio.playGoalCheer();
                } else if (col.type === 'coin') {
                    this.coinsCollected += 15; // +15 монет за кожну монету
                    
                    // Створюємо золоті іскри при зборі монети
                    for (let p = 0; p < 8; p++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = 40 + Math.random() * 60;
                        this.particles.push({
                            x: col.x + col.width / 2,
                            y: col.y + col.height / 2,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            radius: 1.5 + Math.random() * 2,
                            life: 0.35 + Math.random() * 0.2,
                            maxLife: 0.55,
                            color: '#ffd700'
                        });
                    }
                    if (window.gameAudio) window.gameAudio.playNetRustle();
                }
                this.collectibles.splice(i, 1);
                continue;
            }

            if (col.x < -150) {
                this.collectibles.splice(i, 1);
            }
        }

        // Оновлення перешкод
        for (let i = 0; i < this.obstacles.length; i++) {
            const obs = this.obstacles[i];
            obs.x -= currentRunSpeed * dt;

            if (obs.x < -50 || obs.shattered) {
                this.obstacles.splice(i, 1);
                i--;
                continue;
            }

            if (this.player.invulnerableTimer <= 0) {
                const pX = this.player.x;
                const pY = this.groundY - this.player.y - this.player.height;
                const hitX = obs.x + obs.width >= pX && obs.x <= pX + this.player.width;
                const hitY = (this.groundY - obs.y - obs.height) < pY + this.player.height && (this.groundY - obs.y) > pY;

                if (hitX && hitY) {
                    this.lives--;
                    this.player.invulnerableTimer = 1.0; 

                    if (window.gameAudio) window.gameAudio.playMissGroan();

                    if (this.lives <= 0) {
                        this.isPlaying = false;
                        this.unbindEvents();
                        this.onFail();
                        return;
                    }
                }
            }
        }

        // Оновлення часток
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; 
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Оновлення HUD
        const hudDist = document.getElementById('matrix-hud-dist');
        const hudCoins = document.getElementById('matrix-hud-coins');
        const hudHearts = document.getElementById('matrix-hud-hearts');
        const hudAmmo = document.getElementById('matrix-hud-ammo');

        if (hudDist) hudDist.innerText = `${Math.floor(this.distance)}m / ${this.targetDistance}m`;
        if (hudCoins) hudCoins.innerText = `🪙 ${this.coinsCollected}`;
        if (hudHearts) hudHearts.innerHTML = '❤️'.repeat(this.lives) + '🖤'.repeat(this.maxLives - this.lives);
        if (hudAmmo) hudAmmo.innerText = `⚽ x${this.ammo}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Розраховуємо тему локації на основі подоланої дистанції (0-400 метрів)
        let theme = {
            bg: '#020b05',
            codeColor: 'rgba(0, 255, 102, 0.13)',
            primary: '#00ff66',
            shadow: '#00ff66',
            gridColor: 'rgba(0, 255, 102, 0.15)',
            laserColor: '#ff0033',
            name: 'МАТРИЦЯ ГРІД (ЗЕЛЕНА)'
        };

        if (this.distance > 300) {
            theme = {
                bg: '#0f0202',
                codeColor: 'rgba(255, 51, 0, 0.14)',
                primary: '#ff3300',
                shadow: '#ff3300',
                gridColor: 'rgba(255, 51, 0, 0.2)',
                laserColor: '#ffd700',
                name: 'ПЕКЕЛЬНИЙ СТАДІОН (ЧЕРВОНИЙ)'
            };
        } else if (this.distance > 200) {
            theme = {
                bg: '#02070f',
                codeColor: 'rgba(0, 255, 255, 0.14)',
                primary: '#00ffff',
                shadow: '#00ffff',
                gridColor: 'rgba(255, 255, 0, 0.2)',
                laserColor: '#ff3399',
                name: 'НЕОНОВИЙ РЕЙВ (БЛАКИЙ/ЖОВТИЙ)'
            };
        } else if (this.distance > 100) {
            theme = {
                bg: '#0a010a',
                codeColor: 'rgba(255, 0, 128, 0.14)',
                primary: '#ff0080',
                shadow: '#ff0080',
                gridColor: 'rgba(255, 0, 128, 0.2)',
                laserColor: '#00ffcc',
                name: 'НЕОНОВИЙ КІБЕРПАНК (РОЖЕВИЙ)'
            };
        }

        // 1. Заливка фону відповідно до теми локації
        this.ctx.fillStyle = theme.bg;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 2. Двійковий дощ на фоні
        this.ctx.fillStyle = theme.codeColor;
        this.ctx.font = '10px monospace';
        this.matrixStreams.forEach(stream => {
            stream.chars.forEach((char, idx) => {
                this.ctx.fillText(char, stream.x, stream.y + idx * 12);
            });
        });

        // Малюємо назву поточної локації у верхньому лівому кутку
        this.ctx.fillStyle = theme.primary;
        this.ctx.shadowColor = theme.shadow;
        this.ctx.shadowBlur = 8;
        this.ctx.font = "bold 9px monospace";
        this.ctx.fillText(`ЛОКАЦІЯ: ${theme.name}`, 20, 45);

        // 3. Векторна лінія землі
        this.ctx.strokeStyle = theme.primary;
        this.ctx.shadowColor = theme.shadow;
        this.ctx.shadowBlur = 10;
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.stroke();

        // 3D-сітка для ефекту глибини
        this.ctx.strokeStyle = theme.gridColor;
        this.ctx.lineWidth = 1;
        this.ctx.shadowBlur = 0;
        const lineCount = 15;
        for (let i = 0; i < lineCount; i++) {
            const lineX = (this.width / lineCount) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, this.groundY);
            this.ctx.lineTo(lineX - 100, this.height);
            this.ctx.stroke();
        }

        // 4. Збірні предмети
        this.collectibles.forEach(col => {
            if (col.type === 'ball') {
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 10;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(col.x, col.y, 8, 0, Math.PI * 2);
                this.ctx.stroke();
                
                // Візерунок м'яча
                this.ctx.beginPath();
                this.ctx.moveTo(col.x - 5, col.y - 2);
                this.ctx.lineTo(col.x + 5, col.y + 2);
                this.ctx.stroke();
            } else {
                // Монета
                this.ctx.strokeStyle = '#ffd700';
                this.ctx.shadowColor = '#ffd700';
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(col.x, col.y, 7, 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.fill();
            }
        });

        // 5. Проектилі (м'ячі, які ми запустили)
        this.projectiles.forEach(proj => {
            this.ctx.strokeStyle = '#00ffcc';
            this.ctx.shadowColor = '#00ffcc';
            this.ctx.shadowBlur = 8;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fillStyle = '#00ffcc';
            this.ctx.fill();
        });

        // 6. Перешкоди
        this.obstacles.forEach(obs => {
            if (obs.shattered) return;

            if (obs.type === 'breakable') {
                this.ctx.strokeStyle = '#00ccff';
                this.ctx.shadowColor = '#00ccff';
                this.ctx.shadowBlur = 10;
                this.ctx.fillStyle = 'rgba(0, 204, 255, 0.15)';
                this.ctx.lineWidth = 2.5;
                this.ctx.strokeRect(obs.x, this.groundY - obs.y - obs.height, obs.width, obs.height);
                this.ctx.fillRect(obs.x, this.groundY - obs.y - obs.height, obs.width, obs.height);
                
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, this.groundY - obs.y - obs.height);
                this.ctx.lineTo(obs.x + obs.width, this.groundY - obs.y);
                this.ctx.stroke();
            } else if (obs.type === 'laser') {
                this.ctx.strokeStyle = theme.laserColor;
                this.ctx.shadowColor = theme.laserColor;
                this.ctx.shadowBlur = 12;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, this.groundY - obs.y - obs.height/2);
                this.ctx.lineTo(obs.x + obs.width, this.groundY - obs.y - obs.height/2);
                this.ctx.stroke();
            } else if (obs.type === 'spike') {
                this.ctx.strokeStyle = theme.primary;
                this.ctx.shadowColor = theme.shadow;
                this.ctx.shadowBlur = 8;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, this.groundY);
                this.ctx.lineTo(obs.x + obs.width/2, this.groundY - obs.height);
                this.ctx.lineTo(obs.x + obs.width, this.groundY);
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                this.ctx.fill();
            } else {
                this.ctx.strokeStyle = '#ffcc00';
                this.ctx.shadowColor = '#ffcc00';
                this.ctx.shadowBlur = 8;
                this.ctx.lineWidth = 2.5;
                this.ctx.strokeRect(obs.x, this.groundY - obs.y - obs.height, obs.width, obs.height);
            }
        });

        // 7. Частки
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color || '#00ffcc';
            this.ctx.shadowColor = p.color || '#00ffcc';
            this.ctx.shadowBlur = 6;
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0; 

        // 7. Гравець
        const pX = this.player.x;
        const pY = this.groundY - this.player.y;
        
        if (this.player.invulnerableTimer > 0 && Math.floor(performance.now() / 100) % 2 === 0) {
            // Мерехтіння при невразливості
        } else {
            // Хребет / Футболка (колір клубу)
            this.ctx.strokeStyle = this.clubPreset.color;
            this.ctx.shadowColor = this.clubPreset.color;
            this.ctx.shadowBlur = 10;
            this.ctx.lineWidth = 3.5;
            
            this.ctx.beginPath();
            this.ctx.moveTo(pX + 15, pY - 47);
            this.ctx.lineTo(pX + 13, pY - 26);
            this.ctx.stroke();

            // Рукава / Руки
            this.ctx.strokeStyle = theme.primary;
            this.ctx.shadowColor = theme.shadow;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            if (this.player.isSliding) {
                // Модель слайду
                this.ctx.arc(pX + 15, pY - 25, 6, 0, Math.PI*2);
                this.ctx.moveTo(pX + 15, pY - 19);
                this.ctx.lineTo(pX - 10, pY - 5);
                this.ctx.lineTo(pX + 25, pY - 2);
            } else {
                // Модель бігу/стрибка
                const animPhase = Math.sin(performance.now() * 0.015);
                const legAngle = this.player.isJumping ? 0.4 : animPhase * 0.6;

                // Голова
                this.ctx.arc(pX + 15, pY - 54, 7, 0, Math.PI*2);
                this.ctx.stroke();

                // Шорти (колір шортів клубу)
                this.ctx.strokeStyle = this.clubPreset.shortColor;
                this.ctx.shadowColor = this.clubPreset.shortColor;
                this.ctx.lineWidth = 3.5;
                this.ctx.beginPath();
                this.ctx.moveTo(pX + 13, pY - 26);
                this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 5, pY - 19);
                this.ctx.moveTo(pX + 13, pY - 26);
                this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 5, pY - 19);
                this.ctx.stroke();

                // Ноги (основний колір теми)
                this.ctx.strokeStyle = theme.primary;
                this.ctx.shadowColor = theme.shadow;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                // Ліва нога
                this.ctx.moveTo(pX + 13 - Math.sin(legAngle) * 5, pY - 19);
                this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 16, pY - 13);
                this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 26, pY - 2);
                // Права нога
                this.ctx.moveTo(pX + 13 + Math.sin(legAngle) * 5, pY - 19);
                this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 16, pY - 13);
                this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 26, pY - 2);
                
                // Руки
                this.ctx.moveTo(pX + 15, pY - 43);
                this.ctx.lineTo(pX + 3, pY - 32);
                this.ctx.moveTo(pX + 15, pY - 43);
                this.ctx.lineTo(pX + 25, pY - 35);
            }
            this.ctx.stroke();
            
            // Малюємо м'яч біля ніг, якщо гравець не в стрибку і не в слайді
            if (!this.player.isJumping && !this.player.isSliding) {
                this.ctx.strokeStyle = theme.primary;
                this.ctx.beginPath();
                this.ctx.arc(pX + 25 + Math.sin(performance.now() * 0.02) * 4, pY - 4, 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        this.ctx.shadowBlur = 0; 
    }
}
