/* ============================================================
   MiniTerra 3D — BATCH 4 (v3, unified inventory + crafting)
   One panel with storage, hotbar, crafting grid, result slot,
   and a toggleable recipe book sidebar. All drag lives here.
   Loads after batch1-3, before batch5.
   ============================================================ */
(function () {
  'use strict';

  if (typeof scene === 'undefined' || typeof player === 'undefined') {
    console.error('[Batch 4] game not loaded');
    return;
  }

  function section(name, fn) {
    try { fn(); } catch (e) { console.error('[Batch 4] ' + name + ' failed:', e.message); }
  }

  // ============================================================
  // 1. INVENTORY DATA
  // ============================================================
  const INV_SIZE = 45;
  const HOTBAR_SIZE = 9;
  const STACK_MAX = 100;
  const inventory = new Array(INV_SIZE).fill(null);
  const grid = new Array(9).fill(null);   // crafting grid
  let held = null;                         // cursor-held item { item, count }

    // Floating visual that follows the cursor while holding an item
  const cursorItemEl = document.createElement('div');
  cursorItemEl.id = 'b4cursor';
  cursorItemEl.style.cssText =
    'position:fixed;pointer-events:none;z-index:50;width:48px;height:48px;' +
    'border:2px solid #fff;border-radius:4px;display:none;' +
    'align-items:center;justify-content:center;color:#fff;font:bold 13px system-ui;' +
    'text-shadow:0 1px 2px #000;box-sizing:border-box;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.5);';
  document.body.appendChild(cursorItemEl);

  function updateCursorItem(x, y) {
    if (!held) {
      cursorItemEl.style.display = 'none';
      return;
    }
    cursorItemEl.style.display = 'flex';
    cursorItemEl.style.left = (x - 24) + 'px';
    cursorItemEl.style.top = (y - 24) + 'px';
    cursorItemEl.style.background = colorToHex(itemColor(held.item));
    cursorItemEl.textContent = held.count > 1 ? held.count : '';
  }

  // ============================================================
  // 2. TOAST
  // ============================================================
  function toast(msg) {
    let el = document.getElementById('b4toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'b4toast';
      el.style.cssText = 'position:fixed;top:40px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.8);color:#fff;padding:8px 14px;border-radius:6px;' +
        'font:14px system-ui,sans-serif;z-index:40;transition:opacity .4s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.style.opacity = '0'; }, 1500);
  }
  window.toast = toast;

  // ============================================================
  // 3. ITEM LOOKUP
  // ============================================================
  function itemColor(itemName) {
    if (!itemName) return 0x999999;
    if (window.ITEMS && ITEMS[itemName]) return ITEMS[itemName].color;
    for (const id in BLOCKS) if (BLOCKS[id].name === itemName) return BLOCKS[id].color;
    if (BLOCKS[itemName]) return BLOCKS[itemName].color;
    return 0x999999;
  }
  function colorToHex(c) { return '#' + (c >>> 0).toString(16).padStart(6, '0'); }
  function itemLabel(itemName) {
    if (!itemName) return '';
    if (window.ITEMS && ITEMS[itemName]) return ITEMS[itemName].name;
    for (const id in BLOCKS) if (BLOCKS[id].name === itemName) return itemName.charAt(0).toUpperCase() + itemName.slice(1);
    return itemName;
  }

  // ============================================================
  // 4. INVENTORY ACTIONS
  // ============================================================
  function firstEmptySlot() {
    for (let i = 0; i < INV_SIZE; i++) if (!inventory[i]) return i;
    return -1;
  }
  function addToInventory(itemName, count) {
    let remaining = count;
    for (let i = 0; i < INV_SIZE && remaining > 0; i++) {
      const slot = inventory[i];
      if (!slot || slot.item !== itemName) continue;
      const space = STACK_MAX - slot.count;
      if (space <= 0) continue;
      const take = Math.min(space, remaining);
      slot.count += take; remaining -= take;
    }
    while (remaining > 0) {
      const idx = firstEmptySlot();
      if (idx < 0) return count - remaining;
      const take = Math.min(STACK_MAX, remaining);
      inventory[idx] = { item: itemName, count: take };
      remaining -= take;
    }
    return count;
  }
  function countItem(itemName) {
    let total = 0;
    for (const slot of inventory) if (slot && slot.item === itemName) total += slot.count;
    return total;
  }
  function removeFromInventory(itemName, count) {
    let remaining = count;
    for (let i = INV_SIZE - 1; i >= 0 && remaining > 0; i--) {
      const slot = inventory[i];
      if (!slot || slot.item !== itemName) continue;
      const take = Math.min(slot.count, remaining);
      slot.count -= take; remaining -= take;
      if (slot.count <= 0) inventory[i] = null;
    }
    return count - remaining;
  }

  // ============================================================
  // 5. PANEL UI
  // ============================================================
  const invPanel = document.createElement('div');
  invPanel.id = 'b4inv';
  invPanel.style.cssText =
    'position:fixed;inset:0;background:rgba(8,10,16,.82);display:none;' +
    'align-items:center;justify-content:center;z-index:18;font-family:system-ui,sans-serif;';
  document.body.appendChild(invPanel);

  let invOpen = false;
  let selectedSlot = 0;
  let recipeBookOpen = false;

  function slotHTML(index, item, count, isHotbar, extra) {
    const bg = item ? colorToHex(itemColor(item)) : 'rgba(0,0,0,.4)';
    const border = isHotbar ? '3px solid #555c6e' : '2px solid #444';
    const numberLabel = isHotbar ? '<span style="position:absolute;top:1px;left:3px;font-size:10px;color:#bbb;">' + (index + 1) + '</span>' : '';
    const countLabel = count > 1 ? '<span style="position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;text-shadow:0 1px 2px #000;">' + count + '</span>' : '';
    const dataAttr = extra && extra.dataAttr ? extra.dataAttr : ('data-idx="' + index + '"');
    const cls = extra && extra.cls ? ' ' + extra.cls : 'b4slot';
    return '<div class="' + cls.trim() + '" ' + dataAttr + ' style="' +
      'width:52px;height:52px;background:' + bg + ';border:' + border + ';' +
      'border-radius:4px;position:relative;cursor:pointer;display:flex;' +
      'align-items:center;justify-content:center;box-sizing:border-box;' +
      (extra && extra.style ? extra.style : '') + '">' +
      numberLabel + countLabel + '</div>';
  }

  function buildInventory() {
    const storageHTML = inventory.slice(HOTBAR_SIZE).map((slot, i) => slotHTML(i + HOTBAR_SIZE, slot ? slot.item : null, slot ? slot.count : 0, false)).join('');
    const hotbarHTML  = inventory.slice(0, HOTBAR_SIZE).map((slot, i) => slotHTML(i, slot ? slot.item : null, slot ? slot.count : 0, true)).join('');
    const gridHTML    = grid.map((item, i) => slotHTML(i, item, 1, false, { cls: 'b4grid', dataAttr: 'data-grid="' + i + '"' })).join('');

    // Crafting result
    const recipe = findRecipe();
    const resultItem = recipe ? recipe.out : null;
    const resultCount = recipe ? recipe.count : 0;
    const resultBG = resultItem ? colorToHex(itemColor(resultItem)) : 'rgba(0,0,0,.4)';
    const resultBorder = recipe ? '3px solid #6bbf7e' : '2px solid #555';
    const resultHTML = '<div class="b4result" style="width:52px;height:52px;background:' +
      resultBG + ';border:' + resultBorder + ';border-radius:4px;cursor:' +
      (recipe ? 'pointer' : 'default') + ';position:relative;">' +
      (resultCount > 1 ? '<span style="position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;text-shadow:0 1px 2px #000;">' + resultCount + '</span>' : '') +
      '</div>';

    // Recipe book
    const recipeBookHTML = buildRecipeBookHTML();

    invPanel.innerHTML =
      '<div style="background:#2b2f3a;border:3px solid #555c6e;border-radius:12px;padding:22px;color:#fff;position:relative;display:flex;gap:20px;">' +
        // Main inventory side
        '<div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
            '<h2 style="margin:0;font-size:18px;">Inventory</h2>' +
            '<div class="b4recipe-toggle" style="cursor:pointer;background:#3a3f4d;padding:4px 10px;border-radius:4px;font-size:12px;user-select:none;">' +
              (recipeBookOpen ? 'Recipes ◀' : 'Recipes ▶') +
            '</div>' +
          '</div>' +
          // Crafting grid + result
          '<div style="display:flex;gap:14px;align-items:center;margin-bottom:16px;">' +
            '<div style="display:grid;grid-template-columns:repeat(3,56px);gap:4px;">' + gridHTML + '</div>' +
            '<div style="font-size:22px;color:#888;">→</div>' +
            resultHTML +
          '</div>' +
          // Storage
          '<div style="display:grid;grid-template-columns:repeat(9,56px);gap:4px;margin-bottom:14px;">' + storageHTML + '</div>' +
          // Hotbar
          '<div style="border-top:1px solid #444;padding-top:14px;">' +
            '<div style="font-size:12px;color:#bbb;margin-bottom:6px;">Hotbar</div>' +
            '<div style="display:grid;grid-template-columns:repeat(9,56px);gap:4px;">' + hotbarHTML + '</div>' +
          '</div>' +
          '<div style="margin-top:14px;font-size:12px;color:#888;">E to close · L-click pick/place · R-click split · Shift-click transfer · Drag to distribute</div>' +
        '</div>' +
        // Recipe book sidebar
        (recipeBookOpen ? recipeBookHTML : '') +
      '</div>';
  }

  function buildRecipeBookHTML() {
    const recipes = window._batch5Data ? window._batch5Data.recipes : [];
    const items = window._batch5Data ? window._batch5Data.items : [];
    const rows = recipes.map(function (r) {
      const canMake = canCraft(r);
      const bg = canMake ? 'rgba(63,107,74,.4)' : 'rgba(0,0,0,.3)';
      const col = colorToHex(itemColor(r.out));
      return '<div class="b4recipe" data-id="' + r.id + '" style="' +
        'display:flex;align-items:center;gap:8px;padding:5px 8px;cursor:pointer;' +
        'background:' + bg + ';border-radius:4px;margin-bottom:3px;">' +
        '<div style="width:22px;height:22px;background:' + col + ';border:1px solid #333;border-radius:3px;"></div>' +
        '<span style="font-size:12px;">' + itemLabel(r.out) + (r.count > 1 ? ' x' + r.count : '') + '</span>' +
        '</div>';
    }).join('');
    return '<div style="width:240px;max-height:520px;overflow-y:auto;border-left:1px solid #444;padding-left:18px;">' +
      '<h3 style="margin:0 0 10px;font-size:14px;">Recipe Book</h3>' +
      (rows || '<div style="font-size:12px;color:#888;">No recipes loaded.</div>') +
      '</div>';
  }

  // ============================================================
  // 6. CRAFTING LOGIC
  // ============================================================
  function findRecipe() {
    const recipes = window._batch5Data ? window._batch5Data.recipes : [];
    for (const r of recipes) {
      let ok = true;
      for (let i = 0; i < 9; i++) {
        const a = grid[i] || null;
        const b = r.grid[i] || null;
        if (a !== b) { ok = false; break; }
      }
      if (ok) return r;
    }
    return null;
  }
  function canCraft(r) {
    const need = {};
    for (const it of r.grid) {
      if (!it) continue;
      need[it] = (need[it] || 0) + 1;
    }
    for (const item in need) {
      if (countItem(item) < need[item]) return false;
    }
    return true;
  }
  function craftRecipe() {
    const r = findRecipe();
    if (!r) return false;
    if (!canCraft(r)) { toast('Not enough materials'); return false; }
    const need = {};
    for (const it of r.grid) {
      if (!it) continue;
      need[it] = (need[it] || 0) + 1;
    }
    for (const item in need) removeFromInventory(item, need[item]);
    addToInventory(r.out, r.count);
    for (let i = 0; i < 9; i++) grid[i] = null;
    toast('Crafted ' + itemLabel(r.out) + ' x' + r.count);
    return true;
  }
  function returnGridToInventory() {
    for (let i = 0; i < 9; i++) {
      if (grid[i]) { addToInventory(grid[i], 1); grid[i] = null; }
    }
  }

  // ============================================================
  // 7. OPEN / CLOSE
  // ============================================================
  function openInventory() {
    invOpen = true;
    window._invOpen = true;
    invPanel.style.display = 'flex';
    const lockEl = document.getElementById('lock');
    if (lockEl) lockEl.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();
    buildInventory();
  }
  function closeInventory() {
    invOpen = false;
    window._invOpen = false;
    invPanel.style.display = 'none';
    if (held) { addToInventory(held.item, held.count); held = null; }
    returnGridToInventory();
    setTimeout(function () {
      if (!invOpen && renderer.domElement) {
        renderer.domElement.requestPointerLock();
        setTimeout(function () {
          if (document.pointerLockElement !== renderer.domElement) {
            const lockEl = document.getElementById('lock');
            if (lockEl) lockEl.style.display = 'flex';
          }
        }, 100);
      }
    }, 10);
    refreshHotbarUI();
  }
  function toggleInventory() { if (invOpen) closeInventory(); else openInventory(); }

  addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'e' || e.key === 'E') {
      if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleInventory(); }
    }
    if (e.key === 'Escape' && invOpen) closeInventory();
  });

  // ============================================================
  // 8. CLICK + DRAG INTERACTION
  // ============================================================
  // State for drag
  let isDragging = false;
  let dragButton = 0;
  let dragVisited = new Set();
  let dragStartKey = '';

  function slotKey(el) {
    if (el.classList.contains('b4grid')) return 'g' + el.dataset.grid;
    if (el.classList.contains('b4slot')) return 'i' + el.dataset.idx;
    return '';
  }
  function isSlot(el) {
    return el && (el.classList.contains('b4slot') || el.classList.contains('b4grid'));
  }
  function getSlotItem(el) {
    if (el.classList.contains('b4grid')) return grid[+el.dataset.grid];
    if (el.classList.contains('b4slot')) return inventory[+el.dataset.idx];
    return null;
  }
  function setSlotItem(el, item) {
    if (el.classList.contains('b4grid')) grid[+el.dataset.grid] = item;
    else if (el.classList.contains('b4slot')) inventory[+el.dataset.idx] = item;
  }

  invPanel.addEventListener('mousedown', function (e) {
    // Handle recipe book toggle
    if (e.target.closest('.b4recipe-toggle')) {
      e.preventDefault();
      recipeBookOpen = !recipeBookOpen;
      buildInventory();
      return;
    }

    // Handle clicking a recipe in the sidebar
    const recipeEl = e.target.closest('.b4recipe');
    if (recipeEl) {
      e.preventDefault();
      const recipes = window._batch5Data ? window._batch5Data.recipes : [];
      const r = recipes.find(function (x) { return x.id === recipeEl.dataset.id; });
      if (!r) return;
      if (canCraft(r)) {
        // Craft immediately
        const need = {};
        for (const it of r.grid) { if (it) need[it] = (need[it] || 0) + 1; }
        for (const item in need) removeFromInventory(item, need[item]);
        addToInventory(r.out, r.count);
        toast('Crafted ' + itemLabel(r.out) + ' x' + r.count);
      } else {
        // Load the recipe into the grid (if grid is empty)
        for (let i = 0; i < 9; i++) {
          if (grid[i]) { addToInventory(grid[i], 1); grid[i] = null; }
        }
        for (let i = 0; i < 9; i++) grid[i] = r.grid[i] || null;
        toast('Recipe loaded — need materials');
      }
      buildInventory();
      refreshHotbarUI();
      return;
    }

    // Handle clicking the result slot
    if (e.target.closest('.b4result')) {
      e.preventDefault();
      if (craftRecipe()) { buildInventory(); refreshHotbarUI(); }
      return;
    }

    // Handle clicking a regular slot (inventory or grid)
    const el = e.target.closest('.b4slot, .b4grid');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();

    const isRight = e.button === 2;
    const isShift = e.shiftKey;
    const slot = getSlotItem(el);

    // Shift-click: quick transfer between hotbar and storage
    if (isShift && el.classList.contains('b4slot')) {
      if (!slot) return;
      const idx = +el.dataset.idx;
      const isHotbar = idx < HOTBAR_SIZE;
      const start = isHotbar ? HOTBAR_SIZE : 0;
      const end = isHotbar ? INV_SIZE : HOTBAR_SIZE;
      let remaining = slot.count;
      for (let i = start; i < end && remaining > 0; i++) {
        const s = inventory[i];
        if (!s || s.item !== slot.item) continue;
        const space = STACK_MAX - s.count;
        if (space <= 0) continue;
        const take = Math.min(space, remaining);
        s.count += take; remaining -= take;
      }
      for (let i = start; i < end && remaining > 0; i++) {
        if (inventory[i]) continue;
        inventory[i] = { item: slot.item, count: remaining };
        remaining = 0;
      }
      if (remaining === 0) inventory[idx] = null;
      else slot.count = remaining;
      buildInventory(); refreshHotbarUI();
      return;
    }

    // --- Double-click collect (Mouse Tweaks) ---
    // If this is a double-click on a slot, we first do the normal
    // single-click logic, then sweep the inventory for matching items.
    const isDoubleClick = e.detail === 2;


    // --- Normal click ---
    if (!held) {
      // Pick up from slot
      if (!slot) return;
      if (isRight) {
        // Right-click splits: pick up half. In the grid, pick up the whole thing.
        if (el.classList.contains('b4grid')) {
          held = { item: slot, count: 1 };
          setSlotItem(el, null);
        } else {
          const take = Math.ceil(slot.count / 2);
          held = { item: slot.item, count: take };
          slot.count -= take;
          if (slot.count <= 0) setSlotItem(el, null);
        }
      } else {
        // Left-click: pick up whole stack
        if (el.classList.contains('b4grid')) {
          held = { item: slot, count: 1 };
          setSlotItem(el, null);
        } else {
          held = { item: slot.item, count: slot.count };
          setSlotItem(el, null);
        }
      }
    } else {
      // Place held item into slot
      if (el.classList.contains('b4grid')) {
        // Grid slots hold single items
        if (slot) {
          // Slot has an item: swap it back to held
          const tmp = { item: slot, count: 1 };
          setSlotItem(el, held.item);
          held = tmp;
          if (held.count > 1) {
            // Overflow back to inventory
            addToInventory(held.item, held.count - 1);
            held.count = 1;
          }
        } else {
          setSlotItem(el, held.item);
          held.count -= 1;
          if (held.count <= 0) held = null;
        }
      } else {
        // Regular slot
        if (!slot) {
          if (isRight) {
            inventory[+el.dataset.idx] = { item: held.item, count: 1 };
            held.count -= 1;
            if (held.count <= 0) held = null;
          } else {
            inventory[+el.dataset.idx] = { item: held.item, count: held.count };
            held = null;
          }
        } else if (slot.item === held.item) {
          const space = STACK_MAX - slot.count;
          if (isRight) {
            const take = Math.min(1, space, held.count);
            slot.count += take;
            held.count -= take;
            if (held.count <= 0) held = null;
          } else {
            const take = Math.min(space, held.count);
            slot.count += take;
            held.count -= take;
            if (held.count <= 0) held = null;
          }
        } else {
          // Swap
          const tmp = { item: slot.item, count: slot.count };
          inventory[+el.dataset.idx] = { item: held.item, count: held.count };
          held = tmp;
        }
      }
    }

    // --- If this was a double-click, sweep inventory for matches ---
    if (isDoubleClick && held && !isShift) {
      // held.item is the item we're collecting
      const targetItem = held.item;
      for (let i = 0; i < INV_SIZE && held && held.count < STACK_MAX; i++) {
        const s = inventory[i];
        if (!s || s.item !== targetItem) continue;
        // How much room is left in the held stack?
        const space = STACK_MAX - held.count;
        if (space <= 0) break;
        const take = Math.min(space, s.count);
        held.count += take;
        s.count -= take;
        if (s.count <= 0) inventory[i] = null;
      }
    }

    // Start drag tracking
    if (held) {
      isDragging = true;
      dragButton = e.button;
      dragVisited = new Set();
      dragStartKey = slotKey(el);
      dragVisited.add(dragStartKey);
    }

    buildInventory(); refreshHotbarUI();
  });

  invPanel.addEventListener('mousemove', function (e) {
    updateCursorItem(e.clientX, e.clientY);
  });

  invPanel.addEventListener('mousemove', function (e) {
    if (!isDragging || !held) return;
    const el = e.target.closest('.b4slot, .b4grid');
    if (!el) return;
    const key = slotKey(el);
    if (dragVisited.has(key)) return;
    dragVisited.add(key);
    if (key === dragStartKey) return;

    const slot = getSlotItem(el);

    if (el.classList.contains('b4grid')) {
      // Grid slots accept 1 item
      if (!slot) {
        setSlotItem(el, held.item);
        held.count -= 1;
      } else {
        return; // already full, skip
      }
    } else {
      // Regular slot
      if (!slot) {
        inventory[+el.dataset.idx] = { item: held.item, count: 1 };
        held.count -= 1;
      } else if (slot.item === held.item && slot.count < STACK_MAX) {
        slot.count += 1;
        held.count -= 1;
      } else {
        return;
      }
    }

    if (held.count <= 0) { held = null; isDragging = false; }
    buildInventory(); refreshHotbarUI();
    updateCursorItem(e.clientX, e.clientY);
  });

  invPanel.addEventListener('mouseup', function () {
    isDragging = false;
    dragStartKey = '';
    dragVisited = new Set();
  });
  invPanel.addEventListener('mouseleave', function () { isDragging = false; });
  invPanel.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ============================================================
  // 9. HOTBAR SYNC
  // ============================================================
  function refreshHotbarUI() {
    const hud = document.getElementById('hud');
    if (!hud) return;
    let html = '';
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = inventory[i];
      const bg = slot ? colorToHex(itemColor(slot.item)) : 'rgba(0,0,0,.5)';
      const selected = (i === selectedSlot);
      const border = selected ? '3px solid #ffd54a' : '3px solid #555';
      const countLabel = slot && slot.count > 1 ? '<span style="position:absolute;bottom:1px;right:3px;font-size:11px;color:#fff;text-shadow:0 1px 2px #000;">' + slot.count + '</span>' : '';
      html += '<div class="slot ' + (selected ? 'sel' : '') + '" style="' +
        'width:48px;height:48px;border:' + border + ';background:' + bg + ';' +
        'position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">' +
        '<span style="position:absolute;top:1px;left:3px;font-size:10px;color:#bbb;">' + (i + 1) + '</span>' +
        countLabel + '</div>';
    }
    hud.innerHTML = html;
  }
  addEventListener('keydown', function (e) {
    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
      selectedSlot = +e.code.slice(5) - 1;
      refreshHotbarUI();
    }
  });

  // ============================================================
  // 10. MINING → INVENTORY
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
    let hit = null;
    for (let t = 0; t < 6; t += 0.05) {
      const x = Math.floor(origin.x + dir.x * t);
      const y = Math.floor(origin.y + dir.y * t);
      const z = Math.floor(origin.z + dir.z * t);
      const b = getBlock(x, y, z);
      if (b !== 0) { hit = { x, y, z, block: b }; break; }
    }
    if (!hit) return;
    const def = BLOCKS[hit.block];
    if (!def || !def.name) return;
    setTimeout(function () {
      if (getBlock(hit.x, hit.y, hit.z) === 0) {
        addToInventory(def.name, 1);
        refreshHotbarUI();
        toast('+1 ' + itemLabel(def.name));
      }
    }, 30);
  }, true);

  // ============================================================
  // 11. PLACING BLOCKS
  // ============================================================
  addEventListener('mousedown', function (e) {
    if (document.pointerLockElement !== renderer.domElement) return;
    if (e.button !== 2) return;
    const slot = inventory[selectedSlot];
    if (!slot) return;
    let blockId = null;
    for (const id in BLOCKS) if (BLOCKS[id].name === slot.item) { blockId = +id; break; }
    if (blockId === null) return;
    setTimeout(function () {
      const cur = inventory[selectedSlot];
      if (!cur || cur.item !== slot.item) return;
      if (cur.count > 0) {
        cur.count -= 1;
        if (cur.count <= 0) inventory[selectedSlot] = null;
        refreshHotbarUI();
      }
    }, 30);
  });

  // ============================================================
  // 12. SAVE / LOAD
  // ============================================================
  const INV_KEY = 'miniterra3d.inventory.v2';
  function saveInv() {
    try { localStorage.setItem(INV_KEY, JSON.stringify(inventory)); } catch (e) {}
  }
  function loadInv() {
    try {
      const raw = localStorage.getItem(INV_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length === INV_SIZE) {
        for (let i = 0; i < INV_SIZE; i++) inventory[i] = arr[i];
      }
    } catch (e) {}
  }
  loadInv();
  addEventListener('keydown', function (e) {
    if (e.code === 'KeyO' && !e.ctrlKey && !e.metaKey) setTimeout(saveInv, 100);
  });
  addEventListener('beforeunload', saveInv);
  setInterval(saveInv, 10000);

  // ============================================================
  // 13. PAUSE WHILE OPEN
  // ============================================================
  if (typeof loop === 'function') {
    const origLoop = loop;
    loop = function () {
      if (invOpen) {
        try {
          camera.position.set(player.pos.x, player.pos.y + player.height * 0.9, player.pos.z);
          camera.rotation.order = 'YXZ';
          camera.rotation.y = player.yaw;
          camera.rotation.x = player.pitch;
          renderer.render(scene, camera);
        } catch (e) {}
        requestAnimationFrame(loop);
        return;
      }
      origLoop.apply(this, arguments);
    };
  }

  // ============================================================
  // 14. EXPOSE FOR BATCH 5
  // ============================================================
  window._batch4Add = addToInventory;
  window._batch4Remove = removeFromInventory;
  window._batch4InvCount = countItem;
  window._batch4Held = function () {
    const sel = inventory[selectedSlot];
    return sel ? sel.item : null;
  };
  window._batch4Toast = toast;
  window._batch4GetHeld = function () { return held ? { item: held.item, count: held.count } : null; };
  window._batch4SetHeld = function (item, count) {
    if (item) held = { item: item, count: count };
    else held = null;
  };
  window._batch4GetGrid = function () { return grid.slice(); };
  window._batch4GetInventory = function () { return inventory; };

  // ============================================================
  // 15. INITIAL UI
  // ============================================================
  refreshHotbarUI();
  console.log('[MiniTerra 3D Batch 4 v3] loaded — unified inventory + crafting.');
})()