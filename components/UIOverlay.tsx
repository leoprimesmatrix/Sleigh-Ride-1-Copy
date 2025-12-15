
import React, { useEffect, useState } from 'react';
import { Heart, Snowflake, Clock, Zap, Sparkles, Plus, Mail, Skull, Battery, Activity } from 'lucide-react';
import { Player, PowerupType, DialogueLine, LetterVariant } from '../types.ts';
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
  stability
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
  const staminaPercent = (stamina / MAX_STAMINA) * 100;
  const stabilityPercent = (stability / INITIAL_STABILITY) * 100;
  const isStabilityLow = stabilityPercent < 30;
  
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none z-20">
      
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
                <h4 className={`font-bold uppercase text-sm tracking-[0.2em] mb-1 drop-shadow-md ${activeDialogue.speaker === 'Santa' ? 'text-red-400' : (activeDialogue.speaker === 'Control' ? 'text-blue-400' : 'text-yellow-400')}`}>
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
          {/* Lives */}
          <div className="flex items-center gap-1 p-2 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg w-fit">
            {[1, 2, 3].map((i) => (
                <div key={i} className="relative w-8 h-8">
                  {i <= lives ? (
                    <div className="text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse-slow">
                       <Heart fill="currentColor" size={32} />
                    </div>
                  ) : (
                     <div className="text-slate-600 opacity-50 scale-90 grayscale"><Heart fill="currentColor" size={32} /></div>
                  )}
                </div>
            ))}
          </div>

          {/* Route Stability Meter (New) */}
          <div className="bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-lg w-64">
             <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Activity size={14} className={isStabilityLow ? "text-red-500 animate-pulse" : "text-green-500"} />
                    Route Stability
                </div>
                <span className={`text-xs font-mono ${isStabilityLow ? "text-red-400" : "text-green-400"}`}>{Math.floor(stability)}%</span>
             </div>
             <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                 <div 
                    className={`h-full transition-all duration-300 ${isStabilityLow ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-green-600 to-green-400'}`}
                    style={{ width: `${stabilityPercent}%` }}
                 />
             </div>
          </div>

          {/* Reindeer Stamina Meter (New) */}
          <div className="bg-slate-900/60 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-lg w-64">
             <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                    <Battery size={14} className="text-yellow-500" />
                    Reindeer Stamina
                </div>
             </div>
             <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
                 <div 
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-100"
                    style={{ width: `${staminaPercent}%` }}
                 />
             </div>
          </div>
        </div>

        {/* CENTER: Level & Time */}
        <div className="flex flex-col items-center animate-fade-in-down">
          <div className="bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-lg border border-slate-700 text-yellow-300 font-mono text-xl tracking-widest shadow-lg">
             {formatTime(timeLeft)}
          </div>
          <div className="mt-2 text-center">
            <h2 className="text-white font-christmas text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wide text-stroke">
                {currentLevelName}
            </h2>
          </div>
        </div>

        {/* RIGHT: Active Powerups Status */}
        <div className="flex flex-col gap-2 animate-slide-in-right items-end">
             {/* Snowballs */}
             <div className="flex items-center gap-3 bg-cyan-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/30">
                <Snowflake size={20} className="text-cyan-300" />
                <span className="font-black text-xl text-cyan-100 tabular-nums">{snowballs}</span>
             </div>

             {/* Active Powerups Timer */}
             {activePowerups > 0 && (
                 <div className="flex items-center gap-2 bg-yellow-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-yellow-500/30 animate-pulse">
                     <Zap size={20} className="text-yellow-300" />
                     <span className="text-xs text-yellow-100 uppercase font-bold">Boost Active</span>
                 </div>
             )}
        </div>
      </div>

      {/* BOTTOM: Progress */}
      <div className="w-full max-w-3xl mx-auto mb-12 animate-slide-up z-10 opacity-80 hover:opacity-100 transition-opacity">
         <div className="h-3 bg-slate-800/80 rounded-full border border-slate-600/50 overflow-visible relative backdrop-blur-sm shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 bg-[length:50px_50px] animate-[shimmer_2s_linear_infinite] rounded-full shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all duration-200 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;
