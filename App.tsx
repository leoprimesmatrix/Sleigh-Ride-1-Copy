
import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas.tsx';
import VictorySequence from './components/VictorySequence.tsx';
import BadEndingSequence from './components/BadEndingSequence.tsx';
import LevelCompleteScreen from './components/LevelCompleteScreen.tsx';
import { GameState, PowerupType, GameMode } from './types.ts';
import { POWERUP_COLORS, LEVELS } from './constants.ts';
import { Play, RefreshCw, HelpCircle, ArrowLeft, Loader2, FileText, X, Bell, Gift, Lock, Infinity as InfinityIcon, Zap, Map as MapIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import Logo from './components/Logo.tsx';

const CURRENT_VERSION = '1.0.1';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.STORY);
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Connecting to servers...");
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const [maxLevelReached, setMaxLevelReached] = useState(0);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  const [introStage, setIntroStage] = useState(0);

  useEffect(() => {
    // Reset level progress on page load (session based)
    localStorage.setItem('sleigh_ride_max_level', '0');
    setMaxLevelReached(0);

    const savedVersion = localStorage.getItem('sleigh_ride_version');
    if (savedVersion !== CURRENT_VERSION) {
      setShowUpdateNotification(true);
    }
    
    const storyComplete = localStorage.getItem('sleigh_ride_story_complete') === 'true';
    const introSeen = localStorage.getItem('sleigh_ride_intro_seen') === 'true';
    
    setIsStoryComplete(storyComplete);
    setHasSeenIntro(introSeen);
  }, []); 

  // Watch for game state changes to update max level from local storage if needed (though we mostly control it via state now)
  useEffect(() => {
    const savedMaxLevel = parseInt(localStorage.getItem('sleigh_ride_max_level') || '0');
    if (savedMaxLevel > maxLevelReached) {
        setMaxLevelReached(savedMaxLevel);
    }
  }, [gameState]);
  
  useEffect(() => {
    if (gameState === GameState.INTRO) {
        if (hasSeenIntro) {
            const t = setTimeout(() => setGameState(GameState.PLAYING), 2000);
            return () => clearTimeout(t);
        }

        const t1 = setTimeout(() => setIntroStage(1), 4000);
        const t2 = setTimeout(() => setIntroStage(2), 8000);
        const t3 = setTimeout(() => setIntroStage(3), 11000);
        const t4 = setTimeout(() => setIntroStage(4), 14000);
        const t5 = setTimeout(() => {
            localStorage.setItem('sleigh_ride_intro_seen', 'true');
            setHasSeenIntro(true);
            setGameState(GameState.PLAYING);
        }, 17000);

        return () => {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
        };
    } else {
        setIntroStage(0);
    }
  }, [gameState, hasSeenIntro]);

  const handleStartGame = (mode: GameMode, levelIndex: number = 0) => {
    setGameMode(mode);
    setSelectedLevel(levelIndex);
    setIsLoading(true);
    setLoadingText(mode === GameMode.STORY ? "Synchronizing North Pole Data..." : "Calibrating Infinite Loop...");
    
    setTimeout(() => {
        setIsLoading(false);
        setGameState(GameState.INTRO); 
    }, 1500);
  };

  const handleWin = () => {
      // Logic handled inside GameCanvas to set state to VICTORY or LEVEL_COMPLETE
      // But we need to update the save file
      const current = parseInt(localStorage.getItem('sleigh_ride_max_level') || '0');
      if (selectedLevel >= current && current < LEVELS.length - 1) {
          const nextLevel = current + 1;
          localStorage.setItem('sleigh_ride_max_level', nextLevel.toString());
          setMaxLevelReached(nextLevel);
      }
      
      // If complete game victory
      if (gameMode === GameMode.STORY && selectedLevel === LEVELS.length - 1) {
          setGameState(GameState.VICTORY);
          setIsStoryComplete(true);
          localStorage.setItem('sleigh_ride_story_complete', 'true');
      }
  };

  const handleNextLevel = () => {
      const nextLevelIndex = selectedLevel + 1;
      if (nextLevelIndex < LEVELS.length) {
          handleStartGame(GameMode.STORY, nextLevelIndex);
      } else {
          // Fallback if somehow triggered on last level
          setGameState(GameState.VICTORY);
      }
  };

  const restartGame = () => setGameState(GameState.MENU);

  const handleDismissUpdate = () => {
    setShowUpdateNotification(false);
    localStorage.setItem('sleigh_ride_version', CURRENT_VERSION);
  };

  const skipIntro = () => {
      localStorage.setItem('sleigh_ride_intro_seen', 'true');
      setHasSeenIntro(true);
      setGameState(GameState.PLAYING);
  };

  // Cinematic Background for Menu
  const MenuBackground = () => (
    <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a]"></div>
        
        {/* CSS Snow */}
        <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
                <div 
                    key={i}
                    className="absolute bg-white rounded-full opacity-60 animate-[fall_linear_infinite]"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `-${Math.random() * 20}px`,
                        width: `${Math.random() * 3 + 2}px`,
                        height: `${Math.random() * 3 + 2}px`,
                        animationDuration: `${Math.random() * 5 + 5}s`,
                        animationDelay: `${Math.random() * 5}s`
                    }}
                />
            ))}
        </div>
        
        <style>{`
            @keyframes fall {
                to { transform: translateY(110vh); }
            }
        `}</style>
        
        {/* Ambient Glow */}
        <div className="absolute bottom-[-20%] left-[10%] w-[50vw] h-[50vw] bg-blue-900/20 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[-10%] right-[10%] w-[30vw] h-[30vw] bg-purple-900/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
    </div>
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-100 relative">
      
      {gameState === GameState.MENU && !isLoading && (
        <>
            <MenuBackground />
            
            <div className="relative z-10 w-full max-w-7xl h-full flex flex-col items-center justify-center p-6 gap-8">
                
                {/* Brand */}
                <div className={`flex flex-col items-center text-center space-y-6 transition-all duration-500 ${showLevelSelect ? 'scale-75 translate-y-[-20px]' : ''}`}>
                    <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-300">
                         <div className="absolute -inset-4 bg-gradient-to-r from-red-600/50 to-green-600/50 rounded-full blur-xl opacity-20 group-hover:opacity-60 animate-pulse-slow"></div>
                         <Logo className="relative w-[300px] md:w-[500px] drop-shadow-2xl" />
                    </div>
                    {!showLevelSelect && (
                        <div className="space-y-2 animate-fade-in-up">
                            <p className="text-xl md:text-2xl font-light tracking-[0.3em] text-blue-200 uppercase drop-shadow-md">
                                Operation: Hope
                            </p>
                        </div>
                    )}
                </div>

                {/* Main Menu / Level Select */}
                <div className="w-full max-w-4xl relative min-h-[400px] flex items-center justify-center">
                    
                    {!showLevelSelect ? (
                        /* MAIN BUTTONS */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl animate-fade-in-up delay-100">
                            <button 
                                onClick={() => setShowLevelSelect(true)}
                                className="group relative h-48 bg-slate-800/40 backdrop-blur-md rounded-2xl border border-white/10 hover:border-red-500/50 transition-all hover:bg-slate-800/60 flex flex-col items-center justify-center gap-4 overflow-hidden shadow-2xl hover:shadow-red-900/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-4 rounded-full bg-red-500/10 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-all transform group-hover:scale-110">
                                    <Play size={40} fill="currentColor" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-white tracking-wide">Story Mode</h3>
                                    <p className="text-slate-400 text-sm mt-1">Save Christmas across {LEVELS.length} levels</p>
                                </div>
                            </button>

                            <button 
                                onClick={() => handleStartGame(GameMode.ENDLESS)}
                                disabled={!isStoryComplete}
                                className={`group relative h-48 backdrop-blur-md rounded-2xl border transition-all flex flex-col items-center justify-center gap-4 overflow-hidden shadow-2xl ${
                                    isStoryComplete 
                                    ? 'bg-slate-800/40 border-white/10 hover:border-purple-500/50 hover:bg-slate-800/60 hover:shadow-purple-900/20 cursor-pointer' 
                                    : 'bg-slate-900/40 border-transparent opacity-60 cursor-not-allowed grayscale'
                                }`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className={`p-4 rounded-full transition-all transform group-hover:scale-110 ${isStoryComplete ? 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white' : 'bg-slate-800 text-slate-600'}`}>
                                    {isStoryComplete ? <InfinityIcon size={40} /> : <Lock size={40} />}
                                </div>
                                <div className="text-center">
                                    <h3 className="text-2xl font-bold text-white tracking-wide">Endless Mode</h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {isStoryComplete ? "Test your endurance" : "Complete Story to Unlock"}
                                    </p>
                                </div>
                            </button>
                            
                            <div className="md:col-span-2 flex justify-center gap-4 mt-4">
                                <button onClick={() => setShowPatchNotes(true)} className="px-6 py-2 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors">
                                    Updates
                                </button>
                                <button onClick={() => setGameState(GameState.HELP)} className="px-6 py-2 rounded-full bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white text-sm font-bold uppercase tracking-wider transition-colors">
                                    Manual
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* LEVEL SELECT */
                        <div className="w-full h-full flex flex-col animate-fade-in-up">
                            <div className="flex items-center justify-between mb-6 px-4">
                                <button 
                                    onClick={() => setShowLevelSelect(false)}
                                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={20} /> Back
                                </button>
                                <h2 className="text-xl font-bold uppercase tracking-widest text-slate-200">Select Zone</h2>
                                <div className="w-20"></div> {/* Spacer */}
                            </div>

                            <div className="flex-1 overflow-x-auto custom-scrollbar pb-4 flex gap-6 px-4 snap-x snap-mandatory">
                                {LEVELS.map((level, index) => {
                                    const isLocked = index > maxLevelReached;
                                    return (
                                        <button
                                            key={index}
                                            disabled={isLocked}
                                            onClick={() => handleStartGame(GameMode.STORY, index)}
                                            className={`relative min-w-[280px] md:min-w-[320px] h-[360px] rounded-3xl border snap-center transition-all duration-300 flex flex-col overflow-hidden group text-left
                                                ${isLocked 
                                                    ? 'bg-slate-900/60 border-slate-800 opacity-60' 
                                                    : 'bg-slate-800/60 border-slate-700 hover:border-white/50 hover:scale-[1.02] shadow-2xl'
                                                }`}
                                        >
                                            {/* Level Preview Gradient */}
                                            <div 
                                                className="h-40 w-full relative"
                                                style={{ background: `linear-gradient(to bottom, ${level.backgroundGradient[0]}, ${level.backgroundGradient[1]})` }}
                                            >
                                                {isLocked && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <Lock size={48} className="text-slate-500" />
                                                    </div>
                                                )}
                                                {!isLocked && (
                                                     <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                                                )}
                                                <div className="absolute bottom-4 left-4">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-white/80 bg-black/40 px-2 py-1 rounded">
                                                        Zone {index + 1}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col relative">
                                                <h3 className={`text-2xl font-christmas font-bold mb-2 ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                                                    {level.name}
                                                </h3>
                                                <p className="text-sm text-slate-400 mb-4 line-clamp-3 leading-relaxed">
                                                    {isLocked ? "Complete previous zones to access this area." : level.description}
                                                </p>
                                                
                                                {!isLocked && (
                                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 uppercase tracking-wider">
                                                        <span>Difficulty: {'★'.repeat(Math.ceil(level.obstacleSpeedMultiplier))}</span>
                                                        <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-white">
                                                            Deploy <ChevronRight size={14} />
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
      )}

      {showUpdateNotification && gameState === GameState.MENU && !isLoading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-8 shadow-2xl text-center relative overflow-hidden">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-3 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/20 text-white">
                  <Bell size={32} />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">Update Installed</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Welcome to v{CURRENT_VERSION}. New visuals, level selector, and improved stability.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDismissUpdate}
                  className="w-full py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold transition-all transform hover:scale-[1.02]"
                >
                  Let's Fly!
                </button>
              </div>
           </div>
        </div>
      )}

      {showPatchNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
               
               <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                   <div>
                       <h2 className="text-2xl font-bold text-white">Patch Notes</h2>
                       <p className="text-slate-500 text-sm">v{CURRENT_VERSION} • The Polish Update</p>
                   </div>
                   <button onClick={() => setShowPatchNotes(false)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                      <X size={24} className="text-slate-400" />
                   </button>
               </div>
               
               <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
                          <MapIcon size={18} /> Level Selector
                      </h3>
                      <ul className="space-y-2 text-slate-300 text-sm list-disc pl-5">
                          <li>Added <strong>Zone Select</strong> for Story Mode. Replay your favorite levels!</li>
                          <li>Unlock new zones by completing the previous ones.</li>
                      </ul>
                  </div>
                  
                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                          <Zap size={18} /> Visual Overhaul
                      </h3>
                      <ul className="space-y-2 text-slate-300 text-sm list-disc pl-5">
                          <li><strong>Lighting Engine</strong>: Dynamic ambient lighting for each level.</li>
                          <li><strong>Particle Effects</strong>: Improved collision, powerup, and trail effects.</li>
                          <li><strong>UI Polish</strong>: Modern glassmorphism menus and HUD.</li>
                      </ul>
                  </div>
               </div>
            </div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center space-y-6 animate-fade-in">
           <div className="relative">
             <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full animate-pulse"></div>
             <Loader2 size={48} className="text-green-500 animate-spin relative z-10" />
           </div>
           <p className="text-slate-400 font-mono text-sm tracking-widest animate-pulse">
             {loadingText}
           </p>
        </div>
      )}

      {gameState === GameState.HELP && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[80vh]">
                
                {/* Sidebar */}
                <div className="bg-slate-800/50 p-8 md:w-1/3 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Manual</h2>
                        <p className="text-slate-400 text-sm">Operation: Sleigh Ride</p>
                    </div>
                    
                    <button 
                        onClick={() => setGameState(GameState.MENU)}
                        className="mt-8 md:mt-0 flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={20} /> Back to Menu
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 md:w-2/3 overflow-y-auto custom-scrollbar space-y-8">
                    <section>
                        <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Controls</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <span className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Jump / Fly</span>
                                <span className="font-mono text-lg text-white">SPACEBAR</span>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <span className="block text-xs text-slate-500 uppercase tracking-widest mb-1">Shoot</span>
                                <span className="font-mono text-lg text-white">Z Key</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Powerups</h3>
                        <div className="space-y-3">
                            {Object.values(PowerupType).map((type) => (
                                <div key={type} className="flex items-center gap-4 bg-slate-800/30 p-3 rounded-xl">
                                    <div 
                                        className="w-8 h-8 rounded-full shadow-lg"
                                        style={{ backgroundColor: POWERUP_COLORS[type] }}
                                    ></div>
                                    <div>
                                        <p className="font-bold text-white text-sm capitalize">{type.toLowerCase()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY || gameState === GameState.BAD_ENDING || gameState === GameState.INTRO || gameState === GameState.LEVEL_COMPLETE) && (
        <div className="fixed inset-0 z-0">
          <GameCanvas 
            gameState={gameState} 
            gameMode={gameMode}
            setGameState={(newState) => {
                 setGameState(newState);
            }} 
            onWin={handleWin}
            startLevelIndex={selectedLevel}
          />
          
          {gameState === GameState.INTRO && !hasSeenIntro && (
              <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-8 animate-fade-in text-center">
                  <div className="max-w-3xl space-y-8">
                      <div className={`transition-all duration-1000 transform ${introStage >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <p className="text-xl md:text-2xl text-blue-200 font-light italic">
                           "The wind is different this year..."
                        </p>
                      </div>

                      {introStage >= 1 && (
                          <div className="animate-slide-up">
                             <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                                Belief is fading. The storm is rising.
                             </p>
                          </div>
                      )}

                      {introStage >= 2 && (
                          <div className="animate-slide-up">
                             <p className="text-2xl md:text-3xl text-white font-bold mt-4">
                                Collect <span className="text-yellow-400">30 Wishes</span> to reignite the spirit.
                             </p>
                          </div>
                      )}

                      {introStage >= 3 && (
                          <div className="animate-pulse mt-8">
                             <h1 className="text-5xl md:text-7xl font-black text-red-600 font-christmas drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                                CHRISTMAS IS CANCELLED
                             </h1>
                             <p className="text-sm text-slate-500 mt-2 uppercase tracking-[0.3em]">Unless you save it.</p>
                          </div>
                      )}
                      
                      <button 
                        onClick={skipIntro}
                        className="absolute bottom-8 right-8 text-white/30 hover:text-white text-xs uppercase tracking-widest hover:underline transition-all"
                      >
                         Skip Intro
                      </button>
                  </div>
              </div>
          )}

          {gameState === GameState.LEVEL_COMPLETE && (
              <LevelCompleteScreen 
                levelIndex={selectedLevel}
                onNextLevel={handleNextLevel}
                onMenu={restartGame}
                score={0} // Score ref not passed up, simplified for now
              />
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center animate-fade-in">
              <h2 className="text-6xl md:text-8xl font-christmas text-red-600 mb-4 drop-shadow-[0_0_30px_rgba(220,38,38,0.4)]">FAILURE</h2>
              <p className="text-xl text-slate-400 mb-12 uppercase tracking-widest border-t border-slate-700 pt-4">Signal Lost.</p>
              
              <div className="flex gap-6">
                  <button 
                    onClick={restartGame}
                    className="px-8 py-4 bg-transparent border border-slate-600 text-slate-300 rounded-full font-bold text-lg hover:border-white hover:text-white transition-all flex items-center gap-2"
                  >
                    <ArrowLeft size={20} /> Return to Base
                  </button>
                  <button 
                    onClick={() => handleStartGame(gameMode, selectedLevel)}
                    className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-200 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
                  >
                    <RefreshCw size={20} /> Retry Mission
                  </button>
              </div>
            </div>
          )}
          
          {gameState === GameState.BAD_ENDING && (
             <BadEndingSequence onRestart={restartGame} wishesCollected={0} />
          )}

          {gameState === GameState.VICTORY && (
            <VictorySequence onRestart={restartGame} />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
