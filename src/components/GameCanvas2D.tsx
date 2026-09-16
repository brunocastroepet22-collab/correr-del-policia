import React, { useEffect, useRef, useState } from 'react';
import { Camera, Palette, RefreshCw, Volume2, VolumeX, Gauge, ArrowLeft, ArrowRight } from 'lucide-react';
import { racingAudio } from '../audio';
import { GameStatus, PlayerCarState } from '../types';
import { SpeedometerHUD } from './SpeedometerHUD';
import { TouchControls } from './TouchControls';
import { GameOverModal } from './GameOverModal';

const CAR_COLORS = [
  { id: 'red', name: 'Rojo Furia', hex: '#dc2626', darkHex: '#991b1b', lightHex: '#f87171' },
  { id: 'black', name: 'Negro Fantasma', hex: '#18181b', darkHex: '#09090b', lightHex: '#52525b' },
  { id: 'blue', name: 'Azul Eléctrico', hex: '#2563eb', darkHex: '#1e40af', lightHex: '#60a5fa' },
  { id: 'orange', name: 'Naranja Fuego', hex: '#ea580c', darkHex: '#9a3412', lightHex: '#fb923c' },
  { id: 'green', name: 'Verde Veneno', hex: '#16a34a', darkHex: '#166534', lightHex: '#4ade80' },
  { id: 'white', name: 'Blanco Perla', hex: '#e2e8f0', darkHex: '#94a3b8', lightHex: '#ffffff' },
];

interface Traffic2D {
  id: number;
  type: 'police' | 'sedan' | 'suv' | 'truck';
  x: number; // Center X relative to road center
  y: number; // World Y position relative to player Z
  speed: number; // km/h
  width: number;
  length: number;
  color: string;
  isDestroyed?: boolean;
  spinAngle?: number;
  targetX?: number;
  isRoadblock?: boolean;
}

interface Pickup2D {
  id: number;
  type: 'nitro' | 'repair' | 'cash';
  x: number;
  y: number;
  collected: boolean;
}

interface Particle2D {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
}

export const GameCanvas2D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [soundOn, setSoundOn] = useState(true);
  const [autoCruise, setAutoCruise] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | null>(null);
  const [selectedColor, setSelectedColor] = useState(CAR_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [playerState, setPlayerState] = useState<PlayerCarState>({
    x: 0,
    z: 0,
    speed: 110,
    targetSpeed: 110,
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
    timeRemaining: 90,
    elapsedTime: 0,
  });

  const [gameOverReason, setGameOverReason] = useState<'busted' | 'wrecked' | null>(null);
  const [notification, setNotification] = useState<{
    text: string;
    type: 'turbo' | 'takedown' | 'nearmiss' | 'warning';
  } | null>(null);

  // Engine mutable state held in refs for 60fps zero-allocation canvas loop
  const stateRef = useRef({
    player: {
      x: 0, // Road lateral position in pixels (-150 to +150)
      z: 0, // World distance in meters
      speed: 110, // km/h
      steerAngle: 0,
      nitroAmount: 100,
      isNitroActive: false,
      health: 100,
      isBraking: false,
      isAccelerating: true,
    },
    status: {
      state: 'racing' as 'menu' | 'racing' | 'busted' | 'wrecked' | 'victory',
      distance: 0,
      score: 0,
      heatLevel: 1,
      copsEvaded: 0,
      nearMisses: 0,
      timeRemaining: 90,
      elapsedTime: 0,
    },
    input: {
      left: false,
      right: false,
      accelerate: false,
      brake: false,
      turbo: false,
    },
    targetX: null as number | null,
    autoCruise: true,
    carColor: CAR_COLORS[0],
    traffic: [] as Traffic2D[],
    pickups: [] as Pickup2D[],
    particles: [] as Particle2D[],
    skidMarks: [] as SkidMark[],
    nextTrafficDist: 40,
    nextPickupDist: 70,
    policePhase: 0,
    bustProgress: 0,
    screenShake: 0,
    nextId: 1,
    lastNearMissTime: 0,
    lastTireScreechTime: 0,
  });

  // Keep autoCruise ref in sync
  useEffect(() => {
    stateRef.current.autoCruise = autoCruise;
  }, [autoCruise]);

  useEffect(() => {
    stateRef.current.carColor = selectedColor;
  }, [selectedColor]);

  // Notifications banner helper
  const showNotification = (text: string, type: 'turbo' | 'takedown' | 'nearmiss' | 'warning') => {
    setNotification({ text, type });
    window.clearTimeout((showNotification as any)._timeout);
    (showNotification as any)._timeout = window.setTimeout(() => {
      setNotification(null);
    }, 2000);
  };

  // ---------------------------------------------------------------------------
  // INITIALIZE TRAFFIC & PICKUPS
  // ---------------------------------------------------------------------------
  const initGameWorld = () => {
    const s = stateRef.current;
    s.player = {
      x: 0,
      z: 0,
      speed: 110,
      steerAngle: 0,
      nitroAmount: 100,
      isNitroActive: false,
      health: 100,
      isBraking: false,
      isAccelerating: true,
    };
    s.status = {
      state: 'racing',
      distance: 0,
      score: 0,
      heatLevel: 1,
      copsEvaded: 0,
      nearMisses: 0,
      timeRemaining: 90,
      elapsedTime: 0,
    };
    s.traffic = [];
    s.pickups = [];
    s.particles = [];
    s.skidMarks = [];
    s.bustProgress = 0;
    s.screenShake = 0;
    s.targetX = null;
    s.nextTrafficDist = 50;
    s.nextPickupDist = 80;

    const lanes = [-135, -45, 45, 135];

    // Spawn initial civilian traffic ahead
    for (let i = 0; i < 6; i++) {
      const lane = lanes[i % 4];
      const type = (['sedan', 'suv', 'truck'][i % 3]) as 'sedan' | 'suv' | 'truck';
      s.traffic.push({
        id: s.nextId++,
        type,
        x: lane,
        y: 120 + i * 85,
        speed: 70 + (i % 3) * 15,
        width: type === 'truck' ? 46 : type === 'suv' ? 44 : 40,
        length: type === 'truck' ? 130 : type === 'suv' ? 84 : 76,
        color: ['#0284c7', '#d97706', '#475569', '#15803d', '#9333ea'][i % 5],
      });
    }

    // Initial police squad car chasing from behind
    s.traffic.push({
      id: s.nextId++,
      type: 'police',
      x: 45,
      y: -140, // Behind the player
      speed: 120,
      width: 42,
      length: 80,
      color: '#09090b',
    });

    // Initial Pickups
    s.pickups.push({
      id: s.nextId++,
      type: 'nitro',
      x: -45,
      y: 90,
      collected: false,
    });
    s.pickups.push({
      id: s.nextId++,
      type: 'repair',
      x: 45,
      y: 220,
      collected: false,
    });
  };

  // ---------------------------------------------------------------------------
  // MAIN GAME LOOP (PURE 2D CANVAS - 60 FPS)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    initGameWorld();

    let animationFrameId: number;
    let lastTime = performance.now();
    let hudUpdateTimer = 0;

    // Responsive Canvas Resize Observer
    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // -------------------------------------------------------------------------
    // LOOP STEP
    // -------------------------------------------------------------------------
    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.08); // cap max delta
      lastTime = currentTime;

      const s = stateRef.current;
      const p = s.player;
      const st = s.status;

      if (st.state === 'racing') {
        st.elapsedTime += dt;
        hudUpdateTimer += dt;

        // ---------------------------------------------------------------------
        // ACCELERATION & CRUISE CONTROL
        // ---------------------------------------------------------------------
        const BASE_CRUISE_SPEED = 130;
        const MAX_CRUISE_SPEED = 245;
        const MAX_TURBO_SPEED = 345;
        const ACCEL_RATE = 95;
        const TURBO_ACCEL_RATE = 180;
        const BRAKE_RATE = 220;

        // Turbo logic
        const wantsTurbo = s.input.turbo && p.nitroAmount > 5 && p.speed > 50;
        if (wantsTurbo) {
          if (!p.isNitroActive) {
            racingAudio.playTurboBoost();
            showNotification('¡TURBO NITRO ACTIVADO!', 'turbo');
            s.screenShake = 6;
          }
          p.isNitroActive = true;
          p.nitroAmount = Math.max(0, p.nitroAmount - 26 * dt);
        } else {
          p.isNitroActive = false;
          // Passive nitro refill
          p.nitroAmount = Math.min(100, p.nitroAmount + 3.8 * dt);
        }

        // Speed adjustment
        if (s.input.brake) {
          p.speed = Math.max(30, p.speed - BRAKE_RATE * dt);
          p.isBraking = true;
          p.isAccelerating = false;
          if (p.speed > 80 && currentTime - s.lastTireScreechTime > 600) {
            racingAudio.playTireScreech();
            s.lastTireScreechTime = currentTime;
          }
        } else if (s.input.accelerate) {
          const top = p.isNitroActive ? MAX_TURBO_SPEED : MAX_CRUISE_SPEED;
          const rate = p.isNitroActive ? TURBO_ACCEL_RATE : ACCEL_RATE;
          p.speed = Math.min(top, p.speed + rate * dt);
          p.isBraking = false;
          p.isAccelerating = true;
        } else if (p.isNitroActive) {
          p.speed = Math.min(MAX_TURBO_SPEED, p.speed + TURBO_ACCEL_RATE * dt);
          p.isAccelerating = true;
          p.isBraking = false;
        } else if (s.autoCruise) {
          // Auto-cruise
          if (p.speed < BASE_CRUISE_SPEED) {
            p.speed = Math.min(BASE_CRUISE_SPEED, p.speed + 75 * dt);
          } else if (p.speed > BASE_CRUISE_SPEED) {
            p.speed = Math.max(BASE_CRUISE_SPEED, p.speed - 35 * dt);
          }
          p.isAccelerating = true;
          p.isBraking = false;
        } else {
          p.speed = Math.max(0, p.speed - 35 * dt);
          p.isBraking = false;
          p.isAccelerating = false;
        }

        // ---------------------------------------------------------------------
        // LATERAL STEERING
        // ---------------------------------------------------------------------
        const ROAD_BOUNDARY = 160; // Max horizontal road offset from center
        const steerSpeed = 320; // Pixels per second

        if (s.input.left) {
          p.x = Math.max(-ROAD_BOUNDARY, p.x - steerSpeed * dt);
          p.steerAngle = Math.max(-0.4, p.steerAngle - 2.8 * dt);
        } else if (s.input.right) {
          p.x = Math.min(ROAD_BOUNDARY, p.x + steerSpeed * dt);
          p.steerAngle = Math.min(0.4, p.steerAngle + 2.8 * dt);
        } else if (s.targetX !== null) {
          const diff = s.targetX - p.x;
          if (Math.abs(diff) > 4) {
            const dir = Math.sign(diff);
            p.x += dir * Math.min(Math.abs(diff), steerSpeed * dt);
            p.steerAngle = dir * 0.25;
          } else {
            p.steerAngle *= 0.8;
            s.targetX = null;
          }
        } else {
          p.steerAngle *= 0.8;
        }

        // Distance & score calculation
        const speedMps = (p.speed * 1000) / 3600;
        p.z += speedMps * dt;
        st.distance = Math.floor(p.z);
        st.score += Math.floor(speedMps * dt * 1.8 * (p.isNitroActive ? 2.5 : 1));

        // Wanted Heat Level progression
        if (st.distance > 2800) st.heatLevel = 5;
        else if (st.distance > 1900) st.heatLevel = 4;
        else if (st.distance > 1100) st.heatLevel = 3;
        else if (st.distance > 450) st.heatLevel = 2;
        else st.heatLevel = 1;

        // Screen shake decay
        s.screenShake = Math.max(0, s.screenShake - 12 * dt);

        // Audio update
        racingAudio.updateEngine(p.speed, p.isAccelerating, p.isNitroActive);

        // ---------------------------------------------------------------------
        // SKID MARKS GENERATION
        // ---------------------------------------------------------------------
        if (Math.abs(p.steerAngle) > 0.22 || (p.isBraking && p.speed > 90)) {
          const playerScreenY = canvas.height / (window.devicePixelRatio || 1) - 120;
          s.skidMarks.push({
            x1: p.x - 16,
            y1: playerScreenY + 28,
            x2: p.x + 16,
            y2: playerScreenY + 28,
            alpha: 0.7,
          });
        }

        // Fade skid marks and scroll them down
        for (let i = s.skidMarks.length - 1; i >= 0; i--) {
          const sm = s.skidMarks[i];
          sm.y1 += (speedMps * 6) * dt;
          sm.y2 += (speedMps * 6) * dt;
          sm.alpha -= 0.6 * dt;
          if (sm.alpha <= 0 || sm.y1 > canvas.height + 100) {
            s.skidMarks.splice(i, 1);
          }
        }

        // ---------------------------------------------------------------------
        // TRAFFIC UPDATES & POLICE AI
        // ---------------------------------------------------------------------
        s.policePhase += dt * 10;
        let policeClose = false;

        for (let i = s.traffic.length - 1; i >= 0; i--) {
          const t = s.traffic[i];

          if (t.isDestroyed) {
            t.spinAngle = (t.spinAngle || 0) + 12 * dt;
            t.y -= (speedMps * 2) * dt;
            if (t.y < -300 || t.y > 1000) {
              s.traffic.splice(i, 1);
            }
            continue;
          }

          // Relative movement based on player speed vs traffic speed
          // Positive Y is ahead of player, negative Y is behind
          const relSpeedMps = ((t.speed - p.speed) * 1000) / 3600;
          t.y += relSpeedMps * dt * 5.5;

          // Police Cruiser AI
          if (t.type === 'police') {
            policeClose = true;
            // Catch up if behind, match speed if close
            if (t.y < -30) {
              t.speed = Math.min(p.speed + 35, 290);
            } else if (t.y > 60) {
              t.speed = Math.max(p.speed - 20, 90);
            } else {
              t.speed = THREE_LERP(t.speed, p.speed, 2.5 * dt);
            }

            // Steer towards player lateral lane to box or ram
            const targetLaneX = p.x + (t.y > 0 ? 0 : Math.sin(s.policePhase * 0.3) * 35);
            t.x = THREE_LERP(t.x, targetLaneX, 2.2 * dt);

            // BUSTED Check: boxed in at low speed (< 35 km/h) while police is right next to player
            const lateralDiff = Math.abs(t.x - p.x);
            const longDiff = Math.abs(t.y);
            if (st.elapsedTime > 4 && lateralDiff < 45 && longDiff < 45 && p.speed < 32) {
              s.bustProgress += 0.45 * dt;
              if (s.bustProgress >= 1.0) {
                st.state = 'busted';
                setGameOverReason('busted');
                racingAudio.playPoliceSiren(false);
                break;
              }
            } else {
              s.bustProgress = Math.max(0, s.bustProgress - 0.5 * dt);
            }
          }

          // -------------------------------------------------------------------
          // COLLISION DETECTION (AABB WITH EXPANDED HITBOX)
          // -------------------------------------------------------------------
          const carHalfW = 19;
          const carHalfH = 38;
          const tHalfW = t.width / 2;
          const tHalfH = t.length / 2;

          // Collision check (Player is at y = 0 relative to highway reference)
          const isColliding =
            Math.abs(p.x - t.x) < carHalfW + tHalfW - 4 &&
            Math.abs(t.y) < carHalfH + tHalfH - 4;

          if (isColliding) {
            // Check if player hit police with TURBO NITRO ACTIVE -> TAKEDOWN!
            if (t.type === 'police' && p.isNitroActive && p.speed > 210) {
              t.isDestroyed = true;
              t.color = '#ef4444';
              st.score += 1500;
              st.copsEvaded += 1;
              p.nitroAmount = Math.min(100, p.nitroAmount + 35);
              showNotification('¡TAKEDOWN POLICIAL! +1,500 PTS', 'takedown');
              racingAudio.playCrash('heavy');
              s.screenShake = 14;

              // Spawn fiery explosion particles
              for (let k = 0; k < 30; k++) {
                s.particles.push({
                  x: t.x,
                  y: t.y,
                  vx: (Math.random() - 0.5) * 260,
                  vy: (Math.random() - 0.5) * 260,
                  size: Math.random() * 8 + 4,
                  color: ['#f97316', '#ef4444', '#facc15', '#ffffff'][Math.floor(Math.random() * 4)],
                  alpha: 1.0,
                  life: 0,
                  maxLife: 0.6 + Math.random() * 0.4,
                });
              }
            } else {
              // Regular crash
              const damage = p.isNitroActive ? 22 : 14;
              p.health = Math.max(0, p.health - damage);
              p.speed = Math.max(40, p.speed - 60);
              s.screenShake = 12;
              racingAudio.playCrash(p.health <= 0 ? 'heavy' : 'light');

              // Lateral push
              const pushDir = Math.sign(p.x - t.x) || 1;
              p.x = Math.max(-ROAD_BOUNDARY, Math.min(ROAD_BOUNDARY, p.x + pushDir * 35));

              // Sparks
              for (let k = 0; k < 18; k++) {
                s.particles.push({
                  x: (p.x + t.x) / 2,
                  y: t.y,
                  vx: (Math.random() - 0.5) * 180,
                  vy: (Math.random() - 0.5) * 180,
                  size: Math.random() * 4 + 2,
                  color: '#facc15',
                  alpha: 1.0,
                  life: 0,
                  maxLife: 0.3 + Math.random() * 0.3,
                });
              }

              if (p.health <= 0) {
                st.state = 'wrecked';
                setGameOverReason('wrecked');
                racingAudio.playCrash('heavy');
                racingAudio.playPoliceSiren(false);
                break;
              }
            }
          }

          // -------------------------------------------------------------------
          // NEAR MISS DETECTION (Skimming traffic at > 110 km/h)
          // -------------------------------------------------------------------
          if (
            !isColliding &&
            !t.isDestroyed &&
            p.speed > 115 &&
            Math.abs(t.y) < carHalfH + tHalfH + 8 &&
            Math.abs(p.x - t.x) < carHalfW + tHalfW + 18 &&
            currentTime - s.lastNearMissTime > 900
          ) {
            s.lastNearMissTime = currentTime;
            st.nearMisses += 1;
            st.score += 250;
            p.nitroAmount = Math.min(100, p.nitroAmount + 12);
            showNotification('¡ROZADA CERCANA! +250 PTS', 'nearmiss');
            racingAudio.playNearMiss();
          }

          // Despawn traffic that is far behind or way too far ahead
          if (t.y < -400 || t.y > 1200) {
            s.traffic.splice(i, 1);
          }
        }

        // Play or stop police siren based on proximity
        racingAudio.playPoliceSiren(policeClose && st.state === 'racing');

        // ---------------------------------------------------------------------
        // PICKUPS UPDATE
        // ---------------------------------------------------------------------
        for (let i = s.pickups.length - 1; i >= 0; i--) {
          const item = s.pickups[i];
          const relSpeedMps = -p.speed * 0.28;
          item.y += relSpeedMps * dt * 5.5;

          // Pickup collection
          if (!item.collected && Math.abs(p.x - item.x) < 32 && Math.abs(item.y) < 32) {
            item.collected = true;
            racingAudio.playPickup();

            if (item.type === 'nitro') {
              p.nitroAmount = Math.min(100, p.nitroAmount + 40);
              st.score += 300;
              showNotification('¡RECARGA NITRO +40%!', 'turbo');
            } else if (item.type === 'repair') {
              p.health = Math.min(100, p.health + 35);
              st.score += 300;
              showNotification('¡REPARACIÓN +35% SALUD!', 'nearmiss');
            } else {
              st.score += 1000;
              showNotification('¡BONIFICACIÓN +1,000 PTS!', 'nearmiss');
            }
          }

          if (item.collected || item.y < -300) {
            s.pickups.splice(i, 1);
          }
        }

        // ---------------------------------------------------------------------
        // SPAWN NEW TRAFFIC & PICKUPS DYNAMICALLY
        // ---------------------------------------------------------------------
        if (st.distance > s.nextTrafficDist) {
          s.nextTrafficDist = st.distance + Math.floor(35 + Math.random() * 30);
          const lanes = [-135, -45, 45, 135];
          const lane = lanes[Math.floor(Math.random() * lanes.length)];

          // Chance of police based on heat level
          const policeChance = Math.min(0.65, 0.15 + st.heatLevel * 0.1);
          const spawnPolice = Math.random() < policeChance;

          if (spawnPolice) {
            // Spawn police cruiser chasing from behind or intercepting from ahead
            const fromBehind = Math.random() < 0.6;
            s.traffic.push({
              id: s.nextId++,
              type: 'police',
              x: lane,
              y: fromBehind ? -180 : 480,
              speed: fromBehind ? p.speed + 35 : 100,
              width: 42,
              length: 80,
              color: '#09090b',
            });
          } else {
            const types: ('sedan' | 'suv' | 'truck')[] = ['sedan', 'sedan', 'suv', 'truck'];
            const type = types[Math.floor(Math.random() * types.length)];
            s.traffic.push({
              id: s.nextId++,
              type,
              x: lane,
              y: 500,
              speed: type === 'truck' ? 70 : 85 + Math.random() * 35,
              width: type === 'truck' ? 46 : type === 'suv' ? 44 : 40,
              length: type === 'truck' ? 130 : type === 'suv' ? 84 : 76,
              color: ['#0284c7', '#d97706', '#475569', '#15803d', '#9333ea', '#e11d48'][
                Math.floor(Math.random() * 6)
              ],
            });
          }
        }

        // Spawn Pickups periodically
        if (st.distance > s.nextPickupDist) {
          s.nextPickupDist = st.distance + Math.floor(65 + Math.random() * 45);
          const lanes = [-135, -45, 45, 135];
          const lane = lanes[Math.floor(Math.random() * lanes.length)];
          const types: ('nitro' | 'repair' | 'cash')[] = ['nitro', 'nitro', 'repair', 'cash'];
          s.pickups.push({
            id: s.nextId++,
            type: types[Math.floor(Math.random() * types.length)],
            x: lane,
            y: 520,
            collected: false,
          });
        }

        // ---------------------------------------------------------------------
        // PARTICLE ENGINE UPDATE
        // ---------------------------------------------------------------------
        // Emit nitro exhaust flames
        if (p.isNitroActive) {
          const playerScreenY = canvas.height / (window.devicePixelRatio || 1) - 120;
          for (let e = -12; e <= 12; e += 24) {
            s.particles.push({
              x: p.x + e + (Math.random() - 0.5) * 4,
              y: playerScreenY + 42,
              vx: (Math.random() - 0.5) * 30,
              vy: Math.random() * 140 + 180,
              size: Math.random() * 7 + 4,
              color: Math.random() < 0.6 ? '#38bdf8' : '#f97316',
              alpha: 0.9,
              life: 0,
              maxLife: 0.25,
            });
          }
        }

        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life += dt;
          pt.alpha = Math.max(0, 1.0 - pt.life / pt.maxLife);
          if (pt.life >= pt.maxLife) {
            s.particles.splice(i, 1);
          }
        }

        // Sync React HUD every ~60ms
        if (hudUpdateTimer > 0.06) {
          hudUpdateTimer = 0;
          setPlayerState({ ...p });
          setGameStatus({ ...st });
        }
      }

      // -----------------------------------------------------------------------
      // RENDER FRAME (PURE 2D CANVAS)
      // -----------------------------------------------------------------------
      render2DScene(ctx, canvas, s);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      racingAudio.playPoliceSiren(false);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // PURE 2D CANVAS RENDERING IMPLEMENTATION
  // ---------------------------------------------------------------------------
  const render2DScene = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    s: typeof stateRef.current
  ) => {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width / 2;
    const playerScreenY = height - 120;

    ctx.save();

    // Screen Shake effect on collisions
    if (s.screenShake > 0.1) {
      const shakeX = (Math.random() - 0.5) * s.screenShake * 1.5;
      const shakeY = (Math.random() - 0.5) * s.screenShake * 1.5;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Background roadside grass / gravel verges
    ctx.fillStyle = '#0f172a'; // Deep night slate
    ctx.fillRect(0, 0, width, height);

    // Roadside gravel borders
    const ROAD_WIDTH = 380;
    const roadLeft = centerX - ROAD_WIDTH / 2;
    const roadRight = centerX + ROAD_WIDTH / 2;

    ctx.fillStyle = '#1e293b'; // Shoulder gravel
    ctx.fillRect(roadLeft - 24, 0, ROAD_WIDTH + 48, height);

    // 2. Asphalt Road Surface
    ctx.fillStyle = '#111827'; // Dark asphalt
    ctx.fillRect(roadLeft, 0, ROAD_WIDTH, height);

    // 3. Road Markings & Lane Dashes
    // Calculate scrolling road offset from player distance
    const roadScrollY = (s.player.z * 18) % 60;

    // Solid Edge Lines (Yellow & White)
    ctx.strokeStyle = '#eab308'; // Yellow left line
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(roadLeft + 4, 0);
    ctx.lineTo(roadLeft + 4, height);
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc'; // White right line
    ctx.beginPath();
    ctx.moveTo(roadRight - 4, 0);
    ctx.lineTo(roadRight - 4, height);
    ctx.stroke();

    // 3 White dashed divider lines for 4 lanes
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([28, 32]);
    ctx.lineDashOffset = -roadScrollY;

    for (let l = 1; l <= 3; l++) {
      const laneX = roadLeft + (ROAD_WIDTH / 4) * l;
      ctx.beginPath();
      ctx.moveTo(laneX, 0);
      ctx.lineTo(laneX, height);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash

    // Guard rails on outer edges
    ctx.fillStyle = '#475569';
    for (let gy = (roadScrollY * 1.5) % 80 - 80; gy < height; gy += 80) {
      ctx.fillRect(roadLeft - 22, gy, 8, 30);
      ctx.fillRect(roadRight + 14, gy, 8, 30);
    }

    // 4. Skid Marks on Asphalt
    for (const sm of s.skidMarks) {
      ctx.fillStyle = `rgba(15, 23, 42, ${sm.alpha * 0.8})`;
      ctx.fillRect(centerX + sm.x1 - 4, sm.y1, 8, 14);
      ctx.fillRect(centerX + sm.x2 - 4, sm.y2, 8, 14);
    }

    // 5. Speed streak lines during Turbo Nitro or > 200 km/h
    if (s.player.speed > 190) {
      const streakAlpha = Math.min(0.6, (s.player.speed - 190) / 160);
      ctx.strokeStyle = s.player.isNitroActive
        ? `rgba(56, 189, 248, ${streakAlpha})`
        : `rgba(255, 255, 255, ${streakAlpha * 0.5})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const sx = roadLeft + Math.random() * ROAD_WIDTH;
        const sy = Math.random() * height;
        const sLen = 30 + Math.random() * 60;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + sLen);
        ctx.stroke();
      }
    }

    // 6. Draw Pickups on Road
    for (const item of s.pickups) {
      if (item.collected) continue;
      const py = playerScreenY - item.y;
      if (py < -50 || py > height + 50) continue;

      ctx.save();
      ctx.translate(centerX + item.x, py);

      // Glowing aura
      const pulse = 1 + Math.sin(performance.now() * 0.008) * 0.15;
      ctx.scale(pulse, pulse);

      if (item.type === 'nitro') {
        // Cyan Nitro canister
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('N₂O', 0, 1);
      } else if (item.type === 'repair') {
        // Emerald Wrench repair
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', 0, 0);
      } else {
        // Gold coin
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 1);
      }

      ctx.restore();
    }

    // 7. Draw Traffic Vehicles
    for (const t of s.traffic) {
      const ty = playerScreenY - t.y;
      if (ty < -150 || ty > height + 150) continue;

      ctx.save();
      ctx.translate(centerX + t.x, ty);

      if (t.isDestroyed) {
        ctx.rotate(t.spinAngle || 0);
      }

      // Draw Vehicle Body
      drawVehicle2D(ctx, t, s.policePhase);
      ctx.restore();
    }

    // 8. Draw Player Car
    ctx.save();
    ctx.translate(centerX + s.player.x, playerScreenY);
    ctx.rotate(s.player.steerAngle * 0.35); // Body lean during steering
    drawPlayerCar2D(ctx, s.player, s.carColor);
    ctx.restore();

    // 9. Draw Particle FX (Nitro flames, sparks, explosions)
    for (const pt of s.particles) {
      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(centerX + pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10. Police BUSTED Warning Overlay Meter (if getting cornered)
    if (s.bustProgress > 0.05) {
      ctx.save();
      ctx.fillStyle = `rgba(220, 38, 38, ${s.bustProgress * 0.4})`;
      ctx.fillRect(0, 0, width, height);

      // Warning text & progress bar
      const barW = 240;
      const barH = 14;
      const bx = centerX - barW / 2;
      const by = 80;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, by, barW, barH);
      ctx.fillRect(bx, by, barW, barH);

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(bx + 2, by + 2, (barW - 4) * s.bustProgress, barH - 4);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('¡PELIGRO: POLICÍA ARRESTÁNDOTE!', centerX, by - 10);
      ctx.restore();
    }

    ctx.restore();
  };

  // ---------------------------------------------------------------------------
  // VEHICLE DRAWING SUB-ROUTINES (Crisp 2D Vector Sprites)
  // ---------------------------------------------------------------------------
  const drawPlayerCar2D = (
    ctx: CanvasRenderingContext2D,
    p: PlayerCarState,
    color: typeof CAR_COLORS[0]
  ) => {
    const w = 42;
    const len = 80;

    // Headlight Beams cast forward on dark road
    const grad = ctx.createLinearGradient(0, -len / 2, 0, -len / 2 - 160);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.5)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-16, -len / 2);
    ctx.lineTo(-45, -len / 2 - 160);
    ctx.lineTo(45, -len / 2 - 160);
    ctx.lineTo(16, -len / 2);
    ctx.closePath();
    ctx.fill();

    // Wheels (4 Black Tires with rims)
    const wheelW = 7;
    const wheelL = 16;
    ctx.fillStyle = '#0f172a';

    // Front Wheels (pivot with steering angle)
    ctx.save();
    ctx.translate(-w / 2 - 1, -len / 3);
    ctx.rotate(p.steerAngle * 0.7);
    ctx.fillRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL);
    ctx.restore();

    ctx.save();
    ctx.translate(w / 2 + 1, -len / 3);
    ctx.rotate(p.steerAngle * 0.7);
    ctx.fillRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL);
    ctx.restore();

    // Rear Wheels (fixed)
    ctx.fillRect(-w / 2 - wheelW / 2 - 1, len / 3 - wheelL / 2, wheelW, wheelL);
    ctx.fillRect(w / 2 - wheelW / 2 + 1, len / 3 - wheelL / 2, wheelW, wheelL);

    // Car Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    drawRoundedRect(ctx, -w / 2 + 2, -len / 2 + 4, w, len, 10);
    ctx.fill();

    // Car Main Body Shell
    ctx.fillStyle = color.hex;
    drawRoundedRect(ctx, -w / 2, -len / 2, w, len, 10);
    ctx.fill();

    // Side Aerodynamic Highlights
    ctx.fillStyle = color.darkHex;
    ctx.fillRect(-w / 2 + 3, -len / 4, 3, len / 2);
    ctx.fillRect(w / 2 - 6, -len / 4, 3, len / 2);

    // Windshield & Roof (Tinted glass with gradient reflection)
    ctx.fillStyle = '#09090b';
    drawRoundedRect(ctx, -w / 2 + 6, -len / 4, w - 12, len / 2 - 4, 6);
    ctx.fill();

    // Glass Reflection streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 9, -len / 4 + 2);
    ctx.lineTo(-w / 2 + 18, -len / 4 + 2);
    ctx.lineTo(-w / 2 + 10, len / 4 - 6);
    ctx.lineTo(-w / 2 + 7, len / 4 - 6);
    ctx.closePath();
    ctx.fill();

    // Hood Air Scoops / Stripes
    ctx.fillStyle = color.darkHex;
    ctx.fillRect(-4, -len / 2 + 8, 8, 16);

    // Rear Spoiler
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-w / 2 + 2, len / 2 - 5, w - 4, 5);

    // Taillights (Glow intense red when braking)
    ctx.fillStyle = p.isBraking ? '#ff0000' : '#dc2626';
    if (p.isBraking) {
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 14;
    }
    ctx.fillRect(-w / 2 + 4, len / 2 - 2, 8, 3);
    ctx.fillRect(w / 2 - 12, len / 2 - 2, 8, 3);
    ctx.shadowBlur = 0;
  };

  const drawVehicle2D = (
    ctx: CanvasRenderingContext2D,
    t: Traffic2D,
    policePhase: number
  ) => {
    const w = t.width;
    const len = t.length;

    // Vehicle Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    drawRoundedRect(ctx, -w / 2 + 2, -len / 2 + 4, w, len, 8);
    ctx.fill();

    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-w / 2 - 3, -len / 3, 5, 14);
    ctx.fillRect(w / 2 - 2, -len / 3, 5, 14);
    ctx.fillRect(-w / 2 - 3, len / 3 - 7, 5, 14);
    ctx.fillRect(w / 2 - 2, len / 3 - 7, 5, 14);

    if (t.type === 'police') {
      // POLICE INTERCEPTOR LIVERY (Black and White)
      ctx.fillStyle = '#09090b'; // Black body
      drawRoundedRect(ctx, -w / 2, -len / 2, w, len, 8);
      ctx.fill();

      // White Roof & Doors
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-w / 2 + 4, -len / 5, w - 8, len * 0.4);

      // POLICE Roof text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLICE', 0, -len * 0.08);

      // Alternating Emergency Strobe Lightbar (Blue & Red)
      const isRed = Math.sin(policePhase) > 0;
      ctx.fillStyle = isRed ? '#ef4444' : '#1e3a8a';
      ctx.fillRect(-w / 2 + 8, 4, w / 2 - 8, 6);

      ctx.fillStyle = isRed ? '#1e3a8a' : '#3b82f6';
      ctx.fillRect(0, 4, w / 2 - 8, 6);

      // Ambient Strobe Flashing on asphalt
      ctx.fillStyle = isRed ? 'rgba(239, 68, 68, 0.22)' : 'rgba(59, 130, 246, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 50, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.type === 'truck') {
      // LONG 18-WHEELER CARGO TRUCK
      // Cargo Trailer
      ctx.fillStyle = t.color;
      drawRoundedRect(ctx, -w / 2, -len / 2 + 25, w, len - 25, 4);
      ctx.fill();

      // Trailer roof ridges
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      for (let r = -len / 2 + 40; r < len / 2 - 10; r += 18) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 3, r);
        ctx.lineTo(w / 2 - 3, r);
        ctx.stroke();
      }

      // Front Cab
      ctx.fillStyle = '#334155';
      drawRoundedRect(ctx, -w / 2 + 2, -len / 2, w - 4, 28, 4);
      ctx.fill();

      // Cab Windshield
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w / 2 + 5, -len / 2 + 3, w - 10, 8);
    } else {
      // REGULAR CIVILIAN SEDAN / SUV
      ctx.fillStyle = t.color;
      drawRoundedRect(ctx, -w / 2, -len / 2, w, len, 8);
      ctx.fill();

      // Windshield & Roof
      ctx.fillStyle = '#0f172a';
      drawRoundedRect(ctx, -w / 2 + 5, -len / 4, w - 10, len / 2 - 4, 4);
      ctx.fill();
    }

    // Taillights
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-w / 2 + 3, len / 2 - 3, 6, 3);
    ctx.fillRect(w / 2 - 9, len / 2 - 3, 6, 3);
  };

  // Helper rounded rect
  const drawRoundedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Three.js lerp equivalent for smooth interpolation
  const THREE_LERP = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));

  // ---------------------------------------------------------------------------
  // INTERACTIVE POINTER / TOUCH STEERING
  // ---------------------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setHasInteracted(true);
    racingAudio.init();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width; // 0 to 1
    const targetOffset = (relX - 0.5) * 320; // -160 to +160 lateral road px
    stateRef.current.targetX = targetOffset;

    if (relX < 0.45) {
      stateRef.current.input.left = true;
      stateRef.current.input.right = false;
      setActiveSide('left');
    } else if (relX > 0.55) {
      stateRef.current.input.right = true;
      stateRef.current.input.left = false;
      setActiveSide('right');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.buttons) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const targetOffset = (relX - 0.5) * 320;
    stateRef.current.targetX = targetOffset;

    if (relX < 0.45) {
      stateRef.current.input.left = true;
      stateRef.current.input.right = false;
      setActiveSide('left');
    } else if (relX > 0.55) {
      stateRef.current.input.right = true;
      stateRef.current.input.left = false;
      setActiveSide('right');
    } else {
      stateRef.current.input.left = false;
      stateRef.current.input.right = false;
      setActiveSide(null);
    }
  };

  const handlePointerUp = () => {
    stateRef.current.input.left = false;
    stateRef.current.input.right = false;
    stateRef.current.targetX = null;
    setActiveSide(null);
  };

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      const s = stateRef.current;

      setHasInteracted(true);
      racingAudio.init();

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(k) || code === 'Space') {
        e.preventDefault();
      }

      if (k === 'arrowleft' || k === 'a') {
        s.input.left = true;
        setActiveSide('left');
      }
      if (k === 'arrowright' || k === 'd') {
        s.input.right = true;
        setActiveSide('right');
      }
      if (k === 'arrowup' || k === 'w') s.input.accelerate = true;
      if (k === 'arrowdown' || k === 's') s.input.brake = true;
      if (code === 'Space' || k === ' ' || k === 'f') s.input.turbo = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const code = e.code;
      const s = stateRef.current;

      if (k === 'arrowleft' || k === 'a') {
        s.input.left = false;
        setActiveSide((prev) => (prev === 'left' ? null : prev));
      }
      if (k === 'arrowright' || k === 'd') {
        s.input.right = false;
        setActiveSide((prev) => (prev === 'right' ? null : prev));
      }
      if (k === 'arrowup' || k === 'w') s.input.accelerate = false;
      if (k === 'arrowdown' || k === 's') s.input.brake = false;
      if (code === 'Space' || k === ' ' || k === 'f') s.input.turbo = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleRestart = () => {
    initGameWorld();
    setGameOverReason(null);
    showNotification('¡CARRERA REINICIADA! PISA EL ACELERADOR', 'turbo');
  };

  const toggleSound = () => {
    const next = racingAudio.toggleMute();
    setSoundOn(!next);
  };

  const toggleAutoCruise = () => {
    const next = !autoCruise;
    setAutoCruise(next);
    showNotification(
      next ? 'Acelerador Crucero: ACTIVADO (130 km/h)' : 'Acelerador Manual: ACTIVO (Presiona GAS)',
      'nearmiss'
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-6xl gap-3 select-none">
      {/* Top Action Strip: Sound, Auto-Cruise Toggle, Garage Color, Reset */}
      <div className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{soundOn ? 'Sonido Activo' : 'Silenciado'}</span>
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
            title="Acelerador crucero automático a 130 km/h para jugar al instante"
          >
            <Gauge className="w-4 h-4 text-amber-400" />
            <span>{autoCruise ? 'Crucero: Auto (130 km/h)' : 'Crucero: Manual'}</span>
          </button>

          {/* Car Color Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <div
                className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                style={{ backgroundColor: selectedColor.hex }}
              />
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">{selectedColor.name}</span>
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-2 p-2 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl z-50 flex gap-2">
                {CAR_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(c);
                      setShowColorPicker(false);
                      showNotification(`Color: ${c.name}`, 'nearmiss');
                    }}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: selectedColor.id === c.id ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: 2D Arcade Badge & Restart */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold hidden sm:inline">
            60 FPS 2D ULTRA FLUIDO
          </span>
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Reiniciar Carrera"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reiniciar</span>
          </button>
        </div>
      </div>

      {/* 2D Canvas Container with Interactive Steering */}
      <div
        ref={containerRef}
        className="relative w-full h-[500px] sm:h-[600px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl touch-none cursor-ew-resize"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* HTML5 2D Canvas */}
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Interactive Steering Zones (Visual chevrons) */}
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

        {/* First time hint */}
        {!hasInteracted && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-slate-900/90 border border-cyan-500/60 px-4 py-2 rounded-full text-xs font-bold text-cyan-300 shadow-xl flex items-center gap-2 animate-bounce">
            <span>¡Modo 2D activo! Toca la pantalla o usa A / D / Flechas para doblar</span>
          </div>
        )}

        {/* HUD: Speedometer gauge, Nitro tank & Wanted Stars */}
        <SpeedometerHUD
          playerState={playerState}
          gameStatus={gameStatus}
          cameraMode="2d_topdown"
          onToggleCamera={() => {}}
          notification={notification}
        />

        {/* Game Over Modal */}
        {gameOverReason && (
          <GameOverModal reason={gameOverReason} status={gameStatus} onRestart={handleRestart} />
        )}
      </div>

      {/* On-Screen Touch Steering & Pedal Controls */}
      <TouchControls
        onSteerLeft={(active) => {
          setHasInteracted(true);
          stateRef.current.input.left = active;
          setActiveSide(active ? 'left' : null);
        }}
        onSteerRight={(active) => {
          setHasInteracted(true);
          stateRef.current.input.right = active;
          setActiveSide(active ? 'right' : null);
        }}
        onAccelerate={(active) => {
          setHasInteracted(true);
          stateRef.current.input.accelerate = active;
        }}
        onBrake={(active) => {
          setHasInteracted(true);
          stateRef.current.input.brake = active;
        }}
        onTurbo={(active) => {
          setHasInteracted(true);
          stateRef.current.input.turbo = active;
        }}
        onToggleCamera={() => {}}
        nitroAmount={playerState.nitroAmount}
        isNitroActive={playerState.isNitroActive}
      />
    </div>
  );
};
