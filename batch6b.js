/* ============================================================
   MiniTerra 3D — BATCH 6b: Beds and Torches
   - Beds: placeable, right-click to sleep, sets spawn point
   - Torches: placeable, emit real dynamic light (cap 8 nearest)
   No base file edits. Loads after batch6a.
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof player === 'undefined') {
    console.error('[Batch 6b] game not loaded');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 6b] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // 1. REGISTER BED AND TORCH AS BLOCKS
  // ============================================================
  section('blocks', function () {
    // Bed block (id 20)
    if (!BLOCKS[20]) {
      BLOCKS[20] = { name: 'bed_block', color: 0xa03030, hardness: 1, solid: true };
    }
    // Torch block (id 21) — non-solid so you can walk through it
    if (!BLOCKS[21]) {
      BLOCKS[21] = { name: 'torch_block', color: 0xffb300, hardness: 0.1, solid: false, emitsLight: true };
    }
  });

  // ============================================================
  // 1b. ADD MATERIALS FOR ANY NEW BLOCKS (solid colors, no texture)
  // ============================================================
  section('materials for new blocks', function () {
    if (typeof materials !== 'object' || materials === null) {
      console.warn('[Batch 6b] materials object not accessible');
      return;
    }
    let added = 0;
    for (const id in BLOCKS) {
      if (id === '0') continue;
      if (materials[id]) continue;
      const b = BLOCKS[id];
      if (!b.color) continue;
      // Force solid color — no texture
      const opts = { color: b.color, flatShading: true };
      if (b.transparent) { opts.transparent = true; opts.opacity = 0.5; }
      materials[id] = new THREE.MeshLambertMaterial(opts);
      added++;
    }
    // Also force-overwrite any materials that were already added but
    // render yellow (blocks 10+ that batch1 tried to texture)
    for (const id in BLOCKS) {
      if (id === '0') continue;
      const b = BLOCKS[id];
      if (!b.color) continue;
      // Only overwrite non-base blocks (10+) — leave 1-9 alone so batch1
      // textures stay
      if (+id >= 10 && materials[id]) {
        const opts = { color: b.color, flatShading: true };
        if (b.transparent) { opts.transparent = true; opts.opacity = 0.5; }
        materials[id].color = new THREE.Color(b.color);
        if (materials[id].map) {
          // Remove texture — use solid color
          materials[id].map = null;
          materials[id].needsUpdate = true;
        }
      }
    }
    console.log('[Batch 6b] added materials for', added, 'new blocks, forced solid colors for 10+');
  });

  // ============================================================
  // 2. TRACK PLACED BEDS AND TORCHES
  // ============================================================
  // We store them as world blocks (set via setBlock), so they're
  // part of the world data. Beds also have a "sleep point" — the
  // player's spawn location when they last slept there.
  const placedBeds = new Set();    // "x,y,z" keys of bed blocks
  const placedTorches = new Map(); // "x,y,z" -> { x, y, z, light }
  let bedSpawnPoint = null;        // { x, y, z }

  // Persist bed spawn point
  const SPAWN_KEY = 'miniterra3d.bedspawn.v1';
  try {
    const s = JSON.parse(localStorage.getItem(SPAWN_KEY) || 'null');
    if (s && s.x !== undefined) bedSpawnPoint = s;
  } catch (e) {}

  // ============================================================
  // 3. PLACE BED OR TORCH (right-click with item in hand)
  // ============================================================
  // Batch4 already places blocks via right-click for placeable items.
  // Bed and torch blocks aren't in the BLOCKS lookup by name, so
  // batch4 won't place them. We handle them ourselves.
  //
  // We need to know: what item is the player holding? And where are
  // they looking? Batch4 exposes window._batch4Held for the held item.
  // We use raycast against the world for placement position.

  function getHeldItem() {
    if (window._batch4Held) {
      try { return window._batch4Held(); } catch (e) { return null; }
    }
    return null;
  }

  function getLookTarget() {
    // Reimplement the raycast from batch4 so we know where the player is aiming
    const origin = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    for (let t = 0; t < 6; t += 0.05) {
      const x = Math.floor(origin.x + dir.x * t);
      const y = Math.floor(origin.y + dir.y * t);
      const z = Math.floor(origin.z + dir.z * t);
      const b = getBlock(x, y, z);
      if (b !== 0 && !(BLOCKS[b] && BLOCKS[b].solid === false)) {
        // Return the adjacent air position (where we'd place)
        return {
          hit: { x, y, z, block: b },
          placeX: x + Math.round(dir.x > 0.5 ? 1 : dir.x < -0.5 ? -1 : 0),
          placeY: y + Math.round(dir.y > 0.5 ? 1 : dir.y < -0.5 ? -1 : 0),
          placeZ: z + Math.round(dir.z > 0.5 ? 1 : dir.z < -0.5 ? -1 : 0),
          // Simpler: place at the block that dir points into
          adjacentX: Math.floor(origin.x + dir.x * (t + 1)),
          adjacentY: Math.floor(origin.y + dir.y * (t + 1)),
          adjacentZ: Math.floor(origin.z + dir.z * (t + 1)),
        };
      }
    }
    return null;
  }

  function removeOneFromInventory(itemName) {
    if (window._batch4Remove) {
      const removed = window._batch4Remove(itemName, 1);
      return removed > 0;
    }
    return false;
  }

  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 2) return;   // right-click

    const heldItem = getHeldItem();
    if (heldItem !== 'bed' && heldItem !== 'torch') return;

    // Raycast and find the exact face we hit
    const origin = new THREE.Vector3(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    const step = 0.05;
    let lastEmptyX = Math.floor(origin.x), lastEmptyY = Math.floor(origin.y), lastEmptyZ = Math.floor(origin.z);
    let px = null, py = null, pz = null;
    for (let t = 0; t < 6; t += step) {
      const x = Math.floor(origin.x + dir.x * t);
      const y = Math.floor(origin.y + dir.y * t);
      const z = Math.floor(origin.z + dir.z * t);
      const b = getBlock(x, y, z);
      if (b !== 0 && !(BLOCKS[b] && BLOCKS[b].solid === false)) {
        // Hit a solid block. The previous step (lastEmpty*) is where we'd place.
        px = lastEmptyX; py = lastEmptyY; pz = lastEmptyZ;
        break;
      }
      lastEmptyX = x; lastEmptyY = y; lastEmptyZ = z;
    }
    if (px === null) return;

    // Must be an empty spot
    if (getBlock(px, py, pz) !== 0) return;

    if (heldItem === 'bed') {
      // Place a bed block
      setBlock(px, py, pz, 20);
      placedBeds.add(px + ',' + py + ',' + pz);
      removeOneFromInventory('bed');
      if (window._batch4Toast) window._batch4Toast('Bed placed');
      // Record this position as the potential spawn point
      bedSpawnPoint = { x: px + 0.5, y: py + 1, z: pz + 0.5 };
      try {
        localStorage.setItem(SPAWN_KEY, JSON.stringify(bedSpawnPoint));
      } catch (err) {}
      if (typeof rebuildAllChunks === 'function') rebuildAllChunks();
    } else if (heldItem === 'torch') {
      // Place a torch block
      setBlock(px, py, pz, 21);
      removeOneFromInventory('torch');
      if (window._batch4Toast) window._batch4Toast('Torch placed');
      // Add a point light for it
      addTorchLight(px, py, pz);
      if (typeof rebuildAllChunks === 'function') rebuildAllChunks();
    }
  });

  // ============================================================
  // 4. SLEEP IN BED — right-click an existing bed block
  // ============================================================
  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 2) return;

    const heldItem = getHeldItem();
    // Only if NOT holding a bed or torch (else we'd be placing)
    if (heldItem === 'bed' || heldItem === 'torch') return;

    const target = getLookTarget();
    if (!target) return;

    // Is the block we're looking at a bed?
    const b = getBlock(target.hit.x, target.hit.y, target.hit.z);
    if (b !== 20) return;

    sleepInBed(target.hit.x, target.hit.y, target.hit.z);
  });

  function isNightTime() {
    // Read the sun's position — batch2 moves it in an arc
    let sunY = 0;
    scene.traverse(function (o) {
      if (o.isDirectionalLight && sunY === 0) sunY = o.position.y;
    });
    return sunY < 20;   // sun below the horizon = night
  }

  function skipToDawn() {
    // Find the sun and jump its angle to dawn. We can't control batch2's
    // internal time variable directly, but we can set the sun's position
    // to a "morning" spot and hope batch2 catches up.
    //
    // A better approach: batch2 might expose a time variable. Let's look
    // for it on window.
    if (window._batch2SkipToDawn) {
      window._batch2SkipToDawn();
      return;
    }
    // Fallback: ask the user to wait, or fast-forward by manipulating time
    console.warn('[Batch 6b] no skip-to-dawn hook available; sun will cycle naturally');
  }

  function sleepInBed(bx, by, bz) {
    if (!isNightTime()) {
      if (window._batch4Toast) window._batch4Toast('You can only sleep at night');
      return;
    }
    // Set spawn point to this bed
    bedSpawnPoint = { x: bx + 0.5, y: by + 1, z: bz + 0.5 };
    try {
      localStorage.setItem(SPAWN_KEY, JSON.stringify(bedSpawnPoint));
    } catch (e) {}

    if (window._batch4Toast) window._batch4Toast('Spawn point set — good morning!');
    // Skip to dawn (may or may not work depending on batch2)
    skipToDawn();
  }

  // ============================================================
  // 5. TORCH LIGHTS — Three.js point lights (capped at 8 nearest)
  // ============================================================
  const MAX_TORCH_LIGHTS = 8;
  const activeTorchLights = new Map();   // "x,y,z" -> THREE.PointLight

  function addTorchLight(x, y, z) {
    const key = x + ',' + y + ',' + z;
    if (activeTorchLights.has(key)) return;

    const light = new THREE.PointLight(0xffb060, 1.2, 12, 1.5);
    light.position.set(x + 0.5, y + 0.7, z + 0.5);
    // Add small glowing cube for visuals
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xffcc55 })
    );
    cube.position.copy(light.position);
    light.add(cube);

    scene.add(light);
    activeTorchLights.set(key, light);
  }

  function removeTorchLight(key) {
    const light = activeTorchLights.get(key);
    if (!light) return;
    scene.remove(light);
    light.traverse(function (o) {
      if (o.isMesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    activeTorchLights.delete(key);
  }

  // Scan for torch blocks near the player and manage the light cap.
  // Called every 0.5s to avoid doing this every frame.
  function rescanTorches() {
    // Find all torch blocks within ~30 blocks of the player
    const px = Math.floor(player.pos.x), py = Math.floor(player.pos.y), pz = Math.floor(player.pos.z);
    const R = 30;
    const nearby = [];
    for (let x = px - R; x <= px + R; x++) {
      for (let z = pz - R; z <= pz + R; z++) {
        for (let y = Math.max(1, py - 20); y <= Math.min(WORLD_H - 1, py + 20); y++) {
          const b = getBlock(x, y, z);
          if (b === 21) {
            const d = (x - px) * (x - px) + (y - py) * (y - py) + (z - pz) * (z - pz);
            nearby.push({ x, y, z, d });
          }
        }
      }
    }
    // Sort by distance, keep nearest MAX_TORCH_LIGHTS
    nearby.sort(function (a, b) { return a.d - b.d; });
    const wanted = new Set();
    for (let i = 0; i < Math.min(MAX_TORCH_LIGHTS, nearby.length); i++) {
      const t = nearby[i];
      const key = t.x + ',' + t.y + ',' + t.z;
      wanted.add(key);
      if (!activeTorchLights.has(key)) addTorchLight(t.x, t.y, t.z);
    }
    // Remove lights no longer in the wanted set
    for (const key of Array.from(activeTorchLights.keys())) {
      if (!wanted.has(key)) removeTorchLight(key);
    }
  }

  setInterval(rescanTorches, 500);

  // ============================================================
  // 6. RESPAWN AT BED ON DEATH
  // ============================================================
  // Override the base game's death behavior if it exists. But the base
  // game may not have death handling, since there's no health bar.
  // We hook player.pos when it "resets" — hard to detect.
  //
  // Simpler: provide a "Respawn" button in the debug menu that sends
  // the player to their bed spawn.

  function addRespawnButton() {
    const dbg = document.getElementById('debug');
    if (!dbg) { setTimeout(addRespawnButton, 500); return; }
    if (dbg.querySelector('#b6brespawn')) return;
    const holder = document.createElement('div');
    holder.id = 'b6brespawn';
    holder.innerHTML = '<h4>Bed</h4>';
    const row = document.createElement('div');
    row.className = 'drow';
    const btn = document.createElement('button');
    btn.textContent = 'Respawn at bed';
    btn.addEventListener('click', function () {
      if (!bedSpawnPoint) {
        if (window._batch4Toast) window._batch4Toast('No bed spawn set');
        return;
      }
      player.pos.x = bedSpawnPoint.x;
      player.pos.y = bedSpawnPoint.y;
      player.pos.z = bedSpawnPoint.z;
      player.vel.set(0, 0, 0);
      if (window._batch4Toast) window._batch4Toast('Respawned at bed');
    });
    row.appendChild(btn);
    holder.appendChild(row);
    dbg.appendChild(holder);
  }
  addRespawnButton();

  // ============================================================
  // 7. SAVE BED SPAWN WHEN GAME SAVES
  // ============================================================
  addEventListener('beforeunload', function () {
    if (bedSpawnPoint) {
      try { localStorage.setItem(SPAWN_KEY, JSON.stringify(bedSpawnPoint)); } catch (e) {}
    }
  });

  // ============================================================
  // 8. HOOK BATCH 2 FOR SKIP-TO-DAWN (if it exposes time)
  // ============================================================
  section('day skip hook', function () {
    // Batch2 controls the day/night cycle via an internal variable.
    // If it's exposed, we use it. If not, we try to find the sun and
    // jump its position to a morning value.
    //
    // The sun position is set every frame by batch2, so setting it
    // directly won't persist. Best-effort: nudge batch2's internal
    // time if we can reach it.
    //
    // We can't, so we log a warning. Night will pass naturally.
    console.log('[Batch 6b] sleeping will set spawn but time-skip needs a batch2 hook (not available)');
  });

  console.log('[MiniTerra 3D Batch 6b] loaded — beds and torches.');
})();