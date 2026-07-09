/*********************************************************************
SKELETAL CHARACTER ANIMATION & GOALKEEPER AI MODULE
*********************************************************************/

/*
====================================================
CLASS
SkeletalCharacter

Відповідає за
✔ Зберігання 3D-позиції та поворотів тіла
✔ Генерацію процедурних анімацій
✔ Розрахунок 3D проекції суглобів на екран
====================================================
*/
class SkeletalCharacter {
    constructor(isGoalkeeper = false) {
        this.isGoalkeeper = isGoalkeeper;
        this.position = new Vector3(0, 0, 0);
        this.headingAngle = 0;
        
        this.joints = {
            pelvis: new Vector3(0, 0.9, 0),
            spine: new Vector3(0, 1.25, 0),
            head: new Vector3(0, 1.62, 0),
            shoulderL: new Vector3(-0.25, 1.35, 0),
            shoulderR: new Vector3(0.25, 1.35, 0),
            elbowL: new Vector3(-0.45, 1.1, 0),
            elbowR: new Vector3(0.45, 1.1, 0),
            handL: new Vector3(-0.55, 0.85, 0),
            handR: new Vector3(0.55, 0.85, 0),
            hipL: new Vector3(-0.16, 0.82, 0),
            hipR: new Vector3(0.16, 0.82, 0),
            kneeL: new Vector3(-0.16, 0.45, 0),
            kneeR: new Vector3(0.16, 0.45, 0),
            footL: new Vector3(-0.16, 0.05, 0),
            footR: new Vector3(0.16, 0.05, 0)
        };

        this.pose = 'idle';
        this.animationTimer = 0;
        
        this.jerseyColor = isGoalkeeper ? '#ffea00' : '#d50000';
        this.shortsColor = isGoalkeeper ? '#111111' : '#ffffff';
        this.socksColor  = isGoalkeeper ? '#ffea00' : '#d50000';
        this.skinColor   = '#ffdbac';
    }

    /*
    ====================================================
    Function
    applyLevelColors()
    Призначення: Застосовує кольори рівня до персонажа.
    ====================================================
    */
    applyLevelColors(levelPreset) {
        if (this.isGoalkeeper) {
            this.jerseyColor = levelPreset.keeperJersey;
            this.shortsColor = levelPreset.keeperShorts;
            this.socksColor  = levelPreset.keeperSocks;
        } else {
            this.jerseyColor = levelPreset.playerJersey;
            this.shortsColor = levelPreset.playerShorts;
            this.socksColor  = levelPreset.playerSocks;
        }
        this.skinColor = levelPreset.skinColor;
    }

    /*
    ====================================================
    Function
    setPose()
    Призначення: Змінює поточний стан анімації.
    ====================================================
    */
    setPose(poseName) {
        if (this.pose !== poseName) {
            this.pose = poseName;
            this.animationTimer = 0;
        }
    }

    /*
    ====================================================
    Function
    update()
    Призначення: Розрахунок руху суглобів у часі.
    ====================================================
    */
    update(deltaTime, runSpeedMultiplier = 1.0) {
        this.animationTimer += deltaTime;
        const j = this.joints;

        if (this.pose === 'idle') {
            const breathingPhase = Math.sin(this.animationTimer * 2.5);
            const crouchAngle = this.isGoalkeeper ? 0.15 : 0.05;
            
            j.pelvis.set(0, 0.9 - crouchAngle + breathingPhase * 0.015, 0);
            j.spine.set(0, 1.25 - crouchAngle + breathingPhase * 0.02, -0.05);
            j.head.set(0, 1.6 - crouchAngle + breathingPhase * 0.025, -0.05);

            j.shoulderL.set(-0.25, 1.33 + breathingPhase * 0.01, -0.02);
            j.shoulderR.set(0.25, 1.33 + breathingPhase * 0.01, -0.02);

            if (this.isGoalkeeper) {
                j.elbowL.set(-0.55, 1.05, 0.25);
                j.elbowR.set(0.55, 1.05, 0.25);
                j.handL.set(-0.68, 0.95, 0.4);
                j.handR.set(0.68, 0.95, 0.4);

                j.hipL.set(-0.2, 0.8, 0);
                j.hipR.set(0.2, 0.8, 0);
                j.kneeL.set(-0.28, 0.4, 0.1);
                j.kneeR.set(0.28, 0.4, 0.1);
                j.footL.set(-0.26, 0.02, 0.12);
                j.footR.set(0.26, 0.02, 0.12);
            } else {
                j.elbowL.set(-0.35, 1.05, 0.15);
                j.elbowR.set(0.35, 1.05, 0.15);
                j.handL.set(-0.4, 0.82, 0.2);
                j.handR.set(0.4, 0.82, 0.2);

                j.hipL.set(-0.16, 0.82, 0);
                j.hipR.set(0.16, 0.82, 0);
                j.kneeL.set(-0.16, 0.43, 0);
                j.kneeR.set(0.16, 0.43, 0);
                j.footL.set(-0.16, 0.02, 0);
                j.footR.set(0.16, 0.02, 0);
            }
        }
        else if (this.pose === 'goalkeeper_bounce') {
            const bouncePhase = Math.sin(this.animationTimer * 14.0);
            const crouch = Math.max(0, -bouncePhase) * 0.08;

            j.pelvis.set(0, 0.85 - crouch, 0);
            j.spine.set(0, 1.2 - crouch, 0.05);
            j.head.set(0, 1.55 - crouch, 0.08);

            j.shoulderL.set(-0.25, 1.3 - crouch, 0);
            j.shoulderR.set(0.25, 1.3 - crouch, 0);
            j.elbowL.set(-0.52, 1.1 - crouch * 0.5, 0.22);
            j.elbowR.set(0.52, 1.1 - crouch * 0.5, 0.22);
            j.handL.set(-0.62, 1.0, 0.35);
            j.handR.set(0.62, 1.0, 0.35);

            j.hipL.set(-0.18, 0.78, 0);
            j.hipR.set(0.18, 0.78, 0);
            j.kneeL.set(-0.22, 0.38 - crouch, 0.1);
            j.kneeR.set(0.22, 0.38 - crouch, 0.1);
            j.footL.set(-0.22, 0.02 + Math.max(0, bouncePhase) * 0.06, 0.1);
            j.footR.set(0.22, 0.02 + Math.max(0, bouncePhase) * 0.06, 0.1);
        }
        else if (this.pose === 'fake_kick') {
            const fakeTime = Math.min(1.0, this.animationTimer * 4.0);
            const fakeInv = 1.0 - fakeTime;
            
            // Нахил тулуба для замаху, але повернення назад
            j.pelvis.set(-0.06 * fakeInv, 0.85, 0);
            j.spine.set(-0.08 * fakeInv, 1.2, -0.15 * fakeInv);
            j.head.set(-0.08 * fakeInv, 1.55, -0.12 * fakeInv);

            j.shoulderL.set(-0.26, 1.3, 0.04);
            j.shoulderR.set(0.26, 1.3, -0.04);
            j.elbowL.set(-0.55, 1.12, 0.1);
            j.elbowR.set(0.52, 1.0, -0.15);
            j.handL.set(-0.68, 1.02, 0.15);
            j.handR.set(0.62, 0.82, -0.22);

            j.hipL.set(-0.16, 0.78, 0.1);
            j.kneeL.set(-0.18, 0.38, 0.18);
            j.footL.set(-0.18, 0.02, 0.2);

            // Права нога робить замах назад, але зупиняється без торкання м'яча
            j.hipR.set(0.16, 0.78, -0.08);
            j.kneeR.set(0.22, 0.52 - 0.12 * fakeInv, -0.45 * fakeInv);
            j.footR.set(0.25, 0.28 - 0.15 * fakeInv, -0.68 * fakeInv);
        }
        else if (this.pose === 'run') {
            const frequency = 12.0 * runSpeedMultiplier;
            const amplitude = 0.32;
            const phase = this.animationTimer * frequency;
            const legSine = Math.sin(phase);

            j.pelvis.set(0, 0.86 + Math.abs(legSine) * 0.05, 0);
            j.spine.set(0, 1.2, 0.15);
            j.head.set(0, 1.55, 0.22);

            j.shoulderL.set(-0.25, 1.3, 0.05);
            j.shoulderR.set(0.25, 1.3, 0.05);
            j.elbowL.set(-0.42, 1.05 + legSine * 0.1, -legSine * 0.2);
            j.elbowR.set(0.42, 1.05 - legSine * 0.1, legSine * 0.2);
            j.handL.set(-0.48, 0.85 + legSine * 0.15, -legSine * 0.3);
            j.handR.set(0.48, 0.85 - legSine * 0.15, legSine * 0.3);

            j.hipL.set(-0.16, 0.78, 0);
            j.hipR.set(0.16, 0.78, 0);

            j.kneeL.set(-0.16, 0.45 + Math.max(0, -legSine) * 0.15, legSine * amplitude);
            j.footL.set(-0.16, 0.08 + Math.max(0, -legSine) * 0.2, legSine * amplitude * 1.3);

            j.kneeR.set(0.16, 0.45 + Math.max(0, legSine) * 0.15, -legSine * amplitude);
            j.footR.set(0.16, 0.08 + Math.max(0, legSine) * 0.2, -legSine * amplitude * 1.3);
        }
        else if (this.pose === 'kick_swing') {
            j.pelvis.set(-0.05, 0.85, 0);
            j.spine.set(-0.08, 1.2, -0.15);
            j.head.set(-0.08, 1.55, -0.15);

            j.shoulderL.set(-0.28, 1.3, 0.05);
            j.shoulderR.set(0.28, 1.3, -0.05);
            j.elbowL.set(-0.6, 1.15, 0.1);
            j.elbowR.set(0.55, 1.0, -0.2);
            j.handL.set(-0.75, 1.05, 0.2);
            j.handR.set(0.68, 0.85, -0.3);

            j.hipL.set(-0.16, 0.78, 0.1);
            j.kneeL.set(-0.18, 0.38, 0.2);
            j.footL.set(-0.18, 0.02, 0.22);

            j.hipR.set(0.16, 0.78, -0.1);
            j.kneeR.set(0.25, 0.55, -0.5);
            j.footR.set(0.28, 0.32, -0.75);
        }
        else if (this.pose === 'kick_strike') {
            const strikeProgress = Math.min(1.0, this.animationTimer * 8.0);
            const invProgress = 1.0 - strikeProgress;

            j.pelvis.set(0.05 * strikeProgress, 0.85, 0.1 * strikeProgress);
            j.spine.set(0.05 * strikeProgress, 1.22, 0.12 * strikeProgress);
            j.head.set(0.05 * strikeProgress, 1.57, 0.15 * strikeProgress);

            j.elbowL.set(-0.5 * invProgress - 0.2 * strikeProgress, 1.1, 0.15);
            j.handL.set(-0.65 * invProgress - 0.25 * strikeProgress, 0.9, 0.2);

            j.hipR.set(0.16, 0.78, 0.1 * strikeProgress);
            j.kneeR.set(0.16 + 0.05 * strikeProgress, 0.52 * invProgress + 0.65 * strikeProgress, -0.5 * invProgress + 0.6 * strikeProgress);
            j.footR.set(0.16 + 0.05 * strikeProgress, 0.32 * invProgress + 0.55 * strikeProgress, -0.75 * invProgress + 0.92 * strikeProgress);
        }
        else if (this.pose === 'hang_bar') {
            const swingPhase = Math.sin(this.animationTimer * 4.5);
            
            j.pelvis.set(0, GOAL_HEIGHT - 0.7 + swingPhase * 0.05, -0.1);
            j.spine.set(0, GOAL_HEIGHT - 0.35, -0.05);
            j.head.set(0, GOAL_HEIGHT - 0.12, -0.05);
            
            j.shoulderL.set(-0.25, GOAL_HEIGHT - 0.3, 0);
            j.shoulderR.set(0.25, GOAL_HEIGHT - 0.3, 0);
            j.elbowL.set(-0.35, GOAL_HEIGHT - 0.1, 0);
            j.elbowR.set(0.35, GOAL_HEIGHT - 0.1, 0);
            j.handL.set(-0.4, GOAL_HEIGHT, 0);
            j.handR.set(0.4, GOAL_HEIGHT, 0);
            
            j.hipL.set(-0.16, GOAL_HEIGHT - 0.75, -0.1);
            j.hipR.set(0.16, GOAL_HEIGHT - 0.75, -0.1);
            j.kneeL.set(-0.16, GOAL_HEIGHT - 1.1 + swingPhase * 0.1, -0.2 + swingPhase * 0.15);
            j.kneeR.set(0.16, GOAL_HEIGHT - 1.1 - swingPhase * 0.1, -0.2 - swingPhase * 0.15);
            j.footL.set(-0.16, GOAL_HEIGHT - 1.45 + swingPhase * 0.12, -0.25 + swingPhase * 0.2);
            j.footR.set(0.16, GOAL_HEIGHT - 1.45 - swingPhase * 0.12, -0.25 - swingPhase * 0.2);
        }
        else if (this.pose === 'keeper_split') {
            // Воротар падає у шпагат для перехоплення низового м'яча
            j.pelvis.set(0, 0.18, 0);
            j.spine.set(0, 0.52, -0.05);
            j.head.set(0, 0.88, -0.05);

            j.shoulderL.set(-0.25, 0.6, 0);
            j.shoulderR.set(0.25, 0.6, 0);
            j.elbowL.set(-0.55, 0.52, 0.1);
            j.elbowR.set(0.55, 0.52, 0.1);
            j.handL.set(-0.85, 0.45, 0.2);
            j.handR.set(0.85, 0.45, 0.2);

            j.hipL.set(-0.16, 0.15, 0);
            j.hipR.set(0.16, 0.15, 0);

            // Розсунуті ноги вздовж землі
            j.kneeL.set(-0.95, 0.10, 0.05);
            j.footL.set(-1.65, 0.04, 0.05);

            j.kneeR.set(0.95, 0.10, 0.05);
            j.footR.set(1.65, 0.04, 0.05);
        }
        else if (this.pose === 'walk_bar') {
            const walkPhase = Math.sin(this.animationTimer * 3.5);
            const armBalance = Math.cos(this.animationTimer * 2.0) * 0.15;
            const offsetSpeed = Math.sin(this.animationTimer * 0.5) * 1.5;
            
            j.pelvis.set(offsetSpeed, GOAL_HEIGHT + 0.85 + walkPhase * 0.02, 0);
            j.spine.set(offsetSpeed, GOAL_HEIGHT + 1.2, walkPhase * 0.05);
            j.head.set(offsetSpeed, GOAL_HEIGHT + 1.55, walkPhase * 0.08);
            
            j.shoulderL.set(offsetSpeed - 0.25, GOAL_HEIGHT + 1.25, 0);
            j.shoulderR.set(offsetSpeed + 0.25, GOAL_HEIGHT + 1.25, 0);
            j.elbowL.set(offsetSpeed - 0.6, GOAL_HEIGHT + 1.35 + armBalance, 0.1);
            j.elbowR.set(offsetSpeed + 0.6, GOAL_HEIGHT + 1.35 - armBalance, 0.1);
            j.handL.set(offsetSpeed - 0.85, GOAL_HEIGHT + 1.45 + armBalance * 1.5, 0.2);
            j.handR.set(offsetSpeed + 0.85, GOAL_HEIGHT + 1.45 - armBalance * 1.5, 0.2);
            
            j.hipL.set(offsetSpeed - 0.15, GOAL_HEIGHT + 0.78, 0);
            j.hipR.set(offsetSpeed + 0.15, GOAL_HEIGHT + 0.78, 0);
            j.kneeL.set(offsetSpeed - 0.15, GOAL_HEIGHT + 0.4, walkPhase * 0.1);
            j.kneeR.set(offsetSpeed + 0.15, GOAL_HEIGHT + 0.4, -walkPhase * 0.1);
            j.footL.set(offsetSpeed - 0.15, GOAL_HEIGHT, walkPhase * 0.2);
            j.footR.set(offsetSpeed + 0.15, GOAL_HEIGHT, -walkPhase * 0.2);
        }
        else if (this.pose.startsWith('somersault_')) {
            const isLeft = this.pose.includes('left');
            const diveDirection = isLeft ? -1 : 1;
            const progress = Math.min(1.0, this.animationTimer * 1.5);
            
            const spinAngle = progress * Math.PI * 2 * -diveDirection;
            const cosS = Math.cos(spinAngle);
            const sinS = Math.sin(spinAngle);
            
            const stretchX = diveDirection * progress * 2.3;
            const stretchY = Math.sin(progress * Math.PI) * 1.6 + 0.1 * progress;
            j.pelvis.set(stretchX, 0.85 + stretchY, 0);
            
            const setRotatedJoint = (jointName, defaultLocX, defaultLocY, defaultLocZ) => {
                const rotX = defaultLocX * cosS - defaultLocY * sinS;
                const rotY = defaultLocX * sinS + defaultLocY * cosS;
                j[jointName].set(j.pelvis.coordinateX + rotX, j.pelvis.coordinateY + rotY, defaultLocZ);
            };
            
            setRotatedJoint('spine', 0, 0.35, -0.05);
            setRotatedJoint('head', 0, 0.72, -0.05);
            setRotatedJoint('shoulderL', -0.25, 0.4, 0);
            setRotatedJoint('shoulderR', 0.25, 0.4, 0);
            
            setRotatedJoint('elbowL', -0.4, 0.2, 0.15);
            setRotatedJoint('elbowR', 0.4, 0.2, 0.15);
            setRotatedJoint('handL', -0.35, 0.05, 0.2);
            setRotatedJoint('handR', 0.35, 0.05, 0.2);
            
            setRotatedJoint('hipL', -0.16, -0.1, 0);
            setRotatedJoint('hipR', 0.16, -0.1, 0);
            setRotatedJoint('kneeL', -0.22, -0.4, 0.2);
            setRotatedJoint('kneeR', 0.22, -0.4, 0.2);
            setRotatedJoint('footL', -0.18, -0.7, 0.25);
            setRotatedJoint('footR', 0.18, -0.7, 0.25);
        }
        else if (this.pose.startsWith('dive_')) {
            const isLeft = this.pose.includes('left');
            const isHigh = this.pose.includes('high');
            const diveDirection = isLeft ? -1 : 1;
            
            const progress = Math.min(1.0, this.animationTimer * 1.6);
            
            const angle = isHigh ? 0.38 : 0.05;
            const stretchX = diveDirection * progress * 2.1;
            const stretchY = Math.sin(progress * Math.PI) * (isHigh ? 1.4 : 0.4) + 0.2 * progress;
            
            j.pelvis.set(stretchX, 0.85 + stretchY, 0);
            
            const bodyAngle = (Math.PI / 2 - angle) * -diveDirection;
            const bodyLength = 0.4;
            j.spine.set(
                j.pelvis.coordinateX + Math.sin(bodyAngle) * bodyLength,
                j.pelvis.coordinateY + Math.cos(bodyAngle) * bodyLength,
                0
            );
            
            j.head.set(
                j.spine.coordinateX + Math.sin(bodyAngle) * 0.35,
                j.spine.coordinateY + Math.cos(bodyAngle) * 0.35,
                0.05
            );

            const armReachX = diveDirection * 0.75;
            const armReachY = (isHigh ? 0.6 : 0.0) + progress * 0.3;
            
            j.shoulderL.set(j.spine.coordinateX - 0.22, j.spine.coordinateY + 0.05, 0);
            j.shoulderR.set(j.spine.coordinateX + 0.22, j.spine.coordinateY + 0.05, 0);

            j.elbowL.set(j.shoulderL.coordinateX + armReachX * 0.5, j.shoulderL.coordinateY + armReachY * 0.5, 0.1);
            j.elbowR.set(j.shoulderR.coordinateX + armReachX * 0.5, j.shoulderR.coordinateY + armReachY * 0.5, 0.1);

            j.handL.set(j.shoulderL.coordinateX + armReachX * 1.1, j.shoulderL.coordinateY + armReachY * 1.1, 0.15);
            j.handR.set(j.shoulderR.coordinateX + armReachX * 1.1, j.shoulderR.coordinateY + armReachY * 1.1, 0.15);

            const legDragX = -diveDirection * 0.65;
            const legDragY = -0.3;
            
            j.hipL.set(j.pelvis.coordinateX - 0.15, j.pelvis.coordinateY - 0.05, 0);
            j.hipR.set(j.pelvis.coordinateX + 0.15, j.pelvis.coordinateY - 0.05, 0);

            j.kneeL.set(j.hipL.coordinateX + legDragX * 0.5, j.hipL.coordinateY + legDragY * 0.5, -0.15);
            j.kneeR.set(j.hipR.coordinateX + legDragX * 0.5, j.hipR.coordinateY + legDragY * 0.5, -0.15);

            j.footL.set(j.hipL.coordinateX + legDragX * 1.0, j.hipL.coordinateY + legDragY * 1.0, -0.22);
            j.footR.set(j.hipR.coordinateX + legDragX * 1.0, j.hipR.coordinateY + legDragY * 1.0, -0.22);
        }
        else if (this.pose === 'celebrate') {
            const jumpPhase = Math.sin(this.animationTimer * 7.0);
            const armPhase = Math.sin(this.animationTimer * 5.0);

            j.pelvis.set(0, 1.0 + Math.max(0, jumpPhase) * 0.22, 0);
            j.spine.set(0, 1.35 + Math.max(0, jumpPhase) * 0.22, -0.05);
            j.head.set(0, 1.7 + Math.max(0, jumpPhase) * 0.22, -0.05);

            j.shoulderL.set(-0.25, 1.45, 0);
            j.shoulderR.set(0.25, 1.45, 0);
            j.elbowL.set(-0.35 - armPhase * 0.05, 1.85, 0);
            j.elbowR.set(0.35 + armPhase * 0.05, 1.85, 0);
            j.handL.set(-0.4, 2.15, 0.05);
            j.handR.set(0.4, 2.15, 0.05);

            j.hipL.set(-0.16, 0.9, 0);
            j.hipR.set(0.16, 0.9, 0);
            if (jumpPhase > 0) {
                j.kneeL.set(-0.18, 0.65, 0.15);
                j.kneeR.set(0.18, 0.65, 0.15);
                j.footL.set(-0.18, 0.35, 0.2);
                j.footR.set(0.18, 0.35, 0.2);
            } else {
                j.kneeL.set(-0.16, 0.5, 0);
                j.kneeR.set(0.16, 0.5, 0);
                j.footL.set(-0.16, 0.02, 0);
                j.footR.set(0.16, 0.02, 0);
            }
        }
        else if (this.pose === 'sad') {
            j.pelvis.set(0, 0.88, 0);
            j.spine.set(0, 1.18, 0.1);
            j.head.set(0, 1.45, 0.2);

            j.shoulderL.set(-0.24, 1.28, 0.05);
            j.shoulderR.set(0.24, 1.28, 0.05);
            j.elbowL.set(-0.25, 1.4, 0.25);
            j.elbowR.set(0.25, 1.4, 0.25);
            j.handL.set(-0.12, 1.45, 0.3);
            j.handR.set(0.12, 1.45, 0.3);

            j.hipL.set(-0.16, 0.8, 0);
            j.hipR.set(0.16, 0.8, 0);
            j.kneeL.set(-0.16, 0.43, 0);
            j.kneeR.set(0.16, 0.43, 0);
            j.footL.set(-0.16, 0.02, 0);
            j.footR.set(0.16, 0.02, 0);
        }
        // === НОВІ СМІШНІ ПОЗИ ВОРОТАРЯ ===
        else if (this.pose === 'taunt') {
            // Воротар насміхається - бедра хитаються, руки дражняться
            const taunPhase = Math.sin(this.animationTimer * 5.5);
            const hipSway = Math.sin(this.animationTimer * 2.8) * 0.12;
            j.pelvis.set(hipSway, 0.9, 0);
            j.spine.set(hipSway * 0.5, 1.25, -0.02);
            j.head.set(hipSway * 0.3, 1.62, 0);
            j.shoulderL.set(-0.3, 1.35, 0);
            j.shoulderR.set(0.3, 1.35, 0);
            j.elbowL.set(-0.65, 1.25, 0.3 + taunPhase * 0.1);
            j.elbowR.set(0.65, 1.25, 0.3 - taunPhase * 0.1);
            j.handL.set(-0.75, 1.45, 0.4 + taunPhase * 0.15);
            j.handR.set(0.75, 1.45, 0.4 - taunPhase * 0.15);
            j.hipL.set(-0.18, 0.8, 0);
            j.hipR.set(0.18, 0.8, 0);
            j.kneeL.set(-0.25, 0.42, 0.08);
            j.kneeR.set(0.25, 0.42, 0.08);
            j.footL.set(-0.24, 0.02, 0.1);
            j.footR.set(0.24, 0.02, 0.1);
        }
        else if (this.pose === 'stare_down') {
            // Воротар пильно дивиться - нерухомий як скеля, тільки голова ледве хитається
            const eyePhase = Math.sin(this.animationTimer * 1.2) * 0.02;
            j.pelvis.set(0, 0.88, 0);
            j.spine.set(0, 1.22, -0.12);
            j.head.set(eyePhase, 1.58, -0.18);
            j.shoulderL.set(-0.32, 1.35, -0.05);
            j.shoulderR.set(0.32, 1.35, -0.05);
            j.elbowL.set(-0.62, 1.12, 0.15);
            j.elbowR.set(0.62, 1.12, 0.15);
            j.handL.set(-0.72, 0.95, 0.25);
            j.handR.set(0.72, 0.95, 0.25);
            j.hipL.set(-0.22, 0.78, 0);
            j.hipR.set(0.22, 0.78, 0);
            j.kneeL.set(-0.30, 0.38, 0.12);
            j.kneeR.set(0.30, 0.38, 0.12);
            j.footL.set(-0.28, 0.02, 0.15);
            j.footR.set(0.28, 0.02, 0.15);
        }
        else if (this.pose === 'nervous_shuffle') {
            // Нервово переступає з ноги на ногу - дуже смішно виглядає
            const shufflePhase = Math.sin(this.animationTimer * 8.0);
            const bodyTilt = shufflePhase * 0.05;
            j.pelvis.set(shufflePhase * 0.1, 0.88, 0);
            j.spine.set(bodyTilt, 1.22, 0);
            j.head.set(bodyTilt * 1.5, 1.58, 0);
            j.shoulderL.set(-0.26, 1.33, 0);
            j.shoulderR.set(0.26, 1.33, 0);
            j.elbowL.set(-0.55, 1.08 + shufflePhase * 0.05, 0.2);
            j.elbowR.set(0.55, 1.08 - shufflePhase * 0.05, 0.2);
            j.handL.set(-0.68, 0.92, 0.3);
            j.handR.set(0.68, 0.92, 0.3);
            j.hipL.set(-0.18, 0.8, 0);
            j.hipR.set(0.18, 0.8, 0);
            j.kneeL.set(-0.2, 0.42 + Math.max(0, shufflePhase) * 0.12, 0.06);
            j.kneeR.set(0.2, 0.42 + Math.max(0, -shufflePhase) * 0.12, 0.06);
            j.footL.set(-0.2, 0.02 + Math.max(0, shufflePhase) * 0.1, 0.08);
            j.footR.set(0.2, 0.02 + Math.max(0, -shufflePhase) * 0.1, 0.08);
        }
        else if (this.pose === 'headstand') {
            // Воротар стоїть на голові - абсурдна поза, гарантований сміх
            const wobble = Math.sin(this.animationTimer * 3.0) * 0.04;
            j.head.set(wobble, 0.18, 0.05);
            j.spine.set(wobble * 0.5, 0.55, 0.02);
            j.pelvis.set(0, 0.95, 0);
            j.shoulderL.set(-0.25, 0.38, 0);
            j.shoulderR.set(0.25, 0.38, 0);
            j.elbowL.set(-0.18, 0.22, 0.12);
            j.elbowR.set(0.18, 0.22, 0.12);
            j.handL.set(-0.1, 0.08, 0.18);
            j.handR.set(0.1, 0.08, 0.18);
            j.hipL.set(-0.16, 1.15, 0);
            j.hipR.set(0.16, 1.15, 0);
            j.kneeL.set(-0.18, 1.58 + wobble, 0.12);
            j.kneeR.set(0.18, 1.58 - wobble, 0.12);
            j.footL.set(-0.16, 1.95 + wobble * 1.5, 0.18);
            j.footR.set(0.16, 1.95 - wobble * 1.5, 0.18);
        }
        else if (this.pose === 'handclap') {
            // Воротар оплескує після сейву - підстрибує і б'є в долоні
            const clapPhase = Math.abs(Math.sin(this.animationTimer * 10.0));
            const jumpBounce = Math.max(0, Math.sin(this.animationTimer * 7.0)) * 0.15;
            j.pelvis.set(0, 0.9 + jumpBounce, 0);
            j.spine.set(0, 1.26 + jumpBounce, -0.05);
            j.head.set(0, 1.63 + jumpBounce, -0.05);
            const clapX = clapPhase * 0.22;
            j.shoulderL.set(-0.25, 1.45 + jumpBounce, 0);
            j.shoulderR.set(0.25, 1.45 + jumpBounce, 0);
            j.elbowL.set(-0.18, 1.62 + jumpBounce, 0.18);
            j.elbowR.set(0.18, 1.62 + jumpBounce, 0.18);
            j.handL.set(-clapX, 1.72 + jumpBounce, 0.35);
            j.handR.set(clapX, 1.72 + jumpBounce, 0.35);
            j.hipL.set(-0.16, 0.82 + jumpBounce, 0);
            j.hipR.set(0.16, 0.82 + jumpBounce, 0);
            j.kneeL.set(-0.18, jumpBounce > 0.05 ? 0.55 : 0.43, jumpBounce > 0.05 ? 0.12 : 0);
            j.kneeR.set(0.18, jumpBounce > 0.05 ? 0.55 : 0.43, jumpBounce > 0.05 ? 0.12 : 0);
            j.footL.set(-0.16, jumpBounce > 0.05 ? 0.28 : 0.02, jumpBounce > 0.05 ? 0.18 : 0);
            j.footR.set(0.16, jumpBounce > 0.05 ? 0.28 : 0.02, jumpBounce > 0.05 ? 0.18 : 0);
        }
    }

    render(ctx, camera, canvasWidth, canvasHeight) {
        const projectedJoints = {};
        const j = this.joints;

        const cosAngle = Math.cos(this.headingAngle);
        const sinAngle = Math.sin(this.headingAngle);

        for (const jointKey in j) {
            const localJ = j[jointKey];
            const worldX = this.position.coordinateX + (localJ.coordinateX * cosAngle + localJ.coordinateZ * sinAngle);
            const worldY = this.position.coordinateY + localJ.coordinateY;
            const worldZ = this.position.coordinateZ + (-localJ.coordinateX * sinAngle + localJ.coordinateZ * cosAngle);

            const projected = camera.project(new Vector3(worldX, worldY, worldZ), canvasWidth, canvasHeight);
            if (!projected) continue; // пропускаємо тільки цей суглоб, а не весь рендер!
            projectedJoints[jointKey] = projected;
        }

        const scale = projectedJoints.pelvis.scale;
        if (scale < 1.0) return;

        const thicknessHead = 12 * (scale / 300);
        const thicknessTorso = 18 * (scale / 300);
        const thicknessLimb = 7 * (scale / 300);
        const thicknessFoot = 8 * (scale / 300);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.save();
        ctx.fillStyle = 'rgba(5, 10, 5, 0.35)';
        ctx.beginPath();
        const diffZ = camera.position.coordinateZ - this.position.coordinateZ;
        const safeDiffZ = Math.abs(diffZ) < 0.1 ? 0.1 : diffZ;
        ctx.ellipse(
            projectedJoints.pelvis.x, 
            canvasHeight / 2 + (camera.position.coordinateY * scale) / safeDiffZ,
            25 * (scale / 300), 
            8 * (scale / 300), 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();

        const drawSegment = (j1Name, j2Name, color, width) => {
            const p1 = projectedJoints[j1Name];
            const p2 = projectedJoints[j2Name];
            if (!p1 || !p2) return; // суглоб поза камерою - пропускаємо сегмент
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        };

        drawSegment('hipL', 'kneeL', this.shortsColor, thicknessLimb * 1.3);
        drawSegment('hipR', 'kneeR', this.shortsColor, thicknessLimb * 1.3);
        
        drawSegment('kneeL', 'footL', this.socksColor, thicknessLimb);
        drawSegment('kneeR', 'footR', this.socksColor, thicknessLimb);

        // Отримуємо активний колір бутс для нашого гравця
        let bootColor = '#111111'; // Дефолтний чорний
        if (!this.isGoalkeeper) {
            const activeBootId = safeStorage.getItem('pm_equipped_boot') || 'black';
            if (activeBootId === 'neon_green') bootColor = '#39ff14';
            else if (activeBootId === 'cyan') bootColor = '#00ffff';
            else if (activeBootId === 'gold_boots') bootColor = '#ffd700';
        }

        drawSegment('footL', 'footL', bootColor, thicknessFoot);
        drawSegment('footR', 'footR', bootColor, thicknessFoot);

        drawSegment('pelvis', 'spine', this.jerseyColor, thicknessTorso);
        drawSegment('shoulderL', 'shoulderR', this.jerseyColor, thicknessLimb * 1.4);

        drawSegment('shoulderL', 'elbowL', this.jerseyColor, thicknessLimb);
        drawSegment('shoulderR', 'elbowR', this.jerseyColor, thicknessLimb);
        
        drawSegment('elbowL', 'handL', this.skinColor, thicknessLimb * 0.95);
        drawSegment('elbowR', 'handR', this.skinColor, thicknessLimb * 0.95);

        drawSegment('spine', 'head', this.skinColor, thicknessLimb * 1.1);
        
        if (projectedJoints.head) {
            ctx.fillStyle = this.skinColor;
            ctx.beginPath();
            ctx.arc(projectedJoints.head.x, projectedJoints.head.y, thicknessHead, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = this.isGoalkeeper ? '#111111' : '#ff9900';
            ctx.beginPath();
            ctx.arc(projectedJoints.head.x, projectedJoints.head.y - thicknessHead * 0.3, thicknessHead * 0.85, Math.PI, 0);
            ctx.fill();
        }

        if (this.isGoalkeeper && projectedJoints.handL && projectedJoints.handR) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(projectedJoints.handL.x, projectedJoints.handL.y, thicknessLimb * 1.4, 0, Math.PI * 2);
            ctx.arc(projectedJoints.handR.x, projectedJoints.handR.y, thicknessLimb * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/*
====================================================
CLASS
GoalkeeperAI
====================================================
*/
class GoalkeeperAI {
    constructor(skeletalKeeper) {
        this.keeper = skeletalKeeper;
        this.difficulty = DIFFICULTY_PRESETS.MEDIUM;
        
        this.reactionTimer = 0;
        this.isReacting = false;
        this.hasJumped = false;

        this.predictedTargetX = 0;
        this.predictedTargetY = 0.5;

        this.diveOriginX = 0;
        this.diveOriginY = 0;

        this.correctionTimer = 0;
        this.correctionInterval = 0.12; 
        this.diveVelocityX = 0; 
        this.diveVelocityY = 0; 
        this.divePhase = 0;     
    }

    reset() {
        this.keeper.position.set(0, 0, 0);
        this.reactionTimer = 0;
        this.isReacting = false;
        this.hasJumped = false;
        this.correctionTimer = 0;
        this.diveVelocityX = 0;
        this.diveVelocityY = 0;
        this.divePhase = 0;
        this.predictedTargetX = 0;
        this.predictedTargetY = 0.5;

        const isHardPreset = this.difficulty && (this.difficulty.name === 'HARD' || this.difficulty.name === 'LEGEND');
        const anticRoll = Math.random();
        if (isHardPreset && anticRoll < 0.40) {
            this.keeper.setPose('hang_bar');
        } else if (isHardPreset && anticRoll < 0.70) {
            this.keeper.setPose('walk_bar');
        } else {
            this.keeper.setPose('idle');
        }
    }

    setDifficulty(diffPreset) {
        this.difficulty = diffPreset;
    }

    simulateBallToGoal(ball) {
        const simBallPos = ball.position.clone();
        const simBallVel = ball.velocity.clone();
        const simAngularVel = ball.angularVelocity.clone();
        const timeStep = 0.015;

        for (let step = 0; step < 160; step++) {
            const speed = simBallVel.length();
            if (speed > 0.05) {
                const drag = 0.5 * PHYSICS_AIR_DENSITY * BALL_DRAG_COEFFICIENT * BALL_CROSS_SECTION * speed * speed;
                simBallVel.coordinateX += (-simBallVel.coordinateX / speed) * (drag / BALL_MASS) * timeStep;
                simBallVel.coordinateY += (-simBallVel.coordinateY / speed) * (drag / BALL_MASS) * timeStep;
                simBallVel.coordinateZ += (-simBallVel.coordinateZ / speed) * (drag / BALL_MASS) * timeStep;
            }

            const magnus = simAngularVel.cross(simBallVel).scale(BALL_MAGNUS_COEFFICIENT / BALL_MASS);
            simBallVel.coordinateX += magnus.coordinateX * timeStep;
            simBallVel.coordinateY += magnus.coordinateY * timeStep;
            simBallVel.coordinateZ += magnus.coordinateZ * timeStep;

            simBallVel.coordinateY -= PHYSICS_GRAVITY * timeStep;

            simBallPos.coordinateX += simBallVel.coordinateX * timeStep;
            simBallPos.coordinateY += simBallVel.coordinateY * timeStep;
            simBallPos.coordinateZ += simBallVel.coordinateZ * timeStep;

            if (simBallPos.coordinateY <= BALL_RADIUS) {
                simBallPos.coordinateY = BALL_RADIUS;
                simBallVel.coordinateY = Math.abs(simBallVel.coordinateY) * 0.65;
            }

            if (simBallPos.coordinateZ <= 0.05) {
                break;
            }
        }

        return { x: simBallPos.coordinateX, y: simBallPos.coordinateY };
    }

    onBallKicked(ball) {
        this.isReacting = true;
        this.reactionTimer = this.difficulty ? this.difficulty.reactionDelay : 0.32;
        this.hasJumped = false;
        this.divePhase = 0;
        this.correctionTimer = 0;

        const isMistaking = this.difficulty && Math.random() < this.difficulty.mistakeChance;
        if (isMistaking) {
            this.predictedTargetX = (Math.random() > 0.5 ? -1.0 : 1.0) * (GOAL_WIDTH / 3);
            this.predictedTargetY = Math.random() * GOAL_HEIGHT;
            return;
        }

        const predicted = this.simulateBallToGoal(ball);
        const errorRange = this.difficulty ? this.difficulty.predictionError : 0.5;
        const errX = (Math.random() - 0.5) * 2.0 * errorRange;
        const errY = (Math.random() - 0.5) * 1.5 * errorRange;

        this.predictedTargetX = Math.max(-GOAL_WIDTH/2 - 0.5, Math.min(GOAL_WIDTH/2 + 0.5, predicted.x + errX));
        this.predictedTargetY = Math.max(0.1, Math.min(GOAL_HEIGHT + 0.4, predicted.y + errY));

        if (this.keeper.pose === 'hang_bar' || this.keeper.pose === 'walk_bar') {
            this.keeper.position.set(0, 0, 0);
        }

        this.diveOriginX = this.keeper.position.coordinateX;
        this.diveOriginY = this.keeper.position.coordinateY;
    }

    update(deltaTime, ball) {
        if (!this.isReacting) return;

        if (this.reactionTimer > 0) {
            this.reactionTimer -= deltaTime;
            return;
        }

        if (ball && ball.velocity && !this.hasJumped) {
            this.correctionTimer += deltaTime;
            if (this.correctionTimer >= this.correctionInterval) {
                this.correctionTimer = 0;
                const refined = this.simulateBallToGoal(ball);
                const blendFactor = 0.55;
                this.predictedTargetX = this.predictedTargetX * (1 - blendFactor) + refined.x * blendFactor;
                this.predictedTargetY = this.predictedTargetY * (1 - blendFactor) + refined.y * blendFactor;
            }
        }

        if (!this.hasJumped) {
            this.hasJumped = true;
            const distanceToTarget = Math.abs(this.predictedTargetX - this.keeper.position.coordinateX);

            if (distanceToTarget > 0.45) {
                const isLeft = this.predictedTargetX < this.keeper.position.coordinateX;
                const isHigh = this.predictedTargetY > 0.95;
                
                // Спеціальні сейви ногами для низьких ударів, інакше сальто або класичний сейв
                const isLow = this.predictedTargetY < 0.65;
                const somersaultChance = 0.65; 
                
                if (isLow && Math.random() < 0.5) {
                    this.keeper.setPose('keeper_split');
                } else if (Math.random() < somersaultChance) {
                    this.keeper.setPose(isLeft ? 'somersault_left' : 'somersault_right');
                } else {
                    this.keeper.setPose(isLeft ? (isHigh ? 'dive_high_left' : 'dive_low_left') : (isHigh ? 'dive_high_right' : 'dive_low_right'));
                }

                const approxTimeToGoal = Math.max(0.18, distanceToTarget / ((this.difficulty ? this.difficulty.diveSpeed : 6.5) * 2.3));
                this.diveVelocityX = (this.predictedTargetX - this.keeper.position.coordinateX) / approxTimeToGoal;
                const peakHeight = isHigh ? Math.min(this.predictedTargetY, GOAL_HEIGHT - 0.05) : Math.min(this.predictedTargetY, 0.7);
                this.diveVelocityY = Math.sqrt(2.2 * PHYSICS_GRAVITY * peakHeight);
                this.divePhase = 1;
            } else {
                this.keeper.setPose(this.predictedTargetY > 1.1 ? 'dive_high_right' : 'idle');
                this.diveVelocityX = (this.predictedTargetX - this.keeper.position.coordinateX) * 4.5;
                this.diveVelocityY = this.predictedTargetY > 1.1 ? Math.sqrt(2.0 * PHYSICS_GRAVITY * 0.8) : 0;
                this.divePhase = 1;
            }
        }

        if (this.divePhase >= 1) {
            const deltaX = this.predictedTargetX - this.keeper.position.coordinateX;
            const maxStep = (this.difficulty ? this.difficulty.diveSpeed : 6.5) * 1.8 * deltaTime;
            this.keeper.position.coordinateX += Math.sign(deltaX) * Math.min(Math.abs(deltaX), maxStep);

            this.diveVelocityY -= PHYSICS_GRAVITY * 1.4 * deltaTime;
            this.keeper.position.coordinateY += this.diveVelocityY * deltaTime;

            if (this.keeper.position.coordinateY <= 0.0) {
                this.keeper.position.coordinateY = 0.0;
                this.diveVelocityY = 0;
                this.divePhase = 3; 
            }
        }

        this.keeper.position.coordinateX = Math.max(-GOAL_WIDTH/2 - 0.9, Math.min(GOAL_WIDTH/2 + 0.9, this.keeper.position.coordinateX));
    }

    checkSaveCollision(ball) {
        if (Math.abs(ball.position.coordinateZ) > 0.5) return null;
        
        const getJointWorldPos = (jointName) => {
            const localJ = this.keeper.joints[jointName];
            const cosA = Math.cos(this.keeper.headingAngle);
            const sinA = Math.sin(this.keeper.headingAngle);
            return new Vector3(
                this.keeper.position.coordinateX + (localJ.coordinateX * cosA + localJ.coordinateZ * sinA),
                this.keeper.position.coordinateY + localJ.coordinateY,
                this.keeper.position.coordinateZ + (-localJ.coordinateX * sinA + localJ.coordinateZ * cosA)
            );
        };

        const handLPos = getJointWorldPos('handL');
        const handRPos = getJointWorldPos('handR');
        const spinePos  = getJointWorldPos('spine');

        const distL    = ball.position.distanceTo(handLPos);
        const distR    = ball.position.distanceTo(handRPos);
        const distBody = ball.position.distanceTo(spinePos);

        const saveRadiusHands = 0.34;
        const saveRadiusBody  = 0.48;

        const keeperVel = new Vector3(this.diveVelocityX, this.diveVelocityY, 0);

        if (distL < saveRadiusHands || distR < saveRadiusHands) {
            const closestHand = distL < distR ? handLPos : handRPos;
            const rawN = ball.position.subtract(closestHand);
            const contactNormal = rawN.length() > 0.001 ? rawN.normalize() : new Vector3(0, 1, 1).normalize();

            const catchChance = this.difficulty ? (this.difficulty.name === 'EASY' ? 0.28 : (this.difficulty.name === 'MEDIUM' ? 0.60 : 0.75)) : 0.6;
            const type = Math.random() < catchChance ? 'save' : 'punch';
            return { type, contactNormal, keeperVel };
        }

        if (distBody < saveRadiusBody) {
            const rawN = ball.position.subtract(spinePos);
            const contactNormal = rawN.length() > 0.001 ? rawN.normalize() : new Vector3(0, 1, 1).normalize();
            return { type: 'punch', contactNormal, keeperVel };
        }

        return null;
    }
}
