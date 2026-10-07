/* ============================================================
   MiniTerra 3D — BATCH 1
   Adds: procedural block textures, block highlight, save/load.
   ============================================================ */

(function () {
  'use strict';

  // The game's variables are global (no IIFE in MiniTerra3D.html),
  // so we can run immediately. But scripts load in order, so this
  // batch's <script> tag is after the game's, meaning the game has
  // already run by the time we get here. Guard anyway in case.
  if (typeof scene === 'undefined' || typeof world === 'undefined' || typeof camera === 'undefined') {
    console.error('[Batch 1] game not loaded — check that batch1.js comes after the game script');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 1] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // 1. PROCEDURAL TEXTURE ATLAS
  // ============================================================
  // Build a canvas with 16x16 tiles arranged horizontally. Each
  // tile is 16x16 pixels, procedurally drawn to look like a block
  // face. Then we set that canvas as a texture on the chunk
  // materials, with UVs picking which tile each face uses.
  //
  // For simplicity we do one tile per block type (grass, dirt,
  // stone, etc.). Grass is special — its top face uses a green
  // texture and its sides use dirt with a grass strip.

  const TILE_SIZE = 16;
  const TILE_COUNT = 10;             // 0 = air (unused), 1..9 for blocks
  const ATLAS_W = TILE_SIZE * TILE_COUNT;
  const ATLAS_H = TILE_SIZE;

  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ATLAS_W;
  atlasCanvas.height = ATLAS_H;
  const actx = atlasCanvas.getContext('2d');

  // Simple deterministic noise for texture detail
  function texRand(x, y, seedOff) {
    let h = Math.imul(x + seedOff * 1000, 374761393) + Math.imul(y + seedOff * 777, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function drawTile(tileIndex, baseColor, detailColor, detailAmount, pattern) {
    const x0 = tileIndex * TILE_SIZE;
    const r = (baseColor >> 16) & 255;
    const g = (baseColor >> 8) & 255;
    const b = baseColor & 255;
    for (let x = 0; x < TILE_SIZE; x++) {
      for (let y = 0; y < TILE_SIZE; y++) {
        let rr = r, gg = g, bb = b;
        const n = texRand(x, y, tileIndex);
        if (pattern === 'speckle') {
          if (n < detailAmount) {
            rr = (detailColor >> 16) & 255;
            gg = (detailColor >> 8) & 255;
            bb = detailColor & 255;
          } else {
            // Slight brightness variation
            const v = (n - 0.5) * 0.2;
            rr = Math.max(0, Math.min(255, r + v * 255));
            gg = Math.max(0, Math.min(255, g + v * 255));
            bb = Math.max(0, Math.min(255, b + v * 255));
          }
        } else if (pattern === 'grain') {
          // Vertical streaks
          const streak = (y % 4 === 0) ? -0.15 : ((x % 5 === 0) ? 0.1 : 0);
          rr = Math.max(0, Math.min(255, r + streak * 255));
          gg = Math.max(0, Math.min(255, g + streak * 255));
          bb = Math.max(0, Math.min(255, b + streak * 255));
          if (n < detailAmount * 0.5) {
            rr = (detailColor >> 16) & 255;
            gg = (detailColor >> 8) & 255;
            bb = detailColor & 255;
          }
        } else if (pattern === 'flat') {
          const v = (n - 0.5) * 0.12;
          rr = Math.max(0, Math.min(255, r + v * 255));
          gg = Math.max(0, Math.min(255, g + v * 255));
          bb = Math.max(0, Math.min(255, b + v * 255));
        }
        actx.fillStyle = 'rgb(' + (rr | 0) + ',' + (gg | 0) + ',' + (bb | 0) + ')';
        actx.fillRect(x0 + x, y, 1, 1);
      }
    }
  }

  section('atlas', function () {
    // Tile layout: index = block id.
    // 0 unused, 1 grass, 2 dirt, 3 stone, 4 wood, 5 planks, 6 sand, 7 glass, 8 brick, 9 gold
    actx.fillStyle = '#000'; actx.fillRect(0, 0, ATLAS_W, ATLAS_H);
    drawTile(1, 0x6ab150, 0x4a8030, 0.35, 'speckle');   // grass
    drawTile(2, 0x8a5a3a, 0x6a3a20, 0.3,  'speckle');   // dirt
    drawTile(3, 0x808080, 0x606060, 0.4,  'speckle');   // stone
    drawTile(4, 0x6b4a2a, 0x4a3020, 0.5,  'grain');     // wood
    drawTile(5, 0xc8954f, 0xa0753a, 0.4,  'grain');     // planks
    drawTile(6, 0xe6d28a, 0xc6b26a, 0.35, 'speckle');   // sand
    drawTile(7, 0xc8e8f0, 0xa8d8e8, 0.15, 'flat');      // glass
    drawTile(8, 0xa5423a, 0x803028, 0.4,  'speckle');   // brick
    drawTile(9, 0xffd700, 0xd0a800, 0.35, 'speckle');   // gold
  });

  const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
  atlasTexture.magFilter = THREE.NearestFilter;
  atlasTexture.minFilter = THREE.NearestFilter;
  atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
  atlasTexture.wrapT = THREE.ClampToEdgeWrapping;

  // UV helper — given block id and face index, return per-vertex UVs.
  // We use one texture per block, so UVs are the same for all faces
  // in this simplified version.
  function uvForBlock(id) {
    const u0 = id / TILE_COUNT;
    const u1 = (id + 1) / TILE_COUNT;
    return { u0, u1, v0: 0, v1: 1 };
  }

    // ============================================================
  // 2. REPLACE CHUNK MESH MATERIALS WITH TEXTURED ONES
  // ============================================================
  // We hook rebuildChunk() and rebuildAllChunks() directly so the
  // texture swap happens in the same frame the meshes are created.
  // No timer, no lag, no re-texturing already-textured meshes.

  function swapMaterialForMesh(mesh) {
    if (!mesh.isMesh) return;
    if (!mesh.geometry) return;
    if (!mesh.geometry.getAttribute('position')) return;
    // Already textured? Skip.
    if (mesh.material && mesh.material.map === atlasTexture) return;
    // Which block id is this mesh?
    // Base game assigns one Mesh per block type per chunk with the
    // material color = BLOCKS[id].color. We read that color to identify.
    const oldCol = mesh.material.color.getHex();
    let blockId = 0;
    for (const k in BLOCKS) {
      if (k === '0') continue;
      if (BLOCKS[k].color === oldCol) { blockId = +k; break; }
    }
    if (blockId === 0) return;   // unknown — leave it alone
    const uv = uvForBlock(blockId);

    // Build UVs for the geometry, using face-corner order from the
    // base game's FACE_VERTS (which is: 0=(0,1), 1=(1,1), 2=(1,0), 3=(0,0)
    // for top-facing, and rotated for the other faces).
    const pos = mesh.geometry.getAttribute('position');
    const count = pos.count;
    const uvs = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const corner = i % 4;
      let u, v;
      if (corner === 0) { u = uv.u0; v = uv.v1; }
      else if (corner === 1) { u = uv.u1; v = uv.v1; }
      else if (corner === 2) { u = uv.u1; v = uv.v0; }
      else { u = uv.u0; v = uv.v0; }
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
    mesh.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const newMat = new THREE.MeshLambertMaterial({
      map: atlasTexture,
      vertexColors: true,
      flatShading: true,
      transparent: mesh.material.transparent === true,
      opacity: mesh.material.opacity,
    });
    const oldMat = mesh.material;
    mesh.material = newMat;
    try { oldMat.dispose(); } catch (e) {}
    mesh.userData._batch1Texture = true;
  }

  function retextureChunkMeshes(cx, cz) {
    // Walk chunkMeshes (base game's registry) for this chunk
    if (typeof chunkMeshes === 'undefined') return;
    const entry = chunkMeshes[cx + ',' + cz];
    if (!entry || !entry.meshes) return;
    for (const m of entry.meshes) swapMaterialForMesh(m);
  }

  function retextureAll() {
    if (typeof chunkMeshes === 'undefined') return;
    for (const key in chunkMeshes) {
      const entry = chunkMeshes[key];
      if (!entry || !entry.meshes) continue;
      for (const m of entry.meshes) swapMaterialForMesh(m);
    }
  }

  // Hook the base game's rebuildChunk and rebuildAllChunks so new
  // meshes get textured immediately in the same frame.
  section('hook rebuilds', function () {
    // The base game exposes these if we added them to `window` earlier.
    // If not, this section logs a warning and we fall back to a timer.
    if (typeof window.rebuildChunk === 'function') {
      const origRebuild = window.rebuildChunk;
      window.rebuildChunk = function (cx, cz) {
        origRebuild(cx, cz);
        retextureChunkMeshes(cx, cz);
      };
      // Also mirror to the local name so any internal calls use the wrapper
      try { rebuildChunk = window.rebuildChunk; } catch (e) {}
    } else {
      console.warn('[Batch 1] rebuildChunk not exposed — falling back to timer');
    }
    if (typeof window.rebuildAllChunks === 'function') {
      const origAll = window.rebuildAllChunks;
      window.rebuildAllChunks = function () {
        origAll();
        retextureAll();
      };
      try { rebuildAllChunks = window.rebuildAllChunks; } catch (e) {}
    }
  });

  // Also run once now to catch whatever's already on screen.
  setTimeout(retextureAll, 100);

  // ============================================================
  // 3. BLOCK HIGHLIGHT
  // ============================================================
  // A wireframe box drawn around the block the player is looking at.
  const highlightGeo = new THREE.BoxGeometry(1.002, 1.002, 1.002);
  const highlightEdges = new THREE.EdgesGeometry(highlightGeo);
  const highlightMat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
  const highlightBox = new THREE.LineSegments(highlightEdges, highlightMat);
  highlightBox.userData._noTextures = true;
  highlightBox.visible = false;
  scene.add(highlightBox);

  // We call pickBlock (in the base game's closure) by reimplementing
  // it here. Same logic as the base game's pickBlock.
  function pickBlockLocal() {
    const dir = new THREE.Vector3(
      -Math.sin(player.yaw) * Math.cos(player.pitch),
      Math.sin(player.pitch),
      -Math.cos(player.yaw) * Math.cos(player.pitch)
    );
    const origin = new THREE.Vector3(
      player.pos.x,
      player.pos.y + player.height * 0.9,
      player.pos.z
    );
    const step = 0.05;
    for (let t = 0; t < 6; t += step) {
      const x = Math.floor(origin.x + dir.x * t);
      const y = Math.floor(origin.y + dir.y * t);
      const z = Math.floor(origin.z + dir.z * t);
      if (typeof getBlock !== 'undefined' && getBlock(x, y, z) !== 0) {
        return { x, y, z };
      }
    }
    return null;
  }

  function updateHighlight() {
    const hit = pickBlockLocal();
    if (hit) {
      highlightBox.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      highlightBox.visible = true;
    } else {
      highlightBox.visible = false;
    }
  }

  // ============================================================
  // 4. SAVE / LOAD
  // ============================================================
  const SAVE_KEY = 'miniterra3d.save.v1';

  // Run-length encode the world Uint8Array → compact string of
  // [byte, count, byte, count, ...] as base64.
  function rleEncode(arr) {
    const out = [];
    let i = 0;
    while (i < arr.length) {
      const b = arr[i];
      let run = 1;
      while (i + run < arr.length && arr[i + run] === b && run < 65000) run++;
      out.push(b);
      out.push(run & 0xFF, (run >> 8) & 0xFF);
      i += run;
    }
    // Convert to base64 string
    const bytes = new Uint8Array(out);
    let bin = '';
    const chunk = 0x8000;
    for (let j = 0; j < bytes.length; j += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(j, j + chunk));
    }
    return btoa(bin);
  }

  function rleDecode(str, target) {
    const bin = atob(str);
    let out = 0;
    for (let i = 0; i < bin.length; i += 3) {
      const b = bin.charCodeAt(i);
      const run = bin.charCodeAt(i + 1) | (bin.charCodeAt(i + 2) << 8);
      for (let r = 0; r < run; r++) target[out++] = b;
    }
    return out;
  }

  function saveWorld() {
    try {
      const encoded = rleEncode(world);
      const payload = JSON.stringify({
        v: 1,
        seed: seed,
        player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw, pitch: player.pitch },
        data: encoded,
      });
      localStorage.setItem(SAVE_KEY, payload);
      toast('Saved (' + (payload.length / 1024).toFixed(1) + ' KB)');
      return true;
    } catch (e) {
      toast('Save failed: ' + e.message);
      return false;
    }
  }

  function loadWorld() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { toast('No save found'); return false; }
      const data = JSON.parse(raw);
      if (!data.data) { toast('Invalid save'); return false; }
      const written = rleDecode(data.data, world);
      if (written !== world.length) {
        toast('Save size mismatch (' + written + ' vs ' + world.length + ')');
        return false;
      }
      if (data.seed !== undefined) seed = data.seed;
      if (data.player) {
        player.pos.set(data.player.x, data.player.y, data.player.z);
        player.yaw = data.player.yaw || 0;
        player.pitch = data.player.pitch || 0;
        player.vel.set(0, 0, 0);
      }
      // Rebuild all chunk meshes to reflect the new world data
      if (typeof rebuildAllChunks === 'function') rebuildAllChunks();
      toast('Loaded');
      return true;
    } catch (e) {
      toast('Load failed: ' + e.message);
      return false;
    }
  }

  // Small toast helper if the base game doesn't have one (it might not).
  function toast(msg) {
    let el = document.getElementById('b1toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'b1toast';
      el.style.cssText =
        'position:fixed;top:40px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:6px;' +
        'font:14px system-ui,sans-serif;z-index:30;transition:opacity .4s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 1500);
  }

  // Keyboard: O = save, P = load
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.ctrlKey || e.metaKey) return;
    if (e.code === 'KeyO') { saveWorld(); }
    if (e.code === 'KeyP') { loadWorld(); }
  });

  // Auto-save on tab close
  addEventListener('beforeunload', () => { saveWorld(); });

  // ============================================================
  // 5. HOOK MAIN LOOP FOR HIGHLIGHT
  // ============================================================
  // The base game calls requestAnimationFrame(loop) itself. We add
  // our own rAF chain that runs alongside, updating only the
  // highlight box. Cheap.
  function highlightLoop() {
    try { updateHighlight(); } catch (e) {}
    requestAnimationFrame(highlightLoop);
  }
  highlightLoop();

  console.log('[MiniTerra 3D Batch 1] loaded — textures, highlight, save/load.');
})();