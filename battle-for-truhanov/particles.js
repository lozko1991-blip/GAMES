        class Particle {
            constructor(x, y, vx, vy, size, color, life, type = 'generic') {
                this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.size = size; this.color = color; this.life = life; this.maxLife = life; this.type = type;
            }
            update() { 
                if (this.type === 'blood_puddle') { this.life -= 0.3; return; }
                this.x += this.vx; this.y += this.vy; this.life--; 
                if (this.type === 'blood' || this.type === 'leaves' || this.type === 'chestnuts' || this.type === 'diplomas') { 
                    this.vy += 0.4; // MK blood falls faster
                    if (this.type === 'blood' && this.y >= GROUND_Y) {
                        this.y = GROUND_Y; this.vy = 0; this.vx = 0;
                        this.type = 'blood_puddle'; this.maxLife = 300 + Math.random() * 200; this.life = this.maxLife;
                    }
                } 
            }
            draw() {
                CTX.save(); CTX.fillStyle = this.color;
                if (this.type === 'rain') {
                    CTX.strokeStyle = this.color; CTX.lineWidth = 1; CTX.beginPath(); CTX.moveTo(this.x, this.y); CTX.lineTo(this.x + this.vx * 2, this.y + this.vy * 2); CTX.stroke();
                } else if (this.type === 'blood_puddle') {
                    CTX.globalAlpha = Math.min(1, this.life / 60); 
                    CTX.beginPath(); 
                    CTX.ellipse(this.x, this.y, this.size * 2.5, this.size * 0.4, 0, 0, Math.PI * 2); 
                    CTX.fill();
                } else {
                    CTX.globalAlpha = Math.max(0, this.life / this.maxLife); CTX.beginPath(); CTX.arc(this.x, this.y, this.size, 0, Math.PI * 2); CTX.fill();
                }
                CTX.restore();
            }
        }
        function addParticle(p) {
            if (state.particles.length >= 150) {
                state.particles.shift();
            }
            state.particles.push(p);
        }
        function showFloatingText(text, x, y, color = '#ffcc00') { state.floatingTexts.push({ text, x, y, vy: -2.2, alpha: 1, color }) }
        function createImpactBurst(x, y, color, direction = 1) {
            for (let i = 0; i < 10; i++) {
                const spread = 1.8 + Math.random() * 4.8;
                const angle = (Math.random() * Math.PI * 0.9) - Math.PI / 1.8;
                const vx = Math.cos(angle) * spread * direction;
                const vy = Math.sin(angle) * spread - 1.5;
                addParticle(new Particle(x, y, vx, vy, 1.8 + Math.random() * 2.4, color, 14 + Math.random() * 10, 'spark'));
            }
        }
        function createBloodSplatter(x, y, isLeft, multiplier = 1) {
            const count = 24 * multiplier;
            for (let i = 0; i < count; i++) {
                const dir = isLeft ? 1 : -1; const vx = (dir * 3.0) + (Math.random() * 5 - 2.5); const vy = -3.0 + (Math.random() * 6 - 3.0); const size = 2.5 + Math.random() * 3.5;
                addParticle(new Particle(x, y, vx, vy, size, 'rgba(220,0,30,0.95)', 25 + Math.random() * 25, 'blood'));
            }
        }
        function createBlockSparks(x, y) {
            for (let i = 0; i < 14; i++) {
                const vx = Math.random() * 7 - 3.5; const vy = Math.random() * 7 - 3.5; const size = 1.5 + Math.random() * 2.0;
                addParticle(new Particle(x, y, vx, vy, size, '#00ffcc', 15 + Math.random() * 10, 'spark'));
            }
        }
        function createElementalBurst(x, y, type) {
            const colors = { water: '#00ccff', energy: '#ff00ff', lightning: '#ffee00', fire: '#ff5500' }; const col = colors[type] || '#fff';
            for (let i = 0; i < 18; i++) {
                const vx = (Math.random() - 0.5) * 9; const vy = (Math.random() - 0.5) * 9;
                addParticle(new Particle(x, y, vx, vy, 2.2 + Math.random() * 3, col, 20 + Math.random() * 15, 'spark'));
            }
        }
