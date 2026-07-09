/*********************************************************************
AUDIO SYSTEM (PRODUCER ENGINE via WEB AUDIO API)
*********************************************************************/

/*
====================================================
CLASS
AudioManager

Відповідає за
✔ Генерацію звуків ударів по м'ячу
✔ Генерацію звуків металевого удару об штангу
✔ Шурхіт сітки воріт
✔ Суддівський свисток
✔ Динамічний шум трибун (амбієнт, свист, радість гола)
====================================================
*/
class AudioManager {
    constructor() {
        this.audioCtx = null;
        this.soundEnabled = true;
        this.ambientEnabled = true;
        this.ambientNode = null;
        this.gainAmbient = null;
    }

    /*
    ====================================================
    Function
    init()
    Призначення: Ініціалізує аудіо-контекст після кліку користувача.
    ====================================================
    */
    init() {
        if (this.audioCtx) return;
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            this.audioCtx = new AudioContextClass();
            if (this.ambientEnabled) {
                this.startAmbient();
            }
        }
    }

    /*
    ====================================================
    Function
    resume()
    Призначення: Відновлює контекст (потрібно для політики браузерів).
    ====================================================
    */
    resume() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /*
    ====================================================
    Function
    playKick()
    Призначення: Синтезує низький удар бутси по м'ячу.
    ====================================================
    */
    playKick() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        
        // Осцилятор для низькочастотного удару
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.15);
        
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
        
        // Додамо трохи шуму для шершавості
        const noiseNode = this.createNoiseNode(0.08);
        const noiseFilter = this.audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 180;
        
        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

        if (noiseNode) {
            noiseNode.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.audioCtx.destination);
        }

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start(time);
        osc.stop(time + 0.2);
        if (noiseNode) noiseNode.start(time);
    }

    /*
    ====================================================
    Function
    playPostHit()
    Призначення: Синтезує дзвінкий металевий удар об каркас.
    ====================================================
    */
    playPostHit() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        
        // Декілька металевих резонуючих частот
        const frequencies = [440, 580, 850, 1100];
        frequencies.forEach((freq, idx) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            // Перший тон гучніший, інші створюють гармоніки
            const volume = idx === 0 ? 0.6 : 0.2;
            const duration = idx === 0 ? 0.6 : 0.3;
            
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            
            osc.start(time);
            osc.stop(time + duration + 0.1);
        });
    }

    /*
    ====================================================
    Function
    playNetRustle()
    Призначення: Синтезує шурхіт сітки при голі.
    ====================================================
    */
    playNetRustle() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        const noiseNode = this.createNoiseNode(0.5);
        if (!noiseNode) return;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 1.5;

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.linearRampToValueAtTime(0.4, time + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

        noiseNode.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        noiseNode.start(time);
        noiseNode.stop(time + 0.7);
    }

    /*
    ====================================================
    Function
    playWhistle()
    Призначення: Синтезує свисток арбітра.
    ====================================================
    */
    playWhistle() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        
        // Два високих осцилятори для ефекту биття
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const bandpass = this.audioCtx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.value = 2100;
        
        osc2.type = 'sine';
        osc2.frequency.value = 2130;

        bandpass.type = 'bandpass';
        bandpass.frequency.value = 2115;

        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(0.35, time + 0.05);
        gain.gain.setValueAtTime(0.35, time + 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

        osc1.connect(bandpass);
        osc2.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.5);
        osc2.stop(time + 0.5);
    }

    /*
    ====================================================
    Function
    playKeeperSave()
    Призначення: Звук удару м'яча об рукавиці кіпера.
    ====================================================
    */
    playKeeperSave() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.linearRampToValueAtTime(60, time + 0.1);
        
        gain.gain.setValueAtTime(0.7, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

        const noise = this.createNoiseNode(0.12);
        if (noise) {
            const noiseGain = this.audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.4, time);
            noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
            noise.connect(noiseGain);
            noiseGain.connect(this.audioCtx.destination);
            noise.start(time);
            noise.stop(time + 0.1);
        }

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start(time);
        osc.stop(time + 0.15);
    }

    /*
    ====================================================
    Function
    playGoalCheer()
    Призначення: Синтезує овації трибун у разі гола.
    ====================================================
    */
    playGoalCheer() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        const noise = this.createNoiseNode(2.5);
        if (!noise) return;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, time);
        filter.frequency.exponentialRampToValueAtTime(1200, time + 0.8);

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.01, time);
        gain.gain.linearRampToValueAtTime(0.6, time + 0.4);
        gain.gain.linearRampToValueAtTime(0.4, time + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 3.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        noise.start(time);
        noise.stop(time + 3.6);
    }

    /*
    ====================================================
    Function
    playMissGroan()
    Призначення: Синтезує розчарований зітх натовпу.
    ====================================================
    */
    playMissGroan() {
        if (!this.soundEnabled || !this.audioCtx) return;
        this.resume();

        const time = this.audioCtx.currentTime;
        const noise = this.createNoiseNode(2.0);
        if (!noise) return;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, time);
        filter.frequency.linearRampToValueAtTime(250, time + 0.5);

        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.01, time);
        gain.gain.linearRampToValueAtTime(0.45, time + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 2.0);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioCtx.destination);

        noise.start(time);
        noise.stop(time + 2.1);
    }

    /*
    ====================================================
    Function
    startAmbient()
    Призначення: Запускає постійний гул стадіону на тлі.
    ====================================================
    */
    startAmbient() {
        if (!this.ambientEnabled || !this.audioCtx || this.ambientNode) return;

        const time = this.audioCtx.currentTime;
        this.ambientNode = this.createNoiseNode(10.0); // Довгий буфер
        if (!this.ambientNode) return;

        this.ambientNode.loop = true;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 220;

        this.gainAmbient = this.audioCtx.createGain();
        this.gainAmbient.gain.setValueAtTime(0.08, time);

        this.ambientNode.connect(filter);
        filter.connect(this.gainAmbient);
        this.gainAmbient.connect(this.audioCtx.destination);

        this.ambientNode.start(time);
    }

    /*
    ====================================================
    Function
    stopAmbient()
    Призначення: Зупиняє фоновий гул.
    ====================================================
    */
    stopAmbient() {
        if (this.ambientNode) {
            try {
                this.ambientNode.stop();
            } catch(e) {}
            this.ambientNode = null;
        }
    }

    /*
    ====================================================
    Function
    setSoundEnabled()
    Призначення: Вмикає / вимикає ефекти.
    ====================================================
    */
    setSoundEnabled(val) {
        this.soundEnabled = val;
    }

    /*
    ====================================================
    Function
    setAmbientEnabled()
    Призначення: Вмикає / вимикає гул стадіону.
    ====================================================
    */
    setAmbientEnabled(val) {
        this.ambientEnabled = val;
        if (val) {
            this.startAmbient();
        } else {
            this.stopAmbient();
        }
    }

    /*
    ====================================================
    Function
    createNoiseNode()
    Призначення: Генерує буфер білого шуму заданої довжини.
    ====================================================
    */
    createNoiseNode(duration) {
        if (!this.audioCtx) return null;
        const bufferSize = this.audioCtx.sampleRate * duration;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let cellIndex = 0; cellIndex < bufferSize; cellIndex++) {
            data[cellIndex] = Math.random() * 2 - 1;
        }

        const noiseNode = this.audioCtx.createBufferSource();
        noiseNode.buffer = buffer;
        return noiseNode;
    }
}

// Глобальний менеджер аудіо
const gameAudio = new AudioManager();
