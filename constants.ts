
import { LevelConfig, PowerupType, DialogueLine } from './types.ts';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const GRAVITY = 0.5; 
export const JUMP_STRENGTH = -9;
export const FLIGHT_LIFT = -0.6;
export const BASE_SPEED = 7;

// Reindeer Physics Constants (Rebalanced)
export const MAX_STAMINA = 200; 
export const JUMP_STAMINA_COST = 10; 
export const BOOST_STAMINA_COST = 0; 
export const STAMINA_REGEN_GROUND = 2.0; 
export const STAMINA_REGEN_AIR = 0.3; 
export const STAMINA_RECOVERY_THRESHOLD = 15; 
export const LOW_STAMINA_PENALTY = 0.6; 

export const INITIAL_STABILITY = 100;
export const REQUIRED_WISHES = 10; // Reduced for shorter levels

export const POWERUP_COLORS: Record<PowerupType, string> = {
  [PowerupType.SPEED]: '#ef4444',
  [PowerupType.SNOWBALLS]: '#06b6d4',
  [PowerupType.BLAST]: '#eab308',
  [PowerupType.HEALING]: '#22c55e',
  [PowerupType.LIFE]: '#ec4899',
};

export const LEVEL_THRESHOLDS = [0, 20, 40, 60, 80]; // Used for Endless mode scaling

export const LEVELS: LevelConfig[] = [
  {
    name: "The Buried Road",
    description: "Snowstorms have covered the supply route.",
    missionObjective: "Destroy 5 Ice Obstacles.",
    missionType: 'DESTROY_OBSTACLES',
    missionTarget: 5,
    backgroundGradient: ['#1e293b', '#334155'], // Slate Sky
    groundPalette: ['#475569', '#64748b', '#94a3b8'], // Icy Greys
    terrainType: 'MOUNTAINS',
    ambientLight: 'rgba(165, 243, 252, 0.1)', 
    obstacleSpeedMultiplier: 1.0,
    spawnRateMultiplier: 1.5, // Increased spawn for destruction targets
    weatherIntensity: 2,
    weatherType: 'SNOWSTORM',
    stabilityDrainRate: 0.03
  },
  {
    name: "The Dark Metropolis",
    description: "The power grid has failed. Belief is dropping.",
    missionObjective: "Collect 3 Data Packets (Letters).",
    missionType: 'COLLECT_WISHES',
    missionTarget: 3,
    backgroundGradient: ['#020617', '#172554'], // Midnight Blue
    groundPalette: ['#0f172a', '#1e293b', '#334155'], // Dark Buildings
    terrainType: 'CITY',
    ambientLight: 'rgba(30, 27, 75, 0.2)', 
    obstacleSpeedMultiplier: 1.1,
    spawnRateMultiplier: 1.2,
    weatherIntensity: 0,
    weatherType: 'CLEAR',
    stabilityDrainRate: 0.05
  },
  {
    name: "Turbulent Skies",
    description: "Atmospheric instability detected.",
    missionObjective: "Fly Low (Below 50% Height) for 15s.",
    missionType: 'LOW_ALTITUDE',
    missionTarget: 15,
    backgroundGradient: ['#0f172a', '#475569'], // Stormy
    groundPalette: ['#1e1b4b', '#312e81', '#4338ca'], // Deep Indigos
    terrainType: 'HILLS',
    ambientLight: 'rgba(76, 29, 149, 0.15)', 
    obstacleSpeedMultiplier: 1.3,
    spawnRateMultiplier: 0.9,
    weatherIntensity: 3,
    weatherType: 'TURBULENCE',
    stabilityDrainRate: 0.04
  },
  {
    name: "The Glacial Spikes",
    description: "High winds ahead. Route integrity critical.",
    missionObjective: "Maintain High Speed for 10s.",
    missionType: 'MAINTAIN_SPEED',
    missionTarget: 10,
    backgroundGradient: ['#082f49', '#0ea5e9'], // Cyan/Blue
    groundPalette: ['#164e63', '#155e75', '#0891b2'], // Sharp Ice
    terrainType: 'SPIKES',
    ambientLight: 'rgba(6, 182, 212, 0.15)', 
    obstacleSpeedMultiplier: 1.5,
    spawnRateMultiplier: 1.3,
    weatherIntensity: 5,
    weatherType: 'WIND_CORRIDOR',
    stabilityDrainRate: 0.06
  },
  {
    name: "Eye of the Storm",
    description: "The source of the anomaly.",
    missionObjective: "Survive the final approach.",
    missionType: 'SURVIVE',
    missionTarget: 1, // Just finish
    backgroundGradient: ['#450a0a', '#991b1b'], // Red warning sky
    groundPalette: ['#450a0a', '#7f1d1d', '#b91c1c'], // Red Tinted Ground
    terrainType: 'MOUNTAINS',
    ambientLight: 'rgba(127, 29, 29, 0.2)', 
    obstacleSpeedMultiplier: 1.2,
    spawnRateMultiplier: 1.0,
    weatherIntensity: 8,
    weatherType: 'SNOWSTORM',
    stabilityDrainRate: 0.08
  }
];

export const TOTAL_GAME_TIME_SECONDS = 300; 
export const VICTORY_DISTANCE = 25000; 

export const WISHES = [
  "I hope things go back to normal.",
  "Is anyone listening?",
  "The lights went out...",
  "We're trying to stay warm.",
  "I wish for a sign.",
  "Don't give up on us.",
  "The storm is so loud.",
  "I still believe... barely."
];

export const SAD_WISHES = [
  "Route collapsing.",
  "Signal lost.",
  "Too much static.",
  "Connection failed.",
  "We are drifting.",
  "No answer.",
  "Fading out.",
  "Darkness."
];

export const VILLAIN_MESSAGES = [
    "The world has changed, old man. You're flying a relic in a digital age.",
    "Your 'magic' is just a resource I haven't optimized yet.",
    "Go home, Santa. The storm isn't natural. It's apathy."
];

export const NARRATIVE_LETTERS = [
    { progress: 0.15, message: "System Alert: North Route destabilizing. Reinforce immediately." },
    { progress: 0.50, message: "The grid is down, but I saw a red light in the sky... is it him?" },
    { progress: 0.85, message: "Reindeer vitals dropping. Hold the line, Santa. We are almost through." }
];

export const STORY_MOMENTS: { progress: number; dialogue: DialogueLine }[] = [
  { progress: 0.01, dialogue: { id: 'act1_start', speaker: 'Rudolph', text: "The wind is different this year, Santa. It fights back." } },
  { progress: 0.05, dialogue: { id: 'act1_santa', speaker: 'Santa', text: "Steady, old friend. The world is changing, and we must change with it." } },
  
  { progress: 0.20, dialogue: { id: 'act2_start', speaker: 'Control', text: "WARNING: Route Integrity at 40%. City Grid Offline." } },
  { progress: 0.22, dialogue: { id: 'act2_santa', speaker: 'Santa', text: "We need those stabilizers! Fly low, aim for the power nodes!" } },

  { progress: 0.40, dialogue: { id: 'act3_start', speaker: 'Rudolph', text: "I'm... getting tired, boss. The air is so heavy here." } },
  { progress: 0.45, dialogue: { id: 'act3_santa', speaker: 'Santa', text: "I know. Conserve your strength. Gliding now, power only when needed." } },

  { progress: 0.60, dialogue: { id: 'act4_start', speaker: 'Control', text: "CRITICAL ALERT: Wind Corridor detected. Brace for impact." } },
  { progress: 0.65, dialogue: { id: 'act4_santa', speaker: 'Santa', text: "Don't fight the wind! Ride it! Lean into the turn!" } },

  { progress: 0.80, dialogue: { id: 'act5_start', speaker: 'Rudolph', text: "The storm... it's breaking! I can see the dawn!" } },
  { progress: 0.85, dialogue: { id: 'act5_santa', speaker: 'Santa', text: "We held the line. Good work, everyone. Delivery complete." } }
];

export const LANDMARKS = [
    { progress: 0.22, type: 'POWER_PLANT', name: "Failing Power Grid" },
    { progress: 0.42, type: 'CLOCK_TOWER', name: "Midnight Clock" },
    { progress: 0.65, type: 'LIGHTHOUSE', name: "The Last Beacon" },
    { progress: 0.99, type: 'FINAL_HOUSE', name: "Central Hub" }
] as const;
