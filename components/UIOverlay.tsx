
import React, { useEffect, useState } from 'react';
import { Heart, Snowflake, Clock, Zap, Sparkles, Plus, Mail, Skull, Battery, Activity, Target } from 'lucide-react';
import { Player, PowerupType, DialogueLine, LetterVariant, MissionType } from '../types.ts';
import { POWERUP_COLORS, REQUIRED_WISHES, MAX_STAMINA, INITIAL_STABILITY } from '../constants.ts';

interface UIOverlayProps {
  lives: number;
  snowballs: number;
  progress: number;
  timeLeft: number;
  activePowerups: Player['speedTimer'] | Player['healingTimer'];
  currentLevelName: string;
  score: number;
  collectedPowerups: { id: number; type: PowerupType }[];
  activeDialogue: DialogueLine | null;
  activeWish: { message: string, variant: LetterVariant } | null;
  wishesCollected: number;
  stamina: number;
  stability: number;
  mission?: {
      type: MissionType;
      progress: number;
      target: number;
      objective: string;
  };
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  lives,
  snowballs,
  progress,
  timeLeft,
  currentLevelName,
  activePowerups,
  score,
  collectedPowerups,
  activeDialogue,
  activeWish,
  wishesCollected,
  stamina,
  stability,
  mission
}) => {
  
  const [popups, setPopups] = useState<{id: number, type: PowerupType}[]>([]);

  useEffect(() => {
    if (collectedPowerups.length > 0) {
      setPopups(prev => [...prev, ...collectedPowerups]);
    }
  }, [collectedPowerups]);

  const handleAnimationEnd = (id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const getPowerupConfig = (type: PowerupType) => {
      switch (type) {
          case PowerupType.SPEED: return { icon: Zap, label: "SPEED UP!", color: POWERUP_COLORS[type] };
          case PowerupType.SNOWBALLS: return { icon: Snowflake, label: "AMMO!", color: POWERUP_COLORS[type] };
          case PowerupType.BLAST: return { icon: Sparkles, label: "BLAST!", color: POWERUP_COLORS[type] };
          case PowerupType.HEALING: return { icon: Plus, label: "STABILIZED!", color: POWERUP_COLORS[type] };
          case PowerupType.LIFE: return { icon: Heart, label: "EXTRA LIFE!", color: POWERUP_COLORS[type] };
          default: return { icon: Zap, label: "POWERUP!", color: "#fff" };
      }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Calculations for bars
  const staminaPercent = Math.min(100, (stamina / MAX_STAMINA) * 100);
  const isStaminaLow = staminaPercent < 25;
  const stabilityPercent = Math.min(100, (stability / INITIAL_STABILITY) * 100);
  const isStabilityLow = stabilityPercent < 30;
  
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none z-20">
      
      <style>{`
        @keyframes flash-red {
            0%, 100% { border-color: rgba(239, 68, 68, 0.3); box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
            50% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
        }
        .animate-flash-red {
            animation: flash-red 0.5s infinite;
        }
      `}</style>

      {/* Powerup Popups */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {popups.map(p => {
            const { icon: Icon, label, color } = getPowerupConfig(p.type);
            return (
                <div 
                    key={p.id} 
                    className="absolute animate-powerup-pop flex flex-col items-center justify-center"
                    onAnimationEnd={() => handleAnimationEnd(p.id)}
                >
                    <div className="p-4 rounded-full bg-white/10 backdrop-blur-md shadow-[0_0_30px_currentColor] border-2 border-white/50 mb-2" style={{ color: color }}>
                        <Icon size={48} strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-2xl uppercase tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-stroke" style={{ color: color }}>{label}</span>
                </div>
            );
        })}
      </div>

      {/* Active Wish / Stabilizer Msg */}
      {activeWish && (
          <div className="absolute top-28 right-4 flex flex-col items-end animate-slide-in-right z-30">
             <div className="pl-4 pr-6 py-2 rounded-l-full shadow-xl border-l-4 backdrop-blur-sm max-w-xs text-right flex items-center gap-3 bg-amber-100/95 text-amber-900 border-amber-400">
                 <div className="p-2 rounded-full bg-amber-200/50">
                    <Mail size={18} className="text-amber-700" />
                 </div>
                 <div className="flex flex-col">
                     <span className="text-[10px] uppercase tracking-widest font-bold text-amber-600/70">
                        Stabilizer Collected
                     </span>
                     <p className="font-christmas text-lg leading-tight italic">"{activeWish.message}"</p>
                 </div>
             </div>
          </div>
      )}

      {/* Active Dialogue */}
      {activeDialogue && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent pb-8 pt-12 flex justify-center animate-slide-up z-20">
             <div className="flex flex-col items-center text-center max-w-3xl px-4">
                <h4 className={`font-bold uppercase text-xs tracking-[0.2em] mb-1 drop-shadow-md py-1 px-3 rounded-full bg-black/40 border border-white/10 ${activeDialogue.speaker === 'Santa' ? 'text-red-400' : (activeDialogue.speaker === 'Control' ? 'text-blue-400' : 'text-yellow-400')}`}>
                    {activeDialogue.speaker}
                </h4>
                <p className="text-2xl text-white font-mono tracking-wide leading-snug drop-shadow-lg text-shadow-black">
                    "{activeDialogue.text}"
                </p>
             </div>
          </div>
      )}

      {/* HUD HEADER */}
      <div className="flex items-start justify-between w-full z-10">
        
        {/* LEFT: Stats */}
        <div className="flex flex-col gap-3 animate-slide-in-left">
          {/* Lives & Ammo Cluster */}
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 p-2 bg-slate-900/40 backdrop-blur-md rounded-xl border border-white/5 shadow-lg">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="relative w-6 h-6">
                    {i <= lives ? (
                        <div className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse-slow">
                        <Heart fill="currentColor" size={24} />
                        </div>
                    ) : (
                        <div className="text-slate-600 opacity-50 scale-90 grayscale"><Heart fill="currentColor" size={24} /></div>
                    )}
                    </div>
                ))}
             </div>
             
             <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-md px-3 py-2 rounded-xl border border-white/5">
                <Snowflake size={16} className="text-cyan-300" />
                <span className="font-bold text-cyan-100 tabular-nums">{snowballs}</span>
             </div>
          </div>

          {/* Route Stability Meter */}
          <div className="bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/50 shadow-lg w-56 flex flex-col gap-1">
             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-1">
                    <Activity size={10} className={isStabilityLow ? "text-red-500 animate-pulse" : "text-green-500"} />
                    Route Stability
                </div>
                <span className={isStabilityLow ? "text-red-400" : "text-green-400"}>{Math.floor(stability)}%</span>
             </div>
             <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full transition-all duration-300 ${isStabilityLow ? 'bg-red-500 animate-pulse shadow-[0_0_10px_red]' : 'bg-green-500'}`}
                    style={{ width: `${stabilityPercent}%` }}
                 />
             </div>
          </div>

          {/* Reindeer Stamina Meter */}
          <div className={`bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-xl border shadow-lg w-56 flex flex-col gap-1 transition-all ${isStaminaLow ? 'border-red-500 animate-flash-red' : 'border-slate-700/50'}`}>
             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <div className="flex items-center gap-1">
                    <Battery size={10} className={isStaminaLow ? "text-red-500 animate-pulse" : "text-yellow-500"} />
                    Stamina
                </div>
             </div>
             <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full transition-all duration-100 ${isStaminaLow ? 'bg-red-500' : 'bg-yellow-400'}`}
                    style={{ width: `${staminaPercent}%` }}
                 />
             </div>
          </div>
        </div>

        {/* CENTER: Mission Info */}
        <div className="flex flex-col items-center animate-fade-in-down">
          <div className="bg-black/40 backdrop-blur-md px-4 py-1 rounded-full border border-white/5 text-yellow-300 font-mono text-xl tracking-widest shadow-lg mb-1">
             {formatTime(timeLeft)}
          </div>
          <div className="text-center">
            <h2 className="text-white font-christmas text-2xl drop-shadow-md text-stroke tracking-wide opacity-90">
                {currentLevelName}
            </h2>
          </div>
          
          {/* Mission Objective HUD */}
          {mission && mission.type !== 'SURVIVE' && (
              <div className="mt-2 bg-blue-900/40 backdrop-blur-md px-4 py-2 rounded-lg border border-blue-500/30 flex items-center gap-3">
                  <div className="p-1.5 bg-blue-500/20 rounded-full">
                      <Target size={14} className="text-blue-300" />
                  </div>
                  <div className="flex flex-col items-start">
                      <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Mission Objective</span>
                      <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{mission.objective}</span>
                          <span className={`text-xs font-mono font-bold ${mission.progress >= mission.target ? 'text-green-400' : 'text-yellow-400'}`}>
                              {Math.floor(mission.progress)} / {mission.target}
                          </span>
                      </div>
                  </div>
              </div>
          )}
        </div>

        {/* RIGHT: Objectives & Buffs */}
        <div className="flex flex-col gap-2 animate-slide-in-right items-end w-56">
             <div className="bg-slate-900/60 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/50 shadow-lg w-full">
                 <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    <span>Wishes Collected</span>
                    <span className="text-amber-400">{wishesCollected} / {REQUIRED_WISHES}</span>
                 </div>
                 <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-amber-400 shadow-[0_0_10px_orange]"
                        style={{ width: `${Math.min(100, (wishesCollected/REQUIRED_WISHES)*100)}%` }}
                     />
                 </div>
             </div>

             {/* Active Powerups Timer */}
             {activePowerups > 0 && (
                 <div className="flex items-center gap-2 bg-yellow-900/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-500/30 animate-pulse mt-2">
                     <Zap size={14} className="text-yellow-300" />
                     <span className="text-[10px] text-yellow-100 uppercase font-bold tracking-wider">Boost Active</span>
                 </div>
             )}
        </div>
      </div>

      {/* BOTTOM: Progress */}
      <div className="w-full max-w-4xl mx-auto mb-8 animate-slide-up z-10 opacity-90">
         <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-widest px-2">
             <span>Start</span>
             <span>Destination</span>
         </div>
         <div className="h-2 bg-slate-800/80 rounded-full border border-slate-600/30 overflow-hidden backdrop-blur-sm relative">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-white/80 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.5)] transition-all duration-200 ease-linear relative"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_5px_white]"></div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;
