/*********************************************************************
 * MATRIX STRIKER RUN - 2D VECTOR MINI-GAME
 *********************************************************************/
class MatrixRunGame {
    constructor(canvas, onWin, onFail) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.onWin = onWin;
        this.onFail = onFail;

        this.width = canvas.width;
        this.height = canvas.height;

        this.isPlaying = false;
        this.distance = 0;
        this.targetDistance = 400; // Run 400 meters to win
        this.speed = 220; // pixels per second

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

        this.obstacles = [];
        this.projectiles = [];
        this.particles = [];
        this.collectibles = [];
        this.matrixStreams = [];

        // Timers
        this.spawnTimer = 0;
        this.collectibleSpawnTimer = 0;
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
        this.keyHandler = (e) => {
            if (!this.isPlaying) return;
            if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
                this.jump();
                e.preventDefault();
            }
            if (e.code === 'ShiftLeft' || e.code === 'KeyS' || e.code === 'ArrowDown') {
                this.slide();
                e.preventDefault();
            }
            if (e.code === 'KeyF' || e.code === 'KeyE') {
                this.shoot();
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', this.keyHandler);

        // Bind Touch UI if elements exist
        const btnJump = document.getElementById('matrix-btn-jump');
        const btnSlide = document.getElementById('matrix-btn-slide');
        const btnShoot = document.getElementById('matrix-btn-shoot');

        if (btnJump) btnJump.onclick = () => this.jump();
        if (btnSlide) btnSlide.onclick = () => this.slide();
        if (btnShoot) btnShoot.onclick = () => this.shoot();
    }

    unbindEvents() {
        window.removeEventListener('keydown', this.keyHandler);
    }

    start() {
        this.isPlaying = true;
        this.distance = 0;
        this.lives = 3;
        this.ammo = 5;
        this.obstacles = [];
        this.projectiles = [];
        this.particles = [];
        this.collectibles = [];
        this.player.y = 0;
        this.player.velocityY = 0;
        this.player.isJumping = false;
        this.player.isSliding = false;
        this.player.invulnerableTimer = 0;

        this.lastTime = performance.now();
        this.initMatrixStreams();
        
        requestAnimationFrame((t) => this.loop(t));
    }

    jump() {
        if (!this.player.isJumping && !this.player.isSliding) {
            this.player.velocityY = this.jumpForce;
            this.player.isJumping = true;
            if (window.gameAudio) window.gameAudio.playKeeperSave(); // sound indicator
        }
    }

    slide() {
        if (!this.player.isJumping && !this.player.isSliding) {
            this.player.isSliding = true;
            this.player.slideTimer = 0.55; // slide for 0.55 seconds
            this.player.height = 30; // shrink bounding box
        }
    }

    shoot() {
        if (this.ammo > 0 && this.player.shootCooldown <= 0) {
            this.ammo--;
            this.player.shootCooldown = 0.35; // shoot every 0.35s

            // Spawn projectile
            this.projectiles.push({
                x: this.player.x + 30,
                y: this.groundY - this.player.y - (this.player.isSliding ? 15 : 35),
                radius: 8,
                velocityX: 550 // fly fast
            });

            if (window.gameAudio) window.gameAudio.playWhistle(); // kick sound indicator
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
            y: 0, // Grounded by default
            shattered: false
        };

        if (type === 'laser') {
            obs.height = 25;
            obs.y = 45; // High up, must slide under
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
            y: 50 + Math.random() * 80,
            width: 20,
            height: 20,
            type: 'ball'
        });
    }

    shatterObstacle(obs) {
        obs.shattered = true;
        // Spawn 20 glowing green particles
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
        if (window.gameAudio) window.gameAudio.playNetRustle(); // shatter sound
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
        // Increment distance
        this.distance += this.speed * 0.05 * dt;
        
        // Win check
        if (this.distance >= this.targetDistance) {
            this.isPlaying = false;
            this.unbindEvents();
            // Calculate coins reward based on remaining hearts
            const coinsEarned = 100 + this.lives * 50; 
            this.onWin(coinsEarned);
            return;
        }

        // Apply timers
        if (this.player.shootCooldown > 0) this.player.shootCooldown -= dt;
        if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= dt;

        // Player slide timer
        if (this.player.isSliding) {
            this.player.slideTimer -= dt;
            if (this.player.slideTimer <= 0) {
                this.player.isSliding = false;
                this.player.height = 60;
            }
        }

        // Player physics (Jump/Gravity)
        if (this.player.isJumping) {
            this.player.velocityY += this.gravity * dt;
            this.player.y -= this.player.velocityY * dt;

            if (this.player.y <= 0) {
                this.player.y = 0;
                this.player.velocityY = 0;
                this.player.isJumping = false;
            }
        }

        // Spawn obstacles
        this.spawnTimer += dt;
        const spawnInterval = Math.max(1.1, 2.0 - (this.distance / 250)); // get faster
        if (this.spawnTimer >= spawnInterval) {
            this.spawnTimer = 0;
            this.spawnObstacle();
        }

        // Spawn collectibles
        this.collectibleSpawnTimer += dt;
        if (this.collectibleSpawnTimer >= 3.8) {
            this.collectibleSpawnTimer = 0;
            this.spawnCollectible();
        }

        // Update Matrix streams background
        this.matrixStreams.forEach(stream => {
            stream.y += stream.speed * dt;
            if (stream.y > this.height) {
                stream.y = Math.random() * -150;
                stream.chars = Array.from({length: 10}, () => String.fromCharCode(33 + Math.floor(Math.random() * 93)));
            }
        });

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += proj.velocityX * dt;
            
            // Remove offscreen
            if (proj.x > this.width + 20) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Check hit with breakable obstacles
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

        // Update Collectibles
        for (let i = this.collectibles.length - 1; i >= 0; i--) {
            const col = this.collectibles[i];
            col.x -= this.speed * dt;

            // Collision with player
            const pX = this.player.x;
            const pY = this.groundY - this.player.y - this.player.height;
            const hitX = col.x + col.width >= pX && col.x <= pX + this.player.width;
            const hitY = col.y + col.height >= pY && col.y <= pY + this.player.height;

            if (hitX && hitY) {
                if (col.type === 'ball') {
                    this.ammo = Math.min(10, this.ammo + 3);
                    if (window.gameAudio) window.gameAudio.playGoalCheer();
                }
                this.collectibles.splice(i, 1);
                continue;
            }

            if (col.x < -50) {
                this.collectibles.splice(i, 1);
            }
        }

        // Update Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed * dt;

            // Remove offscreen or shattered
            if (obs.x < -50 || obs.shattered) {
                this.obstacles.splice(i, 1);
                continue;
            }

            // Check collision with player
            if (this.player.invulnerableTimer <= 0) {
                const pX = this.player.x;
                const pY = this.groundY - this.player.y - this.player.height;
                const hitX = obs.x + obs.width >= pX && obs.x <= pX + this.player.width;
                const hitY = (this.groundY - obs.y - obs.height) < pY + this.player.height && (this.groundY - obs.y) > pY;

                if (hitX && hitY) {
                    // Collision!
                    this.lives--;
                    this.player.invulnerableTimer = 1.0; // 1s invulnerable

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

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // light gravity
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Update indicators
        const hudDist = document.getElementById('matrix-hud-dist');
        const hudHearts = document.getElementById('matrix-hud-hearts');
        const hudAmmo = document.getElementById('matrix-hud-ammo');

        if (hudDist) hudDist.innerText = `${Math.floor(this.distance)}m / ${this.targetDistance}m`;
        if (hudHearts) hudHearts.innerHTML = '❤️'.repeat(this.lives) + '🖤'.repeat(this.maxLives - this.lives);
        if (hudAmmo) hudAmmo.innerText = `⚽ x${this.ammo}`;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw matrix coding background (Dark digital rain look)
        this.ctx.fillStyle = '#020b05';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.fillStyle = 'rgba(0, 255, 102, 0.12)';
        this.ctx.font = '10px monospace';
        this.matrixStreams.forEach(stream => {
            stream.chars.forEach((char, idx) => {
                this.ctx.fillText(char, stream.x, stream.y + idx * 12);
            });
        });

        // 2. Draw Vector ground grid line
        this.ctx.strokeStyle = '#00ff66';
        this.ctx.shadowColor = '#00ff66';
        this.ctx.shadowBlur = 10;
        this.ctx.lineWidth = 3;

        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.width, this.groundY);
        this.ctx.stroke();

        // 3D Grid Perspective lines for high-end feel
        this.ctx.strokeStyle = 'rgba(0, 255, 102, 0.15)';
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

        // 3. Draw Collectibles (glowing ammo balls)
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 8;
        this.ctx.lineWidth = 2;
        this.collectibles.forEach(col => {
            this.ctx.beginPath();
            this.ctx.arc(col.x + col.width/2, col.y + col.height/2, 9, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(0,255,255,0.2)';
            this.ctx.fill();
        });

        // 4. Draw Projectiles
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.shadowColor = '#00ff66';
        this.ctx.shadowBlur = 12;
        this.ctx.lineWidth = 2;
        this.projectiles.forEach(proj => {
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fillStyle = '#00ff66';
            this.ctx.fill();
        });

        // 5. Draw Obstacles
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
                // Draw diagonal glass lines
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, this.groundY - obs.y - obs.height);
                this.ctx.lineTo(obs.x + obs.width, this.groundY - obs.y);
                this.ctx.stroke();
            } else if (obs.type === 'laser') {
                this.ctx.strokeStyle = '#ff0033';
                this.ctx.shadowColor = '#ff0033';
                this.ctx.shadowBlur = 12;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, this.groundY - obs.y - obs.height/2);
                this.ctx.lineTo(obs.x + obs.width, this.groundY - obs.y - obs.height/2);
                this.ctx.stroke();
            } else if (obs.type === 'spike') {
                this.ctx.strokeStyle = '#ff6600';
                this.ctx.shadowColor = '#ff6600';
                this.ctx.shadowBlur = 8;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(obs.x, this.groundY);
                this.ctx.lineTo(obs.x + obs.width/2, this.groundY - obs.height);
                this.ctx.lineTo(obs.x + obs.width, this.groundY);
                this.ctx.closePath();
                this.ctx.stroke();
                this.ctx.fillStyle = 'rgba(255, 102, 0, 0.1)';
                this.ctx.fill();
            } else {
                // Hurdle
                this.ctx.strokeStyle = '#ffcc00';
                this.ctx.shadowColor = '#ffcc00';
                this.ctx.shadowBlur = 8;
                this.ctx.lineWidth = 2.5;
                this.ctx.strokeRect(obs.x, this.groundY - obs.y - obs.height, obs.width, obs.height);
            }
        });

        // 6. Draw Particles (Shatter effect)
        this.particles.forEach(p => {
            this.ctx.fillStyle = '#00ffcc';
            this.ctx.shadowColor = '#00ffcc';
            this.ctx.shadowBlur = 6;
            this.ctx.globalAlpha = p.life / p.maxLife;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0; // restore

        // 7. Draw Player (Glowing Vector Line Footballer Model)
        const pX = this.player.x;
        const pY = this.groundY - this.player.y;
        
        // Blink if invulnerable
        if (this.player.invulnerableTimer > 0 && Math.floor(time / 100) % 2 === 0) {
            // invisible this frame
        } else {
            this.ctx.strokeStyle = '#00ff66';
            this.ctx.shadowColor = '#00ff66';
            this.ctx.shadowBlur = 10;
            this.ctx.lineWidth = 3;

            // Draw player bones
            this.ctx.beginPath();
            if (this.player.isSliding) {
                // Slid/Duck model
                // Head
                this.ctx.arc(pX + 15, pY - 25, 6, 0, Math.PI*2);
                // Body
                this.ctx.moveTo(pX + 15, pY - 19);
                this.ctx.lineTo(pX - 10, pY - 5);
                // Slide Leg
                this.ctx.lineTo(pX + 25, pY - 2);
            } else {
                // Running or Jumping model
                const animPhase = Math.sin(time * 0.015);
                const legAngle = this.player.isJumping ? 0.4 : animPhase * 0.6;

                // Head
                this.ctx.arc(pX + 15, pY - 54, 7, 0, Math.PI*2);
                // Spine
                this.ctx.moveTo(pX + 15, pY - 47);
                this.ctx.lineTo(pX + 13, pY - 26);
                // Leg Left
                this.ctx.moveTo(pX + 13, pY - 26);
                this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 16, pY - 13);
                this.ctx.lineTo(pX + 13 - Math.sin(legAngle) * 26, pY - 2);
                // Leg Right
                this.ctx.moveTo(pX + 13, pY - 26);
                this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 16, pY - 13);
                this.ctx.lineTo(pX + 13 + Math.sin(legAngle) * 26, pY - 2);
                // Arm Left
                this.ctx.moveTo(pX + 15, pY - 43);
                this.ctx.lineTo(pX + 3, pY - 32);
                // Arm Right
                this.ctx.moveTo(pX + 15, pY - 43);
                this.ctx.lineTo(pX + 25, pY - 35);
            }
            this.ctx.stroke();
            
            // Draw ball attached to foot if not sliding/jumping
            if (!this.player.isJumping && !this.player.isSliding) {
                this.ctx.strokeStyle = '#00ff66';
                this.ctx.beginPath();
                this.ctx.arc(pX + 25 + Math.sin(time * 0.02) * 4, pY - 4, 5, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }

        this.ctx.shadowBlur = 0; // Restore shadow
    }
}
