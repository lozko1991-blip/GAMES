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
        reactionDelay: 0.12,
        diveSpeed: 9.6,
        predictionError: 0.15,
        mistakeChance: 0.02
    },
    LEGEND: {
        name: 'LEGEND',
        reactionDelay: 0.01,
        diveSpeed: 13.5,
        predictionError: 0.01,
        mistakeChance: 0.00
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
        name: 'ЧС 2026: Брітіш Колумбія (Ванкувер)',
        subtitle: 'Аматор',
        goalsToAdvance: 4,
        playerName: 'Мбаппе',
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
        name: 'ЧС 2026: Естадіо Ацтека (Мехіко)',
        subtitle: 'Професіонал',
        goalsToAdvance: 4,
        playerName: 'Лозко',
        keeperName: 'Куртуа',
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
        name: 'ЧС 2026: Метлайф Стедіум (Нью-Йорк)',
        subtitle: 'Еліта',
        goalsToAdvance: 5,
        playerName: 'Роналду',
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
        name: 'Фінал ЧС 2026: Лос-Анджелес Стедіум',
        subtitle: 'Легенда',
        goalsToAdvance: 5,
        playerName: 'Мессі',
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
const safeStorageInMemory = {};
const safeStorage = {
    getItem(key) {
        try {
            const val = localStorage.getItem(key);
            if (val !== null) return val;
            return safeStorageInMemory[key] !== undefined ? safeStorageInMemory[key] : null;
        } catch (e) {
            return safeStorageInMemory[key] !== undefined ? safeStorageInMemory[key] : null;
        }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {}
        safeStorageInMemory[key] = String(value);
    }
};

/*
====================================================
SHOP PRESETS
====================================================
*/
const SHOP_ITEMS = {
    balls: [
        { id: 'classic', name: 'Класичний', price: 0, color: '#ffffff', glowColor: null, effect: null },
        { id: 'fire', name: 'Вогняний', price: 200, color: '#ff6600', glowColor: '#ff2200', effect: 'fire' },
        { id: 'neon', name: 'Неоновий', price: 350, color: '#39ff14', glowColor: '#39ff14', effect: 'neon' },
        { id: 'gold', name: 'Золотий', price: 600, color: '#ffd700', glowColor: '#ffaa00', effect: 'gold' },
        { id: 'ice', name: 'Крижаний', price: 400, color: '#00d2ff', glowColor: '#00d2ff', effect: 'ice' }
    ],
    boots: [
        { id: 'black', name: 'Чорні класичні', price: 0, color: '#111111' },
        { id: 'neon_green', name: 'Салатові неонові', price: 150, color: '#39ff14' },
        { id: 'cyan', name: 'Бірюзові', price: 250, color: '#00ffff' },
        { id: 'gold_boots', name: 'Золоті бутси', price: 500, color: '#ffd700' }
    ],
    caps: [
        { id: 'none', name: 'Без кепки', price: 0, color: 'transparent', type: 'none' },
        { id: 'cap_forward', name: 'Кепка вперед', price: 120, color: '#ff3366', type: 'forward' },
        { id: 'cap_backward', name: 'Кепка назад', price: 180, color: '#3366ff', type: 'backward' },
        { id: 'crown', name: 'Корона Монарха', price: 800, color: '#ffd700', type: 'crown' }
    ],
    kits: [
        { id: 'default', name: 'Клубні кольори', price: 0, jersey: 'club', shorts: 'club', socks: 'club' },
        { id: 'retro', name: 'Ретро Класика', price: 200, jersey: '#ffffff', shorts: '#111111', socks: '#111111' },
        { id: 'neon_kit', name: 'Кібер-Неон', price: 350, jersey: '#39ff14', shorts: '#111111', socks: '#39ff14' },
        { id: 'gold_kit', name: 'Золота Еліта', price: 650, jersey: '#ffd700', shorts: '#ffd700', socks: '#ffd700' }
    ],
    goals: [
        { id: 'default', name: 'Стандартні ворота', price: 0, postColor: '#ffffff', netColor: 'rgba(255,255,255,0.4)', glowColor: null },
        { id: 'neon_net', name: 'Неонова сітка', price: 250, postColor: '#ffffff', netColor: 'rgba(57,255,20,0.7)', glowColor: '#39ff14' },
        { id: 'gold_posts', name: 'Золотий каркас', price: 550, postColor: '#ffd700', netColor: 'rgba(255,255,255,0.45)', glowColor: '#ffaa00' }
    ],
    stadiums: [
        { id: 'default', name: 'Шкільний Двір', price: 0, altitude: 100, weather: 'sunny', skyTop: '#020208', skyMid: '#0d0722', skyBot: '#2c0b40', stadiumColor: '#281a4b', grassA: '#1e4620', grassB: '#153216' },
        { id: 'azteca', name: 'Естадіо Ацтека (Мехіко)', price: 300, altitude: 2240, weather: 'sunny', skyTop: '#0a0500', skyMid: '#180d00', skyBot: '#3d1900', stadiumColor: '#2a1200', grassA: '#2e5c18', grassB: '#1e3d0e' },
        { id: 'san_siro', name: 'Сан-Сіро (Мілан)', price: 450, altitude: 120, weather: 'foggy', skyTop: '#0d131a', skyMid: '#1a2633', skyBot: '#26394d', stadiumColor: '#1d2731', grassA: '#1f3e1f', grassB: '#142914' },
        { id: 'wembley', name: 'Вемблі (Лондон)', price: 600, altitude: 30, weather: 'windy', skyTop: '#0c1a24', skyMid: '#162e3d', skyBot: '#22465e', stadiumColor: '#163143', grassA: '#275225', grassB: '#1a3719' }
    ]
};

const CLUB_PRESETS = [
    { id: 'real', name: 'Реал Мадрид', logo: '👑', color: '#ffffff', shortColor: '#ffffff', sockColor: '#ffffff', requiredPrestige: 1000, transferFee: 1500, coinMultiplier: 2.5 },
    { id: 'barca', name: 'Барселона', logo: '🛡️', color: '#a50044', shortColor: '#004d98', sockColor: '#a50044', requiredPrestige: 800, transferFee: 1200, coinMultiplier: 2.2 },
    { id: 'city', name: 'Манчестер Сіті', logo: '⚓', color: '#6cabdd', shortColor: '#ffffff', sockColor: '#6cabdd', requiredPrestige: 750, transferFee: 1100, coinMultiplier: 2.1 },
    { id: 'psg', name: 'ПСЖ', logo: '🗼', color: '#004170', shortColor: '#004170', sockColor: '#e30613', requiredPrestige: 600, transferFee: 850, coinMultiplier: 1.8 },
    { id: 'bayern', name: 'Баварія', logo: '🔴', color: '#dc052d', shortColor: '#ffffff', sockColor: '#dc052d', requiredPrestige: 500, transferFee: 700, coinMultiplier: 1.7 },
    { id: 'arsenal', name: 'Арсенал', logo: '🛡️', color: '#ef0107', shortColor: '#ffffff', sockColor: '#ffffff', requiredPrestige: 400, transferFee: 550, coinMultiplier: 1.5 },
    { id: 'liverpool', name: 'Ліверпуль', logo: '🦁', color: '#c8102e', shortColor: '#c8102e', sockColor: '#c8102e', requiredPrestige: 350, transferFee: 500, coinMultiplier: 1.4 },
    { id: 'juventus', name: 'Ювентус', logo: '🦓', color: '#111111', shortColor: '#ffffff', sockColor: '#111111', requiredPrestige: 250, transferFee: 350, coinMultiplier: 1.3 },
    { id: 'milan', name: 'Мілан', logo: '👿', color: '#e31b23', shortColor: '#111111', sockColor: '#111111', requiredPrestige: 150, transferFee: 200, coinMultiplier: 1.2 },
    { id: 'polissya', name: 'Полісся Житомир', logo: '🐺', color: '#008000', shortColor: '#ffffff', sockColor: '#008000', requiredPrestige: 0, transferFee: 0, coinMultiplier: 1.0 }
];

const CARD_DATABASE = [
    // Bronze (GK or Outfield)
    { id: 'c_palazhchenko', name: 'Палажченко', rating: 74, rarity: 'bronze', pos: 'GK', logo: '🦢', pac: 58, sho: 32, pas: 60, dri: 52, def: 74, phy: 70, price: 100 },
    { id: 'c_mudryk', name: 'Мудрик', rating: 78, rarity: 'bronze', pos: 'LW', logo: '🦁', pac: 92, sho: 70, pas: 68, dri: 79, def: 35, phy: 62, price: 150 },
    { id: 'c_zinchenko', name: 'Зінченко', rating: 80, rarity: 'bronze', pos: 'LB', logo: '🛡️', pac: 72, sho: 66, pas: 81, dri: 80, def: 77, phy: 68, price: 200 },
    
    // Silver
    { id: 'c_courtois', name: 'Куртуа', rating: 89, rarity: 'silver', pos: 'GK', logo: '👑', pac: 48, sho: 15, pas: 55, dri: 48, def: 89, phy: 80, price: 350 },
    { id: 'c_bellingham', name: 'Беллінгем', rating: 88, rarity: 'silver', pos: 'CM', logo: '👑', pac: 80, sho: 84, pas: 83, dri: 88, def: 79, phy: 88, price: 400 },
    { id: 'c_lewandowski', name: 'Левандовскі', rating: 89, rarity: 'silver', pos: 'ST', logo: '🔴', pac: 75, sho: 91, pas: 72, dri: 86, def: 42, phy: 83, price: 450 },
    
    // Gold
    { id: 'c_mbappe', name: 'Мбаппе', rating: 92, rarity: 'gold', pos: 'ST', logo: '🗼', pac: 97, sho: 90, pas: 80, dri: 92, def: 36, phy: 78, price: 700 },
    { id: 'c_haaland', name: 'Холанд', rating: 91, rarity: 'gold', pos: 'ST', logo: '⚓', pac: 89, sho: 93, pas: 66, dri: 80, def: 45, phy: 88, price: 750 },
    { id: 'c_vinicius', name: 'Вінісіус', rating: 90, rarity: 'gold', pos: 'LW', logo: '👑', pac: 95, sho: 82, pas: 78, dri: 91, def: 29, phy: 68, price: 800 },

    // Legendary
    { id: 'c_messi', name: 'Мессі', rating: 97, rarity: 'legendary', pos: 'ST', logo: '🐐', pac: 92, sho: 96, pas: 98, dri: 99, def: 38, phy: 68, price: 1200 },
    { id: 'c_ronaldo', name: 'Роналду', rating: 96, rarity: 'legendary', pos: 'ST', logo: '🇵🇹', pac: 94, sho: 98, pas: 84, dri: 92, def: 35, phy: 84, price: 1300 },
    { id: 'c_lozko', name: 'Лозко', rating: 99, rarity: 'legendary', pos: 'ST', logo: '🏆', pac: 99, sho: 99, pas: 99, dri: 99, def: 88, phy: 95, price: 1500 }
];
