/*********************************************************************
 * NEON BASKETBALL - 2D PHYSICS MINI-GAME
 *********************************************************************/
class BasketballGame {
    constructor(canvas, onClose) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onClose = onClose;

        this.width = canvas.width;
        this.height = canvas.height;

        this.isPlaying = false;
        this.groundY = this.height - 50;

        // Player (glowing vector skeletal striker)
        this.player = {
            x: 150,
            y: 0,
            width: 30,
            height: 60,
            velocityY: 0,
            isJumping: false,
            speed: 250
        };

        // Hoop configuration
        this.hoop = {
            x: this.width - 120,
            y: 130, // Rim height
            rimWidth: 65, // Увеличено с 50 для облегчения попадания
            backboardX: this.width - 70,
            backboardY1: 60,
            backboardY2: 155,
            direction: 1, // for movement
            speed: 60
        };

        // Defender Drone (тепер спавниться тільки іноді)
        this.defender = {
            x: this.width - 200,
            y: 110,
            width: 15,
            height: 60,
            velocityY: 80, // pixels per sec
            direction: 1,
            active: false
        };

        // Ball properties
        this.ball = {
            x: 0,
            y: 0,
            radius: 12,
            vx: 0,
            vy: 0,
            state: 'held', // 'held', 'flying', 'scored', 'missed'
            isJumpShot: false,
            trail: []
        };

        this.gravity = 880;
        this.windX = 0; // wind force

        // Aiming properties (for keyboard Space + Arrows)
        this.aimAngle = -45; // degrees
        this.aimPower = 350; // speed magnitude
        this.isAimingKeyboard = false;
        this.isMouseDragging = false;
        
        // Stats
        this.baskets = 0;
        this.streak = 0;
        this.coinsEarned = 0;

        this.particles = [];
        this.netSway = 0;
        this.swishActive = true; // Clean shot flag

        this.keysPressed = {};
        this.activeBallId = 'default';

        this.bindEvents();
    }

    bindEvents() {
        this.keydownHandler = (e) => {
            if (!this.isPlaying) return;
            this.keysPressed[e.code] = true;

            // Space key Down: Jump (if not already jumping), or build shooting power if aiming with keyboard
            if (e.code === 'Space') {
                if (this.ball.state === 'held' && !this.player.isJumping) {
                    this.player.velocityY = -380;
                    this.player.isJumping = true;
                    this.ball.isJumpShot = true;
                }
                e.preventDefault();
            }

            // Keyboard Aim adjust
            if (e.code === 'ArrowUp') {
                this.aimAngle = Math.max(-85, this.aimAngle - 3);
                this.isAimingKeyboard = true;
                e.preventDefault();
            }
            if (e.code === 'ArrowDown') {
                this.aimAngle = Math.min(-10, this.aimAngle + 3);
                this.isAimingKeyboard = true;
                e.preventDefault();
            }

            // Keyboard Release Shoot (Space)
            if (e.code === 'KeyF' || e.code === 'Enter') {
                if (this.ball.state === 'held') {
                    this.shootKeyboard();
                }
                e.preventDefault();
            }
        };

        this.keyupHandler = (e) => {
            if (!this.isPlaying) return;
            this.keysPressed[e.code] = false;
        };

        // Mouse Drag to Shoot
        this.mousedownHandler = (e) => {
            if (!this.isPlaying || this.ball.state !== 'held') return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (this.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (this.height / rect.height);

            // Click near player/ball to start drag
            const dist = Math.hypot(mouseX - this.ball.x, mouseY - this.ball.y);
            if (dist < 40) {
                this.isMouseDragging = true;
                this.isAimingKeyboard = false;
            }
        };

        this.mousemoveHandler = (e) => {
            if (!this.isPlaying || !this.isMouseDragging) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (this.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (this.height / rect.height);

            // Drag vector sets aim
            const dx = this.ball.x - mouseX;
            const dy = this.ball.y - mouseY;
            
            this.aimAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.aimPower = Math.min(650, Math.hypot(dx, dy) * 2.8);
        };

        this.mouseupHandler = (e) => {
            if (this.isMouseDragging) {
                this.isMouseDragging = false;
                this.shootBall();
            }
        };

        // Touch Drag aiming for mobile
        this.touchstartHandler = (e) => {
            if (!this.isPlaying || this.ball.state !== 'held') return;
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (touch.clientX - rect.left) * (this.width / rect.width);
            const mouseY = (touch.clientY - rect.top) * (this.height / rect.height);

            // Increased touch target size for mobile to easily start aiming anywhere near player/ball (180px)
            const dist = Math.hypot(mouseX - this.ball.x, mouseY - this.ball.y);
            if (dist < 180) {
                this.isMouseDragging = true;
                this.isAimingKeyboard = false;
                if (e.cancelable) e.preventDefault();
            }
        };

        this.touchmoveHandler = (e) => {
            if (!this.isPlaying || !this.isMouseDragging) return;
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (touch.clientX - rect.left) * (this.width / rect.width);
            const mouseY = (touch.clientY - rect.top) * (this.height / rect.height);

            const dx = this.ball.x - mouseX;
            const dy = this.ball.y - mouseY;
            
            this.aimAngle = Math.atan2(dy, dx) * 180 / Math.PI;
            this.aimPower = Math.min(650, Math.hypot(dx, dy) * 2.8);
            if (e.cancelable) e.preventDefault();
        };

        this.touchendHandler = (e) => {
            if (this.isMouseDragging) {
                this.isMouseDragging = false;
                this.shootBall();
                if (e.cancelable) e.preventDefault();
            }
        };

        window.addEventListener('keydown', this.keydownHandler);
        window.addEventListener('keyup', this.keyupHandler);
        
        this.canvas.addEventListener('mousedown', this.mousedownHandler);
        this.canvas.addEventListener('mousemove', this.mousemoveHandler);
        window.addEventListener('mouseup', this.mouseupHandler);

        this.canvas.addEventListener('touchstart', this.touchstartHandler, { passive: false });
        this.canvas.addEventListener('touchmove', this.touchmoveHandler, { passive: false });
        this.canvas.addEventListener('touchend', this.touchendHandler, { passive: false });

        // Bind control buttons with smooth holding support
        const btnLeft = document.getElementById('basket-btn-left');
        const btnRight = document.getElementById('basket-btn-right');
        const btnJump = document.getElementById('basket-btn-jump');
        const btnShoot = document.getElementById('basket-btn-shoot');

        if (btnLeft) {
            const startLeft = (e) => { this.keysPressed['KeyA'] = true; if(e.cancelable) e.preventDefault(); };
            const endLeft = () => { this.keysPressed['KeyA'] = false; };
            btnLeft.ontouchstart = startLeft;
            btnLeft.ontouchend = endLeft;
            btnLeft.onmousedown = startLeft;
            btnLeft.onmouseup = endLeft;
        }
        if (btnRight) {
            const startRight = (e) => { this.keysPressed['KeyD'] = true; if(e.cancelable) e.preventDefault(); };
            const endRight = () => { this.keysPressed['KeyD'] = false; };
            btnRight.ontouchstart = startRight;
            btnRight.ontouchend = endRight;
            btnRight.onmousedown = startRight;
            btnRight.onmouseup = endRight;
        }
        if (btnJump) {
            btnJump.onclick = () => this.jump();
            btnJump.ontouchstart = (e) => { this.jump(); if(e.cancelable) e.preventDefault(); };
        }
        if (btnShoot) {
            btnShoot.onclick = () => { if (this.ball.state === 'held') this.shootKeyboard(); };
            btnShoot.ontouchstart = (e) => { if (this.ball.state === 'held') this.shootKeyboard(); if(e.cancelable) e.preventDefault(); };
        }
    }

    unbindEvents() {
        window.removeEventListener('keydown', this.keydownHandler);
        window.removeEventListener('keyup', this.keyupHandler);
        this.canvas.removeEventListener('mousedown', this.mousedownHandler);
        this.canvas.removeEventListener('mousemove', this.mousemoveHandler);
        window.removeEventListener('mouseup', this.mouseupHandler);
        this.canvas.removeEventListener('touchstart', this.touchstartHandler);
        this.canvas.removeEventListener('touchmove', this.touchmoveHandler);
        this.canvas.removeEventListener('touchend', this.touchendHandler);
        
        // Clean up mobile buttons listeners
        const btnLeft = document.getElementById('basket-btn-left');
        const btnRight = document.getElementById('basket-btn-right');
        const btnJump = document.getElementById('basket-btn-jump');
        const btnShoot = document.getElementById('basket-btn-shoot');
        if (btnLeft) { btnLeft.ontouchstart = null; btnLeft.ontouchend = null; btnLeft.onmousedown = null; btnLeft.onmouseup = null; }
        if (btnRight) { btnRight.ontouchstart = null; btnRight.ontouchend = null; btnRight.onmousedown = null; btnRight.onmouseup = null; }
        if (btnJump) { btnJump.onclick = null; btnJump.ontouchstart = null; }
        if (btnShoot) { btnShoot.onclick = null; btnShoot.ontouchstart = null; }
        
        this.keysPressed = {};
    }

    movePlayer(amount) {
        this.player.x = Math.max(50, Math.min(this.width - 250, this.player.x + amount));
    }

    jump() {
        if (!this.player.isJumping) {
            this.player.velocityY = -380;
            this.player.isJumping = true;
            this.ball.isJumpShot = true;
        }
    }

    start() {
        this.isPlaying = true;
        this.baskets = 0;
        this.streak = 0;
        this.coinsEarned = 0;
        this.particles = [];
        this.resetWind();
        
        try {
            this.activeBallId = localStorage.getItem('pm_equipped_ball') || 'default';
        } catch(e) {
            this.activeBallId = 'default';
        }

        this.resetBall();
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    resetBall() {
        this.ball.state = 'held';
        this.ball.vx = 0;
        this.ball.vy = 0;
        this.ball.isJumpShot = false;
        this.ball.trail = [];
        this.swishActive = true;
        this.isMouseDragging = false;
        
        // Aiming guide defaults
        if (!this.isAimingKeyboard) {
            this.aimAngle = -48;
            this.aimPower = 380;
        }
        
        // Дрон-захисник спавниться з шансом 45% тільки після того, як гравець закинув хоча б 2 м'ячі
        this.defender.active = (this.baskets >= 2) && (Math.random() < 0.45);

        this.positionBallOnPlayer();
    }

    positionBallOnPlayer() {
        if (this.ball.state === 'held') {
            this.ball.x = this.player.x + 18;
            this.ball.y = this.groundY - this.player.y - this.player.height + 15;
        }
    }

    resetWind() {
        // Random wind speed between -80 and +80
        this.windX = (Math.random() - 0.5) * 160;
    }

    shootKeyboard() {
        this.shootBall();
    }

    shootBall() {
        const rad = this.aimAngle * Math.PI / 180;
        // Jump shot adds additional power
        const finalPower = this.aimPower * (this.ball.isJumpShot ? 1.15 : 1.0);
        
        this.ball.vx = Math.cos(rad) * finalPower;
        this.ball.vy = Math.sin(rad) * finalPower;
        this.ball.state = 'flying';

        if (window.gameAudio) window.gameAudio.playWhistle();
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
        // Player Horizontal movement
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) {
            this.movePlayer(-this.player.speed * dt);
        }
        if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) {
            this.movePlayer(this.player.speed * dt);
        }

        // Player Jump Physics
        if (this.player.isJumping) {
            this.player.velocityY += 980 * dt; // gravity
            this.player.y -= this.player.velocityY * dt;

            if (this.player.y <= 0) {
                this.player.y = 0;
                this.player.velocityY = 0;
                this.player.isJumping = false;
            }
        }

        // Hoop vertical movement after 3 baskets
        if (this.baskets >= 3) {
            this.hoop.y += this.hoop.speed * this.hoop.direction * dt;
            if (this.hoop.y > 190) {
                this.hoop.y = 190;
                this.hoop.direction = -1;
            } else if (this.hoop.y < 85) {
                this.hoop.y = 85;
                this.hoop.direction = 1;
            }
            // Update backboard limits
            this.hoop.backboardY1 = this.hoop.y - 70;
            this.hoop.backboardY2 = this.hoop.y + 25;
        }

        // Defender Drone movement (лише коли активний)
        if (this.defender.active) {
            this.defender.y += this.defender.velocityY * this.defender.direction * dt;
            if (this.defender.y > this.groundY - this.defender.height - 20) {
                this.defender.y = this.groundY - this.defender.height - 20;
                this.defender.direction = -1;
            } else if (this.defender.y < 60) {
                this.defender.y = 60;
                this.defender.direction = 1;
            }
        }

        // Ball state update
        if (this.ball.state === 'held') {
            this.positionBallOnPlayer();
        } else if (this.ball.state === 'flying') {
            // Зменшено вплив вітру з 0.15 до 0.08 для більш передбачуваного польоту
            this.ball.vx += this.windX * 0.08 * dt;
            this.ball.vy += this.gravity * dt;

            this.ball.x += this.ball.vx * dt;
            this.ball.y += this.ball.vy * dt;

            // Add trail
            this.ball.trail.push({x: this.ball.x, y: this.ball.y});
            if (this.ball.trail.length > 15) this.ball.trail.shift();

            // Spawn trail particles based on ball skin
            if (this.activeBallId === 'fire') {
                this.spawnTrailParticle(this.ball.x, this.ball.y, '#ff4400');
            } else if (this.activeBallId === 'neon') {
                this.spawnTrailParticle(this.ball.x, this.ball.y, '#00ffff');
            } else {
                this.spawnTrailParticle(this.ball.x, this.ball.y, 'rgba(0, 255, 102, 0.4)');
            }

            this.checkCollisions();
        }

        // Net sway animation
        if (this.netSway > 0) this.netSway -= dt * 4;

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // HUD Sync
        const hudBaskets = document.getElementById('basket-hud-scored');
        const hudStreak = document.getElementById('basket-hud-streak');
        const hudWind = document.getElementById('basket-hud-wind');
        const hudCoins = document.getElementById('basket-hud-coins');

        if (hudBaskets) hudBaskets.innerText = `М'ячі: ${this.baskets}`;
        if (hudStreak) {
            hudStreak.innerText = `Серія: ${this.streak}`;
            if (this.streak >= 3) hudStreak.style.color = '#ff6600';
            else hudStreak.style.color = '#ff3399';
        }
        if (hudWind) {
            const dir = this.windX > 0 ? '→' : '←';
            hudWind.innerText = `Вітер: ${dir} ${Math.abs(Math.round(this.windX / 10))} м/с`;
        }
        if (hudCoins) hudCoins.innerText = `🪙 ${this.coinsEarned}`;
    }

    spawnTrailParticle(x, y, color) {
        this.particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30 - 20,
            life: 0.3 + Math.random() * 0.2,
            maxLife: 0.5,
            color: color,
            radius: 1 + Math.random() * 2
        });
    }

    checkCollisions() {
        // 1. Boundary check
        if (this.ball.x < -20 || this.ball.x > this.width + 20 || this.ball.y > this.height + 20) {
            this.handleMiss();
            return;
        }

        // 2. Ground bounce
        if (this.ball.y + this.ball.radius >= this.groundY) {
            this.ball.y = this.groundY - this.ball.radius;
            this.ball.vy = -this.ball.vy * 0.45; // Bounce loss
            this.ball.vx *= 0.7;
            this.swishActive = false;
            
            // If ball stopped bouncing
            if (Math.abs(this.ball.vy) < 40) {
                this.handleMiss();
            }
        }

        // 3. Backboard collision (glowing neon pink board)
        const bbX = this.hoop.backboardX;
        const bbY1 = this.hoop.backboardY1;
        const bbY2 = this.hoop.backboardY2;

        if (this.ball.x + this.ball.radius >= bbX - 6 && this.ball.x - this.ball.radius <= bbX && 
            this.ball.y >= bbY1 && this.ball.y <= bbY2) {
            // Bounce back left
            this.ball.x = bbX - 6 - this.ball.radius;
            this.ball.vx = -Math.abs(this.ball.vx) * 0.78;
            this.swishActive = false;
            if (window.gameAudio) window.gameAudio.playKeeperSave();
        }

        // 4. Defender Drone Collision (лише коли активний)
        if (this.defender.active) {
            const df = this.defender;
            const hitDefenderX = this.ball.x + this.ball.radius >= df.x && this.ball.x - this.ball.radius <= df.x + df.width;
            const hitDefenderY = this.ball.y + this.ball.radius >= df.y && this.ball.y - this.ball.radius <= df.y + df.height;

            if (hitDefenderX && hitDefenderY) {
                // Blocked!
                this.ball.vx = -Math.abs(this.ball.vx) * 0.65;
                this.ball.vy = (Math.random() - 0.5) * 120 - 150;
                this.swishActive = false;
                this.streak = 0; // Break streak
                if (window.gameAudio) window.gameAudio.playMissGroan();
                
                // Blocked particle explosion
                for (let i = 0; i < 10; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 40 + Math.random() * 80;
                    this.particles.push({
                        x: this.ball.x,
                        y: this.ball.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        radius: 2 + Math.random() * 2,
                        life: 0.3,
                        maxLife: 0.3,
                        color: '#ff0033'
                    });
                }
            }
        }

        // 5. Rim points (Front Rim: hoop.x, Back Rim: hoop.x + hoop.rimWidth)
        const rimY = this.hoop.y;
        const rimX1 = this.hoop.x;
        const rimX2 = this.hoop.x + this.hoop.rimWidth;

        // Front Rim Collision
        const distToRim1 = Math.hypot(this.ball.x - rimX1, this.ball.y - rimY);
        if (distToRim1 < this.ball.radius + 3) {
            const angle = Math.atan2(this.ball.y - rimY, this.ball.x - rimX1);
            this.ball.x = rimX1 + Math.cos(angle) * (this.ball.radius + 3.1);
            this.ball.vx = Math.cos(angle) * Math.hypot(this.ball.vx, this.ball.vy) * 0.72;
            this.ball.vy = Math.sin(angle) * Math.hypot(this.ball.vx, this.ball.vy) * 0.72;
            this.swishActive = false;
            if (window.gameAudio) window.gameAudio.playKeeperSave();
        }

        // Back Rim Collision
        const distToRim2 = Math.hypot(this.ball.x - rimX2, this.ball.y - rimY);
        if (distToRim2 < this.ball.radius + 3) {
            const angle = Math.atan2(this.ball.y - rimY, this.ball.x - rimX2);
            this.ball.x = rimX2 + Math.cos(angle) * (this.ball.radius + 3.1);
            this.ball.vx = Math.cos(angle) * Math.hypot(this.ball.vx, this.ball.vy) * 0.72;
            this.ball.vy = Math.sin(angle) * Math.hypot(this.ball.vx, this.ball.vy) * 0.72;
            this.swishActive = false;
            if (window.gameAudio) window.gameAudio.playKeeperSave();
        }

        // 6. Score Condition: passes downward through the hoop aperture (межі розширено для легшого попадання)
        if (this.ball.vy > 0 && this.ball.y >= rimY - 5 && this.ball.y <= rimY + 18 && 
            this.ball.x >= rimX1 - 2 && this.ball.x <= rimX2 + 2) {
            if (this.ball.state === 'flying') {
                this.handleScore();
            }
        }
    }

    handleScore() {
        this.ball.state = 'scored';
        this.baskets++;
        this.streak++;
        this.netSway = 1.0; // trigger net wave

        // Base reward
        let reward = 25;

        // Clean shot (Swish) bonus
        if (this.swishActive) {
            reward = Math.round(reward * 1.5);
            this.spawnConfetti('#00ffff', 25);
        } else {
            this.spawnConfetti('#ffd700', 12);
        }

        // On fire streak multiplier
        if (this.streak >= 3) {
            reward = Math.round(reward * 2.0);
            this.spawnConfetti('#ff4400', 30);
        }

        // Jump Shot multiplier
        if (this.ball.isJumpShot) {
            reward = Math.round(reward * 1.2);
        }

        this.coinsEarned += reward;

        if (window.gameAudio) window.gameAudio.playGoalCheer();

        setTimeout(() => {
            this.resetWind();
            this.resetBall();
        }, 1200);
    }

    handleMiss() {
        this.ball.state = 'missed';
        this.streak = 0; // Reset streak
        
        setTimeout(() => {
            this.resetWind();
            this.resetBall();
        }, 1200);
    }

    spawnConfetti(color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 140;
            this.particles.push({
                x: this.hoop.x + this.hoop.rimWidth / 2,
                y: this.hoop.y + 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                color: color,
                radius: 2 + Math.random() * 3
            });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Background
        this.ctx.fillStyle = '#06020c';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Synthwave perspective lines
        this.ctx.strokeStyle = 'rgba(255, 51, 153, 0.08)';
        this.ctx.lineWidth = 1;
        const gridCount = 20;
        for (let i = 0; i <= gridCount; i++) {
            const lineX = (this.width / gridCount) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, this.groundY);
            this.ctx.lineTo(lineX - 150, this.height);
            this.ctx.stroke();
        }

        // Draw Ground
        this.ctx.strokeStyle = '#ff3399';
        this.ctx.shadowColor = '#ff3399';
        this.ctx.shadowBlur = 10;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.stroke();

        // Draw Backboard
        this.ctx.strokeStyle = '#ff3399';
        this.ctx.shadowBlur = 12;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(this.hoop.backboardX - 4, this.hoop.backboardY1, 6, this.hoop.backboardY2 - this.hoop.backboardY1);

        // Inner square of backboard
        this.ctx.strokeStyle = 'rgba(255, 51, 153, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(this.hoop.backboardX - 4, this.hoop.y - 40, 6, 40);

        // Draw Net (neon cyan sway lines)
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 8;
        this.ctx.lineWidth = 2;
        const sway = Math.sin(performance.now() * 0.015) * 4 * this.netSway;
        
        this.ctx.beginPath();
        // Left net strand
        this.ctx.moveTo(this.hoop.x + 3, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + 12 + sway, this.hoop.y + 35);
        // Right net strand
        this.ctx.moveTo(this.hoop.x + this.hoop.rimWidth - 3, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + this.hoop.rimWidth - 12 + sway, this.hoop.y + 35);
        // Intersecting net lines
        this.ctx.lineTo(this.hoop.x + 12 + sway, this.hoop.y + 35);
        this.ctx.moveTo(this.hoop.x + 18, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + 23 + sway, this.hoop.y + 35);
        this.ctx.moveTo(this.hoop.x + this.hoop.rimWidth - 18, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + this.hoop.rimWidth - 23 + sway, this.hoop.y + 35);
        
        // Horizontal net lines
        this.ctx.moveTo(this.hoop.x + 5, this.hoop.y + 12);
        this.ctx.lineTo(this.hoop.x + this.hoop.rimWidth - 5 + sway*0.3, this.hoop.y + 12);
        this.ctx.moveTo(this.hoop.x + 8, this.hoop.y + 24);
        this.ctx.lineTo(this.hoop.x + this.hoop.rimWidth - 8 + sway*0.6, this.hoop.y + 24);
        this.ctx.stroke();

        // Draw Rim Ring (Front)
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(this.hoop.x, this.hoop.y);
        this.ctx.lineTo(this.hoop.x + this.hoop.rimWidth, this.hoop.y);
        this.ctx.stroke();

        // Draw Defender Drone (shield) - лише коли активний
        if (this.defender.active) {
            const df = this.defender;
            this.ctx.strokeStyle = '#ff0033';
            this.ctx.shadowColor = '#ff0033';
            this.ctx.shadowBlur = 10;
            this.ctx.lineWidth = 2.5;
            this.ctx.fillStyle = 'rgba(255, 0, 51, 0.15)';
            this.ctx.strokeRect(df.x, df.y, df.width, df.height);
            this.ctx.fillRect(df.x, df.y, df.width, df.height);
        }

        // Draw Aim Trajectory guide
        if (this.ball.state === 'held' && (this.isMouseDragging || this.isAimingKeyboard)) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            this.ctx.setLineDash([5, 5]);
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            let simX = this.ball.x;
            let simY = this.ball.y;
            const rad = this.aimAngle * Math.PI / 180;
            const simPower = this.aimPower * (this.ball.isJumpShot ? 1.15 : 1.0);
            let simVx = Math.cos(rad) * simPower;
            let simVy = Math.sin(rad) * simPower;
            
            // Подовжено лінію прицілювання (35 кроків замість 20) для максимальної зручності
            const trajPointsCount = 35; 
            
            for (let i = 0; i < trajPointsCount; i++) {
                this.ctx.lineTo(simX, simY);
                simVx += this.windX * 0.08 * 0.035; // відповідно зменшено вплив вітру в симуляції
                simVy += this.gravity * 0.035;
                simX += simVx * 0.035;
                simY += simVy * 0.035;
            }
            this.ctx.stroke();
            this.ctx.setLineDash([]); // restore
        }

        // Draw Ball
        if (this.ball.state !== 'held' || this.isMouseDragging || this.isAimingKeyboard) {
            // Draw Ball Trail
            this.ctx.save();
            this.ball.trail.forEach((tPos, idx) => {
                this.ctx.globalAlpha = (idx / this.ball.trail.length) * 0.35;
                this.ctx.fillStyle = this.activeBallId === 'fire' ? '#ff6600' : (this.activeBallId === 'neon' ? '#00ffff' : '#ff9900');
                this.ctx.beginPath();
                this.ctx.arc(tPos.x, tPos.y, this.ball.radius * 0.8, 0, Math.PI*2);
                this.ctx.fill();
            });
            this.ctx.restore();

            // Draw glowing basketball
            this.ctx.strokeStyle = this.activeBallId === 'fire' ? '#ff3300' : (this.activeBallId === 'neon' ? '#00ffff' : '#ff6600');
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.shadowBlur = 12;
            this.ctx.lineWidth = 2.5;
            this.ctx.beginPath();
            this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI*2);
            this.ctx.stroke();
            this.ctx.fillStyle = this.activeBallId === 'fire' ? '#ffd700' : '#000000';
            this.ctx.fill();
            
            // Basketball stripes
            this.ctx.beginPath();
            this.ctx.moveTo(this.ball.x - this.ball.radius, this.ball.y);
            this.ctx.lineTo(this.ball.x + this.ball.radius, this.ball.y);
            this.ctx.moveTo(this.ball.x, this.ball.y - this.ball.radius);
            this.ctx.lineTo(this.ball.x, this.ball.y + this.ball.radius);
            this.ctx.stroke();
        }

        // Draw Particles
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color || '#ff3399';
            this.ctx.shadowColor = p.color || '#ff3399';
            this.ctx.shadowBlur = 6;
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
        this.ctx.shadowBlur = 0; // reset

        // Draw Player (glowing vector skeletal character)
        const pX = this.player.x;
        const pY = this.groundY - this.player.y;

        this.ctx.strokeStyle = '#ff3399';
        this.ctx.shadowColor = '#ff3399';
        this.ctx.shadowBlur = 10;
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        // Head
        this.ctx.arc(pX + 15, pY - 54, 7, 0, Math.PI*2);
        // Spine
        this.ctx.moveTo(pX + 15, pY - 47);
        this.ctx.lineTo(pX + 13, pY - 26);
        // Left Leg
        const animPhase = Math.sin(performance.now() * 0.01);
        const legAngle = this.player.isJumping ? 0.3 : animPhase * 0.45;
        this.ctx.moveTo(pX + 13, pY - 26);
        this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 16, pY - 13);
        this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 26, pY - 2);
        // Right Leg
        this.ctx.moveTo(pX + 13, pY - 26);
        this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 16, pY - 13);
        this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 26, pY - 2);
        
        // Arms (raised up aiming towards hoop)
        this.ctx.moveTo(pX + 15, pY - 43);
        if (this.ball.state === 'held') {
            this.ctx.lineTo(pX + 22, pY - 45);
            this.ctx.lineTo(pX + 20, pY - 50);
        } else {
            this.ctx.lineTo(pX + 32, pY - 58);
            this.ctx.moveTo(pX + 15, pY - 43);
            this.ctx.lineTo(pX + 28, pY - 54);
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // reset
    }
}
