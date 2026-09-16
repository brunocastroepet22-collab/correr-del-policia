import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Flame } from 'lucide-react';

interface TouchControlsProps {
  onSteerLeft: (active: boolean) => void;
  onSteerRight: (active: boolean) => void;
  onAccelerate: (active: boolean) => void;
  onBrake: (active: boolean) => void;
  onTurbo: (active: boolean) => void;
  onToggleCamera: () => void;
  isNitroActive: boolean;
  nitroAmount: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onSteerLeft,
  onSteerRight,
  onAccelerate,
  onBrake,
  onTurbo,
  onToggleCamera,
  isNitroActive,
  nitroAmount,
}) => {
  return (
    <div className="w-full max-w-4xl flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl select-none">
      {/* STEERING (LEFT / RIGHT) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onSteerLeft(true);
          }}
          onPointerUp={() => onSteerLeft(false)}
          onPointerCancel={() => onSteerLeft(false)}
          onPointerLeave={() => onSteerLeft(false)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-sky-600 border-2 border-slate-700 active:border-sky-400 text-slate-100 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
          title="Girar Izquierda (A / Flecha Izq)"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-[9px] font-mono text-slate-400 mt-0.5">IZQ</span>
        </button>

        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onSteerRight(true);
          }}
          onPointerUp={() => onSteerRight(false)}
          onPointerCancel={() => onSteerRight(false)}
          onPointerLeave={() => onSteerRight(false)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-sky-600 border-2 border-slate-700 active:border-sky-400 text-slate-100 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
          title="Girar Derecha (D / Flecha Der)"
        >
          <ArrowRight className="w-6 h-6" />
          <span className="text-[9px] font-mono text-slate-400 mt-0.5">DER</span>
        </button>
      </div>

      {/* CENTER: KEYBOARD HINTS & CAMERA SWITCH */}
      <div className="hidden md:flex flex-col items-center text-center gap-1">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-amber-300 font-bold">
            W / ↑
          </span>
          <span>Acelerar</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-300 font-bold">
            ESPACIO
          </span>
          <span>Turbo</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-red-300 font-bold">
            S / ↓
          </span>
          <span>Frenar</span>
        </div>
        <span className="text-[10px] text-slate-500">
          ¡Conduce esquivando autos civiles y huye de la policía con TURBO!
        </span>
      </div>

      {/* ACTION PEDALS & TURBO BUTTON */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* CAMERA TOGGLE */}
        <button
          type="button"
          onClick={onToggleCamera}
          className="w-11 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-colors"
          title="Cambiar Cámara (C)"
        >
          <Camera className="w-5 h-5" />
        </button>

        {/* BRAKE PEDAL */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onBrake(true);
          }}
          onPointerUp={() => onBrake(false)}
          onPointerCancel={() => onBrake(false)}
          onPointerLeave={() => onBrake(false)}
          className="w-13 h-14 sm:w-14 sm:h-16 rounded-2xl bg-red-950/80 hover:bg-red-900 active:bg-red-700 border-2 border-red-800/80 text-red-200 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
          title="Freno (S / Flecha Abajo)"
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[9px] font-mono font-bold mt-0.5">FRENO</span>
        </button>

        {/* GAS / ACCELERATE PEDAL */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onAccelerate(true);
          }}
          onPointerUp={() => onAccelerate(false)}
          onPointerCancel={() => onAccelerate(false)}
          onPointerLeave={() => onAccelerate(false)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 active:bg-emerald-600 border-2 border-emerald-700 text-emerald-200 flex flex-col items-center justify-center shadow-lg transition-transform active:scale-95 touch-none"
          title="Acelerar (W / Flecha Arriba)"
        >
          <ArrowUp className="w-6 h-6" />
          <span className="text-[9px] font-mono font-bold mt-0.5">GAS</span>
        </button>

        {/* NITRO TURBO BUTTON */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            onTurbo(true);
          }}
          onPointerUp={() => onTurbo(false)}
          onPointerCancel={() => onTurbo(false)}
          onPointerLeave={() => onTurbo(false)}
          disabled={nitroAmount <= 5}
          className={`w-16 h-14 sm:w-20 sm:h-16 rounded-2xl flex flex-col items-center justify-center font-black text-xs shadow-xl transition-all active:scale-95 touch-none border-2 ${
            isNitroActive
              ? 'bg-cyan-500 border-white text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.9)] animate-pulse'
              : nitroAmount > 5
              ? 'bg-gradient-to-tr from-cyan-600 to-sky-400 hover:from-cyan-500 hover:to-sky-300 border-cyan-300 text-slate-950 shadow-md'
              : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
          }`}
          title="TURBO NITRO (Barra Espaciadora)"
        >
          <Flame className={`w-5 h-5 ${isNitroActive ? 'animate-spin' : ''}`} />
          <span className="tracking-wider text-[10px]">TURBO</span>
        </button>
      </div>
    </div>
  );
};
