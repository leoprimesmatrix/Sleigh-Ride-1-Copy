
import { LevelConfig, PowerupType, DialogueLine } from './types.ts';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const GRAVITY = 0.5; // Slightly heavier feeling
export const JUMP_STRENGTH = -9;
export const FLIGHT_LIFT = -0.6;
export const BASE_SPEED = 7;

// Reindeer Physics Constants
export const MAX_STAMINA = 100;
export const JUMP_STAMINA_COST = 20;
export const BOOST_STAMINA_COST = 0.8; // Cost per frame for holding up
export const STAMINA_REGEN = 0.4; // Base regen
export const STAMINA_RECOVERY_THRESHOLD = 25; // Must reach this % to jump again if exhausted
export const LOW_STAMINA_PENALTY = 0.4; 

export const INITIAL_STABILITY = 100;
export const REQUIRED_WISHES = 80;

export const POWERUP_COLORS: Record<PowerupType, string> = {
  [PowerupType.SPEED]: '#ef4444',
  [PowerupType.SNOWBALLS]: '#06b6d4',
  [PowerupType.BLAST]: '#eab308',
  [PowerupType.HEALING]: '#22c55e',
  [PowerupType.LIFE]: '#ec4899',
};

export const LEVEL_THRESHOLDS = [0, 20, 45, 70, 90];

export const LEVELS: LevelConfig[] = [
  {
    name: "The Buried Road",
    description: "Snowstorms have covered the supply route.",
    missionObjective: "Blast obstacles to clear the path.",
    backgroundGradient: ['#1e293b', '#334155'], // Darker Slate
    obstacleSpeedMultiplier: 1.0,
    spawnRateMultiplier: 1.2,
    weatherIntensity: 1,
    weatherType: 'SNOWSTORM',
    stabilityDrainRate: 0.03
  },
  {
    name: "The Dark Metropolis",
    description: "The power grid has failed. Belief is dropping.",
    missionObjective: "Collect stabilizers to re-ignite the city.",
    backgroundGradient: ['#020617', '#172554'], // Midnight Blue
    obstacleSpeedMultiplier: 1.1,
    spawnRateMultiplier: 1.3,
    weatherIntensity: 0,
    weatherType: 'CLEAR',
    stabilityDrainRate: 0.05
  },
  {
    name: "Turbulent Skies",
    description: "Atmospheric instability detected.",
    missionObjective: "Maintain altitude. Watch Reindeer stamina.",
    backgroundGradient: ['#0f172a', '#475569'],
    obstacleSpeedMultiplier: 1.3,
    spawnRateMultiplier: 0.9,
    weatherIntensity: 3,
    weatherType: 'TURBULENCE',
    stabilityDrainRate: 0.04
  },
  {
    name: "The Split Path",
    description: "High winds ahead. Route integrity critical.",
    missionObjective: "Survive the wind corridor.",
    backgroundGradient: ['#1e1b4b', '#312e81'], // Indigo Storm
    obstacleSpeedMultiplier: 1.5,
    spawnRateMultiplier: 1.4,
    weatherIntensity: 5,
    weatherType: 'WIND_CORRIDOR',
    stabilityDrainRate: 0.06
  },
  {
    name: "Eye of the Storm",
    description: "The source of the anomaly.",
    missionObjective: "Deliver the final spark.",
    backgroundGradient: ['#450a0a', '#7f1d1d'], // Red warning sky
    obstacleSpeedMultiplier: 1.2,
    spawnRateMultiplier: 1.0,
    weatherIntensity: 8,
    weatherType: 'SNOWSTORM',
    stabilityDrainRate: 0.08
  }
];

export const TOTAL_GAME_TIME_SECONDS = 600; 
export const VICTORY_DISTANCE = 300000; 

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
    "The world has changed, old man. You're flying a relic in a digital age. Let the routes crumble. Efficiency dictates we abandon the outliers.",
    "Your 'magic' is just a resource I haven't optimized yet. Look at them—they don't look up anymore. They look at screens. I am the new belief.",
    "Go home, Santa. The storm isn't natural. It's apathy. You can't fix apathy with toys. You're fighting gravity itself."
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

  { progress: 0.50, dialogue: { id: 'act3_start', speaker: 'Rudolph', text: "I'm... getting tired, boss. The air is so heavy here." } },
  { progress: 0.55, dialogue: { id: 'act3_santa', speaker: 'Santa', text: "I know. Conserve your strength. Gliding now, power only when needed." } },

  { progress: 0.70, dialogue: { id: 'act4_start', speaker: 'Control', text: "CRITICAL ALERT: Wind Corridor detected. Brace for impact." } },
  { progress: 0.75, dialogue: { id: 'act4_santa', speaker: 'Santa', text: "Don't fight the wind! Ride it! Lean into the turn!" } },

  { progress: 0.90, dialogue: { id: 'act5_start', speaker: 'Rudolph', text: "The storm... it's breaking! I can see the dawn!" } },
  { progress: 0.95, dialogue: { id: 'act5_santa', speaker: 'Santa', text: "We held the line. Good work, everyone. Delivery complete." } }
];

export const LANDMARKS = [
    { progress: 0.22, type: 'POWER_PLANT', name: "Failing Power Grid" },
    { progress: 0.55, type: 'LIGHTHOUSE', name: "The Last Beacon" },
    { progress: 0.99, type: 'FINAL_HOUSE', name: "Central Hub" }
] as const;
