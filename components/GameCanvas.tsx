
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
  LOW_STAMINA_PENALTY
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
    id: 0, x: 150, y: 300, width: 50, height: 30, markedForDeletion: false,
    vy: 0, lives: 3, snowballs: 0, isInvincible: false, invincibleTimer: 0,
    healingTimer: 0, speedTimer: 0, angle: 0,
    stamina: MAX_STAMINA, maxStamina: MAX_STAMINA
  });
  
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
  const bgTreesRef = useRef<boolean[][]>([[], [], []]); 
  const citySkylineRef = useRef<{x:number, width:number, height:number, windows: {x:number, y:number}[]}[]>([]);
  const distantCitySkylineRef = useRef<{x:number, width:number, height:number, windows: {x:number, y:number}[]}[]>([]);
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
  const wasOnGroundRef = useRef(false); // For landing detection
  
  const bgLayersRef = useRef<BackgroundLayer[]>([
    { points: [], color: '', speedModifier: 0.2, offset: 0 }, 
    { points: [], color: '', speedModifier: 0.5, offset: 0 }, 
    { points: [], color: '', speedModifier: 0.8, offset: 0 }, 
  ]);

  useEffect(() => {
    citySkylineRef.current = [];
    distantCitySkylineRef.current = [];

    const generateTerrain = (amplitude: number, roughness: number) => {
        const points = [];
        let y = 0;
        for (let i = 0; i <= CANVAS_WIDTH + 200; i += 50) {
            y += (Math.random() - 0.5) * roughness;
            y = Math.max(Math.min(y, amplitude), -amplitude);
            points.push(y);
        }
        return points;
    };

    bgLayersRef.current[0].points = generateTerrain(150, 80); 
    bgLayersRef.current[1].points = generateTerrain(50, 30);  
    bgLayersRef.current[2].points = generateTerrain(20, 10);  

    bgTreesRef.current[1] = bgLayersRef.current[1].points.map(() => Math.random() < 0.3);
    bgTreesRef.current[2] = bgLayersRef.current[2].points.map(() => Math.random() < 0.5);

    starsRef.current = [];
    for (let i = 0; i < 80; i++) {
        starsRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT / 2),
            size: Math.random() * 2 + 1,
            phase: Math.random() * Math.PI * 2
        });
    }

    bgCloudsRef.current = [];
    for (let i = 0; i < 6; i++) {
        bgCloudsRef.current.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * (CANVAS_HEIGHT / 2.5),
            speed: Math.random() * 15 + 5,
            scale: Math.random() * 0.5 + 0.5,
            opacity: Math.random() * 0.3 + 0.1
        });
    }
    
    // Generate City
    let cx = 0;
    while(cx < CANVAS_WIDTH + 200) {
        const w = Math.random() * 40 + 40;
        const h = Math.random() * 150 + 100;
        const windows = [];
        for(let wx=10; wx<w-10; wx+=15) {
            for(let wy=20; wy<h-20; wy+=25) {
                if(Math.random() > 0.3) windows.push({x: wx, y: wy});
            }
        }
        citySkylineRef.current.push({x: cx, width: w, height: h, windows});
        cx += w + 5;
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
      if (player.stamina > 5) {
          // Normal Jump
          player.vy = JUMP_STRENGTH;
          player.stamina = Math.max(0, player.stamina - JUMP_STAMINA_COST);
          soundManager.playJump();
          createParticles(player.x, player.y + 20, ParticleType.SMOKE, 5, '#fff');
      } else {
          // Exhausted Jump
          player.vy = JUMP_STRENGTH * LOW_STAMINA_PENALTY;
          createParticles(player.x, player.y + 20, ParticleType.SMOKE, 2, '#888');
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
        width: 12,
        height: 12,
        vx: 15,
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
        id: 0, x: 150, y: 300, width: 60, height: 30, markedForDeletion: false,
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

      // Determine Level
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

      // Route Stability Logic
      if (!isEndingSequenceRef.current) {
          routeStabilityRef.current -= level.stabilityDrainRate * timeScale;
          if (routeStabilityRef.current <= 0) routeStabilityRef.current = 0;
      }

      // Reindeer Stamina Logic
      const isOnGround = player.y >= CANVAS_HEIGHT - 55 - player.height;
      if (isOnGround) {
          if (!wasOnGroundRef.current) {
               // Landing Impact
               createParticles(player.x + 20, player.y + player.height, ParticleType.DUST, 8, '#cbd5e1');
          }
          wasOnGroundRef.current = true;
          player.stamina = Math.min(MAX_STAMINA, player.stamina + STAMINA_REGEN * timeScale);
      } else {
          wasOnGroundRef.current = false;
          // Gliding slowly recovers stamina if not moving up fast
          if (player.vy > 0) {
               player.stamina = Math.min(MAX_STAMINA, player.stamina + (STAMINA_REGEN * 0.5) * timeScale);
          }
      }

      // Physics Calculation
      const currentSpeedFrame = (BASE_SPEED + (Math.min(progressRatio, 3.0) * 6)); 
      let currentSpeed = isEndingSequenceRef.current ? currentSpeedFrame * 0.5 : currentSpeedFrame * speedMultiplier; 
      
      // Weather Physics
      let weatherX = 0;
      let weatherY = 0;
      if (level.weatherType === 'WIND_CORRIDOR') {
          weatherX = -0.1; // Push back
          weatherY = (Math.random() - 0.5) * 0.2; // Turbulence
      } else if (level.weatherType === 'SNOWSTORM') {
          weatherX = -0.05;
      } else if (level.weatherType === 'TURBULENCE') {
           weatherY = (Math.sin(timestamp / 200) * 0.5);
      }
      
      // Story Ending Triggers
      if (gameMode === GameMode.STORY && progressRatio >= 0.90 && !endingMusicTriggeredRef.current) {
          if (wishesCollectedCountRef.current >= 0) { // Sleigh Ride 2 ending requirement loose for now
             endingMusicTriggeredRef.current = true;
             soundManager.playEndingMusic(0, 5);
          }
      }
      if (gameMode === GameMode.STORY && progressRatio >= 0.99 && !isEndingSequenceRef.current) {
          isEndingSequenceRef.current = true;
          player.isInvincible = true;
      }

      // Movement
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

      // Visual filters based on level
      if (level.name.includes("Dark")) {
          isLightsOutRef.current = true;
          saturationRef.current = 0.2;
      } else {
          isLightsOutRef.current = false;
          saturationRef.current = Math.min(1.0, saturationRef.current + 0.01);
      }

      // Spawners (Story moments etc)
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
                  const yPos = CANVAS_HEIGHT - 300;
                  landmarksRef.current.push({
                      id: Date.now(), x: CANVAS_WIDTH + 200, y: yPos, width: 200, height: 400,
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

      // Player Physics Update
      if (!isEndingSequenceRef.current) {
          player.vy += (GRAVITY + weatherY) * timeScale;
          player.y += player.vy * timeScale;
          const targetAngle = Math.min(Math.max(player.vy * 0.05, -0.5), 0.5);
          player.angle += (targetAngle - player.angle) * 0.1 * timeScale;
      }
      
      if (player.y + player.height > CANVAS_HEIGHT - 50) { player.y = CANVAS_HEIGHT - 50 - player.height; player.vy = 0; }
      if (player.y < 0) { player.y = 0; player.vy = 0; }
      if (player.invincibleTimer > 0) player.invincibleTimer -= dt;
      if (player.speedTimer > 0) player.speedTimer -= dt;
      if (player.healingTimer > 0) player.healingTimer -= dt;
      player.isInvincible = player.invincibleTimer > 0;

      // Parallax & Background
      bgCloudsRef.current.forEach(cloud => {
          cloud.x -= (cloud.speed + (currentSpeed * 0.1)) * timeScale * 0.1;
          if (cloud.x < -150) { cloud.x = CANVAS_WIDTH + 150; cloud.y = Math.random() * (CANVAS_HEIGHT / 2.5); }
      });
      bgLayersRef.current.forEach((layer, index) => {
          layer.offset -= currentSpeed * layer.speedModifier * timeScale;
          if (layer.offset <= -50) {
              layer.offset += 50;
              layer.points.shift();
              layer.points.push((Math.random() - 0.5) * (layer.speedModifier * 50));
              if (bgTreesRef.current[index]) {
                  bgTreesRef.current[index].shift();
                  const chance = index === 1 ? 0.3 : (index === 2 ? 0.5 : 0);
                  bgTreesRef.current[index].push(Math.random() < chance);
              }
          }
      });

      // Spawn Obstacles
      if (!isEndingSequenceRef.current && Math.random() < 0.015 * level.spawnRateMultiplier * timeScale) {
        const types: Obstacle['type'][] = ['TREE', 'BIRD', 'SNOWMAN', 'BUILDING', 'CLOUD', 'ICE_SPIKE', 'DARK_GARLAND'];
        let availableTypes: Obstacle['type'][] = ['TREE', 'BIRD'];
        
        if (level.weatherType === 'SNOWSTORM') availableTypes = ['SNOWMAN', 'CLOUD', 'ICE_SPIKE'];
        else if (level.name.includes("Dark")) availableTypes = ['BUILDING', 'DARK_GARLAND'];
        else if (level.weatherType === 'WIND_CORRIDOR') availableTypes = ['CLOUD', 'BIRD'];

        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const isDestructible = type === 'SNOWMAN' || type === 'ICE_SPIKE';
        
        obstaclesRef.current.push({
          id: Date.now() + Math.random(),
          x: CANVAS_WIDTH + 100,
          y: type === 'BIRD' || type === 'CLOUD' || type === 'DARK_GARLAND' ? Math.random() * (CANVAS_HEIGHT - 300) : CANVAS_HEIGHT - 100, 
          width: type === 'BUILDING' ? 80 : 60,
          height: type === 'BUILDING' ? 160 : 70,
          type: type,
          markedForDeletion: false,
          isDestructible,
          rotation: 0
        });
      }
      
      // Spawn Powerups (Stabilizers)
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

      // Move & Collision
      obstaclesRef.current.forEach(obs => {
        obs.x -= currentSpeed * level.obstacleSpeedMultiplier * timeScale;
        if (obs.x + obs.width < -100) obs.markedForDeletion = true;
        
        if (!cinematicMode && !player.isInvincible && checkCollision(player, obs)) {
           // Collision Event
           if (gameMode === GameMode.STORY && levelIndex === 4) {
               // Final level grace
           } else {
               player.lives--;
               // Heavy stability damage
               routeStabilityRef.current -= 15; 
               soundManager.playCrash();
               player.invincibleTimer = 2.0;
               shakeRef.current = 20;
               createParticles(player.x, player.y, ParticleType.DEBRIS, 15, '#ef4444');
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
              // Letters stabilize the route
              routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 10);
              wishesCollectedCountRef.current += 1;
              activeWishRef.current = { message: letter.message, variant: letter.variant };
              setTimeout(() => { if (activeWishRef.current?.message === letter.message) activeWishRef.current = null; }, 4000);
          }
      });
      
      // Projectiles (Snowballs)
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
            // Clearing obstacles improves stability
            routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 5); 
          }
        });
      });

      // Render Updates
      obstaclesRef.current = obstaclesRef.current.filter(e => !e.markedForDeletion);
      powerupsRef.current = powerupsRef.current.filter(e => !e.markedForDeletion);
      lettersRef.current = lettersRef.current.filter(e => !e.markedForDeletion);
      landmarksRef.current = landmarksRef.current.filter(e => !e.markedForDeletion);
      projectilesRef.current = projectilesRef.current.filter(e => !e.markedForDeletion);
      
      if (shakeRef.current > 0) shakeRef.current *= Math.pow(0.9, timeScale);

      // HUD Sync (Every 100ms)
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

      // Background
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      gradient.addColorStop(0, level.backgroundGradient[0]);
      gradient.addColorStop(1, level.backgroundGradient[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawStars(ctx, timestamp);
      drawBgClouds(ctx);
      drawParallaxLayer(ctx, bgLayersRef.current[0], CANVAS_HEIGHT - 150, "#334155", timestamp);
      
      // City Logic for Specific Levels
      if (level.name.includes("Dark") || joyRideModeRef.current) {
          drawCityLayers(ctx, timestamp, joyRideModeRef.current);
      }

      ctx.save();
      const dx = (Math.random() - 0.5) * shakeRef.current;
      const dy = (Math.random() - 0.5) * shakeRef.current;
      ctx.translate(dx, dy);

      if (!cinematicMode) {
          landmarksRef.current.forEach(lm => drawLandmark(ctx, lm));
          powerupsRef.current.forEach(pup => drawPowerup(ctx, pup));
          lettersRef.current.forEach(letter => drawLetter(ctx, letter));
          
          obstaclesRef.current.forEach(obs => drawObstacle(ctx, obs, timestamp, progressRatio));
          drawPlayer(ctx, playerRef.current);
          
          // Projectiles
          ctx.fillStyle = "#e0f2fe"; ctx.shadowBlur = 10; ctx.shadowColor = "#bae6fd";
          projectilesRef.current.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI * 2); ctx.fill();
          });
          ctx.shadowBlur = 0;
      }

      // Particles
      particlesRef.current.forEach(p => {
          updateAndDrawParticle(ctx, p, timestamp);
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Overlays
      if (isLightsOutRef.current) {
         ctx.fillStyle = "rgba(0,0,0,0.6)";
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

  // Helper Functions
  const checkCollision = (rect1: Entity, rect2: Entity) => {
    // Shrink hitbox by 10px on each side for fairness
    const padding = 10;
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
        flashTimerRef.current = 0.15; shakeRef.current = 30; 
        obstaclesRef.current = [];
        soundManager.playCrash();
        break;
      case PowerupType.HEALING: 
        player.healingTimer = 5.0; 
        player.stamina = MAX_STAMINA;
        routeStabilityRef.current = Math.min(100, routeStabilityRef.current + 20);
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
        vy: type === ParticleType.DUST ? -Math.random() * 2 : Math.sin(angle) * speed,
        alpha: 1, color, life: Math.random() * 1 + 0.5, maxLife: 1.5, growth: 0
      });
    }
  };
  
  const createExplosion = (x: number, y: number) => {
      createParticles(x, y, ParticleType.SHOCKWAVE, 1, 'white');
      createParticles(x, y, ParticleType.FIRE, 10, '#f87171');
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

  // Drawing Components
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
        ctx.beginPath(); ctx.arc(0,0, 30, 0, Math.PI*2); ctx.arc(25, -10, 35, 0, Math.PI*2); ctx.arc(50, 0, 30, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    });
  };

  const drawCityLayers = (ctx: CanvasRenderingContext2D, timestamp: number, lit: boolean) => {
      citySkylineRef.current.forEach(b => {
         const by = CANVAS_HEIGHT - b.height + 50;
         ctx.fillStyle = "#1e1b4b"; 
         ctx.fillRect(b.x, by, b.width, b.height);
         if (lit) {
             ctx.fillStyle = "#fef3c7";
             b.windows.forEach(w => {
                 if (Math.sin(timestamp / 200 + w.x) > 0) ctx.fillRect(b.x + w.x, by + w.y, 5, 8);
             });
         }
      });
  };

  const drawParallaxLayer = (ctx: CanvasRenderingContext2D, layer: BackgroundLayer, baseY: number, color: string, timestamp: number, trees?: boolean[]) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT);
      for (let i = 0; i < layer.points.length - 1; i++) {
          const x = (i * 50) + layer.offset; const y = baseY + layer.points[i];
          const nextX = ((i + 1) * 50) + layer.offset; const nextY = baseY + layer.points[i+1];
          const cx = (x + nextX) / 2; const cy = (y + nextY) / 2;
          if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(x, y, cx, cy);
      }
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT); ctx.lineTo(0, CANVAS_HEIGHT); ctx.fill();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, player: Player) => {
    if (player.isInvincible && Math.floor(Date.now() / 50) % 2 === 0) return;
    ctx.save(); ctx.translate(player.x + player.width/2, player.y + player.height/2); ctx.rotate(player.angle);
    
    // Active Powerup Aura
    if (player.speedTimer > 0) {
        ctx.shadowColor = "#fca5a5"; ctx.shadowBlur = 20; 
        ctx.strokeStyle = "rgba(252, 165, 165, 0.5)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.stroke();
    }
    
    // Sleigh Body
    const grad = ctx.createLinearGradient(0, -20, 0, 20); grad.addColorStop(0, "#dc2626"); grad.addColorStop(1, "#991b1b"); ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(-30, 10); ctx.bezierCurveTo(-20, 25, 20, 25, 30, 10); ctx.lineTo(30, -5); ctx.lineTo(-30, -5); ctx.fill();
    // Runners
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-25, 20); ctx.lineTo(25, 20); ctx.moveTo(-25, 20); ctx.bezierCurveTo(-35, 15, -35, 5, -25, 5); ctx.stroke();
    // Santa
    ctx.fillStyle = "#fca5a5"; ctx.beginPath(); ctx.arc(0, -15, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "red"; ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(8, -18); ctx.lineTo(0, -30); ctx.fill();
    ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle, timestamp: number, progress: number) => {
    ctx.save(); ctx.translate(obs.x, obs.y);
    // ... Simplified drawing logic for new obstacle types
    if (obs.type === 'ICE_SPIKE') {
        ctx.fillStyle = "#a5f3fc"; ctx.beginPath(); ctx.moveTo(0, obs.height); ctx.lineTo(obs.width/2, 0); ctx.lineTo(obs.width, obs.height); ctx.fill();
    } else if (obs.type === 'DARK_GARLAND') {
        ctx.strokeStyle = "#333"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(obs.width/2, obs.height, obs.width, 0); ctx.stroke();
    } else if (obs.type === 'BUILDING') {
        ctx.fillStyle = "#0f172a"; ctx.fillRect(0,0, obs.width, obs.height);
        // Dim windows
        ctx.fillStyle = "#1e293b"; 
        for(let i=10; i<obs.width-10; i+=20) for(let j=10; j<obs.height-10; j+=25) ctx.fillRect(i, j, 8, 12);
    } else {
        // Fallback generic draw
        ctx.fillStyle = "#475569"; ctx.fillRect(0,0, obs.width, obs.height);
    }
    ctx.restore();
  };

  const drawPowerup = (ctx: CanvasRenderingContext2D, pup: Powerup) => {
      ctx.save(); ctx.translate(pup.x, pup.y);
      ctx.fillStyle = POWERUP_COLORS[pup.type];
      ctx.shadowColor = POWERUP_COLORS[pup.type]; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(pup.width/2, pup.height/2, 15, 0, Math.PI*2); ctx.fill();
      ctx.restore();
  };

  const drawLetter = (ctx: CanvasRenderingContext2D, letter: Letter) => {
      ctx.save(); ctx.translate(letter.x, letter.y); ctx.rotate(Math.sin(letter.floatOffset) * 0.2);
      ctx.fillStyle = "#fcd34d"; ctx.shadowColor = "#f59e0b"; ctx.shadowBlur = 10;
      ctx.fillRect(0,0, letter.width, letter.height);
      ctx.restore();
  };
  
  const drawLandmark = (ctx: CanvasRenderingContext2D, lm: Landmark) => {
     // Placeholder simple landmark
     ctx.save(); ctx.translate(lm.x, lm.y);
     ctx.fillStyle = "#1e293b"; ctx.fillRect(0,0, lm.width, lm.height);
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
      
      {/* Mobile Controls Overlay */}
      <div className="absolute inset-0 flex md:hidden z-40 pointer-events-auto">
        <div className="w-1/2 h-full" onTouchStart={(e) => { e.preventDefault(); if(!isEndingSequenceRef.current) handleJump(); }} />
        <div className="w-1/2 h-full" onTouchStart={(e) => { e.preventDefault(); if(!isEndingSequenceRef.current) shootSnowball(); }} />
      </div>
    </div>
  );
};

export default GameCanvas;
