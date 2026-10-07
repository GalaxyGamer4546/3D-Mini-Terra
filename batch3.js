/* ============================================================
   MiniTerra 3D — BATCH 3
   Adds: 3 mobs (pig, chicken, zombie), multi-part animated
         models, wander/flee/chase AI with line of sight,
         light-based spawning, fist combat, item drops that
         fly to the player.
   Loads after the main game script, batch1.js, batch2.js.
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof world === 'undefined' || typeof player === 'undefined') {
    console.error('[Batch 3] game not loaded');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 3] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // 1. NEW ITEMS + BLOCK DEFINITIONS FOR DROPS
  // ============================================================
  section('items', function () {
    // These are "items" not blocks — they don't go in the world,
    // they only exist in the hotbar.
    window.ITEMS = window.ITEMS || {};
    ITEMS.raw_porkchop = { name: 'Raw Porkchop', color: 0xffb8b8 };
    ITEMS.feather      = { name: 'Feather',      color: 0xf4f4f4 };
    ITEMS.raw_chicken  = { name: 'Raw Chicken',  color: 0xffe8b8 };
    ITEMS.rotten_flesh = { name: 'Rotten Flesh', color: 0x8a6f5a };
  });

  // ============================================================
  // 2. MOB DEFINITIONS
  // ============================================================
  const MOBS = {
    pig: {
      name: 'Pig',
      hp: 10,
      bodyColor: 0xff9aa8,
      headColor: 0xffb8c4,
      legColor: 0xd07080,
      size: { w: 0.9, h: 0.9, d: 1.3 },
      speed: 0.05,
      passive: true,
      hostile: false,
      drops: [{ item: 'raw_porkchop', min: 1, max: 2 }],
      spawnLight: 'day',
      spawnSurface: true,
    },
    chicken: {
      name: 'Chicken',
      hp: 4,
      bodyColor: 0xf4f4f4,
      headColor: 0xffffff,
      legColor: 0xffaa00,
      size: { w: 0.5, h: 0.7, d: 0.5 },
      speed: 0.06,
      passive: true,
      hostile: false,
      drops: [
        { item: 'feather', min: 1, max: 2 },
        { item: 'raw_chicken', min: 1, max: 1 },
      ],
      spawnLight: 'day',
      spawnSurface: true,
    },
    zombie: {
      name: 'Zombie',
      hp: 20,
      bodyColor: 0x3a6b3a,
      headColor: 0x4a8a4a,
      legColor: 0x2a4a2a,
      size: { w: 0.7, h: 1.8, d: 0.5 },
      speed: 0.04,
      passive: false,
      hostile: true,
      damage: 3,
      drops: [{ item: 'rotten_flesh', min: 1, max: 2 }],
      spawnLight: 'dark',
      spawnSurface: false,
    },
  };

  // ============================================================
  // 3. MOB MODEL BUILDER
  // ============================================================
  function mat(color) {
    return new THREE.MeshLambertMaterial({ color: color, flatShading: true });
  }

  function buildPigModel() {
    const g = new THREE.Group();
    const d = MOBS.pig;
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.3), mat(d.bodyColor));
    body.position.y = 0.75;
    g.add(body);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(d.headColor));
    head.position.set(0, 0.85, -0.95);
    g.add(head);
    // Snout
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.15), mat(0xd07080));
    snout.position.set(0, 0.75, -1.35);
    g.add(snout);
    // Ears
    for (const x of [-0.2, 0.2]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.15), mat(d.headColor));
      ear.position.set(x, 1.3, -0.9);
      g.add(ear);
    }
    // Legs
    const legs = [];
    for (const [x, z] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), mat(d.legColor));
      leg.position.set(x, 0.3, z);
      g.add(leg);
      legs.push(leg);
    }
    g.userData.legs = legs;
    return g;
  }

  function buildChickenModel() {
    const g = new THREE.Group();
    const d = MOBS.chicken;
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.7), mat(d.bodyColor));
    body.position.y = 0.5;
    g.add(body);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mat(d.headColor));
    head.position.set(0, 0.9, -0.25);
    g.add(head);
    // Beak
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), mat(0xffaa00));
    beak.position.set(0, 0.85, -0.5);
    g.add(beak);
    // Comb
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.3), mat(0xff3030));
    comb.position.set(0, 1.12, -0.25);
    g.add(comb);
    // Legs
    const legs = [];
    for (const x of [-0.15, 0.15]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.08), mat(d.legColor));
      leg.position.set(x, 0.175, 0);
      g.add(leg);
      legs.push(leg);
    }
    // Wings
    for (const x of [-0.28, 0.28]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.5), mat(0xe0e0e0));
      wing.position.set(x, 0.55, 0.05);
      g.add(wing);
    }
    g.userData.legs = legs;
    return g;
  }

  function buildZombieModel() {
    const g = new THREE.Group();
    const d = MOBS.zombie;
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), mat(d.bodyColor));
    body.position.y = 1.15;
    g.add(body);
    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(d.headColor));
    head.position.set(0, 1.85, 0);
    g.add(head);
    // Eyes
    for (const x of [-0.15, 0.15]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), mat(0x000000));
      eye.position.set(x, 1.9, -0.28);
      g.add(eye);
    }
    // Arms (out in front)
    const arms = [];
    for (const x of [-0.5, 0.5]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), mat(d.bodyColor));
      arm.position.set(x, 1.35, -0.4);
      arm.rotation.x = -Math.PI / 3;   // arms out front
      g.add(arm);
      arms.push(arm);
    }
    // Legs
    const legs = [];
    for (const x of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), mat(d.legColor));
      leg.position.set(x, 0.375, 0);
      g.add(leg);
      legs.push(leg);
    }
    g.userData.legs = legs;
    g.userData.arms = arms;
    return g;
  }

  const MODEL_BUILDERS = {
    pig: buildPigModel,
    chicken: buildChickenModel,
    zombie: buildZombieModel,
  };

  // ============================================================
  // 4. SPAWN + MANAGE MOBS
  // ============================================================
  const mobs = [];
  const MAX_MOBS = 15;
  const SPAWN_INTERVAL_FRAMES = 120;   // try to spawn every ~2 sec
  const DESPAWN_DIST = 80;
  const SPAWN_MIN_DIST = 20;
  const SPAWN_MAX_DIST = 40;
  let spawnFrameCounter = 0;

  function makeMob(type, x, y, z) {
    const def = MOBS[type];
    const model = MODEL_BUILDERS[type]();
    model.position.set(x, y, z);
    scene.add(model);
    const m = {
      type: type,
      def: def,
      model: model,
      pos: model.position,
      vel: new THREE.Vector3(),
      yaw: 0,
      hp: def.hp,
      maxHp: def.hp,
      wanderTimer: 0,
      wanderDir: new THREE.Vector3(),
      fleeTimer: 0,
      onGround: false,
      hitFlash: 0,
      hurtCooldown: 0,
      attackCooldown: 0,
      walkPhase: Math.random() * 10,
    };
    mobs.push(m);
    return m;
  }

  function removeMob(m) {
    scene.remove(m.model);
    // Dispose geometries/materials
    m.model.traverse(function (o) {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material && o.material.dispose) o.material.dispose();
      }
    });
    const i = mobs.indexOf(m);
    if (i >= 0) mobs.splice(i, 1);
  }

  // Light level at a position: how much light reaches this block.
  // Approximation: 1.0 if above the surface and it's day, less at night,
  // 0 if below the surface.
  function lightAt(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const surfaceY = surfaceHeight(xi, zi);
    if (yi < surfaceY) return 0.2;   // underground — always dark
    // Above ground — depends on time of day (we check the sun's Y)
    // We hook the sun in a moment
    return window._batch3DayLight !== undefined ? window._batch3DayLight : 1;
  }

  function trySpawnOne() {
    if (mobs.length >= MAX_MOBS) return;
    // Pick a random mob type
    const types = Object.keys(MOBS);
    const type = types[Math.floor(Math.random() * types.length)];
    const def = MOBS[type];
    // Choose a random position in a ring around the player
    const angle = Math.random() * Math.PI * 2;
    const radius = SPAWN_MIN_DIST + Math.random() * (SPAWN_MAX_DIST - SPAWN_MIN_DIST);
    const wx = Math.floor(player.pos.x + Math.cos(angle) * radius);
    const wz = Math.floor(player.pos.z + Math.sin(angle) * radius);
    if (wx < 2 || wx > WORLD_W - 3 || wz < 2 || wz > WORLD_D - 3) return;

    // Find a valid surface Y
    const surfaceY = surfaceHeight(wx, wz);
    // For surface mobs, find the top solid block
    let spawnY = -1;
    for (let y = WORLD_H - 2; y > 1; y--) {
      const b = getBlock(wx, y, wz);
      if (b === 0 || (BLOCKS[b] && BLOCKS[b].solid === false)) continue;
      // Found the top solid block. Spawn above it.
      if (getBlock(wx, y + 1, wz) !== 0) continue;   // something in the way
      spawnY = y + 1;
      break;
    }
    if (spawnY < 1) return;

    // Check spawning rules
    const light = lightAt(wx, spawnY, wz);
    if (def.spawnLight === 'day' && light < 0.7) return;      // passive mobs need daylight
    if (def.spawnLight === 'dark' && light > 0.4) return;     // zombies need darkness
    if (def.spawnSurface && spawnY < SEA_LEVEL) return;        // passives don't spawn underwater

    // Zombie-specific: surface OR underground
    if (type === 'zombie') {
      const isUnderground = spawnY < surfaceHeight(wx, wz);
      const isNight = light < 0.4;
      if (!isUnderground && !isNight) return;
    }

    makeMob(type, wx + 0.5, spawnY, wz + 0.5);
  }

  // ============================================================
  // 5. MOB AI + PHYSICS
  // ============================================================
  function isSolidAt(x, y, z) {
    const b = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== 0 && BLOCKS[b] && BLOCKS[b].solid !== false;
  }

  // Line of sight: ray from mob head to player head, blocked by solid blocks.
  function hasLineOfSight(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.5) return true;
    const steps = Math.ceil(dist * 2);   // 0.5-block resolution
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = Math.floor(from.x + dx * t);
      const y = Math.floor(from.y + dy * t);
      const z = Math.floor(from.z + dz * t);
      if (isSolidAt(x, y, z)) return false;
    }
    return true;
  }

  function collidesMob(m, x, y, z) {
    const w = m.def.size.w / 2;
    const h = m.def.size.h;
    const d = m.def.size.d / 2;
    const minX = Math.floor(x - w), maxX = Math.floor(x + w);
    const minY = Math.floor(y), maxY = Math.floor(y + h);
    const minZ = Math.floor(z - d), maxZ = Math.floor(z + d);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (isSolidAt(bx, by, bz)) return true;
        }
      }
    }
    return false;
  }

  function moveMob(m, dt) {
    const speed = m.def.speed * 60;   // convert to units per second
    // Gravity
    m.vel.y -= 25 * dt;
    if (m.vel.y < -30) m.vel.y = -30;

    // AI decides horizontal direction
    let dx = 0, dz = 0;
    const toPlayer = new THREE.Vector3(
      player.pos.x - m.pos.x,
      player.pos.y - m.pos.y,
      player.pos.z - m.pos.z
    );
    const distToPlayer = toPlayer.length();

    // Flee (passive mobs that were hit)
    if (m.fleeTimer > 0) {
      m.fleeTimer -= dt;
      if (distToPlayer > 0.1) {
        dx = -toPlayer.x / distToPlayer;
        dz = -toPlayer.z / distToPlayer;
      }
    }
    // Chase (hostile mobs that can see the player)
    else if (m.def.hostile && distToPlayer < 20) {
      const headPos = new THREE.Vector3(m.pos.x, m.pos.y + m.def.size.h, m.pos.z);
      const playerHead = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
      if (hasLineOfSight(headPos, playerHead)) {
        dx = toPlayer.x / distToPlayer;
        dz = toPlayer.z / distToPlayer;
      }
    }
    // Wander
    if (dx === 0 && dz === 0) {
      m.wanderTimer -= dt;
      if (m.wanderTimer <= 0) {
        // New direction
        const ang = Math.random() * Math.PI * 2;
        m.wanderDir.set(Math.cos(ang), 0, Math.sin(ang));
        m.wanderTimer = 2 + Math.random() * 3;
        // Sometimes pause
        if (Math.random() < 0.3) m.wanderDir.set(0, 0, 0);
      }
      dx = m.wanderDir.x;
      dz = m.wanderDir.z;
    }

    // Face direction of travel
    if (dx !== 0 || dz !== 0) {
      m.yaw = Math.atan2(-dx, -dz);
      m.model.rotation.y = m.yaw;
    }

    // Horizontal move with collision
    const mx = dx * speed * dt;
    const mz = dz * speed * dt;
    let nx = m.pos.x + mx;
    if (!collidesMob(m, nx, m.pos.y, m.pos.z)) m.pos.x = nx;
    else if (m.onGround) {
      // Try to jump over a 1-block obstacle
      const testY = m.pos.y + 1;
      if (!collidesMob(m, m.pos.x + mx, testY, m.pos.z)) {
        m.vel.y = 7.5;
      }
    }
    let nz = m.pos.z + mz;
    if (!collidesMob(m, m.pos.x, m.pos.y, nz)) m.pos.z = nz;

    // Vertical move
    let ny = m.pos.y + m.vel.y * dt;
    if (!collidesMob(m, m.pos.x, ny, m.pos.z)) {
      m.pos.y = ny;
      m.onGround = false;
    } else {
      if (m.vel.y < 0) m.onGround = true;
      m.vel.y = 0;
    }

    // Walking animation — swing legs based on movement speed
    const moving = (dx * dx + dz * dz) > 0.01 && m.onGround;
    if (moving) {
      m.walkPhase += dt * 8;
    } else {
      m.walkPhase *= 0.9;
    }
    const swing = Math.sin(m.walkPhase) * 0.5;
    if (m.model.userData.legs) {
      const legs = m.model.userData.legs;
      for (let i = 0; i < legs.length; i++) {
        legs[i].rotation.x = (i % 2 === 0 ? swing : -swing);
      }
    }
    // Arm swing for zombies
    if (m.model.userData.arms) {
      const arms = m.model.userData.arms;
      for (let i = 0; i < arms.length; i++) {
        arms[i].rotation.x = -Math.PI / 3 + (i % 2 === 0 ? -swing * 0.3 : swing * 0.3);
      }
    }

    // Hit flash
    if (m.hitFlash > 0) {
      m.hitFlash -= dt;
      const flash = m.hitFlash > 0;
      m.model.traverse(function (o) {
        if (o.isMesh && o.material) {
          if (flash) {
            if (!o.userData._origColor) o.userData._origColor = o.material.color.getHex();
            o.material.color.setHex(0xffffff);
          } else if (o.userData._origColor !== undefined) {
            o.material.color.setHex(o.userData._origColor);
            delete o.userData._origColor;
          }
        }
      });
    }

    // Attack player if hostile and close
    if (m.def.hostile) {
      if (m.hurtCooldown > 0) m.hurtCooldown -= dt;
      const contactDist = 1.2;
      const dxp = player.pos.x - m.pos.x;
      const dzp = player.pos.z - m.pos.z;
      const dyp = player.pos.y - m.pos.y;
      if (Math.hypot(dxp, dzp) < contactDist && Math.abs(dyp) < 2 && m.hurtCooldown <= 0) {
        // Damage the player
        if (typeof damage === 'function') {
          try { damage(m.def.damage); } catch (e) {}
        } else {
          // Fallback: reduce health directly if the base game exposes it
          if (player.health !== undefined) {
            player.health -= m.def.damage;
            if (player.health <= 0) player.health = 20;
          }
        }
        m.hurtCooldown = 1.0;
      }
    }
  }

  // ============================================================
  // 6. DROPS — floating items that fly to the player
  // ============================================================
  const drops = [];   // { mesh, item, from, t }

  function spawnDrop(itemName, worldX, worldY, worldZ) {
    const item = ITEMS[itemName];
    if (!item) return;
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const mat = new THREE.MeshLambertMaterial({ color: item.color, emissive: item.color, emissiveIntensity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(worldX, worldY, worldZ);
    scene.add(mesh);
    drops.push({
      mesh: mesh,
      item: itemName,
      age: 0,
      duration: 0.6,
      start: mesh.position.clone(),
    });
  }

  function updateDrops(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.age += dt;
      const t = Math.min(1, d.age / d.duration);
      // Ease toward camera
      const tx = player.pos.x;
      const ty = player.pos.y + player.height * 0.7;
      const tz = player.pos.z;
      d.mesh.position.set(
        d.start.x + (tx - d.start.x) * t,
        d.start.y + (ty - d.start.y) * t + Math.sin(t * Math.PI) * 0.5,
        d.start.z + (tz - d.start.z) * t
      );
      d.mesh.rotation.y += dt * 5;
      if (t >= 1) {
        // Reached the player — add to hotbar
        addItemToHotbar(d.item, 1);
        toast('+' + 1 + ' ' + ITEMS[d.item].name);
        scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        d.mesh.material.dispose();
        drops.splice(i, 1);
      }
    }
  }

  // Hotbar storage. The base game has a hotbar UI but doesn't store
  // item counts. We maintain our own count map here.
  const hotbarCounts = {};   // itemName → count
  function addItemToHotbar(itemName, count) {
    hotbarCounts[itemName] = (hotbarCounts[itemName] || 0) + count;
  }

  // ============================================================
  // 7. HIT DETECTION — left-click on a mob
  // ============================================================
  function raycastMob(origin, dir, maxDist) {
    const step = 0.1;
    let prevPos = origin.clone();
    for (let t = 0; t < maxDist; t += step) {
      const curPos = new THREE.Vector3(
        origin.x + dir.x * t,
        origin.y + dir.y * t,
        origin.z + dir.z * t
      );
      // Check every mob's AABB
      for (const m of mobs) {
        const dx = curPos.x - m.pos.x;
        const dy = curPos.y - (m.pos.y + m.def.size.h / 2);
        const dz = curPos.z - m.pos.z;
        const halfW = m.def.size.w / 2;
        const halfH = m.def.size.h / 2;
        const halfD = m.def.size.d / 2;
        if (Math.abs(dx) < halfW && Math.abs(dy) < halfH && Math.abs(dz) < halfD) {
          return m;
        }
      }
      // Stop if we hit a solid block
      if (isSolidAt(curPos.x, curPos.y, curPos.z)) return null;
      prevPos.copy(curPos);
    }
    return null;
  }

  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 0) return;
    // Ray from camera
    const origin = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    const m = raycastMob(origin, dir, 4.0);
    if (m) {
      // Prevent the block-break from also firing — but the base game's
      // mousedown handler is separate and can't easily be suppressed.
      // For now, hitting a mob also breaks the block behind it if the
      // block is breakable. Acceptable for a first pass.
      m.hp -= 4;   // fist damage
      m.hitFlash = 0.15;
      if (m.def.passive) m.fleeTimer = 3;
      if (m.hp <= 0) killMob(m);
    }
  }, true);   // capture phase so we run before the base game handler

  function killMob(m) {
    // Roll drops
    for (const d of m.def.drops) {
      const n = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
      for (let i = 0; i < n; i++) {
        spawnDrop(d.item, m.pos.x + (Math.random() - 0.5) * 0.5, m.pos.y + 0.5, m.pos.z + (Math.random() - 0.5) * 0.5);
      }
    }
    removeMob(m);
  }

  // ============================================================
  // 8. HOOK RENDER LOOP FOR MOB UPDATES
  // ============================================================
  // We patch the base game's render loop by intercepting the rAF.
  // Simpler: run our own rAF chain that updates mobs and drops.
  let lastMobTime = performance.now();
  function mobLoop() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastMobTime) / 1000);
    lastMobTime = now;

    // Update time-of-day light for spawning checks
    // We grab the sun's Y to estimate daylight
    let sunY = 1;
    scene.traverse(function (o) {
      if (o.isDirectionalLight && o.userData._isSun !== false) {
        sunY = o.position.y / 200;
        if (o.position.lengthSq() > 0) return;
      }
    });
    window._batch3DayLight = Math.max(0, Math.min(1, (sunY + 0.3) / 1.3));

    // Spawn mobs periodically
    spawnFrameCounter++;
    if (spawnFrameCounter >= SPAWN_INTERVAL_FRAMES) {
      spawnFrameCounter = 0;
      trySpawnOne();
    }

    // Update mobs
    const px = player.pos.x, pz = player.pos.z;
    for (let i = mobs.length - 1; i >= 0; i--) {
      const m = mobs[i];
      const dx = m.pos.x - px, dz = m.pos.z - pz;
      if (Math.hypot(dx, dz) > DESPAWN_DIST) {
        removeMob(m);
        continue;
      }
      moveMob(m, dt);
    }

    // Update drops
    updateDrops(dt);

    requestAnimationFrame(mobLoop);
  }
  mobLoop();

  // ============================================================
  // 9. TOAST HELPER (if batch1 didn't provide one)
  // ============================================================
  function toast(msg) {
    let el = document.getElementById('b3toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'b3toast';
      el.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:6px;font:14px system-ui,sans-serif;z-index:30;transition:opacity .4s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 1500);
  }

  // ============================================================
  // 10. HOTBAR COUNT DISPLAY — show item counts above slots
  // ============================================================
  // The base game has a hotbar with block swatches. We add a small
  // count overlay showing how many of each item you've collected.
  // We attach it to the DOM after the hotbar renders.
  section('hotbar count overlay', function () {
    const hud = document.getElementById('hud');
    if (!hud) return;
    const counter = document.createElement('div');
    counter.id = 'b3counts';
    counter.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);color:#fff;font:12px system-ui,sans-serif;text-shadow:0 1px 2px #000;z-index:9;pointer-events:none;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-width:520px;';
    document.body.appendChild(counter);

    setInterval(function () {
      const parts = [];
      for (const itemName in hotbarCounts) {
        if (hotbarCounts[itemName] > 0) {
          const item = ITEMS[itemName];
          parts.push('<span style="background:rgba(0,0,0,.55);padding:2px 6px;border-radius:4px;">' + item.name + ' x' + hotbarCounts[itemName] + '</span>');
        }
      }
      counter.innerHTML = parts.join('');
    }, 250);
  });

  console.log('[MiniTerra 3D Batch 3] loaded — pig, chicken, zombie, drops.');
})();