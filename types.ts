
export enum GameState {
  MENU,
  HELP,
  INTRO,
  PLAYING,
  GAME_OVER,
  VICTORY,
  BAD_ENDING,
  LEVEL_TRANSITION, // Earth zoom effect
  LEVEL_COMPLETE, // New state for intermediate levels
  CLIFFHANGER // New state for the scripted crash event
}

export enum GameMode {
  STORY,
  ENDLESS
}

export enum PowerupType {
  SPEED = 'SPEED',
  SNOWBALLS = 'SNOWBALLS',
  BLAST = 'BLAST',
  HEALING = 'HEALING', // Restores Stamina/Stability now
  LIFE = 'LIFE'
}

export interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  vy: number;
  lives: number;
  snowballs: number;
  isInvincible: boolean;
  invincibleTimer: number;
  healingTimer: number; // Used for stability regen buff
  speedTimer: number;
  angle: number;
  stamina: number;
  maxStamina: number;
  trail: {x: number, y: number, alpha: number}[]; // Visual trail
}

export interface Obstacle extends Entity {
  type: 'TREE' | 'BIRD' | 'SNOWMAN' | 'BUILDING' | 'CLOUD' | 'ICE_SPIKE' | 'DARK_GARLAND';
  rotation?: number;
  isDestructible: boolean;
}

export interface Landmark extends Entity {
  type: 'HOSPITAL' | 'ORPHANAGE' | 'LIGHTHOUSE' | 'CLOCK_TOWER' | 'FINAL_HOUSE' | 'POWER_PLANT';
  name: string;
}

export interface Powerup extends Entity {
  type: PowerupType;
  floatOffset: number;
}

export type LetterVariant = 'NORMAL' | 'GOLDEN' | 'SAD' | 'VILLAIN' | 'STABILIZER';

export interface Letter extends Entity {
  message: string;
  floatOffset: number;
  variant: LetterVariant;
}

export interface Projectile extends Entity {
  vx: number;
  trail: {x: number, y: number}[];
}

export enum ParticleType {
  SNOW,
  SPARKLE,
  DEBRIS,
  SMOKE,
  GLOW,
  SHOCKWAVE,
  FIRE,
  LIFE,
  DUST,
  TRAIL
}

export interface Particle {
  id: number;
  type: ParticleType;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
  growth: number;
}

export type MissionType = 'SURVIVE' | 'DESTROY_OBSTACLES' | 'COLLECT_WISHES' | 'MAINTAIN_SPEED' | 'LOW_ALTITUDE';

export interface LevelConfig {
  name: string;
  description: string;
  missionObjective: string;
  missionType: MissionType;
  missionTarget: number; // e.g. 5 obstacles, 10 seconds
  backgroundGradient: [string, string];
  groundPalette: [string, string, string]; // Far, Mid, Near colors
  terrainType: 'MOUNTAINS' | 'CITY' | 'SPIKES' | 'HILLS';
  ambientLight: string; // CSS color for overlay tint
  obstacleSpeedMultiplier: number;
  spawnRateMultiplier: number;
  weatherIntensity: number;
  weatherType: 'CLEAR' | 'SNOWSTORM' | 'WIND_CORRIDOR' | 'TURBULENCE';
  stabilityDrainRate: number;
}

export interface BackgroundLayer {
  points: number[]; // For mountains/hills
  blocks: {x: number, w: number, h: number}[]; // For city
  color: string;
  speedModifier: number;
  offset: number;
}

export interface DialogueLine {
  id: string;
  speaker: 'Santa' | 'Rudolph' | 'Control';
  text: string;
}
