        const AudioSys = {
            ctx: null, isPlayingBGM: false, bgmInterval: null,
            init() {
                if (!this.ctx) { this.ctx = new (window.AudioContext || window.webkitAudioContext)() }
                if (this.ctx.state === 'suspended') { this.ctx.resume() }
            },
            playTone(freq, type, duration, vol = 0.1, slideTo = null) {
                if (!this.ctx) return;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
                if (slideTo && slideTo > 0) { osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration) }
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            },
            playNoise(duration, vol = 0.08, isLowPass = false) {
                if (!this.ctx) return;
                const sampleRate = this.ctx.sampleRate || 44100;
                const bufferSize = sampleRate * duration;
                const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1 }
                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(vol, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
                if (isLowPass) {
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(250, this.ctx.currentTime);
                    noise.connect(filter);
                    filter.connect(gain);
                } else { noise.connect(gain) }
                gain.connect(this.ctx.destination);
                noise.start();
            },
            punch() { this.playTone(180, 'sine', 0.12, 0.22, 45); this.playNoise(0.08, 0.12, true) },
            kick() { this.playTone(120, 'triangle', 0.18, 0.28, 30); this.playNoise(0.12, 0.18, true) },
            block() { this.playTone(450, 'sawtooth', 0.08, 0.08, 600) },
            whoosh() { this.playTone(320, 'sine', 0.1, 0.08, 120) },
            projectileLaunch() { this.playTone(200, 'sine', 0.25, 0.15, 480) },
            superHit() { this.playTone(65, 'sawtooth', 0.4, 0.35, 25); this.playNoise(0.3, 0.25, false) },
            finishHimSound() { this.playTone(45, 'sawtooth', 0.85, 0.45, 20); this.playTone(70, 'square', 0.75, 0.25, 30); this.playNoise(0.45, 0.15, false) },
            fatalitySound() { this.playTone(38, 'sawtooth', 1.8, 0.55, 12); this.playNoise(1.2, 0.35, false) },
            announce(text) {
                let f = 60;
                if (text.includes("ROUND")) {
                    this.playTone(68, 'sawtooth', 0.55, 0.35, 42);
                    this.playTone(95, 'square', 0.5, 0.18, 55);
                    this.playNoise(0.35, 0.1, true);
                } else if (text.includes("FIGHT")) {
                    this.playTone(52, 'sawtooth', 0.7, 0.45, 25);
                    this.playTone(80, 'square', 0.6, 0.25, 38);
                    this.playNoise(0.45, 0.18, false);
                } else if (text.includes("WINS")) {
                    this.playTone(58, 'sawtooth', 0.8, 0.38, 35);
                    this.playTone(76, 'square', 0.7, 0.18, 45);
                    this.playNoise(0.55, 0.12, true);
                } else if (text.includes("FATALITY")) {
                    this.playTone(40, 'sawtooth', 1.4, 0.6, 15);
                    this.playTone(60, 'square', 1.2, 0.3, 25);
                    this.playNoise(0.9, 0.25, false);
                } else {
                    this.playTone(f, 'sawtooth', 0.45, 0.25, f - 15);
                    this.playTone(f * 1.3, 'square', 0.35, 0.12, f * 1.3 - 25);
                }
            },
            currentTrackIndex: 0,
            tracks: [
                {
                    name: "Київське Техно",
                    tempo: 180,
                    bassline: [55, 55, 55, 55, 65, 65, 73, 73, 55, 55, 55, 55, 82, 82, 73, 73],
                    melody: [220, 261, 293, 329, 392, 329, 293, 261, 220, 261, 293, 329, 440, 392, 329, 261],
                    bassType: 'sawtooth',
                    melodyType: 'square',
                    bassVol: 0.05,
                    melodyVol: 0.03,
                    noiseVol: 0.04
                },
                {
                    name: "Дніпровський Бриз",
                    tempo: 220,
                    bassline: [65, 65, 73, 73, 87, 87, 98, 98],
                    melody: [261, 293, 329, 392, 349, 329, 293, 261, 329, 349, 392, 440, 523, 440, 392, 349],
                    bassType: 'triangle',
                    melodyType: 'sine',
                    bassVol: 0.08,
                    melodyVol: 0.05,
                    noiseVol: 0.02
                },
                {
                    name: "Борщагівський Кіберпанк",
                    tempo: 200,
                    bassline: [49, 49, 49, 49, 58, 58, 58, 58, 65, 65, 65, 65, 73, 73, 73, 73],
                    melody: [196, 233, 261, 293, 311, 293, 261, 233, 293, 311, 349, 392, 466, 392, 349, 311],
                    bassType: 'sawtooth',
                    melodyType: 'sawtooth',
                    bassVol: 0.04,
                    melodyVol: 0.02,
                    noiseVol: 0.05
                },
                {
                    name: "Шулявський Драйв",
                    tempo: 160,
                    bassline: [41, 41, 49, 49, 55, 55, 49, 49],
                    melody: [164, 196, 220, 247, 293, 247, 220, 196, 329, 293, 247, 220, 247, 220, 196, 164],
                    bassType: 'sawtooth',
                    melodyType: 'square',
                    bassVol: 0.06,
                    melodyVol: 0.04,
                    noiseVol: 0.06
                }
            ],
            changeTrackForLevel(levelIndex) {
                this.currentTrackIndex = levelIndex % this.tracks.length;
            },
            startBGM() {
                if (this.isPlayingBGM) return;
                this.isPlayingBGM = true;
                let step = 0;
                const playStep = () => {
                    if (!this.isPlayingBGM) return;
                    const track = this.tracks[this.currentTrackIndex];
                    const bassNote = track.bassline[step % track.bassline.length];
                    if (bassNote > 0) {
                        this.playTone(bassNote, track.bassType, (track.tempo * 1.2) / 1000, track.bassVol);
                    }
                    if (step % 4 === 0) {
                        const melodyNote = track.melody[Math.floor(step / 4) % track.melody.length];
                        if (melodyNote > 0) {
                            this.playTone(melodyNote, track.melodyType, (track.tempo * 2.5) / 1000, track.melodyVol);
                        }
                    }
                    if (step % 4 === 0) {
                        this.playTone(90, 'sine', 0.1, track.noiseVol * 1.8, 20);
                    }
                    if (step % 4 === 2) {
                        this.playNoise(0.08, track.noiseVol, true);
                    }
                    if (step % 2 === 1) {
                        this.playNoise(0.03, track.noiseVol * 0.4, false);
                    }
                    step++;
                    setTimeout(playStep, track.tempo);
                };
                playStep();
            },
            stopBGM() { this.isPlayingBGM = false }
        };
        const resumeAudio = () => { AudioSys.init(); window.removeEventListener('click', resumeAudio); window.removeEventListener('touchstart', resumeAudio) };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && AudioSys.ctx) { if (AudioSys.ctx.state === 'suspended') AudioSys.ctx.resume() } });
