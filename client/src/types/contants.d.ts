export interface Constants {
    CONTAINER: {
      EQUIPMENT: number;
      DEPOT: number;
      KEYRING: number;
    };
    CHANNEL: {
      DEFAULT: number;
      WORLD: number;
      TRADE: number;
      HELP: number;
    };
    MONSTER: {
      RAT: number;
    };
    PROTOCOL: {
      CLIENT: {
        LATENCY: number;
        LOGOUT: number;
        MOVE: number;
        CONTAINER_CLOSE: number;
        TURN: number;
        OUTFIT: number;
        TARGET: number;
        CAST_SPELL: number;
        CHANNEL_MESSAGE: number;
        CHANNEL_JOIN: number;
        CHANNEL_LEAVE: number;
        CHANNEL_PRIVATE_MESSAGE: number;
        THING_MOVE: number;
        THING_USE_WITH: number;
        THING_USE: number;
        THING_LOOK: number;
        FRIEND_REMOVE: number;
        FRIEND_ADD: number;
        BUY_OFFER: number;
        OPEN_KEYRING: number;
        CLIENT_USE_TILE: number;
        TARGET_CANCEL: number;
        REMOVE_FRIEND: number;
        ADD_FRIEND: number;
      };
      SERVER: {
        LATENCY: number;
        ITEM_ADD: number;
        ITEM_REMOVE: number;
        CHUNK: number;
        MESSAGE_CANCEL: number;
        MESSAGE_SERVER: number;
        MESSAGE_PRIVATE: number;
        CREATURE_MESSAGE: number;
        CREATURE_MOVE: number;
        CREATURE_REMOVE: number;
        CREATURE_TELEPORT: number;
        CREATURE_STATE: number;
        CREATURE_SAY: number;
        CREATURE_INFORMATION: number;
        CONTAINER_OPEN: number;
        CONTAINER_CLOSE: number;
        CONTAINER_ADD: number;
        CONTAINER_REMOVE: number;
        STATE_SERVER: number;
        STATE_PLAYER: number;
        MAGIC_EFFECT: number;
        DISTANCE_EFFECT: number;
        PLAYER_LOGIN: number;
        PLAYER_LOGOUT: number;
        OUTFIT: number;
        ITEM_INFORMATION: number;
        ITEM_TEXT: number;
        ITEM_TRANSFORM: number;
        TRADE_OFFER: number;
        WORLD_TIME: number;
        COMBAT_LOCK: number;
        SERVER_ERROR: number;
        EMOTE: number;
        TOGGLE_CONDITION: number;
        TARGET: number;
        SPELL_ADD: number;
        SPELL_CAST: number;
        SPELL_REMOVE: number;
        CREATURE_PROPERTY: number;
        REMOVE_FRIEND: number;
        PLAYER_STATISTICS: number;
        CHANNEL_JOIN: number;
      };
    };
    DIRECTION: {
      NORTH: number;
      EAST: number;
      SOUTH: number;
      WEST: number;
      SOUTHEAST: number;
      SOUTHWEST: number;
      NORTHEAST: number;
      NORTHWEST: number;
    };
    TYPES: {
      PLAYER: number;
      MONSTER: number;
      NPC: number;
    };
    ROLES: {
      NONE: number;
      TUTOR: number;
      SENIOR_TUTOR: number;
      GAMEMASTER: number;
      GOD: number;
    };
    FLUID: {
      NONE: number;
      WATER: number;
      BLOOD: number;
      BEER: number;
      SLIME: number;
      LEMONADE: number;
      MILK: number;
      MANA: number;
      WATER2: number;
      HEALTH: number;
      OIL: number;
      SLIME2: number;
      URINE: number;
      COCONUTMILK: number;
      WINE: number;
      MUD: number;
      FRUITJUICE: number;
      LAVA: number;
      RUM: number;
    };
    EQUIPMENT: {
      HELMET: number;
      ARMOR: number;
      LEGS: number;
      BOOTS: number;
      RIGHT: number;
      LEFT: number;
      BACKPACK: number;
      NECKLACE: number;
      RING: number;
      QUIVER: number;
    };
    VOCATION: {
      NONE: number;
      KNIGHT: number;
      PALADIN: number;
      SORCERER: number;
      DRUID: number;
      ELITE_KNIGHT: number;
      ROYAL_PALADIN: number;
      MASTER_SORCERER: number;
      ELDER_DRUID: number;
    };
    PROPERTIES: {
      NAME: number;         // 0
      HEALTH: number;       // 1
      HEALTH_MAX: number;   // 2
      MANA: number;         // 3
      MANA_MAX: number;     // 4
      CAPACITY: number;     // 5
      CAPACITY_MAX: number; // 6
      ATTACK: number;       // 7
      ATTACK_SPEED: number; // 9
      DEFENSE: number;      // 8
      SPEED: number;        // 10
      OUTFIT: number;       // 11
      DIRECTION: number;    // 12
      ROLE: number;         // 13
      SEX: number;          // 14
      VOCATION: number;     // 15
      MOUNTS: number;       // 16
      OUTFITS: number;      // 17
      MAGIC: number;        // 18
      FIST: number;         // 19
      CLUB: number;         // 20
      SWORD: number;        // 21
      AXE: number;          // 22
      DISTANCE: number;     // 23
      SHIELDING: number;    // 24
      FISHING: number;      // 25
      EXPERIENCE: number;   // 26
      ENERGY: number;       // 27
      ENERGY_MAX: number;   // 28
    };
    SEX: {
      MALE: number;
      FEMALE: number;
    };
    COLOR: {
      BLUE: number;
      LIGHTGREEN: number;
      LIGHTBLUE: number;
      MAYABLUE: number;
      DARKRED: number;
      LIGHTGREY: number;
      SKYBLUE: number;
      PURPLE: number;
      RED: number;
      ORANGE: number;
      YELLOW: number;
      WHITE: number;
    };
    CONDITION: {
      DRUNK: number;
      POISONED: number;
      BURNING: number;
      ELECTRIFIED: number;
      INVISIBLE: number;
      PROTECTION_ZONE: number;
      SUPPRESS_DRUNK: number;
      LIGHT: number;
      HEALING: number;
      REGENERATION: number;
      MORPH: number;
      MAGIC_SHIELD: number;
      MAGIC_FLAME: number;
      SATED: number;
      HASTE: number;
      ARENA: number;
    };
    BLOODTYPE: {
      BLOOD: number;
      POISON: number;
      NONE: number;
    };
    LOOKTYPES: {
      CREATURE: {
        ORC_WARLORD: number;
        WAR_WOLF: number;
        ORC_RIDER: number;
        ORC: number;
        ORC_SHAMAN: number;
        ORC_WARRIOR: number;
        ORC_BERSERKER: number;
        NECROMANCER: number;
        BUTTERFLY: number;
        BLACK_SHEEP: number;
        SHEEP: number;
        TROLL: number;
        BEAR: number;
        BONELORD: number;
        GHOUL: number;
        SLIME: number;
        QUARA_PREDATOR: number;
        RAT: number;
        CYCLOPS: number;
        MINOTAUR_MAGE: number;
        MINOTAUR_ARCHER: number;
        MINOTAUR: number;
        ROTWORM: number;
        WOLF: number;
        SNAKE: number;
        MINOTAUR_GUARD: number;
        SPIDER: number;
        DEER: number;
        DOG: number;
        SKELETON: number;
        DRAGON: number;
        POISON_SPIDER: number;
        DEMON_SKELETON: number;
        GIANT_SPIDER: number;
        DRAGON_LORD: number;
        FIRE_DEVIL: number;
        LION: number;
        "POLAR BEAR": number;
        SCORPION: number;
        WASP: number;
        BUG: number;
        GHOST: number;
        FIRE_ELEMENTAL: number;
        ORC_SPEARMAN: number;
        GREEN_DJINN: number;
        WINTER_WOLF: number;
        FROST_TROLL: number;
        WITCH: number;
        BEHEMOTH: number;
        "CAVE RAT": number;
        MONK: number;
        PRIESTESS: number;
        ORC_LEADER: number;
        PIG: number;
        GOBLIN: number;
        ELF: number;
        ELF_ARCANIST: number;
        ELF_SCOUT: number;
        MUMMY: number;
        DWARF_GEOMANCER: number;
        STONE_GOLEM: number;
        VAMPIRE: number;
        DWARF: number;
        DWARF_GUARD: number;
        DWARF_SOLDIER: number;
        HERO: number;
        RABBIT: number;
        SWAMP_TROLL: number;
        BANSHEE: number;
        ANCIENT_SCARAB: number;
        "BLUE DJINN": number;
        COBRA: number;
        LARVA: number;
        SCARAB: number;
        PHARAOH: number;
        PHARAOH_PELERYNA: number;
        MIMIC: number;
        PIRATE_MARAUDER: number;
        HYAENA: number;
        GARGOYLE: number;
        PIRATE_CUTTHROAT: number;
        PIRATE_BUCCANEER: number;
        PIRATE_CORSAIR: number;
        LICH: number;
        CRYPT_SHAMBLER: number;
        BONEBEAST: number;
        DEATHSLICER: number;
        EFREET: number;
        MARID: number;
        BADGER: number;
        SKUNK: number;
        DEMON: number;
        ELDER_BONELORD: number;
        GAZER: number;
        YETI: number;
      };
      MALE: {
        CITIZEN: number;
        HUNTER: number;
        MAGE: number;
        KNIGHT: number;
        NOBLEMAN: number;
        SUMMONER: number;
        WARRIOR: number;
      };
      FEMALE: {
        CITIZEN: number;
        HUNTER: number;
        MAGE: number;
        KNIGHT: number;
        NOBLEMAN: number;
        SUMMONER: number;
        WARRIOR: number;
      };
      OTHER: {
        GAMEMASTER: number;
        ELF: number;
        DWARF: number;
      };
    };
    EFFECT: {
      MAGIC: {
        DRAWBLOOD: number;
        LOSEENERGY: number;
        POFF: number;
        BLOCKHIT: number;
        EXPLOSIONAREA: number;
        EXPLOSIONHIT: number;
        FIREAREA: number;
        YELLOW_RINGS: number;
        GREEN_RINGS: number;
        HITAREA: number;
        TELEPORT: number;
        ENERGYHIT: number;
        MAGIC_BLUE: number;
        MAGIC_RED: number;
        MAGIC_GREEN: number;
        HITBYFIRE: number;
        HITBYPOISON: number;
        MORTAREA: number;
        SOUND_GREEN: number;
        SOUND_RED: number;
        POISONAREA: number;
        SOUND_YELLOW: number;
        SOUND_PURPLE: number;
        SOUND_BLUE: number;
        SOUND_WHITE: number;
      };
      PROJECTILE: {
        SPEAR: number;
        BOLT: number;
        ARROW: number;
        FIRE: number;
        ENERGY: number;
        POISONARROW: number;
        BURSTARROW: number;
        THROWINGSTAR: number;
        THROWINGKNIFE: number;
        SMALLSTONE: number;
        DEATH: number;
        LARGEROCK: number;
        SNOWBALL: number;
        POWERBOLT: number;
        POISON: number;
      };
    };
  }
  