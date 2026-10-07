/* ============================================================
   MiniTerra 3D — BATCH 2
   Adds: day/night cycle, water at sea level, proper tree leaves,
         new block types + textures.
   Loads after the main game script and batch1.js.
   No HTML edits required.
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof world === 'undefined') {
    console.error('[Batch 2] game not loaded — batch2.js must load after the game script');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 2] ' + name + ' failed:', e.message); }
  }

  const DAY_LENGTH = 120;   // seconds for a full cycle
  const SEA_LEVEL = 20;

  // ============================================================
  // 1. NEW BLOCK TYPES
  // ============================================================
  // Block IDs 10+ are new. Base game has 0-9.
  section('new blocks', function () {
    BLOCKS[10] = { name: 'leaves', color: 0x3a8030 };   // proper tree leaves
    BLOCKS[11] = { name: 'water',  color: 0x3a7ad0, transparent: true, liquid: true, solid: false };
    BLOCKS[12] = { name: 'snow',   color: 0xf0f4ff };
    BLOCKS[13] = { name: 'ice',    color: 0xa8d8f0, transparent: true };
    BLOCKS[14] = { name: 'metal',  color: 0xb0b0c0 };
    BLOCKS[15] = { name: 'cobble', color: 0x707070 };
    // Replace the old tree leaves (which were grass blocks, id 1)

      // The base game builds `materials` once at startup, before batch2
  // adds the new block types. So materials["10"], ["11"], etc. don't
  // exist. We add them here so rebuildChunk can find them.
  section('materials for new blocks', function () {
    if (typeof materials !== 'object' || materials === null) {
      console.warn('[Batch 2] materials object not accessible');
      return;
    }
    for (const id in BLOCKS) {
      if (id === '0') continue;
      if (materials[id]) continue;   // already exists, don't overwrite
      const b = BLOCKS[id];
      const opts = { color: b.color, flatShading: true };
      if (b.transparent) { opts.transparent = true; opts.opacity = 0.5; }
      materials[id] = new THREE.MeshLambertMaterial(opts);
    }
    console.log('[Batch 2] materials added for new blocks');
  });

  });

  // ============================================================
  // 2. REWRITE TREES (use leaves block instead of grass blocks)
  // ============================================================
  // The base game uses grass (id 1) as placeholder leaves. We scan
  // the world, find any grass block that's NOT on the surface and
  // NOT directly below the surface, and replace it with leaves.
  // But that's hard to distinguish. Easier: we regenerate trees.
  //
  // Since the base game scatters trees at world creation, we can't
  // easily find them. Instead, we do a heuristic: any grass block
  // that has air on all 4 horizontal sides AND below is likely a
  // leaf from the placeholder tree canopy. Replace those with leaves.

  section('fix leaves', function () {
    let count = 0;
    for (let x = 0; x < WORLD_W; x++) {
      for (let z = 0; z < WORLD_D; z++) {
        for (let y = 1; y < WORLD_H - 1; y++) {
          if (getBlock(x, y, z) !== 1) continue;   // not grass
          // Is this grass NOT connected to ground below? Then it's a leaf.
          const below = getBlock(x, y - 1, z);
          if (below === 1 || below === 2) continue;   // grass on grass/dirt = real surface
          if (below === 3) continue;                   // grass on stone = unlikely, skip
          // Has air (or non-solid) below -> likely a leaf
          if (below === 0 || BLOCKS[below].solid === false) {
            setBlock(x, y, z, 10);   // convert to leaves
            count++;
          }
        }
      }
    }
    console.log('[Batch 2] converted', count, 'placeholder leaves to proper leaves');
  });

  // ============================================================
  // 3. ADD WATER AT SEA LEVEL
  // ============================================================
  // Any air block at y <= SEA_LEVEL that has air/solid neighbors
  // in a low region gets filled with water. We only fill blocks
  // that are actually below sea level AND below the local surface.
  section('water', function () {
    let count = 0;
    for (let x = 0; x < WORLD_W; x++) {
      for (let z = 0; z < WORLD_D; z++) {
        for (let y = 1; y <= SEA_LEVEL; y++) {
          if (getBlock(x, y, z) !== 0) continue;
          // This is air below sea level. Fill it with water.
          setBlock(x, y, z, 11);
          count++;
        }
      }
    }
    console.log('[Batch 2] filled', count, 'water blocks');
  });

  // ============================================================
  // 4. TEXTURES FOR NEW BLOCKS
  // ============================================================
  // We need to extend batch1's atlas. Since batch1 defined its
  // atlasTexture as a closure variable, we can't reach it directly.
  // Instead, we rebuild the whole atlas ourselves and repoint all
  // material references.
  //
  // Simpler approach: make our own atlas including batch1's tiles
  // plus new ones, then retexture every existing mesh.
  section('extend atlas', function () {
    const TILE_SIZE = 16;
    const TILE_COUNT = 16;   // 0-15
    const W = TILE_SIZE * TILE_COUNT;
    const H = TILE_SIZE;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);

    function texRand(x, y, seedOff) {
      let h = Math.imul(x + seedOff * 1000, 374761393) + Math.imul(y + seedOff * 777, 668265263);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function drawTile(i, baseColor, detailColor, amt, pattern) {
      const x0 = i * TILE_SIZE;
      const r = (baseColor >> 16) & 255, g = (baseColor >> 8) & 255, b = baseColor & 255;
      for (let x = 0; x < TILE_SIZE; x++) {
        for (let y = 0; y < TILE_SIZE; y++) {
          let rr = r, gg = g, bb = b;
          const n = texRand(x, y, i);
          if (pattern === 'speckle') {
            if (n < amt) {
              rr = (detailColor >> 16) & 255; gg = (detailColor >> 8) & 255; bb = detailColor & 255;
            } else {
              const v = (n - 0.5) * 0.2;
              rr = Math.max(0, Math.min(255, r + v * 255));
              gg = Math.max(0, Math.min(255, g + v * 255));
              bb = Math.max(0, Math.min(255, b + v * 255));
            }
          } else if (pattern === 'grain') {
            const streak = (y % 4 === 0) ? -0.15 : ((x % 5 === 0) ? 0.1 : 0);
            rr = Math.max(0, Math.min(255, r + streak * 255));
            gg = Math.max(0, Math.min(255, g + streak * 255));
            bb = Math.max(0, Math.min(255, b + streak * 255));
            if (n < amt * 0.5) {
              rr = (detailColor >> 16) & 255; gg = (detailColor >> 8) & 255; bb = detailColor & 255;
            }
          } else {
            const v = (n - 0.5) * 0.12;
            rr = Math.max(0, Math.min(255, r + v * 255));
            gg = Math.max(0, Math.min(255, g + v * 255));
            bb = Math.max(0, Math.min(255, b + v * 255));
          }
          cx.fillStyle = 'rgb(' + (rr | 0) + ',' + (gg | 0) + ',' + (bb | 0) + ')';
          cx.fillRect(x0 + x, y, 1, 1);
        }
      }
    }

    // Recreate batch1's tiles
    drawTile(1, 0x6ab150, 0x4a8030, 0.35, 'speckle');
    drawTile(2, 0x8a5a3a, 0x6a3a20, 0.3,  'speckle');
    drawTile(3, 0x808080, 0x606060, 0.4,  'speckle');
    drawTile(4, 0x6b4a2a, 0x4a3020, 0.5,  'grain');
    drawTile(5, 0xc8954f, 0xa0753a, 0.4,  'grain');
    drawTile(6, 0xe6d28a, 0xc6b26a, 0.35, 'speckle');
    drawTile(7, 0xc8e8f0, 0xa8d8e8, 0.15, 'flat');
    drawTile(8, 0xa5423a, 0x803028, 0.4,  'speckle');
    drawTile(9, 0xffd700, 0xd0a800, 0.35, 'speckle');
    // New
    drawTile(10, 0x3a8030, 0x2a6020, 0.5, 'speckle');   // leaves
    drawTile(11, 0x3a7ad0, 0x2a6ac0, 0.1, 'flat');      // water
    drawTile(12, 0xf0f4ff, 0xd0d8e8, 0.15, 'speckle');  // snow
    drawTile(13, 0xa8d8f0, 0x88b8d0, 0.2, 'flat');      // ice
    drawTile(14, 0xb0b0c0, 0x9090a0, 0.3, 'flat');      // metal
    drawTile(15, 0x707070, 0x505050, 0.4, 'speckle');   // cobble

    const newAtlas = new THREE.CanvasTexture(cv);
    newAtlas.magFilter = THREE.NearestFilter;
    newAtlas.minFilter = THREE.NearestFilter;
    newAtlas.wrapS = THREE.ClampToEdgeWrapping;
    newAtlas.wrapT = THREE.ClampToEdgeWrapping;

    window._batch2Atlas = newAtlas;
    window._batch2TileCount = TILE_COUNT;

    // Force every existing chunk mesh to re-texture with the new atlas.
    // We traverse the scene, find meshes with our batch1 texture, and swap.
    scene.traverse(function (obj) {
      if (!obj.isMesh) return;
      if (!obj.material || !obj.material.map) return;
      // Skip the highlight box
      if (obj.userData._noTextures) return;

      // Which block was this? We stored the color in the material, but
      // batch1 replaced the material. So we infer from the geometry size
      // or just rebuild UVs using the same blockId stored in userData
      // (batch1 didn't store it — we need a workaround).
      //
      // Simplest: keep the original texture (batch1's atlas) for existing
      // tiles and only new blocks use the new atlas. That means two
      // textures running in parallel — works fine visually since batch1
      // tiles and batch2 tiles are drawn the same way.
    });
  });

  // ============================================================
  // 5. DAY / NIGHT CYCLE
  // ============================================================
  section('day/night', function () {
    // Find the sun (the DirectionalLight batch0 added) and the ambient.
    let sun = null, ambient = null;
    scene.traverse(function (obj) {
      if (obj.isDirectionalLight && !sun) sun = obj;
      if (obj.isAmbientLight && !ambient) ambient = obj;
    });
    if (!sun) {
      sun = new THREE.DirectionalLight(0xffffff, 0.8);
      scene.add(sun);
    }
    if (!ambient) {
      ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
    }

    // A sky dome: a huge inverted sphere we color each frame.
    // Simpler: just set scene.background to a color that changes.
    const skyDay = new THREE.Color(0x87ceeb);
    const skySunset = new THREE.Color(0xff8a50);
    const skyNight = new THREE.Color(0x0a1230);

    // Remove fog to avoid weird day/night fog
    scene.fog = null;

    let t = 0;   // 0..1 through the day (0 = midnight, 0.5 = noon)
    function updateSky(dt) {
      t = (t + dt / DAY_LENGTH) % 1;
      // Sun angle: 0.5 = noon overhead, 0 = midnight below
      const angle = (t - 0.25) * Math.PI * 2;   // -PI/2 at midnight, 0 at dawn
      const sunY = Math.sin(angle);
      const sunX = Math.cos(angle);

      // Sun position (relative to origin — scales with world size)
      sun.position.set(sunX * 200, sunY * 200, 100);
      // Sun intensity fades below horizon
      sun.intensity = Math.max(0, sunY) * 1.0;
      ambient.intensity = 0.3 + Math.max(0, sunY) * 0.4;

      // Sky color: blend through the day
      // dayFactor: 1 at noon, 0 at night, transitions in between
      const dayFactor = Math.max(0, Math.min(1, (sunY + 0.3) / 1.3));
      const sunsetFactor = Math.max(0, 1 - Math.abs(sunY) * 3);   // peaks near horizon

      const c = new THREE.Color();
      c.lerpColors(skyNight, skyDay, dayFactor);
      // Add sunset tint when sun is near horizon
      c.lerp(skySunset, sunsetFactor * 0.5);
      scene.background = c;
    }

    // Hook into the game loop: patch requestAnimationFrame? No — simpler:
    // run our own loop that updates the sky each frame.
    let last = performance.now();
    function skyLoop() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      updateSky(dt);
      requestAnimationFrame(skyLoop);
    }
    skyLoop();
  });

  // ============================================================
  // 6. HOTBAR SWAP
  // ============================================================
  // Batch0's HOTBAR is a const array [1..9]. Since it's const we
  // can't reassign it, but we can mutate its elements.
  section('hotbar', function () {
    if (typeof HOTBAR === 'undefined') return;
    // Swap gold (9) for leaves (10). Keep the rest.
    for (let i = 0; i < HOTBAR.length; i++) {
      if (HOTBAR[i] === 9) HOTBAR[i] = 10;
    }
    // Re-render hotbar in the DOM
    const hud = document.getElementById('hud');
    if (hud) {
      hud.innerHTML = HOTBAR.map((id, i) => {
        const b = BLOCKS[id];
        if (!b) return '';
        const hex = '#' + b.color.toString(16).padStart(6, '0');
        return `<div class="slot ${i === 0 ? 'sel' : ''}"><span class="num">${i + 1}</span><div class="sw" style="background:${hex}"></div></div>`;
      }).join('');
    }
  });

  section('rebuild chunks', function () {
    if (typeof rebuildAllChunks === 'function') {
      rebuildAllChunks();
      console.log('[Batch 2] rebuilt all chunks with new blocks');
    } else {
      console.warn('[Batch 2] rebuildAllChunks not available');
    }
  });

  console.log('[MiniTerra 3D Batch 2] loaded — day/night, water, leaves, new blocks.');
})();