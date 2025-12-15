
import React from 'react';
import { Play, ArrowLeft, Star } from 'lucide-react';
import { LEVELS } from '../constants.ts';

interface LevelCompleteScreenProps {
  levelIndex: number;
  onNextLevel: () => void;
  onMenu: () => void;
  score: number;
}

const LevelCompleteScreen: React.FC<LevelCompleteScreenProps> = ({ levelIndex, onNextLevel, onMenu, score }) => {
  const level = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1];

  return (
    <div className="absolute inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center animate-fade-in p-6">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-8 max-w-2xl w-full">
        
        <div className="space-y-2 animate-slide-up">
            <h2 className="text-xl md:text-2xl text-green-400 font-bold tracking-[0.3em] uppercase">Mission Success</h2>
            <h1 className="text-4xl md:text-6xl font-christmas text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                Level {levelIndex + 1} Complete!
            </h1>
        </div>

        <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700 backdrop-blur-md w-full animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-700 pb-4">
                    <span className="text-slate-400 uppercase tracking-widest text-sm">Zone Cleared</span>
                    <span className="text-xl font-bold text-white">{level.name}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-400 uppercase tracking-widest text-sm">Score</span>
                    <span className="text-2xl font-mono text-yellow-400 font-bold">{Math.floor(score).toLocaleString()}</span>
                </div>
                <div className="flex justify-center gap-2 mt-2">
                    {[1, 2, 3].map(i => (
                        <Star key={i} className="text-yellow-400 fill-yellow-400 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <button 
                onClick={onMenu}
                className="px-8 py-4 bg-transparent border border-slate-600 text-slate-300 rounded-full font-bold text-lg hover:border-white hover:text-white transition-all flex items-center justify-center gap-2"
            >
                <ArrowLeft size={20} /> Title Screen
            </button>
            
            {nextLevel && (
                <button 
                    onClick={onNextLevel}
                    className="px-8 py-4 bg-green-600 text-white rounded-full font-bold text-lg hover:bg-green-500 hover:scale-105 transition-all shadow-[0_0_20px_rgba(22,163,74,0.4)] flex items-center justify-center gap-2"
                >
                    Next Level: {nextLevel.name} <Play size={20} fill="currentColor" />
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default LevelCompleteScreen;
