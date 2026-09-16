import React, { useEffect, useRef, useState } from 'react';
import { Camera, Palette, RefreshCw, Volume2, VolumeX, Gauge, ArrowLeft, ArrowRight } from 'lucide-react';
import { racingAudio } from '../audio';
import { CameraView, GameStatus, PlayerCarState } from '../types';
import { GameEngine } from '../three/gameEngine';
import { GameOverModal } from './GameOverModal';
import { SpeedometerHUD } from './SpeedometerHUD';
import { TouchControls } from './TouchControls';

const CAR_COLORS = [
  { name: 'Rojo Furia', hex: 0xdc2626, bg: 'bg-red-600' },
  { name: 'Cian Neón', hex: 0x06b6d4, bg: 'bg-cyan-500' },
  { name: 'Amarillo Nitro', hex: 0xf59e0b, bg: 'bg-amber-500' },
  { name: 'Púrpura Noche', hex: 0x9333ea, bg: 'bg-purple-600' },
  { name: 'Verde Veneno', hex: 0x10b981, bg: 'bg-emerald-500' },
];

export const GameCanvas3D: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [soundOn, setSoundOn] = useState(true);
  const [autoCruise, setAutoCruise] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  const [selectedColor, setSelectedColor] = useState(CAR_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraView>('third_person');

  const [playerState, setPlayerState] = useState<PlayerCarState>({
    x: 0,
    z: 0,
    speed: 100,
    targetSpeed: 100,
    steerAngle: 0,
    nitroAmount: 100,
    isNitroActive: false,
    health: 100,
    isBraking: false,
    isAccelerating: true,
  });

  const [gameStatus, setGameStatus] = useState<GameStatus>({
    state: 'racing',
    distance: 0,
    score: 0,
    heatLevel: 1,
    copsEvaded: 0,
    nearMisses: 0,
    timeRemaining: 120,
    elapsedTime: 0,
  });

  const [notification, setNotification] = useState<{
    text: string;
    type: 'turbo' | 'takedown' | 'nearmiss' | 'warning';
  } | null>(null);

  const notifyTimeoutRef = useRef<number | null>(null);

  const showNotification = (
    text: string,
    type: 'turbo' | 'takedown' | 'nearmiss' | 'warning'
  ) => {
    if (notifyTimeoutRef.current) clearTimeout(notifyTimeoutRef.current);
    setNotification({ text, type });
    notifyTimeoutRef.current = window.setTimeout(() => {
      setNotification(null);
    }, 1800);
  };

  // ---------------------------------------------------------------------------
  // INITIALIZE 3D THREE.JS ENGINE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(
      containerRef.current,
      {
        onUpdateStats: (stats, pState) => {
          setGameStatus({ ...stats });
          setPlayerState({ ...pState });
        },
        onNearMiss: (pts) => {
          showNotification(`¡ROZADA PELIGROSA! +${pts} PTS & +NITRO`, 'nearmiss');
        },
        onCopTakedown: (pts) => {
          showNotification(`¡PATRULLA DESTRUIDA! +${pts} PTS`, 'takedown');
        },
        onCrash: (dmg) => {
          showNotification(`¡IMPACTO! -${dmg}% SALUD`, 'warning');
        },
        onGameOver: (reason) => {
          setGameStatus((prev) => ({ ...prev, state: reason }));
        },
      },
      selectedColor.hex
    );

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // KEYBOARD CONTROLS (WASD, ARROWS, SPACE, SHIFT, C, R)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      const engine = engineRef.current;
      if (!engine) return;

      // Prevent scrolling
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(k) || code === 'Space') {
        e.preventDefault();
      }

      if (k === 'arrowleft' || k === 'a') {
        engine.input.left = true;
        setActiveSide('left');
      }
      if (k === 'arrowright' || k === 'd') {
        engine.input.right = true;
        setActiveSide('right');
      }
      if (k === 'arrowup' || k === 'w') engine.input.accelerate = true;
      if (k === 'arrowdown' || k === 's' || k === 'shift') engine.input.brake = true;
      if (code === 'Space' || k === ' ' || k === 'f') {
        engine.input.turbo = true;
      }

      // Camera toggle
      if (k === 'c') {
        handleToggleCamera();
      }

      // Restart
      if (k === 'r' && (engine.gameStatus.state === 'busted' || engine.gameStatus.state === 'wrecked')) {
        handleRestart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      const engine = engineRef.current;
      if (!engine) return;

      if (k === 'arrowleft' || k === 'a') {
        engine.input.left = false;
        setActiveSide((prev) => (prev === 'left' ? null : prev));
      }
      if (k === 'arrowright' || k === 'd') {
        engine.input.right = false;
        setActiveSide((prev) => (prev === 'right' ? null : prev));
      }
      if (k === 'arrowup' || k === 'w') engine.input.accelerate = false;
      if (k === 'arrowdown' || k === 's' || k === 'shift') engine.input.brake = false;
      if (code === 'Space' || k === ' ' || k === 'f') engine.input.turbo = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleToggleCamera = () => {
    if (!engineRef.current) return;
    const modes: CameraView[] = ['third_person', 'close', 'hood'];
    const next = modes[(modes.indexOf(engineRef.current.cameraMode) + 1) % modes.length];
    engineRef.current.cameraMode = next;
    setCameraMode(next);
  };

  const handleRestart = () => {
    if (!engineRef.current) return;
    engineRef.current.restart();
    setGameStatus({ ...engineRef.current.gameStatus });
    setPlayerState({ ...engineRef.current.playerState });
  };

  const handleColorChange = (col: (typeof CAR_COLORS)[0]) => {
    setSelectedColor(col);
    if (engineRef.current) {
      engineRef.current.setCarColor(col.hex);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    racingAudio.soundEnabled = next;
    if (!next) {
      racingAudio.stopEngine();
      racingAudio.setSiren(false);
    }
  };

  const toggleAutoCruise = () => {
    const next = !autoCruise;
    setAutoCruise(next);
    if (engineRef.current) {
      engineRef.current.autoCruise = next;
    }
    showNotification(
      next ? 'Acelerador Crucero: ACTIVADO (130 km/h)' : 'Acelerador Manual: ACTIVO (Presiona GAS)',
      'nearmiss'
    );
  };

  // ---------------------------------------------------------------------------
  // DIRECT CANVAS POINTER & TOUCH STEERING
  // ---------------------------------------------------------------------------
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine) return;

    setHasInteracted(true);
    racingAudio.init();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width; // 0 to 1
    const laneX = (relX - 0.5) * 15; // -7.5 to +7.5
    engine.setSteerTarget(laneX);

    if (relX < 0.45) {
      engine.input.left = true;
      engine.input.right = false;
      setActiveSide('left');
    } else if (relX > 0.55) {
      engine.input.right = true;
      engine.input.left = false;
      setActiveSide('right');
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const engine = engineRef.current;
    if (!engine || !e.buttons) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const laneX = (relX - 0.5) * 15;
    engine.setSteerTarget(laneX);

    if (relX < 0.45) {
      engine.input.left = true;
      engine.input.right = false;
      setActiveSide('left');
    } else if (relX > 0.55) {
      engine.input.right = true;
      engine.input.left = false;
      setActiveSide('right');
    } else {
      engine.input.left = false;
      engine.input.right = false;
      setActiveSide(null);
    }
  };

  const handleCanvasPointerUp = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.input.left = false;
    engine.input.right = false;
    engine.setSteerTarget(null);
    setActiveSide(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl gap-3 select-none">
      {/* Action Strip: Sound, Auto-Cruise Toggle, Garage Color, Cam Toggle, Reset */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{soundOn ? 'Sonido 3D' : 'Silencio'}</span>
          </button>

          {/* Auto-Cruise Toggle */}
          <button
            type="button"
            onClick={toggleAutoCruise}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
              autoCruise
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Acelerador crucero automático a 130 km/h"
          >
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>{autoCruise ? 'Crucero: Auto' : 'Crucero: Manual'}</span>
          </button>

          {/* Car Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Palette className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">{selectedColor.name}</span>
              <span className={`w-3 h-3 rounded-full ${selectedColor.bg} border border-white/50`} />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex gap-2 z-50 animate-in fade-in">
                {CAR_COLORS.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => {
                      handleColorChange(col);
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-lg ${col.bg} border-2 ${
                      selectedColor.hex === col.hex ? 'border-white scale-110 shadow-lg' : 'border-slate-700'
                    } transition-transform hover:scale-105`}
                    title={col.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Cambiar Modo de Cámara (C)"
          >
            <Camera className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">
              Cámara: {cameraMode === 'third_person' ? 'Persecución' : cameraMode === 'close' ? 'Cerca' : 'Capó'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold transition-colors shadow"
            title="Reiniciar Carrera (R)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container with Interactive Steering */}
      <div
        className="relative w-full h-[480px] sm:h-[580px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl touch-none cursor-ew-resize"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onPointerLeave={handleCanvasPointerUp}
      >
        {/* Three.js canvas mounts here */}
        <div ref={containerRef} className="w-full h-full" />

        {/* Steering Left Overlay Zone Button */}
        <div
          className={`absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center p-3 rounded-2xl transition-all pointer-events-none ${
            activeSide === 'left'
              ? 'bg-sky-500/40 border-2 border-sky-400 scale-110 shadow-[0_0_20px_rgba(56,189,248,0.6)]'
              : 'bg-black/30 border border-white/20'
          }`}
        >
          <ArrowLeft className={`w-7 h-7 ${activeSide === 'left' ? 'text-sky-300 animate-pulse' : 'text-white/80'}`} />
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-1">Izquierda</span>
        </div>

        {/* Steering Right Overlay Zone Button */}
        <div
          className={`absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center justify-center p-3 rounded-2xl transition-all pointer-events-none ${
            activeSide === 'right'
              ? 'bg-sky-500/40 border-2 border-sky-400 scale-110 shadow-[0_0_20px_rgba(56,189,248,0.6)]'
              : 'bg-black/30 border border-white/20'
          }`}
        >
          <ArrowRight className={`w-7 h-7 ${activeSide === 'right' ? 'text-sky-300 animate-pulse' : 'text-white/80'}`} />
          <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider mt-1">Derecha</span>
        </div>

        {/* Initial First-Time Driving Hint */}
        {!hasInteracted && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/90 border border-cyan-500/60 px-4 py-2 rounded-full text-xs font-bold text-cyan-300 shadow-xl flex items-center gap-2 animate-bounce">
            <span>¡Auto en marcha! Toca los lados o usa A / D / Flechas para doblar</span>
          </div>
        )}

        {/* Speedometer, Nitro Tank & Wanted Stars Overlay */}
        <SpeedometerHUD
          playerState={playerState}
          gameStatus={gameStatus}
          cameraMode={cameraMode}
          onToggleCamera={handleToggleCamera}
          notification={notification}
        />

        {/* Game Over / Busted Modal */}
        {(gameStatus.state === 'busted' || gameStatus.state === 'wrecked') && (
          <GameOverModal
            reason={gameStatus.state}
            status={gameStatus}
            onRestart={handleRestart}
          />
        )}
      </div>

      {/* On-Screen Steering & Pedal Controls */}
      <TouchControls
        onSteerLeft={(active) => {
          setHasInteracted(true);
          if (engineRef.current) engineRef.current.input.left = active;
          setActiveSide(active ? 'left' : null);
        }}
        onSteerRight={(active) => {
          setHasInteracted(true);
          if (engineRef.current) engineRef.current.input.right = active;
          setActiveSide(active ? 'right' : null);
        }}
        onAccelerate={(active) => {
          setHasInteracted(true);
          if (engineRef.current) engineRef.current.input.accelerate = active;
        }}
        onBrake={(active) => {
          setHasInteracted(true);
          if (engineRef.current) engineRef.current.input.brake = active;
        }}
        onTurbo={(active) => {
          setHasInteracted(true);
          if (engineRef.current) engineRef.current.input.turbo = active;
        }}
        onToggleCamera={handleToggleCamera}
        isNitroActive={playerState.isNitroActive}
        nitroAmount={playerState.nitroAmount}
      />
    </div>
  );
};
