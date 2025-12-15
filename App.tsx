
import React, { useState, useEffect, useRef } from 'react';
import GameCanvas from './components/GameCanvas.tsx';
import VictorySequence from './components/VictorySequence.tsx';
import BadEndingSequence from './components/BadEndingSequence.tsx';
import { GameState, PowerupType, GameMode } from './types.ts';
import { POWERUP_COLORS } from './constants.ts';
import { Play, RefreshCw, HelpCircle, ArrowLeft, Loader2, FileText, X, Bell, Gift, Lock, Infinity as InfinityIcon, Zap } from 'lucide-react';
import Logo from './components/Logo.tsx';

const CURRENT_VERSION = '1.0.0';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.STORY);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Connecting to servers...");
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(false);

  const [introStage, setIntroStage] = useState(0);

  useEffect(() => {
    const savedVersion = localStorage.getItem('sleigh_ride_version');
    if (savedVersion !== CURRENT_VERSION) {
      setShowUpdateNotification(true);
    }
    
    const storyComplete = localStorage.getItem('sleigh_ride_story_complete') === 'true';
    const introSeen = localStorage.getItem('sleigh_ride_intro_seen') === 'true';
    
    setIsStoryComplete(storyComplete);
    setHasSeenIntro(introSeen);
  }, []);
  
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

  const handleStartClick = (mode: GameMode) => {
    if (mode === GameMode.ENDLESS && !isStoryComplete) return;

    setGameMode(mode);
    setIsLoading(true);
    setLoadingText(mode === GameMode.STORY ? "Synchronizing North Pole Data..." : "Calibrating Infinite Loop...");
    
    setTimeout(() => {
        setIsLoading(false);
        setGameState(GameState.INTRO); 
    }, 1500);
  };

  const handleWin = () => {
      setGameState(GameState.VICTORY);
      if (gameMode === GameMode.STORY && !isStoryComplete) {
          setIsStoryComplete(true);
          localStorage.setItem('sleigh_ride_story_complete', 'true');
      }
  };

  const restartGame = () => setGameState(GameState.MENU);

  const handleDismissUpdate = () => {
    setShowUpdateNotification(false);
    localStorage.setItem('sleigh_ride_version', CURRENT_VERSION);
  };

  const handleViewUpdateNotes = () => {
    setShowUpdateNotification(false);
    setShowPatchNotes(true);
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,_#1e1b4b_0%,_#020617_100%)]"></div>
        {/* Stars */}
        {[...Array(50)].map((_, i) => (
            <div key={i} className="absolute bg-white rounded-full opacity-50 animate-pulse"
                style={{
                    top: `${Math.random() * 80}%`,
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 2}px`,
                    height: `${Math.random() * 2}px`,
                    animationDelay: `${Math.random() * 5}s`
                }}
            />
        ))}
        {/* Ambient Glow */}
        <div className="absolute bottom-[-10%] left-[20%] w-[40vw] h-[40vw] bg-green-900/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute top-[-10%] right-[10%] w-[30vw] h-[30vw] bg-red-900/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
    </div>
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center font-sans text-slate-100 relative">
      
      {gameState === GameState.MENU && !isLoading && (
        <>
            <MenuBackground />
            
            <div className="relative z-10 w-full max-w-7xl h-full flex flex-col md:flex-row items-center justify-center p-6 gap-12">
                
                {/* Left Side: Brand */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-6 animate-slide-in-right">
                    <div className="relative group">
                         <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-green-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                         <Logo className="relative w-[300px] md:w-[450px] drop-shadow-2xl" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl md:text-2xl font-light tracking-[0.2em] text-blue-200 uppercase">
                            Adventure awaits
                        </p>
                        <p className="text-sm text-slate-400 max-w-md">
                            Navigate the storm. Restore belief. Deliver hope before the clock strikes midnight.
                        </p>
                    </div>
                </div>

                {/* Right Side: Menu */}
                <div className="flex-1 w-full max-w-md space-y-4 animate-slide-up">
                    <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
                        
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                             <div className="w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl"></div>
                        </div>

                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Select Operation</h2>

                        <div className="space-y-4">
                            <button 
                                onClick={() => handleStartClick(GameMode.STORY)}
                                className="w-full group relative px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-800 hover:from-red-900/80 hover:to-slate-800 rounded-xl border border-white/5 hover:border-red-500/50 transition-all duration-300 shadow-lg hover:shadow-red-900/20 overflow-hidden text-left"
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-red-500/20 rounded-lg text-red-400 group-hover:text-white group-hover:bg-red-500 transition-colors">
                                            <Play size={24} fill="currentColor" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white">Story Campaign</h3>
                                            <p className="text-xs text-slate-400 group-hover:text-slate-200">The journey to save Christmas.</p>
                                        </div>
                                    </div>
                                    <ArrowLeft className="rotate-180 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" size={20} />
                                </div>
                            </button>

                            <button 
                                onClick={() => handleStartClick(GameMode.ENDLESS)}
                                disabled={!isStoryComplete}
                                className={`w-full group relative px-6 py-5 rounded-xl border transition-all duration-300 text-left overflow-hidden ${
                                    isStoryComplete 
                                    ? 'bg-gradient-to-r from-slate-800 to-slate-800 hover:from-purple-900/80 hover:to-slate-800 border-white/5 hover:border-purple-500/50 cursor-pointer shadow-lg hover:shadow-purple-900/20' 
                                    : 'bg-slate-900/50 border-transparent opacity-50 cursor-not-allowed'
                                }`}
                            >
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg transition-colors ${isStoryComplete ? 'bg-purple-500/20 text-purple-400 group-hover:text-white group-hover:bg-purple-500' : 'bg-slate-800 text-slate-600'}`}>
                                            {isStoryComplete ? <InfinityIcon size={24} /> : <Lock size={24} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white">Endless Mode</h3>
                                            <p className="text-xs text-slate-400">
                                                {isStoryComplete ? "Survival challenge." : "Complete Story to unlock."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="mt-8 flex gap-3">
                             <button onClick={() => setShowPatchNotes(true)} className="flex-1 py-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-white/5 hover:border-white/20">
                                Updates
                             </button>
                             <button onClick={() => setGameState(GameState.HELP)} className="flex-1 py-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors border border-white/5 hover:border-white/20">
                                How to Play
                             </button>
                        </div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-[10px] text-slate-600 uppercase tracking-widest">Version {CURRENT_VERSION}</p>
                    </div>
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
              
              <h2 className="text-2xl font-bold text-white mb-2">New Update Available</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Sleigh Ride v{CURRENT_VERSION} brings polished graphics, new city environments, and a cinematic interface.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleViewUpdateNotes}
                  className="w-full py-3 bg-white text-slate-900 hover:bg-slate-200 rounded-xl font-bold transition-all transform hover:scale-[1.02]"
                >
                  View Patch Notes
                </button>
                <button 
                  onClick={handleDismissUpdate}
                  className="w-full py-3 text-slate-500 hover:text-slate-300 font-medium text-sm transition-colors"
                >
                  Dismiss
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
                          <Zap size={18} /> Visual Overhaul
                      </h3>
                      <ul className="space-y-2 text-slate-300 text-sm list-disc pl-5">
                          <li>Completely redesigned Title Screen with cinematic atmosphere.</li>
                          <li>New <strong>Level Environments</strong>: Distinct visuals for City, Mountains, and Ice Spikes.</li>
                          <li>Enhanced <strong>Parallax Scrolling</strong> for better depth perception.</li>
                          <li>Modernized <strong>HUD (Heads-Up Display)</strong> with glassmorphism effects.</li>
                      </ul>
                  </div>

                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                          <RefreshCw size={18} /> Gameplay Balancing
                      </h3>
                      <ul className="space-y-2 text-slate-300 text-sm list-disc pl-5">
                          <li>Increased <strong>Stamina Pool</strong> (approx 20 jumps).</li>
                          <li>Added <strong>Ground Recharge</strong>: Touching the ground restores stamina faster.</li>
                          <li>Adjusted obstacle spawning in the "Dark Metropolis" level.</li>
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

      {(gameState === GameState.PLAYING || gameState === GameState.GAME_OVER || gameState === GameState.VICTORY || gameState === GameState.BAD_ENDING || gameState === GameState.INTRO) && (
        <div className="fixed inset-0 z-0">
          <GameCanvas 
            gameState={gameState} 
            gameMode={gameMode}
            setGameState={(newState) => {
                 setGameState(newState);
            }} 
            onWin={handleWin}
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
                    onClick={() => handleStartClick(gameMode)}
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
