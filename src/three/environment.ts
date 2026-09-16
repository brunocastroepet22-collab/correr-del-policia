import * as THREE from 'three';

export interface EnvironmentScene {
  scene: THREE.Scene;
  roadSegments: THREE.Group[];
  cityBuildings: THREE.Group;
  speedLines: THREE.Points;
  updateRoad: (playerZ: number, speed: number, isTurbo: boolean) => void;
}

export function setupEnvironment(scene: THREE.Scene): EnvironmentScene {
  // Fog for distance atmospheric fade
  scene.fog = new THREE.FogExp2(0x0b0e14, 0.007);
  scene.background = new THREE.Color(0x080b10);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x334155, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.5);
  dirLight.position.set(40, 60, -30);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Create Road Segments (chunked infinite scrolling highway)
  const ROAD_SEGMENT_LENGTH = 120;
  const NUM_SEGMENTS = 6;
  const ROAD_WIDTH = 18; // 4 lanes

  const roadSegments: THREE.Group[] = [];

  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const segment = createRoadSegment(ROAD_WIDTH, ROAD_SEGMENT_LENGTH);
    segment.position.z = -i * ROAD_SEGMENT_LENGTH;
    scene.add(segment);
    roadSegments.push(segment);
  }

  // City Skyline Backdrop (Skyscrapers with glowing windows)
  const cityBuildings = createCitySkyline();
  scene.add(cityBuildings);

  // Turbo Speed Lines Particle System
  const speedLines = createSpeedLines();
  scene.add(speedLines);

  // Update function to cycle road chunks and update visual effects
  const updateRoad = (playerZ: number, speed: number, isTurbo: boolean) => {
    roadSegments.forEach((segment) => {
      // If segment is too far behind the camera, move it to the front
      if (segment.position.z > playerZ + 40) {
        // Find farthest segment ahead
        let minZ = 0;
        roadSegments.forEach((s) => {
          if (s.position.z < minZ) minZ = s.position.z;
        });
        segment.position.z = minZ - ROAD_SEGMENT_LENGTH;
      }
    });

    // Move city skyline slowly to create parallax effect
    cityBuildings.position.z = playerZ - 200;

    // Turbo Speed Lines animation
    const positions = speedLines.geometry.attributes.position.array as Float32Array;
    const count = positions.length / 3;

    speedLines.visible = isTurbo || speed > 220;
    if (speedLines.visible) {
      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        // Move lines towards player
        positions[idx + 2] += (speed / 30) * (isTurbo ? 2.2 : 1.2);

        // Reset if behind
        if (positions[idx + 2] > playerZ + 20) {
          positions[idx + 2] = playerZ - 120 - Math.random() * 60;
          positions[idx] = (Math.random() - 0.5) * 26;
          positions[idx + 1] = 0.5 + Math.random() * 8;
        }
      }
      speedLines.geometry.attributes.position.needsUpdate = true;
    }
  };

  return {
    scene,
    roadSegments,
    cityBuildings,
    speedLines,
    updateRoad,
  };
}

/**
 * Creates one continuous chunk of the 4-lane highway with dashed stripes, guardrails, and streetlamps
 */
function createRoadSegment(width: number, length: number): THREE.Group {
  const segment = new THREE.Group();

  // 1. Asphalt road surface
  const roadGeom = new THREE.PlaneGeometry(width, length, 1, 10);
  roadGeom.rotateX(-Math.PI / 2);

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    roughness: 0.85,
    metalness: 0.1,
  });

  const road = new THREE.Mesh(roadGeom, roadMat);
  road.receiveShadow = true;
  segment.add(road);

  // 2. Road shoulders (gravel / grass borders)
  const shoulderGeom = new THREE.PlaneGeometry(30, length);
  shoulderGeom.rotateX(-Math.PI / 2);
  const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x0c1117, roughness: 0.95 });

  const shoulderLeft = new THREE.Mesh(shoulderGeom, shoulderMat);
  shoulderLeft.position.set(-width / 2 - 15, -0.05, 0);
  segment.add(shoulderLeft);

  const shoulderRight = new THREE.Mesh(shoulderGeom, shoulderMat);
  shoulderRight.position.set(width / 2 + 15, -0.05, 0);
  segment.add(shoulderRight);

  // 3. Lane Markings (White dashed lines for 4 lanes, yellow edge lines)
  const whiteDashMat = new THREE.MeshBasicMaterial({ color: 0xf3f4f6 });
  const yellowEdgeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

  // Outer yellow lines
  const edgeLineGeom = new THREE.PlaneGeometry(0.2, length);
  edgeLineGeom.rotateX(-Math.PI / 2);

  const leftEdge = new THREE.Mesh(edgeLineGeom, yellowEdgeMat);
  leftEdge.position.set(-width / 2 + 0.3, 0.02, 0);
  segment.add(leftEdge);

  const rightEdge = new THREE.Mesh(edgeLineGeom, yellowEdgeMat);
  rightEdge.position.set(width / 2 - 0.3, 0.02, 0);
  segment.add(rightEdge);

  // 3 inner lane dividers (dashed lines)
  const laneOffsets = [-width / 4, 0, width / 4];
  const dashLength = 4.0;
  const dashGap = 6.0;
  const numDashes = Math.floor(length / (dashLength + dashGap));

  laneOffsets.forEach((lx) => {
    for (let d = 0; d < numDashes; d++) {
      const dashGeom = new THREE.PlaneGeometry(0.18, dashLength);
      dashGeom.rotateX(-Math.PI / 2);
      const dash = new THREE.Mesh(dashGeom, whiteDashMat);
      dash.position.set(lx, 0.02, -length / 2 + d * (dashLength + dashGap) + dashLength / 2);
      segment.add(dash);
    }
  });

  // 4. Guardrails (Left and Right steel crash barriers)
  const railGeom = new THREE.BoxGeometry(0.2, 0.7, length);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });

  const railLeft = new THREE.Mesh(railGeom, railMat);
  railLeft.position.set(-width / 2 - 0.3, 0.4, 0);
  segment.add(railLeft);

  const railRight = new THREE.Mesh(railGeom, railMat);
  railRight.position.set(width / 2 + 0.3, 0.4, 0);
  segment.add(railRight);

  // Guardrail safety reflectors (red and white)
  const reflectorGeom = new THREE.BoxGeometry(0.08, 0.15, 0.3);
  const reflectorMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const reflectorMatWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let rz = -length / 2 + 10; rz < length / 2; rz += 20) {
    const refL = new THREE.Mesh(reflectorGeom, reflectorMatRed);
    refL.position.set(-width / 2 - 0.18, 0.5, rz);
    segment.add(refL);

    const refR = new THREE.Mesh(reflectorGeom, reflectorMatWhite);
    refR.position.set(width / 2 + 0.18, 0.5, rz);
    segment.add(refR);
  }

  // 5. Streetlamps along the highway
  const poleGeom = new THREE.CylinderGeometry(0.12, 0.15, 8.0, 8);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
  const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xfff0c2 });

  for (let lz = -length / 2 + 15; lz < length / 2; lz += 40) {
    [-width / 2 - 2.5, width / 2 + 2.5].forEach((lx, idx) => {
      const lamp = new THREE.Group();
      lamp.position.set(lx, 0, lz);

      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 4.0;
      lamp.add(pole);

      // Arm reaching over road
      const armGeom = new THREE.BoxGeometry(2.5, 0.1, 0.1);
      const arm = new THREE.Mesh(armGeom, poleMat);
      arm.position.set(idx === 0 ? 1.0 : -1.0, 7.8, 0);
      lamp.add(arm);

      // Glowing light bulb
      const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.4), lampHeadMat);
      bulb.position.set(idx === 0 ? 2.0 : -2.0, 7.7, 0);
      lamp.add(bulb);

      // Pointlight pool on the asphalt
      const light = new THREE.PointLight(0xffe4a0, 1.2, 22, 1.5);
      light.position.set(idx === 0 ? 2.0 : -2.0, 7.5, 0);
      lamp.add(light);

      segment.add(lamp);
    });
  }

  // 6. Overhead Highway Sign Bridge on random segments
  if (Math.random() < 0.35) {
    const signBridge = createHighwaySignBridge(width);
    signBridge.position.set(0, 0, -length / 4);
    segment.add(signBridge);
  }

  return segment;
}

/**
 * Creates overhead highway gantry sign ("POLICE PATROL ZONE", "SPEED TRAP", etc.)
 */
function createHighwaySignBridge(roadWidth: number): THREE.Group {
  const gantry = new THREE.Group();
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x223244, metalness: 0.8 });

  // Left & Right support pillars
  const pillarGeom = new THREE.BoxGeometry(0.5, 8.0, 0.5);
  const leftPillar = new THREE.Mesh(pillarGeom, trussMat);
  leftPillar.position.set(-roadWidth / 2 - 2, 4.0, 0);
  gantry.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeom, trussMat);
  rightPillar.position.set(roadWidth / 2 + 2, 4.0, 0);
  gantry.add(rightPillar);

  // Cross beam
  const beamGeom = new THREE.BoxGeometry(roadWidth + 5, 0.6, 0.6);
  const beam = new THREE.Mesh(beamGeom, trussMat);
  beam.position.set(0, 7.8, 0);
  gantry.add(beam);

  // Big green highway sign
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#065f46'; // Highway green
  ctx.fillRect(0, 0, 512, 128);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPEED TRAP ZONE', 256, 45);

  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('MAX 320 KM/H  •  RADAR ACTIVO', 256, 85);

  const tex = new THREE.CanvasTexture(canvas);
  const signGeom = new THREE.PlaneGeometry(8.0, 2.0);
  const signMat = new THREE.MeshBasicMaterial({ map: tex });
  const signMesh = new THREE.Mesh(signGeom, signMat);
  signMesh.position.set(0, 6.8, 0.35);
  gantry.add(signMesh);

  return gantry;
}

/**
 * Creates distant city skyscrapers with glowing illuminated windows
 */
function createCitySkyline(): THREE.Group {
  const city = new THREE.Group();

  const buildingColors = [0x0f172a, 0x1e293b, 0x111827, 0x182030];
  const windowCanvas = document.createElement('canvas');
  windowCanvas.width = 128;
  windowCanvas.height = 256;
  const wctx = windowCanvas.getContext('2d')!;

  wctx.fillStyle = '#0a0f18';
  wctx.fillRect(0, 0, 128, 256);

  // Draw grid of lit windows
  for (let y = 10; y < 250; y += 16) {
    for (let x = 8; x < 120; x += 12) {
      if (Math.random() > 0.4) {
        wctx.fillStyle = Math.random() > 0.2 ? '#fef08a' : '#38bdf8';
        wctx.fillRect(x, y, 6, 8);
      }
    }
  }

  const windowTex = new THREE.CanvasTexture(windowCanvas);
  windowTex.wrapS = THREE.RepeatWrapping;
  windowTex.wrapT = THREE.RepeatWrapping;
  windowTex.repeat.set(2, 6);

  const buildingMat = new THREE.MeshStandardMaterial({
    map: windowTex,
    roughness: 0.6,
    metalness: 0.2,
  });

  // Spawn buildings on left and right horizons
  for (let i = 0; i < 40; i++) {
    const width = 12 + Math.random() * 16;
    const depth = 12 + Math.random() * 16;
    const height = 30 + Math.random() * 70;

    const bGeom = new THREE.BoxGeometry(width, height, depth);
    const building = new THREE.Mesh(bGeom, buildingMat);

    const side = i % 2 === 0 ? -1 : 1;
    const xPos = side * (50 + Math.random() * 120);
    const zPos = -Math.random() * 400;

    building.position.set(xPos, height / 2 - 5, zPos);
    city.add(building);
  }

  return city;
}

/**
 * Creates speed lines particle system for the Turbo Nitro effect
 */
function createSpeedLines(): THREE.Points {
  const count = 350;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 26;
    positions[i * 3 + 1] = 0.5 + Math.random() * 8;
    positions[i * 3 + 2] = -Math.random() * 180;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.PointsMaterial({
    color: 0x38bdf8,
    size: 0.28,
    transparent: true,
    opacity: 0.8,
  });

  return new THREE.Points(geom, mat);
}
