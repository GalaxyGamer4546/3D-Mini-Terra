/* ============================================================
   MiniTerra 3D — BATCH 7a: Complete Block Textures (fixed)
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof player === 'undefined') {
    console.error('[Batch 7a] game not loaded');
    return;
  }

    // Disable batch1's texture system — batch7a replaces it
  if (typeof window !== 'undefined') {
    // batch1 exposes these via closures, so we can't reach them directly.
    // Instead, we neutralize the effect: batch1 runs AFTER our code
    // (if it hooks rebuildChunk too), so we need to run LAST.
    // We'll re-hook rebuildChunk on a delay so we're the outermost wrapper.
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 7a] ' + name + ' failed:', e.message); }
  }

  const TILE_SIZE = 16;
  const TILES_PER_ROW = 8;
  const BLOCK_COUNT = 22;
  const ATLAS_ROWS = Math.ceil(BLOCK_COUNT / TILES_PER_ROW);
  const ATLAS_W = TILES_PER_ROW * TILE_SIZE;
  const ATLAS_H = ATLAS_ROWS * TILE_SIZE;

  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = ATLAS_H;
  const actx = atlasCanvas.getContext('2d');
  actx.imageSmoothingEnabled = false;

  function tr(x, y, s) {
    let h = Math.imul(x + s * 131, 374761393) ^ Math.imul(y + s * 977, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function tileOrigin(id) {
    return { x: (id % TILES_PER_ROW) * TILE_SIZE, y: Math.floor(id / TILES_PER_ROW) * TILE_SIZE };
  }

  function px(tx, ty, x, y, r, g, b) {
    actx.fillStyle = 'rgb(' + (r|0) + ',' + (g|0) + ',' + (b|0) + ')';
    actx.fillRect(tx + x, ty + y, 1, 1);
  }

  // ---- TILE DRAWING ----
  function drawGrass(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 90 + (n - 0.5) * 30, g = 160 + (n - 0.5) * 40, b = 70 + (n - 0.5) * 30;
      if (j < 2) { r += 20; g += 25; b += 15; }
      if (n < 0.12) { r -= 30; g -= 40; b -= 25; }
      if (n > 0.95) { r -= 60; g -= 80; b -= 50; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawDirt(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 120 + (n - 0.5) * 40, g = 80 + (n - 0.5) * 30, b = 55 + (n - 0.5) * 25;
      if (n < 0.15) { r -= 40; g -= 30; b -= 20; }
      if (n > 0.92) { r += 30; g += 20; b += 10; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawStone(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let v = 128 + (n - 0.5) * 30;
      if (n < 0.08) v -= 30;
      if (n > 0.94) v += 25;
      px(x, y, i, j, v, v, v * 0.98);
    }
    for (let k = 0; k < 3; k++) {
      const sx = Math.floor(tr(k, 0, id + 5) * 16), sy = Math.floor(tr(k, 1, id + 5) * 16);
      const len = 3 + Math.floor(tr(k, 2, id + 5) * 5);
      for (let s = 0; s < len; s++) px(x, y, (sx + s) % 16, sy, 90, 90, 92);
    }
  }
  function drawWood(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 105 + (n - 0.5) * 20, g = 70 + (n - 0.5) * 15, b = 40 + (n - 0.5) * 10;
      if (i % 4 === 0) { r -= 15; g -= 12; b -= 8; }
      if (i % 4 === 2) { r += 10; g += 8; b += 5; }
      if (n > 0.97) { r -= 30; g -= 20; b -= 15; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawPlanks(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 190 + (n - 0.5) * 20, g = 140 + (n - 0.5) * 15, b = 90 + (n - 0.5) * 15;
      if (j === 0 || j === 5 || j === 10 || j === 15) { r -= 30; g -= 25; b -= 20; }
      if (i === 8 && j < 5) { r -= 25; g -= 20; b -= 15; }
      if (i === 3 && j > 5 && j < 10) { r -= 25; g -= 20; b -= 15; }
      if (i === 12 && j > 10) { r -= 25; g -= 20; b -= 15; }
      if (n < 0.06) { r -= 20; g -= 15; b -= 10; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawSand(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 220 + (n - 0.5) * 20, g = 200 + (n - 0.5) * 20, b = 140 + (n - 0.5) * 20;
      if (n < 0.1) { r -= 25; g -= 20; b -= 15; }
      if (n > 0.95) { r += 20; g += 15; b += 10; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawGlass(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const edge = (i === 0 || j === 0 || i === 15 || j === 15);
      if (edge) px(x, y, i, j, 220, 240, 250);
      else px(x, y, i, j, 190, 225, 245);
    }
  }
  function drawBrick(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      const row = Math.floor(j / 4);
      const inMortar = (j % 4 === 0) || (i % 8 === (row % 2 === 0 ? 0 : 4));
      if (inMortar) px(x, y, i, j, 180, 175, 170);
      else {
        let r = 165 + (n - 0.5) * 25, g = 65 + (n - 0.5) * 15, b = 55 + (n - 0.5) * 15;
        px(x, y, i, j, r, g, b);
      }
    }
  }
  function drawGoldBlock(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 240 + (n - 0.5) * 30, g = 200 + (n - 0.5) * 25, b = 40 + (n - 0.5) * 20;
      if ((i + j) % 8 === 0) { r += 15; g += 15; b += 30; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawLeaves(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 60 + (n - 0.5) * 30, g = 120 + (n - 0.5) * 40, b = 45 + (n - 0.5) * 25;
      if (n < 0.1) { r = 30; g = 60; b = 25; }
      if (n > 0.9) { r += 25; g += 30; b += 20; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawWater(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 55 + (n - 0.5) * 15, g = 110 + (n - 0.5) * 20, b = 200 + (n - 0.5) * 25;
      if ((i + j) % 5 === 0) { b += 20; g += 10; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawSnow(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let v = 245 + (n - 0.5) * 15;
      px(x, y, i, j, v, v + 3, v + 5);
    }
  }
  function drawIce(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let r = 180 + (n - 0.5) * 20, g = 220 + (n - 0.5) * 20, b = 245 + (n - 0.5) * 15;
      if ((i * 3 + j * 5) % 23 === 0) { r -= 40; g -= 30; b -= 25; }
      px(x, y, i, j, r, g, b);
    }
  }
  function drawMetal(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      let v = 180 + (n - 0.5) * 25;
      if ((i + j) % 7 === 0) v += 25;
      if ((i - j + 16) % 11 === 0) v -= 20;
      px(x, y, i, j, v, v, v + 5);
    }
  }
  function drawCobble(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(Math.floor(i / 3), Math.floor(j / 3), id);
      let v = 100 + (n - 0.5) * 50;
      if (i % 3 === 0 || j % 3 === 0) v -= 40;
      px(x, y, i, j, v, v, v * 0.98);
    }
  }
  function drawOre(id, oreColor, chunkCount) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      const v = 128 + (n - 0.5) * 30;
      px(x, y, i, j, v, v, v * 0.98);
    }
    const or = (oreColor >> 16) & 255, og = (oreColor >> 8) & 255, ob = oreColor & 255;
    for (let k = 0; k < chunkCount; k++) {
      const cx = 2 + Math.floor(tr(k, 0, id + 10) * 12);
      const cy = 2 + Math.floor(tr(k, 1, id + 10) * 12);
      const size = 2 + Math.floor(tr(k, 2, id + 10) * 3);
      for (let di = 0; di < size; di++) for (let dj = 0; dj < size; dj++) {
        const xx = cx + di, yy = cy + dj;
        if (xx >= 16 || yy >= 16) continue;
        const bright = tr(xx, yy, id + 20) * 0.4 + 0.8;
        px(x, y, xx, yy, or * bright, og * bright, ob * bright);
      }
    }
  }
  function drawBed(id) {
    const { x, y } = tileOrigin(id);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
      const n = tr(i, j, id);
      if (j < 5) { const v = 235 + (n - 0.5) * 15; px(x, y, i, j, v, v, v); }
      else if (j < 7) { const r = 140 + (n - 0.5) * 20; px(x, y, i, j, r, 40, 40); }
      else { const r = 190 + (n - 0.5) * 20; px(x, y, i, j, r, 45, 45); }
    }
  }
  function drawTorch(id) {
    const { x, y } = tileOrigin(id);
    actx.clearRect(x, y, 16, 16);
    for (let i = 6; i < 10; i++) for (let j = 8; j < 16; j++) {
      const n = tr(i, j, id);
      const v = 90 + (n - 0.5) * 15;
      px(x, y, i, j, v + 20, v - 15, v - 40);
    }
    for (let i = 4; i < 12; i++) for (let j = 0; j < 8; j++) {
      const n = tr(i, j, id + 5);
      const dist = Math.hypot(i - 8, j - 4);
      if (dist < 4.5) {
        let r = 250, g = 180 - dist * 15, b = 40;
        if (dist > 2) { r = 250; g = 130; b = 20; }
        if (n < 0.2) { r = 255; g = 240; b = 180; }
        px(x, y, i, j, r, g, b);
      }
    }
  }

  section('atlas draw', function () {
    actx.fillStyle = '#ff00ff';
    actx.fillRect(0, 0, ATLAS_W, ATLAS_H);
    const { x: ax0, y: ay0 } = tileOrigin(0);
    actx.clearRect(ax0, ay0, 16, 16);

    drawGrass(1); drawDirt(2); drawStone(3); drawWood(4); drawPlanks(5);
    drawSand(6); drawGlass(7); drawBrick(8); drawGoldBlock(9); drawLeaves(10);
    drawWater(11); drawSnow(12); drawIce(13); drawMetal(14); drawCobble(15);
    drawOre(16, 0x222222, 5);
    drawOre(17, 0xd9a679, 6);
    drawOre(18, 0xffd700, 5);
    drawOre(19, 0x40e0ff, 5);
    drawBed(20); drawTorch(21);
    console.log('[Batch 7a] drew', BLOCK_COUNT, 'tiles into', ATLAS_W + 'x' + ATLAS_H, 'atlas');
  });

  const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
  atlasTexture.needsUpdate = true;

  function uvForBlock(id) {
    const col = id % TILES_PER_ROW;
    const row = Math.floor(id / TILES_PER_ROW);
    const inset = 0.001;
    return {
      u0: (col / TILES_PER_ROW) + inset,
      u1: ((col + 1) / TILES_PER_ROW) - inset,
      v0: 1 - ((row + 1) / ATLAS_ROWS) + inset,
      v1: 1 - (row / ATLAS_ROWS) - inset,
    };
  }

  // ============================================================
  // MATERIALS — one per block, ours, textured
  // ============================================================
  const blockMaterials = {};

  section('build materials', function () {
    for (const id in BLOCKS) {
      if (id === '0') continue;
      const def = BLOCKS[id];
      if (!def) continue;
      const opts = {
        map: atlasTexture,
        vertexColors: true,
        flatShading: true,
      };
      // Transparency handling
      const isGlass = def.name === 'glass';
      const isWater = def.name === 'water';
      const isLeaves = def.name === 'leaves';
      const isTorch = def.name === 'torch_block';
      if (isGlass) { opts.transparent = true; opts.opacity = 0.55; }
      if (isWater) { opts.transparent = true; opts.opacity = 0.75; }
      if (isLeaves || isTorch) { opts.alphaTest = 0.5; }
      blockMaterials[id] = new THREE.MeshLambertMaterial(opts);
    }
    
    console.log('[Batch 7a] built', Object.keys(blockMaterials).length, 'textured materials');
  });

  // ============================================================
  // APPLY UVs + MATERIAL — fixed to handle cloned materials
  // ============================================================
  // The base game clones each material when it builds a mesh. So we
  // can't compare by reference. Instead, we identify the block from
  // the mesh's material COLOR (the base game sets it from BLOCKS[id].color
  // before cloning, and the clone preserves it).

  // Color → block id lookup
  const colorToBlockId = {};
  for (const id in BLOCKS) {
    if (id === '0') continue;
    const c = BLOCKS[id].color;
    if (c !== undefined) colorToBlockId[c] = +id;
  }

  function identifyBlockFromMesh(mesh) {
    // Method 1: exact color match
    try {
      const col = mesh.material.color.getHex();
      if (colorToBlockId[col] !== undefined) return colorToBlockId[col];
      // Method 2: tolerance match
      const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
      for (const id in BLOCKS) {
        if (id === '0') continue;
        const c = BLOCKS[id].color;
        if (c === undefined) continue;
        const r2 = (c >> 16) & 255, g2 = (c >> 8) & 255, b2 = c & 255;
        if (Math.abs(r - r2) < 3 && Math.abs(g - g2) < 3 && Math.abs(b - b2) < 3) return +id;
      }
    } catch (e) {}
    return -1;
  }

  function addUVsToMesh(mesh, blockId) {
    if (!mesh.geometry) return;
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) return;
    const count = pos.count;
    // Always rebuild UVs fresh (delete old ones so we start clean)
    if (mesh.geometry.getAttribute('uv')) {
      mesh.geometry.deleteAttribute('uv');
    }
    const uv = uvForBlock(blockId);
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const corner = i % 4;
      let u, v;
      if (corner === 0) { u = uv.u0; v = uv.v0; }
      else if (corner === 1) { u = uv.u1; v = uv.v0; }
      else if (corner === 2) { u = uv.u1; v = uv.v1; }
      else { u = uv.u0; v = uv.v1; }
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    mesh.geometry.attributes.uv.needsUpdate = true;
  }

  function retextureChunk(cx, cz) {
    if (typeof chunkMeshes === 'undefined') return;
    const entry = chunkMeshes[cx + ',' + cz];
    if (!entry || !entry.meshes) return;
    for (const mesh of entry.meshes) {
      if (!mesh.material) continue;
      let foundId = -1;
      // Match by exact color first
      try {
        const col = mesh.material.color.getHex();
        if (colorToBlockId[col] !== undefined) foundId = colorToBlockId[col];
        // Tolerance match
        if (foundId < 0) {
          const r = (col >> 16) & 255, g = (col >> 8) & 255, b = col & 255;
          for (const id in BLOCKS) {
            if (id === '0') continue;
            const c = BLOCKS[id].color;
            if (c === undefined) continue;
            const r2 = (c >> 16) & 255, g2 = (c >> 8) & 255, b2 = c & 255;
            if (Math.abs(r - r2) < 3 && Math.abs(g - g2) < 3 && Math.abs(b - b2) < 3) { foundId = +id; break; }
          }
        }
      } catch (e) {}

      // If we can't identify from material, try to identify from geometry bbox
      // (fallback — skip this mesh if still unknown)
      if (foundId < 0) continue;

      const ourMat = blockMaterials[foundId];
      if (!ourMat) continue;

      // Only swap if material is NOT already our textured one
      if (mesh.material !== ourMat) {
        mesh.material = ourMat;
      }
      // Force UV (re)application
      addUVsToMesh(mesh, foundId);
    }
  }

  // Hook rebuildChunk so textures apply after every chunk update
  section('hook rebuild', function () {
    if (typeof window.rebuildChunk === 'function') {
      const orig = window.rebuildChunk;
      window.rebuildChunk = function (cx, cz) {
        orig(cx, cz);
        retextureChunk(cx, cz);
      };
      try { rebuildChunk = window.rebuildChunk; } catch (e) {}
      console.log('[Batch 7a] hooked rebuildChunk');
    } else {
      console.warn('[Batch 7a] rebuildChunk not exposed');
    }
    if (typeof window.rebuildAllChunks === 'function') {
      const origAll = window.rebuildAllChunks;
      window.rebuildAllChunks = function () {
        origAll();
        if (typeof chunkMeshes !== 'undefined') {
          for (const key in chunkMeshes) {
            const p = key.split(',');
            retextureChunk(+p[0], +p[1]);
          }
        }
      };
      try { rebuildAllChunks = window.rebuildAllChunks; } catch (e) {}
    }
  });

  // Apply to all existing chunks now
  setTimeout(function () {
    section('initial retexture', function () {
      if (typeof chunkMeshes === 'undefined') {
        console.warn('[Batch 7a] chunkMeshes not found');
        return;
      }
      let count = 0;
      for (const key in chunkMeshes) {
        const p = key.split(',');
        retextureChunk(+p[0], +p[1]);
        count++;
      }
      console.log('[Batch 7a] retextured', count, 'existing chunks');
    });
  }, 800);

  // ============================================================
  // PREVIEW OVERLAY (press P)
  // ============================================================
  section('preview overlay', function () {
    const overlay = document.createElement('div');
    overlay.id = 'b7apreview';
    overlay.style.cssText =
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'background:#1a1d24;border:3px solid #555c6e;border-radius:8px;' +
      'padding:16px;display:none;z-index:60;font-family:system-ui,sans-serif;color:#fff;' +
      'max-width:90vw;max-height:90vh;overflow:auto;';
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = ATLAS_W;
    previewCanvas.height = ATLAS_H;
    previewCanvas.style.cssText = 'image-rendering:pixelated;width:' + (ATLAS_W * 3) + 'px;height:' + (ATLAS_H * 3) + 'px;display:block;';
    previewCanvas.getContext('2d').drawImage(atlasCanvas, 0, 0);
    overlay.appendChild(previewCanvas);
    const legend = document.createElement('div');
    legend.style.cssText = 'margin-top:10px;font-size:12px;color:#bbb;';
    legend.textContent = 'Press P to close · 1 tile = 1 block · ids 1-21';
    overlay.appendChild(legend);
    document.body.appendChild(overlay);

    let visible = false;
    addEventListener('keydown', function (e) {
      if (e.key !== 't' && e.key !== 'T') return;
      if (e.target.tagName === 'INPUT') return;
      if (e.ctrlKey || e.metaKey) return;
      visible = !visible;
      overlay.style.display = visible ? 'block' : 'none';
    });
  });

  // Backup: every 500ms, ensure all chunk meshes are textured.
  // This catches cases where another batch (like batch1's save/load)
  // rebuilds chunks without going through our hook.
  setInterval(function () {
    if (typeof chunkMeshes === 'undefined') return;
    for (const key in chunkMeshes) {
      const p = key.split(',');
      retextureChunk(+p[0], +p[1]);
    }
  }, 500);

  console.log('[MiniTerra 3D Batch 7a] loaded — new block textures. Press P for preview.');
})();