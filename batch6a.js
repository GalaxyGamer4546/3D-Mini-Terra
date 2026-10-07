/* ============================================================
   MiniTerra 3D — BATCH 6a: Mobs and Arrow Projectiles (part 1 of 2)
   Paste part 2 immediately after this in the same file.
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof player === 'undefined') {
    console.error('[Batch 6a] game not loaded');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 6a] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // ITEMS
  // ============================================================
  section('items', function () {
    window.ITEMS = window.ITEMS || {};
    if (!ITEMS.raw_mutton) ITEMS.raw_mutton = { name: 'Raw Mutton', color: 0xe07a7a };
    if (!ITEMS.leather)    ITEMS.leather    = { name: 'Leather',    color: 0x8a5a3a };
    if (!ITEMS.raw_beef)   ITEMS.raw_beef   = { name: 'Raw Beef',   color: 0xc25a5a };
    if (!ITEMS.bone)       ITEMS.bone       = { name: 'Bone',       color: 0xf0f0e0 };
    if (!ITEMS.arrow)      ITEMS.arrow      = { name: 'Arrow',      color: 0xc8b090 };
    if (!ITEMS.gunpowder)  ITEMS.gunpowder  = { name: 'Gunpowder',  color: 0x555555 };
    if (!ITEMS.slimeball)  ITEMS.slimeball  = { name: 'Slimeball',  color: 0x7ec87e };
    if (!ITEMS.bat_wing)   ITEMS.bat_wing   = { name: 'Bat Wing',   color: 0x5a4a6a };
  });

  // ============================================================
  // MOB DEFINITIONS
  // ============================================================
  const MOBS_6A = {
    sheep: {
      name: 'Sheep', hp: 8, speed: 0.05,
      size: { w: 0.9, h: 1.1, d: 1.2 },
      passive: true, spawnLight: 'any', spawnSurface: true,
      drops: [{ item: 'raw_mutton', min: 1, max: 2 }, { item: 'wool', min: 1, max: 2 }],
      bodyColor: 0xf0f0e8, headColor: 0xd8d0c0, legColor: 0xc0b8a8,
    },
    cow: {
      name: 'Cow', hp: 10, speed: 0.045,
      size: { w: 0.9, h: 1.3, d: 1.4 },
      passive: true, spawnLight: 'any', spawnSurface: true,
      drops: [{ item: 'raw_beef', min: 1, max: 3 }, { item: 'leather', min: 1, max: 2 }],
      bodyColor: 0x5a3a20, headColor: 0x5a3a20, legColor: 0x3a2510,
    },
    skeleton: {
      name: 'Skeleton', hp: 20, speed: 0.045,
      size: { w: 0.7, h: 1.8, d: 0.5 },
      hostile: true, ranged: true,
      rangedCooldown: 90, rangedRange: 18, arrowSpeed: 0.5,
      spawnLight: 'dark', spawnSurface: false,
      drops: [{ item: 'bone', min: 0, max: 2 }, { item: 'arrow', min: 0, max: 2 }],
      bodyColor: 0xe8e8e0, headColor: 0xf4f4ec, legColor: 0xe8e8e0,
    },
    creeper: {
      name: 'Creeper', hp: 20, speed: 0.04,
      size: { w: 0.7, h: 1.6, d: 0.7 },
      hostile: true, explodes: true,
      fuseTime: 90, explosionRadius: 3, explosionDamage: 20,
      spawnLight: 'dark', spawnSurface: false,
      drops: [{ item: 'gunpowder', min: 0, max: 2 }],
      bodyColor: 0x4a8040, headColor: 0x4a8040, legColor: 0x3a6030,
    },
    slime: {
      name: 'Slime', hp: 16, speed: 0.06,
      size: { w: 0.9, h: 0.9, d: 0.9 },
      hostile: true, hops: true,
      spawnLight: 'dark', spawnSurface: false,
      drops: [{ item: 'slimeball', min: 0, max: 3 }],
      bodyColor: 0x7ec87e, headColor: 0x7ec87e, legColor: 0x7ec87e, translucent: true,
    },
    bat: {
      name: 'Bat', hp: 6, speed: 0.08,
      size: { w: 0.5, h: 0.5, d: 0.5 },
      passive: true, flies: true, erratic: true,
      spawnLight: 'dark', spawnSurface: false,
      drops: [{ item: 'bat_wing', min: 0, max: 1 }],
      bodyColor: 0x3a2a2a, headColor: 0x3a2a2a, legColor: 0x3a2a2a,
    },
  };
  window.MOBS = window.MOBS || {};
  for (const k in MOBS_6A) window.MOBS[k] = MOBS_6A[k];

  // ============================================================
  // MODEL BUILDERS
  // ============================================================
  function mat(color, translucent) {
    const m = new THREE.MeshLambertMaterial({ color: color, flatShading: true });
    if (translucent) { m.transparent = true; m.opacity = 0.75; }
    return m;
  }

  function buildSheepModel() {
    const g = new THREE.Group();
    const d = MOBS_6A.sheep;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 1.2), mat(d.bodyColor));
    body.position.y = 0.85; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat(d.headColor));
    head.position.set(0, 1.05, -0.85); g.add(head);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.15), mat(0x2a2a2a));
    face.position.set(0, 1.05, -1.2); g.add(face);
    for (const [x, z] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.4], [0.3, 0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), mat(d.legColor));
      leg.position.set(x, 0.3, z); g.add(leg);
    }
    return g;
  }

  function buildCowModel() {
    const g = new THREE.Group();
    const d = MOBS_6A.cow;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 1.4), mat(d.bodyColor));
    body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(d.headColor));
    head.position.set(0, 1.2, -0.95); g.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.2), mat(0xd8b8a0));
    snout.position.set(0, 1.05, -1.35); g.add(snout);
    for (const x of [-0.28, 0.28]) {
      const horn = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), mat(0xe0d8c0));
      horn.position.set(x, 1.55, -1.0); g.add(horn);
    }
    for (const [x, z] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.25), mat(d.legColor));
      leg.position.set(x, 0.35, z); g.add(leg);
    }
    return g;
  }

  function buildSkeletonModel() {
    const g = new THREE.Group();
    const d = MOBS_6A.skeleton;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.4), mat(d.bodyColor));
    body.position.y = 1.15; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(d.headColor));
    head.position.set(0, 1.85, 0); g.add(head);
    for (const x of [-0.15, 0.15]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), mat(0x000000));
      eye.position.set(x, 1.9, -0.28); g.add(eye);
    }
    const arms = [];
    for (const x of [-0.42, 0.42]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), mat(d.bodyColor));
      arm.position.set(x, 1.35, -0.15); arm.rotation.x = -Math.PI / 3;
      g.add(arm); arms.push(arm);
    }
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat(0x6b4a2a));
    bow.position.set(0.5, 1.35, -0.55); g.add(bow);
    for (const x of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.75, 0.22), mat(d.legColor));
      leg.position.set(x, 0.375, 0); g.add(leg);
    }
    g.userData.arms = arms;
    return g;
  }

  function buildCreeperModel() {
    const g = new THREE.Group();
    const d = MOBS_6A.creeper;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.5), mat(d.bodyColor));
    body.position.y = 0.9; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), mat(d.headColor));
    head.position.set(0, 1.75, 0); g.add(head);
    for (const x of [-0.15, 0.15]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), mat(0x000000));
      eye.position.set(x, 1.85, -0.28); g.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), mat(0x000000));
    mouth.position.set(0, 1.68, -0.28); g.add(mouth);
    for (const [x, z] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.18], [0.22, 0.18]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), mat(d.legColor));
      leg.position.set(x, 0.15, z); g.add(leg);
    }
    return g;
  }

  function buildSlimeModel() {
    const g = new THREE.Group();
    const d = MOBS_6A.slime;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat(d.bodyColor, true));
    body.position.y = 0.45; g.add(body);
    for (const x of [-0.2, 0.2]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), mat(0x000000));
      eye.position.set(x, 0.6, -0.46); g.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.05), mat(0x000000));
    mouth.position.set(0, 0.4, -0.46); g.add(mouth);
    return g;
  }

  function buildBatModel() {
    const g = new THREE.Group();
    const d = MOBS_6A.bat;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.35), mat(d.bodyColor));
    body.position.y = 0.3; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat(d.headColor));
    head.position.set(0, 0.55, -0.1); g.add(head);
    for (const x of [-0.08, 0.08]) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), mat(d.headColor));
      ear.position.set(x, 0.72, -0.1); g.add(ear);
    }
    const wings = [];
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.4), mat(0x2a1a1a));
      wing.position.set(s * 0.45, 0.3, 0); g.add(wing);
      wings.push({ mesh: wing, side: s });
    }
    g.userData.wings = wings;
    return g;
  }

  const MODEL_BUILDERS = {
    sheep: buildSheepModel, cow: buildCowModel, skeleton: buildSkeletonModel,
    creeper: buildCreeperModel, slime: buildSlimeModel, bat: buildBatModel,
  };

  // stash globals for part 2
  window._batch6a = {
    MOBS_6A, MODEL_BUILDERS, mat,
    myMobs: [], arrows: [],
    MAX_MY_MOBS: 12,
  };
})();

/* ============================================================
   BATCH 6a — part 2 of 2: spawn logic, AI, projectiles, update loop
   ============================================================ */
(function () {
  'use strict';

  if (!window._batch6a) {
    console.error('[Batch 6a p2] part 1 not loaded');
    return;
  }
  if (typeof scene === 'undefined' || typeof player === 'undefined') return;

  const { MOBS_6A, MODEL_BUILDERS } = window._batch6a;
  const myMobs = window._batch6a.myMobs;
  const arrows = window._batch6a.arrows;
  const MAX_MY_MOBS = window._batch6a.MAX_MY_MOBS;

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 6a p2] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // SPAWN
  // ============================================================
  let spawnCounter = 0;

  function lightAt(x, y, z) {
    const surf = surfaceHeight(Math.floor(x), Math.floor(z));
    if (y < surf) return 0.2;   // underground = dark
    // Above ground: use the sun's height to determine day/night
    let sunY = -1;
    scene.traverse(function (o) {
      if (o.isDirectionalLight && sunY === -1) {
        // Sun position from batch2: y=200 at noon, y=-200 at midnight
        sunY = o.position.y;
      }
    });
    // sunY > 0 means day, sunY < 0 means night
    return sunY > 20 ? 1 : 0.2;
  }

  function spawnMyMob(type, x, y, z) {
    const def = MOBS_6A[type];
    const model = MODEL_BUILDERS[type]();
    model.position.set(x, y, z);
    scene.add(model);
    const m = {
      type, def, model, pos: model.position,
      vel: new THREE.Vector3(), yaw: 0,
      hp: def.hp, maxHp: def.hp,
      wanderTimer: 0, wanderDir: new THREE.Vector3(),
      fleeTimer: 0, onGround: false, hitFlash: 0,
      hurtCooldown: 0, walkPhase: Math.random() * 10,
      arrowCooldown: def.rangedCooldown ? 60 + Math.random() * 60 : 0,
      fuseTimer: 0, hopTimer: 0, vx: 0, vz: 0,
    };
    myMobs.push(m);
    return m;
  }

  function removeMyMob(m) {
    scene.remove(m.model);
    m.model.traverse(function (o) {
      if (o.isMesh) {
        o.geometry.dispose();
        if (o.material && o.material.dispose) o.material.dispose();
      }
    });
    const i = myMobs.indexOf(m);
    if (i >= 0) myMobs.splice(i, 1);
  }

  function killMyMob(m) {
    for (const d of m.def.drops) {
      const n = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
      for (let i = 0; i < n; i++) {
        if (window._batch4Add) {
          window._batch4Add(d.item, 1);
          if (window._batch4Toast) {
            const nm = window.ITEMS && ITEMS[d.item] ? ITEMS[d.item].name : d.item;
            window._batch4Toast('+1 ' + nm);
          }
        }
      }
    }
    removeMyMob(m);
  }

  function trySpawn() {
    if (myMobs.length >= MAX_MY_MOBS) return;
    const types = Object.keys(MOBS_6A);
    const type = types[Math.floor(Math.random() * types.length)];
    const def = MOBS_6A[type];

    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 20;
    const wx = Math.floor(player.pos.x + Math.cos(angle) * radius);
    const wz = Math.floor(player.pos.z + Math.sin(angle) * radius);
    if (wx < 2 || wx > WORLD_W - 3 || wz < 2 || wz > WORLD_D - 3) return;

    let spawnY = -1;
    for (let y = WORLD_H - 2; y > 1; y--) {
      const b = getBlock(wx, y, wz);
      if (b === 0) continue;
      if (BLOCKS[b] && BLOCKS[b].solid === false) continue;
      if (getBlock(wx, y + 1, wz) !== 0) continue;
      spawnY = y + 1;
      break;
    }
    if (spawnY < 1) return;

  function lightAt(x, y, z) {
    const surf = surfaceHeight(Math.floor(x), Math.floor(z));
    if (y < surf) return 0.2;   // underground = dark
    // Above ground: use the sun's height to determine day/night
    let sunY = -1;
    scene.traverse(function (o) {
      if (o.isDirectionalLight && sunY === -1) {
        // Sun position from batch2: y=200 at noon, y=-200 at midnight
        sunY = o.position.y;
      }
    });
    // sunY > 0 means day, sunY < 0 means night
    return sunY > 20 ? 1 : 0.2;
  }

    spawnMyMob(type, wx + 0.5, spawnY, wz + 0.5);
  }

  // ============================================================
  // ARROW PROJECTILES
  // ============================================================
  function shootArrow(fx, fy, fz, tx, ty, tz, speed) {
    const dx = tx - fx, dy = ty - fy, dz = tz - fz;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.1) return;
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.5);
    const mat = new THREE.MeshLambertMaterial({ color: 0xc8b090 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(fx, fy, fz);
    mesh.lookAt(tx, ty, tz);
    scene.add(mesh);
    arrows.push({
      mesh, vx: dx / dist * speed, vy: dy / dist * speed + 0.05,
      vz: dz / dist * speed, life: 180,
    });
  }

  function updateArrows(dt) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      a.vy -= 8 * dt;
      a.mesh.position.x += a.vx * dt * 20;
      a.mesh.position.y += a.vy * dt * 20;
      a.mesh.position.z += a.vz * dt * 20;
      a.life--;
      const dx = a.mesh.position.x - player.pos.x;
      const dy = a.mesh.position.y - (player.pos.y + player.height * 0.5);
      const dz = a.mesh.position.z - player.pos.z;
      if (Math.hypot(dx, dy, dz) < 0.8) {
        if (typeof damage === 'function') { try { damage(3); } catch (e) {} }
        scene.remove(a.mesh);
        a.mesh.geometry.dispose(); a.mesh.material.dispose();
        arrows.splice(i, 1); continue;
      }
      const bx = Math.floor(a.mesh.position.x);
      const by = Math.floor(a.mesh.position.y);
      const bz = Math.floor(a.mesh.position.z);
      const b = getBlock(bx, by, bz);
      if (b !== 0 && !(BLOCKS[b] && BLOCKS[b].solid === false)) {
        scene.remove(a.mesh);
        a.mesh.geometry.dispose(); a.mesh.material.dispose();
        arrows.splice(i, 1); continue;
      }
      if (a.life <= 0) {
        scene.remove(a.mesh);
        a.mesh.geometry.dispose(); a.mesh.material.dispose();
        arrows.splice(i, 1);
      }
    }
  }

  // ============================================================
  // AI + PHYSICS
  // ============================================================
  function isSolidAt(x, y, z) {
    const b = getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    return b !== 0 && BLOCKS[b] && BLOCKS[b].solid !== false;
  }
  function collidesMob(m, x, y, z) {
    const w = m.def.size.w / 2, h = m.def.size.h, d = m.def.size.d / 2;
    const minX = Math.floor(x - w), maxX = Math.floor(x + w);
    const minY = Math.floor(y), maxY = Math.floor(y + h);
    const minZ = Math.floor(z - d), maxZ = Math.floor(z + d);
    for (let bx = minX; bx <= maxX; bx++)
      for (let by = minY; by <= maxY; by++)
        for (let bz = minZ; bz <= maxZ; bz++)
          if (isSolidAt(bx, by, bz)) return true;
    return false;
  }
  function hasLineOfSight(from, to) {
    const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.5) return true;
    const steps = Math.ceil(dist * 2);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (isSolidAt(Math.floor(from.x + dx * t), Math.floor(from.y + dy * t), Math.floor(from.z + dz * t))) return false;
    }
    return true;
  }

  function updateMob(m, dt) {
    const def = m.def;
    const speed = def.speed * 60;
    m.vel.y -= 25 * dt;
    if (m.vel.y < -30) m.vel.y = -30;

    const dx = player.pos.x - m.pos.x;
    const dz = player.pos.z - m.pos.z;
    const distToPlayer = Math.hypot(dx, dz) || 1;

    let moveX = 0, moveZ = 0;

    if (m.fleeTimer > 0) {
      m.fleeTimer -= dt;
      moveX = -dx / distToPlayer; moveZ = -dz / distToPlayer;
    } else if (def.erratic && def.flies) {
      m.wanderTimer -= dt;
      if (m.wanderTimer <= 0) {
        m.wanderDir.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2);
        m.wanderTimer = 0.3 + Math.random() * 0.6;
      }
      moveX = m.wanderDir.x; moveZ = m.wanderDir.z;
    } else if (def.ranged && distToPlayer < def.rangedRange) {
      const head = new THREE.Vector3(m.pos.x, m.pos.y + def.size.h, m.pos.z);
      const ph = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.7, player.pos.z);
      if (hasLineOfSight(head, ph)) {
        if (distToPlayer < 6) { moveX = -dx / distToPlayer; moveZ = -dz / distToPlayer; }
        else if (distToPlayer > 10) { moveX = dx / distToPlayer; moveZ = dz / distToPlayer; }
        m.arrowCooldown -= dt * 60;
        if (m.arrowCooldown <= 0) {
          shootArrow(head.x, head.y, head.z, player.pos.x, player.pos.y + player.height * 0.6, player.pos.z, def.arrowSpeed);
          m.arrowCooldown = def.rangedCooldown;
        }
      }
    } else if (def.explodes && distToPlayer < 18) {
      const head = new THREE.Vector3(m.pos.x, m.pos.y + def.size.h, m.pos.z);
      const ph = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.7, player.pos.z);
      if (hasLineOfSight(head, ph)) {
        moveX = dx / distToPlayer; moveZ = dz / distToPlayer;
        if (distToPlayer < 2.5) {
          m.fuseTimer += dt * 60;
          if (m.fuseTimer >= def.fuseTime) {
            const bx = Math.floor(m.pos.x), by = Math.floor(m.pos.y), bz = Math.floor(m.pos.z);
            const r = def.explosionRadius;
            for (let ox = -r; ox <= r; ox++)
              for (let oy = -r; oy <= r; oy++)
                for (let oz = -r; oz <= r; oz++) {
                  if (Math.hypot(ox, oy, oz) <= r + 0.2) {
                    const b = getBlock(bx + ox, by + oy, bz + oz);
                    if (b !== 0 && b !== 3) setBlock(bx + ox, by + oy, bz + oz, 0);
                  }
                }
            if (distToPlayer < r + 2) {
              const dmg = Math.max(5, def.explosionDamage * (1 - distToPlayer / (r + 2)));
              if (typeof damage === 'function') { try { damage(dmg); } catch (e) {} }
            }
            if (typeof rebuildAllChunks === 'function') rebuildAllChunks();
            removeMyMob(m); return;
          }
        } else m.fuseTimer = Math.max(0, m.fuseTimer - dt * 40);
      }
    } else if (def.hops && distToPlayer < 16) {
      const head = new THREE.Vector3(m.pos.x, m.pos.y + def.size.h, m.pos.z);
      const ph = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.7, player.pos.z);
      if (hasLineOfSight(head, ph)) {
        m.hopTimer -= dt;
        if (m.onGround && m.hopTimer <= 0) {
          m.vel.y = 6;
          m.vx = dx / distToPlayer * 2.5;
          m.vz = dz / distToPlayer * 2.5;
          m.hopTimer = 0.7;
        }
      }
    } else if (def.hostile && !def.ranged && !def.explodes && !def.hops && distToPlayer < 16) {
      const head = new THREE.Vector3(m.pos.x, m.pos.y + def.size.h, m.pos.z);
      const ph = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.7, player.pos.z);
      if (hasLineOfSight(head, ph)) { moveX = dx / distToPlayer; moveZ = dz / distToPlayer; }
    }

    if (moveX === 0 && moveZ === 0 && !def.flies) {
      m.wanderTimer -= dt;
      if (m.wanderTimer <= 0) {
        const ang = Math.random() * Math.PI * 2;
        m.wanderDir.set(Math.cos(ang), 0, Math.sin(ang));
        m.wanderTimer = 2 + Math.random() * 3;
        if (Math.random() < 0.3) m.wanderDir.set(0, 0, 0);
      }
      moveX = m.wanderDir.x; moveZ = m.wanderDir.z;
    }

    if (moveX !== 0 || moveZ !== 0) {
      m.yaw = Math.atan2(-moveX, -moveZ);
      m.model.rotation.y = m.yaw;
    }

    const mx = moveX * speed * dt + (m.vx || 0) * dt;
    const mz = moveZ * speed * dt + (m.vz || 0) * dt;

    if (def.flies) {
      m.pos.x += moveX * speed * dt;
      m.pos.z += moveZ * speed * dt;
      m.pos.y += m.wanderDir.y * speed * dt;
      if (m.pos.y < 1) m.pos.y = 1;
    } else {
      const nx = m.pos.x + mx;
      if (!collidesMob(m, nx, m.pos.y, m.pos.z)) m.pos.x = nx;
      else if (m.onGround && !def.hops) {
        if (!collidesMob(m, m.pos.x + mx, m.pos.y + 1, m.pos.z)) m.vel.y = 7.5;
      }
      const nz = m.pos.z + mz;
      if (!collidesMob(m, m.pos.x, m.pos.y, nz)) m.pos.z = nz;
      const ny = m.pos.y + m.vel.y * dt;
      if (!collidesMob(m, m.pos.x, ny, m.pos.z)) { m.pos.y = ny; m.onGround = false; }
      else { if (m.vel.y < 0) m.onGround = true; m.vel.y = 0; }
    }

    // Attack player if hostile and touching
    if (def.hostile && !def.ranged && !def.explodes && !def.hops) {
      if (m.hurtCooldown > 0) m.hurtCooldown -= dt;
      const contact = 1.2;
      if (Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z) < contact &&
          Math.abs(player.pos.y - m.pos.y) < 2 && m.hurtCooldown <= 0) {
        if (typeof damage === 'function') { try { damage(3); } catch (e) {} }
        m.hurtCooldown = 1.0;
      }
    }
    // Slime contact damage
    if (def.hops && Math.hypot(player.pos.x - m.pos.x, player.pos.z - m.pos.z) < 1.0 &&
        Math.abs(player.pos.y - m.pos.y) < 1.5 && m.hurtCooldown <= 0) {
      if (typeof damage === 'function') { try { damage(2); } catch (e) {} }
      m.hurtCooldown = 1.0;
    }
    if (m.hurtCooldown > 0) m.hurtCooldown -= dt;

    // Animation
    const moving = (Math.abs(mx) + Math.abs(mz)) > 0.001;
    if (moving) m.walkPhase += dt * 8; else m.walkPhase *= 0.9;
    // Wing flap for bats
    if (m.model.userData.wings) {
      const flap = Math.sin(performance.now() * 0.02) * 0.4;
      for (const w of m.model.userData.wings) {
        w.mesh.rotation.x = flap * w.side;
      }
    }
  }

  // ============================================================
  // MOB DAMAGE FROM PLAYER (left-click)
  // ============================================================
  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 0) return;
    const origin = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    for (let t = 0.5; t < 4; t += 0.1) {
      const px = origin.x + dir.x * t;
      const py = origin.y + dir.y * t;
      const pz = origin.z + dir.z * t;
      for (const m of myMobs) {
        const mx = px - m.pos.x;
        const my = py - (m.pos.y + m.def.size.h / 2);
        const mz = pz - m.pos.z;
        if (Math.abs(mx) < m.def.size.w / 2 + 0.2 &&
            Math.abs(my) < m.def.size.h / 2 + 0.2 &&
            Math.abs(mz) < m.def.size.d / 2 + 0.2) {
          m.hp -= 4;
          m.hitFlash = 0.15;
          if (m.def.passive) m.fleeTimer = 3;
          if (m.hp <= 0) killMyMob(m);
          return;
        }
      }
    }
  }, true);

  // ============================================================
  // UPDATE LOOP
  // ============================================================
  let lastT = performance.now();
  function loop() {
    const now = performance.now();
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;

    spawnCounter++;
    if (spawnCounter > 100) { spawnCounter = 0; trySpawn(); }

    for (let i = myMobs.length - 1; i >= 0; i--) {
      const m = myMobs[i];
      const dxp = m.pos.x - player.pos.x, dzp = m.pos.z - player.pos.z;
      if (Math.hypot(dxp, dzp) > 80) { removeMyMob(m); continue; }
      updateMob(m, dt);
    }

    updateArrows(dt);
    requestAnimationFrame(loop);
  }
  loop();

  console.log('[MiniTerra 3D Batch 6a] loaded — sheep, cow, skeleton, creeper, slime, bat.');
})();