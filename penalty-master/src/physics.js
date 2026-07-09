/*********************************************************************
MATH, 3D PROJECTION, PHYSICAL CLOTH NET, VFX & BALL PHYSICS ENGINE
*********************************************************************/

/*
====================================================
CLASS
Vector3

Відповідає за
✔ Зберігання 3D координат
✔ Векторне додавання, віднімання та масштабування
✔ Розрахунок скалярного та векторного добутку
✔ Довжину вектора та нормалізацію
====================================================
*/
class Vector3 {
    constructor(coordinateX = 0, coordinateY = 0, coordinateZ = 0) {
        this.coordinateX = coordinateX;
        this.coordinateY = coordinateY;
        this.coordinateZ = coordinateZ;
    }

    set(coordinateX, coordinateY, coordinateZ) {
        this.coordinateX = coordinateX;
        this.coordinateY = coordinateY;
        this.coordinateZ = coordinateZ;
        return this;
    }

    clone() {
        return new Vector3(this.coordinateX, this.coordinateY, this.coordinateZ);
    }

    add(v) {
        return new Vector3(
            this.coordinateX + v.coordinateX,
            this.coordinateY + v.coordinateY,
            this.coordinateZ + v.coordinateZ
        );
    }

    subtract(v) {
        return new Vector3(
            this.coordinateX - v.coordinateX,
            this.coordinateY - v.coordinateY,
            this.coordinateZ - v.coordinateZ
        );
    }

    scale(s) {
        return new Vector3(
            this.coordinateX * s,
            this.coordinateY * s,
            this.coordinateZ * s
        );
    }

    length() {
        return Math.sqrt(
            this.coordinateX * this.coordinateX +
            this.coordinateY * this.coordinateY +
            this.coordinateZ * this.coordinateZ
        );
    }

    normalize() {
        const len = this.length();
        if (len > 0) {
            return this.scale(1 / len);
        }
        return new Vector3();
    }

    dot(v) {
        return this.coordinateX * v.coordinateX +
               this.coordinateY * v.coordinateY +
               this.coordinateZ * v.coordinateZ;
    }

    cross(v) {
        return new Vector3(
            this.coordinateY * v.coordinateZ - this.coordinateZ * v.coordinateY,
            this.coordinateZ * v.coordinateX - this.coordinateX * v.coordinateZ,
            this.coordinateX * v.coordinateY - this.coordinateY * v.coordinateX
        );
    }

    distanceTo(v) {
        return Math.sqrt(
            (this.coordinateX - v.coordinateX) ** 2 +
            (this.coordinateY - v.coordinateY) ** 2 +
            (this.coordinateZ - v.coordinateZ) ** 2
        );
    }
}

/*
====================================================
CLASS
Camera3D

Відповідає за
✔ Зберігання позиції камери в 3D просторі
✔ Цільову точку, на яку спрямований об'єктив
✔ Розрахунок проекції 3D точок на 2D Canvas екран
✔ Ефект тряски (camera shake) при сильних ударах
====================================================
*/
class Camera3D {
    constructor() {
        this.position = new Vector3(0, 1.8, 15.0); // Позиція за м'ячем
        this.target = new Vector3(0, 1.0, 0); // Дивимось на ворота
        this.fieldOfView = 350; // Фокусна відстань
        this.shakeIntensity = 0;
        this.shakeDecay = 0.95;
    }

    /*
    ====================================================
    Function
    triggerShake()
    Призначення: Запускає ефект тряски камери.
    ====================================================
    */
    triggerShake(intensity) {
        this.shakeIntensity = intensity;
    }

    /*
    ====================================================
    Function
    update()
    Призначення: Оновлює стан згасання тряски.
    ====================================================
    */
    update() {
        if (this.shakeIntensity > 0.01) {
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeIntensity = 0;
        }
    }

    /*
    ====================================================
    Function
    project()
    Призначення: Переводить 3D-вектор у 2D-координати екрану.
    Виконує: Трансляцію, базову проекцію перспективи, тряску.
    Повертає: об'єкт {x, y, scale} або null, якщо об'єкт позаду камери
    ====================================================
    */
    project(worldPos, canvasWidth, canvasHeight) {
        if (!worldPos || isNaN(worldPos.coordinateX) || isNaN(worldPos.coordinateY) || isNaN(worldPos.coordinateZ) ||
            isNaN(this.position.coordinateX) || isNaN(this.position.coordinateY) || isNaN(this.position.coordinateZ)) {
            return null;
        }

        // Вектор від камери до об'єкта
        const relativeX = worldPos.coordinateX - this.position.coordinateX;
        const relativeY = worldPos.coordinateY - this.position.coordinateY;
        const relativeZ = worldPos.coordinateZ - this.position.coordinateZ;

        // Базове спрощене обертання навколо осі камери (оскільки дивимося вздовж осі Z)
        // Камера стоїть на Z = 15 і дивиться на Z = 0, тому напрямок глибини йде у від'ємний Z
        const depth = -relativeZ; 

        if (isNaN(depth) || depth <= 0.1) return null; // За камерою

        const scale = this.fieldOfView / depth;
        
        // Тряска камери
        let offsetX = 0;
        let offsetY = 0;
        if (this.shakeIntensity > 0) {
            offsetX = (Math.random() - 0.5) * this.shakeIntensity * 20;
            offsetY = (Math.random() - 0.5) * this.shakeIntensity * 20;
        }

        const screenX = (canvasWidth / 2) + (relativeX * scale) + offsetX;
        const screenY = (canvasHeight / 2) - (relativeY * scale) + offsetY;

        // Запобіжник від переповнення координат та малювання велетенських артефактів (глюк червоних трикутників)
        if (isNaN(screenX) || isNaN(screenY) || isNaN(scale) || !isFinite(scale) || scale > 10000 || Math.abs(screenX) > 20000 || Math.abs(screenY) > 20000) {
            return null;
        }

        return {
            x: screenX,
            y: screenY,
            scale: scale
        };
    }
}

/*
====================================================
CLASS
NetParticle

Відповідає за
✔ Точку сітки воріт в 3D просторі
✔ Фізичне переміщення методом Верле (Verlet integration)
✔ Стан закріплення (на штангах / землі)
====================================================
*/
class NetParticle {
    constructor(coordinateX, coordinateY, coordinateZ, isFixed = false) {
        this.position = new Vector3(coordinateX, coordinateY, coordinateZ);
        this.previousPosition = new Vector3(coordinateX, coordinateY, coordinateZ);
        this.originalPosition = new Vector3(coordinateX, coordinateY, coordinateZ);
        this.isFixed = isFixed;
        this.velocityScale = 0.88; // Демпфування
    }

    update(deltaTime) {
        if (this.isFixed) return;
        
        // Verlet Integration
        const velocityX = (this.position.coordinateX - this.previousPosition.coordinateX) * this.velocityScale;
        const velocityY = (this.position.coordinateY - this.previousPosition.coordinateY) * this.velocityScale;
        const velocityZ = (this.position.coordinateZ - this.previousPosition.coordinateZ) * this.velocityScale;

        this.previousPosition.set(this.position.coordinateX, this.position.coordinateY, this.position.coordinateZ);

        // Підвищена еластичність пружності сітки
        const restoreForce = 0.55; 
        const restoreX = (this.originalPosition.coordinateX - this.position.coordinateX) * restoreForce;
        const restoreY = (this.originalPosition.coordinateY - this.position.coordinateY) * restoreForce;
        const restoreZ = (this.originalPosition.coordinateZ - this.position.coordinateZ) * restoreForce;

        this.position.coordinateX += velocityX + restoreX * deltaTime;
        this.position.coordinateY += velocityY + (restoreY - 0.8) * deltaTime; // М'якша вага сітки для красивої хлісткості
        this.position.coordinateZ += velocityZ + restoreZ * deltaTime;

        // Обмеження нижньої межі (земля)
        if (this.position.coordinateY < 0.02) {
            this.position.coordinateY = 0.02;
        }
    }
}

/*
====================================================
CLASS
NetSpring

Відповідає за
✔ Зв'язок між сусідніми точками сітки воріт
✔ Підтримання стабільної структури сітки
====================================================
*/
class NetSpring {
    constructor(particleA, particleB, restLength) {
        this.particleA = particleA;
        this.particleB = particleB;
        this.restLength = restLength;
        this.rigidity = 0.65; // Жорсткість зв'язку
    }

    resolve() {
        const deltaX = this.particleB.position.coordinateX - this.particleA.position.coordinateX;
        const deltaY = this.particleB.position.coordinateY - this.particleA.position.coordinateY;
        const deltaZ = this.particleB.position.coordinateZ - this.particleA.position.coordinateZ;
        
        const currentDist = Math.sqrt(deltaX*deltaX + deltaY*deltaY + deltaZ*deltaZ);
        if (currentDist === 0) return;

        const diff = (this.restLength - currentDist) / currentDist * this.rigidity;

        const correctionX = deltaX * 0.5 * diff;
        const correctionY = deltaY * 0.5 * diff;
        const correctionZ = deltaZ * 0.5 * diff;

        if (!this.particleA.isFixed) {
            this.particleA.position.coordinateX -= correctionX;
            this.particleA.position.coordinateY -= correctionY;
            this.particleA.position.coordinateZ -= correctionZ;
        }
        if (!this.particleB.isFixed) {
            this.particleB.position.coordinateX += correctionX;
            this.particleB.position.coordinateY += correctionY;
            this.particleB.position.coordinateZ += correctionZ;
        }
    }
}

/*
====================================================
CLASS
GoalNet

Відповідає за
✔ Ініціалізацію 3D об'єму сітки (задня стінка, бокові, дах)
✔ Оновлення всіх пружин та точок
✔ Обробку зіткнень з м'ячем (м'яч вдавлює сітку)
✔ Рендеринг сітки в 3D перспективі
====================================================
*/
class GoalNet {
    constructor() {
        this.particles = [];
        this.springs = [];
        this.initializeNet();
    }

    /*
    ====================================================
    Function
    initializeNet()
    Призначення: Будує каркас сітки воріт.
    ====================================================
    */
    initializeNet() {
        const totalCols = 10;
        const totalRows = 7;
        
        for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
            const progressY = rowIndex / (totalRows - 1);
            const coordinateY = progressY * GOAL_HEIGHT;

            for (let colIndex = 0; colIndex < totalCols; colIndex++) {
                const progressX = colIndex / (totalCols - 1);
                const coordinateX = (progressX - 0.5) * GOAL_WIDTH;
                const isBottomRow = rowIndex === 0;
                const isFixed = isBottomRow; 
                
                const p = new NetParticle(coordinateX, coordinateY, -GOAL_DEPTH, isFixed);
                this.particles.push(p);
            }
        }

        for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
            for (let colIndex = 0; colIndex < totalCols; colIndex++) {
                const currentIdx = rowIndex * totalCols + colIndex;

                if (colIndex < totalCols - 1) {
                    const rightIdx = currentIdx + 1;
                    const dist = this.particles[currentIdx].position.distanceTo(this.particles[rightIdx].position);
                    this.springs.push(new NetSpring(this.particles[currentIdx], this.particles[rightIdx], dist));
                }

                if (rowIndex < totalRows - 1) {
                    const topIdx = currentIdx + totalCols;
                    const dist = this.particles[currentIdx].position.distanceTo(this.particles[topIdx].position);
                    this.springs.push(new NetSpring(this.particles[currentIdx], this.particles[topIdx], dist));
                }
            }
        }

        const frameCrossbar = [];
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            const progressX = colIndex / (totalCols - 1);
            const coordinateX = (progressX - 0.5) * GOAL_WIDTH;
            const barFixedPoint = new NetParticle(coordinateX, GOAL_HEIGHT, 0, true);
            frameCrossbar.push(barFixedPoint);
        }

        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            const topNetIdx = (totalRows - 1) * totalCols + colIndex;
            const targetCrossbarPoint = frameCrossbar[colIndex];
            const dist = this.particles[topNetIdx].position.distanceTo(targetCrossbarPoint.position);
            this.springs.push(new NetSpring(this.particles[topNetIdx], targetCrossbarPoint, dist));
        }

        for (let rowIndex = 1; rowIndex < totalRows; rowIndex++) {
            const progressY = rowIndex / (totalRows - 1);
            const coordinateY = progressY * GOAL_HEIGHT;

            const leftNetIdx = rowIndex * totalCols;
            const leftPostAnchor = new NetParticle(-GOAL_WIDTH / 2, coordinateY, 0, true);
            const distL = this.particles[leftNetIdx].position.distanceTo(leftPostAnchor.position);
            this.springs.push(new NetSpring(this.particles[leftNetIdx], leftPostAnchor, distL));

            const rightNetIdx = rowIndex * totalCols + (totalCols - 1);
            const rightPostAnchor = new NetParticle(GOAL_WIDTH / 2, coordinateY, 0, true);
            const distR = this.particles[rightNetIdx].position.distanceTo(rightPostAnchor.position);
            this.springs.push(new NetSpring(this.particles[rightNetIdx], rightPostAnchor, distR));
        }
    }

    /*
    ====================================================
    Function
    update()
    Призначення: Оновлює положення всіх частинок сітки.
    ====================================================
    */
    update(deltaTime) {
        this.particles.forEach(p => p.update(deltaTime));
        for (let iteration = 0; iteration < 3; iteration++) {
            this.springs.forEach(s => s.resolve());
        }
    }

    /*
    ====================================================
    Function
    handleBallCollision()
    Призначення: Виявляє зіткнення сітки з м'ячем.
    ====================================================
    */
    handleBallCollision(ball) {
        if (ball.position.coordinateZ > 0.05 || ball.position.coordinateZ < -GOAL_DEPTH - 0.2) return;
        if (Math.abs(ball.position.coordinateX) > GOAL_WIDTH / 2 + 0.3) return;
        if (ball.position.coordinateY > GOAL_HEIGHT + 0.3) return;

        let hasCollision = false;
        const sphereRadius = BALL_RADIUS + 0.05;

        this.particles.forEach(p => {
            const dist = p.position.distanceTo(ball.position);
            if (dist < sphereRadius) {
                hasCollision = true;
                const penetration = sphereRadius - dist;
                const normal = p.position.subtract(ball.position).normalize();
                
                if (!p.isFixed) {
                    p.position.coordinateX += normal.coordinateX * penetration * 0.75;
                    p.position.coordinateY += normal.coordinateY * penetration * 0.75;
                    p.position.coordinateZ += normal.coordinateZ * penetration * 0.75;
                }

                const ballVelDotNormal = ball.velocity.dot(normal);
                if (ballVelDotNormal > 0) {
                    ball.velocity = ball.velocity.subtract(normal.scale(ballVelDotNormal * 0.15));
                }
                ball.velocity = ball.velocity.scale(0.975);
                ball.angularVelocity = ball.angularVelocity.scale(0.95);
            }
        });

        return hasCollision;
    }

    /*
    ====================================================
    Function
    render()
    Призначення: Візуалізує сітку воріт.
    ====================================================
    */
    render(ctx, camera, canvasWidth, canvasHeight) {
        ctx.strokeStyle = 'rgba(230, 230, 255, 0.22)';
        ctx.lineWidth = 1.0;

        this.springs.forEach(spring => {
            const p1Proj = camera.project(spring.particleA.position, canvasWidth, canvasHeight);
            const p2Proj = camera.project(spring.particleB.position, canvasWidth, canvasHeight);

            if (p1Proj && p2Proj) {
                ctx.beginPath();
                ctx.moveTo(p1Proj.x, p1Proj.y);
                ctx.lineTo(p2Proj.x, p2Proj.y);
                ctx.stroke();
            }
        });
    }
}

/*
====================================================
CLASS
Particle
====================================================
*/
class Particle {
    constructor() {
        this.position = new Vector3();
        this.velocity = new Vector3();
        this.color = '#ffffff';
        this.size = 2.0;
        this.life = 0;
        this.maxLife = 100;
        this.type = 'dust'; 
        this.rotation = 0;
        this.rotationSpeed = 0;
    }

    init(position, velocity, color, size, maxLife, type = 'dust') {
        this.position.set(position.coordinateX, position.coordinateY, position.coordinateZ);
        this.velocity.set(velocity.coordinateX, velocity.coordinateY, velocity.coordinateZ);
        this.color = color;
        this.size = size;
        this.life = maxLife;
        this.maxLife = maxLife;
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 8;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        if (this.life <= 0) return;

        this.position.coordinateX += this.velocity.coordinateX * deltaTime;
        this.position.coordinateY += this.velocity.coordinateY * deltaTime;
        this.position.coordinateZ += this.velocity.coordinateZ * deltaTime;

        if (this.type === 'grass' || this.type === 'confetti') {
            this.velocity.coordinateY -= PHYSICS_GRAVITY * deltaTime * 0.8;
            this.velocity = this.velocity.scale(0.97);
            this.rotation += this.rotationSpeed * deltaTime;

            if (this.position.coordinateY < 0.01) {
                this.position.coordinateY = 0.01;
                this.velocity.set(0, 0, 0);
                this.rotationSpeed = 0;
            }
        } else {
            this.velocity = this.velocity.scale(0.93);
        }
    }
}

/*
====================================================
CLASS
ParticleSystemManager
====================================================
*/
class ParticleSystemManager {
    constructor() {
        this.poolSize = 400;
        this.particles = [];
        this.maxParticlesScale = 1.0; // Значення масштабування для слабких ПК
        for (let cellIndex = 0; cellIndex < this.poolSize; cellIndex++) {
            this.particles.push(new Particle());
        }
    }

    spawn(position, velocity, color, size, maxLife, type) {
        for (let cellIndex = 0; cellIndex < this.poolSize; cellIndex++) {
            if (this.particles[cellIndex].life <= 0) {
                this.particles[cellIndex].init(position, velocity, color, size, maxLife, type);
                break;
            }
        }
    }

    spawnGrassExplosion(position) {
        const particleCount = Math.round(25 * this.maxParticlesScale);
        for (let cellIndex = 0; cellIndex < particleCount; cellIndex++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3.5;
            const velocity = new Vector3(
                Math.cos(angle) * speed * 0.6,
                1.5 + Math.random() * 4.0,
                (Math.random() - 0.8) * speed
            );
            const size = 2.0 + Math.random() * 4.0;
            const life = 0.5 + Math.random() * 0.8;
            const isDarkGrass = Math.random() > 0.5;
            const color = isDarkGrass ? '#1b5e20' : '#4caf50';
            
            this.spawn(position, velocity, color, size, life, 'grass');
        }

        for (let cellIndex = 0; cellIndex < 10; cellIndex++) {
            const velocity = new Vector3(
                (Math.random() - 0.5) * 1.5,
                0.5 + Math.random() * 1.5,
                (Math.random() - 0.5) * 1.5
            );
            this.spawn(position, velocity, 'rgba(240,240,240,0.3)', 8 + Math.random() * 10, 0.4 + Math.random() * 0.3, 'dust');
        }
    }

    spawnConfettiRain(goalPos) {
        const colors = ['#ff007f', '#00ffcc', '#ffcc00', '#ff00ff', '#00ffff', '#ffffff'];
        const particleCount = Math.round(120 * this.maxParticlesScale);

        for (let cellIndex = 0; cellIndex < particleCount; cellIndex++) {
            const angle = (Math.random() - 0.5) * Math.PI * 0.6 - Math.PI / 2;
            const speed = 3.0 + Math.random() * 8.0;
            
            const velocity = new Vector3(
                Math.cos(angle) * speed,
                5.0 + Math.random() * 7.0,
                (Math.random() - 0.5) * 3.0
            );

            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = 3.0 + Math.random() * 5.0;
            const life = 1.5 + Math.random() * 2.0;

            this.spawn(goalPos, velocity, color, size, life, 'confetti');
        }
    }

    spawnTargetHitExplosion(targetPos) {
        const colors = ['#00ffcc', '#ffffff', '#ffff00', '#ff00ff'];
        const particleCount = Math.round(40 * this.maxParticlesScale);
        for (let cellIndex = 0; cellIndex < particleCount; cellIndex++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4.0 + Math.random() * 7.0;
            const velocity = new Vector3(
                Math.cos(angle) * speed,
                (Math.random() - 0.5) * speed,
                (Math.random() - 0.2) * speed * 0.5
            );
            const size = 4.0 + Math.random() * 6.0;
            const life = 0.8 + Math.random() * 1.0;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.spawn(targetPos, velocity, color, size, life, 'confetti');
        }
    }

    update(deltaTime) {
        this.particles.forEach(p => {
            if (p.life > 0) p.update(deltaTime);
        });
    }

    render(ctx, camera, canvasWidth, canvasHeight) {
        const activeParticles = this.particles.filter(p => p.life > 0);
        activeParticles.sort((a, b) => b.position.coordinateZ - a.position.coordinateZ);

        activeParticles.forEach(p => {
            const screenProj = camera.project(p.position, canvasWidth, canvasHeight);
            if (!screenProj) return;

            ctx.save();
            ctx.translate(screenProj.x, screenProj.y);

            const currentSize = p.size * (screenProj.scale / 300);

            if (p.type === 'grass' || p.type === 'confetti') {
                ctx.rotate(p.rotation);
                ctx.fillStyle = p.color;
                ctx.fillRect(-currentSize / 2, -currentSize / 2, currentSize, currentSize * 1.8);
            } else {
                const opacity = p.life / p.maxLife;
                ctx.fillStyle = p.color.replace('0.3', (0.3 * opacity).toFixed(3));
                ctx.beginPath();
                ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }
}

const gameVFX = new ParticleSystemManager();

/*
====================================================
CLASS
Ball3D
====================================================
*/
class Ball3D {
    constructor() {
        this.position = new Vector3(0, BALL_RADIUS, PENALTY_SPOT_Z);
        this.velocity = new Vector3(0, 0, 0);
        this.angularVelocity = new Vector3(0, 0, 0);
        this.rotationMatrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
        
        this.isKicked = false;
        this.isStatic = true;
        this.hitPostCount = 0;
        this.didHitTarget = false;
        this.trailPositions = [];
    }

    reset() {
        this.position.set(0, BALL_RADIUS, PENALTY_SPOT_Z);
        this.velocity.set(0, 0, 0);
        this.angularVelocity.set(0, 0, 0);
        this.rotationMatrix = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
        this.isKicked = false;
        this.isStatic = true;
        this.hitPostCount = 0;
        this.didHitTarget = false;
        this.trailPositions = [];
    }

    kick(kickPower, targetAngleX, targetAngleY, sideSpin, topSpin) {
        const forceMult = 16.0 + (kickPower / 100.0) * 19.0;
        
        const radX = targetAngleX;
        const radY = targetAngleY;

        const speedZ = -Math.cos(radY) * Math.cos(radX) * forceMult;
        const speedX = Math.cos(radY) * Math.sin(radX) * forceMult;
        const speedY = Math.sin(radY) * forceMult;

        this.velocity.set(speedX, speedY, speedZ);
        
        this.angularVelocity.set(
            topSpin * 2.5,
            sideSpin * -3.5,
            sideSpin * 0.8
        );

        this.isKicked = true;
        this.isStatic = false;
        
        gameAudio.playKick();
        gameVFX.spawnGrassExplosion(this.position);
    }

    update(deltaTime) {
        if (this.isStatic) return;

        // Додаємо випадкову турбулентність та опір вітру
        const speed = this.velocity.length();
        let currentDragCoeff = BALL_DRAG_COEFFICIENT;

        // Симуляція коливань опору повітря (турбулентність та вологість)
        const turbulence = 1.0 + Math.sin(performance.now() * 0.05) * 0.08;
        currentDragCoeff *= turbulence;

        if (speed > 0.05) {
            const dragForceMagnitude = 0.5 * PHYSICS_AIR_DENSITY * currentDragCoeff * BALL_CROSS_SECTION * speed * speed;
            const dragForceVector = this.velocity.normalize().scale(-dragForceMagnitude / BALL_MASS);
            this.velocity = this.velocity.add(dragForceVector.scale(deltaTime));
        }

        // Покращений фізично реалістичний ефект Магнуса
        if (speed > 0.1 && this.angularVelocity.length() > 0.1) {
            // Ефект підкрутки сильнішає при зростанні швидкості
            const liftCoeff = BALL_MAGNUS_COEFFICIENT * (1.0 + speed * 0.015);
            const magnusForceVector = this.angularVelocity.cross(this.velocity).scale(liftCoeff / BALL_MASS);
            this.velocity = this.velocity.add(magnusForceVector.scale(deltaTime));
        }

        this.velocity.coordinateY -= PHYSICS_GRAVITY * deltaTime;
        this.position = this.position.add(this.velocity.scale(deltaTime));

        // Додаємо поточну позицію до історії шлейфу
        this.trailPositions.push(this.position.clone());
        if (this.trailPositions.length > 15) {
            this.trailPositions.shift();
        }

        this.updateRotationMatrix(deltaTime);
        this.handleCollisions();
    }

    updateRotationMatrix(deltaTime) {
        const angleX = this.angularVelocity.coordinateX * deltaTime;
        const angleY = this.angularVelocity.coordinateY * deltaTime;
        const angleZ = this.angularVelocity.coordinateZ * deltaTime;

        const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
        const cosZ = Math.cos(angleZ), sinZ = Math.sin(angleZ);

        let mat = this.rotationMatrix;
        let nextMat = [...mat];
        nextMat[3] = mat[3]*cosX - mat[6]*sinX;
        nextMat[4] = mat[4]*cosX - mat[7]*sinX;
        nextMat[5] = mat[5]*cosX - mat[8]*sinX;
        nextMat[6] = mat[3]*sinX + mat[6]*cosX;
        nextMat[7] = mat[4]*sinX + mat[7]*cosX;
        nextMat[8] = mat[5]*sinX + mat[8]*cosX;

        mat = nextMat;
        nextMat = [...mat];
        nextMat[0] = mat[0]*cosY + mat[6]*sinY;
        nextMat[1] = mat[1]*cosY + mat[7]*sinY;
        nextMat[2] = mat[2]*cosY + mat[8]*sinY;
        nextMat[6] = -mat[0]*sinY + mat[6]*cosY;
        nextMat[7] = -mat[1]*sinY + mat[7]*cosY;
        nextMat[8] = -mat[2]*sinY + mat[8]*cosY;

        this.rotationMatrix = nextMat;
    }

    handleCollisions() {
        if (this.position.coordinateY <= BALL_RADIUS) {
            this.position.coordinateY = BALL_RADIUS;
            
            const incomingSpeed = Math.abs(this.velocity.coordinateY);
            const dynamicRestitution = Math.max(0.42, 0.75 - incomingSpeed * 0.018);
            this.velocity.coordinateY = incomingSpeed * dynamicRestitution;

            const frictionFactor = 0.72;
            this.velocity.coordinateX *= frictionFactor;
            this.velocity.coordinateZ *= frictionFactor;

            this.angularVelocity.coordinateX = -this.velocity.coordinateZ / BALL_RADIUS * 0.7;
            this.angularVelocity.coordinateZ =  this.velocity.coordinateX / BALL_RADIUS * 0.7;

            const spinInfluence = this.angularVelocity.coordinateX * BALL_RADIUS * 0.35;
            this.velocity.coordinateZ += spinInfluence;

            this.velocity.coordinateX += this.angularVelocity.coordinateY * BALL_RADIUS * 0.25;

            this.angularVelocity = this.angularVelocity.scale(0.68);

            if (this.velocity.length() > 1.8) {
                gameAudio.playKick();
                const dirtPos = new Vector3(this.position.coordinateX, 0.05, this.position.coordinateZ);
                gameVFX.spawnGrassExplosion(dirtPos);
            }
        }
        
        this.checkCapsuleCollision(
            new Vector3(-GOAL_WIDTH / 2, 0, 0),
            new Vector3(-GOAL_WIDTH / 2, GOAL_HEIGHT, 0)
        );

        this.checkCapsuleCollision(
            new Vector3(GOAL_WIDTH / 2, 0, 0),
            new Vector3(GOAL_WIDTH / 2, GOAL_HEIGHT, 0)
        );

        this.checkCapsuleCollision(
            new Vector3(-GOAL_WIDTH / 2, GOAL_HEIGHT, 0),
            new Vector3(GOAL_WIDTH / 2, GOAL_HEIGHT, 0)
        );
    }

    checkCapsuleCollision(segmentA, segmentB) {
        const segmentVec = segmentB.subtract(segmentA);
        const toBallVec = this.position.subtract(segmentA);

        const segmentLengthSq = segmentVec.dot(segmentVec);
        let projectionFactor = toBallVec.dot(segmentVec) / segmentLengthSq;
        projectionFactor = Math.max(0, Math.min(1, projectionFactor));

        const closestPointOnPost = segmentA.add(segmentVec.scale(projectionFactor));
        
        const distanceVec = this.position.subtract(closestPointOnPost);
        const distanceVal = distanceVec.length();
        const minAllowableDist = BALL_RADIUS + GOAL_POST_RADIUS;

        if (distanceVal < minAllowableDist) {
            const normalVec = distanceVec.normalize();
            this.position = closestPointOnPost.add(normalVec.scale(minAllowableDist));

            const restitution = 0.72;
            const velocityDotNormal = this.velocity.dot(normalVec);
            
            if (velocityDotNormal < 0) {
                this.velocity = this.velocity.subtract(normalVec.scale((1 + restitution) * velocityDotNormal));
            }

            this.angularVelocity = this.angularVelocity.add(normalVec.cross(this.velocity).scale(1.2));
            this.hitPostCount++;
            
            if (activeGameInstance) {
                activeGameInstance.camera.triggerShake(Math.min(1.2, this.velocity.length() / 15));
            }
            gameAudio.playPostHit();
        }
    }

    render(ctx, screenX, screenY, scale) {
        const currentRadius = BALL_RADIUS * scale;
        if (currentRadius <= 0.5) return;

        // Отримуємо активний скін м'яча зі сховища або використовуємо дефолтний
        const activeBallId = safeStorage.getItem('pm_equipped_ball') || 'classic';
        const isFire = activeBallId === 'fire';
        const isNeon = activeBallId === 'neon';
        const isGold = activeBallId === 'gold';

        ctx.save();

        // Неонове або вогняне свічення
        if (isNeon) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#39ff14';
        } else if (isFire) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff3300';
            
            // Якщо м'яч летить, створюємо вогняні іскри
            if (!this.isStatic && Math.random() < 0.32) {
                gameVFX.spawn(
                    this.position.clone(),
                    new Vector3((Math.random()-0.5)*1.2, 0.4 + Math.random()*1.5, 0.8),
                    '#ff5500', 
                    2.0 + Math.random()*3.0, 
                    0.5 + Math.random()*0.5, 
                    'confetti'
                );
            }
        }

        ctx.translate(screenX, screenY);
        
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.clip();

        // Базовий колір м'яча залежно від скіна
        if (isGold) {
            ctx.fillStyle = '#ffd700'; // Золотий
        } else if (isFire) {
            ctx.fillStyle = '#ff4400'; // Червоно-вогняний
        } else if (isNeon) {
            ctx.fillStyle = '#111111'; // Темно-неоновий для контрасту
        } else {
            ctx.fillStyle = '#f5f5f5'; // Класичний білий
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        const localPanels = [
            new Vector3(0, 1, 0),
            new Vector3(0.8, 0.3, 0.5),
            new Vector3(-0.8, 0.3, 0.5),
            new Vector3(0.3, -0.7, 0.6),
            new Vector3(-0.3, -0.7, -0.6),
            new Vector3(0.5, 0.4, -0.7),
            new Vector3(-0.5, 0.4, -0.7),
            new Vector3(0.2, -0.2, 0.9)
        ];

        // Колір панелей м'яча
        if (isGold) {
            ctx.fillStyle = '#b8860b'; // Темно-золоті панелі
        } else if (isFire) {
            ctx.fillStyle = '#ffff00'; // Жовте пекло
        } else if (isNeon) {
            ctx.fillStyle = '#39ff14'; // Салатові неонові лінії
        } else {
            ctx.fillStyle = '#111115'; // Класичні чорні панелі
        }

        localPanels.forEach(p => {
            const mat = this.rotationMatrix;
            const rotatedX = p.coordinateX * mat[0] + p.coordinateY * mat[1] + p.coordinateZ * mat[2];
            const rotatedY = p.coordinateX * mat[3] + p.coordinateY * mat[4] + p.coordinateZ * mat[5];
            const rotatedZ = p.coordinateX * mat[6] + p.coordinateY * mat[7] + p.coordinateZ * mat[8];

            if (rotatedZ > -0.15) {
                const panelScreenX = rotatedX * currentRadius;
                const panelScreenY = -rotatedY * currentRadius;
                const panelRadius = currentRadius * 0.3 * (rotatedZ + 0.3);

                if (panelRadius > 0.5) {
                    ctx.beginPath();
                    const points = 5;
                    for (let pointIdx = 0; pointIdx < points; pointIdx++) {
                        const angle = (pointIdx / points) * Math.PI * 2;
                        const px = panelScreenX + Math.cos(angle) * panelRadius;
                        const py = panelScreenY + Math.sin(angle) * panelRadius;
                        if (pointIdx === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
            }
        });

        // Градієнт об'єму для 3D вигляду
        const volumeGradient = ctx.createRadialGradient(
            -currentRadius * 0.25, -currentRadius * 0.25, currentRadius * 0.1,
            0, 0, currentRadius
        );
        
        if (isGold) {
            volumeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            volumeGradient.addColorStop(0.5, 'rgba(218, 165, 32, 0.2)');
            volumeGradient.addColorStop(1, 'rgba(139, 69, 19, 0.7)');
        } else if (isFire) {
            volumeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
            volumeGradient.addColorStop(0.4, 'rgba(255, 102, 0, 0.1)');
            volumeGradient.addColorStop(1, 'rgba(100, 0, 0, 0.8)');
        } else if (isNeon) {
            volumeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
            volumeGradient.addColorStop(0.6, 'rgba(57, 255, 20, 0.05)');
            volumeGradient.addColorStop(1, 'rgba(0, 50, 0, 0.85)');
        } else {
            volumeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
            volumeGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
            volumeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        }

        ctx.fillStyle = volumeGradient;
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
