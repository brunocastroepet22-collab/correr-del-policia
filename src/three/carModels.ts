import * as THREE from 'three';

/**
 * Creates a detailed 3D sports car model for the player
 */
export function createPlayerCar(colorHex = 0xe62e2d, accentHex = 0x111111): THREE.Group {
  const car = new THREE.Group();

  // Materials
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: colorHex,
    metalness: 0.8,
    roughness: 0.2,
  });

  const blackMaterial = new THREE.MeshStandardMaterial({
    color: accentHex,
    metalness: 0.5,
    roughness: 0.5,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111e28,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.6,
    transparent: true,
  });

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffeeaa,
    emissiveIntensity: 2.0,
  });

  const tailLightMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0022,
    emissive: 0xff0022,
    emissiveIntensity: 2.5,
  });

  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.9,
    roughness: 0.2,
  });

  // Main chassis/lower body
  const chassisGeom = new THREE.BoxGeometry(1.9, 0.45, 4.4);
  const chassis = new THREE.Mesh(chassisGeom, bodyMaterial);
  chassis.position.y = 0.45;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  car.add(chassis);

  // Front hood slope
  const hoodGeom = new THREE.BoxGeometry(1.8, 0.25, 1.4);
  const hood = new THREE.Mesh(hoodGeom, bodyMaterial);
  hood.position.set(0, 0.55, -1.2);
  hood.rotation.x = 0.08;
  car.add(hood);

  // Front bumper / splitter
  const splitterGeom = new THREE.BoxGeometry(1.94, 0.12, 0.8);
  const splitter = new THREE.Mesh(splitterGeom, blackMaterial);
  splitter.position.set(0, 0.22, -1.9);
  car.add(splitter);

  // Cabin / Roof
  const cabinGeom = new THREE.BoxGeometry(1.5, 0.52, 2.0);
  const cabin = new THREE.Mesh(cabinGeom, blackMaterial);
  cabin.position.set(0, 0.86, 0.1);
  cabin.castShadow = true;
  car.add(cabin);

  // Windshield (Front)
  const windshieldGeom = new THREE.PlaneGeometry(1.4, 0.6);
  const windshield = new THREE.Mesh(windshieldGeom, glassMaterial);
  windshield.position.set(0, 0.88, -0.9);
  windshield.rotation.x = -Math.PI / 3.8;
  car.add(windshield);

  // Rear windshield
  const rearGlassGeom = new THREE.PlaneGeometry(1.36, 0.55);
  const rearGlass = new THREE.Mesh(rearGlassGeom, glassMaterial);
  rearGlass.position.set(0, 0.86, 1.1);
  rearGlass.rotation.x = Math.PI / 4;
  rearGlass.rotation.y = Math.PI;
  car.add(rearGlass);

  // Side windows
  const sideGlassGeom = new THREE.PlaneGeometry(1.7, 0.38);
  const leftGlass = new THREE.Mesh(sideGlassGeom, glassMaterial);
  leftGlass.position.set(-0.76, 0.85, 0.1);
  leftGlass.rotation.y = -Math.PI / 2;
  car.add(leftGlass);

  const rightGlass = new THREE.Mesh(sideGlassGeom, glassMaterial);
  rightGlass.position.set(0.76, 0.85, 0.1);
  rightGlass.rotation.y = Math.PI / 2;
  car.add(rightGlass);

  // Rear Spoiler / Wing
  const wingStandGeom = new THREE.BoxGeometry(0.08, 0.35, 0.15);
  const wingLeft = new THREE.Mesh(wingStandGeom, blackMaterial);
  wingLeft.position.set(-0.65, 0.85, 1.95);
  car.add(wingLeft);

  const wingRight = new THREE.Mesh(wingStandGeom, blackMaterial);
  wingRight.position.set(0.65, 0.85, 1.95);
  car.add(wingRight);

  const wingBladeGeom = new THREE.BoxGeometry(1.9, 0.08, 0.4);
  const wingBlade = new THREE.Mesh(wingBladeGeom, bodyMaterial);
  wingBlade.position.set(0, 1.05, 1.98);
  wingBlade.rotation.x = 0.08;
  car.add(wingBlade);

  // Headlights
  const headlightGeom = new THREE.BoxGeometry(0.35, 0.12, 0.1);
  const hlLeft = new THREE.Mesh(headlightGeom, lightMaterial);
  hlLeft.position.set(-0.7, 0.5, -2.18);
  car.add(hlLeft);

  const hlRight = new THREE.Mesh(headlightGeom, lightMaterial);
  hlRight.position.set(0.7, 0.5, -2.18);
  car.add(hlRight);

  // Taillights
  const tailGeom = new THREE.BoxGeometry(0.45, 0.12, 0.08);
  const tlLeft = new THREE.Mesh(tailGeom, tailLightMaterial);
  tlLeft.position.set(-0.65, 0.55, 2.18);
  car.add(tlLeft);

  const tlRight = new THREE.Mesh(tailGeom, tailLightMaterial);
  tlRight.position.set(0.65, 0.55, 2.18);
  car.add(tlRight);

  // Dual Exhaust pipes (for nitro flame emission)
  const exhaustGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8);
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 });

  const exLeft = new THREE.Mesh(exhaustGeom, exhaustMat);
  exLeft.rotation.x = Math.PI / 2;
  exLeft.position.set(-0.35, 0.3, 2.2);
  car.add(exLeft);

  const exRight = new THREE.Mesh(exhaustGeom, exhaustMat);
  exRight.rotation.x = Math.PI / 2;
  exRight.position.set(0.35, 0.3, 2.2);
  car.add(exRight);

  // Nitro Flames (hidden by default)
  const flameGeom = new THREE.ConeGeometry(0.18, 1.4, 8);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.9,
  });

  const flameLeft = new THREE.Mesh(flameGeom, flameMat);
  flameLeft.rotation.x = -Math.PI / 2;
  flameLeft.position.set(-0.35, 0.3, 2.9);
  flameLeft.visible = false;
  flameLeft.name = 'nitroFlameLeft';
  car.add(flameLeft);

  const flameRight = new THREE.Mesh(flameGeom, flameMat.clone());
  flameRight.rotation.x = -Math.PI / 2;
  flameRight.position.set(0.35, 0.3, 2.9);
  flameRight.visible = false;
  flameRight.name = 'nitroFlameRight';
  car.add(flameRight);

  // 4 Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 16);
  wheelGeom.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.95, 0.36, -1.3], // Front Left
    [0.95, 0.36, -1.3],  // Front Right
    [-0.95, 0.36, 1.3],  // Rear Left
    [0.95, 0.36, 1.3],   // Rear Right
  ];

  wheelPositions.forEach(([wx, wy, wz], index) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);
    wheelGroup.name = `wheel_${index}`;

    const tire = new THREE.Mesh(wheelGeom, wheelMaterial);
    tire.castShadow = true;
    wheelGroup.add(tire);

    const rimGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.26, 12);
    rimGeom.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, rimMaterial);
    wheelGroup.add(rim);

    car.add(wheelGroup);
  });

  return car;
}

/**
 * Creates an aggressive 3D Police Interceptor car with flashing red & blue strobe lights
 */
export function createPoliceCar(): THREE.Group {
  const police = new THREE.Group();

  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3, metalness: 0.5 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.4, metalness: 0.5 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x111c24, transmission: 0.6, transparent: true });

  // Chassis
  const chassisGeom = new THREE.BoxGeometry(2.0, 0.5, 4.6);
  const chassis = new THREE.Mesh(chassisGeom, blackMat);
  chassis.position.y = 0.5;
  chassis.castShadow = true;
  police.add(chassis);

  // White Doors & Middle section (Iconic black & white police livery)
  const middleGeom = new THREE.BoxGeometry(2.02, 0.48, 2.0);
  const middle = new THREE.Mesh(middleGeom, whiteMat);
  middle.position.set(0, 0.5, 0.1);
  police.add(middle);

  // Cabin
  const cabinGeom = new THREE.BoxGeometry(1.6, 0.56, 2.1);
  const cabin = new THREE.Mesh(cabinGeom, whiteMat);
  cabin.position.set(0, 0.95, 0.1);
  police.add(cabin);

  // Windshields
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), glassMat);
  windshield.position.set(0, 0.98, -0.95);
  windshield.rotation.x = -Math.PI / 3.6;
  police.add(windshield);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), glassMat);
  rearGlass.position.set(0, 0.98, 1.15);
  rearGlass.rotation.x = Math.PI / 3.6;
  rearGlass.rotation.y = Math.PI;
  police.add(rearGlass);

  // Heavy Duty Police Push Bumper (Bullbar)
  const bullbarGeom = new THREE.BoxGeometry(1.6, 0.4, 0.2);
  const bullbarMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9 });
  const bullbar = new THREE.Mesh(bullbarGeom, bullbarMat);
  bullbar.position.set(0, 0.4, -2.4);
  police.add(bullbar);

  // Police Text Emblems on Doors
  const doorDecalLeft = createPoliceDecal();
  doorDecalLeft.position.set(-1.02, 0.5, 0.1);
  doorDecalLeft.rotation.y = -Math.PI / 2;
  police.add(doorDecalLeft);

  const doorDecalRight = createPoliceDecal();
  doorDecalRight.position.set(1.02, 0.5, 0.1);
  doorDecalRight.rotation.y = Math.PI / 2;
  police.add(doorDecalRight);

  // Strobe Lightbar on Roof
  const lightbarBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.12, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
  );
  lightbarBar.position.set(0, 1.28, 0.1);
  police.add(lightbarBar);

  // Red Strobe
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xff0020,
    emissive: 0xff0020,
    emissiveIntensity: 3.0,
  });
  const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.24), redMat);
  redLight.position.set(-0.28, 1.3, 0.1);
  redLight.name = 'policeRedLight';
  police.add(redLight);

  // Blue Strobe
  const blueMat = new THREE.MeshStandardMaterial({
    color: 0x0066ff,
    emissive: 0x0066ff,
    emissiveIntensity: 3.0,
  });
  const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.24), blueMat);
  blueLight.position.set(0.28, 1.3, 0.1);
  blueLight.name = 'policeBlueLight';
  police.add(blueLight);

  // Dynamic Pointlights for flashing glow on ground and player
  const redPointLight = new THREE.PointLight(0xff1133, 4, 16);
  redPointLight.position.set(-0.6, 1.6, 0.1);
  redPointLight.name = 'redPointLight';
  police.add(redPointLight);

  const bluePointLight = new THREE.PointLight(0x1177ff, 4, 16);
  bluePointLight.position.set(0.6, 1.6, 0.1);
  bluePointLight.name = 'bluePointLight';
  police.add(bluePointLight);

  // Wheels
  const wheelGeom = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });

  [
    [-1.0, 0.38, -1.4],
    [1.0, 0.38, -1.4],
    [-1.0, 0.38, 1.4],
    [1.0, 0.38, 1.4],
  ].forEach(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    police.add(wheel);
  });

  return police;
}

/**
 * Creates canvas texture for "POLICE" door badge
 */
function createPoliceDecal(): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 64);

  // Police star badge
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('POLICIA', 64, 32);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('★ 911 ★', 64, 52);

  const texture = new THREE.CanvasTexture(canvas);
  const geom = new THREE.PlaneGeometry(0.9, 0.45);
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  return new THREE.Mesh(geom, mat);
}

/**
 * Creates civilian traffic vehicles (Sedans, SUVs, and Big Trucks)
 */
export function createTrafficVehicle(type: 'sedan' | 'suv' | 'truck', colorHex: number): THREE.Group {
  const vehicle = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.6, roughness: 0.3 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x181818 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x223344, transmission: 0.5, transparent: true });

  const wheelGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12);
  wheelGeom.rotateZ(Math.PI / 2);

  if (type === 'truck') {
    // Semi truck cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.2, 2.4), mat);
    cab.position.set(0, 1.4, -2.2);
    vehicle.add(cab);

    // Trailer
    const trailer = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 2.6, 6.0),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.4 })
    );
    trailer.position.set(0, 1.7, 1.8);
    vehicle.add(trailer);

    // Cab windshield
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), glassMat);
    ws.position.set(0, 1.8, -3.42);
    ws.rotation.y = Math.PI;
    vehicle.add(ws);

    // Truck Wheels (6 pairs)
    [-3.0, -1.8, 1.2, 2.4, 3.6, 4.4].forEach((zPos) => {
      const w1 = new THREE.Mesh(wheelGeom, darkMat);
      w1.position.set(-1.15, 0.45, zPos);
      vehicle.add(w1);
      const w2 = new THREE.Mesh(wheelGeom, darkMat);
      w2.position.set(1.15, 0.45, zPos);
      vehicle.add(w2);
    });
  } else if (type === 'suv') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 4.4), mat);
    body.position.set(0, 0.7, 0);
    vehicle.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 2.5), darkMat);
    cabin.position.set(0, 1.4, 0.2);
    vehicle.add(cabin);

    // Wheels
    [[-1.0, 0.4, -1.4], [1.0, 0.4, -1.4], [-1.0, 0.4, 1.4], [1.0, 0.4, 1.4]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeom, darkMat);
      w.position.set(wx, wy, wz);
      vehicle.add(w);
    });
  } else {
    // Sedan
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 4.2), mat);
    body.position.set(0, 0.45, 0);
    vehicle.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.0), darkMat);
    cabin.position.set(0, 0.85, 0.1);
    vehicle.add(cabin);

    // Wheels
    [[-0.95, 0.35, -1.3], [0.95, 0.35, -1.3], [-0.95, 0.35, 1.3], [0.95, 0.35, 1.3]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wheelGeom, darkMat);
      w.position.set(wx, wy, wz);
      vehicle.add(w);
    });
  }

  // Taillights for all traffic
  const tlMat = new THREE.MeshBasicMaterial({ color: 0xff1122 });
  const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), tlMat);
  tl1.position.set(-0.7, 0.55, 2.15);
  vehicle.add(tl1);

  const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), tlMat);
  tl2.position.set(0.7, 0.55, 2.15);
  vehicle.add(tl2);

  return vehicle;
}

/**
 * Creates 3D Pickups: Nitro Bottles and Cash
 */
export function createPickupMesh(type: 'nitro' | 'repair' | 'cash'): THREE.Group {
  const group = new THREE.Group();

  if (type === 'nitro') {
    // Cyan Nitro Bottle
    const bottleGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 12);
    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x0088cc,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.2,
    });
    const bottle = new THREE.Mesh(bottleGeom, bottleMat);
    group.add(bottle);

    // Valve cap
    const capGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 8);
    const cap = new THREE.Mesh(capGeom, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9 }));
    cap.position.y = 0.75;
    group.add(cap);

    // Glowing ring
    const ringGeom = new THREE.TorusGeometry(0.55, 0.06, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  } else if (type === 'repair') {
    // Green Cross / Wrench
    const bar1 = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.28, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.2 })
    );
    const bar2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 1.0, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 1.2 })
    );
    group.add(bar1);
    group.add(bar2);
  } else {
    // Gold Coin
    const coinGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 16);
    coinGeom.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
      metalness: 0.9,
    });
    const coin = new THREE.Mesh(coinGeom, coinMat);
    group.add(coin);
  }

  group.position.y = 1.0;
  return group;
}

/**
 * Creates police barricade roadblock with flashing warning lights
 */
export function createRoadblockBarricade(): THREE.Group {
  const group = new THREE.Group();

  // Sawhorse barrier
  const barGeom = new THREE.BoxGeometry(4.0, 0.6, 0.15);
  const barMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const bar = new THREE.Mesh(barGeom, barMat);
  bar.position.y = 0.8;
  group.add(bar);

  // Red diagonal stripes
  [-1.4, -0.6, 0.2, 1.0, 1.8].forEach((x) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.61, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xef4444 })
    );
    stripe.position.set(x, 0.8, 0);
    group.add(stripe);
  });

  // Barrier Legs
  const legGeom = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

  [[-1.8, 0.5, 0], [1.8, 0.5, 0]].forEach(([lx, ly, lz]) => {
    const leg1 = new THREE.Mesh(legGeom, legMat);
    leg1.position.set(lx, ly, lz - 0.25);
    leg1.rotation.x = 0.25;
    group.add(leg1);

    const leg2 = new THREE.Mesh(legGeom, legMat);
    leg2.position.set(lx, ly, lz + 0.25);
    leg2.rotation.x = -0.25;
    group.add(leg2);
  });

  // Flashing orange beacon light
  const beaconGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 8);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 3.0,
  });
  const beacon = new THREE.Mesh(beaconGeom, beaconMat);
  beacon.position.set(0, 1.25, 0);
  group.add(beacon);

  return group;
}
