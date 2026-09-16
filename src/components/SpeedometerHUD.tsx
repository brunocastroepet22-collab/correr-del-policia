import React from 'react';
import { Flame, ShieldAlert, Zap } from 'lucide-react';
import { GameStatus, PlayerCarState } from '../types';

interface SpeedometerHUDProps {
  playerState: PlayerCarState;
  gameStatus: GameStatus;
  cameraMode: string;
  onToggleCamera: () => void;
  notification: { text: string; type: 'turbo' | 'takedown' | 'nearmiss' | 'warning' } | null;
}

export const SpeedometerHUD: React.FC<SpeedometerHUDProps> = ({
  playerState,
  gameStatus,
  cameraMode,
  onToggleCamera,
  notification,
}) => {
  const speed = Math.round(playerState.speed);
  const nitro = Math.round(playerState.nitroAmount);
  const health = Math.round(playerState.health);

  // Speedometer needle angle (-120 to 120 degrees)
  const needleAngle = -120 + (speed / 340) * 240;

  // Health color
  const healthColor =
    health > 60 ? 'bg-emerald-500 text-emerald-400' : health > 30 ? 'bg-amber-500 text-amber-400' : 'bg-red-600 text-red-400';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none font-sans overflow-hidden">
      {/* ------------------------------------------------------------- */}
      {/* TOP BAR: HEAT LEVEL, DISTANCE, SCORE, REARVIEW MIRROR         */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-start justify-between w-full gap-2">
        {/* Heat Level & Wanted Stars */}
        <div className="flex flex-col bg-slate-950/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
              Nivel de Búsqueda
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`text-base transition-all duration-300 ${
                  star <= gameStatus.heatLevel
                    ? 'text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                    : 'text-slate-600 opacity-40'
                }`}
              >
                ★
              </span>
            ))}
            <span className="ml-2 text-xs font-mono font-bold text-red-400">
              {gameStatus.heatLevel === 1 && 'Patrulla'}
              {gameStatus.heatLevel === 2 && 'Sirenas'}
              {gameStatus.heatLevel === 3 && 'Persecución'}
              {gameStatus.heatLevel === 4 && 'Bloqueos'}
              {gameStatus.heatLevel >= 5 && 'Intercepción'}
            </span>
          </div>
        </div>

        {/* Center: REARVIEW RADAR / RETRO MIRROR */}
        <div className="hidden sm:flex flex-col items-center bg-slate-950/85 backdrop-blur-md px-5 py-1.5 rounded-xl border border-slate-700 shadow-2xl">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Retrovisor • Radar Policial</span>
          </div>
          <div className="w-44 h-8 bg-slate-900/90 rounded border border-slate-700 flex items-center justify-center relative overflow-hidden mt-1">
            {/* Road lines inside mirror */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-slate-700 border-dashed" />
            {/* Player mark */}
            <div className="w-3 h-4 bg-sky-400 rounded-sm shadow-sm z-10" />
            {/* Police chasing indicator */}
            {gameStatus.heatLevel >= 2 && (
              <div className="absolute right-4 w-3.5 h-3.5 bg-red-500 rounded-sm animate-bounce flex items-center justify-center text-[8px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.9)]">
                POL
              </div>
            )}
          </div>
        </div>

        {/* Right: Distance & Score */}
        <div className="flex flex-col items-end bg-slate-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Distancia</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            {gameStatus.distance} <span className="text-xs text-slate-300 font-sans">m</span>
          </div>
          <div className="text-[11px] font-mono text-slate-300 mt-0.5">
            Puntaje: <span className="font-bold text-emerald-400">{gameStatus.score}</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FLOATING ACTION NOTIFICATION BANNER (TURBO / TAKEDOWN)        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex justify-center w-full">
        {notification && (
          <div
            className={`px-5 py-2 rounded-full shadow-2xl backdrop-blur-md border text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 animate-bounce ${
              notification.type === 'turbo'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                : notification.type === 'takedown'
                ? 'bg-red-500/25 text-red-300 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]'
                : notification.type === 'nearmiss'
                ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-400'
            }`}
          >
            {notification.type === 'turbo' && <Flame className="w-4 h-4 text-cyan-400 animate-spin" />}
            {notification.type === 'takedown' && <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />}
            {notification.type === 'nearmiss' && <Zap className="w-4 h-4 text-amber-400" />}
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BOTTOM HUD: SPEEDOMETER, NITRO BAR, DURABILITY, CAM TOGGLE    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex items-end justify-between w-full gap-3">
        {/* Left: Vehicle Health & Durability */}
        <div className="flex flex-col bg-slate-950/80 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-xl pointer-events-auto max-w-[150px] sm:max-w-[180px]">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 mb-1">
            <span>DAÑO / SALUD</span>
            <span className={healthColor.split(' ')[1]}>{health}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-200 ${healthColor.split(' ')[0]}`}
              style={{ width: `${health}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
            <span>Cámara:</span>
            <button
              type="button"
              onClick={onToggleCamera}
              className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors uppercase pointer-events-auto"
            >
              {cameraMode === 'third_person' ? 'Persecución' : cameraMode === 'close' ? 'Cerca' : 'Capó'}
            </button>
          </div>
        </div>

        {/* Right: SPEEDOMETER & NITRO GAUGE */}
        <div className="flex items-end gap-3 pointer-events-auto">
          {/* NITRO GAUGE */}
          <div className="flex flex-col items-center bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-slate-800 shadow-2xl">
            <div className="flex items-center gap-1 text-[11px] font-black text-cyan-400 uppercase tracking-wider mb-1.5">
              <Flame className={`w-4 h-4 ${playerState.isNitroActive ? 'animate-pulse text-cyan-300' : 'text-cyan-500'}`} />
              <span>NITRO</span>
            </div>

            {/* Vertical Nitro Tank / Bar */}
            <div className="w-7 h-24 sm:h-28 bg-slate-900 rounded-lg p-1 border border-slate-700 flex flex-col justify-end relative overflow-hidden">
              <div
                className={`w-full rounded transition-all duration-150 ${
                  playerState.isNitroActive
                    ? 'bg-gradient-to-t from-cyan-600 via-sky-400 to-white shadow-[0_0_15px_rgba(56,189,248,1)]'
                    : 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                }`}
                style={{ height: `${nitro}%` }}
              />
              {playerState.isNitroActive && (
                <div className="absolute inset-0 bg-cyan-400/20 animate-pulse pointer-events-none" />
              )}
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300 mt-1">{nitro}%</span>
          </div>

          {/* MAIN SPEEDOMETER DIAL */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 bg-slate-950/90 backdrop-blur-md rounded-full border-2 border-slate-700 shadow-2xl flex items-center justify-center p-2">
            {/* Speedometer Arc Markers */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                fill="none"
                stroke="#1e293b"
                strokeWidth="6"
                strokeDasharray="210 100"
              />
              <circle
                cx="50%"
                cy="50%"
                r="42%"
                fill="none"
                stroke={playerState.isNitroActive ? '#38bdf8' : speed > 220 ? '#ef4444' : '#f59e0b'}
                strokeWidth="6"
                strokeDasharray={`${(speed / 340) * 210} 300`}
                strokeLinecap="round"
                className="transition-all duration-100"
              />
            </svg>

            {/* Needle */}
            <div
              className="absolute w-1 h-14 bg-red-500 origin-bottom rounded-full shadow-[0_0_8px_rgba(239,68,68,0.9)] transition-transform duration-75"
              style={{
                transform: `rotate(${needleAngle}deg)`,
                bottom: '50%',
              }}
            />
            {/* Needle Center Pin */}
            <div className="absolute w-3.5 h-3.5 bg-white rounded-full shadow border border-slate-900 z-10" />

            {/* Digital Speed Reading */}
            <div className="flex flex-col items-center justify-center z-10 translate-y-4">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tighter ${
                  playerState.isNitroActive
                    ? 'text-cyan-300 drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]'
                    : 'text-white'
                }`}
              >
                {speed}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest -mt-1">
                KM/H
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">
                {speed > 280 ? 'MARCHA 6' : speed > 220 ? 'MARCHA 5' : speed > 150 ? 'MARCHA 4' : speed > 90 ? 'MARCHA 3' : speed > 40 ? 'MARCHA 2' : 'MARCHA 1'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
