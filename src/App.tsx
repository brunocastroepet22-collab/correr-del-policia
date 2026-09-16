import React, { useState } from 'react';
import { Flame, Gauge, ShieldAlert, Sparkles, Trophy, Layers } from 'lucide-react';
import { GameCanvas2D } from './components/GameCanvas2D';
import { GameCanvas3D } from './components/GameCanvas3D';

export default function App() {
  const [renderMode, setRenderMode] = useState<'2d' | '3d'>('2d');

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Top Navigation Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-amber-500 to-cyan-400 p-[2px] shadow-lg shadow-red-600/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Flame className="w-5 h-5 text-red-500 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg sm:text-xl tracking-tight text-white uppercase flex items-center gap-2">
                  Turbo Chase <span className="text-red-500">{renderMode.toUpperCase()}</span>
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 uppercase tracking-widest">
                  Persecución Policial
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Carrera arcade callejera • Patrullas policiales con sirenas • Nitro Turbo
              </p>
            </div>
          </div>

          {/* Mode Selector & Feature Highlights */}
          <div className="flex items-center gap-3">
            {/* 2D / 3D Switcher */}
            <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-700 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setRenderMode('2d')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  renderMode === '2d'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Modo 2D</span>
                <span className="text-[10px] font-mono opacity-80">(Fluido 60FPS)</span>
              </button>
              <button
                type="button"
                onClick={() => setRenderMode('3d')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  renderMode === '3d'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-900/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Modo 3D</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>345 KM/H</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nitro</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Stage */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 max-w-6xl w-full mx-auto">
        {renderMode === '2d' ? <GameCanvas2D /> : <GameCanvas3D />}

        {/* Quick Guide / Feature Cards */}
        <div className="w-full grid sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-slate-900/70 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-200">Sistema Turbo Nitro</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Presiona <strong>ESPACIO</strong> o el botón <strong>TURBO</strong> para propulsión a más de 340 km/h con llamaradas en los tubos de escape y líneas de velocidad.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-200">Patrullas y Takedown</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Sirenas y estrobos policiales. Si una patrulla intenta encerrarte, ¡activa el TURBO a fondo para embestirla y destruirla en mil pedazos!
              </p>
            </div>
          </div>

          <div className="bg-slate-900/70 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs uppercase text-slate-200">Rozadas y Recarga</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Pasa raspando los autos civiles y camiones a alta velocidad para ganar puntos extras de <em>Near Miss</em> y recargar tu tanque de Nitro al instante.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 text-center text-xs text-slate-500">
        Turbo Chase • Conducción Arcade 2D de Alta Velocidad (60 FPS) y Modo 3D Opcional
      </footer>
    </div>
  );
}
