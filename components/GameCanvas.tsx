
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
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  GRAVITY, 
  JUMP_STRENGTH, 
  LEVELS, 
  LEVEL_THRESHOLDS, 
  POWERUP_COLORS,
  TOTAL_GAME_TIME_SECONDS,
  VICTORY_DISTANCE,
  BASE_SPEED,
  WISHES,
  SAD_WISHES,
  VILLAIN_MESSAGES,
  NARRATIVE_LETTERS,
  STORY_MOMENTS,
  LANDMARKS,
  REQUIRED_WISHES,
  MAX_STAMINA,
  JUMP_STAMINA_COST,
  STAMINA_REGEN,
  INITIAL_STABILITY,
  LOW_STAMINA_PENALTY,
  STAMINA_RECOVERY_THRESHOLD,
  BOOST_STAMINA_COST
} from '../constants.ts';
import UIOverlay from './UIOverlay.tsx';
import { soundManager } from '../audio.ts';
import { Eye, EyeOff, Skull, Trophy, Camera, FastForward, Mail, BatteryWarning } from 'lucide-react';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onWin: () => void;
  gameMode: GameMode;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onWin, gameMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [debugMenuOpen, setDebugMenuOpen] = useState(false);
  const [cinematicMode, setCinematicMode] = useState(false);
  const [promoMode, setPromoMode] = useState(false);

  const playerRef = useRef<Player>({
    id: 0, x: 150, y: 300, width: 90, height: 40, markedForDeletion: false, // Widened hitbox for Sleigh+Reindeer
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
  const windForceRef = useRef({ x: 0, y: 0 });
  
  const starsRef = useRef<{x:number, y:number, size:number, phase:number}[]>([]);
  const bgCloudsRef = useRef<{x:number, y:number, speed:number, scale:number, opacity: number}[]>([]);
  const flashTimerRef = useRef(0); 
  const pausedTimeRef = useRef(0); 

  const saturationRef = useRef(0.0);
  const flickerTimerRef = useRef(0);
  const isLightsOutRef = useRef(false);
  const isEndingSequenceRef = useRef(false);
  const joyRideModeRef = useRef(false);
  const joyRideTimerRef = useRef(0);
  const masterGiftDroppedRef = useRef(false);
  const villainLetterSpawnedRef = useRef(false);

  const collectedPowerupsRef = useRef<{ id: number; type: PowerupType }[]>([]);
  const wishesCollectedCountRef = useRef(0);
  const activeDialogueRef = useRef<DialogueLine | null>(null);
  const activeWishRef = useRef<{ message: string, variant: LetterVariant } | null>(null);
  const endingMusicTriggeredRef = useRef(false);
  const triggeredLandmarksRef = useRef<Set<string>>(new Set());
  const triggeredLettersRef = useRef<Set<string>>(new Set());
  
  const distanceRef = useRef(0);
  const scoreRef = useRef(0);
  const timeRef = useRef(TOTAL_GAME_TIME_SECONDS);
  const lastFrameTimeRef = useRef(0);
  const shakeRef = useRef(0);
  const triggeredStoryMomentsRef = useRef<Set<string>>(new Set());
  const lastLevelIndexRef = useRef(-1);
  const wasOnGroundRef = useRef(false);
  
  const bgLayersRef = useRef<BackgroundLayer[]>([
    { points: [], color: '', speedModifier: 0.1, offset: 0 }, // Distant Mountains
    { points: [], color: '', speedModifier: 0.3, offset: 0 }, // Mid Hills
    { points: [], color: '', speedModifier: 0.6, offset: 0 }, // Near Hills
  ]);

  // Initial Generation
  useEffect(() => {
    const generateJaggedTerrain = (baseHeight: number, roughness: number, steps: number) => {
        const points = [];
        let y = baseHeight;
        for (let i = 0; i <= CANVAS_WIDTH + 400; i += steps) {
            y += (Math.random() - 0.5) * roughness;
            // Clamping
            y = Math.max(Math.min(y, baseHeight + 100), baseHeight - 200);
            points.push(y);
        }
        return points;
    };

    bgLayersRef.current[0].points = generateJaggedTerrain(200, 150, 40); 
    bgLayersRef.current[1].points = generateJaggedTerrain(100, 80, 40);  
    bgLayersRef.current[2].points = generateJaggedTerrain(50, 40, 20);  

    starsRef.current = [];
    for (let i = 0; i < 150; i++) {
        starsRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT / 1.5),
            size: Math.random() * 2,
            phase: Math.random() * Math.PI * 2
        });
    }

    bgCloudsRef.current = [];
    for (let i = 0; i < 8; i++) {
        bgCloudsRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT / 3),
            speed: Math.random() * 20 + 5,
            scale: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.2 + 0.05
        });
    }
  }, []);
  
  const [hudState, setHudState] = useState({
    lives: 3,
    snowballs: 0,
    progress: 0,
    timeLeft: TOTAL_GAME_TIME_SECONDS,
    levelIndex: 0,
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

  // Reindeer Physics & Stamina Logic
  const handleJump = () => {
      const player = playerRef.current;
      
      // If exhausted, player can't jump until regenerated
      if (isExhaustedRef.current) {
          // Play failed jump sound or shake visual?
          return;
      }

      // Normal Jump
      if (player.stamina > JUMP_STAMINA_COST) {
          player.vy = JUMP_STRENGTH;
          player.stamina = Math.max(0, player.stamina - JUMP_STAMINA_COST);
          soundManager.playJump();
          createParticles(player.x, player.y + 30, ParticleType.SMOKE, 8, '#cbd5e1'); // Magic dust
      } else {
          // Entered Exhaustion
          isExhaustedRef.current = true;
          player.vy = JUMP_STRENGTH * LOW_STAMINA_PENALTY;
          player.stamina = 0;
          soundManager.playTimeWarning(); // Re-use warning sound for exhaustion
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') {
          setDebugMenuOpen(prev => !prev);
          return;
      }
      if (gameState === GameState.MENU) soundManager.init();
      if (gameState !== GameState.PLAYING) return;
      
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !isEndingSequenceRef.current) {
        handleJump();
      }
      if ((e.code === 'KeyZ' || e.code === 'Enter') && !isEndingSequenceRef.current) {
        shootSnowball();
      }
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

  const triggerPromoExplosion = () => {
      setCinematicMode(true);
      setPromoMode(true);
      pausedTimeRef.current = 0; 
      createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      soundManager.playCrash();
      setTimeout(() => {
          pausedTimeRef.current = performance.now();
      }, 500);
  };

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
      playerRef.current = {
        id: 0, x: 150, y: 300, width: 90, height: 40, markedForDeletion: false,
        vy: 0, lives: 3, snowballs: 3, isInvincible: false, invincibleTimer: 0,
        healingTimer: 0, speedTimer: 0, angle: 0,
        stamina: MAX_STAMINA, maxStamina: MAX_STAMINA
      };
      obstaclesRef.current = [];
      powerupsRef.current = [];
      lettersRef.current = [];
      landmarksRef.current = [];
      projectilesRef.current = [];
      particlesRef.current = [];
      collectedPowerupsRef.current = [];
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
      distanceRef.current = 0;
      scoreRef.current = 0;
      timeRef.current = TOTAL_GAME_TIME_SECONDS;
      shakeRef.current = 0;
      saturationRef.current = 1.0;
      flickerTimerRef.current = 0;
      isLightsOutRef.current = false;
      isEndingSequenceRef.current = false;
      joyRideModeRef.current = false;
      joyRideTimerRef.current = 0;
      masterGiftDroppedRef.current = false;
      villainLetterSpawnedRef.current = false;
      wasOnGroundRef.current = false;
      
      lastLevelIndexRef.current = -1;
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

      if (gameState === GameState.INTRO) {
          timeRef.current = TOTAL_GAME_TIME_SECONDS; 
          const hoverSpeed = BASE_SPEED * 0.5;
          soundManager.setSleighVolume(hoverSpeed);
          player.y = 300 + Math.sin(timestamp / 800) * 20;
          player.angle = Math.sin(timestamp / 800) * 0.1;
          bgCloudsRef.current.forEach(cloud => {
            cloud.x -= (cloud.speed + hoverSpeed * 0.1) * timeScale * 0.1;
            if (cloud.x < -150) { cloud.x = CANVAS_WIDTH + 150; cloud.y = Math.random() * (CANVAS_HEIGHT / 2.5); }
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

      let levelIndex = 0;
      let effectiveProgress = progressRatio * 100;
      if (gameMode === GameMode.ENDLESS && progressRatio > 1) {
          effectiveProgress = (progressRatio % 1) * 100;
      } else if (gameMode === GameMode.STORY) {
          effectiveProgress = Math.min(100, effectiveProgress);
      }

      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (effectiveProgress >= LEVEL_THRESHOLDS[i]) {
          levelIndex = i;
          break;
        }
      }
      const level = LEVELS[levelIndex];

      if (!isEndingSequenceRef.current) {
          routeStabilityRef.current -= level.stabilityDrainRate * timeScale;
          if (routeStabilityRef.current <= 0) routeStabilityRef.current = 0;
      }

      // --- Stamina System ---
      const isOnGround = player.y >= CANVAS_HEIGHT - 55 - player.height;
      if (isOnGround) {
          if (!wasOnGroundRef.current) {
               createParticles(player.x + 20, player.y + player.height, ParticleType.DUST, 15, '#cbd5e1');
          }
          wasOnGroundRef.current = true;
          player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN * 2 * timeScale); // Fast regen on ground
      } else {
          wasOnGroundRef.current = false;
          // Gliding recovers stamina, but slower
          if (player.vy > 0) {
               player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN * timeScale);
          }
      }

      if (isExhaustedRef.current) {
          // Check if recovered enough
          if (player.stamina >= STAMINA_RECOVERY_THRESHOLD) {
              isExhaustedRef.current = false;
          }
      }

      // Physics
      const currentSpeedFrame = (BASE_SPEED + (Math.min(progressRatio, 3.0) * 6)); 
      let currentSpeed = isEndingSequenceRef.current ? currentSpeedFrame * 0.5 : currentSpeedFrame * speedMultiplier; 
      
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
                   setGameState(GameState.VICTORY);
                   onWin();
              }
          } else {
              player.vy = 0;
              player.y += (200 - player.y) * 0.05 * timeScale;
              if (!masterGiftDroppedRef.current && landmarksRef.current.some(l => l.type === 'FINAL_HOUSE' && l.x < CANVAS_WIDTH/2)) {
                  masterGiftDroppedRef.current = true;
                  createParticles(player.x, player.y, ParticleType.GLOW, 50, 'gold');
                  flashTimerRef.current = 2.0;
                  setTimeout(() => { joyRideModeRef.current = true; joyRideTimerRef.current = 12.0; }, 500);
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

      // Logic Updates
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
                  const yPos = CANVAS_HEIGHT - 350; // Taller landmarks
                  landmarksRef.current.push({
                      id: Date.now(), x: CANVAS_WIDTH + 200, y: yPos, width: 250, height: 400,
                      markedForDeletion: false, type: lm.type, name: lm.name
                  });
              }
          });
          NARRATIVE_LETTERS.forEach(nl => {
              const key = `letter_${nl.progress}`;
              if (progressRatio >= nl.progress && !triggeredLettersRef.current.has(key)) {
                  triggeredLettersRef.current.add(key);
                  lettersRef.current.push({
                      id: Date.now(), x: CANVAS_WIDTH + 100, y: Math.random() * (CANVAS_HEIGHT - 200) + 50,
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
          if (cloud.x < -150) { cloud.x = CANVAS_WIDTH + 150; cloud.y = Math.random() * (CANVAS_HEIGHT / 2.5); }
      });
      bgLayersRef.current.forEach((layer, index) => {
          layer.offset -= currentSpeed * layer.speedModifier * timeScale;
          if (layer.offset <= -50) {
              layer.offset += 50;
              layer.points.shift();
              // Procedural Generation for infinite scrolling
              const prevY = layer.points[layer.points.length - 1];
              let nextY = prevY + (Math.random() - 0.5) * (index === 0 ? 60 : 20);
              // Clamp
              nextY = Math.max(-200, Math.min(200, nextY));
              layer.points.push(nextY);
          }
      });

      if (!isEndingSequenceRef.current && Math.random() < 0.015 * level.spawnRateMultiplier * timeScale) {
        const types: Obstacle['type'][] = ['TREE', 'BIRD', 'SNOWMAN', 'BUILDING', 'CLOUD', 'ICE_SPIKE', 'DARK_GARLAND'];
        let availableTypes: Obstacle['type'][] = ['TREE', 'BIRD'];
        
        if (level.weatherType === 'SNOWSTORM') availableTypes = ['SNOWMAN', 'CLOUD', 'ICE_SPIKE'];
        else if (level.name.includes("Dark")) availableTypes = ['BUILDING', 'DARK_GARLAND'];
        else if (level.weatherType === 'WIND_CORRIDOR') availableTypes = ['CLOUD', 'BIRD'];

        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const isDestructible = type === 'SNOWMAN' || type === 'ICE_SPIKE' || type === 'DARK_GARLAND';
        
        obstaclesRef.current.push({
          id: Date.now() + Math.random(),
          x: CANVAS_WIDTH + 100,
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
            x: CANVAS_WIDTH + 100,
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
              routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 10);
              wishesCollectedCountRef.current += 1;
              activeWishRef.current = { message: letter.message, variant: letter.variant };
              setTimeout(() => { if (activeWishRef.current?.message === letter.message) activeWishRef.current = null; }, 4000);
          }
      });
      
      projectilesRef.current.forEach(proj => {
        proj.x += proj.vx * timeScale;
        proj.trail.push({x: proj.x, y: proj.y});
        if (proj.trail.length > 10) proj.trail.shift();
        if (proj.x > CANVAS_WIDTH) proj.markedForDeletion = true;
        
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
      const progressRatio = distanceRef.current / VICTORY_DISTANCE;

      // --- Background Rendering ---
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, level.backgroundGradient[0]);
      gradient.addColorStop(1, level.backgroundGradient[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawStars(ctx, timestamp);
      drawMoon(ctx);

      drawMountainLayer(ctx, bgLayersRef.current[0], CANVAS_HEIGHT - 100, "#1e293b", timestamp); // Far
      drawMountainLayer(ctx, bgLayersRef.current[1], CANVAS_HEIGHT - 50, "#334155", timestamp); // Mid
      drawBgClouds(ctx);
      
      // --- World Transform ---
      ctx.save();
      const dx = (Math.random() - 0.5) * shakeRef.current;
      const dy = (Math.random() - 0.5) * shakeRef.current;
      ctx.translate(dx, dy);

      // --- Foreground Mountains ---
      drawMountainLayer(ctx, bgLayersRef.current[2], CANVAS_HEIGHT, "#475569", timestamp, true);

      if (!cinematicMode) {
          landmarksRef.current.forEach(lm => drawLandmark(ctx, lm, timestamp));
          powerupsRef.current.forEach(pup => drawPowerup(ctx, pup, timestamp));
          lettersRef.current.forEach(letter => drawLetter(ctx, letter));
          
          obstaclesRef.current.forEach(obs => drawObstacle(ctx, obs, timestamp));
          
          drawPlayer(ctx, playerRef.current, timestamp);
          
          ctx.fillStyle = "#e0f2fe"; ctx.shadowBlur = 10; ctx.shadowColor = "#bae6fd";
          projectilesRef.current.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI * 2); ctx.fill();
            // Projectile Glow
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
          drawBlizzard(ctx, timestamp, level.weatherIntensity);
      }
      if (level.weatherType === 'WIND_CORRIDOR') {
          drawWindLines(ctx, timestamp);
      }

      if (isLightsOutRef.current) {
         ctx.fillStyle = "rgba(0,0,0,0.5)";
         ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      if (flashTimerRef.current > 0) {
         ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, flashTimerRef.current)})`;
         ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      
      ctx.restore();
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, cinematicMode, promoMode, gameMode]);

  // --- Helper Logic ---
  const checkCollision = (rect1: Entity, rect2: Entity) => {
    const padding = 15; // Adjusted for visual sprite size
    return (
      rect1.x + padding < rect2.x + rect2.width - padding &&
      rect1.x + rect1.width - padding > rect2.x + padding &&
      rect1.y + padding < rect2.y + rect2.height - padding &&
      rect1.y + rect1.height - padding > rect2.y + padding
    );
  };

  const applyPowerup = (type: PowerupType) => {
    const player = playerRef.current;
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
        routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 25);
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
  };

  const updateAndDrawParticle = (ctx: CanvasRenderingContext2D, p: Particle, timestamp: number) => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.016; p.alpha = p.life / p.maxLife; p.radius += p.growth * 0.016;
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
      if (p.type === ParticleType.SHOCKWAVE) {
         ctx.strokeStyle = p.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.stroke();
      } else {
         ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
  };

  // --- DRAWING FUNCTIONS ---

  const drawMoon = (ctx: CanvasRenderingContext2D) => {
     ctx.save();
     ctx.fillStyle = "#fefce8";
     ctx.shadowColor = "#fef08a"; ctx.shadowBlur = 40;
     ctx.beginPath(); ctx.arc(CANVAS_WIDTH - 150, 100, 60, 0, Math.PI*2); ctx.fill();
     ctx.restore();
  }

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
        // Complex Cloud Shape
        ctx.beginPath(); 
        ctx.arc(0,0, 40, 0, Math.PI*2); 
        ctx.arc(35, -10, 45, 0, Math.PI*2); 
        ctx.arc(70, 0, 40, 0, Math.PI*2);
        ctx.arc(35, 20, 30, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    });
  };

  const drawMountainLayer = (ctx: CanvasRenderingContext2D, layer: BackgroundLayer, baseY: number, color: string, timestamp: number, isForeground: boolean = false) => {
      ctx.fillStyle = color;
      ctx.beginPath(); 
      ctx.moveTo(0, CANVAS_HEIGHT);
      
      const segmentWidth = 50; 
      
      // We iterate through points. layer.points contains height offsets.
      for (let i = 0; i < layer.points.length - 1; i++) {
          const x = (i * segmentWidth) + layer.offset; 
          const y = baseY + layer.points[i];
          
          if (i === 0) ctx.moveTo(x, y); 
          else ctx.lineTo(x, y);
      }
      
      // Close shape
      ctx.lineTo(CANVAS_WIDTH + 200, CANVAS_HEIGHT); // Ensure it draws offscreen
      ctx.lineTo(0, CANVAS_HEIGHT); 
      ctx.fill();

      // Snow Caps for Foreground/Mid
      if (!isForeground) {
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.beginPath();
          for (let i = 0; i < layer.points.length - 1; i++) {
              const x = (i * segmentWidth) + layer.offset; 
              const y = baseY + layer.points[i];
              if (layer.points[i] < -50) { // Only on peaks
                 ctx.moveTo(x, y);
                 ctx.lineTo(x + 10, y + 20);
                 ctx.lineTo(x - 10, y + 20);
                 ctx.fill();
              }
          }
      }
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player, timestamp: number) => {
    if (player.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) return;
    ctx.save(); 
    ctx.translate(player.x + player.width/2, player.y + player.height/2); 
    ctx.rotate(player.angle);
    
    // Scale for sprite drawing
    const scale = 0.8;
    ctx.scale(scale, scale);

    // --- REINDEER (Front) ---
    // Stamina visual: droop if exhausted
    const droop = isExhaustedRef.current ? 10 : 0;
    const legCycle = Math.sin(timestamp / 50) * 10;
    
    // Reindeer Body
    ctx.fillStyle = "#8d6e63"; // Brown
    ctx.beginPath(); ctx.ellipse(40, 0 + droop, 20, 10, 0, 0, Math.PI*2); ctx.fill(); 
    
    // Legs (Animated)
    ctx.lineWidth = 3; ctx.strokeStyle = "#5d4037";
    ctx.beginPath(); ctx.moveTo(30, 5 + droop); ctx.lineTo(30 - legCycle, 20 + droop); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50, 5 + droop); ctx.lineTo(50 + legCycle, 20 + droop); ctx.stroke();

    // Reindeer Head
    ctx.beginPath(); ctx.ellipse(60, -10 + droop, 10, 8, -0.2, 0, Math.PI*2); ctx.fill();
    // Nose (Glowing Red)
    ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(68, -10 + droop, 3, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Harness
    ctx.strokeStyle = "#fcd34d"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 0 + droop); ctx.lineTo(0, 0); ctx.stroke();

    // --- SLEIGH (Back) ---
    // Runners
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 3; 
    ctx.beginPath(); ctx.moveTo(-40, 20); ctx.lineTo(10, 20); ctx.bezierCurveTo(20, 15, 20, 5, 10, 5); ctx.stroke();
    // Body
    const grad = ctx.createLinearGradient(0, -20, 0, 20); grad.addColorStop(0, "#b91c1c"); grad.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = grad;
    ctx.beginPath(); 
    ctx.moveTo(-45, 15); 
    ctx.bezierCurveTo(-35, 25, 5, 25, 15, 15); // Bottom curve
    ctx.lineTo(15, -5); 
    ctx.lineTo(-45, -5); 
    ctx.fill();
    
    // Gold Trim
    ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-45, 0); ctx.lineTo(15, 0); ctx.stroke();

    // Santa
    ctx.fillStyle = "#fca5a5"; ctx.beginPath(); ctx.arc(-15, -10, 8, 0, Math.PI*2); ctx.fill(); // Face
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.moveTo(-23, -12); ctx.lineTo(-7, -12); ctx.lineTo(-15, -25); ctx.fill(); // Hat
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(-15, -25, 3, 0, Math.PI*2); ctx.fill(); // Pom pom

    // Boost Aura
    if (player.speedTimer > 0) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = "rgba(255, 200, 0, 0.3)";
        ctx.beginPath(); ctx.ellipse(0, 0, 70, 40, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, timestamp: number) => {
    ctx.save(); ctx.translate(obs.x, obs.y);
    
    if (obs.type === 'TREE') {
        const sway = Math.sin(timestamp / 400 + obs.id) * 0.05; ctx.rotate(sway);
        // Trunk
        ctx.fillStyle = "#451a03"; ctx.fillRect(obs.width/2 - 5, obs.height - 15, 10, 15);
        // Layers
        const layers = 3; const layerHeight = (obs.height - 10) / layers;
        for(let i=0; i<layers; i++) {
            const width = obs.width - (i * 12); 
            const y = (layers - 1 - i) * layerHeight;
            // Gradient
            const grad = ctx.createLinearGradient(0, y - layerHeight, 0, y + layerHeight);
            grad.addColorStop(0, "#4ade80"); grad.addColorStop(1, "#166534");
            ctx.fillStyle = grad;
            
            ctx.beginPath();
            ctx.moveTo(obs.width/2, y - layerHeight);
            ctx.lineTo(obs.width/2 + width/2, y + layerHeight);
            ctx.lineTo(obs.width/2 - width/2, y + layerHeight);
            ctx.fill();
            
            // Snow on branches
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.moveTo(obs.width/2, y - layerHeight);
            ctx.lineTo(obs.width/2 + 5, y - layerHeight + 5);
            ctx.lineTo(obs.width/2 - 5, y - layerHeight + 5);
            ctx.fill();
        }
    } 
    else if (obs.type === 'BUILDING') {
        // Dark Building
        ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0, obs.width, obs.height);
        // Depth side
        ctx.fillStyle = "#1e293b"; ctx.beginPath(); ctx.moveTo(obs.width, 0); ctx.lineTo(obs.width+10, 10); ctx.lineTo(obs.width+10, obs.height+10); ctx.lineTo(obs.width, obs.height); ctx.fill();
        
        // Windows
        ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#f59e0b";
        for(let i=10; i<obs.width-10; i+=20) {
            for(let j=10; j<obs.height-10; j+=30) {
                if (Math.random() > 0.5) { // Random lit
                    ctx.shadowBlur = 5;
                    ctx.fillRect(i, j, 10, 15);
                    ctx.shadowBlur = 0;
                } else {
                    ctx.fillStyle = "#334155"; ctx.fillRect(i, j, 10, 15); ctx.fillStyle = "#fbbf24";
                }
            }
        }
    } 
    else if (obs.type === 'ICE_SPIKE') {
        const grad = ctx.createLinearGradient(0,0,0, obs.height);
        grad.addColorStop(0, "rgba(255,255,255,0.9)"); grad.addColorStop(1, "rgba(165, 243, 252, 0.4)");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.moveTo(0, obs.height); ctx.lineTo(obs.width/2, 0); ctx.lineTo(obs.width, obs.height); ctx.fill();
        // Shine
        ctx.strokeStyle = "white"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(obs.width/2, 0); ctx.lineTo(obs.width/2, obs.height); ctx.stroke();
    }
    else if (obs.type === 'DARK_GARLAND') {
        ctx.strokeStyle = "#4b5563"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(obs.width/2, obs.height, obs.width, 0); ctx.stroke();
        // Bulbs (Broken)
        for(let i=0.2; i<0.9; i+=0.2) {
             const x = obs.width * i; const y = obs.height * 0.8; // Approx
             ctx.fillStyle = Math.random() > 0.9 ? "red" : "#1f2937";
             ctx.beginPath(); ctx.arc(x, y + (i===0.5 ? 10 : 0), 4, 0, Math.PI*2); ctx.fill();
        }
    }
    else if (obs.type === 'CLOUD') {
         ctx.fillStyle = "rgba(255,255,255, 0.9)"; 
         ctx.beginPath(); ctx.arc(20, 20, 20, 0, Math.PI*2); ctx.arc(50, 20, 25, 0, Math.PI*2); ctx.arc(80, 20, 15, 0, Math.PI*2); ctx.fill();
         // Dark underside
         ctx.fillStyle = "rgba(200,200,200, 0.5)";
         ctx.beginPath(); ctx.arc(50, 20, 20, 0, Math.PI*2); ctx.fill();
    }
    else if (obs.type === 'BIRD') {
        const flap = Math.sin(timestamp / 100) * 10;
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -10 + flap, 20, 0); ctx.quadraticCurveTo(30, -10 + flap, 40, 0);
        ctx.lineTo(20, 10); ctx.fill();
    }
    
    ctx.restore();
  };

  const drawPowerup = (ctx: CanvasRenderingContext2D, pup: Powerup, timestamp: number) => {
      ctx.save(); ctx.translate(pup.x, pup.y);
      // Pulsing effect
      const scale = 1 + Math.sin(timestamp / 200) * 0.1;
      ctx.scale(scale, scale);
      
      ctx.fillStyle = POWERUP_COLORS[pup.type];
      ctx.shadowColor = POWERUP_COLORS[pup.type]; ctx.shadowBlur = 15;
      
      // Orb shape
      ctx.beginPath(); ctx.arc(pup.width/2, pup.height/2, 18, 0, Math.PI*2); ctx.fill();
      
      // Inner Icon (Simplified)
      ctx.fillStyle = "white"; ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(pup.width/2, pup.height/2, 8, 0, Math.PI*2); ctx.fill();
      
      // Ring
      ctx.strokeStyle = "white"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pup.width/2, pup.height/2, 22, 0, Math.PI*2); ctx.stroke();
      
      ctx.restore();
  };

  const drawLetter = (ctx: CanvasRenderingContext2D, letter: Letter) => {
      ctx.save(); ctx.translate(letter.x, letter.y); ctx.rotate(Math.sin(letter.floatOffset) * 0.2);
      ctx.fillStyle = "#fbbf24"; ctx.shadowColor = "#f59e0b"; ctx.shadowBlur = 10;
      // Envelope body
      ctx.fillRect(0,0, letter.width, letter.height);
      ctx.fillStyle = "#fcd34d";
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(letter.width/2, letter.height/1.5); ctx.lineTo(letter.width, 0); ctx.fill();
      // Seal
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(letter.width/2, letter.height/2.5, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
  };
  
  const drawLandmark = (ctx: CanvasRenderingContext2D, lm: Landmark, timestamp: number) => {
     ctx.save(); ctx.translate(lm.x, lm.y);
     if (lm.type === 'POWER_PLANT') {
         // Cooling towers
         ctx.fillStyle = "#334155";
         ctx.beginPath(); ctx.moveTo(0, lm.height); ctx.lineTo(20, 0); ctx.lineTo(60, 0); ctx.lineTo(80, lm.height); ctx.fill();
         ctx.beginPath(); ctx.moveTo(90, lm.height); ctx.lineTo(110, 20); ctx.lineTo(150, 20); ctx.lineTo(170, lm.height); ctx.fill();
         // Red lights
         const blink = Math.sin(timestamp / 500) > 0;
         ctx.fillStyle = blink ? "red" : "#7f1d1d";
         ctx.beginPath(); ctx.arc(40, 10, 3, 0, Math.PI*2); ctx.fill();
         ctx.beginPath(); ctx.arc(130, 30, 3, 0, Math.PI*2); ctx.fill();
     } else {
         // Generic big structure
         ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0, lm.width, lm.height);
         ctx.fillStyle = "#1e293b"; ctx.fillRect(20, 0, lm.width-40, lm.height);
     }
     ctx.restore();
  };

  const drawBlizzard = (ctx: CanvasRenderingContext2D, timestamp: number, intensity: number) => {
      ctx.save();
      const speed = timestamp * 2;
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 2;
      
      const count = 50 * intensity;
      for (let i = 0; i < count; i++) {
          const x = (Math.sin(i) * 10000 + speed * (1 + Math.random())) % CANVAS_WIDTH;
          const y = (Math.cos(i) * 10000) % CANVAS_HEIGHT;
          const len = 20 + Math.random() * 30;
          ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH - x, Math.abs(y)); ctx.lineTo(CANVAS_WIDTH - x - len, Math.abs(y) + 2); ctx.stroke();
      }
      ctx.restore();
  };

  const drawWindLines = (ctx: CanvasRenderingContext2D, timestamp: number) => {
      ctx.save();
      ctx.strokeStyle = "rgba(200, 200, 255, 0.1)";
      ctx.lineWidth = 100;
      const offset = (timestamp * 0.5) % CANVAS_WIDTH;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH - offset, 0); ctx.lineTo(CANVAS_WIDTH - offset - 200, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.restore();
  };

  return (
    <div className="relative w-full h-full max-w-[1200px] max-h-[600px] mx-auto border-4 border-slate-800 shadow-2xl rounded-xl overflow-hidden bg-black">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-cover" />
      {gameState !== GameState.INTRO && !cinematicMode && !isEndingSequenceRef.current && (
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
      )}
      
      <div className="absolute inset-0 flex md:hidden z-40 pointer-events-auto">
        <div className="w-1/2 h-full" onTouchStart={(e) => { e.preventDefault(); if(!isEndingSequenceRef.current) handleJump(); }} />
        <div className="w-1/2 h-full" onTouchStart={(e) => { e.preventDefault(); if(!isEndingSequenceRef.current) shootSnowball(); }} />
      </div>
    </div>
  );
};

export default GameCanvas;
