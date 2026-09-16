export type VehicleType = 'player' | 'police' | 'sedan' | 'suv' | 'truck';

export interface CarCustomization {
  id: string;
  name: string;
  color: string;
  accentColor: string;
  topSpeed: number;
  acceleration: number;
  nitroMultiplier: number;
}

export interface PlayerCarState {
  x: number; // Lateral position (-8 to 8)
  z: number; // World distance traveled (meters)
  speed: number; // km/h (0 to 340)
  targetSpeed: number;
  steerAngle: number;
  nitroAmount: number; // 0 to 100
  isNitroActive: boolean;
  health: number; // 0 to 100
  isBraking: boolean;
  isAccelerating: boolean;
}

export interface TrafficVehicle {
  id: number;
  type: 'police' | 'sedan' | 'suv' | 'truck';
  x: number;
  z: number;
  speed: number;
  lane: number;
  color: string;
  sirenActive?: boolean;
  policeState?: 'intercepting' | 'chasing' | 'alongside' | 'patrol';
  isRoadblock?: boolean;
}

export interface PickupItem {
  id: number;
  type: 'nitro' | 'repair' | 'cash';
  x: number;
  z: number;
  collected: boolean;
}

export interface RoadSegmentData {
  curve: number;
  elevation: number;
}

export interface GameStatus {
  state: 'menu' | 'racing' | 'busted' | 'wrecked' | 'victory';
  distance: number;
  score: number;
  heatLevel: number; // 1 to 5 stars
  copsEvaded: number;
  nearMisses: number;
  timeRemaining: number;
  elapsedTime: number;
}

export type CameraView = 'third_person' | 'close' | 'hood';
