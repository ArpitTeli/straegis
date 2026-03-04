// ═══════════════════════════════════════════════════
//  STRAEGIS — data.js
//  All game constants, balance values, definitions
// ═══════════════════════════════════════════════════

const DATA = {

  // ── RESOURCES ──────────────────────────────────
  TASK_REWARD: { wood: 10, iron: 5 },
  WAVE_REWARD:  { wood: 20, iron: 15, medals: 1 },

  // ── BUILDINGS ──────────────────────────────────
  BUILDINGS: [
    {
      id: 'town_hall',
      name: 'Town Hall',
      icon: '🏰',
      desc: 'Heart of your village. Upgrade to unlock everything.',
      maxLevel: 5,
      costs: [
        null,
        { wood: 0,   iron: 0   }, // Level 1 = free (starts here)
        { wood: 80,  iron: 30  },
        { wood: 200, iron: 100 },
        { wood: 500, iron: 250 },
        { wood: 1000,iron: 600 },
      ],
      unlocks: ['barracks', 'wall'],
      color: 0xc8a84b,
      size: { w: 3, h: 3 },
      heightLevels: [0, 1.2, 1.8, 2.4, 3.0, 3.6],
    },
    {
      id: 'barracks',
      name: 'Barracks',
      icon: '⚔️',
      desc: 'Trains infantry. Higher level = better troops.',
      maxLevel: 3,
      costs: [
        null,
        { wood: 40,  iron: 10 },
        { wood: 120, iron: 50 },
        { wood: 300, iron: 150 },
      ],
      unlocks: [],
      color: 0x5a7a3a,
      size: { w: 2, h: 2 },
      heightLevels: [0, 0.8, 1.2, 1.6],
    },
    {
      id: 'armory',
      name: 'Armory',
      icon: '🛡️',
      desc: 'Unlocks heavy units. Requires Town Hall Lv2.',
      maxLevel: 3,
      requiresBuilding: { id: 'town_hall', level: 2 },
      costs: [
        null,
        { wood: 60,  iron: 30  },
        { wood: 180, iron: 90  },
        { wood: 450, iron: 220 },
      ],
      unlocks: [],
      color: 0x4a6080,
      size: { w: 2, h: 2 },
      heightLevels: [0, 0.8, 1.2, 1.6],
    },
    {
      id: 'wall',
      name: 'Wall',
      icon: '🧱',
      desc: 'Defensive perimeter. Enemy must breach before reaching village.',
      maxLevel: 4,
      costs: [
        null,
        { wood: 30,  iron: 5  },
        { wood: 80,  iron: 20 },
        { wood: 200, iron: 60 },
        { wood: 500, iron: 150 },
      ],
      unlocks: ['tower'],
      color: 0x8a7a60,
      size: { w: 1, h: 1 },
      isDefense: true,
      hpLevels: [0, 200, 400, 700, 1100],
    },
    {
      id: 'tower',
      name: 'Guard Tower',
      icon: '🗼',
      desc: 'Auto-fires during battles. Requires Wall Lv2.',
      maxLevel: 3,
      requiresBuilding: { id: 'wall', level: 2 },
      costs: [
        null,
        { wood: 50,  iron: 20  },
        { wood: 140, iron: 70  },
        { wood: 360, iron: 180 },
      ],
      unlocks: [],
      color: 0x7a6a50,
      isDefense: true,
      atkLevels: [0, 15, 30, 55],
      size: { w: 1, h: 2 },
    },
    {
      id: 'research_lab',
      name: 'Research Lab',
      icon: '🔬',
      desc: 'Enables unit upgrades. Requires Town Hall Lv3.',
      maxLevel: 3,
      requiresBuilding: { id: 'town_hall', level: 3 },
      costs: [
        null,
        { wood: 100, iron: 60  },
        { wood: 260, iron: 130 },
        { wood: 600, iron: 300 },
      ],
      unlocks: [],
      color: 0x3a6080,
      size: { w: 2, h: 2 },
      heightLevels: [0, 0.8, 1.2, 1.6],
    },
  ],

  // ── RESEARCH ───────────────────────────────────
  RESEARCH: [
    {
      id: 'infantry_atk',
      name: 'Infantry Weapons',
      icon: '🔫',
      desc: '+20% Infantry ATK per level',
      maxLevel: 3,
      requiresBuilding: { id: 'research_lab', level: 1 },
      costs: [
        null,
        { iron: 30,  medals: 1 },
        { iron: 80,  medals: 2 },
        { iron: 200, medals: 4 },
      ],
      effect: { stat: 'infantry_atk', perLevel: 0.20 },
    },
    {
      id: 'infantry_hp',
      name: 'Body Armor',
      icon: '🦺',
      desc: '+20% Infantry HP per level',
      maxLevel: 3,
      requiresBuilding: { id: 'research_lab', level: 1 },
      costs: [
        null,
        { iron: 30,  medals: 1 },
        { iron: 80,  medals: 2 },
        { iron: 200, medals: 4 },
      ],
      effect: { stat: 'infantry_hp', perLevel: 0.20 },
    },
    {
      id: 'heavy_unlock',
      name: 'Heavy Vehicles',
      icon: '🛡️',
      desc: 'Unlocks Tanks and Helicopters',
      maxLevel: 1,
      requiresBuilding: { id: 'armory', level: 2 },
      costs: [
        null,
        { iron: 150, medals: 3 },
      ],
      effect: { stat: 'heavy_unlock', perLevel: 1 },
    },
    {
      id: 'wall_repair',
      name: 'Wall Reinforcement',
      icon: '🧱',
      desc: '+25% Wall HP per level',
      maxLevel: 3,
      requiresBuilding: { id: 'research_lab', level: 2 },
      costs: [
        null,
        { iron: 50,  medals: 1 },
        { iron: 120, medals: 2 },
        { iron: 300, medals: 5 },
      ],
      effect: { stat: 'wall_hp', perLevel: 0.25 },
    },
  ],

  // ── UNITS ──────────────────────────────────────
  UNITS: [
    {
      id: 'infantry',
      name: 'Infantry',
      icon: '🪖',
      desc: 'Basic ground troops. Affordable in bulk.',
      cost: { wood: 5, iron: 2 },
      batchSize: 20,
      baseHp: 25,
      baseAtk: 6,
      speed: 1.8,
      color: 0x4a7a3a,
      radius: 0.18,
      requiresBuilding: { id: 'barracks', level: 1 },
    },
    {
      id: 'rifleman',
      name: 'Rifleman',
      icon: '🔫',
      desc: 'Elite infantry. More HP and damage.',
      cost: { wood: 12, iron: 8 },
      batchSize: 10,
      baseHp: 50,
      baseAtk: 16,
      speed: 1.6,
      color: 0x3a5a2a,
      radius: 0.20,
      requiresBuilding: { id: 'barracks', level: 2 },
    },
    {
      id: 'special_forces',
      name: 'Special Forces',
      icon: '🎯',
      desc: 'High damage precision unit.',
      cost: { wood: 20, iron: 15 },
      batchSize: 5,
      baseHp: 80,
      baseAtk: 35,
      speed: 2.0,
      color: 0x2a4a1a,
      radius: 0.22,
      requiresBuilding: { id: 'barracks', level: 3 },
    },
    {
      id: 'humvee',
      name: 'Humvee',
      icon: '🚙',
      desc: 'Fast armored vehicle.',
      cost: { wood: 30, iron: 20 },
      batchSize: 3,
      baseHp: 120,
      baseAtk: 28,
      speed: 2.8,
      color: 0x5a6a3a,
      radius: 0.35,
      requiresBuilding: { id: 'armory', level: 1 },
    },
    {
      id: 'tank',
      name: 'Tank',
      icon: '🛡️',
      desc: 'Heavy armor. Slow but devastating.',
      cost: { wood: 60, iron: 50 },
      batchSize: 1,
      baseHp: 400,
      baseAtk: 80,
      speed: 1.0,
      color: 0x4a5a2a,
      radius: 0.50,
      requiresResearch: 'heavy_unlock',
      requiresBuilding: { id: 'armory', level: 2 },
    },
    {
      id: 'helicopter',
      name: 'Helicopter',
      icon: '🚁',
      desc: 'Air unit. Ignores walls, high AoE damage.',
      cost: { wood: 80, iron: 70 },
      batchSize: 1,
      baseHp: 200,
      baseAtk: 100,
      speed: 3.5,
      color: 0x3a4a6a,
      radius: 0.45,
      isAir: true,
      requiresResearch: 'heavy_unlock',
      requiresBuilding: { id: 'armory', level: 3 },
    },
  ],

  // ── ENEMY WAVES ────────────────────────────────
  getEnemyWave(waveNumber) {
    const scale = Math.pow(1.18, waveNumber - 1);
    const base = 60 * scale;

    if (waveNumber <= 2) {
      return [
        { type: 'grunt',  count: Math.floor(30 * scale), hp: 20 * scale, atk: 4 * scale,  speed: 1.4, color: 0x8a2a1a, radius: 0.18, fromRight: false },
        { type: 'grunt',  count: Math.floor(15 * scale), hp: 20 * scale, atk: 4 * scale,  speed: 1.4, color: 0x8a2a1a, radius: 0.18, fromRight: true  },
      ];
    } else if (waveNumber <= 5) {
      return [
        { type: 'grunt',  count: Math.floor(40 * scale), hp: 22 * scale, atk: 5 * scale,  speed: 1.5, color: 0x8a2a1a, radius: 0.18, fromRight: false },
        { type: 'brute',  count: Math.floor(10 * scale), hp: 60 * scale, atk: 12 * scale, speed: 1.0, color: 0x6a1a0a, radius: 0.28, fromRight: false },
        { type: 'grunt',  count: Math.floor(20 * scale), hp: 22 * scale, atk: 5 * scale,  speed: 1.5, color: 0x8a2a1a, radius: 0.18, fromRight: true  },
        { type: 'brute',  count: Math.floor(5  * scale), hp: 60 * scale, atk: 12 * scale, speed: 1.0, color: 0x6a1a0a, radius: 0.28, fromRight: true  },
      ];
    } else {
      return [
        { type: 'grunt',  count: Math.floor(60 * scale), hp: 25 * scale, atk: 6 * scale,  speed: 1.6, color: 0x8a2a1a, radius: 0.18, fromRight: false },
        { type: 'brute',  count: Math.floor(15 * scale), hp: 80 * scale, atk: 15 * scale, speed: 1.0, color: 0x6a1a0a, radius: 0.28, fromRight: false },
        { type: 'vehicle',count: Math.floor(5  * scale), hp: 200* scale, atk: 30 * scale, speed: 1.8, color: 0x5a1a0a, radius: 0.40, fromRight: false },
        { type: 'grunt',  count: Math.floor(40 * scale), hp: 25 * scale, atk: 6 * scale,  speed: 1.6, color: 0x8a2a1a, radius: 0.18, fromRight: true  },
        { type: 'brute',  count: Math.floor(10 * scale), hp: 80 * scale, atk: 15 * scale, speed: 1.0, color: 0x6a1a0a, radius: 0.28, fromRight: true  },
        { type: 'vehicle',count: Math.floor(3  * scale), hp: 200* scale, atk: 30 * scale, speed: 1.8, color: 0x5a1a0a, radius: 0.40, fromRight: true  },
      ];
    }
  },

  // ── TERRAIN ────────────────────────────────────
  TERRAIN: {
    gridSize: 40,        // tiles
    tileSize: 1.0,       // world units per tile
    villageRadius: 6,    // tiles from center reserved for village
    wallRadius: 10,      // wall ring position
    grassColor: 0x2d4a1e,
    dirtColor:  0x5a4a30,
    pathColor:  0x7a6a4a,
  },

};
