
import React, { useEffect, useRef, useState } from 'react';
import { 
  GameState, 
  Player, 
  Obstacle, 
  Powerup, 
  Letter,
  Projectile, 
  Particle, 
  ParticleType,
  PowerupType,
  Entity,
  BackgroundLayer,
  DialogueLine,
  GameMode,
  Landmark,
  LetterVariant
} from '../types.ts';
import { 
  CANVAS_HEIGHT, 
  GRAVITY, 
  JUMP_STRENGTH, 
  LEVELS, 
  LEVEL_THRESHOLDS, 
  POWERUP_COLORS,
  TOTAL_GAME_TIME_SECONDS,
  VICTORY_DISTANCE,
  BASE_SPEED,
  STORY_MOMENTS,
  LANDMARKS,
  NARRATIVE_LETTERS,
  MAX_STAMINA,
  JUMP_STAMINA_COST,
  STAMINA_REGEN_GROUND,
  STAMINA_REGEN_AIR,
  INITIAL_STABILITY,
  LOW_STAMINA_PENALTY,
  STAMINA_RECOVERY_THRESHOLD
} from '../constants.ts';
import UIOverlay from './UIOverlay.tsx';
import { soundManager } from '../audio.ts';
import { Bug, Eye, BatteryWarning, ChevronsRight, Heart, Snowflake } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onWin: () => void;
  gameMode: GameMode;
  startLevelIndex?: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onWin, gameMode, startLevelIndex = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [debugMenuOpen, setDebugMenuOpen] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(false);
  
  // Responsive Dimensions State
  const [dimensions, setDimensions] = useState({ w: 1200, h: 600, scale: 1, dpr: 1 });
  const logicalWidthRef = useRef(1200);

  const playerRef = useRef<Player>({
    id: 0, x: 150, y: 300, width: 90, height: 40, markedForDeletion: false,
    vy: 0, lives: 3, snowballs: 0, isInvincible: false, invincibleTimer: 0,
    healingTimer: 0, speedTimer: 0, angle: 0,
    stamina: MAX_STAMINA, maxStamina: MAX_STAMINA
  });
  
  const isExhaustedRef = useRef(false);

  const obstaclesRef = useRef<Obstacle[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const lettersRef = useRef<Letter[]>([]);
  const landmarksRef = useRef<Landmark[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  // Game System Refs
  const routeStabilityRef = useRef(INITIAL_STABILITY);
  
  const starsRef = useRef<{x:number, y:number, size:number, phase:number}[]>([]);
  const bgCloudsRef = useRef<{x:number, y:number, speed:number, scale:number, opacity: number}[]>([]);
  const flashTimerRef = useRef(0); 
  const pausedTimeRef = useRef(0); 

  const saturationRef = useRef(0.0);
  const isLightsOutRef = useRef(false);
  const isEndingSequenceRef = useRef(false);
  const joyRideModeRef = useRef(false);
  const joyRideTimerRef = useRef(0);
  const masterGiftDroppedRef = useRef(false);
  const wasOnGroundRef = useRef(false);
  const trailTimerRef = useRef(0);

  const collectedPowerupsRef = useRef<{ id: number; type: PowerupType }[]>([]);
  const wishesCollectedCountRef = useRef(0);
  const activeDialogueRef = useRef<DialogueLine | null>(null);
  const activeWishRef = useRef<{ message: string, variant: LetterVariant } | null>(null);
  const endingMusicTriggeredRef = useRef(false);
  const triggeredLandmarksRef = useRef<Set<string>>(new Set());
  const triggeredLettersRef = useRef<Set<string>>(new Set());
  const triggeredStoryMomentsRef = useRef<Set<string>>(new Set());
  
  const distanceRef = useRef(0);
  const scoreRef = useRef(0);
  const timeRef = useRef(TOTAL_GAME_TIME_SECONDS);
  const lastFrameTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const lastLevelIndexRef = useRef(-1);
  
  const bgLayersRef = useRef<BackgroundLayer[]>([
    { points: [], blocks: [], color: '', speedModifier: 0.1, offset: 0 }, // Far
    { points: [], blocks: [], color: '', speedModifier: 0.3, offset: 0 }, // Mid
    { points: [], blocks: [], color: '', speedModifier: 0.6, offset: 0 }, // Near
  ]);

  // Generators
  const generateTerrain = (baseHeight: number, roughness: number, width: number) => {
      const points = [];
      let y = baseHeight;
      // Generate enough points to cover the logical width plus buffer
      for (let i = 0; i <= width + 600; i += 50) {
          y += (Math.random() - 0.5) * roughness;
          y = Math.max(20, Math.min(y, baseHeight + 150)); 
          points.push(y);
      }
      return points;
  };

  const generateBlocks = (count: number, avgHeight: number) => {
      const blocks = [];
      for(let i=0; i<count; i++) {
          blocks.push({
              x: i * 80 + Math.random() * 20,
              w: 50 + Math.random() * 40,
              h: avgHeight + (Math.random() - 0.5) * 150
          });
      }
      return blocks;
  };

  // Handle Window Resize
  useEffect(() => {
    const handleResize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        // Calculate scale to fit vertical height (600px logical height)
        const scale = h / CANVAS_HEIGHT;
        // Logical width increases based on aspect ratio
        const logicalW = w / scale;
        
        setDimensions({ w, h, scale, dpr });
        logicalWidthRef.current = logicalW;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [hudState, setHudState] = useState({
    lives: 3,
    snowballs: 0,
    progress: 0,
    timeLeft: TOTAL_GAME_TIME_SECONDS,
    levelIndex: startLevelIndex, // FIX: Initialize with passed startLevelIndex
    score: 0,
    activeSpeed: 0,
    activeHealing: 0,
    collectedPowerups: [] as { id: number; type: PowerupType }[],
    activeDialogue: null as DialogueLine | null,
    activeWish: null as { message: string, variant: LetterVariant } | null,
    wishesCollected: 0,
    stamina: MAX_STAMINA,
    stability: INITIAL_STABILITY
  });

  const handleJump = () => {
      const player = playerRef.current;
      if (isExhaustedRef.current) {
          player.vy = JUMP_STRENGTH * LOW_STAMINA_PENALTY;
          player.stamina = 0; 
          return;
      }
      if (player.stamina >= JUMP_STAMINA_COST) {
          player.vy = JUMP_STRENGTH;
          player.stamina -= JUMP_STAMINA_COST;
          soundManager.playJump();
          createParticles(player.x, player.y + 30, ParticleType.SMOKE, 5, '#cbd5e1');
      } else {
          isExhaustedRef.current = true;
          player.vy = JUMP_STRENGTH * 0.8;
          player.stamina = 0;
          soundManager.playTimeWarning();
      }
  };

  const shootSnowball = () => {
    if (playerRef.current.snowballs > 0) {
      playerRef.current.snowballs--;
      soundManager.playShoot();
      projectilesRef.current.push({
        id: Date.now(),
        x: playerRef.current.x + playerRef.current.width,
        y: playerRef.current.y + playerRef.current.height / 2,
        width: 14,
        height: 14,
        vx: 18,
        markedForDeletion: false,
        trail: []
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '~' || e.code === 'Backquote') {
          setDebugMenuOpen(prev => !prev);
          return;
      }
      if (gameState === GameState.MENU) soundManager.init();
      if (gameState !== GameState.PLAYING) return;
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !isEndingSequenceRef.current) handleJump();
      if ((e.code === 'KeyZ' || e.code === 'Enter') && !isEndingSequenceRef.current) shootSnowball();
    };
    
    const handleTouch = () => {
       if (gameState === GameState.MENU) soundManager.init();
       if (gameState !== GameState.PLAYING) return;
       if (!isEndingSequenceRef.current) handleJump();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [gameState]);

  useEffect(() => {
    soundManager.init(); 
    soundManager.reset(); 
    return () => {
        soundManager.stopEndingMusic();
        soundManager.stopBgm();
    };
  }, []);

  useEffect(() => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.INTRO) {
      soundManager.setSleighVolume(0);
      return;
    }

    let animationFrameId: number;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });

    if (!canvas || !ctx) return;

    const resetGame = () => {
      // FIX: In Story mode, level starts at 0 distance. Discrete levels.
      const initialDistance = (gameMode === GameMode.STORY) ? 0 : 0; 
      
      // Reset Player
      playerRef.current = {
        id: 0, x: 150, y: 300, width: 90, height: 40, markedForDeletion: false,
        vy: 0, lives: 3, snowballs: 3, isInvincible: false, invincibleTimer: 0,
        healingTimer: 0, speedTimer: 0, angle: 0,
        stamina: MAX_STAMINA, maxStamina: MAX_STAMINA
      };

      // Reset World Entities
      obstaclesRef.current = [];
      powerupsRef.current = [];
      lettersRef.current = [];
      landmarksRef.current = [];
      projectilesRef.current = [];
      particlesRef.current = [];
      collectedPowerupsRef.current = [];
      
      // Reset State
      wishesCollectedCountRef.current = 0;
      activeDialogueRef.current = null;
      activeWishRef.current = null;
      triggeredStoryMomentsRef.current.clear();
      triggeredLandmarksRef.current.clear();
      triggeredLettersRef.current.clear();
      endingMusicTriggeredRef.current = false;
      flashTimerRef.current = 0;
      pausedTimeRef.current = 0;
      isExhaustedRef.current = false;
      
      routeStabilityRef.current = INITIAL_STABILITY;
      distanceRef.current = initialDistance;
      scoreRef.current = 0;
      timeRef.current = TOTAL_GAME_TIME_SECONDS;
      shakeRef.current = 0;
      saturationRef.current = 1.0;
      isLightsOutRef.current = false;
      isEndingSequenceRef.current = false;
      joyRideModeRef.current = false;
      joyRideTimerRef.current = 0;
      masterGiftDroppedRef.current = false;
      wasOnGroundRef.current = false;
      lastLevelIndexRef.current = -1;
      
      const currentLogicalWidth = logicalWidthRef.current;
      bgLayersRef.current[0].points = generateTerrain(250, 100, currentLogicalWidth); 
      bgLayersRef.current[1].points = generateTerrain(150, 60, currentLogicalWidth);  
      bgLayersRef.current[2].points = generateTerrain(60, 30, currentLogicalWidth);
      bgLayersRef.current[0].blocks = generateBlocks(40, 300);
      bgLayersRef.current[1].blocks = generateBlocks(40, 200);
      bgLayersRef.current[2].blocks = generateBlocks(40, 100);
      
      starsRef.current = [];
      for (let i = 0; i < 150; i++) {
          starsRef.current.push({
              x: Math.random() * currentLogicalWidth,
              y: Math.random() * (CANVAS_HEIGHT / 1.5),
              size: Math.random() * 2,
              phase: Math.random() * Math.PI * 2
          });
      }
      bgCloudsRef.current = [];
      for (let i = 0; i < 10; i++) {
          bgCloudsRef.current.push({
              x: Math.random() * currentLogicalWidth,
              y: Math.random() * (CANVAS_HEIGHT / 3),
              speed: Math.random() * 20 + 5,
              scale: Math.random() * 1 + 0.5,
              opacity: Math.random() * 0.2 + 0.05
          });
      }

      soundManager.stopBgm();
    };

    if (gameState === GameState.INTRO || (gameState === GameState.PLAYING && (playerRef.current.lives <= 0 || routeStabilityRef.current <= 0))) {
        resetGame();
    }

    lastFrameTimeRef.current = performance.now();

    const render = (timestamp: number) => {
      if (pausedTimeRef.current > 0) {
          draw(ctx, pausedTimeRef.current);
          animationFrameId = requestAnimationFrame(render);
          return;
      }

      const dt = Math.min((timestamp - lastFrameTimeRef.current) / 1000, 0.1);
      lastFrameTimeRef.current = timestamp;

      update(dt, timestamp);
      draw(ctx, timestamp);

      if (gameState === GameState.INTRO) {
         animationFrameId = requestAnimationFrame(render);
         return;
      }

      if (playerRef.current.lives > 0 && routeStabilityRef.current > 0) {
          if (gameMode === GameMode.STORY && joyRideTimerRef.current < 0 && joyRideModeRef.current) {
          } else if (gameMode === GameMode.STORY && timeRef.current <= 0 && !isEndingSequenceRef.current) {
               setGameState(GameState.GAME_OVER);
          } else {
              animationFrameId = requestAnimationFrame(render);
          }
      } else {
          setGameState(GameState.GAME_OVER);
      }
    };

    const update = (dt: number, timestamp: number) => {
      const player = playerRef.current;
      const timeScale = dt * 60;
      const logicalWidth = logicalWidthRef.current;

      if (gameState === GameState.INTRO) {
          timeRef.current = TOTAL_GAME_TIME_SECONDS; 
          const hoverSpeed = BASE_SPEED * 0.5;
          soundManager.setSleighVolume(hoverSpeed);
          player.y = 300 + Math.sin(timestamp / 800) * 20;
          player.angle = Math.sin(timestamp / 800) * 0.1;
          bgCloudsRef.current.forEach(cloud => {
            cloud.x -= (cloud.speed + hoverSpeed * 0.1) * timeScale * 0.1;
            if (cloud.x < -150) { cloud.x = logicalWidth + 150; cloud.y = Math.random() * (CANVAS_HEIGHT / 2.5); }
          });
          return;
      }

      if (gameMode === GameMode.STORY && !joyRideModeRef.current) {
         timeRef.current -= dt;
      } else {
         if (!joyRideModeRef.current) timeRef.current = 999;
      }
      
      if (flashTimerRef.current > 0) flashTimerRef.current -= dt;
      
      const speedMultiplier = player.speedTimer > 0 ? 1.5 : 1.0;
      let progressRatio = distanceRef.current / VICTORY_DISTANCE;
      if (gameMode === GameMode.STORY) progressRatio = Math.min(1.02, progressRatio);

      // FIX: Level Index Calculation for Discrete Levels
      let levelIndex = 0;
      if (gameMode === GameMode.STORY) {
          // In Story Mode, we stay in the selected level.
          levelIndex = startLevelIndex;
      } else {
          // Endless mode logic
          let effectiveProgress = progressRatio * 100;
          if (progressRatio > 1) {
              effectiveProgress = (progressRatio % 1) * 100;
          }
          for (let i = LEVELS.length - 1; i >= 0; i--) {
            if (effectiveProgress >= LEVEL_THRESHOLDS[i]) {
              levelIndex = i;
              break;
            }
          }
      }
      
      // Update max reached level
      const maxReached = parseInt(localStorage.getItem('sleigh_ride_max_level') || '0');
      if (levelIndex > maxReached && gameMode === GameMode.ENDLESS) {
          localStorage.setItem('sleigh_ride_max_level', levelIndex.toString());
      }

      const level = LEVELS[levelIndex];

      if (!isEndingSequenceRef.current) {
          routeStabilityRef.current -= level.stabilityDrainRate * timeScale;
          if (routeStabilityRef.current <= 0) routeStabilityRef.current = 0;
      }

      // Physics
      const isOnGround = player.y >= CANVAS_HEIGHT - 55 - player.height;
      if (isOnGround) {
          if (!wasOnGroundRef.current) {
               createParticles(player.x + 20, player.y + player.height, ParticleType.DUST, 15, '#cbd5e1');
          }
          wasOnGroundRef.current = true;
          player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN_GROUND * timeScale); 
      } else {
          wasOnGroundRef.current = false;
          if (player.vy > 0) {
               player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN_AIR * timeScale);
          }
      }
      if (isExhaustedRef.current) {
          if (player.stamina >= STAMINA_RECOVERY_THRESHOLD) {
              isExhaustedRef.current = false;
          }
      }

      const currentSpeedFrame = (BASE_SPEED + (Math.min(progressRatio, 3.0) * 6)); 
      let currentSpeed = isEndingSequenceRef.current ? currentSpeedFrame * 0.5 : currentSpeedFrame * speedMultiplier; 
      
      if (!isEndingSequenceRef.current) {
        starsRef.current.forEach(star => {
            star.x -= currentSpeed * 0.02 * timeScale;
            if (star.x < 0) star.x += logicalWidth;
        });
      }

      let weatherX = 0;
      let weatherY = 0;
      if (level.weatherType === 'WIND_CORRIDOR') {
          weatherX = -0.15; 
          weatherY = (Math.random() - 0.5) * 0.3; 
      } else if (level.weatherType === 'SNOWSTORM') {
          weatherX = -0.1;
      } else if (level.weatherType === 'TURBULENCE') {
           weatherY = (Math.sin(timestamp / 150) * 0.8);
      }
      
      // Ending / Level Complete Trigger
      if (gameMode === GameMode.STORY && progressRatio >= 0.90 && !endingMusicTriggeredRef.current) {
          if (wishesCollectedCountRef.current >= 0) { 
             endingMusicTriggeredRef.current = true;
             soundManager.playEndingMusic(0, 5);
          }
      }
      if (gameMode === GameMode.STORY && progressRatio >= 0.99 && !isEndingSequenceRef.current) {
          isEndingSequenceRef.current = true;
          player.isInvincible = true;
      }

      if (isEndingSequenceRef.current) {
          soundManager.setSleighVolume(0);
          if (joyRideModeRef.current) {
              currentSpeed = BASE_SPEED * 3;
              joyRideTimerRef.current -= dt;
              player.y = 250 + Math.sin(timestamp / 400) * 80;
              player.angle = Math.sin(timestamp / 400) * 0.2;
              
              if (joyRideTimerRef.current <= 0) {
                   // LEVEL COMPLETE LOGIC
                   const isLastLevel = levelIndex === LEVELS.length - 1;
                   if (gameMode === GameMode.STORY) {
                       if (isLastLevel) {
                           setGameState(GameState.VICTORY);
                       } else {
                           setGameState(GameState.LEVEL_COMPLETE);
                       }
                   } else {
                       // Endless mode logic
                       setGameState(GameState.VICTORY); 
                   }
                   onWin(); // This updates progress
              }
          } else {
              player.vy = 0;
              player.y += (200 - player.y) * 0.05 * timeScale;
              
              // Only spawn Master Gift in Final House level (usually last level) or just trigger win directly
              // If it's the last level, look for landmark
              // If regular level, just fly off
              const isLastLevel = levelIndex === LEVELS.length - 1;
              
              if (isLastLevel) {
                 if (!masterGiftDroppedRef.current && landmarksRef.current.some(l => l.type === 'FINAL_HOUSE' && l.x < logicalWidth/2)) {
                      masterGiftDroppedRef.current = true;
                      createParticles(player.x, player.y, ParticleType.GLOW, 50, 'gold');
                      flashTimerRef.current = 2.0;
                      setTimeout(() => { joyRideModeRef.current = true; joyRideTimerRef.current = 5.0; }, 500);
                  }
              } else {
                  // Standard level completion
                   if (!masterGiftDroppedRef.current) {
                      masterGiftDroppedRef.current = true;
                      setTimeout(() => { joyRideModeRef.current = true; joyRideTimerRef.current = 2.0; }, 500);
                   }
              }
          }
      } else {
           soundManager.setSleighVolume(currentSpeed);
      }

      if (!joyRideModeRef.current || joyRideTimerRef.current > 2.0) {
         distanceRef.current += (currentSpeed + weatherX * 10) * timeScale;
         scoreRef.current += currentSpeed * 0.1 * timeScale;
      }

      if (levelIndex !== lastLevelIndexRef.current) {
          soundManager.playLevelBgm(levelIndex);
          lastLevelIndexRef.current = levelIndex;
      }

      if (level.name.includes("Dark")) {
          isLightsOutRef.current = true;
          saturationRef.current = 0.2;
      } else {
          isLightsOutRef.current = false;
          saturationRef.current = Math.min(1.0, saturationRef.current + 0.01);
      }

      trailTimerRef.current += dt;
      if (trailTimerRef.current > 0.1) {
          trailTimerRef.current = 0;
          createParticles(player.x, player.y + 20, ParticleType.TRAIL, 1, 'rgba(255,255,255,0.3)');
      }

      if (gameMode === GameMode.STORY) {
          STORY_MOMENTS.forEach(moment => {
            if (progressRatio >= moment.progress && !triggeredStoryMomentsRef.current.has(moment.dialogue.id)) {
              triggeredStoryMomentsRef.current.add(moment.dialogue.id);
              activeDialogueRef.current = moment.dialogue;
              setTimeout(() => { if (activeDialogueRef.current?.id === moment.dialogue.id) activeDialogueRef.current = null; }, 5000);
            }
          });
          LANDMARKS.forEach(lm => {
              if (progressRatio >= lm.progress && !triggeredLandmarksRef.current.has(lm.type)) {
                  triggeredLandmarksRef.current.add(lm.type);
                  const yPos = CANVAS_HEIGHT - 350; 
                  landmarksRef.current.push({
                      id: Date.now(), x: logicalWidth + 200, y: yPos, width: 250, height: 400,
                      markedForDeletion: false, type: lm.type, name: lm.name
                  });
              }
          });
          NARRATIVE_LETTERS.forEach(nl => {
              const key = `letter_${nl.progress}`;
              if (progressRatio >= nl.progress && !triggeredLettersRef.current.has(key)) {
                  triggeredLettersRef.current.add(key);
                  lettersRef.current.push({
                      id: Date.now(), x: logicalWidth + 100, y: Math.random() * (CANVAS_HEIGHT - 200) + 50,
                      width: 40, height: 30, floatOffset: 0, markedForDeletion: false,
                      message: nl.message, variant: 'STABILIZER'
                  });
              }
          });
      }

      if (!isEndingSequenceRef.current) {
          player.vy += (GRAVITY + weatherY) * timeScale;
          player.y += player.vy * timeScale;
          const targetAngle = Math.min(Math.max(player.vy * 0.05, -0.6), 0.6);
          player.angle += (targetAngle - player.angle) * 0.1 * timeScale;
      }
      
      if (player.y + player.height > CANVAS_HEIGHT - 50) { player.y = CANVAS_HEIGHT - 50 - player.height; player.vy = 0; }
      if (player.y < 0) { player.y = 0; player.vy = 0; }
      if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
      if (player.speedTimer > 0) player.speedTimer -= dt;
      if (player.healingTimer > 0) player.healingTimer -= dt;
      player.isInvincible = player.invincibleTimer > 0;

      bgCloudsRef.current.forEach(cloud => {
          cloud.x -= (cloud.speed + (currentSpeed * 0.1)) * timeScale * 0.1;
          if (cloud.x < -150) { cloud.x = logicalWidth + 150; cloud.y = Math.random() * (CANVAS_HEIGHT / 2.5); }
      });
      
      bgLayersRef.current.forEach((layer, index) => {
          layer.offset -= currentSpeed * layer.speedModifier * timeScale;
          if (layer.offset <= -50) {
              layer.offset += 50;
              layer.points.shift();
              
              const prevY = layer.points[layer.points.length - 1];
              let nextY = prevY + (Math.random() - 0.5) * (index === 0 ? 60 : 20);
              const maxHeight = index === 0 ? 350 : (index === 1 ? 200 : 100);
              const minHeight = index === 0 ? 150 : (index === 1 ? 50 : 20);
              nextY = Math.max(minHeight, Math.min(maxHeight, nextY));
              layer.points.push(nextY);

              if (layer.blocks.length > 0) {
                 const firstBlock = layer.blocks[0];
                 if (firstBlock.x + firstBlock.w + layer.offset < -200) {
                     layer.blocks.shift();
                     const lastBlock = layer.blocks[layer.blocks.length - 1];
                     const newX = lastBlock.x + lastBlock.w + 10;
                     const newH = 100 + Math.random() * 200;
                     layer.blocks.push({x: newX, w: 40 + Math.random() * 60, h: newH});
                 }
              }
          }
      });

      if (!isEndingSequenceRef.current && Math.random() < 0.015 * level.spawnRateMultiplier * timeScale) {
        let availableTypes: Obstacle['type'][] = ['TREE', 'BIRD'];
        if (level.weatherType === 'SNOWSTORM') availableTypes = ['SNOWMAN', 'CLOUD', 'ICE_SPIKE'];
        else if (level.name.includes("Dark")) availableTypes = ['BUILDING', 'DARK_GARLAND'];
        else if (level.weatherType === 'WIND_CORRIDOR') availableTypes = ['CLOUD', 'BIRD'];

        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const isDestructible = type === 'SNOWMAN' || type === 'ICE_SPIKE' || type === 'DARK_GARLAND';
        
        obstaclesRef.current.push({
          id: Date.now() + Math.random(),
          x: logicalWidth + 100,
          y: type === 'BIRD' || type === 'CLOUD' || type === 'DARK_GARLAND' ? Math.random() * (CANVAS_HEIGHT - 300) : CANVAS_HEIGHT - 80, 
          width: type === 'BUILDING' ? 100 : 60,
          height: type === 'BUILDING' ? 200 : 80,
          type: type,
          markedForDeletion: false,
          isDestructible,
          rotation: 0
        });
      }
      
      if (!isEndingSequenceRef.current && Math.random() < 0.004 * timeScale) {
          const pTypes = Object.values(PowerupType);
          const pType = pTypes[Math.floor(Math.random() * pTypes.length)];
          powerupsRef.current.push({
            id: Date.now() + Math.random(),
            x: logicalWidth + 100,
            y: Math.random() * (CANVAS_HEIGHT - 200) + 50,
            width: 40, height: 40, type: pType, floatOffset: Math.random() * Math.PI * 2, markedForDeletion: false
          });
      }

      obstaclesRef.current.forEach(obs => {
        obs.x -= currentSpeed * level.obstacleSpeedMultiplier * timeScale;
        if (obs.x + obs.width < -100) obs.markedForDeletion = true;
        
        if (!cinematicMode && !player.isInvincible && checkCollision(player, obs)) {
           if (gameMode === GameMode.STORY && levelIndex === 4) {
           } else {
               player.lives--;
               routeStabilityRef.current -= 15; 
               soundManager.playCrash();
               player.invincibleTimer = 2.0;
               shakeRef.current = 20;
               createParticles(player.x, player.y, ParticleType.DEBRIS, 20, '#ef4444');
               createExplosion(player.x + 40, player.y + 20);
           }
        }
      });
      
      powerupsRef.current.forEach(pup => {
        pup.x -= currentSpeed * timeScale;
        pup.floatOffset += 0.05 * timeScale;
        pup.y += Math.sin(pup.floatOffset) * 0.5 * timeScale;
        if (pup.x + pup.width < -50) pup.markedForDeletion = true;
        if (!cinematicMode && checkCollision(player, pup)) {
          pup.markedForDeletion = true;
          applyPowerup(pup.type);
          soundManager.playPowerup(pup.type);
          createParticles(pup.x, pup.y, ParticleType.SPARKLE, 20, POWERUP_COLORS[pup.type]);
          createParticles(pup.x, pup.y, ParticleType.GLOW, 10, POWERUP_COLORS[pup.type]);
          collectedPowerupsRef.current.push({ id: Date.now() + Math.random(), type: pup.type });
        }
      });

      lettersRef.current.forEach(letter => {
          letter.x -= currentSpeed * 0.8 * timeScale;
          letter.floatOffset += 0.03 * timeScale;
          letter.y += Math.sin(letter.floatOffset) * 1 * timeScale;
          if (letter.x + letter.width < -50) letter.markedForDeletion = true;
          if (!cinematicMode && checkCollision(player, letter)) {
              letter.markedForDeletion = true;
              soundManager.playCollectWish();
              createParticles(letter.x, letter.y, ParticleType.SPARKLE, 15, '#fbbf24');
              createParticles(letter.x, letter.y, ParticleType.GLOW, 5, 'gold');
              routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 5);
              wishesCollectedCountRef.current += 1;
              activeWishRef.current = { message: letter.message, variant: letter.variant };
              setTimeout(() => { if (activeWishRef.current?.message === letter.message) activeWishRef.current = null; }, 4000);
          }
      });
      
      projectilesRef.current.forEach(proj => {
        proj.x += proj.vx * timeScale;
        proj.trail.push({x: proj.x, y: proj.y});
        if (proj.trail.length > 10) proj.trail.shift();
        if (proj.x > logicalWidth) proj.markedForDeletion = true;
        
        obstaclesRef.current.forEach(obs => {
          if (!obs.markedForDeletion && checkCollision(proj, obs) && obs.isDestructible) {
            obs.markedForDeletion = true;
            proj.markedForDeletion = true;
            soundManager.playCrash();
            createParticles(obs.x + obs.width/2, obs.y + obs.height/2, ParticleType.DEBRIS, 10, '#fff');
            scoreRef.current += 50;
            routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 5); 
          }
        });
      });

      obstaclesRef.current = obstaclesRef.current.filter(e => !e.markedForDeletion);
      powerupsRef.current = powerupsRef.current.filter(e => !e.markedForDeletion);
      lettersRef.current = lettersRef.current.filter(e => !e.markedForDeletion);
      landmarksRef.current = landmarksRef.current.filter(e => !e.markedForDeletion);
      projectilesRef.current = projectilesRef.current.filter(e => !e.markedForDeletion);
      
      if (shakeRef.current > 0) shakeRef.current *= Math.pow(0.9, timeScale);

      if (Math.floor(timestamp / 100) > Math.floor((timestamp - dt * 1000) / 100)) {
        const newPowerups = collectedPowerupsRef.current;
        collectedPowerupsRef.current = []; 
        setHudState({
          lives: player.lives,
          snowballs: player.snowballs,
          progress: progressRatio * 100,
          timeLeft: timeRef.current,
          levelIndex,
          score: scoreRef.current,
          activeSpeed: player.speedTimer,
          activeHealing: player.healingTimer,
          collectedPowerups: newPowerups,
          activeDialogue: activeDialogueRef.current,
          activeWish: activeWishRef.current,
          wishesCollected: wishesCollectedCountRef.current,
          stamina: player.stamina,
          stability: routeStabilityRef.current
        });
      }
    };

    const draw = (ctx: CanvasRenderingContext2D, timestamp: number) => {
      const levelIndex = hudState.levelIndex;
      const level = LEVELS[levelIndex];
      const logicalWidth = logicalWidthRef.current;
      const { scale, dpr } = dimensions;

      // Clear & Setup Scaling with High DPI support
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.scale(scale * dpr, scale * dpr);

      // --- Background Rendering ---
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, level.backgroundGradient[0]);
      gradient.addColorStop(1, level.backgroundGradient[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, logicalWidth, CANVAS_HEIGHT);
      
      // Aurora Effect
      if (level.terrainType === 'MOUNTAINS' || level.terrainType === 'SPIKES' || level.terrainType === 'HILLS') {
         drawAurora(ctx, timestamp, logicalWidth, level.ambientLight);
      }
      
      // Distant Planet/Moon for added depth
      if (level.terrainType !== 'CITY') {
         drawMoon(ctx, logicalWidth);
      }

      drawStars(ctx, timestamp);

      // Draw Layers based on Terrain Type
      if (level.terrainType === 'CITY') {
          drawCityLayer(ctx, bgLayersRef.current[0], CANVAS_HEIGHT, level.groundPalette[0], timestamp, false, logicalWidth);
          drawCityLayer(ctx, bgLayersRef.current[1], CANVAS_HEIGHT, level.groundPalette[1], timestamp, false, logicalWidth);
      } else {
          drawMountainLayer(ctx, bgLayersRef.current[0], CANVAS_HEIGHT, level.groundPalette[0], timestamp, level.terrainType, false, logicalWidth);
          drawMountainLayer(ctx, bgLayersRef.current[1], CANVAS_HEIGHT, level.groundPalette[1], timestamp, level.terrainType, false, logicalWidth);
      }
      
      drawBgClouds(ctx);
      
      // --- World Transform & Shake ---
      ctx.save();
      const dx = (Math.random() - 0.5) * shakeRef.current;
      const dy = (Math.random() - 0.5) * shakeRef.current;
      ctx.translate(dx, dy);

      // --- Foreground ---
      if (level.terrainType === 'CITY') {
          drawCityLayer(ctx, bgLayersRef.current[2], CANVAS_HEIGHT, level.groundPalette[2], timestamp, true, logicalWidth);
      } else {
          drawMountainLayer(ctx, bgLayersRef.current[2], CANVAS_HEIGHT, level.groundPalette[2], timestamp, level.terrainType, true, logicalWidth);
      }

      if (!cinematicMode) {
          landmarksRef.current.forEach(lm => drawLandmark(ctx, lm, timestamp));
          powerupsRef.current.forEach(pup => drawPowerup(ctx, pup, timestamp));
          lettersRef.current.forEach(letter => drawLetter(ctx, letter));
          
          obstaclesRef.current.forEach(obs => drawObstacle(ctx, obs, timestamp));
          
          drawPlayer(ctx, playerRef.current, timestamp);
          
          ctx.fillStyle = "#e0f2fe"; ctx.shadowBlur = 10; ctx.shadowColor = "#bae6fd";
          projectilesRef.current.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(p.x, p.y, p.width, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fill();
          });
          ctx.shadowBlur = 0;
      }

      particlesRef.current.forEach(p => {
          updateAndDrawParticle(ctx, p, timestamp);
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // --- Weather Effects ---
      if (level.weatherType === 'SNOWSTORM' || level.weatherType === 'WIND_CORRIDOR') {
          drawBlizzard(ctx, timestamp, level.weatherIntensity, logicalWidth);
      }
      if (level.weatherType === 'WIND_CORRIDOR') {
          drawWindLines(ctx, timestamp, logicalWidth);
      }

      // --- Lighting Overlay ---
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = level.ambientLight;
      ctx.fillRect(-100, -100, logicalWidth + 200, CANVAS_HEIGHT + 200);
      
      // Vignette
      const rad = ctx.createRadialGradient(logicalWidth/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT/3, logicalWidth/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT);
      rad.addColorStop(0, 'rgba(0,0,0,0)');
      rad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = rad;
      ctx.globalCompositeOperation = 'source-over'; 
      ctx.fillRect(0,0, logicalWidth, CANVAS_HEIGHT);

      // Chromatic Aberration on Impact
      if (shakeRef.current > 5) {
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = "rgba(255, 0, 0, 0.2)";
          ctx.fillRect(5, 0, logicalWidth, CANVAS_HEIGHT);
          ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
          ctx.fillRect(-5, 0, logicalWidth, CANVAS_HEIGHT);
          ctx.globalCompositeOperation = 'source-over';
      }

      if (isLightsOutRef.current) {
         ctx.fillStyle = "rgba(0,0,0,0.5)";
         ctx.fillRect(0,0, logicalWidth, CANVAS_HEIGHT);
      }
      if (flashTimerRef.current > 0) {
         ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, flashTimerRef.current)})`;
         ctx.fillRect(0, 0, logicalWidth, CANVAS_HEIGHT);
      }
      
      ctx.restore();
      ctx.restore(); // Restore Scale
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, cinematicMode, gameMode, startLevelIndex, dimensions]);

  // --- Helper Logic ---
  const checkCollision = (rect1: Entity, rect2: Entity) => {
    const padding = 15; 
    return (
      rect1.x + padding < rect2.x + rect2.width - padding &&
      rect1.x + rect1.width - padding > rect2.x + padding &&
      rect1.y + padding < rect2.y + rect2.height - padding &&
      rect1.y + rect1.height - padding > rect2.y + padding
    );
  };

  const applyPowerup = (type: PowerupType) => {
    const player = playerRef.current;
    
    // Apply 10% stability boost for any collected gift/powerup
    routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 10);

    switch (type) {
      case PowerupType.SPEED: player.speedTimer = 7.0; break;
      case PowerupType.SNOWBALLS: player.snowballs += 5; break;
      case PowerupType.BLAST:
        flashTimerRef.current = 0.2; shakeRef.current = 30; 
        obstaclesRef.current = [];
        soundManager.playCrash();
        break;
      case PowerupType.HEALING: 
        player.healingTimer = 5.0; 
        player.stamina = MAX_STAMINA;
        isExhaustedRef.current = false;
        break;
      case PowerupType.LIFE: if (player.lives < 3) player.lives++; soundManager.playHeal(); break;
    }
  };

  const createParticles = (x: number, y: number, type: ParticleType, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      const speed = Math.random() * 5 + 2;
      const angle = Math.random() * Math.PI * 2;
      particlesRef.current.push({
        id: Math.random(), type, x, y,
        radius: Math.random() * 4 + 2,
        vx: Math.cos(angle) * speed,
        vy: type === ParticleType.DUST ? -Math.random() * 3 : Math.sin(angle) * speed,
        alpha: 1, color, life: Math.random() * 1 + 0.5, maxLife: 1.5, growth: 0
      });
    }
  };
  
  const createExplosion = (x: number, y: number) => {
      createParticles(x, y, ParticleType.SHOCKWAVE, 1, 'white');
      createParticles(x, y, ParticleType.FIRE, 15, '#f87171');
      createParticles(x, y, ParticleType.SMOKE, 10, '#334155');
      createParticles(x, y, ParticleType.GLOW, 5, '#fb923c');
  };

  const updateAndDrawParticle = (ctx: CanvasRenderingContext2D, p: Particle, timestamp: number) => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.016; p.alpha = p.life / p.maxLife; p.radius += p.growth * 0.016;
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      
      if (p.type === ParticleType.SHOCKWAVE) {
         ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.stroke();
      } else if (p.type === ParticleType.GLOW) {
         ctx.shadowBlur = 20; ctx.shadowColor = p.color; ctx.globalCompositeOperation = 'screen';
         ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI*2); ctx.fill();
         ctx.globalCompositeOperation = 'source-over';
      } else if (p.type === ParticleType.TRAIL) {
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
      } else {
         ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
  };

  // --- DRAWING FUNCTIONS ---

  const drawMoon = (ctx: CanvasRenderingContext2D, width: number) => {
     ctx.save();
     ctx.fillStyle = "#fefce8";
     ctx.shadowColor = "#fef08a"; ctx.shadowBlur = 40;
     ctx.beginPath(); ctx.arc(width - 150, 100, 60, 0, Math.PI*2); ctx.fill();
     ctx.restore();
  }
  
  const drawAurora = (ctx: CanvasRenderingContext2D, timestamp: number, width: number, ambientColor: string) => {
      ctx.save();
      const time = timestamp * 0.0005;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(0.5, ambientColor.replace('0.15', '0.4').replace('0.2', '0.5')); 
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "blur(30px)";
      ctx.globalAlpha = 0.6;
      
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT / 2);
      for (let x = 0; x <= width; x += 50) {
          const y = Math.sin(x * 0.005 + time) * 60 + Math.sin(x * 0.01 - time * 2) * 40 + (CANVAS_HEIGHT / 3);
          ctx.lineTo(x, y);
      }
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();
  };

  const drawStars = (ctx: CanvasRenderingContext2D, timestamp: number) => {
    ctx.fillStyle = "white";
    starsRef.current.forEach(star => {
       const flicker = Math.sin(timestamp * 0.003 + star.phase);
       ctx.globalAlpha = 0.4 + 0.6 * Math.abs(flicker);
       ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  };
  
  const drawBgClouds = (ctx: CanvasRenderingContext2D) => {
    bgCloudsRef.current.forEach(c => {
        ctx.fillStyle = `rgba(255,255,255,${c.opacity})`;
        ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.scale, c.scale);
        ctx.beginPath(); 
        ctx.arc(0,0, 40, 0, Math.PI*2); 
        ctx.arc(35, -10, 45, 0, Math.PI*2); 
        ctx.arc(70, 0, 40, 0, Math.PI*2);
        ctx.arc(35, 20, 30, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });
  };

  const drawMountainLayer = (
      ctx: CanvasRenderingContext2D, 
      layer: BackgroundLayer, 
      baseY: number, 
      color: string, 
      timestamp: number, 
      type: string, 
      isForeground: boolean = false,
      width: number
    ) => {
      ctx.fillStyle = color;
      ctx.beginPath(); 
      ctx.moveTo(0, CANVAS_HEIGHT);
      
      const segmentWidth = 50; 
      
      for (let i = 0; i < layer.points.length - 1; i++) {
          const x = (i * segmentWidth) + layer.offset; 
          const y = baseY - layer.points[i];
          if (x > width + 100) break; 
          if (i === 0) ctx.moveTo(x, y); 
          else ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width + 200, CANVAS_HEIGHT);
      ctx.lineTo(0, CANVAS_HEIGHT); 
      ctx.fill();

      // Better Snowcaps & Textures
      if (!isForeground) {
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.beginPath();
          for (let i = 0; i < layer.points.length - 1; i++) {
              const x = (i * segmentWidth) + layer.offset; 
              if (x > width + 100) break;
              const y = baseY - layer.points[i];
              
              // Only draw details if height suggests it's a peak
              if (layer.points[i] > 80) {
                  if (type === 'SPIKES') {
                     ctx.moveTo(x, y);
                     ctx.lineTo(x + 5, y + 80);
                     ctx.lineTo(x - 5, y + 80);
                     ctx.fill();
                  } else {
                     // Smoother snow cap
                     ctx.moveTo(x, y);
                     ctx.lineTo(x + 20, y + 40);
                     ctx.bezierCurveTo(x + 10, y + 50, x - 10, y + 50, x - 20, y + 40);
                     ctx.fill();
                  }
              }
          }
      }
  };

  const drawCityLayer = (
      ctx: CanvasRenderingContext2D, 
      layer: BackgroundLayer, 
      baseY: number, 
      color: string, 
      timestamp: number,
      isForeground: boolean = false,
      width: number
  ) => {
      ctx.fillStyle = color;
      if (!layer.blocks) return;

      layer.blocks.forEach((block, idx) => {
          const x = block.x + layer.offset;
          if (x > -100 && x < width) {
             const y = baseY - block.h;
             
             // Building Body
             ctx.fillRect(x, y, block.w, block.h);
             
             // Top Decoration (Spire or Roof)
             if (block.h > 150) {
                 ctx.fillRect(x + block.w/2 - 3, y - 25, 6, 25);
                 // Blinking light
                 if (!isForeground && Math.sin(timestamp / 300 + idx) > 0.5) {
                    ctx.fillStyle = "red";
                    ctx.beginPath(); ctx.arc(x + block.w/2, y - 25, 2, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = color;
                 }
             }

             // Windows with better pattern
             if (!isForeground) {
                 ctx.fillStyle = Math.sin(timestamp/500 + x) > 0 ? "rgba(255, 230, 100, 0.5)" : "rgba(255, 255, 255, 0.1)";
                 const winW = 4;
                 const winH = 6;
                 const gapX = 8;
                 const gapY = 12;
                 
                 // Draw windows only on taller buildings or if close
                 if (block.h > 80) {
                     for(let wx = x + 6; wx < x + block.w - 6; wx += gapX) {
                         for(let wy = y + 20; wy < baseY - 10; wy += gapY) {
                             if ((wx * wy + idx) % 5 !== 0) { // Randomize ON/OFF
                                 ctx.fillRect(wx, wy, winW, winH);
                             }
                         }
                     }
                 }
                 ctx.fillStyle = color; 
             }
          }
      });
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, timestamp: number) => {
    if (player.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) return;
    ctx.save(); 
    ctx.translate(player.x + player.width/2, player.y + player.height/2); 
    ctx.rotate(player.angle);
    const scale = 0.85;
    ctx.scale(scale, scale);

    // --- REINDEER (Front) ---
    const droop = isExhaustedRef.current ? 10 : 0;
    const legCycle = Math.sin(timestamp / 80) * 15;
    
    // Body
    ctx.fillStyle = "#8d6e63"; 
    ctx.beginPath(); ctx.ellipse(40, 0 + droop, 22, 12, 0, 0, Math.PI*2); ctx.fill(); 
    
    // Legs (Animated)
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#5d4037";
    // Front Legs
    ctx.beginPath(); ctx.moveTo(50, 5 + droop); ctx.lineTo(55 + legCycle, 25 + droop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, 5 + droop); ctx.lineTo(55 - legCycle, 25 + droop); ctx.stroke();
    // Back Legs
    ctx.beginPath(); ctx.moveTo(30, 5 + droop); ctx.lineTo(25 + legCycle, 25 + droop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, 5 + droop); ctx.lineTo(25 - legCycle, 25 + droop); ctx.stroke();

    // Head & Neck
    ctx.beginPath(); ctx.ellipse(62, -12 + droop, 12, 10, -0.3, 0, Math.PI*2); ctx.fill();
    // Antlers
    ctx.lineWidth = 2; ctx.strokeStyle = "#4e342e";
    ctx.beginPath(); ctx.moveTo(60, -20 + droop); ctx.lineTo(65, -35 + droop); ctx.lineTo(70, -40 + droop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60, -20 + droop); ctx.lineTo(55, -30 + droop); ctx.stroke();
    
    // Nose (Glowing Red)
    ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(72, -10 + droop, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    
    // Eye
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(65, -15 + droop, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "black"; ctx.beginPath(); ctx.arc(66, -15 + droop, 1, 0, Math.PI*2); ctx.fill();

    // Sweat drops if exhausted
    if (isExhaustedRef.current) {
        const dropY = (timestamp % 500) / 10;
        ctx.fillStyle = "#38bdf8"; 
        ctx.beginPath(); ctx.arc(50, -20 + dropY, 3, 0, Math.PI*2); ctx.fill();
    }

    // Harness
    ctx.strokeStyle = "#fcd34d"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, 0 + droop); ctx.lineTo(0, 0); ctx.stroke();

    // --- SLEIGH (Back) ---
    // Runners
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 4; 
    ctx.beginPath(); ctx.moveTo(-45, 25); ctx.lineTo(15, 25); ctx.bezierCurveTo(25, 20, 25, 5, 15, 5); ctx.stroke();
    // Sleigh Body
    const grad = ctx.createLinearGradient(0, -20, 0, 20); grad.addColorStop(0, "#b91c1c"); grad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = grad;
    ctx.beginPath(); 
    ctx.moveTo(-50, 15); 
    ctx.bezierCurveTo(-40, 30, 5, 30, 15, 15);
    ctx.lineTo(15, -10); 
    ctx.lineTo(-50, -10); 
    ctx.fill();
    
    // Gold Trim
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-50, -5); ctx.lineTo(15, -5); ctx.stroke();

    // Presents in Sleigh
    ctx.fillStyle = "#16a34a"; ctx.fillRect(-35, -20, 10, 10);
    ctx.fillStyle = "#2563eb"; ctx.fillRect(-25, -25, 12, 15);
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 1; ctx.strokeRect(-25, -25, 12, 15);

    // Santa
    // Body
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.ellipse(-10, -10, 12, 15, 0, 0, Math.PI*2); ctx.fill();
    // Head
    ctx.fillStyle = "#fca5a5"; ctx.beginPath(); ctx.arc(-10, -25, 9, 0, Math.PI*2); ctx.fill(); 
    // Beard
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(-10, -22, 10, 0, Math.PI); ctx.fill();
    // Hat
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(-20, -28); ctx.lineTo(-10, -45); ctx.lineTo(2, -28); ctx.fill();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(-10, -45, 3, 0, Math.PI*2); ctx.fill(); // Pom
    ctx.beginPath(); ctx.ellipse(-10, -28, 11, 3, 0, 0, Math.PI*2); ctx.fill(); // Brim
    // Scarf
    ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(-5, -18); ctx.quadraticCurveTo(-15, -15, -25 + Math.sin(timestamp/100)*3, -18); ctx.stroke();

    // Boost Aura
    if (player.speedTimer > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = "rgba(255, 200, 0, 0.4)";
        ctx.beginPath(); ctx.ellipse(10, 0, 90, 50, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, timestamp: number) => {
    ctx.save(); ctx.translate(obs.x, obs.y);
    
    if (obs.type === 'TREE') {
        const sway = Math.sin(timestamp / 400 + obs.id) * 0.05; ctx.rotate(sway);
        // Trunk
        ctx.fillStyle = "#3f2c22"; ctx.fillRect(obs.width/2 - 6, obs.height - 15, 12, 15);
        
        // Layers
        const layers = 3;
        const layerH = (obs.height - 15) / layers;
        for(let i=0; i<layers; i++) {
             const y = (layers - 1 - i) * layerH;
             const w = obs.width - (i * 10);
             
             // Green Foliage
             const grad = ctx.createLinearGradient(0, y-layerH, 0, y+layerH);
             grad.addColorStop(0, "#86efac");
             grad.addColorStop(1, "#15803d");
             ctx.fillStyle = grad;
             
             ctx.beginPath();
             ctx.moveTo(obs.width/2, y - layerH - 5);
             ctx.lineTo(obs.width/2 + w/2, y + layerH);
             ctx.lineTo(obs.width/2 - w/2, y + layerH);
             ctx.fill();

             // Snow
             ctx.fillStyle = "white";
             ctx.beginPath();
             ctx.moveTo(obs.width/2, y - layerH - 5);
             ctx.lineTo(obs.width/2 + 8, y - layerH + 8);
             ctx.bezierCurveTo(obs.width/2, y - layerH + 12, obs.width/2 - 5, y - layerH + 12, obs.width/2 - 8, y - layerH + 8);
             ctx.fill();
        }
    } 
    else if (obs.type === 'BUILDING') {
        // Dark Building Body
        ctx.fillStyle = "#0f172a"; 
        ctx.fillRect(0,0, obs.width, obs.height);
        
        // Depth side
        ctx.fillStyle = "#1e293b"; 
        ctx.beginPath(); ctx.moveTo(obs.width, 0); ctx.lineTo(obs.width+15, 15); ctx.lineTo(obs.width+15, obs.height+15); ctx.lineTo(obs.width, obs.height); ctx.fill();
        
        // Windows grid
        ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#f59e0b";
        const rows = Math.floor(obs.height / 30);
        const cols = Math.floor(obs.width / 20);
        
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                 // Randomize lit windows based on obs ID to keep it consistent per frame
                 const isLit = Math.sin(obs.id * r * c) > 0.3; 
                 if (isLit) {
                     ctx.shadowBlur = 5;
                     ctx.fillRect(10 + c*20, 10 + r*30, 12, 18);
                     ctx.shadowBlur = 0;
                 } else {
                     ctx.fillStyle = "#334155";
                     ctx.fillRect(10 + c*20, 10 + r*30, 12, 18);
                     ctx.fillStyle = "#fbbf24";
                 }
            }
        }
    } 
    else if (obs.type === 'SNOWMAN') {
        // Body
        const grad = ctx.createRadialGradient(obs.width/2, obs.height, 5, obs.width/2, obs.height/2, obs.width/2);
        grad.addColorStop(0, "white"); grad.addColorStop(1, "#cbd5e1");
        ctx.fillStyle = grad;
        
        // Bottom
        ctx.beginPath(); ctx.arc(obs.width/2, obs.height - 25, 25, 0, Math.PI*2); ctx.fill();
        // Middle
        ctx.beginPath(); ctx.arc(obs.width/2, obs.height - 60, 20, 0, Math.PI*2); ctx.fill();
        // Head
        ctx.beginPath(); ctx.arc(obs.width/2, obs.height - 90, 15, 0, Math.PI*2); ctx.fill();
        
        // Hat
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(obs.width/2 - 12, obs.height - 105, 24, 4); // Brim
        ctx.fillRect(obs.width/2 - 8, obs.height - 120, 16, 15); // Top
        
        // Carrot
        ctx.fillStyle = "orange";
        ctx.beginPath(); ctx.moveTo(obs.width/2, obs.height - 90); ctx.lineTo(obs.width/2 - 15, obs.height - 88); ctx.lineTo(obs.width/2, obs.height - 86); ctx.fill();
        
        // Arms
        ctx.strokeStyle = "#451a03"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(obs.width/2 + 15, obs.height - 60); ctx.lineTo(obs.width/2 + 35, obs.height - 70); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(obs.width/2 - 15, obs.height - 60); ctx.lineTo(obs.width/2 - 35, obs.height - 70); ctx.stroke();
    }
    else if (obs.type === 'ICE_SPIKE') {
        const grad = ctx.createLinearGradient(0,0,0, obs.height);
        grad.addColorStop(0, "rgba(255,255,255,0.9)"); grad.addColorStop(1, "rgba(165, 243, 252, 0.4)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, obs.height); ctx.lineTo(obs.width/2, 0); ctx.lineTo(obs.width, obs.height); ctx.fill();
        ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(obs.width/2, 0); ctx.lineTo(obs.width/2, obs.height); ctx.stroke();
    }
    else if (obs.type === 'DARK_GARLAND') {
        ctx.strokeStyle = "#374151"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(obs.width/2, obs.height, obs.width, 0); ctx.stroke();
        for(let i=0.15; i<0.9; i+=0.15) {
             const x = obs.width * i; const y = obs.height * 0.8;
             const isBroken = Math.random() > 0.5;
             ctx.fillStyle = isBroken ? "#1f2937" : (Math.random() > 0.5 ? "red" : "gray");
             ctx.beginPath(); ctx.arc(x, y + (i===0.45 ? 10 : 0), 5, 0, Math.PI*2); ctx.fill();
             if (!isBroken) { ctx.fillStyle="rgba(255,0,0,0.3)"; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI*2); ctx.fill(); }
        }
    }
    else if (obs.type === 'CLOUD') {
         ctx.fillStyle = "rgba(255,255,255, 0.9)"; 
         ctx.beginPath(); ctx.arc(20, 20, 25, 0, Math.PI*2); ctx.arc(50, 20, 30, 0, Math.PI*2); ctx.arc(80, 20, 20, 0, Math.PI*2); ctx.fill();
         ctx.fillStyle = "rgba(200,200,200, 0.3)";
         ctx.beginPath(); ctx.arc(50, 25, 25, 0, Math.PI*2); ctx.fill();
    }
    else if (obs.type === 'BIRD') {
        const flap = Math.sin(timestamp / 80 + obs.id) * 15;
        ctx.fillStyle = "#1e293b"; // Dark silhouette
        ctx.beginPath(); 
        // Body
        ctx.ellipse(20, 10, 15, 8, 0, 0, Math.PI*2); ctx.fill();
        // Wings
        ctx.beginPath(); ctx.moveTo(20, 10); ctx.lineTo(10, -10 + flap); ctx.lineTo(30, -10 + flap); ctx.fill();
    }
    ctx.restore();
  };

  const drawPowerup = (ctx: CanvasRenderingContext2D, pup: Powerup, timestamp: number) => {
      ctx.save(); ctx.translate(pup.x, pup.y);
      const scale = 1 + Math.sin(timestamp / 200) * 0.1;
      ctx.scale(scale, scale);
      
      const color = POWERUP_COLORS[pup.type];

      // Draw Gift Box
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 20;
      ctx.fillRect(0, 0, pup.width, pup.height);
      ctx.shadowBlur = 0;

      // Ribbon
      ctx.fillStyle = "white";
      ctx.fillRect(pup.width/2 - 5, 0, 10, pup.height); // Vertical
      ctx.fillRect(0, pup.height/2 - 5, pup.width, 10); // Horizontal

      // Bow
      ctx.beginPath();
      ctx.moveTo(pup.width/2, 0);
      ctx.bezierCurveTo(pup.width/2 - 10, -10, pup.width/2 - 20, 0, pup.width/2, 5);
      ctx.bezierCurveTo(pup.width/2 + 20, 0, pup.width/2 + 10, -10, pup.width/2, 0);
      ctx.fill();

      // Icon Overlay (Symbolic)
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let symbol = "?";
      if (pup.type === PowerupType.SPEED) symbol = "⚡";
      if (pup.type === PowerupType.HEALING) symbol = "+";
      if (pup.type === PowerupType.SNOWBALLS) symbol = "❄";
      if (pup.type === PowerupType.BLAST) symbol = "★";
      
      ctx.fillText(symbol, pup.width/2, pup.height/2);

      ctx.restore();
  };

  const drawLetter = (ctx: CanvasRenderingContext2D, letter: Letter) => {
      ctx.save(); ctx.translate(letter.x, letter.y); ctx.rotate(Math.sin(letter.floatOffset) * 0.2);
      ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#f59e0b"; ctx.shadowBlur = 10;
      ctx.fillRect(0,0, letter.width, letter.height);
      ctx.fillStyle = "#fcd34d";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(letter.width/2, letter.height/1.5); ctx.lineTo(letter.width, 0); ctx.fill();
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(letter.width/2, letter.height/2.5, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
  };
  
  const drawLandmark = (ctx: CanvasRenderingContext2D, lm: Landmark, timestamp: number) => {
     ctx.save(); ctx.translate(lm.x, lm.y);
     if (lm.type === 'POWER_PLANT') {
         ctx.fillStyle = "#334155";
         ctx.beginPath(); ctx.moveTo(0, lm.height); ctx.lineTo(20, 0); ctx.lineTo(60, 0); ctx.lineTo(80, lm.height); ctx.fill();
         ctx.beginPath(); ctx.moveTo(90, lm.height); ctx.lineTo(110, 20); ctx.lineTo(150, 20); ctx.lineTo(170, lm.height); ctx.fill();
         const blink = Math.sin(timestamp / 500) > 0;
         ctx.fillStyle = blink ? "red" : "#7f1d1d";
         ctx.beginPath(); ctx.arc(40, 10, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(130, 30, 3, 0, Math.PI*2); ctx.fill();
     } else {
         ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0, lm.width, lm.height);
         ctx.fillStyle = "#1e293b"; ctx.fillRect(20, 0, lm.width-40, lm.height);
     }
     ctx.restore();
  };

  const drawBlizzard = (ctx: CanvasRenderingContext2D, timestamp: number, intensity: number, width: number) => {
      ctx.save();
      const speed = timestamp * 2;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      
      const count = 50 * intensity;
      for (let i = 0; i < count; i++) {
          const x = (Math.sin(i) * 10000 + speed * (1 + Math.random())) % width;
          const y = (Math.cos(i) * 10000) % CANVAS_HEIGHT;
          const len = 20 + Math.random() * 30;
          ctx.beginPath(); ctx.moveTo(width - x, Math.abs(y)); ctx.lineTo(width - x - len, Math.abs(y) + 2); ctx.stroke();
      }
      ctx.restore();
  };

  const drawWindLines = (ctx: CanvasRenderingContext2D, timestamp: number, width: number) => {
      ctx.save();
      ctx.strokeStyle = "rgba(200, 200, 255, 0.1)";
      ctx.lineWidth = 100;
      const offset = (timestamp * 0.5) % width;
      ctx.beginPath();
      ctx.moveTo(width - offset, 0); ctx.lineTo(width - offset - 200, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.restore();
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden group">
      <canvas 
        ref={canvasRef} 
        width={dimensions.w * dimensions.dpr} 
        height={dimensions.h * dimensions.dpr} 
        style={{ width: dimensions.w, height: dimensions.h }}
        className="w-full h-full block" 
      />
      {gameState !== GameState.INTRO && !cinematicMode && !isEndingSequenceRef.current && (
        <>
          <UIOverlay 
            lives={hudState.lives}
            snowballs={hudState.snowballs}
            progress={hudState.progress}
            timeLeft={hudState.timeLeft}
            activePowerups={hudState.activeSpeed + hudState.activeHealing}
            currentLevelName={gameMode === GameMode.ENDLESS ? "Endless Loop" : LEVELS[hudState.levelIndex].name}
            score={hudState.score}
            collectedPowerups={hudState.collectedPowerups}
            activeDialogue={hudState.activeDialogue}
            activeWish={hudState.activeWish}
            wishesCollected={hudState.wishesCollected}
            stamina={hudState.stamina}
            stability={hudState.stability}
          />
          
          <button 
            onClick={() => setDebugMenuOpen(!debugMenuOpen)}
            className="absolute top-4 right-4 z-50 p-2 text-slate-500 hover:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Open Debug Menu"
          >
            <Bug size={16} />
          </button>
        </>
      )}
      
      {debugMenuOpen && (
          <div className="absolute top-12 right-4 bg-slate-900/95 border border-green-500/50 p-4 rounded-xl shadow-2xl backdrop-blur-md z-50 text-green-400 font-mono text-xs w-64 animate-fade-in-down">
            <div className="flex items-center justify-between border-b border-green-500/30 mb-3 pb-2">
                <h3 className="font-bold flex items-center gap-2"><Bug size={14} /> DEBUG CONSOLE</h3>
                <span className="text-[10px] bg-green-900/50 px-2 py-0.5 rounded text-green-300">DEV BUILD</span>
            </div>
            
            <div className="space-y-2">
                <button onClick={() => { playerRef.current.isInvincible = !playerRef.current.isInvincible; }} className="w-full text-left px-3 py-2 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/30 transition-all flex items-center gap-2">
                    <Eye size={12} /> Toggle God Mode
                </button>
                <button onClick={() => { playerRef.current.stamina = 9999; playerRef.current.maxStamina = 9999; isExhaustedRef.current = false; }} className="w-full text-left px-3 py-2 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/30 transition-all flex items-center gap-2">
                    <BatteryWarning size={12} /> Infinite Stamina
                </button>
                <button onClick={() => { distanceRef.current += 50000; }} className="w-full text-left px-3 py-2 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/30 transition-all flex items-center gap-2">
                    <ChevronsRight size={12} /> Skip Distance (+50k)
                </button>
                <button onClick={() => { playerRef.current.lives = 100; }} className="w-full text-left px-3 py-2 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/30 transition-all flex items-center gap-2">
                    <Heart size={12} /> Add Lives
                </button>
                <button onClick={() => { playerRef.current.snowballs += 50; }} className="w-full text-left px-3 py-2 hover:bg-green-500/10 rounded border border-transparent hover:border-green-500/30 transition-all flex items-center gap-2">
                    <Snowflake size={12} /> Refill Snowballs
                </button>
            </div>
            <div className="mt-3 pt-2 border-t border-green-500/30 text-[10px] text-green-600 text-center">
                Press `~` (Tilde) to toggle
            </div>
          </div>
      )}

      <div className="absolute inset-0 flex md:hidden z-40 pointer-events-auto">
        <div className="w-1/2 h-full" onTouchStart={(e) => { e.preventDefault(); if(!isEndingSequenceRef.current) handleJump(); }} />
        <div className="w-1/2 h-full" onTouchStart={(e) => { e.preventDefault(); if(!isEndingSequenceRef.current) shootSnowball(); }} />
      </div>
    </div>
  );
};

export default GameCanvas;
