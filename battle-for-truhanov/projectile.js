        class Projectile {
            constructor(x, y, vx, color, type, owner, vy = 0) {
                this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.color = color; this.type = type; this.owner = owner; this.radius = type === 'charged_rocket' ? 24 : 15; this.angle = 0;
            }
            update() { 
                this.x += this.vx; 
                this.y += this.vy;
                this.angle += 0.2; 
            }
            draw() {
                CTX.save(); CTX.shadowBlur = 15; CTX.shadowColor = this.color; CTX.fillStyle = this.color;
                if (this.type === 'water') {
                    CTX.beginPath(); CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2); CTX.fill();
                } else if (this.type === 'lightning') {
                    CTX.strokeStyle = '#fff'; CTX.lineWidth = 3; CTX.beginPath(); CTX.moveTo(this.x - 15, this.y + 8);
                    CTX.lineTo(this.x, this.y - 12); CTX.lineTo(this.x - 4, this.y + 3); CTX.lineTo(this.x + 15, this.y - 10); CTX.stroke();
                } else if (this.type === 'fire') {
                    CTX.fillStyle = '#ffaa00'; CTX.beginPath(); CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2); CTX.fill();
                    CTX.fillStyle = '#ff3300'; CTX.beginPath(); CTX.arc(this.x - this.vx * 0.5, this.y, this.radius * 0.7, 0, Math.PI * 2); CTX.fill();
                } else if (this.type === 'bullet') {
                    if (this.owner && (this.owner.weaponSelected === 'bow' || this.owner.weaponActiveType === 'bow')) {
                        // Draw a custom archery arrow
                        CTX.save();
                        CTX.strokeStyle = '#8a5229'; CTX.lineWidth = 2.5; // Wooden shaft
                        const length = 24;
                        const dir = this.vx > 0 ? 1 : -1;
                        CTX.beginPath();
                        CTX.moveTo(this.x - (length / 2) * dir, this.y);
                        CTX.lineTo(this.x + (length / 2) * dir, this.y);
                        CTX.stroke();
                        
                        // Metallic triangular tip
                        CTX.fillStyle = '#c0c5ca';
                        CTX.beginPath();
                        CTX.moveTo(this.x + (length / 2) * dir, this.y);
                        CTX.lineTo(this.x + (length / 2 - 5) * dir, this.y - 4);
                        CTX.lineTo(this.x + (length / 2 - 5) * dir, this.y + 4);
                        CTX.closePath();
                        CTX.fill();
                        
                        // Feathers (fletching) on the back
                        CTX.strokeStyle = '#ffffff'; CTX.lineWidth = 1.5;
                        CTX.beginPath();
                        CTX.moveTo(this.x - (length / 2) * dir, this.y);
                        CTX.lineTo(this.x - (length / 2 - 6) * dir, this.y - 4);
                        CTX.moveTo(this.x - (length / 2) * dir, this.y);
                        CTX.lineTo(this.x - (length / 2 - 6) * dir, this.y + 4);
                        CTX.stroke();
                        CTX.restore();
                    } else {
                        CTX.fillStyle = '#dfe5ef'; CTX.fillRect(this.x - 8, this.y - 3, 16, 6);
                        CTX.fillStyle = '#7f8794'; CTX.fillRect(this.x - 2, this.y - 1, 10, 2);
                    }
                } else if (this.type === 'rocket') {
                    CTX.fillStyle = '#ff3300';
                    CTX.fillRect(this.x - 12, this.y - 5, 24, 10);
                    CTX.fillStyle = '#ffaa00';
                    CTX.beginPath();
                    if (this.vx > 0) {
                        CTX.moveTo(this.x + 12, this.y - 5);
                        CTX.lineTo(this.x + 22, this.y);
                        CTX.lineTo(this.x + 12, this.y + 5);
                    } else {
                        CTX.moveTo(this.x - 12, this.y - 5);
                        CTX.lineTo(this.x - 22, this.y);
                        CTX.lineTo(this.x - 12, this.y + 5);
                    }
                    CTX.fill();
                    CTX.fillStyle = '#555558';
                    CTX.fillRect(this.x - (this.vx > 0 ? 12 : -8), this.y - 8, 4, 16);
                    for (let s = 0; s < 4; s++) {
                        const fx = this.x - (this.vx > 0 ? 15 + Math.random() * 10 : -15 - Math.random() * 10);
                        const fy = this.y + (Math.random() - 0.5) * 8;
                        CTX.fillStyle = '#ffee00';
                        CTX.fillRect(fx, fy, 2.5, 2.5);
                    }
                } else if (this.type === 'charged_rocket') {
                    CTX.fillStyle = '#cc00ff';
                    CTX.fillRect(this.x - 20, this.y - 10, 40, 20);
                    CTX.fillStyle = '#00ffff';
                    CTX.beginPath();
                    if (this.vx > 0) {
                        CTX.moveTo(this.x + 20, this.y - 10);
                        CTX.lineTo(this.x + 36, this.y);
                        CTX.lineTo(this.x + 20, this.y + 10);
                    } else {
                        CTX.moveTo(this.x - 20, this.y - 10);
                        CTX.lineTo(this.x - 36, this.y);
                        CTX.lineTo(this.x - 20, this.y + 10);
                    }
                    CTX.fill();
                    CTX.fillStyle = '#555558';
                    CTX.fillRect(this.x - (this.vx > 0 ? 20 : -16), this.y - 14, 6, 28);
                    for (let s = 0; s < 6; s++) {
                        const fx = this.x - (this.vx > 0 ? 25 + Math.random() * 16 : -25 - Math.random() * 16);
                        const fy = this.y + (Math.random() - 0.5) * 16;
                        CTX.fillStyle = '#cc00ff';
                        CTX.fillRect(fx, fy, 4, 4);
                    }
                } else if (this.type === 'debris') {
                    CTX.save();
                    CTX.translate(this.x, this.y);
                    CTX.rotate(this.angle);
                    CTX.fillStyle = this.color;
                    CTX.fillRect(-8, -8, 16, 16);
                    CTX.fillStyle = '#ffffff';
                    CTX.fillRect(-4, -4, 8, 8);
                    CTX.restore();
                } else if (this.type === 'lightning_bolt') {
                    CTX.save();
                    CTX.strokeStyle = '#00ffff';
                    CTX.lineWidth = 4;
                    CTX.shadowBlur = 20;
                    CTX.shadowColor = '#00ffff';
                    CTX.beginPath();
                    let curY = 0;
                    let curX = this.x;
                    CTX.moveTo(curX, curY);
                    while (curY < this.y) {
                        curY += 20 + Math.random() * 15;
                        curX += (Math.random() - 0.5) * 18;
                        CTX.lineTo(curX, Math.min(curY, this.y));
                    }
                    CTX.stroke();
                    CTX.restore();
                } else {
                    CTX.beginPath(); CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2); CTX.fill();
                }
                CTX.restore();
            }
        }
