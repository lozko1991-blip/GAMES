/*********************************************************************
CONFIG & CONSTANTS
*********************************************************************/
const PHYSICS_GRAVITY = 9.81; // м/с^2
const PHYSICS_AIR_DENSITY = 1.225; // кг/м^3
const BALL_MASS = 0.43; // кг
const BALL_RADIUS = 0.11; // метри (стандартний м'яч розміру 5)
const BALL_CROSS_SECTION = Math.PI * BALL_RADIUS * BALL_RADIUS;
const BALL_DRAG_COEFFICIENT = 0.25; // аеродинамічний опір
const BALL_MAGNUS_COEFFICIENT = 0.16; // коефіцієнт підкрутки

// Розміри воріт
const GOAL_WIDTH = 7.32; // метри
const GOAL_HEIGHT = 2.44; // метри
const GOAL_POST_RADIUS = 0.06; // товщина штанги (метри)
const GOAL_DEPTH = 1.5; // глибина сітки (метри)
const TARGET_RADIUS = 0.35; // радіус мішені у кутах воріт

// Позиції
const PENALTY_SPOT_Z = 11.0; // відстань пенальті до воріт в метрах

// Рівні складності
const DIFFICULTY_PRESETS = {
    EASY: {
        name: 'EASY',
        reactionDelay: 0.5,
        diveSpeed: 4.8,
        predictionError: 1.2,
        mistakeChance: 0.30
    },
    MEDIUM: {
        name: 'MEDIUM',
        reactionDelay: 0.32,
        diveSpeed: 6.5,
        predictionError: 0.55,
        mistakeChance: 0.12
    },
    HARD: {
        name: 'HARD',
        reactionDelay: 0.20,
        diveSpeed: 8.2,
        predictionError: 0.25,
        mistakeChance: 0.05
    },
    LEGEND: {
        name: 'LEGEND',
        reactionDelay: 0.06,
        diveSpeed: 10.5,
        predictionError: 0.05,
        mistakeChance: 0.02
    }
};

/*
====================================================
LEVEL PRESETS
5 рівнів гри, кожен з унікальними:
- Персонажами (імена, кольори форми)
- Картою (небо, трава, освітлення)
- Складністю воротаря
====================================================
*/
const LEVEL_PRESETS = [
    {
        id: 1,
        name: 'Шкільний Двір',
        subtitle: 'Початківець',
        goalsToAdvance: 3, // скільки голів для переходу на наступний рівень
        playerName: 'Лозко',
        keeperName: 'Палажченко',
        playerJersey: '#e53935',
        playerShorts: '#ffffff',
        playerSocks: '#e53935',
        keeperJersey: '#ffee58',
        keeperShorts: '#212121',
        keeperSocks: '#ffee58',
        skinColor: '#ffdbac',
        skyTop: '#020208',
        skyMid: '#0d0722',
        skyBot: '#2c0b40',
        stadiumColor: '#281a4b',
        lightColor1: 'rgba(0, 255, 204, 0.7)',
        lightColor2: 'rgba(0, 255, 204, 0.15)',
        grassA: '#1e4620',
        grassB: '#153216',
        postColor: '#e0e0e0',
        difficulty: 'EASY'
    },
    {
        id: 2,
        name: 'Міський Стадіон',
        subtitle: 'Аматор',
        goalsToAdvance: 4,
        playerName: 'Лозко',
        keeperName: 'Палажченко',
        playerJersey: '#1565c0',
        playerShorts: '#ffffff',
        playerSocks: '#1565c0',
        keeperJersey: '#ff6f00',
        keeperShorts: '#111111',
        keeperSocks: '#ff6f00',
        skinColor: '#c68642',
        skyTop: '#000d1a',
        skyMid: '#001a33',
        skyBot: '#002244',
        stadiumColor: '#003366',
        lightColor1: 'rgba(100, 180, 255, 0.8)',
        lightColor2: 'rgba(50, 120, 255, 0.2)',
        grassA: '#1a4a1e',
        grassB: '#0f2e12',
        postColor: '#b0bec5',
        difficulty: 'EASY'
    },
    {
        id: 3,
        name: 'Національна Ліга',
        subtitle: 'Професіонал',
        goalsToAdvance: 4,
        playerName: 'Лозко',
        keeperName: 'Палажченко',
        playerJersey: '#1b5e20',
        playerShorts: '#fff9c4',
        playerSocks: '#1b5e20',
        keeperJersey: '#880e4f',
        keeperShorts: '#fce4ec',
        keeperSocks: '#880e4f',
        skinColor: '#8d5524',
        skyTop: '#0a0500',
        skyMid: '#180d00',
        skyBot: '#3d1900',
        stadiumColor: '#2a1200',
        lightColor1: 'rgba(255, 200, 50, 0.85)',
        lightColor2: 'rgba(255, 150, 0, 0.2)',
        grassA: '#2e5c18',
        grassB: '#1e3d0e',
        postColor: '#ffffff',
        difficulty: 'MEDIUM'
    },
    {
        id: 4,
        name: 'Європейська Ліга',
        subtitle: 'Еліта',
        goalsToAdvance: 5,
        playerName: 'Лозко',
        keeperName: 'Палажченко',
        playerJersey: '#4a148c',
        playerShorts: '#f3e5f5',
        playerSocks: '#7b1fa2',
        keeperJersey: '#004d40',
        keeperShorts: '#e0f2f1',
        keeperSocks: '#00695c',
        skinColor: '#fde3b7',
        skyTop: '#050012',
        skyMid: '#0a0028',
        skyBot: '#1a0050',
        stadiumColor: '#15003a',
        lightColor1: 'rgba(200, 100, 255, 0.9)',
        lightColor2: 'rgba(150, 50, 255, 0.25)',
        grassA: '#1a3a0a',
        grassB: '#0f2205',
        postColor: '#c0c0c0',
        difficulty: 'HARD'
    },
    {
        id: 5,
        name: 'Чемпіонат Світу',
        subtitle: 'Легенда',
        goalsToAdvance: 5,
        playerName: 'Лозко',
        keeperName: 'Палажченко',
        playerJersey: '#b8860b',
        playerShorts: '#fffde7',
        playerSocks: '#ffd700',
        keeperJersey: '#880000',
        keeperShorts: '#1a0000',
        keeperSocks: '#cc0000',
        skinColor: '#ffdbac',
        skyTop: '#000000',
        skyMid: '#050510',
        skyBot: '#0a0a30',
        stadiumColor: '#1a1a00',
        lightColor1: 'rgba(255, 215, 0, 0.95)',
        lightColor2: 'rgba(255, 180, 0, 0.3)',
        grassA: '#1b4a10',
        grassB: '#0e2e08',
        postColor: '#ffd700',
        difficulty: 'LEGEND'
    }
];

/*
====================================================
Helper object
safeStorage
====================================================
*/
const safeStorage = {
    getItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.warn('LocalStorage is blocked or disabled: ', e);
            return null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('LocalStorage is blocked or disabled: ', e);
        }
    }
};
