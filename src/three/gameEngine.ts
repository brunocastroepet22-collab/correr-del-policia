import * as THREE from 'three';
import { racingAudio } from '../audio';
import { CameraView, GameStatus, PickupItem, PlayerCarState, TrafficVehicle } from '../types';
import {
  createPickupMesh,
  createPlayerCar,
  createPoliceCar,
  createRoadblockBarricade,
  createTrafficVehicle,
} from './carModels';
import { EnvironmentScene, setupEnvironment } from './environment';

export interface GameEngineCallbacks {
  onUpdateStats: (stats: GameStatus, playerState: PlayerCarState) => void;
  onNearMiss: (pts: number) => void;
  onCopTakedown: (pts: number) => void;
  onCrash: (damage: number) => void;
  onGameOver: (reason: 'busted' | 'wrecked') => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private env: EnvironmentScene;
  private animationFrameId: number | null = null;
  private callbacks: GameEngineCallbacks;

  // Player Car
  private playerCarMesh: THREE.Group;
  private nitroFlameLeft: THREE.Mesh | null = null;
  private nitroFlameRight: THREE.Mesh | null = null;

  // Car Physics State - Starts rolling immediately at 100 km/h
  public playerState: PlayerCarState = {
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
  };

  // Game Status
  public gameStatus: GameStatus = {
    state: 'racing',
    distance: 0,
    score: 0,
    heatLevel: 1,
    copsEvaded: 0,
    nearMisses: 0,
    timeRemaining: 120,
    elapsedTime: 0,
  };

  public cameraMode: CameraView = 'third_person';
  public customColorHex = 0xdc2626;
  public autoCruise = true; // Auto-accelerates to cruising speed when no pedal is pressed
  public targetX: number | null = null; // Direct touch/mouse lane steering target

  // Traffic and Police Management
  private trafficList: {
    data: TrafficVehicle;
    mesh: THREE.Group;
    isWrecked?: boolean;
    wreckRotation?: number;
  }[] = [];

  private pickupList: {
    data: PickupItem;
    mesh: THREE.Group;
  }[] = [];

  // Police pursuit timers
  private sirenTimer = 0;
  private policeLightPhase = 0;
  private bustProgress = 0; // 0 to 1
  private nextTrafficSpawnZ = -100;
  private nextPickupSpawnZ = -140;
  private nextRoadblockZ = -800;

  // Input States
  public input = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
    turbo: false,
  };

  // Screen Shake
  private shakeAmount = 0;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks, carColor = 0xdc2626) {
    this.container = container;
    this.callbacks = callbacks;
    this.customColorHex = carColor;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 800);
    this.camera.position.set(0, 4.5, 9);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // 3. Environment (Highway, Skyline, Lighting, Speedlines)
    this.env = setupEnvironment(this.scene);

    // 4. Player Car
    this.playerCarMesh = createPlayerCar(this.customColorHex);
    this.nitroFlameLeft = this.playerCarMesh.getObjectByName('nitroFlameLeft') as THREE.Mesh;
    this.nitroFlameRight = this.playerCarMesh.getObjectByName('nitroFlameRight') as THREE.Mesh;
    this.scene.add(this.playerCarMesh);

    // 5. Initial Spawns
    this.spawnInitialTraffic();

    // 6. Resize Observer
    window.addEventListener('resize', this.handleResize);

    // 7. Start Loop
    this.lastTime = performance.now();
    this.tick();
  }

  private lastTime = 0;

  public setCarColor(colorHex: number) {
    this.customColorHex = colorHex;
    this.scene.remove(this.playerCarMesh);
    this.playerCarMesh = createPlayerCar(colorHex);
    this.nitroFlameLeft = this.playerCarMesh.getObjectByName('nitroFlameLeft') as THREE.Mesh;
    this.nitroFlameRight = this.playerCarMesh.getObjectByName('nitroFlameRight') as THREE.Mesh;
    this.scene.add(this.playerCarMesh);
  }

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private spawnInitialTraffic() {
    // Initial civilian cars ahead
    for (let i = 0; i < 5; i++) {
      const z = -70 - i * 50;
      const lane = [-6, -2, 2, 6][i % 4];
      this.spawnVehicle((['sedan', 'suv', 'truck'][i % 3] as any), lane, z);
    }
    // Initial police cruiser starts behind the player giving chase
    this.spawnVehicle('police', 2, 45);
  }

  private spawnVehicle(type: 'police' | 'sedan' | 'suv' | 'truck', x: number, z: number, isRoadblock = false) {
    let mesh: THREE.Group;
    let speed = 90 + Math.random() * 30; // civilian speed

    if (type === 'police') {
      mesh = createPoliceCar();
      speed = 180 + Math.random() * 40; // police interceptor speed
    } else if (isRoadblock) {
      mesh = createRoadblockBarricade();
      speed = 0;
    } else {
      const colors = [0x2563eb, 0xd97706, 0x16a34a, 0x475569, 0xf8fafc, 0xdc2626];
      mesh = createTrafficVehicle(type, colors[Math.floor(Math.random() * colors.length)]);
      if (type === 'truck') speed = 80 + Math.random() * 20;
    }

    mesh.position.set(x, 0, z);
    this.scene.add(mesh);

    const vehicleData: TrafficVehicle = {
      id: Math.random(),
      type,
      x,
      z,
      speed,
      lane: Math.round(x / 4),
      color: '#fff',
      sirenActive: type === 'police',
      policeState: 'chasing',
      isRoadblock,
    };

    this.trafficList.push({ data: vehicleData, mesh });
  }

  private spawnPickup(type: 'nitro' | 'repair' | 'cash', x: number, z: number) {
    const mesh = createPickupMesh(type);
    mesh.position.set(x, 1.0, z);
    this.scene.add(mesh);

    this.pickupList.push({
      data: { id: Math.random(), type, x, z, collected: false },
      mesh,
    });
  }

  // ---------------------------------------------------------------------------
  // MAIN GAME LOOP (TICK)
  // ---------------------------------------------------------------------------
  private tick = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap delta time
    this.lastTime = now;

    if (this.gameStatus.state === 'racing') {
      this.updatePlayer(dt);
      this.updatePursuitAndTraffic(dt);
      this.updatePickups(dt);
      this.checkCollisions();
      this.updateCamera(dt);
      this.updateHeatAndStats(dt);
    }

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  // ---------------------------------------------------------------------------
  // PLAYER CAR PHYSICS & TURBO NITRO LOGIC
  // ---------------------------------------------------------------------------
  private updatePlayer(dt: number) {
    const p = this.playerState;

    // Acceleration & Top Speed Limits
    const BASE_CRUISE_SPEED = 130; // km/h automatic cruising speed
    const MAX_CRUISE_SPEED = 245; // km/h
    const MAX_TURBO_SPEED = 345; // km/h
    const ACCEL_RATE = 95;
    const TURBO_ACCEL_RATE = 175;
    const BRAKE_RATE = 210;

    // Check Turbo Activation
    const wantsTurbo = this.input.turbo && p.nitroAmount > 5 && p.speed > 50;
    if (wantsTurbo) {
      if (!p.isNitroActive) {
        racingAudio.playTurboBoost();
      }
      p.isNitroActive = true;
      p.nitroAmount = Math.max(0, p.nitroAmount - 28 * dt);
      if (p.nitroAmount <= 0) p.isNitroActive = false;
    } else {
      p.isNitroActive = false;
      // Passive nitro refill
      p.nitroAmount = Math.min(100, p.nitroAmount + 3.5 * dt);
    }

    // Accelerating / Braking / Cruising
    if (this.input.brake) {
      p.speed = Math.max(30, p.speed - BRAKE_RATE * dt);
      p.isBraking = true;
      p.isAccelerating = false;
      if (p.speed > 70) racingAudio.playTireScreech();
    } else if (this.input.accelerate) {
      const topSpeed = p.isNitroActive ? MAX_TURBO_SPEED : MAX_CRUISE_SPEED;
      const rate = p.isNitroActive ? TURBO_ACCEL_RATE : ACCEL_RATE;
      p.speed = Math.min(topSpeed, p.speed + rate * dt);
      p.isAccelerating = true;
      p.isBraking = false;
    } else if (p.isNitroActive) {
      p.speed = Math.min(MAX_TURBO_SPEED, p.speed + TURBO_ACCEL_RATE * dt);
      p.isAccelerating = true;
      p.isBraking = false;
    } else if (this.autoCruise) {
      // Auto-cruise: maintain natural highway speed so driving is always active
      if (p.speed < BASE_CRUISE_SPEED) {
        p.speed = Math.min(BASE_CRUISE_SPEED, p.speed + 70 * dt);
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

    // Steering - Always responsive and crisp
    const steerSpeed = 12.5;
    if (this.input.left) {
      p.x = Math.max(-7.8, p.x - steerSpeed * dt);
      p.steerAngle = THREE.MathUtils.lerp(p.steerAngle, 0.35, 0.25);
    } else if (this.input.right) {
      p.x = Math.min(7.8, p.x + steerSpeed * dt);
      p.steerAngle = THREE.MathUtils.lerp(p.steerAngle, -0.35, 0.25);
    } else if (this.targetX !== null) {
      // Direct touch / mouse steering towards target lane X
      const diff = this.targetX - p.x;
      if (Math.abs(diff) > 0.15) {
        const dir = Math.sign(diff);
        p.x += dir * Math.min(Math.abs(diff), steerSpeed * dt);
        p.steerAngle = THREE.MathUtils.lerp(p.steerAngle, -dir * 0.35, 0.25);
      } else {
        p.steerAngle = THREE.MathUtils.lerp(p.steerAngle, 0, 0.2);
        this.targetX = null;
      }
    } else {
      p.steerAngle = THREE.MathUtils.lerp(p.steerAngle, 0, 0.2);
    }

    // Advance forward (Z axis in Three.js is negative forward)
    const speedMps = (p.speed * 1000) / 3600;
    p.z -= speedMps * dt;
    this.gameStatus.distance = Math.floor(Math.abs(p.z));

    // Update Player Car Mesh
    this.playerCarMesh.position.set(p.x, 0, p.z);
    this.playerCarMesh.rotation.y = p.steerAngle * 0.45;
    this.playerCarMesh.rotation.z = -p.steerAngle * 0.35; // Body roll during high speed turns

    // Animate wheels rotation and front wheel steering pivot
    const wheelRotDelta = (speedMps * dt) / 0.36;
    for (let w = 0; w < 4; w++) {
      const wheel = this.playerCarMesh.getObjectByName(`wheel_${w}`);
      if (wheel) {
        wheel.rotation.x -= wheelRotDelta;
        if (w === 0 || w === 1) {
          wheel.rotation.y = p.steerAngle * 0.7;
        }
      }
    }

    // Nitro Flames Animation
    if (this.nitroFlameLeft && this.nitroFlameRight) {
      if (p.isNitroActive) {
        this.nitroFlameLeft.visible = true;
        this.nitroFlameRight.visible = true;
        const scale = 0.8 + Math.random() * 0.5;
        this.nitroFlameLeft.scale.set(scale, scale, 1.2 + Math.random() * 0.8);
        this.nitroFlameRight.scale.set(scale, scale, 1.2 + Math.random() * 0.8);
      } else {
        this.nitroFlameLeft.visible = false;
        this.nitroFlameRight.visible = false;
      }
    }

    // Update Highway Environment scrolling
    this.env.updateRoad(p.z, p.speed, p.isNitroActive);

    // Audio Engine Sound
    racingAudio.updateEngine(p.speed, p.isAccelerating, p.isNitroActive);
  }

  // ---------------------------------------------------------------------------
  // POLICE PURSUIT & TRAFFIC SIMULATION
  // ---------------------------------------------------------------------------
  private updatePursuitAndTraffic(dt: number) {
    const playerZ = this.playerState.z;
    this.sirenTimer += dt;
    this.policeLightPhase += dt * 10;

    let hasActivePoliceNearby = false;

    // Update existing traffic & police cars
    for (let i = this.trafficList.length - 1; i >= 0; i--) {
      const item = this.trafficList[i];
      const { data, mesh } = item;

      if (item.isWrecked) {
        // Takedown police or wrecked car spinning into shoulder
        mesh.position.y += Math.sin(this.sirenTimer * 8) * 0.05;
        mesh.rotation.y += 12 * dt;
        mesh.rotation.z += 8 * dt;
        mesh.position.x += (mesh.position.x > 0 ? 1 : -1) * 8 * dt;
      } else if (data.isRoadblock) {
        // Roadblock is stationary
      } else if (data.type === 'police') {
        hasActivePoliceNearby = true;
        // Police AI Behavior
        const distToPlayerZ = mesh.position.z - playerZ; // > 0 means behind, < 0 means ahead

        if (distToPlayerZ > 2) {
          // Police is behind player -> accelerate aggressively to catch up!
          const chaseSpeed = Math.max(data.speed, this.playerState.speed + 35);
          mesh.position.z -= ((chaseSpeed * 1000) / 3600) * dt;

          // Steer towards player's lane
          const targetX = this.playerState.x;
          mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, 2.0 * dt);
        } else if (distToPlayerZ < -15) {
          // Police is far ahead -> maintain speed
          mesh.position.z -= ((data.speed * 1000) / 3600) * dt;
        } else {
          // Alongside or right behind player -> Ramming maneuver!
          mesh.position.z -= ((this.playerState.speed * 1000) / 3600) * dt;
          const steerTowardsPlayer = this.playerState.x > mesh.position.x ? 3.5 : -3.5;
          mesh.position.x += steerTowardsPlayer * dt;
        }

        // Flashing Red/Blue Strobe lights on Police Cruiser
        const isRed = Math.sin(this.policeLightPhase) > 0;
        const redLight = mesh.getObjectByName('policeRedLight') as THREE.Mesh;
        const blueLight = mesh.getObjectByName('policeBlueLight') as THREE.Mesh;
        const redPt = mesh.getObjectByName('redPointLight') as THREE.PointLight;
        const bluePt = mesh.getObjectByName('bluePointLight') as THREE.PointLight;

        if (redLight && blueLight) {
          (redLight.material as THREE.MeshStandardMaterial).emissiveIntensity = isRed ? 4.0 : 0.2;
          (blueLight.material as THREE.MeshStandardMaterial).emissiveIntensity = isRed ? 0.2 : 4.0;
        }
        if (redPt && bluePt) {
          redPt.intensity = isRed ? 5.0 : 0.1;
          bluePt.intensity = isRed ? 0.1 : 5.0;
        }

        // Bust Mechanic: only if police has boxed in the player (< 4.8m) at near standstill (< 28 km/h) after game has been running
        const lateralDist = Math.abs(mesh.position.x - this.playerState.x);
        const longDist = Math.abs(mesh.position.z - this.playerState.z);

        if (this.gameStatus.elapsedTime > 5 && longDist < 4.8 && lateralDist < 2.8 && this.playerState.speed < 28) {
          this.bustProgress += dt * 0.35; // requires ~3 seconds of being boxed in at standstill
          if (this.bustProgress >= 1.0) {
            this.handleBusted();
            return;
          }
        } else {
          this.bustProgress = Math.max(0, this.bustProgress - dt * 0.6);
        }
      } else {
        // Civilian car moves forward at steady speed
        const speedMps = (data.speed * 1000) / 3600;
        mesh.position.z -= speedMps * dt;
      }

      // Despawn if too far behind or ahead
      if (mesh.position.z > playerZ + 50 || mesh.position.z < playerZ - 250) {
        this.scene.remove(mesh);
        this.trafficList.splice(i, 1);
      }
    }

    // Toggle Siren audio based on nearby police presence
    racingAudio.setSiren(hasActivePoliceNearby && this.gameStatus.heatLevel >= 2);

    // Spawn New Traffic Ahead
    if (this.nextTrafficSpawnZ > playerZ - 180) {
      this.nextTrafficSpawnZ -= 35 + Math.random() * 25;
      const laneX = [-6, -2, 2, 6][Math.floor(Math.random() * 4)];

      // Chance of police spawn increases with heat level
      const policeChance = 0.15 + this.gameStatus.heatLevel * 0.12;
      const isPolice = Math.random() < policeChance;

      this.spawnVehicle(
        isPolice ? 'police' : (['sedan', 'suv', 'truck'][Math.floor(Math.random() * 3)] as any),
        laneX,
        this.nextTrafficSpawnZ
      );
    }

    // Spawn Police Roadblock at higher heat levels
    if (this.gameStatus.heatLevel >= 3 && this.nextRoadblockZ > playerZ - 200) {
      this.nextRoadblockZ -= 500 + Math.random() * 300;
      // Block 2 lanes
      const blockX = Math.random() > 0.5 ? -3.5 : 3.5;
      this.spawnVehicle('police', blockX, this.nextRoadblockZ, true);
      // Flanking police car
      this.spawnVehicle('police', blockX + (blockX > 0 ? -3 : 3), this.nextRoadblockZ + 2);
    }
  }

  // ---------------------------------------------------------------------------
  // PICKUPS (NITRO CANISTERS, REPAIRS, COINS)
  // ---------------------------------------------------------------------------
  private updatePickups(dt: number) {
    const playerZ = this.playerState.z;

    for (let i = this.pickupList.length - 1; i >= 0; i--) {
      const item = this.pickupList[i];
      item.mesh.rotation.y += 2.5 * dt;

      // Check Collection
      const dx = Math.abs(item.mesh.position.x - this.playerState.x);
      const dz = Math.abs(item.mesh.position.z - this.playerState.z);

      if (dx < 1.8 && dz < 2.5) {
        // Collect!
        racingAudio.playPickup();
        if (item.data.type === 'nitro') {
          this.playerState.nitroAmount = 100;
          this.gameStatus.score += 200;
        } else if (item.data.type === 'repair') {
          this.playerState.health = Math.min(100, this.playerState.health + 35);
          this.gameStatus.score += 150;
        } else {
          this.gameStatus.score += 300;
        }

        this.scene.remove(item.mesh);
        this.pickupList.splice(i, 1);
        continue;
      }

      // Despawn behind
      if (item.mesh.position.z > playerZ + 25) {
        this.scene.remove(item.mesh);
        this.pickupList.splice(i, 1);
      }
    }

    // Spawn new pickup ahead
    if (this.nextPickupSpawnZ > playerZ - 180) {
      this.nextPickupSpawnZ -= 75 + Math.random() * 50;
      const type = Math.random() < 0.55 ? 'nitro' : (Math.random() < 0.5 ? 'repair' : 'cash');
      const laneX = [-6, -2, 2, 6][Math.floor(Math.random() * 4)];
      this.spawnPickup(type, laneX, this.nextPickupSpawnZ);
    }
  }

  // ---------------------------------------------------------------------------
  // COLLISIONS & NEAR MISSES
  // ---------------------------------------------------------------------------
  private checkCollisions() {
    const px = this.playerState.x;
    const pz = this.playerState.z;
    const pWidth = 1.9;
    const pLength = 4.4;

    this.trafficList.forEach((item) => {
      if (item.isWrecked) return;

      const tx = item.mesh.position.x;
      const tz = item.mesh.position.z;
      const dx = Math.abs(px - tx);
      const dz = Math.abs(pz - tz);

      // Hitbox dimensions
      const tWidth = item.data.type === 'truck' ? 2.4 : 2.0;
      const tLength = item.data.type === 'truck' ? 7.0 : 4.5;

      const collX = (pWidth + tWidth) / 2;
      const collZ = (pLength + tLength) / 2;

      // 1. COLLISION DETECTED
      if (dx < collX * 0.9 && dz < collZ * 0.85) {
        // High-speed Turbo Ram on Police Cruiser = COP TAKEDOWN!
        if (this.playerState.isNitroActive && item.data.type === 'police' && this.playerState.speed > 210) {
          item.isWrecked = true;
          racingAudio.playCrash();
          this.triggerScreenShake(0.35);
          this.gameStatus.copsEvaded += 1;
          this.gameStatus.score += 750;
          this.callbacks.onCopTakedown(750);
          return;
        }

        // Regular Crash
        racingAudio.playCrash();
        this.triggerScreenShake(0.5);

        // Crash damage based on speed
        const damage = Math.round(15 + (this.playerState.speed / 300) * 25);
        this.playerState.health = Math.max(0, this.playerState.health - damage);
        this.playerState.speed = Math.max(30, this.playerState.speed * 0.4);

        // Push away
        const pushDir = px > tx ? 1 : -1;
        this.playerState.x = Math.max(-7.8, Math.min(7.8, this.playerState.x + pushDir * 2.0));

        this.callbacks.onCrash(damage);

        if (this.playerState.health <= 0) {
          this.handleWrecked();
        }
      }
      // 2. NEAR MISS (Close overtake at high speed without hitting)
      else if (dx < collX + 1.2 && dz < collZ + 1.5 && this.playerState.speed > 160) {
        if (!item.mesh.userData.nearMissTriggered) {
          item.mesh.userData.nearMissTriggered = true;
          racingAudio.playNearMiss();
          this.gameStatus.nearMisses += 1;
          this.gameStatus.score += 150;
          // Reward nitro
          this.playerState.nitroAmount = Math.min(100, this.playerState.nitroAmount + 16);
          this.callbacks.onNearMiss(150);
        }
      }
    });
  }

  private triggerScreenShake(amount: number) {
    this.shakeAmount = amount;
  }

  // ---------------------------------------------------------------------------
  // CAMERA FOLLOW & WARP EFFECTS
  // ---------------------------------------------------------------------------
  private updateCamera(dt: number) {
    const p = this.playerState;

    // Screen Shake decay
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeAmount > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeAmount;
      shakeY = (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 1.5);
    }

    // Dynamic FOV Zoom on Turbo Boost
    const targetFov = p.isNitroActive ? 75 : (p.speed > 220 ? 68 : 60);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.08);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'third_person') {
      const targetCamX = p.x * 0.65 + shakeX;
      const targetCamY = 3.8 + (p.speed / 300) * 0.8 + shakeY;
      const targetCamZ = p.z + 8.2 + (p.isNitroActive ? 1.5 : 0);

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, 0.15);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, 0.15);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, 0.2);

      this.camera.lookAt(p.x * 0.3, 1.2, p.z - 18);
    } else if (this.cameraMode === 'close') {
      this.camera.position.set(p.x * 0.8 + shakeX, 2.5 + shakeY, p.z + 5.5);
      this.camera.lookAt(p.x, 1.2, p.z - 20);
    } else {
      // Hood / Cockpit Cam
      this.camera.position.set(p.x + shakeX, 1.2 + shakeY, p.z - 0.5);
      this.camera.lookAt(p.x, 1.0, p.z - 30);
    }
  }

  // ---------------------------------------------------------------------------
  // STATS & HEAT LEVEL
  // ---------------------------------------------------------------------------
  private updateHeatAndStats(dt: number) {
    this.gameStatus.elapsedTime += dt;
    this.gameStatus.score += Math.round((this.playerState.speed / 100) * 10 * dt);

    // Heat Level progression
    const dist = this.gameStatus.distance;
    if (dist > 5000) this.gameStatus.heatLevel = 5;
    else if (dist > 3500) this.gameStatus.heatLevel = 4;
    else if (dist > 2000) this.gameStatus.heatLevel = 3;
    else if (dist > 800) this.gameStatus.heatLevel = 2;
    else this.gameStatus.heatLevel = 1;

    this.callbacks.onUpdateStats(this.gameStatus, this.playerState);
  }

  private handleBusted() {
    this.gameStatus.state = 'busted';
    racingAudio.setSiren(false);
    racingAudio.stopEngine();
    this.callbacks.onGameOver('busted');
  }

  private handleWrecked() {
    this.gameStatus.state = 'wrecked';
    racingAudio.setSiren(false);
    racingAudio.stopEngine();
    this.callbacks.onGameOver('wrecked');
  }

  public setSteerTarget(targetX: number | null) {
    this.targetX = targetX !== null ? Math.max(-7.6, Math.min(7.6, targetX)) : null;
  }

  public restart() {
    this.playerState = {
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
    };

    this.gameStatus = {
      state: 'racing',
      distance: 0,
      score: 0,
      heatLevel: 1,
      copsEvaded: 0,
      nearMisses: 0,
      timeRemaining: 120,
      elapsedTime: 0,
    };

    this.bustProgress = 0;
    this.nextTrafficSpawnZ = -100;
    this.nextPickupSpawnZ = -140;
    this.nextRoadblockZ = -800;
    this.targetX = null;

    // Clear traffic & pickups
    this.trafficList.forEach((t) => this.scene.remove(t.mesh));
    this.trafficList = [];
    this.pickupList.forEach((p) => this.scene.remove(p.mesh));
    this.pickupList = [];

    this.spawnInitialTraffic();
  }

  public destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    racingAudio.setSiren(false);
    racingAudio.stopEngine();
    this.renderer.dispose();
  }
}
