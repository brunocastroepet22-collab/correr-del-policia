import React from 'react';
import { Award, Flame, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { GameStatus } from '../types';

interface GameOverModalProps {
  reason: 'busted' | 'wrecked';
  status: GameStatus;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ reason, status, onRestart }) => {
  const isBusted = reason === 'busted';

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow Header */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full blur-3xl opacity-50 ${
            isBusted ? 'bg-red-600' : 'bg-amber-600'
          }`}
        />

        {/* Status Badge */}
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl border-2 ${
            isBusted
              ? 'bg-red-600/20 border-red-500 text-red-400'
              : 'bg-amber-600/20 border-amber-500 text-amber-400'
          }`}
        >
          {isBusted ? <ShieldAlert className="w-8 h-8 animate-bounce" /> : <Flame className="w-8 h-8" />}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mb-1">
          {isBusted ? '¡Arrestado por la Policía!' : '¡Vehículo Destruido!'}
        </h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          {isBusted
            ? 'Las patrullas te alcanzaron y bloquearon el paso. ¡Necesitas más TURBO la próxima vez!'
            : 'Los impactos acabaron con la durabilidad de tu auto a alta velocidad.'}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 w-full mb-6 text-left">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-bold">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Distancia</span>
            </div>
            <div className="text-xl font-mono font-black text-amber-400 mt-0.5">
              {status.distance} <span className="text-xs font-sans text-slate-300">metros</span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-bold">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Puntaje Total</span>
            </div>
            <div className="text-xl font-mono font-black text-emerald-400 mt-0.5">{status.score}</div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Patrullas Burladas</span>
            </div>
            <div className="text-xl font-mono font-black text-red-400 mt-0.5">
              {status.copsEvaded}
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 uppercase font-bold">
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
              <span>Rozadas de Riesgo</span>
            </div>
            <div className="text-xl font-mono font-black text-cyan-400 mt-0.5">
              {status.nearMisses}
            </div>
          </div>
        </div>

        {/* Restart Button */}
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-98 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Volver a la Pista</span>
        </button>
      </div>
    </div>
  );
};
